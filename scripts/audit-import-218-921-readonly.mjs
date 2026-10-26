/**
 * SinDarealest owner import audit. Strictly READ-ONLY, isolated Preview only.
 * D1: SELECT products; R2: HeadObject optimized + private originals.
 * No application writes, deletion, migration, deployment, or publishing.
 */
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, writeFileSync } from "node:fs";

const REPO="chichute5500/Sindarealest-admin";
const BRANCH="refs/heads/audit/import-218-921-readonly-2026-10-26";
const ORIGIN="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const key=process.env.R2_ACCESS_KEY_ID||"";
const secret=process.env.R2_SECRET_ACCESS_KEY||"";
const accessId=process.env.CF_ACCESS_CLIENT_ID||"";
const accessSecret=process.env.CF_ACCESS_CLIENT_SECRET||"";
const report={
  scope:"ISOLATED_PREVIEW_READ_ONLY",reference:"218 models / 921 images",
  expected:{models:218,images:921},sourceSha:process.env.GITHUB_SHA||"",
  mutations:0,productionWrites:0,deployments:0,
  checks:{},counts:{},issues:[],passed:false,
};
const issue=(code,n=1)=>{if(!report.issues.some(x=>x.code===code))report.issues.push({code,count:n});else report.issues.find(x=>x.code===code).count+=n;};
const save=()=>{mkdirSync("artifacts/import-audit",{recursive:true});writeFileSync("artifacts/import-audit/report.json",JSON.stringify(report,null,2)+"\n");console.log("IMPORT_AUDIT_REPORT="+JSON.stringify(report));};
const fail=(message)=>{issue(message);throw Error(message);};
const id=x=>x?.id||x?.database_id||"";
const bucket=x=>x?.name||x?.bucket_name||"";
async function cf(path,init={}){
  const resp=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
    method:init.method||"GET",headers:{Authorization:"Bearer "+token,...init.headers},
    body:init.body,redirect:"error",signal:AbortSignal.timeout(30000)
  });
  const json=await resp.json().catch(()=>null);
  if(!resp.ok||json?.success!==true)fail("CLOUDFLARE_API_UNAVAILABLE_"+resp.status);
  return json.result;
}
async function head(s3,b,k){
  return s3.send(new HeadObjectCommand({Bucket:b,Key:k}),{abortSignal:AbortSignal.timeout(18000)});
}
function parsedImages(p){
  try{const x=JSON.parse(p.images_json||"[]");return Array.isArray(x)?x:[];}catch{return [];}
}
function parsedColors(p){
  try{const x=JSON.parse(p.image_colors_json||"[]");return Array.isArray(x)?x:[];}catch{return [];}
}
const newMedia=/^\/media\/([0-9a-f]{8}-[0-9a-f-]{27,}\.webp)$/i;
async function main(){
 if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!==BRANCH||
    !/^[0-9a-f]{40}$/i.test(report.sourceSha)||!/^[0-9a-f]{32}$/i.test(account)||
    !token||!key||!secret)fail("SAFE_AUDIT_GUARD_FAILED");
 const [preview,production]=await Promise.all([
    cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")
 ]);
 const pv=preview?.deployment_configs?.preview;
 const pp=preview?.deployment_configs?.production;
 const prod=production?.deployment_configs?.production;
 const db=id(pv?.d1_databases?.DB),prodDb=id(prod?.d1_databases?.DB);
 const publicBucket=bucket(pv?.r2_buckets?.IMAGES),privateBucket=bucket(pv?.r2_buckets?.ORIGINALS);
 const forbidden=[bucket(prod?.r2_buckets?.IMAGES),bucket(prod?.r2_buckets?.ORIGINALS),
   bucket(pp?.r2_buckets?.IMAGES),bucket(pp?.r2_buckets?.ORIGINALS)].filter(Boolean);
 if(preview?.name!=="sindarealest-admin-preview"||production?.name!=="sindarealest2"||
    !db||!prodDb||db===prodDb||db===id(pp?.d1_databases?.DB)||
    !publicBucket||!privateBucket||publicBucket===privateBucket||
    forbidden.includes(publicBucket)||forbidden.includes(privateBucket))
    fail("PREVIEW_PRODUCTION_ISOLATION_NOT_PROVEN");
 report.checks.separatePreviewD1R2="PASS";
 // D1 endpoint is POST transport, but constant SQL below is SELECT-only.
 const response=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({sql:"SELECT id,sku,title,category,category_label,price,stock,published,sku_verified,source_price_confirmed,fulfillment_type,images_json,image_colors_json,created_at FROM products ORDER BY created_at DESC"})
 });
 const result=Array.isArray(response)?response[0]:response;
 if(!result?.success||!Array.isArray(result.results))fail("D1_SELECT_RESULTS_UNAVAILABLE");
 const products=result.results;
 const images=p=>parsedImages(p);
 // Imports are unpublished, non-commercial SKU drafts created on the target day,
 // with URL-to-color correspondence and the importer fulfillment marker.
 const cohort=products.filter(p=>
    Number(p.published)===0&&Number(p.sku_verified)===0&&
    p.fulfillment_type==="unclassified"&&p.stock===null&&
    String(p.created_at||"").startsWith("2026-10-26")&&
    images(p).length>0&&images(p).every(u=>newMedia.test(String(u)))&&
    parsedColors(p).length===images(p).length
 );
 report.counts.allProducts=products.length;
 report.counts.unpublished=products.filter(p=>Number(p.published)===0).length;
 report.counts.importCohort=cohort.length;
 report.counts.otherUnpublished=report.counts.unpublished-cohort.length;
 const entries=cohort.flatMap(p=>images(p).map((url,index)=>({p,url,index})));
 report.counts.imagesReferenced=entries.length;
 report.counts.distinctImages=new Set(entries.map(x=>x.url)).size;
 report.counts.distinctSku=new Set(cohort.map(x=>x.sku)).size;
 report.counts.categoryCount=new Set(cohort.map(x=>x.category_label||x.category)).size;
 report.counts.emptyPrices=cohort.filter(p=>p.price===null).length;
 report.counts.unconfirmedPrices=cohort.filter(p=>p.price!==null&&Number(p.source_price_confirmed)!==1).length;
 report.counts.emptyTitles=cohort.filter(p=>!String(p.title||"").trim()).length;
 report.counts.emptyColors=cohort.reduce((n,p)=>n+parsedColors(p).filter(c=>!String(c||"").trim()).length,0);
 if(cohort.length!==218)issue("MODEL_COUNT_NOT_218",Math.abs(cohort.length-218));
 if(entries.length!==921)issue("IMAGE_COUNT_NOT_921",Math.abs(entries.length-921));
 if(report.counts.distinctImages!==entries.length)issue("DUPLICATE_IMAGE_REFERENCES",entries.length-report.counts.distinctImages);
 if(report.counts.distinctSku!==cohort.length)issue("DUPLICATE_SKU",cohort.length-report.counts.distinctSku);
 if(report.counts.unconfirmedPrices)issue("UNCONFIRMED_STORED_PRICES",report.counts.unconfirmedPrices);
 if(report.counts.emptyTitles)issue("EMPTY_PRODUCT_TITLES",report.counts.emptyTitles);
 if(report.counts.emptyColors)issue("EMPTY_COLOR_LABELS",report.counts.emptyColors);
 const s3=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
    credentials:{accessKeyId:key,secretAccessKey:secret},maxAttempts:2,forcePathStyle:true});
 const checked={optimized:0,original:0,missingOptimized:0,missingOriginal:0,badMeta:0};
 let offset=0;
 async function worker(){
   while(offset<entries.length){
     const e=entries[offset++],fileKey=newMedia.exec(String(e.url))?.[1];
     if(!fileKey){checked.badMeta++;continue;}
     try {
       const obj=await head(s3,publicBucket,fileKey);
       if(!Number.isFinite(obj.ContentLength)||obj.ContentLength<=0){checked.badMeta++;continue;}
       checked.optimized++;
       const originalKey=obj.Metadata?.originalkey||obj.Metadata?.originalKey;
       if(!originalKey||!/^private-originals\/[0-9a-f-]+\.(?:jpe?g|png|webp)$/i.test(originalKey)){
         checked.badMeta++;continue;
       }
       try{
         const original=await head(s3,privateBucket,originalKey);
         if(!Number.isFinite(original.ContentLength)||original.ContentLength<=0)checked.badMeta++;
         else checked.original++;
       }catch{checked.missingOriginal++;}
     }catch{checked.missingOptimized++;}
   }
 }
 try {await Promise.all(Array.from({length:Math.min(12,entries.length)},()=>worker()));}
 finally{s3.destroy();}
 report.counts.r2={...checked};
 if(checked.optimized!==entries.length||checked.original!==entries.length||
   checked.badMeta||checked.missingOptimized||checked.missingOriginal)
    issue("R2_IMAGE_OR_ORIGINAL_INCOMPLETE",
      checked.badMeta+checked.missingOptimized+checked.missingOriginal);
 // Public storefront endpoint must not expose these unpublished products.
 try {
   const accessHeaders=accessId&&accessSecret?{"CF-Access-Client-Id":accessId,"CF-Access-Client-Secret":accessSecret}:{};
   const res=await fetch(ORIGIN+"/api/products",{headers:accessHeaders,signal:AbortSignal.timeout(25000)});
   report.checks.publicCatalogHTTP=res.status;
   if(!res.ok)issue("PUBLIC_CATALOG_UNAVAILABLE");
   else {
     const data=await res.json(),list=Array.isArray(data)?data:Array.isArray(data?.products)?data.products:Array.isArray(data?.data)?data.data:[];
     const ids=new Set(cohort.map(p=>p.id));
     const leaked=list.filter(p=>ids.has(p?.id));
     report.counts.publicCatalogSize=list.length;
     report.counts.importedProductsVisiblePublicly=leaked.length;
     if(leaked.length)issue("UNPUBLISHED_PRODUCTS_LEAK_IN_PUBLIC_CATALOG",leaked.length);
     else report.checks.unpublishedNotPublic="PASS";
   }
 }catch{issue("PUBLIC_CATALOG_UNAVAILABLE");}
 report.passed=report.issues.length===0;
 report.checks.readOnly="PASS";
}
try{await main();}
catch(e){if(!report.issues.length)issue("AUDIT_ERROR");report.errorType=String(e?.name||"Error");}
finally{save();}
if(!report.passed)process.exitCode=1;
