/**
 * ONE-SHOT, OWNER-APPROVED Production D1 auth schema setup.
 * Executes only after an independently verified D1 binding and a Cloudflare
 * Time Travel rollback bookmark. Never touches existing customer/order tables.
 * NOT part of the routine Production deploy pipeline.
 */
import {appendFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {findNamedRecord,listD1Databases,parseCliJson,runWrangler} from "./cloudflare-utils.mjs";
import {checkProductionCustomerAuthReady} from "./check-customer-auth-production-ready.mjs";

const BRANCH="feat/zalo-customer-login-2026-10-29";
const PROJECT="sindarealest2";
const DATABASE="sindarealest-db";
const DB_TABLES=[
 "customer_auth_accounts","customer_auth_sessions","customer_auth_flows",
 "customer_auth_email_state","customer_auth_email_challenges",
 "customer_account_favorites","customer_account_shipping","customer_account_orders"
];
function findCount(value,key){
 if(Array.isArray(value)){
  for(const v of value){const c=findCount(v,key);if(c!==null)return c;}
 }else if(value&&typeof value==="object"){
  if(Object.hasOwn(value,key)){
   const n=Number(value[key]);return Number.isSafeInteger(n)&&n>=0?n:null;
  }
  for(const v of Object.values(value)){const c=findCount(v,key);if(c!==null)return c;}
 }
 return null;
}
function countSql(sql,key){
 try{
  const r=runWrangler(["d1","execute",DATABASE,"--remote","--json","--command",sql],{quiet:true});
  return findCount(parseCliJson(r.stdout,"D1 read-only schema preflight"),key);
 }catch{throw Error("Cannot complete Production D1 schema preflight; aborting before any write.");}
}
async function cloudflareGet(path,account,token){
 const url="https://api.cloudflare.com/client/v4/accounts/"+account+path;
 const r=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},
   redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare read-only verification failed");
 const data=await r.json();
 if(data?.success!==true)throw Error("Cloudflare read-only response not successful");
 return data.result;
}
export async function migrateCustomerAuthProductionOnce(){
 const trustedPush=process.env.GITHUB_EVENT_NAME==="push"&&
  process.env.GITHUB_REF_NAME===BRANCH&&process.env.GITHUB_REF_TYPE==="branch";
 const trustedPr=process.env.GITHUB_EVENT_NAME==="pull_request"&&
  process.env.GITHUB_HEAD_REF===BRANCH&&process.env.GITHUB_BASE_REF==="main"&&
  process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.SD_AUTH_RELEASE_PR==="150";
 if(process.env.RELEASE_AUTH_ONE_SHOT!=="owner-pass-google-20261029"||
    (!trustedPush&&!trustedPr))
  throw Error("Not the explicitly authorized one-time Owner-PASS feature branch or same-repository PR #150");
 if(process.env.CLOUDFLARE_PAGES_PROJECT!==PROJECT||
    process.env.CLOUDFLARE_PAGES_BRANCH!=="main")
  throw Error("Not the exact Production Pages target");
 const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
 if(!/^[a-f0-9]{32}$/i.test(account)||!token)
  throw Error("Cloudflare credentials unavailable");
 let project;
 try{project=await cloudflareGet("/pages/projects/"+PROJECT,account,token);}
 catch{throw Error("Cannot verify Production Pages project; no writes attempted.");}
 if(project?.name!==PROJECT||project.production_branch!=="main")
  throw Error("Cloudflare target is not the approved Production main");
 const binding=project.deployment_configs?.production?.d1_databases?.DB?.id||"";
 if(!/^[a-f0-9-]{36}$/i.test(binding))
  throw Error("Production Pages DB binding missing");
 const vars=project.deployment_configs?.production?.env_vars||{};
 if(!Object.hasOwn(vars,"GOOGLE_CLIENT_ID")||
    vars.GOOGLE_CLIENT_SECRET?.type!=="secret_text")
  throw Error("Production Google OAuth configuration not ready");
 let database;
 try{database=findNamedRecord(listD1Databases(),DATABASE,["name","database_name"]);}
 catch{throw Error("Cannot independently verify Production D1 database");}
 const actual=database?.uuid||database?.id||"";
 if(typeof actual!=="string"||actual.toLowerCase()!==binding.toLowerCase())
  throw Error("Production Pages DB binding UUID mismatch");
 const existing=countSql("SELECT COUNT(*) AS existing_count FROM sqlite_master WHERE type='table' AND name IN ("+
   DB_TABLES.map(n=>"'"+n+"'").join(",")+");","existing_count");
 if(existing!==0)throw Error("Customer auth schema already partially/fully exists ("+existing+
   " tables). Refusing to rerun or overwrite. Manual review required.");
 const baseline=countSql("SELECT COUNT(*) AS baseline_count FROM sqlite_master WHERE type='table' AND name IN ('orders','products','public_rate_limits');","baseline_count");
 if(baseline!==3)throw Error("Expected Production storefront baseline schema absent; no writes attempted.");
 // Cloudflare D1 Time Travel is an automatic, point-in-time restoration facility.
 // A verified bookmark is mandatory BEFORE touching any Production table.
 let backup;
 try{backup=await cloudflareGet("/d1/database/"+binding+"/time_travel/bookmark",account,token);}
 catch{throw Error("Could not get a Production D1 Time Travel rollback bookmark. No migration executed.");}
 const bookmark=backup?.bookmark;
 if(typeof bookmark!=="string"||!/^[a-zA-Z0-9-]{15,160}$/.test(bookmark))
  throw Error("No valid restore bookmark from Cloudflare D1. No migration executed.");
 console.log("Verified Production D1 Time Travel rollback bookmark:",bookmark);
 if(process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "Verified Production D1 Time Travel rollback bookmark (expires per Cloudflare retention): \`"+bookmark+"\`\\n");
 const migrations=[
  "migrations/0011_customer_auth.sql",
  "migrations/0012_customer_facebook_auth.sql",
  "migrations/0013_customer_account_cloud.sql",
  "migrations/0014_customer_email_verification.sql"
 ];
 for(const file of migrations){
  try{
   runWrangler(["d1","execute",DATABASE,"--remote","--yes","--file",file],{quiet:true});
  }catch{
   throw Error("Stopped on "+file+". Do not automatically retry/restore; inspect schema and current D1 data. Time Travel bookmark recorded in prior CI logs.");
  }
  console.log("Applied reviewed Production schema migration:",file);
 }
 await checkProductionCustomerAuthReady();
 console.log("PASS: Customer Google D1 Production schema verified. Existing catalog, Admin and orders untouched by migration files.");
 return true;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))
 migrateCustomerAuthProductionOnce().catch(e=>{console.error(e.message);process.exitCode=1;});
