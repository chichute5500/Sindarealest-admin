/**
 * Read-only Preview D1 measurements of the live Admin polling queries.
 * Never prints/stores any order, customer or audit-log row or raw SQL.
 */
import assert from "node:assert/strict";
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const PREVIEW="573ad702-05fc-405e-8ef3-0cf2e7fea98d";
const PRODUCTION="f6c208a1-052a-445c-a3b7-a442783f9bd3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
assert.match(account,/^[0-9a-f]{32}$/i);
assert.ok(token);
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function request(path,statement=null){
  if(statement!==null && !/^(?:SELECT |WITH recent_orders AS)/i.test(statement))
    throw Error("Only approved read-only SELECT queries permitted");
  const res=await fetch(base+path,{
    method:statement===null?"GET":"POST",
    headers:{Authorization:"Bearer "+token,...(statement===null?{}:{"Content-Type":"application/json"})},
    ...(statement===null?{}:{body:JSON.stringify({sql:statement})}),
    signal:AbortSignal.timeout(45000)
  });
  if(!res.ok)throw Error("Cloudflare D1 API HTTP "+res.status);
  const data=await res.json();
  if(data.success!==true)throw Error("D1 API failed");
  const value=data.result;
  if(statement===null)return value;
  const first=Array.isArray(value)?value[0]:value;
  if(first?.success===false || !Array.isArray(first?.results))
    throw Error("D1 SQL result invalid");
  const rowsRead=Number(first.meta?.rows_read);
  if(!Number.isFinite(rowsRead)||rowsRead<0)
    throw Error("Missing D1 actual rows_read");
  return {rowsRead,resultCount:first.results.length};
}
const [db,live,pages]=await Promise.all([
  request("/d1/database/"+PREVIEW),request("/d1/database/"+PRODUCTION),
  request("/pages/projects/sindarealest-admin-preview")
]);
assert.equal(db.name,"sindarealest-admin-preview-db");
assert.equal(db.uuid,PREVIEW);
assert.equal(live.name,"sindarealest-db");
assert.equal(live.uuid,PRODUCTION);
assert.equal(pages.deployment_configs?.preview?.d1_databases?.DB?.id,PREVIEW);

const source=readFileSync(resolve(root,"functions/api/admin/orders.js"),"utf8");
const chunk=source.split("const result = await context.env.DB.prepare(\n")[1]?.split("\n    ).all();")[0];
assert.ok(chunk,"Order endpoint SQL could not be extracted");
const orderSql=chunk.split("\n").map(x=>x.trim()).filter(x=>x.startsWith('"')).map(x=>{
  const m=x.match(/^("(?:[^"\\]|\\.)*")\s*\+?\s*$/);
  if(!m)throw Error("Unexpected Admin order SQL fragment");
  return JSON.parse(m[1]);
}).join("");
assert.match(orderSql,/^WITH recent_orders AS/);
assert.match(orderSql,/LEFT JOIN order_items/);
const checks=[
  ["admin_orders",orderSql],
  ["admin_audit_logs","SELECT id,actor,action,entity_type,entity_id,details_json,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 200"],
  ["admin_products_full","SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000"],
  ["admin_products_revision","SELECT value FROM settings WHERE key = 'products_revision' LIMIT 1"]
];
const metrics={generatedAt:new Date().toISOString(),database:"sindarealest-admin-preview-db",
  sourceSha:process.env.GITHUB_SHA||"unknown",mode:"read-only",queries:{}};
for(const [label,query] of checks){
  const stats=await request("/d1/database/"+PREVIEW+"/query",query);
  metrics.queries[label]=stats;
  console.log(label+": rows_read="+stats.rowsRead+"; resultRows="+stats.resultCount);
}
const dest=resolve(root,"artifacts/d1-preview-polling");
mkdirSync(dest,{recursive:true});
writeFileSync(resolve(dest,"metrics.json"),JSON.stringify(metrics,null,2)+"\n",{mode:0o600});
console.log("Only aggregate metrics recorded. No D1 schema writes, business writes, or Production changes.");
