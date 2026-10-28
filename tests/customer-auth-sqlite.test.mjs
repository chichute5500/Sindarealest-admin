/**
 * REAL SQLite/D1-contract auth E2E. Entire DB is disposable and in-memory.
 * No Cloudflare credentials, no production customer/order records, no provider network traffic.
 */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestGet as zaloStart } from "../functions/api/customer/auth/zalo/start.js";
import { onRequestGet as zaloCallback } from "../functions/api/customer/auth/zalo/callback.js";
import { onRequestGet as googleStart } from "../functions/api/customer/auth/google/start.js";
import { onRequestGet as googleCallback } from "../functions/api/customer/auth/google/callback.js";
import { onRequestPost as email } from "../functions/api/customer/auth/email.js";
import { onRequestGet as session } from "../functions/api/customer/session.js";
import { onRequestPost as logout } from "../functions/api/customer/logout.js";
import { ORIGIN,PREVIEW_ORIGIN } from "../functions/_customer-auth.js";
const db=new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
for(const name of [
  "0001_schema.sql","0003_storefront_operations.sql","0004_admin_notifications.sql",
  "0005_address_warranty_verification.sql","0006_remove_warranty_otp.sql",
  "0007_order_contact_details.sql","0008_product_sku_verification.sql",
  "0009_fulfillment_and_manual_payments.sql","0010_admin_android_devices.sql",
  "0011_customer_auth.sql"
]) db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
const DB={
  prepare(query) {
    let values=[];
    return {
      bind(...args){values=args;return this;},
      async first(){return db.prepare(query).get(...values)??null;},
      async all(){return {results:db.prepare(query).all(...values)};},
      async run(){
        const result=db.prepare(query).run(...values);
        return {success:true,meta:{changes:Number(result.changes)}};
      },
      _run() {
        const statement=db.prepare(query);
        if(/^\s*SELECT\b/i.test(query))return {success:true,results:statement.all(...values)};
        const r=statement.run(...values);
        return {success:true,meta:{changes:Number(r.changes)}};
      }
    };
  },
  async batch(statements){
    db.exec("BEGIN IMMEDIATE");
    try{
      const result=statements.map(statement=>statement._run());
      db.exec("COMMIT");
      return result;
    }catch(err){db.exec("ROLLBACK");throw err;}
  }
};
const env={
  DB,SESSION_SECRET:"disposable-test-only-secret-".repeat(3),
  ZALO_APP_SECRET:"disposable-zalo-secret",
  GOOGLE_CLIENT_ID:"test-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET:"disposable-google-secret"
};
const makeRequest=(path,cookie="",method="GET",body=null,origin=null,base=ORIGIN)=>
  new Request(base+path,{method,headers:{
    ...(cookie?{Cookie:cookie}:{}),
    ...(origin?{Origin:origin}:{}),
    ...(body?{"Content-Type":"application/json","CF-Connecting-IP":"198.51.100.3"}:{})
  },...(body?{body:JSON.stringify(body)}:{})});
