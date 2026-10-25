/** Read-only exact SHA verification for isolated full-site Pages Preview.
 * Only verify the alias reported by Cloudflare, never guess the current branch.
 */
import { sanitizedDeployments } from './admin-preview-provenance-readonly.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const SHA=process.env.GITHUB_SHA,REF=process.env.GITHUB_REF;
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const TARGET='integration-fullsite-2026102.sindarealest-admin-preview.pages.dev';
const BRANCH='integration-fullsite-20261025';
if(!/^[a-f0-9]{40}$/i.test(SHA)||REF!=='refs/heads/integration/full-site-admin-storefront-2026-10-25'||
 !account||!token)throw Error('Untrusted source SHA / ref / Cloudflare read auth');
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/pages/projects/sindarealest-admin-preview/deployments';
let status='NOT_VERIFIED';
for(let attempt=0;attempt<10;attempt++){
 const res=await fetch(endpoint,{method:'GET',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(14000)});
 const data=await res.json().catch(()=>null);
 if(!res.ok||data?.success!==true||!Array.isArray(data.result))throw Error('Unable to verify isolated Cloudflare Pages deployment metadata');
 const records=sanitizedDeployments(data.result).filter(x=>x.environment==='preview'&&x.stage==='success'&&x.aliases.includes(TARGET));
 records.sort((a,b)=>(b.createdOn||'').localeCompare(a.createdOn||''));
 if(records[0]?.branch!==undefined && records.length){
   status=records[0].sha===SHA&&records[0].branch===BRANCH?'VERIFIED':'MISMATCH';
   if(status==='VERIFIED')break;
 }
 if(attempt<9)await new Promise(resolve=>setTimeout(resolve,4000));
}
mkdirSync('artifacts/full-site-preview-evidence',{recursive:true});
writeFileSync('artifacts/full-site-preview-evidence/source-provenance.json',JSON.stringify({status,sourceSha:SHA,alias:TARGET,branch:BRANCH,scope:'CLOUDFLARE_READ_ONLY_METADATA',remoteWrites:false},null,2)+'\n');
if(status!=='VERIFIED')throw Error('Preview deployed exact SHA unverified, refuse final browser acceptance');
console.log('PASS: Cloudflare exact deployed branch alias and SHA verified read-only.');
