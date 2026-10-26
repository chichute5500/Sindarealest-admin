/** Read-only Cloudflare 503 diagnostic. No R2/D1 writes, no deployments. */
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const ref=process.env.GITHUB_REF, sha=process.env.GITHUB_SHA||"";
const report={sourceSha:sha,scope:"isolated-preview-readonly",checks:{},analytics:null,findings:[]};
if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin"||
ref!=="refs/heads/feature/admin-bulk-folder-import-2026-10-26"||
!/^[0-9a-f]{40}$/.test(sha)||!account||!token)throw Error("Unexpected ref or credentials");
const auth={"Authorization":"Bearer "+token};
const origin="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
const id=v=>v?.id||v?.database_id||"";
const bucket=v=>v?.name||v?.bucket_name||"";
async function cfGet(path){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  headers:auth,signal:AbortSignal.timeout(25000),redirect:"error"});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.success!==true)throw Error("Cloudflare read-only metadata request unavailable (HTTP "+r.status+")");
 return j.result;
}
try{
 const [pv,pr]=await Promise.all([
  cfGet("/pages/projects/sindarealest-admin-preview"),
  cfGet("/pages/projects/sindarealest2")]);
 const p=pv?.deployment_configs?.preview,q=pr?.deployment_configs?.production;
 const db=id(p?.d1_databases?.DB),prodDb=id(q?.d1_databases?.DB);
 const images=bucket(p?.r2_buckets?.IMAGES),originals=bucket(p?.r2_buckets?.ORIGINALS);
 const production=[bucket(q?.r2_buckets?.IMAGES),bucket(q?.r2_buckets?.ORIGINALS)];
 if(pv?.name!=="sindarealest-admin-preview"||pr?.name!=="sindarealest2"||
 !db||!prodDb||db===prodDb||!images||!originals||images===originals||
 production.includes(images)||production.includes(originals))throw Error("Preview separation not proven");
 report.checks.isolatedBindings="PASS";
 const get=await fetch(origin+"/api/products",{signal:AbortSignal.timeout(15000),redirect:"manual"});
 report.checks.publicGet={status:get.status,type:(get.headers.get("content-type")||"").split(";")[0]};
 await get.arrayBuffer();
 const p1=await fetch(origin+"/api/admin/upload",{
  method:"POST",headers:{"Origin":origin,"Content-Type":"text/plain","Sec-Fetch-Site":"same-origin"},
  body:"unauthorized-empty-diagnostic",signal:AbortSignal.timeout(15000),redirect:"manual"});
 const type=(p1.headers.get("content-type")||"").split(";")[0];
 const txt=(await p1.text()).slice(0,70);
 report.checks.unauthenticatedUpload={status:p1.status,type,
  format:txt.trimStart().startsWith("{")?"json":txt.trimStart().startsWith("<")?"html":"other",
  rayPresent:Boolean(p1.headers.get("cf-ray"))};
 if(p1.status===503&&type!=="application/json")
  report.findings.push("Opaque 503 returned before authorized image handling. Investigate Pages runtime or Access, not only R2.");
}catch(e){report.checks.error=String(e.message||e).slice(0,150);}
const now=new Date(),from=new Date(now.getTime()-24*60*60*1000);
const gql=[
 'query($accountTag:string!,$start:Time!,$end:Time!){',
 'viewer{accounts(filter:{accountTag:$accountTag}){',
 'workersInvocationsAdaptive(limit:150,filter:{datetime_geq:$start,datetime_leq:$end}){',
 'dimensions{scriptName status} sum{requests errors} quantiles{cpuTimeP99 wallTimeP99}',
 '}}}}'
].join(" ");
try{
 const r=await fetch("https://api.cloudflare.com/client/v4/graphql",{
  method:"POST",headers:{...auth,"Content-Type":"application/json"},
  body:JSON.stringify({query:gql,variables:{accountTag:account,start:from.toISOString(),end:now.toISOString()}}),
  signal:AbortSignal.timeout(30000),redirect:"error"});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.errors?.length) {
  report.analytics={status:"unavailable",httpStatus:r.status,
   errors:(j?.errors||[]).slice(0,3).map(e=>String(e.message||"no analytics access").slice(0,130))};
 } else {
  const all=j?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive||[];
  const filtered=all.filter(x=>/sindarealest/i.test(String(x?.dimensions?.scriptName||""))).map(x=>({
    script:String(x.dimensions?.scriptName||"").slice(0,90),status:x.dimensions?.status,
    requests:x.sum?.requests,errors:x.sum?.errors,
    cpuP99:x.quantiles?.cpuTimeP99,wallP99:x.quantiles?.wallTimeP99
  }));
  report.analytics={status:"ok",window:"24h",groups:all.length,sindarealest:filtered};
  if(filtered.some(x=>Number(x.errors)>0||/exceeded|exception|internalerror/i.test(String(x.status))))
   report.findings.push("Workers analytics records failures/resource outcomes for SinDarealest; inspect worker status distribution.");
 }
}catch(e){report.analytics={status:"unavailable",reason:String(e.name||"NetworkError")};}
console.log("READ_ONLY_503_DIAG="+JSON.stringify(report));
