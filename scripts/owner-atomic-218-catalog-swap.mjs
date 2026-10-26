/**
 * Atomic visibility cutover: hide 237 old products, publish 218 owner-imported
 * products IN ONE SQL UPDATE. Does not delete old rows or order history.
 * Refuses cutover until live Production frontend handles 15 dynamic categories.
 * On failed postcheck, restores 237/218 previous published flags atomically.
 * Deliberately not triggered while PR #119/#118 remain unmerged.
 */
import {S3Client,HeadObjectCommand} from "@aws-sdk/client-s3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
const key=process.env.R2_PRODUCTION_ACCESS_KEY_ID||"",secret=process.env.R2_PRODUCTION_SECRET_ACCESS_KEY||"";
const origin="https://sindarealest2.pages.dev";
const report={operation:"OWNER_218_FOR_237_ATOMIC_PUBLIC_CUTOVER",productionWrites:0,deletedProducts:0,
  historicalOrderWrites:0,oldRowsArchivedByUnpublishing:0,newRowsPublished:0,
  previousCatalogBackupVerified:false,mediaChecked:0,frontendReady:false,
  attempted:false,swapped:false,rolledBack:false,success:false};
const guard=(x,m)=>{if(!x)throw Error(m)};
const id=x=>x?.id||x?.database_id||"",bucket=x=>x?.name||x?.bucket_name||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(30000)
 });
 const j=await r.json().catch(()=>null);
 guard(r.ok&&j?.success===true,"CLOUDFLARE_CALL_REJECTED");
 return j.result;
}
async function d1(db,sql,params=[]){
 const x=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{sql,params});
 const v=Array.isArray(x)?x[0]:x;
 guard(v?.success===true,"D1_SQL_FAILED");
 return v.results||[];
}
function imgs(p){try{const v=JSON.parse(p.images_json||"[]");return Array.isArray(v)?v:[]}catch{return [];}}
async function publicProducts(){
 const resp=await fetch(origin+"/api/products?owner_cutover_check="+Date.now(),{
  headers:{"Cache-Control":"no-cache"},redirect:"error",signal:AbortSignal.timeout(20000)
 });
 guard(resp.ok,"PUBLIC_PRODUCTS_NOT_READABLE");
 const x=await resp.json();
 guard(Array.isArray(x),"PUBLIC_PRODUCTS_FORMAT_CHANGED");
 return x;
}
async function main(){
 guard(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&
  /^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||"")&&
  /^[a-f0-9]{32}$/i.test(account)&&token&&key&&secret,"SOURCE_BRANCH_CREDENTIAL_GUARD");
 const [pv,prod,html]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),
  cf("/pages/projects/sindarealest2"),
  fetch(origin+"/",{redirect:"error",signal:AbortSignal.timeout(20000)})
 ]);
 guard(html.ok,"STOREFRONT_UNREACHABLE");
 const markup=await html.text();
 // PR #119 adds this data-driven category branch to the owner-approved UI.
 guard(markup.includes("newly imported D1 categories")||
  /Object\.keys\(counts\)\.filter\(c=>!categoryOrder\.includes\(c\)\)/.test(markup),
  "LIVE_PRODUCTION_DYNAMIC_CATEGORIES_NOT_DEPLOYED");
 report.frontendReady=true;
 const preview=pv?.deployment_configs?.preview,live=prod?.deployment_configs?.production;
 const previewDb=id(preview?.d1_databases?.DB),liveDb=id(live?.d1_databases?.DB);
 const imagesBucket=bucket(live?.r2_buckets?.IMAGES),privateBucket=bucket(live?.r2_buckets?.ORIGINALS);
 guard(pv.name==="sindarealest-admin-preview"&&prod.name==="sindarealest2"&&
  previewDb&&liveDb&&previewDb!==liveDb&&imagesBucket&&privateBucket&&imagesBucket!==privateBucket,
  "PREVIEW_PRODUCTION_SCOPE_NOT_PROVEN");
 const s3=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
  forcePathStyle:true,maxAttempts:2,credentials:{accessKeyId:key,secretAccessKey:secret}});
 const [source,existing]=await Promise.all([
  d1(previewDb,"SELECT id,title,images_json,image_colors_json,created_at,sku_verified,stock,fulfillment_type,published FROM products"),
  d1(liveDb,"SELECT id,sku,title,published,images_json,image_colors_json FROM products")
 ]);
 const cohort=source.filter(p=>Number(p.published)===0&&Number(p.sku_verified)===0&&
   p.stock===null&&p.fulfillment_type==="unclassified"&&
   String(p.created_at).startsWith("2026-10-26")&&imgs(p).length>0&&
   imgs(p).every(u=>/^\/media\/[a-f0-9-]+\.webp$/i.test(String(u)))&&
   (()=>{try{return JSON.parse(p.image_colors_json).length===imgs(p).length}catch{return false}})());
 const newSet=new Set(cohort.map(p=>p.id));
 const staged=existing.filter(p=>newSet.has(p.id));
 const old=existing.filter(p=>!newSet.has(p.id));
 const files=staged.flatMap(imgs);
 guard(cohort.length===218&&newSet.size===218&&staged.length===218&&old.length===237&&
  staged.every(p=>Number(p.published)===0)&&
  old.every(p=>Number(p.published)===1)&&
  files.length===921&&new Set(files).size===921&&
  staged.every(p=>imgs(p).length===JSON.parse(p.image_colors_json).length),
  "EXACT_CATALOG_BEFORE_SWAP_NOT_PROVEN");
 const before=await publicProducts();
 const publicIds=new Set(before.map(p=>p.id));
 guard(before.length===237&&old.every(p=>publicIds.has(p.id))&&
  staged.every(p=>!publicIds.has(p.id)),"PUBLIC_PRECHECK_NOT_EXACT_237");
 try{
  const backup=await s3.send(new HeadObjectCommand({Bucket:privateBucket,
   Key:"private-catalog-cutover-backups/2026-10-26/full-d1-43d2f19f-1c10-4e5e-ad7a-adce7cfe3241.sql"}));
  guard(backup.ContentLength===201557&&
   backup.Metadata?.sha256==="6cf5be71bc20c3c3dbf879c5608cc42259c48c59170cc49fcc349b4131b575ed",
   "PRIVATE_FULL_D1_BACKUP_NOT_VERIFIED");
  report.previousCatalogBackupVerified=true;
  let cursor=0,failed=false;
  async function worker(){
   while(cursor<files.length&&!failed){
    const path=files[cursor++],match=/^\/media\/([a-f0-9-]+\.webp)$/i.exec(path);
    if(!match){failed=true;break;}
    try{
     const o=await s3.send(new HeadObjectCommand({Bucket:imagesBucket,Key:match[1]}));
     guard(Number(o.ContentLength)>0,"EMPTY_PRODUCTION_IMAGE");
     report.mediaChecked++;
    }catch{failed=true;}
   }
  }
  await Promise.all(Array.from({length:12},worker));
  guard(!failed&&report.mediaChecked===921,"PRODUCTION_IMAGES_INCOMPLETE");
 }finally{s3.destroy();}
 const allIds=existing.map(p=>p.id);
 const newIds=staged.map(p=>p.id);
 const oldIds=old.map(p=>p.id);
 const clause=(n)=>Array.from({length:n},()=>"?").join(",");
 const whereAll=clause(allIds.length),newList=clause(newIds.length),oldList=clause(oldIds.length);
 // UPDATE is one D1 SQL statement: old and new visibility switch atomically.
 const swapSql="UPDATE products SET published=CASE WHEN id IN ("+newList+") THEN 1 ELSE 0 END WHERE id IN ("+whereAll+")";
 const restoreSql="UPDATE products SET published=CASE WHEN id IN ("+oldList+") THEN 1 ELSE 0 END WHERE id IN ("+whereAll+")";
 let updated=false;
 try{
  report.attempted=true;
  await d1(liveDb,swapSql,[...newIds,...allIds]);
  updated=true;report.productionWrites++;
  const rows=await d1(liveDb,"SELECT id,published FROM products");
  guard(rows.length===455,"POST_SWAP_UNEXPECTED_TOTAL");
  const status=new Map(rows.map(p=>[p.id,Number(p.published)]));
  guard(staged.every(p=>status.get(p.id)===1)&&old.every(p=>status.get(p.id)===0),
    "DATABASE_POSTSWAP_MISMATCH");
  let visible=false;
  for(let n=0;n<3;n++){
   try{
    const products=await publicProducts();
    const current=new Set(products.map(p=>p.id));
    if(products.length===218&&staged.every(p=>current.has(p.id))&&
       old.every(p=>!current.has(p.id))){visible=true;break;}
   }catch{}
   await new Promise(r=>setTimeout(r,1500));
  }
  guard(visible,"PUBLIC_CATALOG_DID_NOT_SWITCH");
  report.swapped=true;
  report.newRowsPublished=218;
  report.oldRowsArchivedByUnpublishing=237;
  report.success=true;
 }catch(e){
  if(updated){
   try{
    await d1(liveDb,restoreSql,[...oldIds,...allIds]);
    report.productionWrites++;report.rolledBack=true;
   }catch(re){report.rollbackError=String(re.message||re).slice(0,110);}
  }
  throw e;
 }
}
try{await main();}
catch(e){report.error=String(e.message||e).slice(0,180);}
console.log("OWNER_CATALOG_ATOMIC_SWAP="+JSON.stringify(report));
if(!report.success)process.exitCode=1;
