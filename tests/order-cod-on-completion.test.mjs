/** Delivery completion must never stand in for carrier COD remittance. */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession } from '../functions/_lib.js';
import { onRequestPatch as patchAdminOrder } from '../functions/api/admin/orders.js';

const SECRET='qa-cod-completion-session-secret-only-long';
const PASSWORD='qa-cod-completion-password';
const files=['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql','0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql','0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql','0018_payment_delivery_settlement.sql'];
const schema=files.map(file=>readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8')).join('\n');
const session=await createSession(SECRET);

function setup({deposit=2_700_000,net=2_700_000,paymentOption='deposit',orderStatus='shipped'}={}){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;'+schema);
 sql.prepare("INSERT INTO customers(id,full_name,phone) VALUES('qa-customer','TEST','0000000000')").run();
 sql.prepare("INSERT INTO orders(id,order_number,customer_id,status,delivery_status,payment_status,subtotal,total,price_confirmation_required,payment_terms_confirmed_at) VALUES('qa-order','QA-COD-9000000','qa-customer',?,'in_transit',?,9000000,9000000,0,'2026-10-27')")
  .run(orderStatus,net>0?'pending':'unpaid');
 sql.prepare("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES('qa-line','qa-order','p-1','QA-P-1','QA ITEM',1,9000000,9000000)").run();
 sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES('qa-checkout','customer','order_created','order','qa-order',?)")
  .run(JSON.stringify({selectedPaymentOption:paymentOption,selectedPaymentAmount:deposit,transferReference:'0000-QA-ABCD'}));
 if(net>0)sql.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,note,actor) VALUES('qa-deposit','qa-order','received',?,'BANK-QA-1234','BANK DEPOSIT','admin')").run(net);
 const DB={prepare(query){let bound=[];return {bind(...values){bound=values;return this},async first(){return sql.prepare(query).get(...bound)??null},async all(){return {results:sql.prepare(query).all(...bound)}},async run(){const r=sql.prepare(query).run(...bound);return {meta:{changes:r.changes}}},execute(){return sql.prepare(query).run(...bound)}}},async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const out=statements.map(s=>({meta:{changes:s.execute().changes}}));sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
 const patch=async()=>patchAdminOrder({request:new Request('https://qa.invalid/api/admin/orders',{method:'PATCH',headers:{Cookie:'sd_admin_session='+session,Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:JSON.stringify({id:'qa-order',status:'completed'})}),env:{DB,ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:SECRET}});
 const state=()=>sql.prepare("SELECT status,delivery_status,payment_status,total FROM orders WHERE id='qa-order'").get();
 const ledger=()=>sql.prepare("SELECT actor,direction,amount FROM order_payment_transactions ORDER BY created_at,id").all();
 const cod=()=>sql.prepare("SELECT * FROM order_cod_settlements WHERE order_id='qa-order'").all();
 return {sql,patch,state,ledger,cod};
}

{
 const f=setup();const response=await f.patch();assert.equal(response.status,200);assert.equal(f.state().status,'completed');assert.equal(f.state().delivery_status,'delivered');assert.equal(f.state().payment_status,'pending');assert.equal(f.ledger().length,1,'delivery success must not create bank or COD money');assert.equal(f.cod().length,0,'COD settlement is a separate later event');f.sql.close();
}
{
 const f=setup({net:2_600_000});const response=await f.patch();assert.equal(response.status,409,'an underpaid deposit must not be marked delivered');assert.equal(f.state().status,'shipped');assert.equal(f.state().delivery_status,'in_transit');assert.equal(f.cod().length,0);f.sql.close();
}
{
 const f=setup({paymentOption:'full',deposit:8_550_000,net:9_000_000});const response=await f.patch();assert.equal(response.status,200,'full-payment orders can complete after verified full amount');assert.equal(f.cod().length,0,'full-payment order never creates COD');f.sql.close();
}
console.log('PASS: delivery completion is separate from COD receipt; underpaid orders are blocked; full-payment orders do not create COD.');
