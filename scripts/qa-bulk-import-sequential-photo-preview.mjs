/** Real sequential R2 photo stress test: isolated Preview only, no D1 product writes.
 * The test samples 3 supported original formats, checks 201 JSON and deletes
 * every fixture it can identify. NEVER run against the production Pages site.
 */
import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {S3Client,DeleteObjectCommand,HeadObjectCommand} from "@aws-sdk/client-s3";
import {sanitizedDeployments} from "./admin-preview-provenance-readonly.mjs";
import {buildCloudflareAccessHeaders} from "./cloudflare-access-service-token.mjs";

const repo="chichute5500/Sindarealest-admin";
const branch="refs/heads/feature/admin-bulk-folder-import-2026-10-26";
const pageBranch="sd-import-review-20261026";
const previewProject="sindarealest-admin-preview";
const origin="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
const sha=String(process.env.GITHUB_SHA||"");
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||"");
const token=String(process.env.CLOUDFLARE_API_TOKEN||"");
const password=String(process.env.ADMIN_TEST_PASSWORD||"");
const key=String(process.env.R2_ACCESS_KEY_ID||"");
const secret=String(process.env.R2_SECRET_ACCESS_KEY||"");
const access=buildCloudflareAccessHeaders();
const report={sourceSha:sha,scope:"isolated_preview_only",requestedUploads:30,
  completedUploads:0,uploadedBytes:0,originalFormats:["webp","png","jpg"],
  publiclyVisibleDraftsCreated:0,productionWrites:0,cleanedImages:0,cleanedOriginals:0,status:"FAIL"};
