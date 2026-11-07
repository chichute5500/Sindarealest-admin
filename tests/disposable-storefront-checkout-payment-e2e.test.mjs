/**
 * Disposable end-to-end checkout -> SePay IPN lifecycle.
 * Uses one in-memory SQLite database and fake sandbox credentials only.
 * No Cloudflare credentials, real bank transfers, or Production writes.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost as ordersPost } from '../functions/api/orders.js';
import { onRequestPost as checkoutQuotePost } from '../functions/api/checkout-quote.js';
import { onRequestGet as orderPaymentGet } from '../functions/api/order-payment.js';
import { onRequestPost as receiveWebhook } from '../functions/api/sepay/webhook.js';
import { hashOrderAccessToken } from '../functions/_payments.js';

const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const migration of [
  '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
  '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
  '0007_order_contact_details.sql','0008_product_sku_verification.sql',
  '0009_fulfillment_and_manual_payments.sql','0018_payment_delivery_settlement.sql',
  '0019_sepay_payment_gateway.sql'
]) db.exec(readFileSync(new URL('../migrations/'+migration,import.meta.url),'utf8'));
const DB={
  prepare(sql){
    let args=[];
    return {
      bind(...params){args=params;return this},
      async first(){return db.prepare(sql).get(...args)||null},
      async all(){return {results:db.prepare(sql).all(...args)}},
      async run(){const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}}},
      execute(){
        if(/^\s*(?:SELECT|WITH|PRAGMA)\b/i.test(sql))return {success:true,results:db.prepare(sql).all(...args),meta:{changes:0}};
        const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};
      }
    };
  },
  async batch(statements){
    db.exec('BEGIN IMMEDIATE');
    try{const results=statements.map(statement=>statement.execute());db.exec('COMMIT');return results}
    catch(error){db.exec('ROLLBACK');throw error}
  }
};
const env={
  DB,SESSION_SECRET:'DISPOSABLE_TEST_SECRET_32_CHARS_LONG',
  SEPAY_WEBHOOK_SECRET:'DISPOSABLE_WEBHOOK_SECRET_VALUE_123456789',
  SEPAY_QR_BANK_CODE:'VCB',SEPAY_QR_BANK_NAME:'Vietcombank',
  SEPAY_QR_BANK_ACCOUNT:'1234567890',SEPAY_QR_ACCOUNT_NAME:'QA TEST OWNER'
};
const root='https://shop.example';
const request=(path,method='GET',body,headers={})=>new Request(root+path,{
  method,headers:{Origin:root,'Sec-Fetch-Site':'same-origin',...headers,
    ...(body===undefined?{}:{'Content-Type':'application/json'})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
});
const invoke=(handler,path,method='GET',body,extraEnv=env,headers={})=>
  handler({env:extraEnv,request:request(path,method,body,headers)});
const productId='00000000-1111-4222-8333-000000000085';
db.prepare("INSERT INTO products(id,slug,sku,sku_verified,title,category,category_label,price,stock,published,source_price_confirmed,fulfillment_type) VALUES(?,?,'QA-ORDER-001',1,'Ví giả lập QA','wallets','Ví',150000,5,1,1,'in_stock')")
  .run(productId,'e2e-qa-wallet');
db.prepare("UPDATE settings SET value='1' WHERE key='show_prices'").run();

const checkout={fullName:'QA TEST (NO REAL CUSTOMER)',phone:'0900000000',
  address:'Disposable integration test',note:'Sandbox only',
  paymentOption:'full',quotedTotal:150000,items:[{id:productId,quantity:1}]};
const quote=await (await invoke(checkoutQuotePost,'/api/checkout-quote','POST',{
  items:checkout.items,paymentOption:'full',quotedTotal:checkout.quotedTotal
})).json();
assert.equal(quote.paymentReady,true);
assert.equal(quote.paymentProvider,'sepay');
assert.equal(quote.selectedPaymentAmount,142500);
assert.equal('paymentQrImageKey' in quote,false,'Static QR is no longer part of checkout');

const createdResponse=await invoke(ordersPost,'/api/orders','POST',checkout);
assert.equal(createdResponse.status,201,await createdResponse.clone().text());
const created=await createdResponse.json();
assert.equal(created.paymentProvider,'sepay');
assert.equal(created.paymentReady,true);
assert.equal(created.paymentInstructions.provider,'sepay');
assert.equal(created.paymentInstructions.amount,142500);
assert.equal(created.paymentInstructions.qrIncludesAmount,true);
assert.match(created.transferReference,/^SP-[A-Z0-9]{16}$/);
assert.notEqual(created.transferReference,created.orderNumber,'bank memo is separate from the public order code');
assert.match(created.paymentInstructions.qrImageUrl,/vietqr\.app\/img/);
assert.match(created.paymentInstructions.qrImageUrl,/amount=142500/);
assert.match(created.paymentInstructions.qrImageUrl,/des=/);
const order=db.prepare('SELECT id,public_access_token_hash FROM orders WHERE order_number=?').get(created.orderNumber);
assert.equal(order.public_access_token_hash,await hashOrderAccessToken(created.orderAccessToken));
const gateway=db.prepare('SELECT order_invoice_number,amount,status FROM sepay_payment_orders WHERE order_id=?').get(order.id);
assert.equal(gateway.order_invoice_number,created.transferReference);
assert.equal(gateway.amount,142500);
assert.equal(gateway.status,'pending');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_requests WHERE order_id=?').get(order.id).n,0,
  'New checkout does not create a manual QR payment request');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?').get(order.id).n,0,
  'Creating checkout never records money received');

const tokenQuery='?orderNumber='+encodeURIComponent(created.orderNumber)+'&token='+created.orderAccessToken;
const pending=await (await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery)).json();
assert.equal(pending.paymentProvider,'sepay');
assert.equal(pending.gatewayStatus,'pending');
assert.equal(pending.paymentReady,true);
assert.equal(pending.qrIncludesAmount,true);

const payload={id:92704,gateway:'Vietcombank',transactionDate:'2026-11-07 00:00:00',accountNumber:env.SEPAY_QR_BANK_ACCOUNT,
  subAccount:'',code:created.transferReference,content:created.transferReference+' chuyen tien',transferType:'in',description:'QA transfer',transferAmount:142500,accumulated:1000000,referenceCode:'FT-QA-001'};
const webhookRequest=(override={})=>{
  const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));
  return crypto.subtle.importKey('raw',new TextEncoder().encode(env.SEPAY_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']).then(async key=>{
    const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw)));
    const signature='sha256='+[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
    return new Request(root+'/api/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':timestamp,'X-SePay-Signature':signature,...override},body:raw});
  });
};
const webhookEnv={...env,DB};
const firstWebhook=await receiveWebhook({env:webhookEnv,request:await webhookRequest()});
assert.equal(firstWebhook.status,200,await firstWebhook.clone().text());
assert.equal((await firstWebhook.json()).success,true);
const repeatedWebhook=await receiveWebhook({env:webhookEnv,request:await webhookRequest()});
assert.equal(repeatedWebhook.status,200);
assert.equal((await repeatedWebhook.json()).success,true);
const rejectedWebhook=await receiveWebhook({env:webhookEnv,request:new Request(root+'/api/sepay/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Timestamp':String(Math.floor(Date.now()/1000)),'X-SePay-Signature':'sha256='+('0'.repeat(64))},body:JSON.stringify(payload)})});
assert.equal(rejectedWebhook.status,401);

const paid=await (await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery)).json();
assert.equal(paid.gatewayStatus,'paid');
assert.equal(paid.paymentSummary.netReceivedAmount,142500);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?').get(order.id).n,1,
  'Repeated IPN delivery is idempotent');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_requests WHERE order_id=?').get(order.id).n,0);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
console.log('PASS: inline VietQR order, signed SePay bank webhook settlement, duplicate delivery, and no static checkout QR.');
