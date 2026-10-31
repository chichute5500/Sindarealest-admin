/**
 * One-time guarded Preview D1 rollout for Admin audit revision.
 * The only remote mutations are the verified index, triggers and revision seed.
 * Uses strict binding checks, Time Travel bookmark, and exact result parity.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const PREVIEW="573ad702-05fc-405e-8ef3-0cf2e7fea98d";
const LIVE="f6c208a1-052a-445c-a3b7-a442783f9bd3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
assert.match(account,/^[a-f0-9]{32}$/i);
assert.ok(token,"Cloudflare token unavailable");
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function request(path,sql=null){
  const r=await fetch(base+path,{
    method:sql===null?"GET":"POST",
    headers:{Authorization:"Bearer "+token,...(sql===null?{}:{"Content-Type":"application/json"})},
    ...(sql===null?{}:{body:JSON.stringify({sql})}),
    signal:AbortSignal.timeout(45000)
  });
  if(!r.ok)throw Error("Cloudflare API HTTP "+r.status);
  const payload=await r.json();
  if(payload.success!==true)throw Error("Cloudflare API query failed");
  if(sql===null)return payload.result;
  const first=Array.isArray(payload.result)?payload.result[0]:payload.result;
  if(first?.success===false||!Array.isArray(first?.results))throw Error("Invalid D1 response");
  return first;
}
const [db,production,project]=await Promise.all([
  request("/d1/database/"+PREVIEW),request("/d1/database/"+LIVE),
  request("/pages/projects/sindarealest-admin-preview")
]);
assert.equal(db.name,"sindarealest-admin-preview-db");
assert.equal(db.uuid,PREVIEW);
assert.equal(db.version,"production");
assert.equal(production.name,"sindarealest-db");
assert.equal(production.uuid,LIVE);
assert.equal(project.name,"sindarealest-admin-preview");
assert.equal(project.deployment_configs?.preview?.d1_databases?.DB?.id,PREVIEW);
assert.notEqual(PREVIEW,LIVE);
const bookmark=await request("/d1/database/"+PREVIEW+"/time_travel/bookmark");
assert.match(bookmark?.bookmark||"",/^[a-z0-9-]{20,}$/i);
const path=resolve(root,"artifacts/d1-preview-audit");
mkdirSync(path,{recursive:true});
const state={database:"sindarealest-admin-preview-db",beforeBookmark:bookmark.bookmark,
  startedAt:new Date().toISOString(),schemaApplied:false};
const save=()=>writeFileSync(resolve(path,"checkpoint.json"),JSON.stringify(state,null,2)+"\n",{mode:0o600});
save();
const query=sql=>request("/d1/database/"+PREVIEW+"/query",sql);
const baselineSql="SELECT id,actor,action,entity_type,entity_id,details_json,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 200";
const before=await query(baselineSql);
state.beforeAuditRowsRead=before.meta?.rows_read??null;
state.auditRows=before.results.length;
save();
const file=readFileSync(resolve(root,"migrations/0017_admin_audit_revision.sql"),"utf8")
  .split("\n").filter(line=>!line.trimStart().startsWith("--")).join("\n").trim();
const statements=file.split(/;\s*(?=(?:CREATE\s+(?:INDEX|TRIGGER)|INSERT\s+OR\s+IGNORE)\b)/i)
  .map(x=>x.trim().replace(/;\s*$/,"")).filter(Boolean);
assert.equal(statements.length,5,"Only 1 index, 3 triggers, 1 seed are permitted");
assert.match(statements[0],/^CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_audit_created_id_desc\s+ON\s+audit_logs\s*\(/i);
for(const [i,action] of ["INSERT","UPDATE","DELETE"].entries()){
  const s=statements[i+1];
  assert.match(s,new RegExp("^CREATE\\s+TRIGGER\\s+IF\\s+NOT\\s+EXISTS\\s+trg_audit_logs_revision_"+action.toLowerCase()+"\\s+AFTER\\s+"+action+"\\s+ON\\s+audit_logs\\b","i"));
  assert.match(s,/UPDATE\s+settings[\s\S]*WHERE\s+key='audit_logs_revision'[\s\S]*END$/i);
}
assert.match(statements[4],/^INSERT\s+OR\s+IGNORE\s+INTO\s+settings\s*\(key,value,updated_at\)\s*VALUES\s*\('audit_logs_revision','0',datetime\('now'\)\)$/i);
// First install the index/triggers, then independently verify stored definitions.
for(let i=0;i<4;i++){
  await query(statements[i]);state.lastAppliedStep=i+1;save();
}
const items=(await query("SELECT name,sql FROM sqlite_master WHERE name IN ('idx_audit_created_id_desc','trg_audit_logs_revision_insert','trg_audit_logs_revision_update','trg_audit_logs_revision_delete')")).results;
const objects=new Map(items.map(x=>[x.name,String(x.sql||"")]));
assert.match(objects.get("idx_audit_created_id_desc")||"",/ON\s+audit_logs\s*\(\s*created_at\s+DESC\s*,\s*id\s+DESC\s*\)/i);
for(const action of ["insert","update","delete"]){
  const text=objects.get("trg_audit_logs_revision_"+action)||"";
  assert.match(text,new RegExp("AFTER\\s+"+action+"\\s+ON\\s+audit_logs","i"));
  assert.match(text,/WHERE\s+key='audit_logs_revision'/i);
}
// Only after all required triggers are verified may clients skip full reads.
await query(statements[4]);state.lastAppliedStep=5;save();
const rev=await query("SELECT value FROM settings WHERE key='audit_logs_revision' LIMIT 1");
assert.match(String(rev.results[0]?.value||""),/^\d{1,19}$/);
const after=await query(baselineSql);
assert.deepEqual(after.results,before.results,"Live Preview audit history changed during migration");
const plan=await query("EXPLAIN QUERY PLAN "+baselineSql);
state.queryPlan=plan.results.map(x=>String(x.detail||"")).join(" | ").slice(0,350);
assert.match(state.queryPlan,/idx_audit_created_id_desc/,"New audit index not selected");
state.afterAuditRowsRead=after.meta?.rows_read??null;
state.revisionRowsRead=rev.meta?.rows_read??null;
state.schemaApplied=true;
state.completedAt=new Date().toISOString();save();
console.log("PREVIEW D1 ONLY: audit ordering and values unchanged; triggers and index VERIFIED.");
console.log("Audit Rows Read: full before="+state.beforeAuditRowsRead+
  ", full after="+state.afterAuditRowsRead+", unchanged revision="+state.revisionRowsRead+
  ", returned logs="+state.auditRows);
console.log("Production/Main untouched. No business data logged.");
