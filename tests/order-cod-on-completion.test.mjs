/**
 * Disposable SQLite: COD collection follows a verified bank deposit and an
 * explicit "complete & collected" operator acknowledgement. No remote writes.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession } from '../functions/_lib.js';
import { onRequestPatch as patchAdminOrder } from '../functions/api/admin/orders.js';

const SECRET='qa-cod-completion-session-secret-only-long';
const PASSWORD='qa-cod-completion-password';
const session=await createSession(SECRET);
const schema=[
  '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
  '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
  '0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql'
].map(file=>readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8')).join('\n');

function setup({deposit=2_700_000,net=2_700_000,paymentOption='deposit',orderStatus='shipped',pendingQr=false}={}){
 const sql=new DatabaseSync(':memory:');
 sql.exec('PRAGMA foreign_keys=ON;'+schema);
 sql.prepare("INSERT INTO customers(id,full_name,phone) VALUES('qa-customer','TEST','0000000000')").run();
 sql.prepare("INSERT INTO orders(id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,payment_terms_confirmed_at) VALUES('qa-order','QA-COD-9000000','qa-customer',?,?,?,?,0,'2026-10-27')")
 .run(orderStatus,net>=9_000_000?'paid':net>0?'pending':'unpaid',9_000_000,9_000_000);
 sql.prepare("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES('qa-line','qa-order','p-1','QA-P-1','QA ITEM',1,9000000,9000000)").run();
 sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES('qa-checkout','customer','order_created','order','qa-order',?)")
 .run(JSON.stringify({selectedPaymentOption:paymentOption,selectedPaymentAmount:deposit,transferReference:'0000-QA-ABCD'}));
 if(net>0)sql.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,note,actor) VALUES('qa-deposit','qa-order','received',?,'BANK-QA-1234','BANK DEPOSIT','admin')").run(net);
 if(pendingQr)sql.prepare("INSERT INTO order_payment_requests(id,order_id,installment_type,amount,transfer_reference,qr_image_key,bank_name,account_number,account_name) VALUES('qa-request','qa-order','balance',6300000,'QA-REQUEST-REF','qa.png','Bank','000','Owner')").run();
 let beforeBatch=null;
 const DB={
  prepare(query){
   let bound=[];
   return {sql:query,bind(...values){bound=values;return this},
    async first(){return sql.prepare(query).get(...bound)??null},
    async all(){return {results:sql.prepare(query).all(...bound)}},
    async run(){const r=sql.prepare(query).run(...bound);return {meta:{changes:r.changes}}},
    execute(){return sql.prepare(query).run(...bound)}
   }
  },
  async batch(statements){
   if(beforeBatch){const f=beforeBatch;beforeBatch=null;f(sql)}
   sql.exec('BEGIN IMMEDIATE');
   try{
    const result=statements.map(s=>({meta:{changes:s.execute().changes}}));
    sql.exec('COMMIT');return result;
   }catch(e){sql.exec('ROLLBACK');throw e}
  }
 };
 const patch=async ({status='completed',codCollected}={})=>patchAdminOrder({
  request:new Request('https://qa.invalid/api/admin/orders',{method:'PATCH',headers:{
   Cookie:'sd_admin_session='+session,Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'
  },body:JSON.stringify({id:'qa-order',status,...(codCollected===undefined?{}:{codCollected})})}),
  env:{DB,ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:SECRET}
 });
 const state=()=>sql.prepare("SELECT status,payment_status,total FROM orders WHERE id='qa-order'").get();
 const ledger=()=>sql.prepare("SELECT actor,direction,amount,transaction_reference FROM order_payment_transactions ORDER BY created_at,id").all();
 const audit=()=>sql.prepare("SELECT action,details_json FROM audit_logs WHERE entity_type='order' AND action='payment_cod_collected_on_completion'").all();
 return {sql,patch,state,ledger,audit,setBeforeBatch:fn=>beforeBatch=fn};
}
{
 const f=setup();
 const noAcknowledgement=await f.patch();
 assert.equal(noAcknowledgement.status,409,'cannot close an unpaid deposit order without confirming COD collected');
 assert.equal(f.state().status,'shipped');
 assert.equal(f.ledger().length,1);
 const response=await f.patch({codCollected:true});
 assert.equal(response.status,200);
 assert.equal((await response.json()).codCollectedAmount,6_300_000);
 assert.equal(f.state().status,'completed');
 assert.equal(f.state().payment_status,'paid');
 assert.equal(f.state().total,9_000_000);
 const cod=f.ledger().find(x=>x.actor==='admin_cod_completion');
 assert.equal(cod?.amount,6_300_000,'remaining COD computed from server ledger, not UI');
 assert.equal(cod?.transaction_reference,'COD-QA-ORDER');
 assert.equal(f.audit().length,1);
 assert.match(f.audit()[0].details_json,/admin_confirmed_cash_collected_on_delivery/);
 const repeated=await f.patch({codCollected:true});
 assert.equal(repeated.status,409,'a second completion cannot record the balance twice');
 assert.equal(f.ledger().length,2);
 f.sql.close();
}
{
 const f=setup({net:2_600_000});
 assert.equal((await f.patch({codCollected:true})).status,409,'underpaid deposit cannot ship as fully collected');
 assert.equal(f.ledger().length,1);f.sql.close();
}
{
 const f=setup({pendingQr:true});
 assert.equal((await f.patch({codCollected:true})).status,409,'pending QR request must be reconciled/cancelled first');
 assert.equal(f.state().status,'shipped');f.sql.close();
}
{
 const f=setup({orderStatus:'processing'});
 assert.equal((await f.patch({codCollected:true})).status,409,'COD settlement is not available before shipped');
 f.sql.close();
}
{
 const f=setup({paymentOption:'full'});
 assert.equal((await f.patch({codCollected:true})).status,409,'bank-full checkout cannot falsely book COD');
 assert.equal(f.ledger().length,1);f.sql.close();
}
{
 const f=setup();
 f.setBeforeBatch(db=>db.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor) VALUES('external','qa-order','received',500000,'BANK-RACE-55','admin')").run());
 assert.equal((await f.patch({codCollected:true})).status,409,'stale balance must reject concurrency');
 assert.equal(f.state().status,'shipped');
 assert.equal(f.ledger().filter(x=>x.actor==='admin_cod_completion').length,0);
 f.sql.close();
}
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
for(const token of [
 'sd-order-step-list','sd-order-step.is-current','data-cod-collected="true"',
 'Hoàn tất & xác nhận thu ','codCollected:true','KHÔNG phải giao dịch ngân hàng',
 'Không cần nhập số dư lần hai',"order.status==='shipped'"
])assert.ok(admin.includes(token),'Missing visual/confirmation guard: '+token);
assert.equal(admin.split('</style>').length-1,1,'Keep one CSS block');
console.log('PASS: 9m / 2.7m / 6.3m COD at completion, anti-duplicate, stale balance, QR safety and visual steps.');
