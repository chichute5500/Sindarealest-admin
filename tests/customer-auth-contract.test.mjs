import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {ORIGIN,randomToken,pkce,startFlow,consumeFlow,beginSession,getAccount,sessionCookie,endSession,configured,digest} from "../functions/_customer-auth.js";
import {onRequestGet as googleStart} from "../functions/api/customer/auth/google/start.js";
import {onRequestGet as googleCallback} from "../functions/api/customer/auth/google/callback.js";
import {onRequestGet as customerSession} from "../functions/api/customer/session.js";
import {onRequestPost as logout} from "../functions/api/customer/logout.js";
assert.equal(ORIGIN,"https://sindarealest2.pages.dev");
assert.match(randomToken(32),/^[a-f0-9]{64}$/);
assert.equal((await pkce(randomToken(32))).length,43);
class FakeDB{
 constructor(){this.flows=new Map();this.accounts=new Map();this.sessions=new Map()}
 prepare(query){return {bind:(...args)=>({
  run:async()=>{
   if(query.startsWith("INSERT INTO customer_auth_flows")){const [state,provider,verifier,browser,exp]=args;this.flows.set(state,{provider,verifier,browser,exp})}
   else if(query.startsWith("INSERT OR IGNORE INTO customer_auth_accounts")){const [id,provider,subject,name,email]=args;if(!this.accounts.has(provider+":"+subject))this.accounts.set(provider+":"+subject,{id,provider,subject,display_name:name,email})}
   else if(query.startsWith("INSERT INTO customer_auth_sessions")){const [token,accountId,expires]=args;this.sessions.set(token,{accountId,expires})}
   else if(query.startsWith("DELETE FROM customer_auth_sessions"))this.sessions.delete(args[0]);
   else if(query.startsWith("DELETE FROM customer_auth_flows")){const [hash,provider,browser,time]=args,flow=this.flows.get(hash);const changed=!!flow&&flow.provider===provider&&flow.browser===browser&&flow.exp>time;if(changed)this.flows.delete(hash);return {success:true,meta:{changes:changed?1:0}}}
   else throw Error("Unhandled run SQL "+query);
   return {success:true,meta:{changes:1}}
  },
  first:async()=>{
   if(query.startsWith("SELECT verifier FROM customer_auth_flows")){const [hash,provider,browser,time]=args,f=this.flows.get(hash);return f&&f.provider===provider&&f.browser===browser&&f.exp>time?{verifier:f.verifier}:null}
   if(query.startsWith("SELECT id FROM customer_auth_accounts")){const [provider,subject]=args;return this.accounts.get(provider+":"+subject)||null}
   if(query.startsWith("SELECT a.id,a.provider")){const [hash,time]=args,s=this.sessions.get(hash);if(!s||s.expires<=time)return null;const account=[...this.accounts.values()].find(a=>a.id===s.accountId);return account?.provider==="google"?account:null}
   throw Error("Unhandled first SQL "+query)
  }
 })}}
 async batch(){return [{success:true},{results:[{attempts:1}]}]}
}
const DB=new FakeDB();
const env={DB,GOOGLE_CLIENT_ID:"test-client.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"test-only-google-secret"};
const request=(path,cookie="",method="GET",origin=null)=>new Request(ORIGIN+path,{method,headers:{Cookie:cookie,...(origin?{Origin:origin}:{})}});
assert.equal(configured(env,"google"),true);
for(const p of ["email","facebook","zalo"])assert.equal(configured(env,p),false);
await assert.rejects(()=>beginSession(env,"facebook","subject","X"));
const start=await googleStart({request:request("/api/customer/auth/google/start"),env});
assert.equal(start.status,302);
const authorize=new URL(start.headers.get("Location"));
const state=authorize.searchParams.get("state"),browserCookie=start.headers.get("Set-Cookie").split(";")[0];
assert.match(state,/^[a-f0-9]{48}$/);
assert.equal(authorize.hostname,"accounts.google.com");
assert.equal(authorize.searchParams.get("redirect_uri"),ORIGIN+"/api/customer/auth/google/callback");
assert.match(authorize.searchParams.get("code_challenge"),/^[A-Za-z0-9_-]{43}$/);
const url="/api/customer/auth/google/callback?state="+encodeURIComponent(state)+"&code=opaque-code";
const csrf=await googleCallback({request:request(url),env});
assert.match(csrf.headers.get("Location"),/failed/);
const originalFetch=globalThis.fetch;
let calls=[];
globalThis.fetch=async(addr,init={})=>{
 assert.equal(init.redirect,"manual");calls.push(String(addr));
 if(String(addr).includes("oauth2.googleapis.com/token"))return Response.json({access_token:"disposable-token"});
 if(String(addr).includes("openidconnect.googleapis.com"))return Response.json({sub:"google-sub-1",email_verified:true,email:"test@example.com",name:"Khách Google"});
 throw Error("Unexpected outbound call "+addr)
};
try{
 const cb=await googleCallback({request:request(url,browserCookie),env});
 assert.equal(cb.status,302);assert.match(cb.headers.get("Location"),/success/);
 const token=cb.headers.get("Set-Cookie").match(/sd_customer_login=[a-f0-9]{64}/)?.[0];
 assert.ok(token);assert.equal(DB.accounts.size,1);
 const session=await customerSession({request:request("/api/customer/session",token),env});
 const data=await session.json();assert.equal(data.authenticated,true);assert.equal(data.user.provider,"google");
 assert.deepEqual(Object.keys(data.providers),["google"]);
 const replay=await googleCallback({request:request(url,browserCookie),env});assert.match(replay.headers.get("Location"),/failed/);
 const out=await logout({request:request("/api/customer/logout",token,"POST",ORIGIN),env});assert.equal(out.status,200);
 const final=await customerSession({request:request("/api/customer/session",token),env});assert.equal((await final.json()).authenticated,false);
 assert.equal(calls.length,2);
}finally{globalThis.fetch=originalFetch}
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.ok(html.includes('id="sdCustomerAuth"')&&html.includes("/customer-auth-ui.js"));
assert.ok(html.includes("https://zalo.me/"),"Zalo customer-contact links must remain intact");
assert.ok(html.includes("https://www.facebook.com/"),"Facebook customer-contact link must remain intact");
for(const dead of ["../functions/api/customer/auth/email.js","../functions/api/customer/auth/email/verify.js","../functions/api/customer/auth/zalo/start.js","../functions/api/customer/auth/zalo/callback.js","../functions/api/customer/auth/facebook/start.js","../functions/api/customer/auth/facebook/callback.js","../public/customer-email-otp-ui.js"])
 assert.equal(existsSync(new URL(dead,import.meta.url)),false,"Retired customer login route or script must not ship: "+dead);
for(const marker of ["data-auth-zalo","data-auth-email","data-auth-facebook","sdAuthVerifyForm","customer-email-otp-ui.js"])assert.ok(!html.includes(marker),marker+" must be absent");
assert.ok(readFileSync(new URL("../migrations/0011_customer_auth.sql",import.meta.url),"utf8").includes("CREATE TABLE IF NOT EXISTS customer_auth_accounts"));
console.log("PASS: Google-only OAuth, PKCE, one-use CSRF state, account session, logout and no alternate provider UI.");