let s3=null;let pub="",orig="",cookie="";const fixtures=[];
function safeFailure(stage,status){throw Error(stage+" (HTTP "+status+")");}
async function cf(path){
 const res=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
   headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(30000),redirect:"error"});
 const json=await res.json().catch(()=>null);
 if(!res.ok||json?.success!==true) safeFailure("Cloudflare metadata unavailable",res.status);
 return json.result;
}
try{
 if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!==branch||!/^[0-9a-f]{40}$/.test(sha)||
   !/^[a-f0-9]{32}$/i.test(account)||!token||password.length<12||!key||!secret||
   !access["cf-access-client-id"]||!access["cf-access-client-secret"])throw Error("Preview-only guard not satisfied");
 const [preview,production,deployments]=await Promise.all([
  cf("/pages/projects/"+previewProject),
  cf("/pages/projects/sindarealest2"),
  cf("/pages/projects/"+previewProject+"/deployments")]);
 const pv=preview?.deployment_configs?.preview,pp=preview?.deployment_configs?.production,prd=production?.deployment_configs?.production;
 const id=v=>v?.id||v?.database_id||"";
 const bucket=v=>v?.name||v?.bucket_name||"";
 const pd=id(pv?.d1_databases?.DB),prodD=id(prd?.d1_databases?.DB);
 pub=bucket(pv?.r2_buckets?.IMAGES);orig=bucket(pv?.r2_buckets?.ORIGINALS);
 const prodBuckets=[pp?.r2_buckets?.IMAGES,pp?.r2_buckets?.ORIGINALS,prd?.r2_buckets?.IMAGES,prd?.r2_buckets?.ORIGINALS].map(bucket).filter(Boolean);
 if(preview?.name!==previewProject||production?.name!=="sindarealest2"||!pd||!prodD||
   pd===prodD||pd===id(pp?.d1_databases?.DB)||!pub||!orig||pub===orig||
   prodBuckets.includes(pub)||prodBuckets.includes(orig))throw Error("Preview isolation cannot be established");
 const proof=sanitizedDeployments(deployments).some(x=>x.environment==="preview"&&x.stage==="success"&&x.branch===pageBranch&&x.sha===sha);
 if(!proof)throw Error("Preview deployment SHA mismatch; refuse image stress test");
 s3=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
  forcePathStyle:true,credentials:{accessKeyId:key,secretAccessKey:secret},maxAttempts:2});
 const common={...access,Origin:origin,"Sec-Fetch-Site":"same-origin"};
 const login=await fetch(origin+"/api/admin/login",{method:"POST",headers:{...common,"Content-Type":"application/json"},
  body:JSON.stringify({password}),redirect:"error",signal:AbortSignal.timeout(30000)});
 if(login.status!==200)safeFailure("Preview Admin login failed",login.status);
 const auth=await login.json().catch(()=>null);
 if(auth?.ok!==true)throw Error("Preview Admin login was not successful");
 cookie=(login.headers.get("set-cookie")||"").split(";")[0];
 if(!cookie.startsWith("sd_admin_session="))throw Error("Preview session cookie not returned");
 const originalSamples=[
  {mime:"image/webp",ext:"webp",bytes:readFileSync("public/images/2e05a590bc0cb44d.webp")},
  {mime:"image/png",ext:"png",bytes:readFileSync("public/images/hero-sneaker-light.png")},
  {mime:"image/jpeg",ext:"jpg",bytes:readFileSync("public/og-sindarealest.jpg")}
 ];
 const derivative=originalSamples[0].bytes;
 for(let i=0;i<report.requestedUploads;i++){
  const o=originalSamples[i%originalSamples.length];
  const fd=new FormData();
  fd.append("file",new Blob([derivative],{type:"image/webp"}),"preview-photo.webp");
  fd.append("original",new Blob([o.bytes],{type:o.mime}),"preview-original."+o.ext);
  const response=await fetch(origin+"/api/admin/upload",{
   method:"POST",headers:{...common,Cookie:cookie},body:fd,
   redirect:"error",signal:AbortSignal.timeout(45000)});
  const contentType=response.headers.get("content-type")||"";
  const result=await response.json().catch(()=>null);
  if(response.status!==201||!contentType.includes("application/json")||result?.ok!==true||
     !/^\/media\/[a-f0-9-]{36}\.webp$/i.test(result?.url||"")) {
    report.failedAt=i+1;report.responseStatus=response.status;
    report.responseType=contentType.slice(0,80);
    safeFailure("Photo upload failed",response.status);
  }
  const id=result.url.slice(7,-5);
  fixtures.push({id,extension:o.ext});
  report.completedUploads++;
  report.uploadedBytes+=derivative.length+o.bytes.length;
  if((i+1)%10===0)console.log("Preview photo upload series: "+(i+1)+"/"+report.requestedUploads);
 }
} catch(e){
 report.reason=String(e?.message||e).slice(0,240);
} finally {
 const errors=[];
 if(s3&&pub&&orig){
  for(const x of fixtures){
   const two=[{Bucket:pub,Key:x.id+".webp",type:"public"},{Bucket:orig,Key:"private-originals/"+x.id+"."+x.extension,type:"private"}];
   for(const item of two){
    try{await s3.send(new DeleteObjectCommand({Bucket:item.Bucket,Key:item.Key}));}
    catch{errors.push("DELETE_"+item.type);continue;}
    try {
     await s3.send(new HeadObjectCommand({Bucket:item.Bucket,Key:item.Key}));
     errors.push("STILL_EXISTS_"+item.type);
    }catch(e){
     if(e?.$metadata?.httpStatusCode===404||e?.name==="NotFound"||e?.name==="NoSuchKey"){
      if(item.type==="public")report.cleanedImages++;else report.cleanedOriginals++;
     }else errors.push("VERIFY_"+item.type);
    }
   }
  }
 }
 s3?.destroy();
 report.cleanupErrors=errors;
 report.status=!report.reason&&report.completedUploads===report.requestedUploads&&
  report.cleanedImages===report.completedUploads&&report.cleanedOriginals===report.completedUploads&&
  errors.length===0?"PASS":"FAIL";
 mkdirSync("artifacts/bulk-import-preview/remote",{recursive:true});
 writeFileSync("artifacts/bulk-import-preview/remote/sequential-30-photo-report.json",JSON.stringify(report,null,2));
 console.log("R2_SEQUENTIAL_QA="+JSON.stringify(report));
}
if(report.status!=="PASS")throw Error("Sequential Preview photo import QA did not pass (see bounded report).");
