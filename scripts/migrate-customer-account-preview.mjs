// Apply only additive customer account tables to independently verified PREVIEW D1.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const branch="feat/zalo-customer-login-2026-10-29";
if(process.env.GITHUB_REF!=="refs/heads/"+branch||process.env.GITHUB_REF_TYPE!=="branch")
 throw Error("Must be the isolated auth Preview branch");
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
if(!/^[a-f0-9]{32}$/.test(account)||token.length<10)throw Error("Missing Cloudflare CI credentials");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function cf(path,method="GET",data){
 const r=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  ...(data?{body:JSON.stringify(data)}:{}),redirect:"manual",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare safety check HTTP "+r.status);
 const json=await r.json();
 if(json.success!==true)throw Error("Cloudflare safety check failed");
 return json.result;
}
const [preview,prod]=await Promise.all([cf("/pages/projects/sindarealest-admin-preview"),cf("/pages/projects/sindarealest2")]);
assert.equal(preview.name,"sindarealest-admin-preview");
assert.equal(prod.name,"sindarealest2");
assert.notEqual(preview.id,prod.id);
assert.notEqual(preview.production_branch,branch);
const id=preview.deployment_configs?.preview?.d1_databases?.DB?.id;
const productionId=prod.deployment_configs?.production?.d1_databases?.DB?.id;
if(!/^[a-f0-9-]{36}$/i.test(id||"")||!/^[a-f0-9-]{36}$/i.test(productionId||"")||
 id.toLowerCase()===productionId.toLowerCase())throw Error("Preview D1 must be distinct from production");
const db=(await cf("/d1/database/"+id)).name;
if(!db||typeof db!=="string")throw Error("Preview D1 name unknown");
async function query(sql){
 const v=await cf("/d1/database/"+id+"/query","POST",{sql});
 if(!Array.isArray(v)||!Array.isArray(v[0]?.results))throw Error("Invalid Preview D1 query");
 return v[0].results;
}
const old=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_auth_accounts'");
if(old.length!==1)throw Error("Customer auth schema missing in Preview D1");
const folder=mkdtempSync(join(tmpdir(),"sd-account-cloud-"));
try{
 mkdirSync(join(folder,"migrations"));
 copyFileSync(new URL("../migrations/0013_customer_account_cloud.sql",import.meta.url),
  join(folder,"migrations","0013_customer_account_cloud.sql"));
 writeFileSync(join(folder,"wrangler.toml"),[
  'name = "sd-auth-preview-cloud-migration"','compatibility_date = "2026-10-12"',
  '[[d1_databases]]','binding = "DB"','database_name = '+JSON.stringify(db),
  'database_id = '+JSON.stringify(id),'migrations_dir = "./migrations"'].join("\n")+"\n");
 const run=spawnSync(process.execPath,[join(process.cwd(),"node_modules/wrangler/bin/wrangler.js"),
  "d1","migrations","apply","DB","--remote","--config",join(folder,"wrangler.toml")],
  {env:process.env,encoding:"utf8",timeout:120000});
 if(run.status!==0||run.error)throw Error("Preview-only migration failed: "+(run.stderr||"").slice(0,600));
}finally{rmSync(folder,{recursive:true,force:true})}
const rows=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('customer_account_favorites','customer_account_shipping','customer_account_orders')");
if(rows.length!==3)throw Error("Expected three account cloud tables in Preview D1");
console.log("PASS: three customer account tables present on isolated Preview D1; Production untouched.");
