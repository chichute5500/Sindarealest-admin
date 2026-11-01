import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { summarizeOrderPayment } from "../../_payments.js";

export async function onRequestPost(context) {
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,8*1024);
  if(parsed.error)return fail(parsed.error==="too_large"?"Thông tin đối soát COD vượt giới hạn.":"Thông tin đối soát COD không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value||{},orderId=String(body.orderId||""),amount=body.amount;
  const reference=String(body.transactionReference||"").trim().toUpperCase(),note=String(body.note||"").trim();
  if(!orderId||!Number.isSafeInteger(amount)||amount<=0||amount>2_000_000_000||reference.length<4||reference.length>80||!/^[A-Z0-9][A-Z0-9._/-]{2,79}$/.test(reference)||note.length>500)return fail("Nhập đủ số COD thực Shop đã nhận và mã giao dịch hãng vận chuyển.");
  try {
    const db=context.env.DB;
    const order=await db.prepare("SELECT id,status,delivery_status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if(!order)return fail("Không tìm thấy đơn hàng.",404);
    if(order.status!=="completed"||order.delivery_status!=="delivered")return fail("Chỉ đối soát COD sau khi đơn được xác nhận giao thành công.",409);
    if(Number(order.price_confirmation_required)!==0||!order.payment_terms_confirmed_at)return fail("Đơn chưa chốt giá và điều kiện thanh toán.",409);
    const checkout=await db.prepare("SELECT json_extract(details_json,'$.selectedPaymentOption') AS payment_option FROM audit_logs WHERE entity_type='order' AND entity_id=? AND action='order_created' ORDER BY created_at DESC LIMIT 1").bind(orderId).first();
    if(checkout?.payment_option!=="deposit")return fail("Đơn thanh toán toàn bộ không có khoản COD cần đối soát.",409);
    const tx=await db.prepare("SELECT direction,amount,actor FROM order_payment_transactions WHERE order_id=?").bind(orderId).all();
    const existingCod=await db.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM order_cod_settlements WHERE order_id=?").bind(orderId).first();
    const summary=summarizeOrderPayment({total:Number(order.total),paymentOption:"deposit",transactions:tx.results||[],codReceivedAmount:existingCod?.amount,termsConfirmed:true});
    if(!summary.eligibleToShip||!Number.isSafeInteger(summary.codRemaining)||summary.codRemaining<=0)return fail("Đơn không còn COD phải thu hoặc khoản cọc chưa đủ.",409);
    if(amount!==summary.codRemaining)return fail("Chỉ xác nhận khi hãng vận chuyển đã chuyển đủ COD còn lại: "+summary.codRemaining+"đ. Hệ thống không hỗ trợ thu COD thiếu.",409);
    const bankReceived=summary.netReceivedAmount,expectedCod=summary.codRemaining,id=crypto.randomUUID();
    const results=await db.batch([
      db.prepare("INSERT INTO order_cod_settlements(id,order_id,amount,transaction_reference,note,actor) SELECT ?,?,?,?,?, 'admin' WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='completed' AND delivery_status='delivered' AND total=?) AND (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)=? AND NOT EXISTS(SELECT 1 FROM order_cod_settlements WHERE order_id=?)").bind(id,orderId,amount,reference,note,orderId,order.total,orderId,bankReceived,orderId),
      db.prepare("UPDATE orders SET payment_status='paid',updated_at=datetime('now') WHERE id=? AND status='completed' AND delivery_status='delivered' AND EXISTS(SELECT 1 FROM order_cod_settlements WHERE id=? AND amount=?) AND (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)+(SELECT COALESCE(SUM(amount),0) FROM order_cod_settlements WHERE order_id=?)>=total").bind(orderId,id,expectedCod,orderId,orderId),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin','cod_remittance_verified','order',?,? WHERE EXISTS(SELECT 1 FROM order_cod_settlements WHERE id=?)").bind(crypto.randomUUID(),orderId,JSON.stringify({settlementId:id,amount,transactionReference:reference,note}),id)
    ]);
    if(Number(results?.[0]?.meta?.changes||0)!==1)return fail("COD đã thay đổi hoặc đã đối soát. Tải lại đơn và kiểm tra sao kê trước khi thử lại.",409);
    return json({ok:true,settlementId:id,amount,message:"Đã xác nhận hãng vận chuyển chuyển đủ COD và Shop đã nhận tiền."},201);
  }catch(error){
    if(/UNIQUE constraint/i.test(String(error?.message||"")))return fail("Mã giao dịch hoặc khoản COD này đã được ghi nhận.",409);
    return fail("Không ghi nhận được khoản COD đã đối soát.",503);
  }
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
