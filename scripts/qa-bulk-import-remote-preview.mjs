/**
 * One real-image, real-API synthetic import on isolated Preview only.
 * Creates exactly one unpublished product, then removes its own D1/R2 fixtures.
 * Refuses to run without Preview/Production binding and deployed SHA proofs.
 */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { sanitizedDeployments } from "./admin-preview-provenance-readonly.mjs";
import { buildCloudflareAccessHeaders } from "./cloudflare-access-service-token.mjs";

const REPO="chichute5500/Sindarealest-admin";
const REF="refs/heads/feature/admin-bulk-folder-import-2026-10-26";
const SOURCE_BRANCH="sd-import-review-20261026";
const ORIGIN="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
const PROJECT="sindarealest-admin-preview";
const SHA=String(process.env.GITHUB_SHA||"");
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||"");
const token=String(process.env.CLOUDFLARE_API_TOKEN||"");
const pw=String(process.env.ADMIN_TEST_PASSWORD||"");
const accessKeyId=String(process.env.R2_ACCESS_KEY_ID||"");
const secretAccessKey=String(process.env.R2_SECRET_ACCESS_KEY||"");
const ACCESS=buildCloudflareAccessHeaders();
if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!==REF||
   !/^[0-9a-f]{40}$/i.test(SHA)||!/^[0-9a-f]{32}$/i.test(account)||
   !token||pw.length<12||!accessKeyId||!secretAccessKey||
   !ACCESS["cf-access-client-id"]||!ACCESS["cf-access-client-secret"])
   throw Error("Remote image QA not authorized: branch, project or secrets missing");

async function cloudflare(path){
  const res=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
    headers:{Authorization:"Bearer "+token},redirect:"error",signal:AbortSignal.timeout(25000)});
  const data=await res.json().catch(()=>null);
  if(!res.ok||data?.success!==true)throw Error("Cloudflare Preview metadata cannot be verified.");
  return data.result;
}
const [preview,prod,deployed]=await Promise.all([
  cloudflare("/pages/projects/"+PROJECT),cloudflare("/pages/projects/sindarealest2"),
  cloudflare("/pages/projects/"+PROJECT+"/deployments")
]);
assert.equal(preview?.name,PROJECT);assert.equal(prod?.name,"sindarealest2");
assert.equal(preview.production_branch,"main");assert.equal(prod.production_branch,"main");
const identity=(v)=>v?.id||v?.database_id||"";
const bucket=(v)=>v?.name||v?.bucket_name||"";
const pv=preview.deployment_configs?.preview;
const pp=preview.deployment_configs?.production;
const sp=prod.deployment_configs?.production;
const db=identity(pv?.d1_databases?.DB),prodDb=identity(sp?.d1_databases?.DB);
const pub=bucket(pv?.r2_buckets?.IMAGES),original=bucket(pv?.r2_buckets?.ORIGINALS);
const prodBuckets=[bucket(pp?.r2_buckets?.IMAGES),bucket(pp?.r2_buckets?.ORIGINALS),
  bucket(sp?.r2_buckets?.IMAGES),bucket(sp?.r2_buckets?.ORIGINALS)].filter(Boolean);
assert.ok(db&&prodDb&&db!==prodDb&&db!==identity(pp?.d1_databases?.DB),"Preview D1 isolation");
assert.ok(pub&&original&&pub!==original&&!prodBuckets.includes(pub)&&!prodBuckets.includes(original),"Preview R2 isolation");
const matches=sanitizedDeployments(deployed).filter(x=>x.environment==="preview"&&
  x.stage==="success"&&x.branch===SOURCE_BRANCH&&x.sha===SHA&&
  x.aliases.includes("sd-import-review-20261026.sindarealest-admin-preview.pages.dev"));
assert.ok(matches.length,"Exact deployed Preview SHA unverified; refuse any writes");

const tag=randomUUID().replace(/-/g,"").slice(0,20);
const title="QA BULK IMPORT ONLY "+tag;
const report={sourceSha:SHA,environment:"ISOLATED_PREVIEW_ONLY",realImageUploads:0,
  createdDrafts:0,unpublishedVerified:false,originalPrivate:true,cleanupVerified:false,
  productionWrites:0,realMoneyTransfers:0,steps:[]};
