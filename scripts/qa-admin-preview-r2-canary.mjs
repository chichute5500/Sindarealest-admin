/** Remote R2 canary for the isolated Admin Preview ONLY.
 * Uses unique run-owned UUID keys, reads and deletes only those same keys.
 * Does not create/edit a product, D1 record, payment, Pages binding or Production resource.
 */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const sha=String(process.env.GITHUB_SHA||''),run=String(process.env.GITHUB_RUN_ID||'');
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin' ||
   process.env.GITHUB_REF!=='refs/heads/feature/admin-isolated-handoff-2026-10-20' ||
   !/^[a-f0-9]{40}$/i.test(sha)|| !/^\d{8,16}$/.test(run)||!account||!token)
  throw Error('QA_R2_UNSAFE_CONTEXT: no object operation allowed');
const outdir=join(process.cwd(),'artifacts','admin-r2-canary',sha.slice(0,12));
mkdirSync(outdir,{recursive:true});
const record={sourceSha:sha,environment:'ISOLATED_ADMIN_PREVIEW_ONLY',
  proofType:'REAL_CLOUDFLARE_R2_OBJECT_GET_PUT_DELETE_AND_PUBLIC_DERIVATIVE',
  readbackVerified:false,publicRouteVerified:false,cleanupPasses:0,
  objectNamesExposed:false,productionTouched:false,checkedAtUtc:new Date().toISOString()};
