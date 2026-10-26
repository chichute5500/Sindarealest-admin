/**
 * Owner catalog cutover readiness. Read-only SELECT + public GET.
 * Count exactly 218 new D1 drafts and verify source/target payload identity.
 * Check the deployed Production storefront supports D1-driven categories.
 */
const token=process.env.CLOUDFLARE_API_TOKEN||"",account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const result={operation:"POST_STAGE_CATALOG_READINESS_READ_ONLY",writes:0,deployments:0,checks:{},counts:{},issues:[],readyForPublicSwap:false};
const assert=(x,m)=>{if(!x)throw Error(m)};
const id=x=>x?.id||x?.database_id||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(25000)});
 const j=await r.json().catch(()=>null);assert(r.ok&&j?.success===true,"CLOUDFLARE_READ_FAILED");return j.result;
}
async function select(db,q){
 assert(q.startsWith("SELECT "),"NOT_SELECT");
 const x=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{sql:q});
 const o=Array.isArray(x)?x[0]:x;assert(o?.success&&Array.isArray(o.results),"D1_SELECT_FAILED");return o.results;
}
const parse=(s)=>{try{const v=JSON.parse(s||"[]");return Array.isArray(v)?v:[]}catch{return []}};
function imported(p){return Number(p.published)===0&&Number(p.sku_verified)===0&&
  p.fulfillment_type==="unclassified"&&p.stock===null&&
  String(p.created_at).startsWith("2026-10-26")&&parse(p.images_json).length>0&&
  parse(p.images_json).every(u=>/^\/media\/[a-f0-9-]+\.webp$/i.test(String(u)))&&
  parse(p.image_colors_json).length===parse(p.images_json).length;}
try{
 assert(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&
  token&&account,"READ_ONLY_BRANCH_GUARD");
 const [src,tgt]=await Promise.all([
   cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")]);
 const source=id(src?.deployment_configs?.preview?.d1_databases?.DB);
 const target=id(tgt?.deployment_configs?.production?.d1_databases?.DB);
 assert(src.name==="sindarealest-admin-preview"&&tgt.name==="sindarealest2"&&
   source&&target&&source!==target,"PRODUCTION_PREVIEW_MIXUP");
 const [original,live]=await Promise.all([
   select(source,"SELECT id,title,sku,slug,category,category_label,price,images_json,image_colors_json,created_at,stock,sku_verified,published,fulfillment_type FROM products"),
   select(target,"SELECT id,title,sku,slug,category,category_label,price,images_json,image_colors_json,created_at,stock,sku_verified,published,fulfillment_type FROM products")
 ]);
 const srcSet=original.filter(imported),dstMap=new Map(live.map(p=>[p.id,p]));
 const staged=srcSet.map(p=>dstMap.get(p.id)).filter(Boolean);
 result.counts.previewImported=srcSet.length;
 result.counts.productionImported=staged.length;
 result.counts.productionAll=live.length;
 result.counts.productionPublished=live.filter(p=>p.published===1).length;
 result.counts.productionDrafts=live.filter(p=>p.published===0).length;
 result.counts.categories=new Set(srcSet.map(p=>p.category)).size;
 result.counts.previewImageReferences=srcSet.reduce((n,p)=>n+parse(p.images_json).length,0);
 result.counts.productionImageReferences=staged.reduce((n,p)=>n+parse(p.images_json).length,0);
 result.counts.unpricedImported=staged.filter(p=>p.price===null).length;
 result.counts.colorsNotSet=staged.reduce((n,p)=>n+parse(p.image_colors_json).filter(c=>!String(c||"").trim()).length,0);
 const same=srcSet.every(a=>{
   const b=dstMap.get(a.id);
   return b&&b.published===0&&b.title===a.title&&b.category===a.category&&
    b.category_label===a.category_label&&b.price===a.price&&
    JSON.stringify(parse(b.images_json))===JSON.stringify(parse(a.images_json))&&
    JSON.stringify(parse(b.image_colors_json))===JSON.stringify(parse(a.image_colors_json));
 });
 result.checks.exactRecordsEqualPreview=same?"PASS":"FAIL";
 const keys=new Set(staged.map(p=>p.sku));
 result.checks.allSkuUnique=keys.size===218?"PASS":"FAIL";
 const conditions=srcSet.length===218&&staged.length===218&&live.length===455&&
  result.counts.productionPublished===237&&result.counts.productionDrafts===218&&
  result.counts.previewImageReferences===921&&result.counts.productionImageReferences===921&&
  result.counts.categories===15&&same&&keys.size===218&&result.counts.colorsNotSet===0;
 result.checks.stagedProductData=conditions?"PASS":"FAIL";
 if(!conditions)result.issues.push("PRODUCTION_218_STAGE_NOT_EXACT");
 try{
  const response=await fetch("https://sindarealest2.pages.dev/",{redirect:"follow",signal:AbortSignal.timeout(20000)});
  result.checks.productionFrontendHTTP=response.status;
  if(response.ok){
    const html=await response.text();
    // PR #119 introduced a dynamic extra-category path. Fixed 8-category filters
    // silently hide some newly imported categories, so block public cutover.
    const dynamic=/Object\.keys\(counts\)\.filter\(c=>!categoryOrder\.includes\(c\)\)/.test(html)||
      /newly imported D1 categories/.test(html);
    result.checks.dynamicCategoryFilter=dynamic?"PASS":"NOT_DEPLOYED";
    if(!dynamic)result.issues.push("PRODUCTION_STOREFRONT_MISSING_DYNAMIC_CATEGORIES");
  }else{result.issues.push("PRODUCTION_STOREFRONT_NOT_READABLE");}
 }catch{result.issues.push("PRODUCTION_STOREFRONT_UNVERIFIED");}
 result.readyForPublicSwap=conditions&&result.checks.dynamicCategoryFilter==="PASS";
}catch(e){result.issues.push(String(e?.message||e).slice(0,120));}
console.log("CATALOG_POST_STAGE_READINESS="+JSON.stringify(result));
if(result.checks.stagedProductData!=="PASS")process.exitCode=1;
