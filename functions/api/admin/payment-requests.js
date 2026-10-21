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
    const requests=await db.prepare("SELECT id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by,created_at,updated_at FROM order_payment_requests WHERE order_id=? ORDER BY created_at DESC LIMIT 50").bind(orderId).all();
    const transactions=await db.prepare("SELECT id,payment_request_id,direction,amount,transaction_reference,note,actor,verified_at,created_at FROM order_payment_transactions WHERE order_id=? ORDER BY created_at DESC LIMIT 100").bind(orderId).all();
    const order=await db.prepare("SELECT total FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    return json({requests:requests.results||[],transactions:transactions.results||[],summary:summarizePaymentRows(transactions.results||[],order?.total)});
  } catch { return fail("Không đọc được lịch sử thanh toán.",503); }
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsed = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsed.error) return fail(parsed.error === "too_large" ? "Yêu cầu thanh toán vượt giới hạn." : "Dữ liệu yêu cầu thanh toán không hợp lệ.", parsed.error === "too_large" ? 413 : 400);
  const body = parsed.value || {};
  const orderId = String(body.orderId || "");
  const paymentOption = String(body.paymentOption || "");
  if (Object.hasOwn(body, "amount")) return fail("Số tiền do máy chủ tự tính; không gửi amount từ trình duyệt.");
  if (!orderId || !["deposit", "balance", "full"].includes(paymentOption)) return fail("Lựa chọn thanh toán không hợp lệ.");
  try {
    const db = context.env.DB;
    const order = await db.prepare("SELECT id,order_number,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if (!order) return fail("Không tìm thấy đơn hàng.", 404);
    if (order.status === "cancelled") return fail("Đơn đã hủy không thể tạo yêu cầu thanh toán.", 409);
    if (Number(order.price_confirmation_required) !== 0 || order.total === null || !order.payment_terms_confirmed_at) return fail("Cần xác nhận giá và điều kiện đơn trước khi yêu cầu chuyển khoản.", 409);
    const total = Number(order.total);
    if (!Number.isSafeInteger(total) || total <= 0 || total > 2000000000) return fail("Tổng tiền đã xác nhận không hợp lệ.", 409);

    const itemRows = await db.prepare("SELECT fulfillment_type,quantity,line_total FROM order_items WHERE order_id=?").bind(orderId).all();
    const items = itemRows.results || [];
    if (!items.length || items.some(item => item.line_total === null || item.line_total === undefined || (typeof item.line_total === "string" && !item.line_total.trim()) || !Number.isSafeInteger(Number(item.line_total)) || Number(item.line_total) < 0)) return fail("Một hoặc nhiều dòng hàng chưa có giá được xác nhận.", 409);
    const itemTotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
    if (!Number.isSafeInteger(itemTotal) || itemTotal !== total) return fail("Tổng đơn chưa khớp tổng các dòng hàng đã xác nhận; cần kiểm tra thủ công.", 409);
    const fulfillmentTypes = new Set(items.map(item => ["in_stock", "made_to_order", "unclassified"].includes(item.fulfillment_type) ? item.fulfillment_type : "unclassified"));
    if (fulfillmentTypes.size !== 1) return fail("Giỏ có nhiều loại hàng; vui lòng tư vấn thủ công thay vì tự động yêu cầu thanh toán.", 409);
    const fulfillmentType = [...fulfillmentTypes][0];
    if (fulfillmentType === "unclassified") return fail("Loại hàng chưa được Admin xác nhận; chưa thể tạo yêu cầu thanh toán tự động.", 409);

    const settings = await db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?)").bind("payment_qr_active","payment_qr_active_key","payment_qr_bank_name","payment_qr_account_number","payment_qr_account_name").all();
    const cfg = Object.fromEntries((settings.results || []).map(row => [row.key, row.value]));
    if (cfg.payment_qr_active !== "1" || !validPublicQrImageKey(cfg.payment_qr_active_key) || !cfg.payment_qr_bank_name || !cfg.payment_qr_account_number || !cfg.payment_qr_account_name) return fail("Chưa kích hoạt cấu hình QR ngân hàng hợp lệ.", 409);
    if (!context.env.IMAGES?.head) return fail("Dịch vụ ảnh QR chưa sẵn sàng; chưa thể tạo yêu cầu chuyển khoản.", 503);
    const activeQrObject = await context.env.IMAGES.head(cfg.payment_qr_active_key);
    if (!activeQrObject) return fail("Ảnh QR đang kích hoạt không còn truy cập được; chưa thể tạo yêu cầu chuyển khoản.", 409);

    const transactionRows = await db.prepare("SELECT direction,amount FROM order_payment_transactions WHERE order_id=?").bind(orderId).all();
    const transactions = transactionRows.results || [];
    const summary = summarizePaymentRows(transactions, total);
    let amount;
    const installmentType = paymentOption;
    let shippingBenefit = "standard_shipping";
    if (paymentOption === "deposit") {
      if (transactions.length) return fail("Đơn đã có lịch sử giao dịch; hãy chọn thanh toán số dư sau khi Admin đối chiếu.", 409);
      amount = fulfillmentType === "made_to_order" ? Math.ceil(total * 0.3) : 100000;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > total) return fail("Khoản đặt cọc theo quy định lớn hơn tổng tiền đơn; cần tư vấn thủ công.", 409);
    } else if (paymentOption === "full") {
      if (transactions.length) return fail("Đơn đã có lịch sử giao dịch; không tạo lại yêu cầu thanh toán đủ. Hãy chọn thanh toán số dư.", 409);
      amount = total;
      shippingBenefit = "free_shipping";
    } else {
      if (summary.netReceivedAmount <= 0 || summary.remainingBalance === null || summary.remainingBalance <= 0) return fail("Thanh toán số dư chỉ được tạo sau khi đã xác minh khoản nhận và còn dư phải thu.", 409);
      amount = summary.remainingBalance;
    }

    const id = crypto.randomUUID();
    const reference = referenceCode();
    await db.batch([
      db.prepare("INSERT INTO order_payment_requests(id,order_id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?, 'pending','admin')").bind(id,orderId,installmentType,amount,shippingBenefit,reference,cfg.payment_qr_active_key,cfg.payment_qr_bank_name,cfg.payment_qr_account_number,cfg.payment_qr_account_name),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_request_created','order',?,?)").bind(crypto.randomUUID(),orderId,JSON.stringify({requestId:id,installmentType,fulfillmentType,amount,shippingBenefit,reference}))
    ]);
    return json({ok:true,id,installmentType,fulfillmentType,amount,shippingBenefit,freeShippingEligible:shippingBenefit==="free_shipping",freeShippingApplied:false,transferReference:reference,message:shippingBenefit==="free_shipping"?"Đã tạo yêu cầu thanh toán đủ; miễn phí giao hàng theo chính sách.":"Đã tạo yêu cầu thanh toán theo loại hàng và giá đã xác nhận."},201);
  } catch(error) {
    if (/UNIQUE constraint|idx_order_payment_requests_one_pending/i.test(String(error?.message || ""))) return fail("Đơn đang có yêu cầu thanh toán chờ xử lý. Hãy hủy yêu cầu cũ trước.", 409);
    return fail("Không tạo được yêu cầu thanh toán.", 503);
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
