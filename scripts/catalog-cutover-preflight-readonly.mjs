/**
 * Owner catalog replacement preflight -- Cloudflare metadata and SELECT ONLY.
 * No downloads of customer/order data; aggregate counts only.
 * No DB/R2 writes, no deploy, no product changes.
 */
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const expectedRef="refs/heads/audit/import-218-921-readonly-2026-10-26";
const findings=[],output={scope:"CATALOG_CUTOVER_PREFLIGHT_READ_ONLY",writes:0,deployments:0,checks:{},source:{},target:{},risks:findings};
function ensure(x,s){if(!x)throw Error(s);}
function id(x){return x?.id||x?.database_id||"";}
function bucket(x){return x?.name||x?.bucket_name||"";}
async function cf(path,init={}){
 const res=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
   method:init.method||"GET",headers:{"Authorization":"Bearer "+token,...init.headers},
   body:init.body,redirect:"error",signal:AbortSignal.timeout(30000)
 });
 const json=await res.json().catch(()=>null);
 ensure(res.ok&&json?.success,"CLOUDFLARE_REQUEST_FAILED_HTTP_"+res.status);
 return json.result;
}
async function select(db,sql){
 // Cloudflare D1 uses POST as a query transport, but SQL is strictly SELECT.
 ensure(/^\s*SELECT\s/i.test(sql)&&!/(?:;|--|\/\*|\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA|ATTACH|DETACH)\b)/i.test(sql),"NON_SELECT_SQL_PROHIBITED");
 const data=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sql})
 });
 const r=Array.isArray(data)?data[0]:data;
 ensure(r?.success&&Array.isArray(r.results),"QUERY_RESULT_MISSING");
 return r.results;
}
try{
 ensure(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
   process.env.GITHUB_REF===expectedRef&&/^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||"")&&
   /^[a-f0-9]{32}$/i.test(account)&&Boolean(token),"PREFLIGHT_ENV_GUARD");
 const [pv,pr]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")
 ]);
 const preview=pv?.deployment_configs?.preview,prod=pr?.deployment_configs?.production;
 const previewDb=id(preview?.d1_databases?.DB),prodDb=id(prod?.d1_databases?.DB);
 const previewBuckets=[bucket(preview?.r2_buckets?.IMAGES),bucket(preview?.r2_buckets?.ORIGINALS)];
 const productionBuckets=[bucket(prod?.r2_buckets?.IMAGES),bucket(prod?.r2_buckets?.ORIGINALS)];
 ensure(pv?.name==="sindarealest-admin-preview"&&pr?.name==="sindarealest2"&&
  previewDb&&prodDb&&previewDb!==prodDb&&
  previewBuckets.every(Boolean)&&productionBuckets.every(Boolean)&&
  new Set([...previewBuckets,...productionBuckets]).size===4,
  "PROJECT_OR_STORAGE_ISOLATION_NOT_PROVEN");
 output.checks.projectIsolation="PASS";
 const [previewCount,productionCount,productionSchema,orderStat,productionImages]=await Promise.all([
  select(previewDb,"SELECT COUNT(*) AS total, SUM(CASE WHEN published=0 THEN 1 ELSE 0 END) AS drafts FROM products"),
  select(prodDb,"SELECT COUNT(*) AS total, SUM(CASE WHEN published=1 THEN 1 ELSE 0 END) AS public, SUM(CASE WHEN published=0 THEN 1 ELSE 0 END) AS drafts FROM products"),
  select(prodDb,"SELECT name FROM pragma_table_info('products')"),
  select(prodDb,"SELECT COUNT(*) AS orderItems, COUNT(DISTINCT product_id) AS distinctOrderedProducts FROM order_items"),
  select(prodDb,"SELECT COUNT(*) AS linkedOrders FROM order_items WHERE product_id IN (SELECT id FROM products)")
 ]);
 output.source={total:Number(previewCount[0]?.total),drafts:Number(previewCount[0]?.drafts)};
 output.target={products:Number(productionCount[0]?.total),published:Number(productionCount[0]?.public),
  drafts:Number(productionCount[0]?.drafts),orderItems:Number(orderStat[0]?.orderItems),
  distinctOrderedProducts:Number(orderStat[0]?.distinctOrderedProducts),
  orderItemsReferringToCurrentCatalog:Number(productionImages[0]?.linkedOrders)};
 const columns=new Set(productionSchema.map(x=>x.name));
 output.checks.productionSchemaColumns={
   imageColors:columns.has("image_colors_json"),
   skuVerified:columns.has("sku_verified"),
   fulfillmentType:columns.has("fulfillment_type"),
   sourcePriceConfirmed:columns.has("source_price_confirmed")
 };
 if(output.source.drafts!==218)findings.push("PREVIEW_DRAFT_COUNT_NOT_218");
 if(!output.checks.productionSchemaColumns.imageColors)findings.push("PRODUCTION_IMAGE_COLORS_MIGRATION_REQUIRED");
 if(!output.checks.productionSchemaColumns.skuVerified||!output.checks.productionSchemaColumns.fulfillmentType)findings.push("PRODUCTION_SCHEMA_NOT_READY");
 if(output.target.orderItemsReferringToCurrentCatalog>0)findings.push("OLD_CATALOG_IS_REFERENCED_BY_ORDER_HISTORY_ARCHIVE_REQUIRED");
 if(output.target.drafts>0)findings.push("OTHER_PRODUCTION_DRAFTS_MUST_NOT_BE_INADVERTENTLY_DELETED");
 output.passedPreflight=output.source.drafts===218 &&
  output.checks.productionSchemaColumns.imageColors &&
  output.checks.productionSchemaColumns.skuVerified &&
  output.checks.productionSchemaColumns.fulfillmentType;
}catch(error){output.error=String(error?.message||error).slice(0,200);output.passedPreflight=false;}
console.log("CATALOG_CUTOVER_PREFLIGHT="+JSON.stringify(output));
if(output.error)process.exitCode=1;
