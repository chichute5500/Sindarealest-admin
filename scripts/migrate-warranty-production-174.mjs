// One-off Owner-approved PR174 Production D1 schema release. Full backup required before change.
import {spawnSync} from "node:child_process";
import {mkdirSync,mkdtempSync,copyFileSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
const BRANCH="feat/manual-warranty-management-20261105", REPO="chichute5500/Sindarealest-admin";
const project="sindarealest2",account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
const sha=process.env.GITHUB_SHA||"",mode=process.argv[2];
if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!=="refs/heads/"+BRANCH||
  !/^[a-f0-9]{40}$/i.test(sha)||!/^[a-f0-9]{32}$/i.test(account)||token.length<12||
  !["backup","migrate"].includes(mode))throw Error("PR174_SCOPE_NOT_VERIFIED");
const expectedMain="ae04ff1b958fdf2ca863e0102b3ed77d6ef433f9";
const refs=spawnSync("git",["ls-remote","origin","refs/heads/main","refs/heads/"+BRANCH],{encoding:"utf8",timeout:30000});
if(refs.status!==0)throw Error("RELEASE_GIT_REFS_UNVERIFIED");
const remote=Object.fromEntries(refs.stdout.trim().split(/\r?\n/).map(line=>{const [hash,ref]=line.trim().split(/\s+/);return [ref,hash]}));
if(remote["refs/heads/main"]!==expectedMain||remote["refs/heads/"+BRANCH]!==sha)throw Error("MAIN_OR_RELEASE_SOURCE_MOVED");
const root="https://api.cloudflare.com/client/v4/accounts/"+account;
async function cloud(path,method="GET",body){
  const res=await fetch(root+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error("CLOUDFLARE_HTTP_"+res.status);
  const data=await res.json();if(data?.success!==true)throw Error("CLOUDFLARE_API_FAILURE");
  return data.result;
}
const [site,other]=await Promise.all([cloud("/pages/projects/"+project),cloud("/pages/projects/sindarealest-admin-preview")]);
if(site?.name!==project||site?.production_branch!=="main"||other?.name!=="sindarealest-admin-preview")
  throw Error("PAGES_PROJECT_IDENTITY_UNVERIFIED");
const dbid=(p,e)=>p?.deployment_configs?.[e]?.d1_databases?.DB?.id||
  p?.deployment_configs?.[e]?.d1_databases?.DB?.database_id||"";
const productionId=dbid(site,"production"),previewId=dbid(other,"preview"),otherProdId=dbid(other,"production");
const valid=x=>/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(x);
if(!valid(previewId)||!valid(productionId)||productionId.toLowerCase()!=="f6c208a1-052a-445c-a3b7-a442783f9bd3")throw Error("PINNED_PRODUCTION_DB_BINDING_MISSING");
if(previewId.toLowerCase()===productionId.toLowerCase()||
   (valid(otherProdId)&&previewId.toLowerCase()===otherProdId.toLowerCase()))
  throw Error("PREVIEW_D1_SHARES_PRODUCTION");
if(site.id===other.id)throw Error("PRODUCTION_AND_PREVIEW_PROJECT_NOT_DISTINCT");
if(productionId.toLowerCase()===previewId.toLowerCase()||productionId.toLowerCase()===otherProdId.toLowerCase())throw Error("PROD_D1_NOT_ISOLATED");
const db=await cloud("/d1/database/"+productionId);
if(db?.name!=="sindarealest-db"||db?.uuid?.toLowerCase()!==productionId.toLowerCase())throw Error("PRODUCTION_D1_IDENTITY_MISSING");
async function query(sql){
 const result=await cloud("/d1/database/"+productionId+"/query","POST",{sql});
 if(!Array.isArray(result)||result[0]?.success!==true||!Array.isArray(result[0]?.results))
   throw Error("PREVIEW_D1_READ_FAILED");
 return result[0].results;
}
const prerequisites=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('customers','orders','warranties','audit_logs')");
await query("SELECT delivery_status FROM orders LIMIT 0");
await query("SELECT amount FROM order_cod_settlements LIMIT 0");
if(prerequisites.length!==4)throw Error("PREVIEW_D1_BASE_SCHEMA_INCOMPLETE");
const exists=(await query("SELECT name FROM sqlite_master WHERE type='table' AND name='manual_warranties'")).length===1;
const ledgerExists=(await query("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'")).length===1;
const recorded=ledgerExists&&(await query("SELECT name FROM d1_migrations WHERE name='0019_manual_warranties.sql'")).length===1;
if(exists!==recorded)throw Error("SCHEMA_AND_MIGRATION_LEDGER_MISMATCH");
const dir=mkdtempSync(join(tmpdir(),"warranty-pr174-production-"));
try{
 mkdirSync(join(dir,"migrations"));
 copyFileSync(new URL("../migrations/0019_manual_warranties.sql",import.meta.url),join(dir,"migrations","0019_manual_warranties.sql"));
 copyFileSync(new URL("../migrations/0020_manual_warranty_contacts.sql",import.meta.url),join(dir,"migrations","0020_manual_warranty_contacts.sql"));
 copyFileSync(new URL("../migrations/0021_warranty_policy_snapshots.sql",import.meta.url),join(dir,"migrations","0021_warranty_policy_snapshots.sql"));
 const conf=join(dir,"wrangler.toml");
 writeFileSync(conf,[
   'name = "sd-warranty-prod-174"',
   'compatibility_date = "2026-10-12"',
   '[[d1_databases]]',
   'binding = "DB"',
   'database_name = '+JSON.stringify(db.name),
   'database_id = '+JSON.stringify(productionId),
   'migrations_dir = "./migrations"'
 ].join("\n")+"\n",{mode:0o600});
 const wrangler=join(process.cwd(),"node_modules","wrangler","bin","wrangler.js");
 function execute(args){
   const r=spawnSync(process.execPath,[wrangler,...args,"--config",conf],{
     encoding:"utf8",env:process.env,timeout:180000,maxBuffer:5*1024*1024});
   if(r.error||r.status!==0){
     const detail=String(r.stderr||r.stdout||r.error?.message||"unknown").slice(-900)
       .replaceAll(token,"[token]").replaceAll(account,"[account]").replaceAll(db.name,"[db]")
       .replace(/[a-f0-9]{8}-[a-f0-9-]{27}/ig,"[uuid]")
       .replace(/https?:\/\/[^\s)]+/g,"[url]")
       .replace(/(?:[^\s]+\/){2,}[^\s]+/g,"[path]");
     throw Error("WRANGLER_"+args[1]+"_FAILED_"+(r.status??"TIMEOUT")+": "+detail);
   }
 }
 if(mode==="backup"){
   mkdirSync("artifacts/pr174-production-db",{recursive:true});
   const output="artifacts/pr174-production-db/d1-before-0019.sql";
   execute(["d1","export","DB","--remote","--output",output,"--skip-confirmation"]);
   const contents=readFileSync(output);
   if(contents.length<300||!contents.includes(Buffer.from("CREATE TABLE")))throw Error("D1_SQL_BACKUP_INVALID");
   writeFileSync("artifacts/pr174-production-db/proof.json",JSON.stringify({
     target:"sindarealest2/sindarealest-db",sha,bytes:contents.length,
     sha256:createHash("sha256").update(contents).digest("hex"),
     productionWrites:false
   },null,2));
   console.log("PASS: exact Production D1 and full SQL backup verified before schema change.");
 }else{
   const hasContact=(await query("SELECT name FROM pragma_table_info('manual_warranties')")).some(row=>row.name==="customer_contact_reference");
   const contactRecorded=(await query("SELECT name FROM d1_migrations WHERE name='0020_manual_warranty_contacts.sql'")).length===1;
   if(hasContact!==contactRecorded)throw Error("CONTACT_SCHEMA_AND_LEDGER_MISMATCH");
   const hasPolicy=(await query("SELECT name FROM pragma_table_info('warranties')")).some(row=>row.name==="policy_snapshot_json");
   const hasManualPolicy=(await query("SELECT name FROM pragma_table_info('manual_warranties')")).some(row=>row.name==="policy_snapshot_json");
   const policyRecorded=(await query("SELECT name FROM d1_migrations WHERE name='0021_warranty_policy_snapshots.sql'")).length===1;
   if(hasPolicy!==policyRecorded||hasManualPolicy!==policyRecorded)throw Error("POLICY_SCHEMA_AND_LEDGER_MISMATCH");
   if(!exists||!hasContact||!hasPolicy)execute(["d1","migrations","apply","DB","--remote"]);
   const rows=await query("SELECT name FROM pragma_table_info('manual_warranties')");
   const after=(await query("SELECT name FROM d1_migrations WHERE name='0019_manual_warranties.sql'")).length===1;
   const contactAfter=(await query("SELECT name FROM d1_migrations WHERE name='0020_manual_warranty_contacts.sql'")).length===1;
   const required=["id","warranty_code","customer_name","customer_phone","customer_address","product_name","price","duration_months","starts_at","ends_at"];
   const policyAfter=(await query("SELECT name FROM d1_migrations WHERE name='0021_warranty_policy_snapshots.sql'")).length===1;
   const orderPolicy=(await query("SELECT name FROM pragma_table_info('warranties')")).some(row=>row.name==="policy_snapshot_json");
   const triggers=await query("SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('warranty_policy_snapshot_lock','manual_warranty_policy_snapshot_lock')");
   if(triggers.length!==2)throw Error("PRODUCTION_POLICY_TRIGGERS_MISSING");
   if(!after||!contactAfter||!policyAfter||!orderPolicy||required.some(n=>!rows.some(r=>r.name===n))||
     !rows.some(r=>r.name==="customer_contact_reference")||!rows.some(r=>r.name==="policy_snapshot_json"))throw Error("MIGRATION_0019_0020_0021_VERIFICATION_FAILED");
   console.log("PASS: Production D1 schema-only 0019, 0020, 0021 and policy locks verified.");
 }
}finally{rmSync(dir,{recursive:true,force:true});}
