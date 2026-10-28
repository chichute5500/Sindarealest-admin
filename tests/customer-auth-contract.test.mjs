import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
        } else throw Error("Unhandled run SQL: "+query);
        return {success:true};
      },
      first:async()=>{
        if(query.startsWith("DELETE FROM customer_auth_flows")){
          const [hash,provider,browser,time]=args;
          const f=this.flows.get(hash);
          if(!f||f.provider!==provider||f.browser!==browser||f.exp<=time)return null;
          this.flows.delete(hash);return {verifier:f.verifier};
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
  async batch(){
    // The real SQLite integration test exercises the actual atomic counter.
    return [{success:true},{results:[{attempts:1}]}];
  }
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
  globalThis.fetch=async(url)=> {
    const addr=String(url);
    if(addr.includes("access_token")||addr.includes("googleapis.com/token"))return new Response(JSON.stringify({access_token:"test-access"}),{status:200});
    if(addr.includes("graph.zalo.me"))return new Response(JSON.stringify({id:"123456",name:"Khách Zalo"}),{status:200});
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
    const replay=await (provider==="zalo"?zaloCallback:googleCallback)({request:request(url,browserCookie),env});
    assert.equal(replay.status,302);
    assert.ok(replay.headers.get("Location").includes("failed"),"OAuth state must be one-use");
    const loggedOut=await logout({request:request("/api/customer/logout",match[0],"POST",ORIGIN),env});
    assert.equal(loggedOut.status,200);
    const noSession=await customerSession({request:request("/api/customer/session",match[0]),env});
    assert.equal((await noSession.json()).authenticated,false);
  }finally{globalThis.fetch=tokenFetch;}
}
const invalid=await zaloStart({request:request("/api/customer/auth/zalo/start?x=1"),env:{DB}});
assert.equal(invalid.status,503);
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.ok(html.includes('id="sdCustomerAuth"'));
assert.ok(html.includes("/customer-auth-ui.js"));
assert.ok(!html.includes("Phiên bản hiện tại chưa có đăng nhập khách hàng."));
assert.ok(readFileSync(new URL("../migrations/0011_customer_auth.sql",import.meta.url),"utf8").includes("CREATE TABLE IF NOT EXISTS customer_auth_accounts"));
console.log("Customer auth: PKCE, OAuth state/replay, sessions, logout, password hash and UI contract PASS");
