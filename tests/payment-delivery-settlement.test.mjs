import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSession} from '../functions/_lib.js';
import {onRequestPost as settleCod} from '../functions/api/admin/cod-settlements.js';
import {onRequestPatch as updateDelivery} from '../functions/api/admin/order-delivery.js';

const SECRET='payment-delivery-cod-session-secret-long';
const PASSWORD='payment-delivery-admin-password-long';
const session=await createSession(SECRET);
const schema=['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql','0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql','0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql','0018_payment_delivery_settlement.sql'].map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n');
function fixture({status='completed',delivery='delivered',option='deposit',received=1_400_000}={}){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;'+schema);
 sql.prepare("INSERT INTO customers(id,full_name,phone) VALUES('c','C','0900000000')").run();
 sql.prepare("INSERT INTO orders(id,order_number,customer_id,status,delivery_status,total,subtotal,price_confirmation_required,payment_terms_confirmed_at) VALUES('o','SD-QA-ORDER-0001','c',?,?,4500000,4500000,0,'2026-10-30')").run(status,delivery);
 sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES('a','customer','order_created','order','o',?)").run(JSON.stringify({selectedPaymentOption:option}));
 if(received)sql.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor) VALUES('bank','o','received',?,'BANK-REF-001','admin')").run(received);
 const DB={
  prepare(query){let values=[];return {sql:query,bind(...v){values=v;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return {results:sql.prepare(query).all(...values)}},execute(){return sql.prepare(query).run(...values)}}},
  async batch(stmts){sql.exec('BEGIN IMMEDIATE');try{const result=stmts.map(s=>({meta:{changes:s.execute().changes}}));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}
 };
 const context=(path,body,method='POST')=>({request:new Request('https://shop.test'+path,{method,headers:{Cookie:'sd_admin_session='+session,Origin:'https://shop.test','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:JSON.stringify(body)}),env:{DB,ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:SECRET}});
 return {sql,context};
}
{
 const f=fixture();
 const partial=await settleCod(f.context('/api/admin/cod-settlements',{orderId:'o',amount:2_900_000,transactionReference:'CARRIER-PARTIAL-01'}));
 assert.equal(partial.status,409,'carrier remittance must equal full COD remaining');
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM order_cod_settlements").get().n,0);
 const result=await settleCod(f.context('/api/admin/cod-settlements',{orderId:'o',amount:3_100_000,transactionReference:'CARRIER-PAID-01'}));
 assert.equal(result.status,201);
 assert.equal(f.sql.prepare("SELECT amount FROM order_cod_settlements WHERE order_id='o'").get().amount,3_100_000);
 assert.equal(f.sql.prepare("SELECT payment_status FROM orders WHERE id='o'").get().payment_status,'paid');
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM order_payment_transactions WHERE actor='admin_cod_completion'").get().n,0);
 f.sql.close();
}
{
 const f=fixture({received:1_000_000});
 const result=await settleCod(f.context('/api/admin/cod-settlements',{orderId:'o',amount:3_500_000,transactionReference:'CARRIER-UNDER-02'}));
 assert.equal(result.status,409,'cannot settle COD when deposit is underpaid');f.sql.close();
}
{
 const f=fixture({option:'full',received:4_275_000});
 const result=await settleCod(f.context('/api/admin/cod-settlements',{orderId:'o',amount:1,transactionReference:'CARRIER-FULL-03'}));
 assert.equal(result.status,409,'full payment has no COD settlement');f.sql.close();
}
{
 const f=fixture({status:'shipped',delivery:'in_transit'});
 const fail=await updateDelivery(f.context('/api/admin/order-delivery',{id:'o',deliveryStatus:'failed_returning'},'PATCH'));
 assert.equal(fail.status,200);
 assert.equal(f.sql.prepare("SELECT delivery_status FROM orders WHERE id='o'").get().delivery_status,'failed_returning');
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM order_cod_settlements").get().n,0);
 const returned=await updateDelivery(f.context('/api/admin/order-delivery',{id:'o',deliveryStatus:'returned'},'PATCH'));
 assert.equal(returned.status,200);
 assert.equal(f.sql.prepare("SELECT delivery_status FROM orders WHERE id='o'").get().delivery_status,'returned');
 const success=await settleCod(f.context('/api/admin/cod-settlements',{orderId:'o',amount:3_100_000,transactionReference:'CARRIER-RETURN-04'}));
 assert.equal(success.status,409,'failed/returned shipments cannot settle COD');f.sql.close();
}
console.log('PASS: separate carrier COD settlement, full amount only, full-payment exclusion, and failed-return delivery lifecycle.');
