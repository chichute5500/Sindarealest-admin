// One-time Owner-approved Production D1 migration. Never invoked from routine deploy.
// Runs exclusively in the guarded GitHub Actions job; creates a Time Travel
// restore bookmark BEFORE modifying production schema. Never logs customer data.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync,readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo="chichute5500/Sindarealest-admin";
const branch="feat/storefront-payment-cod-sync-20261101";
const migration="0018_payment_delivery_settlement.sql";
assert.equal(process.env.GITHUB_REPOSITORY,repo,"Repository mismatch");
assert.equal(process.env.GITHUB_REF,"refs/heads/"+branch,"Branch mismatch");
assert.equal(process.env.GITHUB_ACTIONS,"true","Only GitHub Actions may migrate Production");
assert.match(process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE||"",/\[production-migration-0018-approved\]/,"Missing one-time approval marker");
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
assert.match(account,/^[a-f0-9]{32}$/i,"Cloudflare account not verified");
assert.ok(token.length>=10,"Cloudflare token absent");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function cf(path,method="GET",body){
 const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000),redirect:"error"});
 if(!response.ok)throw Error("Cloudflare API failed: HTTP "+response.status);
 const obj=await response.json();
 if(obj?.success!==true)throw Error("Cloudflare API verification failed");
 return obj.result;
}
const [production,preview]=await Promise.all([
 cf("/pages/projects/sindarealest2"),cf("/pages/projects/sindarealest-admin-preview")
]);
assert.equal(production?.name,"sindarealest2");
assert.equal(production?.production_branch,"main");
assert.equal(preview?.name,"sindarealest-admin-preview");
const idOf=x=>x?.id||x?.database_id||"";
const productionId=idOf(production?.deployment_configs?.production?.d1_databases?.DB);
const previewId=idOf(preview?.deployment_configs?.preview?.d1_databases?.DB);
assert.match(productionId,/^[a-f0-9-]{36}$/i,"Production D1 binding missing");
assert.match(previewId,/^[a-f0-9-]{36}$/i,"Preview D1 binding missing");
assert.notEqual(productionId.toLowerCase(),previewId.toLowerCase(),"Preview and Production D1 must be distinct");
const database=await cf("/d1/database/"+encodeURIComponent(productionId));
assert.equal(database?.name,"sindarealest-db","Wrong Production D1 database name");
const query=async sql=>{
 assert.match(sql,/^SELECT\b/i,"Read-only query only");
 const results=await cf("/d1/database/"+encodeURIComponent(productionId)+"/query","POST",{sql});
 assert.ok(Array.isArray(results)&&Array.isArray(results[0]?.results),"Unexpected D1 query result");
 return results[0].results;
};
const check=async()=>({
 column:(await query("SELECT name FROM pragma_table_info('orders') WHERE name='delivery_status'")).length===1,
 table:(await query("SELECT name FROM sqlite_master WHERE type='table' AND name='order_cod_settlements'")).length===1,
 migration:(await query("SELECT name FROM d1_migrations WHERE name='0018_payment_delivery_settlement.sql'")).length===1
});
const before=await check();
console.log("PROD_0018_PREFLIGHT",JSON.stringify(before));
if(before.column||before.table||before.migration){
 assert.ok(before.column&&before.table&&before.migration,"Partial Production D1 migration detected; refusing write");
 console.log("PROD_0018_ALREADY_APPLIED: PASS; no D1 write performed");
 process.exit(0);
}
const orderCount=Number((await query("SELECT COUNT(*) AS n FROM orders"))[0]?.n);
const warrantyCount=Number((await query("SELECT COUNT(*) AS n FROM warranties"))[0]?.n);
assert.ok(Number.isSafeInteger(orderCount)&&orderCount>=0);
assert.ok(Number.isSafeInteger(warrantyCount)&&warrantyCount>=0);
const sql=readFileSync(new URL("../migrations/"+migration,import.meta.url),"utf8");
assert.ok(sql.includes("ALTER TABLE orders ADD COLUMN delivery_status")&&sql.includes("CREATE TABLE order_cod_settlements"),"Migration file mismatch");
const dir=mkdtempSync(join(tmpdir(),"sd-production-0018-"));
try{
 mkdirSync(join(dir,"migrations"));
 copyFileSync(new URL("../migrations/"+migration,import.meta.url),join(dir,"migrations",migration));
 const config=join(dir,"wrangler.toml");
 writeFileSync(config,[
 'name = "sindarealest-production-0018-approved"',
 'compatibility_date = "2026-10-12"',
 '[[d1_databases]]','binding = "DB"',
 'database_name = "sindarealest-db"',
 'database_id = '+JSON.stringify(productionId),
 'migrations_dir = "./migrations"'
 ].join("\n")+"\n",{mode:0o600});
 const wrangler=join(process.cwd(),"node_modules/wrangler/bin/wrangler.js");
 function run(args,label,timeout=120000){
  const command=spawnSync(process.execPath,[wrangler,...args],{
   env:process.env,encoding:"utf8",timeout,maxBuffer:5*1024*1024});
  if(command.error||command.status!==0)
   throw Error(label+" failed: "+String(command.stderr||command.error?.message||command.stdout||"").slice(-450));
  return String(command.stdout||"")+"\n"+String(command.stderr||"");
 }
 // Cloudflare Time Travel bookmarks are automatically retained for 30 days.
 // Capture the exact pre-change restore bookmark before any D1 mutation.
 const backup=run(["d1","time-travel","info","sindarealest-db","--config",config],"Production Time Travel backup info");
 const bookmark=backup.match(/\b[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8,}\b/i)?.[0];
 assert.ok(bookmark,"Cannot verify Time Travel restore bookmark; refusing migration");
 console.log("PROD_D1_BACKUP_BOOKMARK",bookmark);
 console.log("PROD_D1_BACKUP_UTC",new Date().toISOString());
 // This Wrangler migration applies ONLY file 0018 via the pinned temporary
 // production D1 config and records it in d1_migrations.
 run(["d1","migrations","apply","sindarealest-db","--remote","--config",config],"Apply approved migration 0018",180000);
 const after=await check();
 assert.ok(after.column&&after.table&&after.migration,"Production schema 0018 post-check failed");
 const afterOrders=Number((await query("SELECT COUNT(*) AS n FROM orders"))[0]?.n);
 const afterWarranties=Number((await query("SELECT COUNT(*) AS n FROM warranties"))[0]?.n);
 assert.ok(afterOrders>=orderCount,"Order count unexpectedly decreased");
 assert.ok(afterWarranties>=warrantyCount,"Warranty count unexpectedly decreased");
 const validity=await query("SELECT COUNT(*) AS n FROM orders WHERE delivery_status NOT IN ('not_shipped','in_transit','delivered','failed_returning','returned')");
 assert.equal(Number(validity[0]?.n),0,"Invalid delivery status after migration");
 const index=await query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_order_cod_settlements_order'");
 assert.equal(index.length,1,"COD index missing after migration");
 console.log("PROD_0018_MIGRATION_PASS",JSON.stringify({
  project:production.name,database:database.name,column:after.column,table:after.table,
  recorded:after.migration,index:true,ordersBefore:orderCount,ordersAfter:afterOrders,
  warrantiesBefore:warrantyCount,warrantiesAfter:afterWarranties,backupBookmark:bookmark
 }));
}finally{rmSync(dir,{recursive:true,force:true});}
