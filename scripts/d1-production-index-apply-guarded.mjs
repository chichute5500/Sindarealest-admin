/**
 * One-time Production-only index deployment gated by live binding checks,
 * Time Travel checkpoint, and old/new SQL parity. Production schema-index DDL only; no application deployment or business-row writes.
 * Can rerun safely: all DDL uses CREATE INDEX IF NOT EXISTS.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PREVIEW_ID="573ad702-05fc-405e-8ef3-0cf2e7fea98d";
const PRODUCTION_ID="f6c208a1-052a-445c-a3b7-a442783f9bd3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
if(!/^[a-f0-9]{32}$/.test(account)||!token)
  throw Error("Missing or malformed Cloudflare credentials");
assert.notEqual(PREVIEW_ID,PRODUCTION_ID);
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
const request=async(path,sql)=>{
  const r=await fetch(base+path,{method:sql?"POST":"GET",headers:{
    Authorization:"Bearer "+token,...(sql?{"Content-Type":"application/json"}:{})
  },...(sql?{body:JSON.stringify({sql})}:{}),signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error("Cloudflare API HTTP "+r.status+" at preapproved D1 endpoint");
  const data=await r.json();
  if(data.success!==true)throw Error("Cloudflare API failed: "+String(data.errors?.[0]?.message||"unknown").slice(0,170));
  return data.result;
};
const dbInfo=async id=>request("/d1/database/"+id);
const dbQuery=async sql=>{
  if(typeof sql!=="string" || !sql.trim())throw Error("Empty SQL");
  const ans=await request("/d1/database/"+PRODUCTION_ID+"/query",sql);
  const first=Array.isArray(ans)?ans[0]:ans;
  if(first?.success===false || !Array.isArray(first?.results))
    throw Error("Production D1 query produced an invalid result");
  return first;
};
const preview=await dbInfo(PREVIEW_ID),production=await dbInfo(PRODUCTION_ID);
assert.equal(preview.name,"sindarealest-admin-preview-db");
assert.equal(preview.uuid,PREVIEW_ID);
assert.equal(production.name,"sindarealest-db");
assert.equal(production.uuid,PRODUCTION_ID);
if(production.version!=="production")throw Error("Production D1 Time Travel backend unverified");
const [adminProject,liveProject]=await Promise.all([
  request("/pages/projects/sindarealest-admin-preview"),
  request("/pages/projects/sindarealest2")
]);
assert.equal(adminProject.name,"sindarealest-admin-preview");
assert.equal(liveProject.name,"sindarealest2");
assert.equal(adminProject.production_branch,"main");
assert.equal(liveProject.production_branch,"main");
const findDb=(project,environment)=>String(project?.deployment_configs?.[environment]?.d1_databases?.DB?.id||"");
assert.equal(findDb(adminProject,"preview"),PREVIEW_ID,"Preview project D1 binding mismatch");
assert.equal(findDb(liveProject,"production"),PRODUCTION_ID,"Production project D1 binding mismatch");
assert.notEqual(findDb(adminProject,"preview"),findDb(liveProject,"production"));
const previewQuery=await request("/d1/database/"+PREVIEW_ID+"/query",
  "PRAGMA index_list('audit_logs');");
const verifiedPreview=Array.isArray(previewQuery)?previewQuery[0]:previewQuery;
if(!verifiedPreview?.results?.some(x=>x.name==="idx_audit_entity_action_created"))
  throw Error("Preview must have passed audit index migration before Production can proceed");
const b=await request("/d1/database/"+PRODUCTION_ID+"/time_travel/bookmark");
assert.match(b?.bookmark||"",/^[0-9a-f-]{20,}$/i,"Missing rollback bookmark");
const checkpoint={database:"sindarealest-db",beforeBookmark:b.bookmark,
  startedAt:new Date().toISOString(),changed:false};
const artifact=resolve(root,"artifacts","d1-production-index");
mkdirSync(artifact,{recursive:true});
const writeCheckpoint=()=>writeFileSync(resolve(artifact,"checkpoint.json"),
  JSON.stringify(checkpoint,null,2)+"\n",{mode:0o600});
writeCheckpoint();
// SQL from main is kept as an immutable fixture; never interpolate user data.
const baseline=readFileSync(resolve(root,"tests/fixtures/d1-admin-orders-original.sql"),"utf8")
  .replace(/^--.*$/gm,"").trim();
const source=readFileSync(resolve(root,"functions/api/admin/orders.js"),"utf8");
const chunk=source.split("const result = await context.env.DB.prepare(\n")[1]?.split("\n    ).all();")[0];
if(!chunk)throw Error("Unable to extract exact optimized SQL");
const fragments=chunk.split("\n").map(x=>x.trim()).filter(x=>x.startsWith('"')).map(x=>{
  const m=x.match(/^("(?:[^"\\]|\\.)*")\s*\+?\s*$/);
  if(!m)throw Error("Unexpected SQL JavaScript fragment");
  return JSON.parse(m[1]);
});
const optimized=fragments.join("");
if(!baseline.includes("WITH recent_orders AS")||!optimized.startsWith("WITH recent_orders AS")||
   !baseline.includes("LEFT JOIN order_items")||!optimized.includes("LEFT JOIN order_items"))
  throw Error("Order SQL identity check failed");
const rowsQuery=async(sql,tag)=>{
  if(!/^(WITH recent_orders AS|\s*WITH recent_orders AS)/i.test(sql.trim()))throw Error("Unexpected SQL query");
  const ans=await dbQuery(sql);
  const rows=ans.results;
  if(rows.length>5000)throw Error(tag+" result unexpectedly large; abort");
  return {rows,rowsRead:Number(ans.meta?.rows_read)||0};
};
const pre=await rowsQuery(baseline,"original_before_index");
checkpoint.baselineRowsRead=pre.rowsRead;
checkpoint.baselineResultRows=pre.rows.length;
writeCheckpoint();
console.log("Production pre-index baseline: rowsRead="+pre.rowsRead+"; resultRows="+pre.rows.length+
  "; no customer data printed");
const migration=readFileSync(resolve(root,"migrations/0015_d1_rows_read_indexes.sql"),"utf8")
  .replace(/^\s*--.*$/gm,"");
const statements=migration.split(";").map(x=>x.trim()).filter(Boolean);
const expected=[
 "idx_audit_entity_action_created",
 "idx_products_published_created",
 "idx_products_published_type_created",
 "idx_products_lower_slug",
 "idx_products_lower_id",
 "idx_products_upper_sku",
 "idx_order_items_order"
];
assert.equal(statements.length,expected.length,"Migration must have exactly 7 index statements");
statements.forEach((s,i)=>{
  if(!new RegExp("^CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+"+expected[i]+"\\s+ON\\s+(audit_logs|products|order_items)\\s*\\(","i").test(s))
    throw Error("Unexpected DDL; refusing to execute statement "+(i+1));
  if(/\b(DROP|ALTER|DELETE|INSERT|UPDATE|TRIGGER|REPLACE)\b/i.test(s))
    throw Error("Unexpected DDL verb");
});
for(let i=0;i<statements.length;i++){
  await dbQuery(statements[i]);
  checkpoint.changed=true;
  checkpoint.executedIndexes=expected.slice(0,i+1);
  writeCheckpoint();
}
const names=async table=>(await dbQuery("PRAGMA index_list('"+table+"')")).results.map(x=>x.name);
const actual=new Set([...(await names("audit_logs")),...(await names("products")),...(await names("order_items"))]);
for(const name of expected)assert.ok(actual.has(name),"Missing new Preview index "+name);
const plan=(await dbQuery("EXPLAIN QUERY PLAN SELECT id FROM audit_logs WHERE entity_type='order' AND entity_id='qa-no-order' AND action='order_created' ORDER BY created_at DESC LIMIT 1")).results;
const details=plan.map(x=>String(x.detail||"")).join(" | ");
assert.match(details,/idx_audit_entity_action_created/);
const afterBaseline=await rowsQuery(baseline,"original_after_index");
const afterOptimized=await rowsQuery(optimized,"optimized_after_index");
assert.deepEqual(afterOptimized.rows,afterBaseline.rows,
  "Live Preview SQL parity mismatch: columns, values or row order changed");
// Live customers may legitimately place orders during Production migration.
// Always require same-time original/optimized equality; do not reject valid new
// orders solely because the pre-index and post-index snapshots differ.
checkpoint.concurrentOrderActivity=JSON.stringify(afterOptimized.rows)!==JSON.stringify(pre.rows);
if(checkpoint.concurrentOrderActivity)
  console.log("Note: live order data changed during rollout; new and old SQL still match on the post-index snapshot.");
checkpoint.completedAt=new Date().toISOString();
checkpoint.resultParity=true;
checkpoint.originalAfterRowsRead=afterBaseline.rowsRead;
checkpoint.optimizedAfterRowsRead=afterOptimized.rowsRead;
checkpoint.newAuditLookupPlan=details;
writeCheckpoint();
console.log("Production ONLY: all 7 indexes VERIFIED. Live old/new order results identical.");
console.log("Rows read: original pre-index="+pre.rowsRead+
  "; original post-index="+afterBaseline.rowsRead+
  "; optimized post-index="+afterOptimized.rowsRead);
console.log("Audit index plan: "+details.slice(0,180));
console.log("Preview D1 was IDENTIFIED and read-only checked; NEVER written. No Main merge or website deployment.");
