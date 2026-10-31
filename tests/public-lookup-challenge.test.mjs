import assert from "node:assert/strict";
import {publicLookupChallengeSettings,verifyLookupChallenge} from "../functions/_lookup-challenge.js";
import {onRequestGet} from "../functions/api/lookup-challenge-config.js";
const env={TURNSTILE_SITE_KEY:"public-qa-site",TURNSTILE_SECRET_KEY:"private-qa-secret"};
const req=new Request("https://preview.example/api/order-tracking",{headers:{"CF-Connecting-IP":"192.0.2.11"}});
assert.deepEqual(publicLookupChallengeSettings({}),{available:false,siteKey:""});
assert.deepEqual(publicLookupChallengeSettings(env),{available:true,siteKey:"public-qa-site"});
const publicResult=await onRequestGet({env});
const serialized=await publicResult.text();
assert.ok(!serialized.includes("private-qa-secret"),"Never expose secret to browser");
assert.equal(JSON.parse(serialized).siteKey,"public-qa-site");
assert.equal(publicResult.headers.get("cache-control"),"no-store");
assert.deepEqual(await verifyLookupChallenge(req,{},"any-proof-valid","order_lookup"),{ok:false,status:503});
assert.deepEqual(await verifyLookupChallenge(req,env,"","order_lookup"),{ok:false,status:400});
const originalFetch=globalThis.fetch;
try{
 let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;
  assert.equal(url,"https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(options.method,"POST");
  assert.equal(options.body.get("secret"),"private-qa-secret");
  assert.equal(options.body.get("remoteip"),"192.0.2.11");
  return new Response(JSON.stringify({success:true,hostname:"preview.example",action:"order_lookup"}),{status:200});
 };
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-valid-token-qa-1","order_lookup"),{ok:true,status:200});
 assert.equal(calls,1);
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:"attacker.example",action:"order_lookup"}),{status:200});
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-valid-token-qa-2","order_lookup"),{ok:false,status:400});
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:"preview.example",action:"wrong_action"}),{status:200});
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-valid-token-qa-3","order_lookup"),{ok:false,status:400});
 globalThis.fetch=async()=>{throw Error("network unavailable")};
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-valid-token-qa-4","order_lookup"),{ok:false,status:503});
}finally{globalThis.fetch=originalFetch}
console.log("PASS: server verified Turnstile proof, bounded tokens, hostname and action, secret privacy and unavailable fail closed.");
