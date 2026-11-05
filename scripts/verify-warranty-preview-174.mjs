// Verify only the separate PR174 Cloudflare Pages preview deployment metadata.
const expected=process.env.GITHUB_SHA||"";
if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin"||
  process.env.GITHUB_REF!=="refs/heads/feat/manual-warranty-management-20261105"||
  !/^[a-f0-9]{40}$/i.test(expected))throw Error("UNAUTHORIZED_SOURCE");
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
if(!account||!token)throw Error("CLOUDFLARE_CREDENTIALS_MISSING");
const target="warranty-pr174-20261105.sindarealest-admin-preview.pages.dev";
let verified=false;
for(let attempt=0;attempt<15;attempt++){
  const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+
    "/pages/projects/sindarealest-admin-preview/deployments?env=preview&per_page=50",{
      headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error("PAGES_DEPLOYMENTS_HTTP_"+r.status);
  const body=await r.json();
  if(body?.success!==true||!Array.isArray(body.result))throw Error("INVALID_PAGES_DEPLOYMENTS");
  verified=body.result.some(x=>x.environment==="preview"&&x.latest_stage?.status==="success"&&
    x.deployment_trigger?.metadata?.branch==="warranty-pr174-20261105"&&
    String(x.deployment_trigger?.metadata?.commit_hash||"").toLowerCase()===expected.toLowerCase()&&
    (x.aliases||[]).some(a=>{try{return new URL(a).hostname===target}catch{return false}}));
  if(verified)break;
  if(attempt!==14)await new Promise(r=>setTimeout(r,4000));
}
if(!verified)throw Error("PR174_PREVIEW_SHA_OR_ALIAS_MISMATCH");
console.log("PASS: separate PR174 Preview alias and exact source SHA verified; no Production deployment.");
