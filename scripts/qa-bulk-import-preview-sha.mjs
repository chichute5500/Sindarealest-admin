/** Read-only SHA and Preview project proof for batch importer. */
import { sanitizedDeployments } from "./admin-preview-provenance-readonly.mjs";
const repo = "chichute5500/Sindarealest-admin";
const ref = "refs/heads/feature/admin-bulk-folder-import-2026-10-26";
const deployedBranch = "sd-import-review-20261026";
const sha = String(process.env.GITHUB_SHA || "");
if (process.env.GITHUB_REPOSITORY !== repo || process.env.GITHUB_REF !== ref || !/^[a-f0-9]{40}$/i.test(sha))
  throw Error("Unexpected source ref; Preview provenance blocked.");
const account = process.env.CLOUDFLARE_ACCOUNT_ID, token=process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw Error("Missing read-only Cloudflare metadata credentials.");
const target = "https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(account)+"/pages/projects/sindarealest-admin-preview/deployments";
let matched=false;
for(let i=0;i<8;i++){
  const res=await fetch(target,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(18000)});
  const json=await res.json().catch(()=>null);
  if(!res.ok||json?.success!==true||!Array.isArray(json.result))throw Error("Cannot read isolated preview deployment metadata.");
  const list=sanitizedDeployments(json.result);
  matched=list.some(item=>item.environment==="preview"&&item.stage==="success"&&item.sha===sha&&item.branch===deployedBranch);
  if(matched)break;
  if(i<7)await new Promise(resolve=>setTimeout(resolve,5000));
}
if(!matched)throw Error("Not proven: exact source SHA on intended Preview branch.");
console.log("PASS: preview-only Pages deployment matches source commit and branch.");
