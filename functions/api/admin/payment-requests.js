import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { validPublicQrImageKey, summarizePaymentRows } from "../../_payments.js";

function referenceCode() {
  return "SD" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
}
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const orderId = String(new URL(context.request.url).searchParams.get("orderId") || "");
  if (!orderId) return fail("Thiếu mã đơn.");
  try {
    const db=context.env.DB;
    const requests=await db.prepare("SELECT id,installment_type,amount,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by,created_at,updated_at FROM order_payment_requests WHERE order_id=? ORDER BY created_at DESC LIMIT 50").bind(orderId).all();
    const transactions=await db.prepare("SELECT id,payment_request_id,direction,amount,transaction_reference,note,actor,verified_at,created_at FROM order_payment_transactions WHERE order_id=? ORDER BY created_at DESC LIMIT 100").bind(orderId).all();
    const order=await db.prepare("SELECT total FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    return json({requests:requests.results||[],transactions:transactions.results||[],summary:summarizePaymentRows(transactions.results||[],order?.total)});
  } catch { return fail("Không đọc được lịch sử thanh toán.",503); }
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsed=await readJsonBodyLimited(context.request,8*1024);
  if(parsed.error) return fail(parsed.error==="too_large"?"Yêu cầu thanh toán vượt giới hạn.":"Dữ liệu yêu cầu thanh toán không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value||{},orderId=String(body.orderId||""),type=String(body.installmentType||""),amount=Number(body.amount);
  if(!orderId||!["deposit","balance","full"].includes(type)||!Number.isSafeInteger(amount)||amount<=0||amount>2_000_000_000)return fail("Đợt thanh toán hoặc số tiền không hợp lệ.");
  try {
    const db=context.env.DB;
    const order=await db.prepare("SELECT id,order_number,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if(!order)return fail("Không tìm thấy đơn hàng.",404);
    if(order.status==="cancelled")return fail("Đơn đã hủy không thể tạo yêu cầu thanh toán.",409);
    if(Number(order.price_confirmation_required)!==0||order.total===null||!order.payment_terms_confirmed_at)return fail("Cần xác nhận giá và điều kiện đơn trước khi yêu cầu chuyển khoản.",409);
    const rows=await db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?)").bind("payment_qr_active","payment_qr_active_key","payment_qr_bank_name","payment_qr_account_number","payment_qr_account_name").all();
    const cfg=Object.fromEntries((rows.results||[]).map(r=>[r.key,r.value]));
    if(cfg.payment_qr_active!=="1"||!validPublicQrImageKey(cfg.payment_qr_active_key)||!cfg.payment_qr_bank_name||!cfg.payment_qr_account_number||!cfg.payment_qr_account_name)return fail("Chưa kích hoạt cấu hình QR ngân hàng hợp lệ.",409);
    const tx=await db.prepare("SELECT direction,amount FROM order_payment_transactions WHERE order_id=?").bind(orderId).all();
    const summary=summarizePaymentRows(tx.results||[],order.total),remaining=summary.remainingBalance;
    if(remaining===null||remaining<=0)return fail("Đơn không còn số dư phải thu.",409);
    if(amount>remaining)return fail("Số tiền yêu cầu vượt số dư còn lại.",409);
    if(type!=="deposit"&&amount!==remaining)return fail("Đợt thanh toán số dư/toàn bộ phải bằng đúng số dư còn lại.",409);
    const id=crypto.randomUUID(),reference=referenceCode();
    await db.batch([
      db.prepare("INSERT INTO order_payment_requests(id,order_id,installment_type,amount,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,'pending','admin')").bind(id,orderId,type,amount,reference,cfg.payment_qr_active_key,cfg.payment_qr_bank_name,cfg.payment_qr_account_number,cfg.payment_qr_account_name),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_request_created','order',?,?)").bind(crypto.randomUUID(),orderId,JSON.stringify({requestId:id,installmentType:type,amount,reference}))
    ]);
    return json({ok:true,id,installmentType:type,amount,transferReference:reference,message:"Đã tạo yêu cầu thanh toán. QR không chứa số tiền; khách tự nhập số tiền hiển thị."},201);
  } catch(error) {
    if(/UNIQUE constraint|idx_order_payment_requests_one_pending/i.test(String(error?.message||"")))return fail("Đơn đang có yêu cầu thanh toán chờ xử lý. Hãy hủy yêu cầu cũ trước.",409);
    return fail("Không tạo được yêu cầu thanh toán.",503);
  }
}
export async function onRequestPatch(context) {
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,4*1024);
  if(parsed.error||!parsed.value||parsed.value.action!=="cancel")return fail("Thao tác hủy yêu cầu không hợp lệ.");
  const id=String(parsed.value.id||"");if(!id)return fail("Thiếu mã yêu cầu thanh toán.");
  try {
    const row=await context.env.DB.prepare("SELECT id,order_id,status FROM order_payment_requests WHERE id=? LIMIT 1").bind(id).first();
    if(!row)return fail("Không tìm thấy yêu cầu thanh toán.",404);
    if(row.status!=="pending")return fail("Chỉ hủy yêu cầu đang chờ.",409);
    await context.env.DB.batch([
      context.env.DB.prepare("UPDATE order_payment_requests SET status='cancelled',updated_at=datetime('now') WHERE id=? AND status='pending'").bind(id),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_request_cancelled','order',?,?)").bind(crypto.randomUUID(),row.order_id,JSON.stringify({requestId:id}))
    ]);
    return json({ok:true,message:"Đã hủy yêu cầu thanh toán đang chờ."});
  } catch { return fail("Không hủy được yêu cầu thanh toán.",503); }
}
