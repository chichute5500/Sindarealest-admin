/**
 * Read-only isolation guard for the October storefront audit preview.
 * No production Pages, D1, R2 or OAuth settings are changed.
 */
const BRANCH="fix/audit-2026-10";
const PREVIEW="sindarealest-admin-preview";
const STORE="sindarealest2";
const account=process.env.CLOUDFLARE_ACCOUNT_ID || "";
const token=process.env.CLOUDFLARE_API_TOKEN || "";
if(process.env.GITHUB_REF_NAME!==BRANCH || process.env.GITHUB_REF_TYPE!=="branch")
  throw new Error("Blocked: not the approved audit branch");
if(!/^[a-f0-9]{32}$/i.test(account)||!token)
  throw new Error("Missing Cloudflare deployment credentials.");
async function project(name){
 const url="https://api.cloudflare.com/client/v4/accounts/"+account+"/pages/projects/"+encodeURIComponent(name);
 const response=await fetch(url,{headers:{"Authorization":"Bearer "+token,"Accept":"application/json"},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("Unable to verify target Pages project: "+name);
 const data=await response.json();
 if(data?.success!==true||data.result?.name!==name)throw new Error("Unexpected Cloudflare project identity");
 return data.result;
}
const [preview,production]=await Promise.all([project(PREVIEW),project(STORE)]);
if(!preview.id||!production.id||preview.id===production.id)
  throw new Error("Preview is not an independently identified Pages project");
if(preview.production_branch===BRANCH)
  throw new Error("Audit branch is configured as production: refusing deploy");
const p=preview.deployment_configs?.preview;
const d1=p?.d1_databases?.DB?.id;
const productionD1=production.deployment_configs?.production?.d1_databases?.DB?.id;
if(!d1||!productionD1||d1===productionD1)
  throw new Error("Isolated Preview D1 binding could not be verified");
const r2=p?.r2_buckets||{};
if(!r2.IMAGES?.name||!r2.ORIGINALS?.name||r2.IMAGES.name===r2.ORIGINALS.name)
  throw new Error("Preview image/original buckets could not be verified");
console.log("PASS: independent audit preview Pages project, D1 and R2 bindings verified (read-only)");
