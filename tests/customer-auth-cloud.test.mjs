import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {issueSession} from "../functions/_customer-auth.js";
import {hashOrderAccessToken} from "../functions/_payments.js";
import {onRequestGet as getProfile,onRequestPut as putProfile} from "../functions/api/customer/profile.js";
import {onRequestGet as getOrders,onRequestPost as linkOrder} from "../functions/api/customer/orders.js";
const db=new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
for(const name of [
 "0001_schema.sql","0003_storefront_operations.sql","0004_admin_notifications.sql",
 "0005_address_warranty_verification.sql","0006_remove_warranty_otp.sql",
 "0007_order_contact_details.sql","0008_product_sku_verification.sql",
 "0009_fulfillment_and_manual_payments.sql","0010_admin_android_devices.sql",
 "0011_customer_auth.sql","0012_customer_facebook_auth.sql","0013_customer_account_cloud.sql","0014_customer_email_verification.sql",
 "0018_payment_delivery_settlement.sql"
])db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
const DB={
 prepare(sql){let values=[];return {
  bind(...a){values=a;return this},
  async first(){return db.prepare(sql).get(...values)??null},
  async all(){return {results:db.prepare(sql).all(...values)}},
  async run(){const x=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(x.changes)}}},
  _run(){return db.prepare(sql).run(...values)}
 }},
 async batch(statements){db.exec("BEGIN");try{const out=statements.map(x=>x._run());db.exec("COMMIT");return out}catch(e){db.exec("ROLLBACK");throw e}}
};
const env={DB};
const origin="https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev";
function req(path,cookie="",method="GET",body=null,requestOrigin=origin){
 return new Request(origin+path,{method,headers:{
 ...(cookie?{Cookie:cookie}:{}),
 ...(method!=="GET"?{Origin:requestOrigin,"Content-Type":"application/json"}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
}
function insert(sql,...params){db.prepare(sql).run(...params)}
insert("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name,email) VALUES('a1','google','g1','Khách A','a@ex.test')");
insert("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name,email) VALUES('a2','google','g2','Khách B','b@ex.test')");
const a="sd_customer_login="+await issueSession(env,"a1");
const b="sd_customer_login="+await issueSession(env,"a2");
const anon=await getProfile({env,request:req("/api/customer/profile")});
assert.equal(anon.status,401);
const denied=await putProfile({env,request:req("/api/customer/profile",a,"PUT",{action:"favorites",favorites:["safe-id"]},"https://untrusted.example")});
assert.equal(denied.status,403);
const saved=await putProfile({env,request:req("/api/customer/profile",a,"PUT",{action:"favorites",favorites:["product-1","product-1","product-2"]})});
assert.equal(saved.status,200);
assert.deepEqual((await (await getProfile({env,request:req("/api/customer/profile",a)})).json()).favorites.sort(),["product-1","product-2"]);
assert.deepEqual((await (await getProfile({env,request:req("/api/customer/profile",b)})).json()).favorites,[]);
const address={fullName:"Khách thử",phone:"0900000000",email:"a@ex.test",provinceCode:"01",province:"Hà Nội",wardCode:"101",ward:"Phường thử",streetAddress:"Số 9"};
assert.equal((await putProfile({env,request:req("/api/customer/profile",a,"PUT",{action:"address",address})})).status,200);
assert.equal((await (await getProfile({env,request:req("/api/customer/profile",b)})).json()).address,null);
const orderNumber="SD-CLOUDTEST-12345";
const secret="f".repeat(64);
const hash=await hashOrderAccessToken(secret);
insert("INSERT INTO customers(id,full_name,phone,email,address) VALUES('c1','Khách','0900099999','x@ex.test','Địa chỉ')");
insert("INSERT INTO orders(id,order_number,customer_id,status,subtotal,total,price_confirmation_required,public_access_token_hash) VALUES('o1',?,'c1','pending_confirmation',NULL,NULL,1,?)",orderNumber,hash);
assert.equal((await linkOrder({env,request:req("/api/customer/orders",a,"POST",{orderNumber,orderAccessToken:"a".repeat(64)})})).status,403);
assert.equal((await linkOrder({env,request:req("/api/customer/orders",a,"POST",{orderNumber,orderAccessToken:secret})})).status,200);
const own=await (await getOrders({env,request:req("/api/customer/orders",a)})).json();
const other=await (await getOrders({env,request:req("/api/customer/orders",b)})).json();
assert.equal(own.orders.length,1);
assert.equal(own.orders[0].orderNumber,orderNumber);
assert.equal(JSON.stringify(own).includes(secret),false);
assert.deepEqual(other.orders,[]);
assert.equal((await linkOrder({env,request:req("/api/customer/orders",b,"POST",{orderNumber,orderAccessToken:secret})})).status,409);
assert.equal((await linkOrder({env,request:req("/api/customer/orders",a,"POST",{orderNumber,orderAccessToken:secret})})).status,200);
console.log("PASS: isolated customer preferences and token-only order linking, cross-account access denied.");
