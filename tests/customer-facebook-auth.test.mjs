import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {onRequestGet as facebookStart} from "../functions/api/customer/auth/facebook/start.js";
import {onRequestGet as facebookCallback} from "../functions/api/customer/auth/facebook/callback.js";
import {onRequestGet as getSession} from "../functions/api/customer/session.js";
import {onRequestPost as logout} from "../functions/api/customer/logout.js";
import {ORIGIN,PREVIEW_ORIGIN} from "../functions/_customer-auth.js";

// Execute real 0011 -> 0012 on a disposable SQLite DB and ensure existing
// Google accounts, active sessions, one-use OAuth states and FK survive.
const sqlite=new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
for(const name of ["0001_schema.sql","0003_storefront_operations.sql",
  "0004_admin_notifications.sql","0005_address_warranty_verification.sql",
  "0006_remove_warranty_otp.sql","0007_order_contact_details.sql",
  "0008_product_sku_verification.sql","0009_fulfillment_and_manual_payments.sql",
  "0010_admin_android_devices.sql","0011_customer_auth.sql"])
  sqlite.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
sqlite.prepare("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name,email) VALUES(?,?,?,?,?)")
  .run("existing-google-account","google","google-001","Existing Google","existing@example.test");
sqlite.prepare("INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)")
  .run("legacy-token-hash","existing-google-account",9999999999);
sqlite.prepare("INSERT INTO customer_auth_flows(state_hash,provider,verifier,browser_hash,expires_at) VALUES(?,?,?,?,?)")
  .run("legacy-state","google","legacy-verifier","legacy-browser",9999999999);
sqlite.exec(readFileSync(new URL("../migrations/0012_customer_facebook_auth.sql",import.meta.url),"utf8"));
for(const migration of ["0013_customer_account_cloud.sql","0014_customer_email_verification.sql"])
 sqlite.exec(readFileSync(new URL("../migrations/"+migration,import.meta.url),"utf8"));
assert.equal(sqlite.prepare("SELECT provider FROM customer_auth_accounts WHERE id='existing-google-account'").get().provider,"google");
assert.equal(sqlite.prepare("SELECT account_id FROM customer_auth_sessions WHERE token_hash='legacy-token-hash'").get().account_id,"existing-google-account");
assert.equal(sqlite.prepare("SELECT provider FROM customer_auth_flows WHERE state_hash='legacy-state'").get().provider,"google");
assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length,0);
sqlite.prepare("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name) VALUES(?,?,?,?)")
  .run("fixture-facebook","facebook","100009","Facebook QA");
sqlite.prepare("INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)")
  .run("facebook-existing-session","fixture-facebook",9999999999);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM customer_auth_sessions").get().n,2);

