/**
 * Guarded catalog cutover for ISOLATED Preview only.
 * Production D1 = SELECT only; no Production writes, Pages deployments, R2 edits,
 * order/customer access, or data copying. Preview R2 photos already staged.
 * First run SD_CATALOG_SYNC_MODE=preflight, then switch workflow to cutover
 * only if exact counts and cohort identities are proved.
 */
const report={operation:"PREVIEW_218_FOR_235_ONLY",mode:process.env.SD_CATALOG_SYNC_MODE||"",
  productionWrites:0,productionDeploys:0,previewR2Writes:0,previewR2Deletes:0,
  previewD1Writes:0,productDeletes:0,checks:{},counts:{},success:false};
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const mode=process.env.SD_CATALOG_SYNC_MODE;
const requireTrue=(v,message)=>{if(!v)throw Error(message)};
function cfId(binding){return binding?.id||binding?.database_id||""}
function r2Name(binding){return binding?.name||binding?.bucket_name||""}
async function api(path,body){
 const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(30000)
 });
 const obj=await response.json().catch(()=>null);
 requireTrue(response.ok&&obj?.success===true,"CLOUDFLARE_API_HTTP_"+response.status);
 return obj.result;
}
async function query(db,sql,params=[],writes=false){
 if(!writes)requireTrue(/^SELECT\s/i.test(sql)&&!sql.includes(";"),"NON_SELECT_BLOCKED");
 if(writes)requireTrue(db===previewDB&&/^UPDATE products SET published = CASE WHEN id IN \(/.test(sql)&&!sql.includes(";"),"PREVIEW_WRITE_NOT_ALLOWED");
 const result=await api("/d1/database/"+encodeURIComponent(db)+"/query",{sql,params});
 const q=Array.isArray(result)?result[0]:result;
 requireTrue(q?.success===true&&Array.isArray(q.results),"D1_QUERY_FAILURE");
 if(writes)report.previewD1Writes=1;
 return {rows:q.results,changes:q.meta?.changes??null};
}
const parseImages=s=>{try{const v=JSON.parse(s||"[]");return Array.isArray(v)?v:[]}catch{return []}};
let previewDB="";
try{
 requireTrue(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF==="refs/heads/integration/storefront-locked-on-main-2026-10-26"&&
  /^[0-9a-f]{40}$/i.test(process.env.GITHUB_SHA||"")&&
  /^[a-f0-9]{32}$/i.test(account)&&token&&
  (mode==="preflight"||mode==="cutover"),"REPOSITORY_OR_MODE_GUARD");
 const [preview,production]=await Promise.all([
  api("/pages/projects/sindarealest-admin-preview"),
  api("/pages/projects/sindarealest2")
 ]);
 const p=preview?.deployment_configs?.preview,prod=production?.deployment_configs?.production;
 previewDB=cfId(p?.d1_databases?.DB);
 const prodDB=cfId(prod?.d1_databases?.DB);
 const buckets=[r2Name(p?.r2_buckets?.IMAGES),r2Name(p?.r2_buckets?.ORIGINALS),
  r2Name(prod?.r2_buckets?.IMAGES),r2Name(prod?.r2_buckets?.ORIGINALS)];
 requireTrue(preview?.name==="sindarealest-admin-preview"&&production?.name==="sindarealest2"&&
  previewDB&&prodDB&&previewDB!==prodDB&&
  buckets.every(Boolean)&&new Set(buckets).size===4,"ISOLATED_D1_R2_IDENTITY_FAILED");
 report.checks.isolatedBindings="PASS";
 const stmt="SELECT id,slug,sku,sku_verified,title,category,category_label,description,price,stock,published,images_json,image_colors_json,source_price_confirmed,sort_order,fulfillment_type,created_at FROM products";
 const [pRows,prodRows]=await Promise.all([query(previewDB,stmt),query(prodDB,stmt)]);
 const a=pRows.rows,z=prodRows.rows;
 const prodNew=z.filter(x=>Number(x.published)===1);
 const expectedIds=new Set(prodNew.map(x=>x.id));
 const prevNew=a.filter(x=>expectedIds.has(x.id));
 const prevOld=a.filter(x=>!expectedIds.has(x.id));
 report.counts={
  productionRows:z.length,productionPublic:prodNew.length,
  previewRows:a.length,previewNew:prevNew.length,
  previewOld:prevOld.length,previewNewPublic:prevNew.filter(x=>Number(x.published)===1).length,
  previewOldPublic:prevOld.filter(x=>Number(x.published)===1).length,
  newCategories:new Set(prodNew.map(x=>x.category)).size,
  newImages:prodNew.reduce((n,x)=>n+parseImages(x.images_json).length,0)
 };
 const validProd=z.length===455&&prodNew.length===218&&z.filter(x=>Number(x.published)===0).length===237&&
  report.counts.newCategories===15&&report.counts.newImages===921&&expectedIds.size===218;
 requireTrue(validProd,"PRODUCTION_APPROVED_COHORT_CHANGED");
 requireTrue(a.length===453&&prevNew.length===218&&prevOld.length===235,"PREVIEW_EXPECTED_453_NOT_PROVEN");
 const identical=prevNew.every(p=>{
  const q=prodNew.find(x=>x.id===p.id);
  return q&&p.title===q.title&&p.category===q.category&&p.category_label===q.category_label&&
   p.price===q.price&&
   JSON.stringify(parseImages(p.images_json))===JSON.stringify(parseImages(q.images_json))&&
   JSON.stringify(parseImages(p.image_colors_json))===JSON.stringify(parseImages(q.image_colors_json));
 });
 requireTrue(identical,"PRODUCT_IDS_OR_MEDIA_DIFFER_FROM_APPROVED_PRODUCTION");
 report.checks.previewMatchesApprovedNewPublic="PASS";
 const already=report.counts.previewNewPublic===218&&report.counts.previewOldPublic===0;
 const original=report.counts.previewNewPublic===0&&report.counts.previewOldPublic===235;
 requireTrue(original||already,"PREVIEW_HAS_PARTIAL_OR_UNRELATED_CATALOG");
 report.checks.previewStartingState=already?"ALREADY_SYNCED":"OLD_235_PUBLISHED_NEW_218_DRAFT";
 if(mode==="cutover"&&!already){
  const marks=Array.from({length:218},()=>"?").join(",");
  const sql="UPDATE products SET published = CASE WHEN id IN ("+marks+") THEN 1 ELSE 0 END "+
   "WHERE (SELECT COUNT(*) FROM products)=453 AND (SELECT SUM(published) FROM products)=235 "+
   "AND published != CASE WHEN id IN ("+marks+") THEN 1 ELSE 0 END";
  const updated=await query(previewDB,sql,[...prodNew.map(x=>x.id),...prodNew.map(x=>x.id)],true);
  requireTrue(updated.changes===null||updated.changes===453,"PREVIEW_CUTOVER_ROWCOUNT_FAILED");
 }
 const check=await query(previewDB,
  "SELECT id,category,published,images_json FROM products");
 const rows=check.rows;
 const live=rows.filter(x=>Number(x.published)===1);
 const good=live.length===218&&live.every(x=>expectedIds.has(x.id))&&
  rows.filter(x=>!expectedIds.has(x.id)).every(x=>Number(x.published)===0)&&
  new Set(live.map(x=>x.category)).size===15&&
  live.reduce((n,x)=>n+parseImages(x.images_json).length,0)===921;
 if(mode==="cutover")requireTrue(good,"PREVIEW_POST_CUTOVER_VERIFICATION_FAILED");
 else requireTrue(original||already,"PREVIEW_PREFLIGHT_FAILED");
 report.checks.result=mode==="cutover"?(good?"PASS":"FAIL"):"READ_ONLY_PASS";
 report.success=true;
}catch(error){report.error=String(error?.message||error).slice(0,190)}
console.log("ISOLATED_PREVIEW_CATALOG_SYNC="+JSON.stringify(report));
if(!report.success)process.exitCode=1;