const count=(table)=>db.prepare("SELECT COUNT(*) AS n FROM "+table).get().n;
const fetchBefore=globalThis.fetch;
const providerCalls=[];
globalThis.fetch=async (url,init)=>{
  providerCalls.push({url:String(url),method:init?.method||"GET"});
  if(String(url).includes("/v4/access_token")||String(url).includes("googleapis.com/token"))
    return Response.json({access_token:"disposable-access-only"});
  if(String(url).includes("graph.zalo.me"))
    return Response.json({id:"555000111",name:"Khách Zalo Thử Nghiệm"});
  if(String(url).includes("openidconnect.googleapis.com"))
    return Response.json({sub:"google-test-sub",name:"Khách Google Thử Nghiệm",email:"disposable@example.test",email_verified:true});
  throw new Error("Unknown URL "+url);
};
try{
  for(const [provider,start,cb] of [
    ["zalo",zaloStart,zaloCallback],["google",googleStart,googleCallback]
  ]){
    const begin=await start({request:makeRequest("/api/customer/auth/"+provider+"/start"),env});
    assert.equal(begin.status,302);
    const redirect=new URL(begin.headers.get("Location"));
    const state=redirect.searchParams.get("state");
    assert.match(state,/^[a-f0-9]{48}$/);
    const browser=begin.headers.get("Set-Cookie").split(";")[0];
    assert.equal(count("customer_auth_flows"),1);
    const cbUrl="/api/customer/auth/"+provider+"/callback?state="+state+"&code=one-use-code";
    // No matching browser cookie -> CSRF rejected and state not consumed.
    const denied=await cb({request:makeRequest(cbUrl),env});
    assert.match(denied.headers.get("Location"),/failed/);
    assert.equal(count("customer_auth_flows"),1);
    const accepted=await cb({request:makeRequest(cbUrl,browser),env});
    assert.equal(accepted.status,302);
    assert.match(accepted.headers.get("Location"),/success/);
    assert.equal(count("customer_auth_flows"),0);
    assert.equal(count("customer_auth_accounts"),provider==="zalo"?1:2);
    const match=accepted.headers.get("Set-Cookie").match(/sd_customer_login=[a-f0-9]{64}/);
    assert.ok(match,"Has secure cookie");
    const cookie=match[0];
    const me=await session({request:makeRequest("/api/customer/session",cookie),env});
    assert.equal((await me.json()).user.provider,provider);
    const replay=await cb({request:makeRequest(cbUrl,browser),env});
    assert.match(replay.headers.get("Location"),/failed/);
    const done=await logout({request:makeRequest("/api/customer/logout",cookie,"POST",null,ORIGIN),env});
    assert.equal(done.status,200);
    const out=await session({request:makeRequest("/api/customer/session",cookie),env});
    assert.equal((await out.json()).authenticated,false);
  }
  // Abuse guard: each OAuth provider has an atomic per-client 15-minute budget.
  // One Zalo start was already counted above; 9 more allowed, the 11th rejected.
  for(let attempt=0;attempt<9;attempt++) {
    const response=await zaloStart({request:makeRequest("/api/customer/auth/zalo/start"),env});
    assert.equal(response.status,302);
  }
  const blocked=await zaloStart({request:makeRequest("/api/customer/auth/zalo/start"),env});
  assert.equal(blocked.status,429,"must reject repeated OAuth state creation");
  assert.equal(count("customer_auth_flows"),9,"blocked attempt did not allocate new D1 state");
  // Preview is a different Pages project. Callback URLs must use its exact host,
  // not hard-code the storefront Production domain.
  // The project root URL is its Production environment, not branch Preview.
  const projectProduction="https://sindarealest-admin-preview.pages.dev";
  const projectRootRequest=await googleStart({request:makeRequest(
    "/api/customer/auth/google/start","","GET",null,null,projectProduction),env});
  assert.equal(projectRootRequest.status,503);
  const emailRoot=await email({request:makeRequest(
    "/api/customer/auth/email","","POST",{mode:"register",name:"QA",email:"qa@example.test",password:"Password-test-2026!!"},
    projectProduction,projectProduction),env});
  assert.equal(emailRoot.status,403,"reject untrusted project Production root before Email processing");
  const previewStart=await googleStart({request:makeRequest(
    "/api/customer/auth/google/start","","GET",null,null,PREVIEW_ORIGIN),env});
  assert.equal(previewStart.status,302);
  const previewAuthUrl=new URL(previewStart.headers.get("Location"));
  assert.equal(previewAuthUrl.searchParams.get("redirect_uri"),PREVIEW_ORIGIN+"/api/customer/auth/google/callback");
  const previewCookie=previewStart.headers.get("Set-Cookie").split(";")[0];
  const previewCb=await googleCallback({request:makeRequest(
    "/api/customer/auth/google/callback?code=preview-qa&state="+previewAuthUrl.searchParams.get("state"),
    previewCookie,"GET",null,null,PREVIEW_ORIGIN),env});
  assert.equal(previewCb.headers.get("Location"),PREVIEW_ORIGIN+"/?customer_auth=success");
  const previewSession=previewCb.headers.get("Set-Cookie").match(/sd_customer_login=[a-f0-9]{64}/)?.[0];
  assert.ok(previewSession);
  assert.equal((await logout({request:makeRequest("/api/customer/logout",previewSession,"POST",null,PREVIEW_ORIGIN,PREVIEW_ORIGIN),env})).status,200);
  // Email account is isolated from orders, no email-only claim into customer records.
  const body={mode:"register",name:"Khách Email Thử",email:"qa+mail@example.test",password:"pass_2026!test-safe"};
  const deniedOnProduction=await email({request:makeRequest("/api/customer/auth/email","","POST",body,ORIGIN),env});
  assert.equal(deniedOnProduction.status,503,"no public Email signup until verification and recovery");
  const registered=await email({request:makeRequest("/api/customer/auth/email","","POST",body,PREVIEW_ORIGIN,PREVIEW_ORIGIN),env});
  assert.equal(registered.status,201,"actual INSERT with FK and constraints");
  assert.equal(count("customer_auth_accounts"),3);
  const login=await email({request:makeRequest("/api/customer/auth/email","","POST",{...body,mode:"login"},PREVIEW_ORIGIN,PREVIEW_ORIGIN),env});
  assert.equal(login.status,200);
  assert.equal(count("customer_auth_sessions"),2);
  assert.equal(count("orders"),0,"never create/claim real customer orders");
  assert.equal(count("customers"),0);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
  assert.ok(providerCalls.some(x=>x.url.includes("graph.zalo.me")));
  assert.ok(providerCalls.some(x=>x.url.includes("openidconnect.googleapis.com")));
  console.log("DISPOSABLE REAL SQLITE customer auth: Zalo/Google OAuth, replay, CSRF, sessions, logout, Email and migration 0011 PASS");
}finally{globalThis.fetch=fetchBefore;db.close();}
