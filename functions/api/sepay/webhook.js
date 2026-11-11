import { fail, json, readBodyBytesLimited } from "../../_lib.js";
import { loadSepayBankConfig, parseVndAmount, verifySepayBankWebhook } from "../../sepay.js";
import { sendAdminPush } from "../../_notifications.js";

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
  // Some bank/SePay transaction views normalize away the memo hyphen. Match
  // either spelling and compare using the same separator-free representation.
  const referenceMatch=referenceText.match(/(?:^|[^A-Z0-9])SP-?([A-Z0-9]{16})(?![A-Z0-9])/);
  const invoice=referenceMatch?`SP${referenceMatch[1]}`:"";
  if(!invoice)return accepted();
  try{
    const bank=loadSepayBankConfig(env);
    const incomingAccountNumber=String(payload.accountNumber||"").replace(/\s+/g,"");
    const incomingVirtualAccount=String(payload.subAccount||"").replace(/\s+/g,"").toUpperCase();
    if(!bank||incomingAccountNumber!==bank.accountNumber)return accepted();
    // With an official VA configured, only credit transfers tagged with that
    // VA. SePay keeps the underlying main account in accountNumber and sends
    // the receiving VA separately as subAccount.
    if(bank.virtualAccountNumber&&incomingVirtualAccount!==bank.virtualAccountNumber)return accepted();
    const checkout=await env.DB.prepare(
      "SELECT id,amount,status,payload_json FROM sepay_checkout_intents WHERE REPLACE(transfer_reference,'-','')=? LIMIT 1"
    ).bind(invoice).first();
    if(!checkout||checkout.status!=="pending")return accepted();
    const transactionReference="SEPAYBANK:"+transactionId;
    const transactionRowId=crypto.randomUUID();
    const rawPayload=rawBody;
    const writes=await env.DB.prepare(
      "INSERT INTO sepay_checkout_transactions(id,intent_id,transaction_id,amount,transaction_reference,payload_json) "+
      "SELECT ?,?,?,?,?,? FROM sepay_checkout_intents WHERE id=? AND status='pending' AND expires_at>datetime('now') "+
      "AND NOT EXISTS(SELECT 1 FROM sepay_checkout_transactions WHERE transaction_id=? OR transaction_reference=?)"
    ).bind(transactionRowId,checkout.id,transactionId,amount,transactionReference,"{}",checkout.id,transactionId,transactionReference).run();
    if(Number(writes?.meta?.changes||0)!==1){
      const duplicate=await env.DB.prepare("SELECT intent_id FROM sepay_checkout_transactions WHERE transaction_id=? OR transaction_reference=? LIMIT 1").bind(transactionId,transactionReference).first();
      // A retry may be the first request to finish order creation after an
      // earlier delivery saved the receipt but hit a transient D1 failure.
      if(duplicate?.intent_id!==checkout.id)return accepted();
    }
    const receipt=await env.DB.prepare(
      "SELECT i.amount,i.payload_json,i.status,i.transfer_reference,COALESCE(SUM(t.amount),0) AS received FROM sepay_checkout_intents i LEFT JOIN sepay_checkout_transactions t ON t.intent_id=i.id WHERE i.id=? GROUP BY i.id"
    ).bind(checkout.id).first();
    if(!receipt||receipt.status!=="pending"||Number(receipt.received)<Number(receipt.amount))return accepted();
    let snapshot;try{snapshot=JSON.parse(receipt.payload_json)}catch{return fail("Dữ liệu thanh toán cần được cửa hàng kiểm tra.",503,headers)}
    if(!snapshot||!Array.isArray(snapshot.items)||!snapshot.items.length)return fail("Dữ liệu thanh toán cần được cửa hàng kiểm tra.",503,headers);

    const orderId=crypto.randomUUID();
    const orderNumber=`SD${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().replaceAll("-","").slice(0,6).toUpperCase()}`;
    const customerId=crypto.randomUUID();
    const statements=[
      env.DB.prepare("UPDATE sepay_checkout_intents SET status='paid',order_id=?,order_number=?,paid_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND status='pending' AND expires_at>datetime('now') AND (SELECT COALESCE(SUM(amount),0) FROM sepay_checkout_transactions WHERE intent_id=?)>=amount").bind(orderId,orderNumber,checkout.id,checkout.id),
      env.DB.prepare("INSERT INTO customers(id,full_name,phone,email,address) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?) ON CONFLICT(phone) DO NOTHING").bind(customerId,snapshot.fullName,snapshot.phone,snapshot.email,snapshot.address,checkout.id,orderId),
      env.DB.prepare("INSERT INTO customer_address_details(customer_id,province_code,province,ward_code,ward,street_address,updated_at) SELECT c.id,?,?,?,?,?,datetime('now') FROM customers c WHERE c.phone=? AND c.id=? AND EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?) ON CONFLICT(customer_id) DO NOTHING").bind(snapshot.provinceCode,snapshot.province,snapshot.wardCode,snapshot.ward,snapshot.streetAddress,snapshot.phone,customerId,checkout.id,orderId),
      env.DB.prepare("INSERT INTO orders(id,order_number,customer_id,status,subtotal,total,price_confirmation_required,customer_note,public_access_token_hash,payment_terms_confirmed_at,payment_terms_confirmed_by,payment_status) SELECT ?,?,c.id,'confirmed',?,?,0,?,?,?,'customer_checkout',CASE WHEN ?='full' OR ?>=? THEN 'paid' ELSE 'pending' END FROM customers c WHERE c.phone=? AND EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(orderId,orderNumber,snapshot.subtotal,snapshot.subtotal,snapshot.customerNote,snapshot.orderAccessTokenHash,snapshot.paymentTermsConfirmedAt,snapshot.selectedPaymentOption,Number(receipt.received),snapshot.subtotal,snapshot.phone,checkout.id,orderId),
      env.DB.prepare("INSERT INTO order_contact_details(order_id,full_name,phone,email,created_at) SELECT ?,?,?,?,datetime('now') WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(orderId,snapshot.fullName,snapshot.phone,snapshot.email,checkout.id,orderId),
      env.DB.prepare("INSERT INTO order_shipping_addresses(order_id,province_code,province,ward_code,ward,street_address,full_address) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(orderId,snapshot.provinceCode,snapshot.province,snapshot.wardCode,snapshot.ward,snapshot.streetAddress,snapshot.address,checkout.id,orderId),
      ...snapshot.items.map(item=>env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,sku,sku_verified,title,quantity,unit_price,line_total,fulfillment_type) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(item.id,orderId,item.productId,item.sku,item.skuVerified?1:0,item.title,item.quantity,item.price,item.price===null?null:item.price*item.quantity,item.fulfillmentType,checkout.id,orderId)),
      ...snapshot.items.filter(item=>item.shoeSize).map(item=>env.DB.prepare("INSERT INTO order_item_details(item_id,size) SELECT ?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(item.id,item.shoeSize,checkout.id,orderId)),
      env.DB.prepare("INSERT INTO sepay_payment_orders(id,order_id,order_invoice_number,installment_type,amount,status,transaction_id,transaction_reference,ipn_payload_json) SELECT ?,?,?,?,?, 'paid',?,?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(crypto.randomUUID(),orderId,receipt.transfer_reference,snapshot.selectedPaymentOption,snapshot.selectedAmount,transactionId,transactionReference,rawPayload,checkout.id,orderId),
      env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'customer','order_created','order',?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(crypto.randomUUID(),orderId,JSON.stringify({orderNumber,itemCount:snapshot.items.length,itemSelections:snapshot.items.map(item=>({itemId:item.id,imageVariant:item.imageVariant||""})),selectedPaymentOption:snapshot.selectedPaymentOption,selectedPaymentAmount:snapshot.selectedAmount,selectedRemainingAmount:snapshot.selectedRemainingAmount,selectedDiscountAmount:snapshot.selectedDiscountAmount,transferReference:receipt.transfer_reference,customerPaymentVerified:true}),checkout.id,orderId),
      env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'sepay','order_updated','order',?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='confirmed')").bind(crypto.randomUUID(),orderId,JSON.stringify({from:"pending_confirmation",status:"confirmed",paymentConfirmedAutomatically:true}),orderId),
      env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'sepay','sepay_bank_transfer_received','order',?,? WHERE EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)").bind(crypto.randomUUID(),orderId,JSON.stringify({transactionId,amount,invoiceNumber:invoice}),checkout.id,orderId),
      env.DB.prepare("UPDATE sepay_checkout_intents SET payload_json='{}',updated_at=datetime('now') WHERE id=? AND status='paid' AND order_id=?").bind(checkout.id,orderId)
    ];
    // Add every verified inbound receipt to the normal order ledger. The
    // transaction reference remains globally idempotent at the database layer.
    statements.push(env.DB.prepare(
      "INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) "+
      "SELECT lower(hex(randomblob(16))),?,NULL,'received',amount,transaction_reference,'SePay bank transfer '||transaction_id,'sepay_webhook' "+
      "FROM sepay_checkout_transactions WHERE intent_id=? AND EXISTS(SELECT 1 FROM sepay_checkout_intents WHERE id=? AND status='paid' AND order_id=?)"
    ).bind(orderId,checkout.id,checkout.id,orderId));
    const finalized=await env.DB.batch(statements);
    if(Number(finalized?.[0]?.meta?.changes||0)!==1)return accepted();
    try{await sendAdminPush(env,{title:snapshot.selectedPaymentOption==="full"?"Đã nhận đủ tiền · Đơn đã xác nhận":"Đã nhận cọc · Đơn đã xác nhận",body:orderNumber+" · "+snapshot.items.length+" loại sản phẩm",url:"/admin/"})}catch{}
    return accepted();
  }catch{return fail("Không thể ghi nhận giao dịch SePay.",503,headers)}
}

export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405,headers)}
