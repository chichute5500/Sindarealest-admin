/**
 * Apply only one additive column on verified ISOLATED Preview D1.
 * Never touch Production. No existing product row mutation.
 */
import { readFileSync } from "node:fs";
const expectedRef="refs/heads/feature/admin-bulk-folder-import-2026-10-26";
if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin"||
process.env.GITHUB_REF!==expectedRef||!/^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||""))
  throw Error("Unsafe source SHA or ref");
const account=process.env.CLOUDFLARE_ACCOUNT_ID, token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error("Missing Cloudflare metadata credentials");
async function get(path){
const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(account)+path,{
headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000),redirect:"error"});
const j=await r.json().catch(()=>null);
if(!r.ok||j?.success!==true)throw Error("Cannot validate Cloudflare project identity");
return j.result;
}
const [preview,prod]=await Promise.all([get("/pages/projects/sindarealest-admin-preview"),get("/pages/projects/sindarealest2")]);
const a=preview?.deployment_configs?.preview,b=preview?.deployment_configs?.production,c=prod?.deployment_configs?.production;
const db=v=>v?.d1_databases?.DB?.id||v?.d1_databases?.DB?.database_id||"";
const bucket=(v,k)=>v?.r2_buckets?.[k]?.name||v?.r2_buckets?.[k]?.bucket_name||"";
const id=db(a);
const images=bucket(a,"IMAGES"),originals=bucket(a,"ORIGINALS");
if(preview?.name!=="sindarealest-admin-preview"||prod?.name!=="sindarealest2"||
preview.production_branch!=="main"||prod.production_branch!=="main"||
!id||id===db(b)||id===db(c)||!db(c)||!images||!originals||images===originals||
[images,originals].some(x=>[bucket(b,"IMAGES"),bucket(b,"ORIGINALS"),bucket(c,"IMAGES"),bucket(c,"ORIGINALS")].includes(x)))
throw Error("D1/R2 Preview vs Production isolation unverified");
async function query(sql){
const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(account)+
"/d1/database/"+encodeURIComponent(id)+"/query",{
 method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
 body:JSON.stringify({sql}),signal:AbortSignal.timeout(30000),redirect:"error"
});
const j=await r.json().catch(()=>null);
if(!r.ok||j?.success!==true||j?.result?.[0]?.success!==true)throw Error("Preview D1 operation failed");
return j.result[0].results||[];
}
const before=await query("PRAGMA table_info(products)");
if(!before.length)throw Error("Preview products table missing");
const existing=before.some(row=>row.name==="image_colors_json");
if(!existing) {
 const sql=readFileSync(new URL("../migrations/0010_product_image_colors.sql",import.meta.url),"utf8")
   .split("\n").filter(line=>!line.trim().startsWith("--")).join("\n").trim();
 if(!/^ALTER TABLE products ADD COLUMN image_colors_json TEXT NOT NULL DEFAULT '\[\]'[;]?$/.test(sql))
   throw Error("Unapproved Preview D1 migration");
 await query(sql);
}
const after=await query("PRAGMA table_info(products)");
if(!after.some(row=>row.name==="image_colors_json"))throw Error("Preview D1 image-color field not verified");
console.log("PASS: Preview-only additive per-image color migration exists; Production untouched. Applied="+(!existing));
