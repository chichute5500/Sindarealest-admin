/**
 * Independent after-cutover audit: SELECT D1 and GET public Production API only.
 * No writes, rollback, deployment, customer/order data or private keys.
 */
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const report={
  mode:"POST_CUTOVER_READ_ONLY",target:"sindarealest2 Production",
  productionWrites:0,productionDeploys:0,
  counts:{},checks:{},issues:[],pass:false
};
const ensure=(condition,msg)=>{if(!condition)throw Error(msg)};
const id=x=>x?.id||x?.database_id||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(28000)});
 const data=await r.json().catch(()=>null);
 ensure(r.ok&&data?.success===true,"CLOUDFLARE_READ_FAILED");
 return data.result;
}
async function select(db,q){
 ensure(q.startsWith("SELECT "),"ONLY_SELECT_ALLOWED");
 const x=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{sql:q});
 const obj=Array.isArray(x)?x[0]:x;
 ensure(obj?.success&&Array.isArray(obj.results),"D1_QUERY_FAILED");
 return obj.results;
}
const parse=x=>{try{const a=JSON.parse(x||"[]");return Array.isArray(a)?a:[]}catch{return []}};
const imported=p=>
 Number(p.published)===0&&Number(p.sku_verified)===0&&
 p.stock===null&&p.fulfillment_type==="unclassified"&&
 String(p.created_at).startsWith("2026-10-26")&&
 parse(p.images_json).length>0&&
 parse(p.image_colors_json).length===parse(p.images_json).length&&
 parse(p.images_json).every(s=>/^\/media\/[a-f0-9-]+\.webp$/i.test(String(s)));
try{
 ensure(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&
  token&&/^[a-f0-9]{32}$/i.test(account),"AUDIT_GUARD");
 const [preview,production]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),
  cf("/pages/projects/sindarealest2")
 ]);
 const sourceDb=id(preview?.deployment_configs?.preview?.d1_databases?.DB);
 const targetDb=id(production?.deployment_configs?.production?.d1_databases?.DB);
 ensure(preview.name==="sindarealest-admin-preview"&&production.name==="sindarealest2"&&
  sourceDb&&targetDb&&sourceDb!==targetDb,"NOT_ISOLATED");
 const sql="SELECT id,sku,slug,title,published,stock,sku_verified,fulfillment_type,created_at,category,category_label,price,images_json,image_colors_json FROM products";
 const [source,destination]=await Promise.all([select(sourceDb,sql),select(targetDb,sql)]);
 const cohort=source.filter(imported);
 const newIDs=new Set(cohort.map(p=>p.id));
 const old=destination.filter(p=>!newIDs.has(p.id));
 const next=destination.filter(p=>newIDs.has(p.id));
 const previews=new Map(cohort.map(p=>[p.id,p]));
 report.counts={
  totalRows:destination.length,
  legacyRows:old.length,hiddenLegacy:old.filter(p=>Number(p.published)===0).length,
  newRows:next.length,publishedNew:next.filter(p=>Number(p.published)===1).length,
  newSkuUnique:new Set(next.map(p=>p.sku)).size,
  newImageReferences:next.reduce((sum,p)=>sum+parse(p.images_json).length,0),
  newCategories:new Set(next.map(p=>p.category)).size,
  unpricedNew:next.filter(p=>p.price===null).length
 };
 ensure(cohort.length===218&&newIDs.size===218,"PREVIEW_218_CHANGED");
 const same=next.every(p=>{
   const q=previews.get(p.id);
   return q&&q.title===p.title&&q.category===p.category&&q.category_label===p.category_label&&q.price===p.price&&
     JSON.stringify(parse(q.images_json))===JSON.stringify(parse(p.images_json))&&
     JSON.stringify(parse(q.image_colors_json))===JSON.stringify(parse(p.image_colors_json));
 });
 report.checks.dataMatchesPreview=same?"PASS":"FAIL";
 if(!same)report.issues.push("NEW_DATA_DIFFERS_FROM_PREVIEW");
 const r=await fetch("https://sindarealest2.pages.dev/api/products?postcutover="+Date.now(),{
  headers:{"Cache-Control":"no-cache"},redirect:"error",signal:AbortSignal.timeout(20000)
 });
 ensure(r.ok,"PUBLIC_CATALOG_UNAVAILABLE");
 const items=await r.json();
 ensure(Array.isArray(items),"PUBLIC_CATALOG_NOT_ARRAY");
 const ids=new Set(items.map(x=>x.id));
 report.counts.publicProducts=items.length;
 report.counts.publicNew=next.filter(x=>ids.has(x.id)).length;
 report.counts.publicOld=old.filter(x=>ids.has(x.id)).length;
 report.checks.publicCatalogIs218NewOnly=
    items.length===218&&report.counts.publicNew===218&&report.counts.publicOld===0?"PASS":"FAIL";
 if(report.checks.publicCatalogIs218NewOnly!=="PASS")report.issues.push("PUBLIC_CATALOG_MISMATCH");
 const homepage=await fetch("https://sindarealest2.pages.dev/?postcutover="+Date.now(),{
  headers:{"Cache-Control":"no-cache"},redirect:"error",signal:AbortSignal.timeout(20000)
 });
 ensure(homepage.ok,"STOREFRONT_UNREACHABLE");
 const html=await homepage.text();
 report.checks.dynamicCategoryFilter=html.includes("newly imported D1 categories")?"PASS":"FAIL";
 if(report.checks.dynamicCategoryFilter!=="PASS")report.issues.push("FILTER_NOT_DEPLOYED");
 const stateOK=report.counts.totalRows===455&&report.counts.legacyRows===237&&
  report.counts.hiddenLegacy===237&&report.counts.newRows===218&&
  report.counts.publishedNew===218&&report.counts.newSkuUnique===218&&
  report.counts.newImageReferences===921&&report.counts.newCategories===15;
 report.checks.d1CatalogCutover=stateOK?"PASS":"FAIL";
 if(!stateOK)report.issues.push("PRODUCTION_D1_UNEXPECTED_COUNT_OR_STATUS");
 report.pass=report.issues.length===0;
}catch(e){report.issues.push(String(e?.message||e).slice(0,140));}
console.log("POST_CUTOVER_INDEPENDENT_AUDIT="+JSON.stringify(report));
if(!report.pass)process.exitCode=1;
