import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

export async function onRequestPost(context) {
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,8*1024);
  if(parsed.error)return fail(parsed.error==="too_large"?"Thông tin giao dịch vượt giới hạn.":"Thông tin giao dịch không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value||{},orderId=String(body.orderId||""),requestId=String(body.paymentRequestId||"");
  // Only a JSON number is acceptable for a verified ledger entry; never coerce booleans, strings or arrays into money.
  const direction=String(body.direction||"received"),amount=body.amount;
  const reference=String(body.transactionReference||"").trim().toUpperCase(),note=String(body.note||"").trim();
  if(!orderId||!["received","refunded"].includes(direction)||!Number.isSafeInteger(amount)||amount<=0||amount>2_000_000_000||reference.length<4||reference.length>80||!/^[A-Z0-9][A-Z0-9._/-]{2,79}$/.test(reference)||note.length>500)return fail("Thông tin giao dịch đã xác minh không hợp lệ.");
  try {
    const db=context.env.DB;
    const order=await db.prepare("SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if(!order)return fail("Không tìm thấy đơn hàng.",404);
    if(direction==="received"&&order.status==="cancelled")return fail("Không thể ghi nhận khoản nhận mới cho đơn đã hủy.",409);
    if(direction==="received"&&(Number(order.price_confirmation_required)!==0||order.total===null||!order.payment_terms_confirmed_at))return fail("Chưa xác nhận giá và điều kiện đơn; không thể ghi nhận thanh toán.",409);
    if(direction==="refunded"){
      const existingLedger=await db.prepare("SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) AS net_received FROM order_payment_transactions WHERE order_id=?").bind(orderId).first();
      const netReceived=Number(existingLedger?.net_received);
      if(!Number.isSafeInteger(netReceived)||netReceived<=0||amount>netReceived)return fail("Số tiền hoàn không thể vượt tổng tiền đã nhận và xác minh thực tế.",409);
    }
    if(requestId){
      const pr=await db.prepare("SELECT id,order_id,status FROM order_payment_requests WHERE id=? LIMIT 1").bind(requestId).first();
      if(!pr||pr.order_id!==orderId)return fail("Yêu cầu thanh toán không thuộc đơn này.",400);
      if(pr.status!=="pending"&&direction==="received")return fail("Chỉ ghi nhận khoản thu gắn với yêu cầu QR đang chờ xử lý; yêu cầu này đã kết thúc.",409);
    }
    const transactionId=crypto.randomUUID();
    const statements=[
      // Recheck order state, linked QR status, and remaining net receipts at the atomic D1 write boundary.
      db.prepare(
        "INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) " +
        "SELECT ?,?,?,?,?,?,?,'admin' WHERE (? != 'refunded' OR ? <= " +
        "(SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?))" +
        (direction === "received"
          ? " AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled' AND price_confirmation_required=0 AND total IS NOT NULL AND payment_terms_confirmed_at IS NOT NULL)"
          : "") +
        (direction === "received" && requestId
          ? " AND EXISTS (SELECT 1 FROM order_payment_requests WHERE id=? AND order_id=? AND status='pending')"
          : "")
      ).bind(
        transactionId,orderId,requestId||null,direction,amount,reference,note,
        direction,amount,orderId,
        ...(direction === "received" ? [orderId] : []),
        ...(direction === "received" && requestId ? [requestId,orderId] : [])
      ),
      db.prepare("UPDATE order_payment_requests SET status=CASE WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE payment_request_id=?)>=amount THEN 'settled' ELSE status END,updated_at=datetime('now') WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)").bind(requestId,requestId,transactionId),
      db.prepare("UPDATE orders SET payment_status=CASE WHEN total IS NOT NULL AND total>=0 AND (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)>=total AND (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'paid' WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)<=0 AND EXISTS(SELECT 1 FROM order_payment_transactions WHERE order_id=? AND direction='refunded') THEN 'refunded' WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE -amount END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'pending' ELSE 'unpaid' END,updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)").bind(orderId,orderId,orderId,orderId,orderId,orderId,transactionId),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin',?,'order',?,? WHERE EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)").bind(crypto.randomUUID(),direction==="received"?"payment_received_verified":"payment_refund_verified",orderId,JSON.stringify({transactionId,requestId:requestId||null,direction,amount,reference,note}),transactionId)
    ];
    const results=await db.batch(statements);
    if(Number(results?.[0]?.meta?.changes)===0) {
      if(direction==="refunded")return fail("Số tiền hoàn vượt khoản đã nhận còn lại sau khi đối chiếu. Không ghi nhận giao dịch.",409);
      return fail("Đơn hàng hoặc điều kiện thanh toán vừa thay đổi. Không ghi nhận khoản nhận; hãy tải lại đơn và kiểm tra trạng thái.",409);
    }
    return json({ok:true,transactionId,message:direction==="received"?"Đã ghi nhận khoản tiền Admin đã đối chiếu thực tế.":"Đã ghi nhận khoản hoàn tiền đã đối chiếu thực tế."},201);
  } catch(error) {
    if(/UNIQUE constraint/i.test(String(error?.message||"")))return fail("Mã giao dịch này đã được ghi nhận trước đó.",409);
    return fail("Không lưu được giao dịch đã xác minh.",503);
  }
}
export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.",405); }
