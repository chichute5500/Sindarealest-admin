import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

export async function onRequestPost(context) {
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,8*1024);
  if(parsed.error)return fail(parsed.error==="too_large"?"Thông tin giao dịch vượt giới hạn.":"Thông tin giao dịch không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value||{},orderId=String(body.orderId||""),requestId=String(body.paymentRequestId||"");
  const direction=String(body.direction||"received"),amount=Number(body.amount);
  const reference=String(body.transactionReference||"").trim().toUpperCase(),note=String(body.note||"").trim();
  if(!orderId||!["received","refunded"].includes(direction)||!Number.isSafeInteger(amount)||amount<=0||amount>2_000_000_000||reference.length<4||reference.length>80||!/^[A-Z0-9][A-Z0-9._/-]{2,79}$/.test(reference)||note.length>500)return fail("Thông tin giao dịch đã xác minh không hợp lệ.");
  try {
    const db=context.env.DB;
    const order=await db.prepare("SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if(!order)return fail("Không tìm thấy đơn hàng.",404);
    if(direction==="received"&&order.status==="cancelled")return fail("Không thể ghi nhận khoản nhận mới cho đơn đã hủy.",409);
    if(direction==="received"&&(Number(order.price_confirmation_required)!==0||order.total===null||!order.payment_terms_confirmed_at))return fail("Chưa xác nhận giá và điều kiện đơn; không thể ghi nhận thanh toán.",409);
    if(requestId){
      const pr=await db.prepare("SELECT id,order_id,status FROM order_payment_requests WHERE id=? LIMIT 1").bind(requestId).first();
      if(!pr||pr.order_id!==orderId)return fail("Yêu cầu thanh toán không thuộc đơn này.",400);
      if(pr.status==="cancelled"&&direction==="received")return fail("Không ghi nhận giao dịch gắn với yêu cầu đã hủy.",409);
    }
    const transactionId=crypto.randomUUID();
    const statements=[
      db.prepare("INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) VALUES(?,?,?,?,?,?,?,'admin')").bind(transactionId,orderId,requestId||null,direction,amount,reference,note),
      db.prepare("UPDATE order_payment_requests SET status=CASE WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE payment_request_id=?)>=amount THEN 'settled' ELSE status END,updated_at=datetime('now') WHERE id=? AND status='pending'").bind(requestId,requestId),
      db.prepare("UPDATE orders SET payment_status=CASE WHEN total IS NOT NULL AND total>=0 AND (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)>=total AND (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'paid' WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)<=0 AND EXISTS(SELECT 1 FROM order_payment_transactions WHERE order_id=? AND direction='refunded') THEN 'refunded' WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'pending' ELSE 'unpaid' END,updated_at=datetime('now') WHERE id=?").bind(orderId,orderId,orderId,orderId,orderId,orderId),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin',?,'order',?,?)").bind(crypto.randomUUID(),direction==="received"?"payment_received_verified":"payment_refund_verified",orderId,JSON.stringify({transactionId,requestId:requestId||null,direction,amount,reference,note}))
    ];
    await db.batch(statements);
    return json({ok:true,transactionId,message:direction==="received"?"Đã ghi nhận khoản tiền Admin đã đối chiếu thực tế.":"Đã ghi nhận khoản hoàn tiền đã đối chiếu thực tế."},201);
  } catch(error) {
    if(/UNIQUE constraint/i.test(String(error?.message||"")))return fail("Mã giao dịch này đã được ghi nhận trước đó.",409);
    return fail("Không lưu được giao dịch đã xác minh.",503);
  }
}
export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.",405); }
