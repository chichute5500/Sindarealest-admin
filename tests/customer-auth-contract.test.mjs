import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac,pbkdf2Sync } from "node:crypto";
import {
  ZALO_APP_ID,ORIGIN,randomToken,pkce,passwordHash,equalHash,zaloAppSecretProof,
  startFlow,consumeFlow,flowCookie,beginSession,getAccount,sessionCookie,endSession
} from "../functions/_customer-auth.js";
import { onRequestGet as zaloStart } from "../functions/api/customer/auth/zalo/start.js";
import { onRequestGet as zaloCallback } from "../functions/api/customer/auth/zalo/callback.js";
import { onRequestGet as googleStart } from "../functions/api/customer/auth/google/start.js";
import { onRequestGet as googleCallback } from "../functions/api/customer/auth/google/callback.js";
import { onRequestGet as customerSession } from "../functions/api/customer/session.js";
import { onRequestPost as logout } from "../functions/api/customer/logout.js";
assert.equal(ZALO_APP_ID,"3933116436838564742");
assert.match(await zaloAppSecretProof("token-for-qa","test-only-zalo-secret"),/^[a-f0-9]{64}$/);
assert.equal(await zaloAppSecretProof("token-for-qa","test-only-zalo-secret"),
  createHmac("sha256","test-only-zalo-secret").update("token-for-qa").digest("hex"),
  "Zalo proof must match official PHP SDK hash_hmac(sha256, token, app_secret)");
assert.notEqual(await zaloAppSecretProof("token-for-qa","test-only-zalo-secret"),
  await zaloAppSecretProof("different-token-for-qa","test-only-zalo-secret"));
assert.equal(ORIGIN,"https://sindarealest2.pages.dev");
const verifier=randomToken(32);
assert.match(verifier,/^[a-f0-9]{64}$/);
assert.equal((await pkce(verifier)).length,43);
const salt=randomToken(24),hash=await passwordHash("Safe-Password-For-Testing-2026",salt);
assert.equal(hash.length,64);
assert.ok(equalHash(hash,await passwordHash("Safe-Password-For-Testing-2026",salt)));
assert.ok(!equalHash(hash,await passwordHash("NOT-Safe-Password-For-Testing-2026",salt)));
let reference=Buffer.from("Safe-Password-For-Testing-2026");
for(let round=0;round<3;round++)
  reference=pbkdf2Sync(reference,"sd-customer-email-v2:"+round+":"+salt,100000,32,"sha256");
