// Read-only exact-source verification for the payment experiment Preview.
import {sanitizedDeployments} from './admin-preview-provenance-readonly.mjs';
const repository="chichute5500/Sindarealest-admin";
const branch="feat/storefront-payment-cod-sync-20261101";
const pagesBranch="payment-sync-20261101";
const alias="payment-sync-20261101.sindarealest-admin-preview.pages.dev";
const sha=String(process.env.GITHUB_SHA||"");
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
if(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=="refs/heads/"+branch||!/^[0-9a-f]{40}$/i.test(sha))
  throw Error("Preview provenance source is not the authorized experiment branch.");
if(!/^[a-f0-9]{32}$/.test(account)||token.length<10)throw Error("Cloudflare read-only credentials unavailable.");
const endpoint="https://api.cloudflare.com/client/v4/accounts/"+account+"/pages/projects/sindarealest-admin-preview/deployments";
let verified=false;
for(let attempt=0;attempt<12;attempt++){
  const response=await fetch(endpoint,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("Cannot verify isolated Preview deployment metadata (HTTP "+response.status+").");
  const payload=await response.json();
  if(payload?.success!==true||!Array.isArray(payload.result))throw Error("Unexpected Pages deployment metadata.");
  verified=sanitizedDeployments(payload.result).some(deployment=>deployment.environment==="preview"&&
    deployment.sha===sha&&deployment.branch===pagesBranch&&deployment.aliases.includes(alias)&&deployment.stage==="success");
  if(verified)break;
  if(attempt<11)await new Promise(resolve=>setTimeout(resolve,4000));
}
if(!verified)throw Error("Exact Preview URL, source branch and deployed SHA could not be verified; browser QA is blocked.");
console.log("PASS: payment Preview alias points to the exact candidate SHA and branch; metadata check was read-only.");
