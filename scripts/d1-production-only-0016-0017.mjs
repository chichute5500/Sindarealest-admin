/* Owner-approved production D1 migration. Backup before writes; never log client data. */
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,statSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
const production="sindarealest-db",site="sindarealest2",previewSite="sindarealest-admin-preview";
export function assertProductionIdentity(live,preview,meta){
 assert.equal(live?.name,site,"Wrong Production Pages project");
 assert.equal(live?.production_branch,"main","Production branch not main");
 assert.equal(preview?.name,previewSite,"Wrong Preview project");
 assert.ok(live?.id&&preview?.id&&live.id!==preview.id,"Pages projects not isolated");
 const id=live.deployment_configs?.production?.d1_databases?.DB?.id;
 const previewId=preview.deployment_configs?.preview?.d1_databases?.DB?.id;
 assert.match(id||"",/^[a-f0-9-]{36}$/i,"Missing live DB ID");
 assert.match(previewId||"",/^[a-f0-9-]{36}$/i,"Missing Preview DB ID");
 assert.notEqual(id,previewId,"Production DB matches Preview DB");
 assert.equal(meta?.uuid||meta?.id,id,"Live D1 metadata ID mismatch");
 assert.equal(meta?.name,production,"Live database name mismatch");
 return {id,name:production};
}
async function main(){
 assert.equal(process.env.GITHUB_REF,"refs/heads/release/d1-revision-only-2026-11-01","Wrong release branch");
 assert.equal(process.env.GITHUB_EVENT_NAME,"push","Wrong event");
 assert.match(process.env.GITHUB_SHA||"",/^[0-9a-f]{40}$/i,"No GitHub SHA");
 const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
 assert.match(account,/^[a-f0-9]{32}$/i,"Invalid account");
 assert.ok(token,"Cloudflare token required");
 const base="https://api.cloudflare.com/client/v4/accounts/"+account;
 async function cf(path){
  const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
  assert.ok(r.ok,"Cloudflare read-only preflight HTTP "+r.status);
  const j=await r.json();assert.equal(j?.success,true,"Cloudflare preflight error");return j.result;
 }
 const [live,preview]=await Promise.all([cf("/pages/projects/"+site),cf("/pages/projects/"+previewSite)]);
 const id=live.deployment_configs?.production?.d1_databases?.DB?.id;
 assert.match(id||"",/^[a-f0-9-]{36}$/i,"No production Pages DB binding");
 const target=assertProductionIdentity(live,preview,await cf("/d1/database/"+id));
 const dir=mkdtempSync(join(tmpdir(),"sd-prod-d1-"));
 const config=join(dir,"wrangler.toml"),backup=join(dir,"backup-before-0016-0017.sql");
 writeFileSync(config,['name = "sd-prod-d1-reviewed"','compatibility_date = "2026-10-12"','[[d1_databases]]','binding = "DB"', 'database_name = "'+target.name+'"','database_id = "'+target.id+'"'].join("\n"),{mode:0o600});
 const bin=resolve("node_modules/wrangler/bin/wrangler.js");
 function run(args,label,timeout=120000){
  const p=spawnSync(process.execPath,[bin,"d1",...args,"--config",config],{encoding:"utf8",timeout,maxBuffer:8*1024*1024,env:{...process.env,CLOUDFLARE_SEND_METRICS:"false"}});
  if(p.error||p.status!==0)throw Error(label+" failed: "+String(p.error?.message||p.stderr||p.status).slice(0,400));
  return p.stdout;
 }
 function sql(command,label){
  const out=run(["execute",target.name,"--remote","--yes","--json","--command",command],label);
  let v;try{v=JSON.parse(out)}catch{throw Error(label+" returned no JSON");}
  const xs=Array.isArray(v)?v:[v];
  assert.ok(!xs.some(x=>x?.success===false),label+" SQL error");
  return xs.flatMap(x=>Array.isArray(x?.results)?x.results:[]);
 }
 const snapshotQuery="SELECT (SELECT COUNT(*) FROM products) AS p,(SELECT COUNT(*) FROM audit_logs) AS a,(SELECT COUNT(*) FROM orders) AS o,(SELECT COUNT(*) FROM customers) AS c,(SELECT COUNT(*) FROM order_payment_transactions) AS t";
 try{
  const indexes=sql("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_audit_entity_action_created','idx_products_published_created','idx_products_published_type_created','idx_products_lower_slug','idx_products_lower_id','idx_products_upper_sku','idx_order_items_order')","Existing 0015 indexes");
  assert.equal(indexes.length,7,"0015 index set not complete");
  const countsBefore=sql(snapshotQuery,"Before business row counts")[0];
  assert.ok(countsBefore&&Number.isInteger(countsBefore.p)&&Number.isInteger(countsBefore.a),"Business tables missing");
  const bookmark=String((await cf("/d1/database/"+target.id+"/time_travel/bookmark"))?.bookmark||"");
  assert.ok(bookmark.length>12,"No Time Travel recovery bookmark");
  run(["export",target.name,"--remote","--yes","--output",backup],"Private full SQL backup",180000);
  assert.ok(statSync(backup).size>1024,"Backup export empty");
  console.log("PASS: Production Time Travel bookmark and private SQL export captured; no records logged.");
  for(const name of ["0016_admin_products_revision.sql","0017_admin_audit_revision.sql"]){
   const file=resolve("migrations",name);
   assert.match(readFileSync(file,"utf8"),/CREATE TRIGGER IF NOT EXISTS/,"Bad migration source");
   run(["execute",target.name,"--remote","--yes","--file",file],"Apply "+name,150000);
   console.log("Applied on Production D1: "+name);
  }
  const objects=sql("SELECT name FROM sqlite_master WHERE (type='index' AND name IN ('idx_products_sort_sku','idx_audit_created_id_desc')) OR (type='trigger' AND (name LIKE 'trg_products_revision_%' OR name LIKE 'trg_audit_logs_revision_%')) ORDER BY name","Verify revision schema").map(x=>x.name).sort();
  const names=["idx_products_sort_sku","idx_audit_created_id_desc","trg_products_revision_insert","trg_products_revision_update","trg_products_revision_delete","trg_audit_logs_revision_insert","trg_audit_logs_revision_update","trg_audit_logs_revision_delete"].sort();
  assert.deepEqual(objects,names,"Incomplete D1 revision schema");
  const markers=sql("SELECT key,value FROM settings WHERE key IN ('products_revision','audit_logs_revision') ORDER BY key","Verify revision settings");
  assert.deepEqual(markers.map(x=>x.key).sort(),["audit_logs_revision","products_revision"]);
  assert.ok(markers.every(x=>/^\d+$/.test(String(x.value))),"Invalid revision counter");
  assert.deepEqual(sql(snapshotQuery,"After business row counts")[0],countsBefore,"Business row counts differ; stop rollout");
  console.log("PASS: Production D1 0016/0017 applied. 2 indexes, 6 triggers, 2 revisions. Business counts unchanged.");
  if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,
    "\n### Production D1 0016/0017 PASS\nBackup: private runner SQL export + Cloudflare Time Travel bookmark "+bookmark+"\nSchema/markers verified, records unchanged. Main production Pages code is deployed separately.\n",{flag:"a"});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(e=>{console.error("PRODUCTION D1 MIGRATION BLOCKED/FAILED:",e.message);process.exitCode=1;});
