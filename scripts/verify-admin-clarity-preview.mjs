// Verify Admin clarity Preview source without modifying any Cloudflare resources.
import {sanitizedDeployments} from './admin-preview-provenance-readonly.mjs';
const branch='fix/admin-clarity-20261103';
const target='admin-clarity-20261103';
const host='admin-clarity-20261103.sindarealest-admin-preview.pages.dev';
const sha=String(process.env.GITHUB_SHA||'');
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'');
const token=String(process.env.CLOUDFLARE_API_TOKEN||'');
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||process.env.GITHUB_REF!=='refs/heads/'+branch||!/^[a-f0-9]{40}$/i.test(sha))throw Error('Wrong source ref for Preview');
if(!/^[a-f0-9]{32}$/i.test(account)||token.length<10)throw Error('Cloudflare read-only credentials missing');
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/sindarealest-admin-preview/deployments';
let verified=false;
for(let attempt=0;attempt<12;attempt++){
 const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Cannot fetch Preview deployments: '+response.status);
 const payload=await response.json();
 if(payload?.success!==true||!Array.isArray(payload.result))throw Error('Unexpected Cloudflare deployment payload');
 verified=sanitizedDeployments(payload.result).some(d=>d.environment==='preview'&&d.sha===sha&&d.branch===target&&d.aliases.includes(host)&&d.stage==='success');
 if(verified)break;
 if(attempt<11)await new Promise(resolve=>setTimeout(resolve,4000));
}
if(!verified)throw Error('Preview branch/alias/source SHA not verified');
console.log('PASS: Admin clarity Preview points to exact expected source SHA');
