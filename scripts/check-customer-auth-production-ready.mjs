/**
 * READ-ONLY gate for deploying Customer Google account features to storefront Production.
 * Never prints secrets, credentials, query results, customer records or database IDs.
 * Never modifies a Cloudflare resource. Missing schema/bindings block release.
 */
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {listD1Databases,findNamedRecord,runWrangler} from "./cloudflare-utils.mjs";

const PROJECT="sindarealest2",DATABASE="sindarealest-db";
const SCHEMA=[
 ["customer_auth_accounts","id,provider,provider_subject,display_name,email"],
 ["customer_auth_sessions","token_hash,account_id,expires_at"],
 ["customer_auth_flows","state_hash,provider,verifier,browser_hash,expires_at"],
 ["customer_auth_email_state","account_id,verified_at"],
 ["customer_auth_email_challenges","account_id,purpose,code_hash,expires_at"],
 ["customer_account_favorites","account_id,product_key"],
 ["customer_account_shipping","account_id,full_name,phone,province,ward,street_address"],
 ["customer_account_orders","account_id,order_id"],
 ["public_rate_limits","bucket"]
];
export async function checkProductionCustomerAuthReady(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
 const token=process.env.CLOUDFLARE_API_TOKEN||"";
 if(!/^[a-f0-9]{32}$/i.test(account)||!token)
  throw Error("Missing Cloudflare read credentials; production customer auth release blocked.");
 if(process.env.CLOUDFLARE_PAGES_PROJECT && process.env.CLOUDFLARE_PAGES_PROJECT!==PROJECT)
  throw Error("Wrong Production Pages project; release blocked.");
 if(process.env.CLOUDFLARE_PAGES_BRANCH && process.env.CLOUDFLARE_PAGES_BRANCH!=="main")
  throw Error("Wrong Production branch; release blocked.");
 const endpoint="https://api.cloudflare.com/client/v4/accounts/"+account+"/pages/projects/"+PROJECT;
 let project;
 try{
  const res=await fetch(endpoint,{headers:{"Authorization":"Bearer "+token,"Accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error("Cloudflare Project not readable");
  const body=await res.json();
  if(body?.success!==true || body.result?.name!==PROJECT)throw Error("Unexpected Pages project");
  project=body.result;
 }catch{throw Error("Cannot verify actual storefront Production Pages settings; release blocked.");}
 if(project.production_branch!=="main")throw Error("Storefront Production branch is not main.");
 const prod=project.deployment_configs?.production;
 const bound=prod?.d1_databases?.DB?.id||"";
 if(!/^[a-f0-9-]{36}$/i.test(bound))throw Error("Missing Production D1 DB binding.");
 const vars=prod?.env_vars||{};
 if(!Object.hasOwn(vars,"GOOGLE_CLIENT_ID") ||
    vars.GOOGLE_CLIENT_SECRET?.type!=="secret_text")
  throw Error("Production Google OAuth Client ID or protected Client Secret missing.");
 let database;
 try{database=findNamedRecord(listD1Databases(),DATABASE,["name","database_name"]); }
 catch{throw Error("Cannot read D1 database list; Production release blocked.");}
 const actual=database?.uuid||database?.id||"";
 if(typeof actual!=="string"||actual.toLowerCase()!==bound.toLowerCase())
  throw Error("Production Pages D1 DB binding does not match expected Production database.");
 for(const [table,columns] of SCHEMA){
  try{
   runWrangler(["d1","execute",DATABASE,"--remote","--json","--command",
    "SELECT "+columns+" FROM "+table+" LIMIT 0;"],{quiet:true});
  }catch{throw Error("Production D1 auth schema is not ready ("+table+"). Back up and apply reviewed migrations 0011-0014 before releasing. No writes performed.");}
 }
 console.log("PASS: read-only Production customer auth readiness (exact Pages project and main branch, matching D1 DB, Google secret type, auth/cloud schema).");
 return true;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1]))
 checkProductionCustomerAuthReady().catch(e=>{console.error(e.message);process.exitCode=1;});
