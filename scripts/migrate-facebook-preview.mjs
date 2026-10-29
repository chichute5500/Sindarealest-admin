/**
 * One-time Facebook provider schema migration for the ISOLATED Cloudflare
 * Pages PREVIEW D1 only. Never accepts user-controlled D1 names/UUIDs.
 * Calls the existing read-only preview gate first in CI. This file additionally
 * independently checks project identity and UUID equality to prevent accidents.
 * Wrangler D1 migration apply captures an automatic D1 backup before migration.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const branch="feat/zalo-customer-login-2026-10-29";
const projectName="sindarealest-admin-preview";
const productionProject="sindarealest2";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
if(process.env.GITHUB_REF!==`refs/heads/${branch}` ||
   process.env.GITHUB_REF_TYPE!=="branch" ||
   process.env.GITHUB_REF_NAME!==branch)
  throw Error("Ref is not the isolated Facebook auth Preview branch");
if(!/^[a-f0-9]{32}$/.test(account)||token.length<10)
  throw Error("Missing Cloudflare CI credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}`;
const headers={Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
async function cf(path,method="GET",data){
  const response=await fetch(base+path,{method,headers,
    ...(data?{body:JSON.stringify(data)}:{}),redirect:"manual",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("Cloudflare safety check HTTP "+response.status);
  const json=await response.json();
  if(json.success!==true)throw Error("Cloudflare safety check rejected request");
  return json.result;
}
const [preview,production]=await Promise.all([
  cf("/pages/projects/"+projectName),
  cf("/pages/projects/"+productionProject)
]);
assert.equal(preview.name,projectName);
assert.equal(production.name,productionProject);
assert.notEqual(preview.id,production.id);
assert.notEqual(preview.production_branch,branch);
const previewId=preview.deployment_configs?.preview?.d1_databases?.DB?.id;
const liveId=production.deployment_configs?.production?.d1_databases?.DB?.id;
if(!/^[a-f0-9-]{36}$/i.test(previewId||"") ||
   !/^[a-f0-9-]{36}$/i.test(liveId||"") ||
   previewId.toLowerCase()===liveId.toLowerCase())
  throw Error("Isolated Preview D1 and Production D1 must be distinct");
const vars=preview.deployment_configs?.preview?.env_vars||{};
if(vars.FACEBOOK_APP_ID?.value!=="2013705155992867" ||
   vars.FACEBOOK_APP_SECRET?.type!=="secret_text")
  throw Error("Preview Facebook credentials missing or incorrectly scoped");
const database=await cf("/d1/database/"+previewId);
const dbName=database?.name;
if(typeof dbName!=="string"||!dbName||dbName.length>200)
  throw Error("Failed to resolve the verified preview D1 database name");
async function query(sql){
  const results=await cf("/d1/database/"+previewId+"/query","POST",{sql});
  if(!Array.isArray(results)||!Array.isArray(results[0]?.results))
    throw Error("Unexpected D1 read-only query response");
  return results[0].results;
}
const schemaSql="SELECT name,sql FROM sqlite_master WHERE type='table' AND name IN ('customer_auth_accounts','customer_auth_flows','customer_auth_sessions') ORDER BY name";
const rows=await query(schemaSql);
const schema=Object.fromEntries(rows.map(r=>[r.name,r.sql]));
if(!schema.customer_auth_sessions || !schema.customer_auth_accounts || !schema.customer_auth_flows)
  throw Error("Preview customer auth migration 0011 missing; refusing mutation");
const facebookAccounts=/['"]facebook['"]/.test(schema.customer_auth_accounts);
const facebookFlows=/['"]facebook['"]/.test(schema.customer_auth_flows);
if(facebookAccounts!==facebookFlows)
  throw Error("Partial Facebook schema detected: require manual review, no migration");
if(facebookAccounts){
  console.log("PASS: isolated Preview D1 already has Facebook auth schema; no write performed.");
  process.exit(0);
}
const counts=(await query(
  "SELECT (SELECT COUNT(*) FROM customer_auth_accounts) AS accounts, (SELECT COUNT(*) FROM customer_auth_sessions) AS sessions"
))[0];
const folder=mkdtempSync(join(tmpdir(),"sd-facebook-preview-"));
try{
  mkdirSync(join(folder,"migrations"));
  copyFileSync(new URL("../migrations/0012_customer_facebook_auth.sql",import.meta.url),
    join(folder,"migrations","0012_customer_facebook_auth.sql"));
  // Use the exact UUID from the Pages Preview environment; never use Production.
  // Database name is resolved by Cloudflare API, not taken from a CLI argument.
  writeFileSync(join(folder,"wrangler.toml"),[
    'name = "sindarealest-preview-facebook-migration"',
    'compatibility_date = "2026-10-12"',
    '[[d1_databases]]',
    'binding = "DB"',
    'database_name = '+JSON.stringify(dbName),
    'database_id = '+JSON.stringify(previewId),
    'migrations_dir = "./migrations"'
  ].join("\n")+"\n");
  console.log("Safety gate PASS: only Pages Preview D1, separate from Production D1.");
  console.log("Applying ONLY migration 0012 with Wrangler automatic pre-migration backup.");
  const cli=join(process.cwd(),"node_modules","wrangler","bin","wrangler.js");
  const run=spawnSync(process.execPath,[cli,"d1","migrations","apply","DB",
    "--remote","--config",join(folder,"wrangler.toml")],{
    env:process.env,encoding:"utf8",timeout:120000
  });
  // Wrangler shows schema operations and migration names, never user records.
  if(run.stdout)process.stdout.write(run.stdout);
  if(run.stderr)process.stderr.write(run.stderr);
  if(run.status!==0 || run.error)
    throw Error("Isolated Preview D1 migration failed; no Production operation performed");
}finally{rmSync(folder,{recursive:true,force:true});}
const upgraded=Object.fromEntries((await query(schemaSql)).map(r=>[r.name,r.sql]));
if(!/['"]facebook['"]/.test(upgraded.customer_auth_accounts||"") ||
   !/['"]facebook['"]/.test(upgraded.customer_auth_flows||""))
  throw Error("Facebook auth migration did not complete on Preview");
const after=(await query(
  "SELECT (SELECT COUNT(*) FROM customer_auth_accounts) AS accounts, (SELECT COUNT(*) FROM customer_auth_sessions) AS sessions"
))[0];
if(Number(after.accounts)<Number(counts.accounts) ||
   Number(after.sessions)<Number(counts.sessions))
  throw Error("Preview account/session preservation check requires investigation");
console.log("PASS: Facebook schema activated on Preview; existing account/session counts preserved.");
console.log("No customer PII or credential values read, logged or transferred to another app.");
