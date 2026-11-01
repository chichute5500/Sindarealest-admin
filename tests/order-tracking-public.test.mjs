/**
 * Six-stage public progress lookup. Tests a disposable production-schema D1
 * adapter; no network, Production DB, or customer data is touched.
 */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestPost as lookup, onRequestGet, publicOrderProgress } from "../functions/api/order-tracking.js";

const storefront=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const orderSection=storefront.indexOf('id="order"');
const trackingCard=storefront.indexOf('id="orderTracking"');
const featuredSection=storefront.indexOf('id="featured"');
assert.ok(orderSection>=0&&orderSection<trackingCard&&trackingCard<featuredSection,"Public tracking belongs below Đặt hàng an tâm and above Featured");
for(const marker of ['id="sdTrackForm"','id="sdTrackResults"',"$('#sdTrackForm').addEventListener","function sdTrackRender(","function sdTrackDate(","Nhận cọc & xác nhận đơn","Nhận đủ tiền & xác nhận đơn","/* SD_TRACK_6:"])
 assert.ok(storefront.includes(marker),"Missing mobile/desktop public tracking UI: "+marker);
for(const disallowed of [
 "Nhập mã đơn hoặc số điện thoại đã đặt để xem 6 bước xử lý của Shop.",
 "Chỉ hiển thị tiến trình đơn, không công khai thông tin cá nhân hoặc thanh toán. Liên hệ Shop nếu cần hỗ trợ.",
 "sd-track-privacy"
])assert.ok(!storefront.includes(disallowed),"Unused explanatory copy or CSS must stay removed: "+disallowed);
const schema=[
 "0001_schema.sql","0003_storefront_operations.sql","0004_admin_notifications.sql",
 "0005_address_warranty_verification.sql","0006_remove_warranty_otp.sql",
 "0007_order_contact_details.sql","0008_product_sku_verification.sql",
 "0009_fulfillment_and_manual_payments.sql","0018_payment_delivery_settlement.sql"
].map(path=>readFileSync(new URL("../migrations/"+path,import.meta.url),"utf8")).join("\n");
const sql=new DatabaseSync(":memory:");
sql.exec("PRAGMA foreign_keys=ON;"+schema);
sql.prepare("INSERT INTO customers(id,full_name,phone,address) VALUES(?,?,?,?)").run("cust","PRIVATE-NAME-TEST","0901234567","PRIVATE-ADDRESS-TEST");
for(const [id,num,status,created] of [
 ["new","SD-QA-NEW-2222","pending_confirmation","2026-10-26 10:00:00"],
 ["progress","SD-QA-PROCESS-1111","processing","2026-10-24 03:00:00"],
 ["done","SD-QA-DONE-3333","completed","2026-10-20 01:00:00"]
]){
 sql.prepare("INSERT INTO orders(id,order_number,customer_id,status,delivery_status,created_at) VALUES(?,?,?,?,?,?)").run(id,num,"cust",status,status==='completed'?'delivered':status==='shipped'?'in_transit':'not_shipped',created);
 sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,'order_created','order',?,?,?)")
 .run("checkout-"+id,"customer",id,JSON.stringify({selectedPaymentOption:"deposit",selectedPaymentAmount:2700000}),created);
}
function statusLog(order,status,dt){
 sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,'order_updated','order',?,?,?)")
 .run("audit-"+order+"-"+status,"admin",order,JSON.stringify({status}),dt);
}
for(const id of ["progress","done"]){
 statusLog(id,"confirmed","2026-10-25 01:00:00");
 sql.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor,verified_at) VALUES(?,?,'received',2700000,?,'admin',?)")
 .run("pay-"+id,id,"BANK-"+id,"2026-10-25 05:00:00");
 statusLog(id,"processing","2026-10-25 09:00:00");
}
statusLog("done","shipped","2026-10-26 02:00:00");
statusLog("done","completed","2026-10-27 03:00:00");
let queries=[];
const DB={
 prepare(query){
  const statement={sql:query,params:[],
   bind(...args){this.params=args;return this},
   async first(){queries.push(query);return sql.prepare(query).get(...this.params)||null},
   async all(){queries.push(query);return {results:sql.prepare(query).all(...this.params)}},
   async run(){queries.push(query);const r=sql.prepare(query).run(...this.params);return {meta:{changes:r.changes}}},
  };
  return statement;
 },
 async batch(statements){
  sql.exec("BEGIN IMMEDIATE");
  try {
   const out=statements.map(s=>{
    queries.push(s.sql);
    if(/^\s*SELECT\b/i.test(s.sql))return {results:sql.prepare(s.sql).all(...s.params)};
    const result=sql.prepare(s.sql).run(...s.params);return {meta:{changes:result.changes},results:[]};
   });
   sql.exec("COMMIT");return out;
  }catch(error){sql.exec("ROLLBACK");throw error}
 }
};
async function search(term,ip="198.51.100.23",headers={}){
 return lookup({request:new Request("https://sindarealest.test/api/order-tracking",{
  method:"POST",
  headers:{"Content-Type":"application/json","Origin":"https://sindarealest.test","CF-Connecting-IP":ip,...headers},
  body:JSON.stringify({lookup:term})
 }),env:{DB,SESSION_SECRET:"test-session-secret-long-enough-1234567890"}});
}
function validateSafe(order,{masked=false}={}){
 assert.equal(order.steps.length,6,"Exactly six public steps");
 assert.deepEqual(order.steps.map(s=>s.title),["Đã gửi đơn","Xác nhận đơn","Đã nhận cọc","Đang làm sản phẩm","Đã gửi hàng","Giao thành công"]);
 assert.equal(Object.hasOwn(order,"fullName"),false);
 assert.equal(Object.hasOwn(order,"phone"),false);
 assert.equal(Object.hasOwn(order,"total"),false);
 assert.equal(Object.hasOwn(order,"paymentStatus"),false);
 assert.equal(order.orderNumber.startsWith("••••"),masked);
 for(const step of order.steps){
  assert.equal(step.completedAt===null||typeof step.completedAt==="string",true);
  assert.ok(["done","current","upcoming"].includes(step.state));
  if(step.state!=="done")assert.equal(step.completedAt,null,"No date before milestone done");
 }
}
const newResponse=await search("SD-QA-NEW-2222");
assert.equal(newResponse.status,200,"Customer should see their just-submitted order");
const newOrder=(await newResponse.json()).orders[0];
validateSafe(newOrder);
assert.equal(newOrder.steps[0].state,"done");
assert.match(newOrder.steps[0].completedAt,/2026-10-26/);
assert.equal(newOrder.steps[1].state,"current");
assert.deepEqual(newOrder.steps.slice(1).map(s=>s.completedAt),[null,null,null,null,null]);

