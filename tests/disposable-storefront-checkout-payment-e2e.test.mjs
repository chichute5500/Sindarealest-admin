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
import { onRequestPost as receiveIpn } from '../functions/api/sepay/ipn.js';
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
  SEPAY_ENV:'sandbox',SEPAY_MERCHANT_ID:'MERCHANT_TEST',
  SEPAY_MERCHANT_SECRET_KEY:'MERCHANT_SECRET_TEST',
  SEPAY_IPN_SECRET_KEY:'IPN_SECRET_TEST'
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
assert.equal(created.sepayCheckout.url,'https://sandbox.pay.sepay.vn/v1/checkout/init');
assert.ok(created.sepayCheckout.fields.signature);
const order=db.prepare('SELECT id,public_access_token_hash FROM orders WHERE order_number=?').get(created.orderNumber);
assert.equal(order.public_access_token_hash,await hashOrderAccessToken(created.orderAccessToken));
const gateway=db.prepare('SELECT order_invoice_number,amount,status FROM sepay_payment_orders WHERE order_id=?').get(order.id);
assert.equal(gateway.order_invoice_number,created.orderNumber);\nassert.equal(gateway.amount,142500);\nassert.equal(gateway.status,'pending');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_requests WHERE order_id=?').get(order.id).n,0,
  'New checkout does not create a manual QR payment request');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?').get(order.id).n,0,
  'Creating checkout never records money received');

const tokenQuery='?orderNumber='+encodeURIComponent(created.orderNumber)+'&token='+created.orderAccessToken;
const pending=await (await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery)).json();
assert.equal(pending.paymentProvider,'sepay');
assert.equal(pending.gatewayStatus,'pending');
assert.equal(pending.paymentReady,false);

const payload={
  timestamp:1794000000,notification_type:'ORDER_PAID',
  order:{id:'gateway-order-qa',order_status:'CAPTURED',order_currency:'VND',
    order_amount:'142500.00',order_invoice_number:created.orderNumber},
  transaction:{id:'gateway-transaction-qa',transaction_id:'TX-QA-001',
    transaction_type:'PAYMENT',transaction_status:'APPROVED',
    transaction_amount:'142500.00',transaction_currency:'VND',
    transaction_date:'2026-11-07 00:00:00'}
};
const ipnRequest=()=>request('/api/sepay/ipn','POST',payload,{'X-Secret-Key':env.SEPAY_IPN_SECRET_KEY});
const ipnEnv={...env,DB};
const firstIpn=await receiveIpn({env:ipnEnv,request:ipnRequest()});
assert.equal(firstIpn.status,200,await firstIpn.clone().text());
assert.equal((await firstIpn.json()).received,true);
const repeatedIpn=await receiveIpn({env:ipnEnv,request:ipnRequest()});
assert.equal(repeatedIpn.status,200);
assert.equal((await repeatedIpn.json()).duplicate,true);
const rejectedIpn=await receiveIpn({env:ipnEnv,request:request('/api/sepay/ipn','POST',payload,{'X-Secret-Key':'wrong'})});
assert.equal(rejectedIpn.status,401);

const paid=await (await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery)).json();
assert.equal(paid.gatewayStatus,'paid');
assert.equal(paid.paymentSummary.netReceivedAmount,142500);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?').get(order.id).n,1,
  'Repeated IPN delivery is idempotent');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_payment_requests WHERE order_id=?').get(order.id).n,0);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
console.log('PASS: sandbox checkout, SePay IPN settlement, duplicate delivery, and no static checkout QR.');
