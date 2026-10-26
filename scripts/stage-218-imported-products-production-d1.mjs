/**
 * Idempotent D1 import staging: Preview owner drafts => Production UNPUBLISHED.
 * No publish, no deletion, no old SKU edits, no order/customer writes.
 * Requires the full private Production backup to have been verified first.
 */
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const access=process.env.R2_PRODUCTION_ACCESS_KEY_ID||"";
const secret=process.env.R2_PRODUCTION_SECRET_ACCESS_KEY||"";
const report={operation:"PRODUCTION_D1_STAGE_UNPUBLISHED_ONLY",expected:218,imagesExpected:921,
  rowsInserted:0,rowsAlreadyStaged:0,skusRemapped:0,imagesChecked:0,
  privateBackupVerified:false,
  oldProductsChanged:0,productsPublished:0,ordersChanged:0,productionDeployments:0,
  schemaMigrationApplied:false,success:false};
const ensure=(v,msg)=>{if(!v)throw Error(msg)};
const val=x=>x?.id||x?.database_id||"";
const bucket=x=>x?.name||x?.bucket_name||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(30000)
 });
 const d=await r.json().catch(()=>null);
 ensure(r.ok&&d?.success===true,"CLOUDFLARE_QUERY_HTTP_"+r.status);
 return d.result;
}
async function sql(db,query,params=[]){
 const x=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{sql:query,params});
 const z=Array.isArray(x)?x[0]:x;
 ensure(z?.success===true,"D1_SQL_NOT_SUCCESSFUL");
 return z.results||[];
}
const parse=s=>{try{const x=JSON.parse(s||"[]");return Array.isArray(x)?x:[]}catch{return []}};
const media=/^\/media\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp)$/i;
function remapSku(sku,reserved){
 const m=/^(.+?)(\d{3,})$/.exec(sku);
 ensure(m&&sku.startsWith("SD-"),"SKU_NOT_REMAPABLE");
 const [,prefix,digits]=m;
 for(let n=1;n<20000;n++){
  const candidate=prefix+String(n).padStart(digits.length,"0");
  if(!reserved.has(candidate)){reserved.add(candidate);return candidate;}
 }
 throw Error("SKU_NAMESPACE_EXHAUSTED");
}
async function main(){
 ensure(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&
  /^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||"")&&
  /^[a-f0-9]{32}$/i.test(account)&&token&&access&&secret,"SAFE_BRANCH_OR_CREDENTIAL_GUARD");
 const [preview,production]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")
 ]);
 const pv=preview?.deployment_configs?.preview,prod=production?.deployment_configs?.production;
 const sourceDB=val(pv?.d1_databases?.DB),targetDB=val(prod?.d1_databases?.DB);
 const buckets=[bucket(pv?.r2_buckets?.IMAGES),bucket(pv?.r2_buckets?.ORIGINALS),
  bucket(prod?.r2_buckets?.IMAGES),bucket(prod?.r2_buckets?.ORIGINALS)];
 ensure(preview?.name==="sindarealest-admin-preview"&&
  production?.name==="sindarealest2"&&sourceDB&&targetDB&&sourceDB!==targetDB&&
  buckets.every(Boolean)&&new Set(buckets).size===4,"PREVIEW_PRODUCTION_NOT_ISOLATED");
 const [src,dst,columns]=await Promise.all([
  sql(sourceDB,"SELECT id,slug,sku,sku_verified,title,category,category_label,description,price,stock,published,images_json,image_colors_json,source_price_confirmed,sort_order,fulfillment_type,created_at,updated_at FROM products"),
  sql(targetDB,"SELECT id,slug,sku,title,published,images_json,created_at FROM products"),
  sql(targetDB,"SELECT name FROM pragma_table_info('products')")
 ]);
 let cohort=src.filter(p=>p.published===0&&p.sku_verified===0&&p.stock===null&&
  p.fulfillment_type==="unclassified"&&String(p.created_at).startsWith("2026-10-26")&&
  parse(p.images_json).length>0&&parse(p.images_json).every(x=>media.test(String(x)))&&
  parse(p.image_colors_json).length===parse(p.images_json).length);
 cohort.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const pictures=cohort.flatMap(p=>parse(p.images_json));
 ensure(cohort.length===218&&pictures.length===921&&
  new Set(pictures).size===921&&
  new Set(cohort.map(p=>p.id)).size===218&&
  new Set(cohort.map(p=>p.sku)).size===218,"OWNER_IMPORT_COHORT_INVALID");
 const existing=new Map(dst.map(p=>[p.id,p]));
 const old=dst.filter(p=>!cohort.some(x=>x.id===p.id));
 ensure(old.length===237&&old.every(p=>Number(p.published)===1),"PRODUCTION_OLD_CATALOG_CHANGED");
 report.oldCatalogCount=old.length;
 // Refuse staging before every optimized WebP object is accessible in Production.
 const s3=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
   forcePathStyle:true,maxAttempts:2,credentials:{accessKeyId:access,secretAccessKey:secret}});
 let cursor=0,err=null;
 try{
  // The full private SQL backup was exported and readback-hashed in
  // GitHub Actions #40343065366; require it to still exist before D1 edits.
  const backup=await s3.send(new HeadObjectCommand({
    Bucket:buckets[3],
    Key:"private-catalog-cutover-backups/2026-10-26/full-d1-43d2f19f-1c10-4e5e-ad7a-adce7cfe3241.sql"
  }),{abortSignal:AbortSignal.timeout(18000)});
  ensure(backup.ContentLength===201557&&
    backup.Metadata?.sha256==="6cf5be71bc20c3c3dbf879c5608cc42259c48c59170cc49fcc349b4131b575ed",
    "VERIFIED_PRIVATE_D1_BACKUP_MISSING");
  report.privateBackupVerified=true;
  async function worker(){
   while(cursor<pictures.length&&!err){
    const k=media.exec(pictures[cursor++])?.[1];
    try {
     const meta=await s3.send(new HeadObjectCommand({Bucket:buckets[2],Key:k}),
       {abortSignal:AbortSignal.timeout(18000)});
     ensure(Number(meta.ContentLength)>0,"TARGET_IMAGE_EMPTY");
     report.imagesChecked++;
    }catch(e){err=String(e.message||e).slice(0,90);}
   }
  }
  await Promise.all(Array.from({length:10},()=>worker()));
 }finally{s3.destroy();}
 ensure(!err&&report.imagesChecked===921,"PRODUCTION_R2_MEDIA_NOT_READY");
 const schema=new Set(columns.map(x=>x.name));
 for(const name of ["id","slug","sku","published","sku_verified","fulfillment_type","images_json","source_price_confirmed","created_at"])
  ensure(schema.has(name),"PRODUCTION_COLUMN_MISSING_"+name);
 if(!schema.has("image_colors_json")){
   await sql(targetDB,"ALTER TABLE products ADD COLUMN image_colors_json TEXT NOT NULL DEFAULT '[]'");
   report.schemaMigrationApplied=true;
 }
 const verified=await sql(targetDB,"SELECT name FROM pragma_table_info('products')");
 ensure(verified.some(x=>x.name==="image_colors_json"),"COLOR_MIGRATION_NOT_APPLIED");
 const plannedSkus=new Set(dst.map(x=>x.sku));
 // Preserve existing staged assignments on re-runs. Reserve all original
 // Preview SKUs not occupied by any old row, before remapping collisions.
 const oldSkus=new Set(old.map(x=>x.sku));
 for(const p of cohort)if(!existing.has(p.id)&&!oldSkus.has(p.sku))plannedSkus.add(p.sku);
 const oldSlugs=new Set(dst.map(x=>x.slug));
 const assignments=cohort.map(p=>{
   const found=existing.get(p.id);
   if(found){
    ensure(found.published===0&&found.title===p.title&&found.images_json===p.images_json,
     "STAGED_PRODUCT_DIFFERED_FROM_SOURCE");
    report.rowsAlreadyStaged++;
    return {...p,sku:found.sku,slug:found.slug,already:true};
   }
   let sku=p.sku;
   if(oldSkus.has(sku)){
     sku=remapSku(sku,plannedSkus);report.skusRemapped++;
   }
   let slug=p.slug;
   if(oldSlugs.has(slug)){slug=String(p.slug).slice(0,76)+"-i"+String(p.id).slice(0,8);ensure(!oldSlugs.has(slug),"SLUG_COLLISION");}
   oldSlugs.add(slug);
   return {...p,sku,slug,already:false};
 });
 ensure(new Set(assignments.map(x=>x.sku)).size===218&&new Set(assignments.map(x=>x.slug)).size===218,"UNIQUE_KEYS_NOT_PROVEN");
 const cols=["id","slug","sku","sku_verified","title","category","category_label",
  "description","price","stock","published","images_json","image_colors_json",
  "source_price_confirmed","sort_order","fulfillment_type","created_at","updated_at"];
 let pending=assignments.filter(p=>!p.already);
 for(let off=0;off<pending.length;off+=5){
  const batch=pending.slice(off,off+5);
  const values=batch.map(p=>cols.map(c=>{
   if(c==="sku_verified"||c==="published")return 0;
   if(c==="updated_at")return p.updated_at||p.created_at;
   return p[c]===undefined?null:p[c];
  }));
  const markers=batch.map(()=>"("+cols.map(()=>"?").join(",")+")").join(",");
  await sql(targetDB,"INSERT INTO products ("+cols.join(",")+") VALUES "+markers,values.flat());
  report.rowsInserted+=batch.length;
 }
 const all=await sql(targetDB,"SELECT id,sku,slug,published,images_json,image_colors_json FROM products");
 const merged=new Map(all.map(x=>[x.id,x]));
 const staged=assignments.map(p=>merged.get(p.id));
 ensure(staged.every(Boolean)&&staged.every(p=>p.published===0)&&
  staged.reduce((n,p)=>n+parse(p.images_json).length,0)===921&&
  staged.every(p=>parse(p.images_json).length===parse(p.image_colors_json).length),
  "STAGED_CATALOG_POSTWRITE_MISMATCH");
 ensure(old.every(p=>merged.get(p.id)?.published===1),"HISTORICAL_PUBLISHED_ROWS_CHANGED");
 report.finalDraftCount=staged.length;report.finalD1Rows=all.length;
 report.success=true;
}
try{await main();}catch(e){report.error=String(e.message||e).slice(0,170);}
console.log("OWNER_D1_STAGING="+JSON.stringify(report));
if(!report.success)process.exitCode=1;
