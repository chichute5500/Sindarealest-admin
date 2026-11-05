import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {publicLookupChallengeSettings,verifyLookupChallenge} from "../functions/_lookup-challenge.js";
import {onRequestGet} from "../functions/api/lookup-challenge-config.js";
const env={TURNSTILE_SITE_KEY:"public-qa-site",TURNSTILE_SECRET_KEY:"  private-qa-secret\n"};
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
  assert.equal(options.headers["Content-Type"],"application/x-www-form-urlencoded");
  assert.equal(options.redirect,"manual","Cloudflare Workers rejects redirect:error before fetch");
  assert.ok(options.body instanceof URLSearchParams,"Siteverify uses supported URL-encoded form");
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
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,"error-codes":["invalid-input-response"]}),{status:400});
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-invalid-token-qa","order_lookup"),{ok:false,status:400},
   "HTTP 400 invalid token must not be incorrectly reported as service unavailable");
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,"error-codes":["timeout-or-duplicate"]}),{status:200});
 assert.deepEqual(await verifyLookupChallenge(req,env,"fake-expired-token-qa","order_lookup"),{ok:false,status:400});
 const savedWarn=console.warn;
 try{
  console.warn=()=>{};
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,"error-codes":["invalid-input-secret"]}),{status:400});
  assert.deepEqual(await verifyLookupChallenge(req,env,"fake-secret-error-qa","order_lookup"),
    {ok:false,status:503,reason:"configuration"},"invalid secret is a server configuration issue, never a client bypass");
 }finally{console.warn=savedWarn}

 const savedConsoleWarn=console.warn;
 try{
  console.warn=()=>{};
  globalThis.fetch=async()=>new Response("<html>unavailable</html>",{status:503,headers:{"Content-Type":"text/html"}});
  assert.deepEqual(await verifyLookupChallenge(req,env,"fake-nonjson-token","order_lookup"),{ok:false,status:503,reason:"non_json"});
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:"https://not-turnstile.example"}});
  assert.deepEqual(await verifyLookupChallenge(req,env,"fake-redirect-token","order_lookup"),
    {ok:false,status:503,reason:"upstream_redirect"},"redirects must never leak the Siteverify secret");
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,"error-codes":["bad-request"]}),{status:400});
  assert.deepEqual(await verifyLookupChallenge(req,env,"fake-bad-request-token","order_lookup"),{ok:false,status:503,reason:"upstream_bad_request"});
  globalThis.fetch=async()=>{throw Error("network unavailable")};
  assert.deepEqual(await verifyLookupChallenge(req,env,"fake-valid-token-qa-4","order_lookup"),{ok:false,status:503,reason:"transport"});
 }finally{console.warn=savedConsoleWarn}
}finally{globalThis.fetch=originalFetch}
console.log("PASS: server verified Turnstile proof, bounded tokens, hostname and action, secret privacy and unavailable fail closed.");


// Browser event regression: one tap -> Turnstile -> exactly one lookup.
// No automatic requests on phone typing; editing cancels queued search.
const callbacks = new Map();
function makeForm(){
 const listeners={capture:[],bubble:[]},status={textContent:""};
 return {
  status,serverSubmits:0,insertBefore(){},
  querySelector:selector=>selector==='[role="status"]'?status:null,
  addEventListener(type,fn,capture){if(type==='submit')listeners[capture?'capture':'bubble'].push(fn)},
  requestSubmit(){
   const evt={prevented:false,stopped:false,preventDefault(){this.prevented=true},
     stopImmediatePropagation(){this.stopped=true}};
   for(const fn of listeners.capture){fn(evt);if(evt.stopped)break}
   if(!evt.stopped)for(const fn of listeners.bubble){fn(evt);if(evt.stopped)break}
  },
  attachHandler(){this.addEventListener('submit',()=>{this.serverSubmits++},false)}
 };
}
function makeField(){
 return {value:'',handlers:{},
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)},
  input(value){this.value=value;for(const fn of this.handlers.input||[])fn()}
 };
}
const orderForm=makeForm(),warrantyForm=makeForm();
orderForm.attachHandler();warrantyForm.attachHandler();
const orderField=makeField(),warrantyField=makeField();
const elements={sdTrackForm:orderForm,sdTrackInput:orderField,
 warrantyLookupForm:warrantyForm,warrantyLookupValue:warrantyField};
const windowMock={turnstile:{
 render(_mount,options){callbacks.set(options.action,options);return callbacks.size},
 reset(){}
}};
const documentMock={readyState:'complete',
 getElementById:id=>elements[id]||null,
 createElement:()=>({hidden:false,textContent:'',className:'',children:[],
  setAttribute(){},append(...children){this.children.push(...children)}})
};
const browserScript=readFileSync(new URL('../public/lookup-turnstile-ui.js',import.meta.url),'utf8');
runInNewContext(browserScript,{window:windowMock,document:documentMock,Date,console,
 fetch:async()=>({ok:true,json:async()=>({phoneLookupAvailable:true,siteKey:'qa-site-key'})})},
 {timeout:1500});
const flush=async()=>{for(let i=0;i<9;i++)await Promise.resolve()};
warrantyField.input('0901234567');await flush();
assert.equal(warrantyForm.serverSubmits,0,'typing a phone never starts a lookup');
warrantyForm.requestSubmit();
assert.equal(warrantyForm.serverSubmits,0,'first submit queues CAPTCHA, does not query without token');
assert.match(warrantyForm.status.textContent,/tự tra cứu/);
await flush();
assert.ok(callbacks.has('warranty_lookup'),'warranty widget was rendered');
callbacks.get('warranty_lookup').callback('valid-proof-123456');
assert.equal(warrantyForm.serverSubmits,1,'CAPTCHA completion resumes initial search exactly once');
assert.equal(windowMock.sdPhoneLookupVerified('warranty_lookup'),true);
windowMock.sdResetPhoneLookupProof('warranty_lookup');
callbacks.get('warranty_lookup').callback('valid-proof-no-pending');
assert.equal(warrantyForm.serverSubmits,1,'unprompted CAPTCHA callback does not cause lookup');
warrantyField.input('0901111222');await flush();
warrantyForm.requestSubmit();
warrantyField.input('0909999888');
callbacks.get('warranty_lookup').callback('valid-proof-after-edit');
assert.equal(warrantyForm.serverSubmits,1,'editing a queued phone prevents an outdated lookup');
orderField.input('0987654321');await flush();
orderForm.requestSubmit();await flush();
assert.equal(orderForm.serverSubmits,0,'order lookup also awaits proof');
callbacks.get('order_lookup').callback('valid-order-proof');
assert.equal(orderForm.serverSubmits,1,'order phone lookup resumes automatically exactly once');
windowMock.sdResetPhoneLookupProof('order_lookup');
orderField.input('SD-ORDER-123');orderForm.requestSubmit();
assert.equal(orderForm.serverSubmits,2,'code lookup does not require CAPTCHA');
console.log('PASS: one-button phone search, queued CAPTCHA auto-resume, change cancellation and code lookup.');