// Thin Cloudflare D1 binding emulator on actual SQLite.
const DB={
  prepare(sql){
    let values=[];
    return {
      bind(...args){values=args;return this;},
      async first(){return sqlite.prepare(sql).get(...values)??null;},
      async run(){const r=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}};},
      _run(){
        const p=sqlite.prepare(sql);
        if(/^\s*SELECT/i.test(sql))return {success:true,results:p.all(...values)};
        const r=p.run(...values);return {success:true,meta:{changes:Number(r.changes)}};
      }
    };
  },
  async batch(statements){
    sqlite.exec("BEGIN IMMEDIATE");
    try{const out=statements.map(x=>x._run());sqlite.exec("COMMIT");return out;}
    catch(e){sqlite.exec("ROLLBACK");throw e;}
  }
};
const env={DB,FACEBOOK_APP_ID:"123456789012345",FACEBOOK_APP_SECRET:"disposable-facebook-secret-for-qa"};
const req=(path,cookie="",method="GET",base=PREVIEW_ORIGIN,origin)=>new Request(base+path,{
  method,headers:{...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})}
});
const denied=await facebookStart({request:req("/api/customer/auth/facebook/start"),env:{DB}});
assert.equal(denied.status,503,"Meta App must be configured");
const begin=await facebookStart({request:req("/api/customer/auth/facebook/start"),env});
assert.equal(begin.status,302);
const redirect=new URL(begin.headers.get("Location"));
assert.equal(redirect.hostname,"www.facebook.com");
assert.equal(redirect.searchParams.get("client_id"),env.FACEBOOK_APP_ID);
assert.equal(redirect.searchParams.get("redirect_uri"),PREVIEW_ORIGIN+"/api/customer/auth/facebook/callback");
assert.equal(redirect.searchParams.get("scope"),"public_profile");
assert.match(redirect.searchParams.get("state"),/^[a-f0-9]{48}$/);
assert.ok(!redirect.toString().includes(env.FACEBOOK_APP_SECRET));
const state=redirect.searchParams.get("state"),cookie=begin.headers.get("Set-Cookie").split(";")[0];
assert.match(cookie,/^sd_customer_oauth=[a-f0-9]{48}$/);
const cbUrl="/api/customer/auth/facebook/callback?state="+state+"&code=example-code";
const deniedNoBrowser=await facebookCallback({request:req(cbUrl),env});
assert.match(deniedNoBrowser.headers.get("Location"),/failed/);
let calls=0;
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
  calls++;
  assert.equal(init.redirect,"manual");
  assert.ok(!String(url).includes(env.FACEBOOK_APP_SECRET));
  if(String(url).includes("/oauth/access_token")){
    assert.equal(init.method,"POST");
    const body=new URLSearchParams(init.body);
    assert.equal(body.get("client_id"),env.FACEBOOK_APP_ID);
    assert.equal(body.get("client_secret"),env.FACEBOOK_APP_SECRET);
    assert.equal(body.get("redirect_uri"),PREVIEW_ORIGIN+"/api/customer/auth/facebook/callback");
    return Response.json({access_token:"opaque-facebook-access-token"});
  }
  assert.equal(String(url),"https://graph.facebook.com/v26.0/me?fields=id%2Cname");
  assert.equal(init.headers.Authorization,"Bearer opaque-facebook-access-token");
  return Response.json({id:"1000777888999",name:"Facebook Realistic Test"});
};
try{
  const accepted=await facebookCallback({request:req(cbUrl,cookie),env});
  assert.equal(accepted.status,302);
  assert.equal(accepted.headers.get("Location"),PREVIEW_ORIGIN+"/?customer_auth=success");
  assert.equal(calls,2);
  const setCookie=accepted.headers.get("Set-Cookie");
  const customerCookie=setCookie.match(/sd_customer_login=[a-f0-9]{64}/)?.[0];
  assert.ok(customerCookie);
  const me=await getSession({request:req("/api/customer/session",customerCookie),env});
  const user=await me.json();
  assert.equal(user.authenticated,true);
  assert.equal(user.user.provider,"facebook");
  assert.equal(user.user.name,"Facebook Realistic Test");
  assert.equal(user.providers.facebook,true);
  const replay=await facebookCallback({request:req(cbUrl,cookie),env});
  assert.match(replay.headers.get("Location"),/failed/);
  assert.equal(calls,2,"replayed state must not reach provider");
  const out=await logout({request:req("/api/customer/logout",customerCookie,"POST",PREVIEW_ORIGIN,PREVIEW_ORIGIN),env});
  assert.equal(out.status,200);
  const gone=await getSession({request:req("/api/customer/session",customerCookie),env});
  assert.equal((await gone.json()).authenticated,false);
  // Login must never be enabled on other arbitrary project/tenant hosts.
  assert.equal((await facebookStart({request:req("/api/customer/auth/facebook/start","","GET","https://sindarealest-admin-preview.pages.dev"),env})).status,503);
  assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length,0);
  console.log("PASS: Facebook state/cookie, real SQLite 0012 migration preservation, OAuth code/profile, session, logout, replay and origin.");
}finally{globalThis.fetch=oldFetch;sqlite.close();}
