/** Minimal diagnostic of owner's intermittent HTTP 503. Runs ONLY in isolated Admin Preview.
 * Log only status/response class. Never uploads images or creates products.
 */
import {buildCloudflareAccessHeaders} from "./cloudflare-access-service-token.mjs";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
const password=process.env.ADMIN_TEST_PASSWORD||"";
const origin="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin"||
 process.env.GITHUB_REF!=="refs/heads/feature/admin-bulk-folder-import-2026-10-26"||
 !/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||"")||
 !account||!token||password.length<12)throw Error("Preview-only guard failed");
const access=buildCloudflareAccessHeaders();
async function cf(path){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  headers:{"Authorization":"Bearer "+token},signal:AbortSignal.timeout(18000)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.success!==true)throw Error("Cloudflare project proof failed "+r.status);
 return j.result;
}
const [p,b]=await Promise.all([cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")]);
const db=x=>x?.id||x?.database_id||"",bucket=x=>x?.name||x?.bucket_name||"";
const v=p?.deployment_configs?.preview,q=b?.deployment_configs?.production;
const own=[bucket(v?.r2_buckets?.IMAGES),bucket(v?.r2_buckets?.ORIGINALS)];
const live=[bucket(q?.r2_buckets?.IMAGES),bucket(q?.r2_buckets?.ORIGINALS)];
if(p?.name!=="sindarealest-admin-preview"||b?.name!=="sindarealest2"||
 !db(v?.d1_databases?.DB)||db(v?.d1_databases?.DB)===db(q?.d1_databases?.DB)||
 own.some(x=>!x||live.includes(x))||own[0]===own[1])throw Error("Preview production isolation unproven");
const report={environment:"isolated-preview",writes:"no product, photo, or order writes",times:[],interpretation:[]};
const base={"Origin":origin,"Sec-Fetch-Site":"same-origin",...access};
function classify(s){
 const x=s.slice(0,1800).toLowerCase();
 if(x.includes("error 1027")||x.includes("worker exceeded resource limits")||x.includes("daily request limit"))return "CF_WORKER_LIMIT_1027";
 if(x.includes("error 1102")||x.includes("worker exceeded resource limits"))return "CF_RESOURCE_LIMIT_1102";
 if(x.includes("error 1101")||x.includes("worker threw exception"))return "CF_WORKER_EXCEPTION_1101";
 if(x.includes("error 1015")||x.includes("being rate limited"))return "CF_RATE_LIMIT_1015";
 if(x.includes("cf-error")||x.includes("cloudflare"))return "CF_HTML_ERROR";
 if(x.startsWith("<!doctype")||x.startsWith("<html"))return "HTML_OTHER";
 if(x.startsWith("{"))return "JSON";
 return "TEXT_OTHER";
}
async function sample(path,opts={}){
 try{
 const r=await fetch(origin+path,{
  method:opts.method||"GET",headers:{...base,...opts.headers},body:opts.body,redirect:"manual",
  signal:AbortSignal.timeout(18000)});
 const text=(await r.text()).slice(0,4000);
 const type=(r.headers.get("content-type")||"").split(";")[0];
 const ret={status:r.status,type,bodyClass:classify(text),
  cfRayPresent:!!r.headers.get("cf-ray"),retryAfter:!!r.headers.get("retry-after")};
 if(r.status>=500&&type==="application/json"){
  try{const x=JSON.parse(text);ret.errorClass=String(x.error||"").slice(0,105)}catch{}
 }
 if(opts.captureSession&&r.ok&&type==="application/json"){
  try{if(JSON.parse(text)?.ok===true)ret.cookie=(r.headers.get("set-cookie")||"").split(";")[0]}catch{}
 }
 return ret;
 }catch(e){return {status:0,errorType:String(e.name||"NetworkError")};}
}
const unauthed=await Promise.all([
 sample("/api/products"),sample("/api/admin/products"),
 sample("/api/admin/session"),
 sample("/api/admin/upload",{method:"POST",headers:{"Content-Type":"text/plain"},body:"unsupported-format-synthetic"})
]);
report.baseline=unauthed;
const login=await sample("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({password}),captureSession:true});
const session=login.cookie;delete login.cookie;report.login=login;
if(session&&session.startsWith("sd_admin_session=")){
 for(let i=0;i<3;i++){
  const row=await Promise.all([
   sample("/api/admin/session",{headers:{Cookie:session}}),
   sample("/api/admin/products",{headers:{Cookie:session}}),
   // Invalid multipart is never written to R2; this verifies routing through the upload handler.
   sample("/api/admin/upload",{method:"POST",headers:{Cookie:session,"Content-Type":"text/plain"},body:"not-multipart"})
  ]);
  report.times.push({attempt:i+1,session:row[0],catalog:row[1],uploadInvalid:row[2]});
  if(i<2)await new Promise(resolve=>setTimeout(resolve,1600));
 }
 if(report.times.some(x=>x.catalog.status===503&&x.uploadInvalid.status===503)){
  report.interpretation.push("Both protected products and upload failed: shared Pages/Worker layer or environment, not a particular photo.");
 }
 if(report.times.some(x=>x.catalog.status===503&&x.catalog.bodyClass!=="JSON"))
  report.interpretation.push("Non-JSON 503 came from outside normal API fail() response or crashed before handler could respond.");
 if(report.times.every(x=>x.catalog.status===200&&x.session.status===200))
  report.interpretation.push("Authenticated GET currently healthy; intermittent issue requires failing request headers/CF-Ray from owner.");
}else report.interpretation.push("Could not obtain separate synthetic Preview login; cannot safely test authenticated endpoints.");
console.log("PRODUCT_IMPORT_503_FORENSIC="+JSON.stringify(report));
