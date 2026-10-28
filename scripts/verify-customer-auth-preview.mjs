/**
 * Read-only Cloudflare Pages deployment guard for SinDarealest customer login.
 * Verifies the PREVIEW environment of the separately named Pages project.
 * Never creates/modifies any Cloudflare project, binding, secret or D1 table.
 */
import assert from "node:assert/strict";
const TARGET_PROJECT="sindarealest-admin-preview";
const STOREFRONT_PROJECT="sindarealest2";
const AUTH_BRANCH="feat/zalo-customer-login-2026-10-29";
const ACCOUNT=process.env.CLOUDFLARE_ACCOUNT_ID || "";
const TOKEN=process.env.CLOUDFLARE_API_TOKEN || "";
if(process.env.GITHUB_REF_NAME!==AUTH_BRANCH || process.env.GITHUB_REF_TYPE!=="branch")
  throw new Error("Ref is not the isolated customer-auth Preview feature branch");
if(!/^[a-f0-9]{32}$/.test(ACCOUNT) || !TOKEN)
  throw new Error("Missing valid CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
async function getProject(name){
  const endpoint="https://api.cloudflare.com/client/v4/accounts/"+ACCOUNT+"/pages/projects/"+encodeURIComponent(name);
  const r=await fetch(endpoint,{headers:{"Authorization":"Bearer "+TOKEN,"Accept":"application/json"},redirect:"error",
    signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error("Cannot independently verify Pages project "+name+" (HTTP "+r.status+")");
  const json=await r.json();
  if(json?.success!==true || json.result?.name!==name)
    throw new Error("Unexpected project details for "+name);
  return json.result;
}
const project=await getProject(TARGET_PROJECT);
const store=await getProject(STOREFRONT_PROJECT);
assert.notEqual(project.id,store.id,"The Preview Pages project must be different from the storefront Production project");
if(project.production_branch===AUTH_BRANCH)
  throw new Error("Target feature branch is configured as the project's Production branch: refusing deployment");
const cfg=project.deployment_configs?.preview;
if(!cfg)throw new Error("Preview environment config was not returned by Cloudflare");
const previewD1=cfg.d1_databases?.DB?.id;
const storeProductionD1=store.deployment_configs?.production?.d1_databases?.DB?.id;
if(typeof previewD1!=="string" || !/^[a-f0-9-]{36}$/i.test(previewD1))
  throw new Error("No D1 DB binding in the target Pages PREVIEW environment");
if(typeof storeProductionD1!=="string" || !/^[a-f0-9-]{36}$/i.test(storeProductionD1))
  throw new Error("Could not verify storefront Production D1 ID; fail closed");
if(previewD1.toLowerCase()===storeProductionD1.toLowerCase())
  throw new Error("PREVIEW D1 is the same as STOREFRONT PRODUCTION D1: deployment blocked");
const r2=cfg.r2_buckets || {};
if(r2.IMAGES?.name!=="sindarealest-images-preview"
   || r2.ORIGINALS?.name!=="sindarealest-preview-original"
   || r2.IMAGES.name===r2.ORIGINALS.name)
  throw new Error("Preview R2 bindings do not match Owner-approved isolated buckets");
const vars=cfg.env_vars || {};
for(const name of ["ZALO_APP_SECRET","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"]){
  if(!Object.hasOwn(vars,name))
    throw new Error("Missing "+name+" in the PAGES PREVIEW environment of "+TARGET_PROJECT);
}
for(const name of ["ZALO_APP_SECRET","GOOGLE_CLIENT_SECRET"]){
  if(vars[name]?.type!=="secret_text")
    throw new Error(name+" is not stored as an encrypted Secret in Pages PREVIEW");
}
const previewHost="feat-zalo-customer-login-2026-10-29."+TARGET_PROJECT+".pages.dev";
console.log("PASS: Preview-only deployment safety gate");
console.log("Project:",TARGET_PROJECT,"Production branch:",project.production_branch);
console.log("Environment: preview; DB isolated from storefront Production by UUID");
console.log("R2 bindings: Preview IMAGES + ORIGINALS confirmed");
console.log("OAuth variables: names and secret types confirmed (values never printed)");
console.log("Branch alias:",previewHost);