assert.equal(hash,reference.toString("hex"),"Worker-compatible password hash must equal three 100k PBKDF2 rounds");
class FakeDB {
  constructor(){this.flows=new Map();this.accounts=new Map();this.sessions=new Map();}
  prepare(query){
    return {bind:(...args)=>({
      run:async()=>{
        if(query.startsWith("INSERT INTO customer_auth_flows")){
          const [state,provider,verifier,browser,exp]=args;this.flows.set(state,{provider,verifier,browser,exp});
        } else if(query.startsWith("INSERT OR IGNORE INTO customer_auth_accounts")){
          const [id,provider,subject,name,email]=args;
          if(!this.accounts.has(provider+":"+subject))this.accounts.set(provider+":"+subject,{id,provider,subject,display_name:name,email});
        } else if(query.startsWith("INSERT INTO customer_auth_sessions")){
          const [token,accountId,expires]=args;this.sessions.set(token,{accountId,expires});
        } else if(query.startsWith("DELETE FROM customer_auth_sessions")){
          this.sessions.delete(args[0]);
        } else if(query.startsWith("DELETE FROM customer_auth_flows")){
          const [hash,provider,browser,time]=args,flow=this.flows.get(hash);
          const changed=!!flow&&flow.provider===provider&&flow.browser===browser&&flow.exp>time;
          if(changed)this.flows.delete(hash);
          return {success:true,meta:{changes:changed?1:0}};
        } else throw Error("Unhandled run SQL: "+query);
        return {success:true,meta:{changes:1}};
      },
      first:async()=>{
        if(query.startsWith("SELECT verifier FROM customer_auth_flows")){
          const [hash,provider,browser,time]=args;
          const f=this.flows.get(hash);
          if(!f||f.provider!==provider||f.browser!==browser||f.exp<=time)return null;
          return {verifier:f.verifier};
        }
        if(query.startsWith("SELECT id FROM customer_auth_accounts")){
          const [provider,subject]=args;
          return this.accounts.get(provider+":"+subject)||null;
        }
        if(query.startsWith("SELECT a.id,a.provider")){
          const [hash,time]=args,s=this.sessions.get(hash);
          if(!s||s.expires<=time)return null;
          return [...this.accounts.values()].find(a=>a.id===s.accountId)||null;
        }
        throw Error("Unhandled first SQL: "+query);
      }
    })};
  }
  async batch(){
    // The real SQLite integration test exercises the actual atomic counter.
    return [{success:true},{results:[{attempts:1}]}];
  }
}
const DB=new FakeDB();
const env={DB,ZALO_APP_SECRET:"test-only-zalo-secret",GOOGLE_CLIENT_ID:"test-client.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"test-only-google-secret"};
const request=(path,cookie="",method="GET",origin=null)=>new Request(ORIGIN+path,{
  method,headers:{Cookie:cookie,...(origin?{Origin:origin}:{})}
});
for(const provider of ["zalo","google"]){
  const start=await (provider==="zalo"?zaloStart:googleStart)({
    request:request("/api/customer/auth/"+provider+"/start"),env});
  assert.equal(start.status,302);
  const authorize=new URL(start.headers.get("Location"));
  const state=authorize.searchParams.get("state");
  const stateHash=await import("../functions/_customer-auth.js").then(m=>m.digest(state));
  const verifierInDB=DB.flows.get(stateHash)?.verifier;
  assert.match(verifierInDB,/^[A-Za-z0-9_-]{43}$/);
  assert.match(verifierInDB,/[A-Z]/);
  assert.match(verifierInDB,/[a-z]/);
  assert.match(verifierInDB,/[0-9]/);
  const setCookie=start.headers.get("Set-Cookie");
  const browserCookie=setCookie.split(";")[0];
  assert.ok(state&&browserCookie);
  assert.ok(!authorize.toString().includes("test-only-"));
  const tokenFetch=globalThis.fetch;
  globalThis.fetch=async(url,init={})=> {
    // Cloudflare Workers does not support redirect:"error", only manual.
    assert.equal(init.redirect,"manual","Provider token/profile fetch must never follow redirects");
    const addr=String(url);
    if(addr.includes("access_token")||addr.includes("googleapis.com/token"))return new Response(JSON.stringify({access_token:"test-access"}),{status:200});
    if(addr.includes("graph.zalo.me")){
      assert.ok(!new URL(addr).searchParams.has("appsecret_proof"),
        "Never put proof in a URL query parameter");
      assert.ok(!new URL(addr).searchParams.has("access_token"),
        "Never expose access_token in a URL");
      assert.equal(init.headers.access_token,"test-access");
      assert.equal(init.headers.appsecret_proof,
        createHmac("sha256","test-only-zalo-secret").update("test-access").digest("hex"),
        "Social /me requires appsecret_proof in the HTTP header when app enforcement is on");
      return new Response(JSON.stringify({error:0,id:"zalo_opaque-42",name:"Khách Zalo"}),{status:200});
    }
    if(addr.includes("openidconnect.googleapis.com"))return new Response(JSON.stringify({sub:"google-sub-1",email_verified:true,email:"test@example.com",name:"Khách Google"}),{status:200});
    throw Error("Unexpected outbound request: "+addr);
  };
  try {
    const url="/api/customer/auth/"+provider+"/callback?state="+encodeURIComponent(state)+"&code=opaque-code";
    const callbackResult=await (provider==="zalo"?zaloCallback:googleCallback)({request:request(url,browserCookie),env});
    assert.equal(callbackResult.status,302);
    assert.ok(callbackResult.headers.get("Location").includes("success"));
    const sessionSet=callbackResult.headers.get("Set-Cookie");
    assert.ok(sessionSet);
    // Multiple Set-Cookie values are combined by most Fetch header implementations.
    const match=sessionSet.match(/sd_customer_login=[a-f0-9]{64}/);
    assert.ok(match,"customer session created");
    const session=await customerSession({request:request("/api/customer/session",match[0]),env});
    const data=await session.json();
    assert.equal(data.authenticated,true);
    assert.equal(data.user.provider,provider);
    if(provider==="zalo")
      assert.ok(DB.accounts.has("zalo:zalo_opaque-42"),"Opaque, nonnumeric Zalo ID is accepted");
    const replay=await (provider==="zalo"?zaloCallback:googleCallback)({request:request(url,browserCookie),env});
    assert.equal(replay.status,302);
    assert.ok(replay.headers.get("Location").includes("failed"),"OAuth state must be one-use");
    const loggedOut=await logout({request:request("/api/customer/logout",match[0],"POST",ORIGIN),env});
    assert.equal(loggedOut.status,200);
    const noSession=await customerSession({request:request("/api/customer/session",match[0]),env});
    assert.equal((await noSession.json()).authenticated,false);
  }finally{globalThis.fetch=tokenFetch;}
}
// Zalo /me may return an API error encoded in HTTP 200, even with an id property.
const badStart=await zaloStart({request:request("/api/customer/auth/zalo/start"),env});
assert.equal(badStart.status,302);
const badState=new URL(badStart.headers.get("Location")).searchParams.get("state");
const priorAccounts=DB.accounts.size;
const prevFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
  assert.equal(init.redirect,"manual");
  if(String(url).includes("/access_token"))
    return Response.json({access_token:"fake-zalo-token"});
  if(String(url).includes("graph.zalo.me")){
    assert.equal(init.headers.appsecret_proof,
      createHmac("sha256","test-only-zalo-secret").update("fake-zalo-token").digest("hex"));
    return Response.json({error:-1241,message:"Invalid appsecret_proof",id:"111111"});
  }
  throw Error("Unexpected provider request");
};
try{
  const badCallback=await zaloCallback({request:request(
    "/api/customer/auth/zalo/callback?state="+badState+"&code=not-real",
    badStart.headers.get("Set-Cookie").split(";")[0]),env});
  assert.equal(badCallback.status,302);
  assert.match(badCallback.headers.get("Location"),/failed/);
  assert.equal(DB.accounts.size,priorAccounts,
    "HTTP 200 Zalo API error must never create or authenticate a customer");
}finally{globalThis.fetch=prevFetch;}
const invalid=await zaloStart({request:request("/api/customer/auth/zalo/start?x=1"),env:{DB}});
assert.equal(invalid.status,503);
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.ok(html.includes('id="sdCustomerAuth"'));
assert.ok(html.includes("/customer-auth-ui.js"));
assert.ok(!html.includes("Phiên bản hiện tại chưa có đăng nhập khách hàng."));
assert.ok(readFileSync(new URL("../migrations/0011_customer_auth.sql",import.meta.url),"utf8").includes("CREATE TABLE IF NOT EXISTS customer_auth_accounts"));
console.log("Customer auth: PKCE, OAuth state/replay, sessions, logout, password hash and UI contract PASS");