const inProgress=await search("SD-QA-PROCESS-1111","198.51.100.24");
assert.equal(inProgress.status,200);
const make=(await inProgress.json()).orders[0];
validateSafe(make);
assert.deepEqual(make.steps.map(s=>s.state),["done","done","done","current","upcoming","upcoming"]);
assert.equal(make.steps[3].completedAt,null,"Making is still happening, no completion date");
assert.equal(make.steps[4].completedAt,null);
assert.ok(make.steps[1].completedAt&&make.steps[2].completedAt);

const done=await search("SD-QA-DONE-3333","198.51.100.25");
assert.equal(done.status,200);
const finished=(await done.json()).orders[0];
validateSafe(finished);
assert.equal(finished.status,"completed");
assert.deepEqual(finished.steps.map(s=>s.state),["done","done","done","done","done","done"]);
assert.equal(finished.steps[5].completedAt,"2026-10-27T03:00:00Z");
assert.equal(finished.steps[3].completedAt,"2026-10-26T02:00:00Z");

const phone=await search("090 123 4567","198.51.100.26");
assert.equal(phone.status,200);
const payload=await phone.json();
assert.equal(payload.viaPhone,true);
assert.equal(payload.orders.length,3);
for(const item of payload.orders)validateSafe(item,{masked:true});
assert.ok(!JSON.stringify(payload).includes("PRIVATE-NAME-TEST"));
assert.ok(!JSON.stringify(payload).includes("PRIVATE-ADDRESS-TEST"));

sql.prepare("UPDATE orders SET status='shipped',delivery_status='failed_returning' WHERE id='progress'").run();
sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES('delivery-failed','admin','order_delivery_updated','order','progress',?,'2026-10-27 04:00:00')")
 .run(JSON.stringify({from:'in_transit',to:'failed_returning'}));
const failed=(await (await search("SD-QA-PROCESS-1111","198.51.100.27")).json()).orders[0];
assert.equal(failed.deliveryStatus,'failed_returning');
assert.equal(failed.steps[4].title,'Đã gửi hàng');
assert.equal(failed.steps[5].title,'Giao thất bại / Đang hoàn hàng');
assert.equal(failed.steps[5].state,'done');
assert.equal(failed.steps[5].completedAt,'2026-10-27T04:00:00Z');
sql.prepare("UPDATE orders SET delivery_status='returned' WHERE id='progress'").run();
sql.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES('delivery-returned','admin','order_delivery_updated','order','progress',?,'2026-10-28 04:00:00')")
 .run(JSON.stringify({from:'failed_returning',to:'returned'}));
const returned=(await (await search("SD-QA-PROCESS-1111","198.51.100.28")).json()).orders[0];
assert.equal(returned.deliveryStatus,'returned');
assert.equal(returned.deliveryStatusLabel,'Đã hoàn hàng về Shop');
assert.equal(returned.steps[5].title,'Đã hoàn hàng về Shop');
assert.equal(returned.steps[5].completedAt,'2026-10-28T04:00:00Z');
assert.ok(!JSON.stringify(payload).includes("0901234567"));
assert.ok(!JSON.stringify(payload).includes("SD-QA-DONE-3333"),"Phone lookup does not enumerate full order IDs");
assert.ok(queries.some(q=>q.includes("json_extract(a.details_json,'$.status')='confirmed'")));
assert.ok(queries.some(q=>q.includes("pt.actor<>'admin_cod_completion'")));
assert.ok(!queries.some(q=>q.includes("SELECT * FROM orders")));

assert.equal((await search("SD-QA-BOGUS-0000","198.51.100.27")).status,404);
assert.equal((await search("SD-QA-DONE-3333' OR 1=1","198.51.100.28")).status,400,"SQL-like order numbers rejected");
assert.equal((await search("SD-QA-NEW-2222","198.51.100.29",{Origin:"https://evil.test"})).status,403);
for(let i=0;i<5;i++)assert.equal((await search("SD-QA-DONE-3333","198.51.100.30")).status,200);
assert.equal((await search("SD-QA-DONE-3333","198.51.100.30")).status,429,"Rate-limit per-IP after five lookups");
assert.equal((await onRequestGet()).status,405);
assert.deepEqual(publicOrderProgress({orderNumber:"SD-NEW",status:"pending_confirmation",createdAt:"2026-10-27 02:00:00",paymentOption:"deposit"},false).steps.map(s=>s.state),["done","current","upcoming","upcoming","upcoming","upcoming"]);
sql.close();
console.log("PASS: six real order stages, submitted date, no premature making date, phone and code lookup, masking and throttling.");
