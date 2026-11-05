import assert from "node:assert/strict";
import {createSession} from "../functions/_lib.js";
import {onRequestPatch} from "../functions/api/admin/warranties.js";

const SECRET="test-admin-session-secret-174-long-enough";
const PASSWORD="test-owner-password-174";
const session=await createSession(SECRET);
const id="123e4567-e89b-12d3-a456-426614174000";
const makeRow=()=>({
 id,warranty_code:"SDW-K7M2",customer_name:"Khách thử",
 customer_phone:"0901234567",customer_address:"Địa chỉ thử 123",customer_contact_reference:"",
 product_name:"Ví da cá sấu",price:1600000,policy_name:"Bảo hành trực tiếp",
 duration_months:6,starts_at:"2026-11-05",ends_at:"2027-05-05",status:"active"
});
function makeDB(){
 const db={
   row:makeRow(),batches:0,audits:[],simulateStale:false,
   prepare(sql){
     const stmt={sql,values:[],
       bind(...values){this.values=values;return this},
       async first(){
         if(sql.includes("FROM manual_warranties WHERE id=?"))return db.row?{...db.row}:null;
         return null;
       }
     };
     return stmt;
   },
   async batch(statements){
     db.batches++;
     const sql=statements[0].sql,v=statements[0].values;
     assert.match(statements[1].sql,/INSERT INTO audit_logs/);
     assert.match(statements[1].sql,/WHERE changes\(\)=1/);
     if(db.simulateStale)return [{success:true,meta:{changes:0}},{success:true,meta:{changes:0}}];
     if(sql.includes("SET status='void'")){
       assert.equal(v[0],id);
       db.row.status="void";
     }else{
       assert.match(sql,/AND status!='void'/);
       [db.row.customer_name,db.row.customer_phone,db.row.customer_address,
        db.row.customer_contact_reference,db.row.product_name,db.row.price,
        db.row.duration_months,db.row.starts_at,db.row.ends_at]=v.slice(0,9);
     }
     db.audits.push({sql:statements[1].sql,values:statements[1].values});
     return [{success:true,meta:{changes:1}},{success:true,meta:{changes:2}}];
   }
 };
 return db;
}
function payload(overrides={}){
 return {source:"manual",action:"update",id,customerName:"Khách thử",
  customerPhone:"0901234567",customerAddress:"Địa chỉ thử 123",
  productName:"Ví da cá sấu",price:"2300000",durationMonths:"7",startsAt:"2026-11-05",
  ...overrides};
}
async function patch(DB,body){
 return onRequestPatch({
   request:new Request("https://shop.example/api/admin/warranties",{
     method:"PATCH",headers:{
       Cookie:"sd_admin_session="+session,Origin:"https://shop.example",
       "Sec-Fetch-Site":"same-origin","Content-Type":"application/json"
     },
     body:JSON.stringify(body),
   }),
   env:{DB,SESSION_SECRET:SECRET,ADMIN_PASSWORD:PASSWORD},
 });
}
const db=makeDB();
for(const [label, body] of [
 ["fractional price",payload({price:"2300000.5"})],
 ["bogus date",payload({startsAt:"2026-02-30"})],
 ["invalid months",payload({durationMonths:"121"})],
 ["invalid phone",payload({customerPhone:"abc"})],
 ["invalid id",payload({id:"unknown"})],
 ["unsupported action",payload({action:"delete"})],
 ["missing cancellation reason",{source:"manual",action:"void",id,reason:""}],
]){
 const resp=await patch(db,body);
 assert.equal(resp.status,400,label);
}
assert.equal(db.batches,0,"invalid inputs must never write");
const updated=await patch(db,payload());
assert.equal(updated.status,200,"manual update must succeed");
const body=await updated.json();
assert.equal(body.warrantyCode,"SDW-K7M2","edit must retain issued code");
assert.equal(db.row.price,2300000);
assert.equal(db.row.duration_months,7);
assert.equal(db.row.ends_at,"2027-06-05");
assert.equal(db.audits.length,1);
assert.equal(db.audits[0].sql.includes("'manual_warranty_updated'"),true);
assert.ok(!JSON.stringify(db.audits).includes("0901234567"),"audit does not replicate customer PII");
const same=await patch(db,payload());
assert.equal(same.status,409,"repeated edit with unchanged values must reject");
assert.equal(db.batches,1);
const voidResponse=await patch(db,{source:"manual",action:"void",id,reason:"Cấp nhầm phiếu"});
assert.equal(voidResponse.status,200);
assert.equal((await voidResponse.json()).warrantyCode,"SDW-K7M2");
assert.equal(db.row.status,"void");
assert.equal(db.audits.length,2);
assert.equal(db.audits[1].sql.includes("'manual_warranty_voided'"),true);
assert.equal((await patch(db,{source:"manual",action:"void",id,reason:"Cấp nhầm phiếu"})).status,409);
assert.equal((await patch(db,payload({price:"2400000"}))).status,409);
const missing=makeDB();missing.row=null;
assert.equal((await patch(missing,payload())).status,404);
const stale=makeDB();stale.simulateStale=true;
assert.equal((await patch(stale,payload())).status,409,"concurrent changes must be refused");
assert.equal(stale.audits.length,0);
console.log("PASS: manual warranty edit/void validation, immutable SDW, audit and conflict guards.");
