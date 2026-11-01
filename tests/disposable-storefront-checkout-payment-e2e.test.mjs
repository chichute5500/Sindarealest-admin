/**
 * Integration E2E on ONE disposable in-memory D1-compatible SQLite database.
 * Calls the real Cloudflare Pages handlers in order, with real migrations.
 * No Cloudflare credentials, remote API calls, real bank payments or Production writes.
 * Simulated "received" and "refunded" are ONLY invented ledger fixtures.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession } from '../functions/_lib.js';
import { hashOrderAccessToken } from '../functions/_payments.js';
import { onRequestGet as productsGet } from '../functions/api/products.js';
import { onRequestPost as ordersPost } from '../functions/api/orders.js';
import { onRequestGet as adminOrdersGet, onRequestPatch as adminOrdersPatch } from '../functions/api/admin/orders.js';
import { onRequestGet as orderPaymentGet } from '../functions/api/order-payment.js';
import { onRequestGet as adminPaymentGet, onRequestPost as paymentRequestPost, onRequestPatch as paymentRequestPatch } from '../functions/api/admin/payment-requests.js';
import { onRequestPost as transactionPost } from '../functions/api/admin/payment-transactions.js';
import { onRequestPut as qrPut } from '../functions/api/admin/payment-qr.js';

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
const migrations = [
  '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
  '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
  '0007_order_contact_details.sql','0008_product_sku_verification.sql',
  '0009_fulfillment_and_manual_payments.sql','0018_payment_delivery_settlement.sql'
];
for (const migration of migrations)
  db.exec(readFileSync(new URL('../migrations/'+migration,import.meta.url),'utf8'));
const DB={
  prepare(sql) {
    let args=[];
    const stmt={
      bind(...params){args=params;return this},
      async first(){return db.prepare(sql).get(...args)||null},
      async all(){return {results:db.prepare(sql).all(...args)}},
      async run(){const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}}},
      execute(){
        if (/^\s*(?:SELECT|WITH|PRAGMA)\b/i.test(sql)) return {success:true,results:db.prepare(sql).all(...args),meta:{changes:0}};
        const result=db.prepare(sql).run(...args);
        return {success:true,meta:{changes:Number(result.changes)}};
      }
    };
    return stmt;
  },
  async batch(statements) {
    db.exec('BEGIN IMMEDIATE');
    try {const results=statements.map(x=>x.execute());db.exec('COMMIT');return results}
    catch(error){db.exec('ROLLBACK');throw error}
  }
};
const SESSION_SECRET='E2E_DISPOSABLE_NOT_A_REAL_SECRET_32_PLUS';
const session=await createSession(SESSION_SECRET);
const qrKey='qr-550e8400-e29b-41d4-a716-446655440000.png';
const fakeObjects=new Map([[qrKey,{size:67}]]);
const env={
  DB,IMAGES:{head:async key=>fakeObjects.get(key)||null},
  ADMIN_PASSWORD:'E2E_ONLY_NOT_PRODUCTION',SESSION_SECRET
};
const root='https://qa.invalid';
const request=(path,method='GET',body,admin=false,origin=root)=>new Request(root+path,{
  method,headers:{
    Origin:origin,'Sec-Fetch-Site':'same-origin',
    ...(admin?{Cookie:'sd_admin_session='+session}:{}),
    ...(body===undefined?{}:{'Content-Type':'application/json'})
  },...(body===undefined?{}:{body:JSON.stringify(body)})
});
const invoke=(handler,path,method='GET',body,admin=false,origin=root)=>
  handler({env,request:request(path,method,body,admin,origin)});
const one=(text,...args)=>db.prepare(text).get(...args);
const trace=[];
async function expectStatus(label,response,predicted) {
  const status=response.status;
  trace.push({step:label,http:status,result:status===predicted?'PASS':'FAIL'});
  if(status!==predicted)throw Error(label+' expected '+predicted+' got '+status+' '+await response.text());
  return response;
}
const productId='00000000-1111-4222-8333-000000000085';
try {
  db.prepare("INSERT INTO products(id,slug,sku,sku_verified,title,category,category_label,price,stock,published,source_price_confirmed,fulfillment_type) VALUES(?,?,'QA-ORDER-001',1,'Ví giả lập QA','wallets','Ví',150000,5,1,1,'in_stock')")
    .run(productId,'e2e-qa-wallet');
  db.prepare("UPDATE settings SET value='1' WHERE key='show_prices'").run();
  const catalog=await (await expectStatus('Public catalog',await invoke(productsGet,'/api/products'),200)).json();
  assert.equal(catalog.length,1);
  assert.equal(catalog[0].price,150000);
  assert.equal(catalog[0].skuVerified,true);

  const checkout={
    fullName:'KHACH HANG QA (KHONG CO THAT)',phone:'0900000000',
    address:'Dia chi thu nghiem, KHONG GIAO HANG',
    note:'DISPOSABLE QA ONLY — khong xu ly thuc te',
    paymentOption:'full',quotedTotal:150000,
    items:[{id:productId,quantity:1}]
  };
  const noMethod={...checkout};delete noMethod.paymentOption;delete noMethod.quotedTotal;
  await expectStatus('Reject priced checkout without a selected payment method',await invoke(ordersPost,'/api/orders','POST',noMethod),400);
  assert.equal(one('SELECT COUNT(*) AS n FROM orders').n,0,'method selection is required before creating a priced order');
  await expectStatus('Reject cross-origin checkout',await invoke(ordersPost,'/api/orders','POST',checkout,false,'https://evil.invalid'),403);
  const created=await (await expectStatus('Checkout POST -> D1 order',await invoke(ordersPost,'/api/orders','POST',checkout),201)).json();
  assert.ok(created.orderNumber.startsWith('SD-'));
  assert.match(created.orderAccessToken,/^[a-f0-9]{64}$/);
  assert.equal(one('SELECT COUNT(*) AS n FROM orders').n,1);
  const record=one('SELECT id,public_access_token_hash FROM orders WHERE order_number=?',created.orderNumber);
  assert.equal(record.public_access_token_hash,await hashOrderAccessToken(created.orderAccessToken));
  assert.ok(!JSON.stringify(record).includes(created.orderAccessToken),'Raw capability token must not be persisted');
  assert.equal(one('SELECT title FROM order_items WHERE order_id=?',record.id).title,'Ví giả lập QA');
  assert.equal(one('SELECT full_name FROM order_contact_details WHERE order_id=?',record.id).full_name,checkout.fullName);
  const adminPath='/api/admin/orders';
  await expectStatus('Admin denies missing session',await invoke(adminOrdersGet,adminPath),401);
  await expectStatus('Admin denies CSRF cross-origin',await invoke(adminOrdersGet,adminPath,'GET',undefined,true,'https://evil.invalid'),403);
  const adminList=await (await expectStatus('Admin receives same order',await invoke(adminOrdersGet,adminPath,'GET',undefined,true),200)).json();
  const listed=adminList.orders.find(x=>x.order_number===created.orderNumber);
  assert.ok(listed);
  assert.equal(listed.items.length,1);
  assert.equal(listed.items[0].sku,'QA-ORDER-001');
  assert.equal(listed.items[0].unitPrice,150000);
  assert.equal(listed.phone,checkout.phone);

  const tokenQuery='?orderNumber='+encodeURIComponent(created.orderNumber)+'&token='+created.orderAccessToken;
  const beforeTerms=await (await expectStatus('Unconfirmed order payment fails closed',await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery),200)).json();
  assert.equal(beforeTerms.paymentReady,false);
  await expectStatus('Wrong access token is rejected',await invoke(orderPaymentGet,'/api/order-payment?orderNumber='+encodeURIComponent(created.orderNumber)+'&token='+('x'.repeat(64))),404);
  await expectStatus('Early payment request forbidden',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{orderId:record.id,paymentOption:'full'},true),409);
  const itemId=listed.items[0].id;
  await expectStatus('Admin confirms price and terms',await invoke(adminOrdersPatch,adminPath,'PATCH',{
    id:record.id,status:'confirmed',prices:[{itemId,unitPrice:150000}],
    termsConfirmed:true,paymentTermsNote:'QA terms - no real transfer'
  },true),200);
  assert.ok(one('SELECT payment_terms_confirmed_at AS confirmed FROM orders WHERE id=?',record.id).confirmed);

  await expectStatus('Absent QR blocks payment request',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{orderId:record.id,paymentOption:'full'},true),409);
  await expectStatus('Reject browser-controlled amount',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{orderId:record.id,paymentOption:'full',amount:1},true),400);
  await expectStatus('Reject unverified QR activation',await invoke(qrPut,'/api/admin/payment-qr','PUT',{action:'activate',verified:false},true),400);
  db.prepare("INSERT INTO settings(key,value) VALUES('payment_qr_pending_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(qrKey);
  await expectStatus('Admin saves bank draft',await invoke(qrPut,'/api/admin/payment-qr','PUT',{
    action:'save-draft',bankName:'QA BANK (NO REAL BANK)',accountNumber:'0000000000',
    accountName:'TEST ACCOUNT ONLY',instructions:'SIMULATED'
  },true),200);
  await expectStatus('Admin verifies and activates QR',await invoke(qrPut,'/api/admin/payment-qr','PUT',{action:'activate',verified:true},true),200);
  const paymentRequest=await (await expectStatus('Admin creates server-priced full payment request',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{
    orderId:record.id,paymentOption:'full'
  },true),201)).json();
  assert.equal(paymentRequest.amount,142500);
  assert.equal(paymentRequest.freeShippingEligible,true);
  assert.equal(paymentRequest.freeShippingApplied,false);
  await expectStatus('Duplicate pending QR request rejected',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{
    orderId:record.id,paymentOption:'full'
  },true),409);
  const publicPending=await (await expectStatus('Public token returns active QR after Admin approval',await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery),200)).json();
  assert.equal(publicPending.paymentReady,true);
  assert.equal(publicPending.amount,142500);
  assert.equal(publicPending.freeShipping,false);
  assert.match(publicPending.qrImageUrl,/^\/payment-qr\/qr-/);
  const checkoutWithActiveQr={...checkout,phone:'0900000103'};
  const direct=await (await expectStatus('Checkout creates a QR request from the active verified Shop QR',await invoke(ordersPost,'/api/orders','POST',checkoutWithActiveQr),201)).json();
  assert.equal(direct.paymentReady,true);
  assert.equal(direct.paymentTermsConfirmed,true);
  assert.equal(direct.paymentInstructions.amount,142500);
  assert.equal(direct.paymentInstructions.transferContent,direct.orderNumber);
  const directRecord=one('SELECT id FROM orders WHERE order_number=?',direct.orderNumber);
  assert.equal(one("SELECT created_by AS actor FROM order_payment_requests WHERE order_id=? AND status='pending'",directRecord.id).actor,'customer_checkout');
  assert.equal(one("SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?",directRecord.id).n,0,'Creating a QR request must never record money as received');
  const directPublic=await (await expectStatus('Order token returns checkout QR immediately',await invoke(orderPaymentGet,'/api/order-payment?orderNumber='+encodeURIComponent(direct.orderNumber)+'&token='+direct.orderAccessToken),200)).json();
  assert.equal(directPublic.paymentReady,true);
  assert.equal(directPublic.amount,142500);
  fakeObjects.delete(qrKey);
  const stale=await (await expectStatus('Missing QR object fails closed',await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery),200)).json();
  assert.equal(stale.paymentReady,false);
  fakeObjects.set(qrKey,{size:67});

  await expectStatus('Unverified browser cannot mark paid',await invoke(transactionPost,'/api/admin/payment-transactions','POST',{
    orderId:record.id,paymentRequestId:paymentRequest.id,direction:'received',amount:142500,transactionReference:'QA-E2E-RECEIPT-1'
  }),401);
  const fixturePayment={orderId:record.id,paymentRequestId:paymentRequest.id,direction:'received',amount:142500,transactionReference:'QA-E2E-RECEIPT-1'};
  await expectStatus('Simulated receipt -> atomic verified ledger',await invoke(transactionPost,'/api/admin/payment-transactions','POST',fixturePayment,true),201);
  assert.equal(one('SELECT payment_status AS status FROM orders WHERE id=?',record.id).status,'paid');
  const paid=await (await expectStatus('Fully paid response applies freeship',await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery),200)).json();
  assert.equal(paid.paymentReady,false);
  assert.equal(paid.freeShipping,true);
  await expectStatus('Duplicate bank reference rejected',await invoke(transactionPost,'/api/admin/payment-transactions','POST',fixturePayment,true),409);
  await expectStatus('Refund above net receipts rejected',await invoke(transactionPost,'/api/admin/payment-transactions','POST',{
    orderId:record.id,direction:'refunded',amount:150001,transactionReference:'QA-E2E-REFUND-OVER'
  },true),409);
  await expectStatus('Simulated refund -> ledger',await invoke(transactionPost,'/api/admin/payment-transactions','POST',{
    orderId:record.id,direction:'refunded',amount:142500,transactionReference:'QA-E2E-REFUND-1',
    note:'Accounting-only test. No money moved.'
  },true),201);
  assert.equal(one('SELECT payment_status AS status FROM orders WHERE id=?',record.id).status,'refunded');
  const paymentAdmin=await (await expectStatus('Admin ledger totals',await invoke(adminPaymentGet,'/api/admin/payment-requests?orderId='+record.id,'GET',undefined,true),200)).json();
  assert.equal(paymentAdmin.summary.netReceivedAmount,0);
  assert.equal(paymentAdmin.transactions.length,2);
  const afterRefund=await (await expectStatus('Refund removes paid-only freeship',await invoke(orderPaymentGet,'/api/order-payment'+tokenQuery),200)).json();
  assert.equal(afterRefund.freeShipping,false);
  await expectStatus('Cancel settled order',await invoke(adminOrdersPatch,adminPath,'PATCH',{id:record.id,status:'cancelled'},true),200);
  await expectStatus('Cancelled order cannot get new QR',await invoke(paymentRequestPost,'/api/admin/payment-requests','POST',{orderId:record.id,paymentOption:'full'},true),409);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  assert.equal(one("SELECT COUNT(*) AS n FROM audit_logs WHERE action='order_created'").n,2);
  assert.equal(one("SELECT COUNT(*) AS n FROM audit_logs WHERE action='payment_received_verified'").n,1);
  assert.equal(one("SELECT COUNT(*) AS n FROM audit_logs WHERE action='payment_refund_verified'").n,1);
  console.log(JSON.stringify({scope:'DISPOSABLE_SQLITE_ONE_DATABASE_REAL_HANDLERS',productionWrites:0,remoteRequests:0,realTransfers:0,pass:true,checks:trace},null,2));
}finally{db.close()}
