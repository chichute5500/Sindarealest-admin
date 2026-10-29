// Disposable real SQLite email E2E: Mailjet API is mocked, no real customer email is sent.
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {onRequestPost as emailAuth} from "../functions/api/customer/auth/email.js";
import {onRequestGet as verifyLink} from "../functions/api/customer/auth/email/verify.js";
import {onRequestGet as getSession} from "../functions/api/customer/session.js";
import {onRequestPost as logout} from "../functions/api/customer/logout.js";
import {PREVIEW_ORIGIN as ORIGIN,ORIGIN as PRODUCTION} from "../functions/_customer-auth.js";
const sqlite=new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
for(const name of [
"0001_schema.sql","0003_storefront_operations.sql","0004_admin_notifications.sql",
"0005_address_warranty_verification.sql","0006_remove_warranty_otp.sql",
"0007_order_contact_details.sql","0008_product_sku_verification.sql",
"0009_fulfillment_and_manual_payments.sql","0010_admin_android_devices.sql",
"0011_customer_auth.sql","0012_customer_facebook_auth.sql",
"0013_customer_account_cloud.sql","0014_customer_email_verification.sql"])
 sqlite.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
const DB={
 prepare(sql){
  let args=[];
  return {
   bind(...values){args=values;return this},
   async first(){return sqlite.prepare(sql).get(...args)??null},
   async all(){return {results:sqlite.prepare(sql).all(...args)}},
   async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}},
   _batch(){if(/^\s*SELECT\b/i.test(sql))return {results:sqlite.prepare(sql).all(...args)};
    const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}
  };
 },
 async batch(statements){
  sqlite.exec("BEGIN IMMEDIATE");
  try{const output=statements.map(s=>s._batch());sqlite.exec("COMMIT");return output}
  catch(e){sqlite.exec("ROLLBACK");throw e}
 }
};
const env={DB,SESSION_SECRET:"test-secret-only-".repeat(5),MAILJET_API_KEY:"test-mailjet-key",
 MAILJET_SECRET_KEY:"test-mailjet-secret",MAILJET_FROM_EMAIL:"sender@example.test"};
const req=(data,base=ORIGIN,origin=base)=>new Request(base+"/api/customer/auth/email",{
 method:"POST",headers:{Origin:origin,"Content-Type":"application/json","CF-Connecting-IP":"192.0.2.31"},
 body:JSON.stringify(data)});
const mail=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 assert.equal(String(url),"https://api.mailjet.com/v3.1/send");
 assert.equal(init?.method,"POST");
 assert.match(init?.headers?.get("Authorization")||"",/^Basic /);
 const data=JSON.parse(init.body);
 assert.equal(data.Messages.length,1);
 assert.equal(data.Messages[0].From.Email,env.MAILJET_FROM_EMAIL);
 mail.push(data.Messages[0]);
 return Response.json({Messages:[{Status:"success"}]});
};
const send=data=>emailAuth({request:req(data),env});
try {
 const signup={mode:"register",name:"Khách thử",email:"buyer@example.test",password:"Abc123!"};
 assert.equal((await emailAuth({request:req(signup,ORIGIN,"https://evil.test"),env})).status,403);
 assert.equal((await emailAuth({request:req(signup,PRODUCTION),env})).status,503);
 assert.equal((await send({...signup,password:"123456"})).status,400);
 const registration=await send(signup);
 assert.equal(registration.status,202);
 assert.equal((await registration.json()).verification_required,true);
 assert.equal(mail.length,1);
 assert.match(mail[0].TextPart,/\d{6}/);
 const code=mail[0].TextPart.match(/Mã xác minh: (\d{6})/)[1];
 const link=mail[0].TextPart.match(/Xác minh Email: (https:\/\/[^\s]+)/)[1];
 const duplicateUnverified=await send(signup);
 assert.equal(duplicateUnverified.status,409,"An existing unverified email must not create a duplicate");
 const duplicatePayload=await duplicateUnverified.json();
 assert.equal(duplicatePayload.verification_required,true,"UI must open OTP recovery view");
 assert.equal(mail.length,1,"Duplicate registration must never auto-send a second verification email");
 assert.equal((await send({...signup,mode:"login"})).status,403,"Unverified Email cannot sign in");
 assert.equal((await send({mode:"verify",email:signup.email,code:"000000"===code?"111111":"000000"})).status,400);
 assert.equal((await send({mode:"verify",email:signup.email,code})).status,200);
 assert.equal((await send({mode:"verify",email:signup.email,code})).status,400,"OTP is single use");
 const duplicateVerified=await send(signup);
 assert.equal(duplicateVerified.status,409,"Verified email must ask user to login");
 assert.notEqual((await duplicateVerified.json()).verification_required,true,
   "Verified account must not open resend verification flow");
 const login=await send({...signup,mode:"login"});
 assert.equal(login.status,200);
 const cookie=login.headers.get("Set-Cookie").match(/sd_customer_login=[a-f0-9]{64}/)[0];
 const session=await getSession({request:new Request(ORIGIN+"/api/customer/session",{headers:{Cookie:cookie}}),env});
 assert.equal((await session.json()).authenticated,true);
 assert.equal((await send({mode:"reset-request",email:"unknown@example.test"})).status,200);
 assert.equal(mail.length,1,"Unknown Email cannot receive reset email");
 // Simulate the documented 60-second resend cooldown passing for the same account.
 sqlite.prepare("UPDATE customer_auth_email_state SET last_sent_at=0").run();
 assert.equal((await send({mode:"reset-request",email:signup.email})).status,200);
 assert.equal(mail.length,2);
 const resetCode=mail[1].TextPart.match(/Mã xác minh: (\d{6})/)[1];
 assert.equal((await send({mode:"reset-confirm",email:signup.email,code:"654321"===resetCode?"123456":"654321",password:"Changed987!"})).status,400);
 assert.equal((await send({mode:"reset-confirm",email:signup.email,code:resetCode,password:"Changed987!"})).status,200);
 assert.equal((await send({mode:"reset-confirm",email:signup.email,code:resetCode,password:"Changed987!"})).status,400);
 const invalidated=await getSession({request:new Request(ORIGIN+"/api/customer/session",{headers:{Cookie:cookie}}),env});
 assert.equal((await invalidated.json()).authenticated,false,"Reset must revoke old sessions");
 assert.equal((await send({...signup,mode:"login"})).status,401,"Old password must stop working");
 assert.equal((await send({...signup,mode:"login",password:"Changed987!"})).status,200);
 const alreadyUsedLink=await verifyLink({request:new Request(link),env});
 assert.match(alreadyUsedLink.headers.get("Location"),/email_verify_failed/);
 const another={...signup,email:"link@example.test"};
 sqlite.prepare("DELETE FROM public_rate_limits").run(); // Isolate this registration boundary fixture.
 assert.equal((await send(another)).status,202);
 const secondLink=mail.at(-1).TextPart.match(/Xác minh Email: (https:\/\/[^\s]+)/)[1];
 const clicked=await verifyLink({request:new Request(secondLink),env});
 assert.match(clicked.headers.get("Location"),/email_verified/);
 assert.match(clicked.headers.get("Set-Cookie"),/sd_customer_login=/);
 const replay=await verifyLink({request:new Request(secondLink),env});
 assert.match(replay.headers.get("Location"),/email_verify_failed/);
 console.log("PASS: Mailjet body/OTP/link, unverified gate, one-time verification, 7-char password, reset and session revocation");
}finally{globalThis.fetch=originalFetch;sqlite.close()}