const record=(name,valid)=>{report.steps.push({name,pass:Boolean(valid)});if(!valid)throw Error("FAIL "+name);};
let productId="",uploadedId="",cookie="",error=null,client=null;
const headers={...ACCESS,Origin:ORIGIN,"Sec-Fetch-Site":"same-origin"};
async function local(path,{method="GET",body=null,raw=false,authenticated=true}={}){
 const h={...headers,...(authenticated&&cookie?{Cookie:cookie}:{})};
 if(body!==null&&!raw)h["Content-Type"]="application/json";
 const res=await fetch(ORIGIN+path,{method,headers:h,body:body===null?undefined:(raw?body:JSON.stringify(body)),
   signal:AbortSignal.timeout(45000),redirect:"error"});
 const json=await res.json().catch(()=>null);
 return {res,body:json};
}
async function query(sql,params=[]){
 const res=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database/"+db+"/query",{
 method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
 body:JSON.stringify({sql,params}),redirect:"error",signal:AbortSignal.timeout(25000)});
 const j=await res.json().catch(()=>null);
 if(!res.ok||j?.success!==true||!j.result?.[0]?.success)throw Error("Preview D1 scoped query failed");
 return j.result[0]?.results||[];
}
try{
 const login=await local("/api/admin/login",{method:"POST",body:{password:pw},authenticated:false});
 record("Preview-only Admin login",login.res.status===200&&login.body?.ok===true);
 cookie=(login.res.headers.get("set-cookie")||"").split(";")[0];
 record("Scoped Admin cookie returned",cookie.startsWith("sd_admin_session="));
 const existing=await local("/api/admin/products");
 record("Admin products read before image upload",existing.res.status===200&&Array.isArray(existing.body?.products));
 const bytes=readFileSync("public/watermark.webp");
 record("Synthetic source valid WebP",bytes.length>20&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP");
 const fd=new FormData();
 fd.append("file",new Blob([bytes],{type:"image/webp"}),"qa-display.webp");
 fd.append("original",new Blob([bytes],{type:"image/webp"}),"qa-original.webp");
 const uploaded=await local("/api/admin/upload",{method:"POST",body:fd,raw:true});
 record("Authenticated two-tier R2 upload",uploaded.res.status===201&&uploaded.body?.ok===true&&
   uploaded.body?.originalStoredPrivately===true&&/^\/media\/[a-f0-9-]{36}\.webp$/i.test(uploaded.body?.url||""));
 uploadedId=uploaded.body.url.slice("/media/".length,-".webp".length);
 report.realImageUploads=1;
 const media=await fetch(ORIGIN+uploaded.body.url,{headers:ACCESS,redirect:"error",signal:AbortSignal.timeout(30000)});
 record("Public optimized media readback",media.status===200&&
   (media.headers.get("content-type")||"").includes("image/webp"));
 const payload={title,category:"Sneaker",categoryLabel:"Giày thể thao",description:"",
   price:2200000,stock:null,images:[uploaded.body.url],imageColors:["Nâu"],published:false,
   skuVerified:false,fulfillmentType:"unclassified"};
 const created=await local("/api/admin/products",{method:"POST",body:payload});
 record("Create exactly one real unpublished D1 draft",created.res.status===201&&created.body?.ok===true&&
   /^[0-9a-f-]{36}$/i.test(created.body?.product?.id||"")&&created.body?.product?.published===false);
 productId=created.body.product.id;report.createdDrafts=1;
 const listing=await local("/api/admin/products");
 record("Admin sees seller-confirmed VND price and corrected photo color in hidden draft",listing.res.status===200&&listing.body?.products?.some(p=>p.id===productId&&
   p.published===false&&p.price===2200000&&p.stock===null&&p.images?.[0]===uploaded.body.url&&p.imageColors?.[0]==="Nâu"&&/^SD-/.test(p.sku)));
 const publicListing=await local("/api/products",{authenticated:false});
 record("Unpublished QA product absent from public storefront",publicListing.res.status===200&&
   Array.isArray(publicListing.body)&&!publicListing.body.some(p=>p.id===productId));
 report.unpublishedVerified=true;
}catch(e){error=e;report.error=String(e?.message||e).slice(0,280);}
finally{
 const failures=[];
 try{
  if(!productId){
   const rows=await query("SELECT id FROM products WHERE title=? LIMIT 2",[title]);
   if(rows.length>1)throw Error("Fixture title collision");
   if(rows.length===1)productId=rows[0].id;
  }
  if(productId){
   const d=await local("/api/admin/products/"+encodeURIComponent(productId),{method:"DELETE"});
   if(d.res.status!==200||d.body?.ok!==true)failures.push("D1_DELETE_FAILED");
   const remaining=await query("SELECT COUNT(*) AS n FROM products WHERE id=?",[productId]);
   if(Number(remaining[0]?.n)!==0)failures.push("D1_PRODUCT_REMAINS");
   await query("DELETE FROM audit_logs WHERE entity_type='product' AND entity_id=? AND action IN ('product_created','product_deleted')",[productId]);
   const logs=await query("SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type='product' AND entity_id=?",[productId]);
   if(Number(logs[0]?.n)!==0)failures.push("D1_AUDIT_FIXTURE_REMAINS");
  }
 }catch(e){failures.push("D1_CLEANUP_UNVERIFIED");}
 if(uploadedId){
  const objects=[{Bucket:pub,Key:uploadedId+".webp"},{Bucket:original,Key:"private-originals/"+uploadedId+".webp"}];
  try{
   client=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
    forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},maxAttempts:2});
   for(const obj of objects)await client.send(new DeleteObjectCommand(obj));
   for(const obj of objects){
    try{await client.send(new HeadObjectCommand(obj));failures.push("R2_OBJECT_STILL_EXISTS");}
    catch(e){if(e?.$metadata?.httpStatusCode!==404&&!["NotFound","NoSuchKey"].includes(e?.name))failures.push("R2_HEAD_UNVERIFIED");}
   }
  }catch(e){failures.push("R2_CLEANUP_FAILED");}
 }
 client?.destroy();
 report.cleanupVerified=failures.length===0&&Boolean(uploadedId)&&Boolean(productId);
 report.cleanupErrors=failures;
}
const ok=!error&&report.realImageUploads===1&&report.createdDrafts===1&&
  report.unpublishedVerified&&report.cleanupVerified&&report.steps.every(s=>s.pass);
report.status=ok?"PASS":"FAIL";
mkdirSync("artifacts/bulk-import-preview/remote",{recursive:true});
writeFileSync("artifacts/bulk-import-preview/remote/report.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!ok)throw Error("Real isolated Preview photo import not accepted: "+(report.error||report.cleanupErrors.join(",")));
