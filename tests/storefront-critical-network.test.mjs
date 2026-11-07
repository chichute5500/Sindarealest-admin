import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

// Read-only fake browser tests. Never contact live Cloudflare or customer data.
const auth=readFileSync(new URL("../public/customer-auth-ui.js",import.meta.url),"utf8");
const lookup=readFileSync(new URL("../public/lookup-turnstile-ui.js",import.meta.url),"utf8");
new vm.Script(auth);
new vm.Script(lookup);

async function testSessionStartsOnlyAfterAccountTap(){
 const clicks=new Map(),idles=[];
 let sessionRequests=0,authBridgeCalls=0;
 const google={disabled:false,addEventListener(){},querySelector:()=>({textContent:""})};
 const form={hidden:true};
 const message={textContent:"",hidden:true,dataset:{}};
 const root={
  hidden:true,parentElement:null,
  querySelector:s=>s==="[data-auth-options]"?form:s==="[data-auth-message]"?message:
   s==="[data-auth-google]"?google:null
 };
 const nav=id=>({addEventListener:(type,cb)=>clicks.set(id,cb)});
 const document={getElementById:id=>id==="sdCustomerAuth"?root:
  ["accountOpen","mobileAccountNav"].includes(id)?nav(id):null};
 const window={
  location:{search:""},
  requestIdleCallback:(cb,options)=>idles.push({cb,options}),
  sdAccountBridge:{onAuth:()=>authBridgeCalls++}
 };
 const fetch=async url=>{
  assert.equal(url,"/api/customer/session");sessionRequests++;
  return {ok:true,json:async()=>({authenticated:false,providers:{google:true}})};
 };
 vm.runInNewContext(auth,{document,window,fetch,URLSearchParams});
 assert.equal(sessionRequests,0,"Landing page must not fetch Google session on first paint");
 assert.equal(idles.length,0,"Landing page must not schedule a delayed Google session request");
 clicks.get("accountOpen")();
 clicks.get("mobileAccountNav")();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sessionRequests,1,"Account tap must trigger immediate session verification");
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(authBridgeCalls,1,"Verified login status still reaches account sync");
}
async function testOAuthReturnStillChecksSessionImmediately(){
 let sessionRequests=0;
 const label={textContent:""};
 const google={disabled:false,addEventListener(){},querySelector:()=>label};
 const authOptions={hidden:true};
 const message={textContent:"",hidden:true,dataset:{}};
 const signed={hidden:true,querySelector:()=>null};
 const root={
  hidden:true,parentElement:{querySelector:selector=>selector==="[data-auth-signed]"?signed:null},
  querySelector:selector=>selector==="[data-auth-options]"?authOptions:
   selector==="[data-auth-message]"?message:selector==="[data-auth-google]"?google:null
 };
 const document={getElementById:id=>id==="sdCustomerAuth"?root:null};
 const window={
  location:{search:"?customer_auth=success",pathname:"/",hash:""},
  addEventListener(){},sdAccountBridge:{onAuth(){}}
 };
 const history={state:null,replaceState(){}};
 const fetch=async url=>{
  assert.equal(url,"/api/customer/session");sessionRequests++;
  return {ok:true,json:async()=>({authenticated:true,providers:{google:true},user:{name:"Khách"}})};
 };
 vm.runInNewContext(auth,{document,window,history,fetch,URLSearchParams});
 assert.equal(sessionRequests,1,"OAuth return must verify its session immediately");
}
async function testPhoneLookupOnlyFetchesConfigWhenNecessary(){
 const handlers=new Map();
 const fields={
  sdTrackInput:{value:""},
  warrantyLookupValue:{value:""}
 };
 for(const [id,field] of Object.entries(fields)){
  field.addEventListener=(type,callback)=>handlers.set(id+":"+type,callback);
 }
 const form={querySelector:()=>null,insertBefore(){},addEventListener(){}};
 const document={
  readyState:"complete",
  getElementById:id=>fields[id]||(["sdTrackForm","warrantyLookupForm"].includes(id)?form:null),
  createElement:()=>({hidden:false,className:"",textContent:"",setAttribute(){},append(){}})
 };
 const window={};
 let configRequests=0;
 const fetch=async url=>{
  assert.equal(url,"/api/lookup-challenge-config");configRequests++;
  return {ok:true,json:async()=>({phoneLookupAvailable:false,siteKey:""})};
 };
 vm.runInNewContext(lookup,{document,window,fetch});
 assert.equal(configRequests,0,"Landing and code-only forms must not request Turnstile config");
 assert.equal(window.sdPhoneLookupVerified("order_lookup"),false,"No bypass of server-side proof");
 fields.sdTrackInput.value="SDW-ABCD";
 await handlers.get("sdTrackInput:input")();
 assert.equal(configRequests,0,"Order/warranty code lookup must not fetch challenge config");
 fields.sdTrackInput.value="0901234567";
 await handlers.get("sdTrackInput:input")();
 assert.equal(configRequests,1,"Phone entry fetches exactly one configuration");
 await handlers.get("sdTrackInput:focus")();
 fields.warrantyLookupValue.value="0901234567";
 await handlers.get("warrantyLookupValue:input")();
 assert.equal(configRequests,1,"Both lookup forms reuse one config request");
 assert.equal(window.sdPhoneLookupVerified("warranty_lookup"),false,"Phone lookup remains fail-closed");
}
await testSessionStartsOnlyAfterAccountTap();
await testOAuthReturnStillChecksSessionImmediately();
await testPhoneLookupOnlyFetchesConfigWhenNecessary();
console.log("PASS: on-demand Google session, immediate OAuth return, on-demand Turnstile, no duplicate requests.");
