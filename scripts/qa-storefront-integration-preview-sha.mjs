/** Exact-SHA, branch and isolated Pages alias verification (read only). */
import {sanitizedDeployments} from './admin-preview-provenance-readonly.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const REF='refs/heads/integration/storefront-locked-on-main-2026-10-26';
const BRANCH='integration-storefront-locked-on-main-20261026';
const ALIAS=BRANCH+'.sindarealest-admin-preview.pages.dev';
const SHA=String(process.env.GITHUB_SHA||'');
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||process.env.GITHUB_REF!==REF||!/^[0-9a-f]{40}$/i.test(SHA))throw Error('Source provenance not authorized');
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Cloudflare read-only metadata credentials unavailable');
const url='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/pages/projects/sindarealest-admin-preview/deployments';
let status='UNVERIFIED';
for(let attempt=0;attempt<12;attempt++){
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(16000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.success!==true||!Array.isArray(data.result))throw Error('Cannot read isolated Pages metadata, refuse acceptance');
 const records=sanitizedDeployments(data.result).filter(x=>x.environment==='preview'&&x.stage==='success'&&x.aliases.includes(ALIAS)).sort((a,b)=>(b.createdOn||'').localeCompare(a.createdOn||''));
 if(records.length){status=records[0].sha===SHA&&records[0].branch===BRANCH?'VERIFIED':'WRONG_COMMIT';if(status==='VERIFIED')break}
 if(attempt<11)await new Promise(resolve=>setTimeout(resolve,4000));
}
mkdirSync('artifacts/storefront-integration-preview',{recursive:true});
writeFileSync('artifacts/storefront-integration-preview/provenance.json',JSON.stringify({status,sha:SHA,branch:BRANCH,alias:ALIAS,environment:'preview',productionWrites:false},null,2));
if(status!=='VERIFIED')throw Error('Exact Cloudflare isolated Preview SHA or branch unverified: '+status);
console.log('PASS: isolated Preview branch alias and exact source SHA verified.');