const save=()=>writeFileSync(join(outdir,'manifest.json'),JSON.stringify(record,null,2)+'\n');
const api='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account);
async function pages(name) {
  const r=await fetch(api+'/pages/projects/'+name,{
    headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
  const j=await r.json().catch(()=>null);
  if(!r.ok||j?.success!==true||j.result?.name!==name||j.result?.production_branch!=='main')
    throw Error('CLOUDFLARE_PREVIEW_PROJECT_IDENTITY_NOT_VERIFIED');
  return j.result;
}
const binding=(config,name)=>String(config?.r2_buckets?.[name]?.name||config?.r2_buckets?.[name]?.bucket_name||'');
const d1=c=>String(c?.d1_databases?.DB?.id||c?.d1_databases?.DB?.database_id||'');
const [a,s]=await Promise.all([pages('sindarealest-admin-preview'),pages('sindarealest2')]);
const admin=a.deployment_configs.preview,prod=s.deployment_configs.production;
const images=binding(admin,'IMAGES'),originals=binding(admin,'ORIGINALS'),
 pImages=binding(prod,'IMAGES'),pOriginals=binding(prod,'ORIGINALS');
const nameOk=x=>/^[a-z0-9][a-z0-9-]{2,62}$/.test(x);
if(![images,originals,pImages,pOriginals].every(nameOk)||!d1(admin)||!d1(prod)||
  d1(admin)===d1(prod)||images===originals||
  [pImages,pOriginals].includes(images)||[pImages,pOriginals].includes(originals))
  throw Error('QA_R2_PRODUCTION_OR_PUBLIC_BUCKET_OVERLAP: no write authorized');
record.bindingIsolationVerified=true;save();

const uid=randomUUID(),imageKey=uid+'.webp',originalKey='private-originals/'+uid+'.webp';
const objects=[{bucket:images,key:imageKey,kind:'public'},{bucket:originals,key:originalKey,kind:'private'}];
const source=readFileSync('public/watermark.webp');
if(source.byteLength<20||source.subarray(0,4).toString()!=='RIFF'||
 source.subarray(8,12).toString()!=='WEBP') throw Error('INVALID_CANARY_WEBP');
const expectedHash=createHash('sha256').update(source).digest('hex');
const tmp=mkdtempSync(join(tmpdir(),'admin-r2-qa-'));
const binary=join(tmp,'canary.webp');writeFileSync(binary,source);
function cli(type,object,file) {
 const args=['r2','object',type,object.bucket+'/'+object.key];
 if(type==='put')args.push('--file',file,'--content-type','image/webp','--force');
 if(type==='get')args.push('--file',file);
 if(type==='delete')args.push('--force');
 args.push('--remote');
 const child=spawnSync(join(process.cwd(),'node_modules','.bin','wrangler'),args,{
  env:process.env,encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024
 });
 return {ok:child.status===0,status:child.status,error:child.error?.name||null,
   notFound:/404|not found|does not exist|no such object/i.test((child.stderr||'')+' '+(child.stdout||''))};
}
let error=null;
try {
 for(const object of objects) {
   const result=cli('put',object,binary);
   if(!result.ok)throw Error('CANARY_R2_PUT_DENIED_'+object.kind+'_STATUS_'+result.status);
 }
 for(const object of objects){
   const downloaded=join(tmp,'read-'+object.kind+'.webp');
   const result=cli('get',object,downloaded);
   if(!result.ok)throw Error('CANARY_R2_GET_FAILED_'+object.kind+'_STATUS_'+result.status);
   if(createHash('sha256').update(readFileSync(downloaded)).digest('hex')!==expectedHash)
     throw Error('CANARY_R2_READBACK_HASH_MISMATCH_'+object.kind);
 }
 record.readbackVerified=true;save();
 const url='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/media/'+imageKey;
 const res=await fetch(url,{headers:{'Cache-Control':'no-store'},signal:AbortSignal.timeout(20000)});
 if(res.status!==200||!String(res.headers.get('Content-Type')).includes('image/webp'))
   throw Error('CANARY_PUBLIC_MEDIA_ROUTE_NOT_VERIFIED_HTTP_'+res.status);
 const buf=Buffer.from(await res.arrayBuffer());
 if(createHash('sha256').update(buf).digest('hex')!==expectedHash)
   throw Error('CANARY_PUBLIC_MEDIA_HASH_MISMATCH');
 record.publicRouteVerified=true;
} catch(e){error=e;} finally {
 // Key names are UUIDs generated by this run only; NEVER delete other records.
 const cleanupErrors=[];
 for(const obj of objects){
   const result=cli('delete',obj,'');
   if(!result.ok)cleanupErrors.push(obj.kind+': delete failed '+result.status);
 }
 for(let pass=1;pass<=2;pass++){
   for(const obj of objects){
     const res=cli('get',obj,join(tmp,'confirm-'+pass+'-'+obj.kind+'.webp'));
     if(res.ok||!res.notFound)cleanupErrors.push(obj.kind+': cleanup absence unverified pass '+pass);
   }
   if(cleanupErrors.length===0)record.cleanupPasses=pass;
 }
 record.cleanupVerified=cleanupErrors.length===0;
 record.status=(!error&&record.readbackVerified&&record.publicRouteVerified&&record.cleanupVerified)
   ? 'PASS_REMOTE_R2_RUN_OWNED_LIFECYCLE':'NOT_ACCEPTED';
 record.errorCode=error?.message||null;
 record.cleanupErrors=cleanupErrors;
 record.finishedAtUtc=new Date().toISOString();save();
 rmSync(tmp,{recursive:true,force:true});
 if(cleanupErrors.length)console.error('[QA_R2_CLEANUP] FAILED: '+cleanupErrors.join('; '));
 else console.info('[QA_R2_CLEANUP] Verified two independent remote absent-object checks on both isolated Preview R2 buckets.');
}
console.info('[QA_ADMIN_R2_CANARY] '+JSON.stringify({
 status:record.status,sourceSha:sha,readbackVerified:record.readbackVerified,
 publicRouteVerified:record.publicRouteVerified,cleanupPasses:record.cleanupPasses,
 bindingIsolationVerified:record.bindingIsolationVerified,
 errorCode:record.errorCode,productionTouched:false
}));
if(record.status!=='PASS_REMOTE_R2_RUN_OWNED_LIFECYCLE')
  throw Error('QA_R2_NOT_ACCEPTED: '+(record.errorCode||'remote canary failed'));
