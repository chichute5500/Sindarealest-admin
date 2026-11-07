import { fail, json, readBodyBytesLimited } from "../../_lib.js";
import { loadSepayBankConfig, parseVndAmount, verifySepayBankWebhook } from "../../sepay.js";

const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};
const accepted=()=>json({success:true},200,headers);

export async function onRequestPost({request,env}) {
  if(!env?.DB)return fail("Dịch vụ nhận thanh toán chưa sẵn sàng.",503,headers);
  const body=await readBodyBytesLimited(request,64*1024);
  if(body.error)return fail("Dữ liệu webhook không hợp lệ.",body.error==="too_large"?413:400,headers);
  const rawBody=new TextDecoder().decode(body.bytes);
  if(!await verifySepayBankWebhook({env,timestamp:request.headers.get("X-SePay-Timestamp"),signature:request.headers.get("X-SePay-Signature"),rawBody}))
    return fail("Chữ ký webhook SePay không hợp lệ hoặc đã hết hạn.",401,headers);
  let payload;
  try{payload=JSON.parse(rawBody)}catch{return fail("JSON webhook không hợp lệ.",400,headers)}
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return fail("Payload webhook không hợp lệ.",400,headers);
  const transactionId=String(payload.id??"").trim();
  const amount=parseVndAmount(payload.transferAmount);
  if(!/^\d{1,64}$/.test(transactionId)||!amount)return fail("Thiếu mã giao dịch hoặc số tiền hợp lệ.",400,headers);
  if(String(payload.transferType||"").toLowerCase()!=="in")return accepted();
  const referenceText=(String(payload.code||"")+" "+String(payload.content||"")).toUpperCase();
  const invoice=referenceText.match(/SD-[A-Z0-9]+-[A-Z0-9]{6}/)?.[0]||"";
  if(!invoice)return accepted();
  try{
    const bank=loadSepayBankConfig(env);
    if(!bank||String(payload.accountNumber||"").replace(/\s+/g,"")!==bank.accountNumber)return accepted();
    const checkout=await env.DB.prepare(
      "SELECT id,order_id,amount,status FROM sepay_payment_orders WHERE order_invoice_number=? LIMIT 1"
    ).bind(invoice).first();
    if(!checkout||checkout.status==="cancelled"||checkout.status==="void")return accepted();
    const order=await env.DB.prepare(
      "SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1"
    ).bind(checkout.order_id).first();
    if(!order||order.status==="cancelled"||Number(order.price_confirmation_required)!==0||!order.payment_terms_confirmed_at)return accepted();

    const transactionReference="SEPAY-BANK:"+transactionId;
    const transactionRowId=crypto.randomUUID();
    const rawPayload=rawBody;
    const note="SePay bank transfer "+transactionId+" · "+String(payload.transactionDate||"").slice(0,40);
    const orderPaymentStatusSql=
      "UPDATE orders SET payment_status=CASE WHEN total IS NOT NULL AND total>=0 AND "+
      "((SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)+(SELECT COALESCE(SUM(amount),0) FROM order_cod_settlements WHERE order_id=?))>=COALESCE((SELECT CASE WHEN json_extract(details_json,'$.selectedPaymentOption')='full' THEN CAST(json_extract(details_json,'$.selectedPaymentAmount') AS INTEGER) ELSE total END FROM audit_logs WHERE entity_type='order' AND entity_id=orders.id AND action='order_created' ORDER BY created_at DESC LIMIT 1),total) AND "+
      "(SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'paid' "+
      "WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)<=0 AND EXISTS(SELECT 1 FROM order_payment_transactions WHERE order_id=? AND direction='refunded') THEN 'refunded' "+
      "WHEN (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>0 THEN 'pending' ELSE 'unpaid' END,updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)";
    const writes=await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) "+
        "SELECT ?,?,NULL,'received',?,?,?,'sepay_webhook' WHERE EXISTS (SELECT 1 FROM sepay_payment_orders WHERE id=? AND status IN ('pending','paid')) "+
        "AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled' AND price_confirmation_required=0 AND total IS NOT NULL AND payment_terms_confirmed_at IS NOT NULL) "+
        "AND NOT EXISTS (SELECT 1 FROM order_payment_transactions WHERE transaction_reference=?)"
      ).bind(transactionRowId,checkout.order_id,amount,transactionReference,note,checkout.id,checkout.order_id,transactionReference),
      env.DB.prepare(
        "UPDATE sepay_payment_orders SET status='paid',transaction_id=?,transaction_reference=?,ipn_payload_json=?,updated_at=datetime('now') "+
        "WHERE id=? AND status='pending' AND (SELECT COALESCE(SUM(CASE WHEN direction='received' AND actor<>'admin_cod_completion' THEN amount WHEN direction='refunded' AND actor<>'admin_cod_completion' THEN -amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=?)>=amount "+
        "AND EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)"
      ).bind(transactionId,transactionReference,rawPayload,checkout.id,checkout.order_id,transactionRowId),
      env.DB.prepare(orderPaymentStatusSql).bind(checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,checkout.order_id,transactionRowId),
      env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) "+
        "SELECT ?,'sepay','sepay_bank_transfer_received','order',?,? WHERE EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)"
      ).bind(crypto.randomUUID(),checkout.order_id,JSON.stringify({transactionId,amount,invoiceNumber:invoice}),transactionRowId)
    ]);
    if(Number(writes?.[0]?.meta?.changes||0)!==1){
      const duplicate=await env.DB.prepare("SELECT order_id FROM order_payment_transactions WHERE transaction_reference=? LIMIT 1").bind(transactionReference).first();
      if(duplicate?.order_id===checkout.order_id)return accepted();
      return fail("Giao dịch chưa được ghi nhận.",409,headers);
    }
    return accepted();
  }catch{return fail("Không thể ghi nhận giao dịch SePay.",503,headers)}
}

export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405,headers)}
