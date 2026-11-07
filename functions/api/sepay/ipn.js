import { fail, json, readJsonBodyLimited } from "../../_lib.js";
import { constantTimeSecretMatch, parseVndAmount, sepayIpnSecret } from "../../sepay.js";

const noStore={"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};
const ignored=()=>json({ok:true,ignored:true},200,noStore);

export async function onRequestPost({request,env}) {
  const expected=sepayIpnSecret(env);
  const received=request.headers.get("X-Secret-Key")||"";
  if(!expected||!constantTimeSecretMatch(received,expected))return fail("Xác thực IPN không hợp lệ.",401,noStore);
  const parsed=await readJsonBodyLimited(request,64*1024);
  if(parsed.error||!parsed.value||typeof parsed.value!=="object"||Array.isArray(parsed.value))return fail("Dữ liệu IPN không hợp lệ.",400,noStore);
  const payload=parsed.value;
  if(payload.notification_type!=="ORDER_PAID")return ignored();
  const invoice=String(payload.order?.order_invoice_number||"");
  const gatewayOrderId=String(payload.order?.id||"");
  const transactionId=String(payload.transaction?.transaction_id||payload.transaction?.id||"");
  const orderAmount=parseVndAmount(payload.order?.order_amount);
  const transactionAmount=parseVndAmount(payload.transaction?.transaction_amount);
  if(!invoice||invoice.length>64||!gatewayOrderId||gatewayOrderId.length>100||!transactionId||transactionId.length>120)return fail("Thiếu thông tin giao dịch SePay.",400,noStore);
  if(payload.order?.order_status!=="CAPTURED"||payload.transaction?.transaction_status!=="APPROVED"||
     payload.transaction?.transaction_type!=="PAYMENT"||payload.order?.order_currency!=="VND"||
     payload.transaction?.transaction_currency!=="VND"||!orderAmount||orderAmount!==transactionAmount)return fail("Trạng thái hoặc số tiền IPN không khớp.",409,noStore);
  let checkout=null;
  try {
    checkout=await env.DB.prepare(
      "SELECT id,order_id,amount,status,transaction_id FROM sepay_payment_orders WHERE order_invoice_number=? LIMIT 1"
    ).bind(invoice).first();
    if(!checkout)return fail("Không tìm thấy hóa đơn SePay.",404,noStore);
    if(Number(checkout.amount)!==transactionAmount)return fail("Số tiền không khớp hóa đơn đã tạo.",409,noStore);
    if(checkout.status==="paid") {
      if(checkout.transaction_id===transactionId)return json({ok:true,duplicate:true},200,noStore);
      return fail("Hóa đơn đã được đối soát với giao dịch khác.",409,noStore);
    }
    if(checkout.status!=="pending")return fail("Hóa đơn SePay không còn chờ thanh toán.",409,noStore);
    const order=await env.DB.prepare(
      "SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1"
    ).bind(checkout.order_id).first();
    if(!order||order.status==="cancelled"||Number(order.price_confirmation_required)!==0||!order.payment_terms_confirmed_at)
      return fail("Đơn hàng chưa đủ điều kiện ghi nhận thanh toán.",409,noStore);
    const reference="SEPAY:"+transactionId;
    const rawPayload=JSON.stringify(payload);
    const note="SePay "+transactionId+" · "+String(payload.transaction?.transaction_date||"").slice(0,40);
    const transactionRowId=crypto.randomUUID();
    const orderPaymentStatusSql=
      "UPDATE orders SET status=CASE WHEN status='pending_confirmation' THEN 'confirmed' ELSE status END,payment_status=CASE WHEN total IS NOT NULL AND total>=0 AND " +
      "((SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)+(SELECT COALESCE(SUM(amount),0) FROM order_cod_settlements WHERE order_id=?))>=COALESCE((SELECT CASE WHEN json_extract(details_json,'$.selectedPaymentOption')='full' THEN CAST(json_extract(details_json,'$.selectedPaymentAmount') AS INTEGER) ELSE total END FROM audit_logs WHERE entity_type='order' AND entity_id=orders.id AND action='order_created' ORDER BY created_at DESC LIMIT 1),total) AND " +
      "(SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'paid' " +
      "WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)<=0 AND EXISTS(SELECT 1 FROM order_payment_transactions WHERE order_id=? AND direction='refunded') THEN 'refunded' " +
      "WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'pending' ELSE 'unpaid' END,updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)";
    const statements=[
      env.DB.prepare(
        "INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) " +
        "SELECT ?,?,NULL,'received',?,?,?,'sepay_ipn' WHERE EXISTS (SELECT 1 FROM sepay_payment_orders WHERE id=? AND status='pending' AND amount=?) " +
        "AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled' AND price_confirmation_required=0 AND total IS NOT NULL AND payment_terms_confirmed_at IS NOT NULL)"
      ).bind(transactionRowId,checkout.order_id,transactionAmount,reference,note,checkout.id,transactionAmount,checkout.order_id),
      env.DB.prepare(
        "UPDATE sepay_payment_orders SET status='paid',transaction_id=?,transaction_reference=?,ipn_payload_json=?,updated_at=datetime('now') " +
        "WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)"
      ).bind(transactionId,reference,rawPayload,checkout.id,transactionRowId),
      env.DB.prepare(orderPaymentStatusSql).bind(checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,transactionRowId),
      env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?,'sepay','sepay_payment_received','order',?,? WHERE EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)"
      ).bind(crypto.randomUUID(),checkout.order_id,JSON.stringify({invoiceNumber:invoice,transactionId,amount:transactionAmount}),transactionRowId)
    ];
    if(order.status==="pending_confirmation")statements.push(env.DB.prepare(
      "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
      "SELECT ?,'sepay','order_updated','order',?,? WHERE EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?) " +
      "AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed')"
    ).bind(crypto.randomUUID(),checkout.order_id,JSON.stringify({from:"pending_confirmation",status:"confirmed",paymentConfirmedAutomatically:true}),transactionRowId,checkout.order_id));
    const results=await env.DB.batch(statements);
    if(Number(results?.[0]?.meta?.changes||0)!==1) {
      const duplicate=await env.DB.prepare("SELECT order_id FROM order_payment_transactions WHERE transaction_reference=? LIMIT 1").bind(reference).first();
      if(duplicate?.order_id===checkout.order_id)return json({ok:true,duplicate:true},200,noStore);
      return fail("Giao dịch chưa được ghi nhận; kiểm tra lại điều kiện đơn hàng.",409,noStore);
    }
    return json({ok:true,received:true},200,noStore);
  } catch {
    try {
      const duplicate=await env.DB.prepare("SELECT order_id FROM order_payment_transactions WHERE transaction_reference=? LIMIT 1").bind("SEPAY:"+transactionId).first();
      if(duplicate)return duplicate.order_id===checkout?.order_id?json({ok:true,duplicate:true},200,noStore):fail("Mã giao dịch đã được gắn với hóa đơn khác.",409,noStore);
    } catch {}
    return fail("Không thể ghi nhận IPN SePay.",503,noStore);
  }
}

export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405,noStore)}
