/**
 * Fully disposable, in-memory SQLite policy/atomicity tests.
 * No Production or Preview D1 writes and no external network.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession, getCurrentDateInVietnam } from '../functions/_lib.js';
import { shopWarrantyPolicy, addWarrantyCalendarMonths, isWarrantyCode } from '../functions/_warranty-policy.js';
import { onRequestPatch as patchOrder } from '../functions/api/admin/orders.js';

assert.deepEqual(shopWarrantyPolicy(1_999_999).durationMonths,6);
assert.deepEqual(shopWarrantyPolicy(2_000_000).durationMonths,12);
assert.deepEqual(shopWarrantyPolicy(8_000_000).durationMonths,12);
assert.throws(()=>shopWarrantyPolicy(null));
assert.throws(()=>shopWarrantyPolicy(NaN));
assert.equal(addWarrantyCalendarMonths('2024-08-31',6),'2025-02-28');
assert.equal(addWarrantyCalendarMonths('2024-02-29',12),'2025-02-28');
assert.equal(addWarrantyCalendarMonths('2026-01-31',1),'2026-02-28');

const PASSWORD='qa-auto-warranty-password-only';
const SECRET='qa-auto-warranty-session-secret-only';
const session=await createSession(SECRET);
const schema=[
 '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
 '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
 '0007_order_contact_details.sql','0008_product_sku_verification.sql',
 '0009_fulfillment_and_manual_payments.sql',
].map(file=>readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8')).join('\n');
function fixture(total, {existingWarranty=false, secondItem=false,simulateCodeCollision=false}={}){
 const sql=new DatabaseSync(':memory:');
 sql.exec('PRAGMA foreign_keys=ON;'+schema);
 sql.prepare('INSERT INTO customers(id,full_name,phone) VALUES(?,?,?)').run('cust','QA TEST','0000000000');
 sql.prepare('INSERT INTO orders(id,order_number,customer_id,status,subtotal,total,price_confirmation_required) VALUES(?,?,?,?,?,?,0)').run('order','SD-QA-1001','cust','pending_confirmation',total,total);
 sql.prepare('INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?)')
   .run('item-a','order','product-a','QA-A','Sản phẩm QA A',1,secondItem?Math.floor(total/2):total,secondItem?Math.floor(total/2):total);
 if(secondItem)sql.prepare('INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?)')
   .run('item-b','order','product-b','QA-B','Sản phẩm QA B',1,total-Math.floor(total/2),total-Math.floor(total/2));
 if(existingWarranty)sql.prepare("INSERT INTO warranties(id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status) VALUES('legacy','order','item-a','SDW-LEGACY001','Bảo hành cũ',24,'2026-01-01','2028-01-01','active')").run();
 let beforeBatch=null,collisionPending=simulateCodeCollision,batchCount=0;
 const DB={
  prepare(statement){
   let values=[];
   return {sql:statement,bind(...next){values=next;return this},
    async first(){return sql.prepare(statement).get(...values)??null},
    async all(){return {results:sql.prepare(statement).all(...values)}},
    async run(){const r=sql.prepare(statement).run(...values);return {meta:{changes:r.changes}}},
    execute(){return sql.prepare(statement).run(...values)}};
  },
  async batch(statements){
   batchCount++;
   if(beforeBatch){const fn=beforeBatch;beforeBatch=null;fn(sql)}
   if(collisionPending&&statements.some(s=>s.sql.includes('INSERT INTO warranties'))){
     collisionPending=false;
     throw new Error('D1_ERROR: UNIQUE constraint failed: warranties.warranty_code');
   }
   sql.exec('BEGIN IMMEDIATE');
   try{const rows=statements.map(s=>{const r=s.execute();return {success:true,meta:{changes:r.changes}}});sql.exec('COMMIT');return rows}
   catch(e){sql.exec('ROLLBACK');throw e}
  }
 };
 const patch=async(status,extra={})=>patchOrder({request:new Request('https://shop.invalid/api/admin/orders',{
  method:'PATCH',headers:{
   Cookie:'sd_admin_session='+session,Origin:'https://shop.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'
  },body:JSON.stringify({id:'order',status,...extra})
 }),env:{DB,ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:SECRET}});
 const list=()=>sql.prepare('SELECT * FROM warranties ORDER BY order_item_id').all();
 const state=()=>sql.prepare("SELECT status,total FROM orders WHERE id='order'").get();
 const audits=action=>sql.prepare('SELECT * FROM audit_logs WHERE action=?').all(action);
 return {sql,patch,list,state,audits,batchCount:()=>batchCount,setBeforeBatch:fn=>{beforeBatch=fn}};
}

for(const [total,months] of [[1_999_999,6],[2_000_000,12],[8_000_000,12]]){
 const f=fixture(total,{secondItem:true});
 assert.equal((await f.patch('confirmed')).status,200,'confirmation succeeds without warranty');
 assert.equal(f.list().length,0,'never activate warranty on confirmed');
 assert.equal(f.audits('warranty_issued').length,0);
 assert.equal((await f.patch('processing')).status,200);
 assert.equal(f.list().length,0,'no warranty while being made');
 assert.equal((await f.patch('shipped')).status,200);
 assert.equal(f.list().length,0,'no warranty on shipping');
 const finished=await f.patch('completed');
 assert.equal(finished.status,200,'completion succeeds');
 assert.equal((await finished.json()).warrantiesIssued,2,'completion activates one per item');
 const issued=f.list(),today=getCurrentDateInVietnam();
 assert.equal(issued.length,2);
 for(const w of issued){
   assert.equal(w.duration_months,months);
   assert.equal(w.starts_at,today,'warranty begins at completion date Vietnam');
   assert.equal(w.ends_at,addWarrantyCalendarMonths(today,months));
   assert.equal(w.status,'active');
   assert.match(w.warranty_code,/^SDW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
   assert.equal(isWarrantyCode(w.warranty_code),true);
 }
 assert.equal(f.audits('warranty_issued').length,2);
 const retry=await f.patch('completed');
 assert.equal(retry.status,200,'same-state update supported');
 assert.equal((await retry.json()).warrantiesIssued,0,'never issue again');
 assert.equal(f.list().length,2,'no duplicates');
 assert.equal((await f.patch('cancelled')).status,200);
 assert.ok(f.list().every(w=>w.status==='void'),'cancellation voids active warranties');
 f.sql.close();
}
{
 const f=fixture(2_100_000,{secondItem:true,simulateCodeCollision:true});
 for(const status of ['confirmed','processing','shipped'])assert.equal((await f.patch(status)).status,200);
 const finished=await f.patch('completed');
 assert.equal(finished.status,200,'code collision retries completion transaction');
 assert.equal(f.batchCount(),5,'initial stages + one rolled-back collision + successful completion');
 assert.equal((await finished.json()).warrantiesIssued,2);
 assert.equal(new Set(f.list().map(w=>w.warranty_code)).size,2);
 assert.equal(f.audits('warranty_issued').length,2);
 assert.equal(f.audits('order_updated').filter(a=>JSON.parse(a.details_json).status==='completed').length,1);
 f.sql.close();
}
{
 const f=fixture(2_000_000,{existingWarranty:true,secondItem:true});
 for(const s of ['confirmed','processing','shipped'])assert.equal((await f.patch(s)).status,200);
 const done=await f.patch('completed');
 assert.equal(done.status,200);
 assert.equal((await done.json()).warrantiesIssued,1,'only new line gets warranty');
 assert.equal(f.list()[0].warranty_code,'SDW-LEGACY001');
 assert.equal(f.list()[0].duration_months,24);
 assert.equal(f.list().length,2);
 f.sql.close();
}
{
 const f=fixture(1_900_000);
 for(const s of ['confirmed','processing','shipped'])assert.equal((await f.patch(s)).status,200);
 f.setBeforeBatch(db=>db.prepare("UPDATE orders SET status='cancelled' WHERE id='order'").run());
 assert.equal((await f.patch('completed')).status,409,'cancelled concurrently before completion');
 assert.equal(f.list().length,0,'no warranty on stale completion');
 assert.equal(f.audits('warranty_issued').length,0);
 f.sql.close();
}
{
 const f=fixture(2_100_000);
 for(const s of ['confirmed','processing','shipped','completed'])assert.equal((await f.patch(s)).status,200);
 const change=await f.patch('completed',{prices:[{itemId:'item-a',unitPrice:1_500_000}]});
 assert.equal(change.status,409,'price stays immutable after issuance');
 assert.equal(f.state().total,2_100_000);
 assert.equal(f.list().length,1);
 f.sql.close();
}
{
 const f=fixture(2_100_000);
 assert.equal((await f.patch('cancelled')).status,200);
 assert.equal(f.list().length,0);
 f.sql.close();
}
console.log('PASS: no early warranty, activation only at completion, 6/12 months, COD-safe atomic batch, retry, cancellation.');
