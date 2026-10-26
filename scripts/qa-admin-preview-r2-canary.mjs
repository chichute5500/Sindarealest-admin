/** Self-cleaning S3-compatible R2 canary against exactly two Admin Preview buckets.
 * Fail closed on Cloudflare project/binding/provenance, no Production operations,
 * no mutation of D1, no real image keys, and no secrets or object keys in artifacts.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {S3Client,HeadObjectCommand,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';

const repo='chichute5500/Sindarealest-admin';
const branch='refs/heads/feature/admin-isolated-handoff-2026-10-20';
const sha=String(process.env.GITHUB_SHA||'');
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'');
const pagesToken=String(process.env.CLOUDFLARE_API_TOKEN||'');
const accessKeyId=String(process.env.R2_ACCESS_KEY_ID||'');
const secretAccessKey=String(process.env.R2_SECRET_ACCESS_KEY||'');
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!==branch||
  !/^[a-f0-9]{40}$/i.test(sha)|| !/^\d{8,16}$/.test(String(process.env.GITHUB_RUN_ID||''))||
  !/^[a-f0-9]{32}$/i.test(account)||!pagesToken||!accessKeyId||!secretAccessKey)
  throw Error('R2_QA_UNSAFE_BRANCH_ACCOUNT_OR_MISSING_CREDENTIALS');
const folder=join(process.cwd(),'artifacts/admin-r2-canary',sha.slice(0,12));
mkdirSync(folder,{recursive:true});
const manifest={sourceSha:sha,environment:'ISOLATED_ADMIN_PREVIEW_ONLY',protocol:'S3_SIGV4',
  proofType:'RUN_OWNED_OBJECT_PUT_READBACK_PUBLIC_MEDIA_DELETE_HEAD_ABSENCE',
  bindingIsolationVerified:false,readbackVerified:false,publicRouteVerified:false,
  cleanupPasses:0,cleanupVerified:false,productionTouched:false,
  objectNamesExposed:false,checkedAtUtc:new Date().toISOString(),status:'NOT_ACCEPTED'};
const save=()=>writeFileSync(join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const classify=e=>{
  const code=String(e?.name||e?.Code||'');
  const safe=['NoSuchKey','NotFound','AccessDenied','InvalidAccessKeyId',
    'SignatureDoesNotMatch','ExpiredToken','Forbidden','TimeoutError','NetworkingError',
    'CredentialsProviderError','AbortError','UnknownEndpoint','InvalidBucketName','InvalidRequest'];
  return safe.includes(code)?code:'S3_REQUEST_FAILED';
};
const absent=e=>e?.$metadata?.httpStatusCode===404||['NotFound','NoSuchKey'].includes(e?.name);
const digest=b=>createHash('sha256').update(b).digest('hex');
async function project(name){
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+
    '/pages/projects/'+name,{headers:{Authorization:'Bearer '+pagesToken},signal:AbortSignal.timeout(20000)});
  const j=await r.json().catch(()=>null);
  if(!r.ok||j?.success!==true||j.result?.name!==name||j.result?.production_branch!=='main')
    throw Error('CLOUDFLARE_PROJECT_METADATA_NOT_VERIFIED');
  return j.result;
}
const binding=(c,n)=>String(c?.r2_buckets?.[n]?.name||c?.r2_buckets?.[n]?.bucket_name||'');
const d1=c=>String(c?.d1_databases?.DB?.id||c?.d1_databases?.DB?.database_id||'');
const [admin,store]=await Promise.all([project('sindarealest-admin-preview'),project('sindarealest2')]);
const preview=admin.deployment_configs?.preview;
const shopProd=store.deployment_configs?.production;
const adminProd=admin.deployment_configs?.production;
const images=binding(preview,'IMAGES'),originals=binding(preview,'ORIGINALS');
const expectedImage='sindarealest-images-preview',expectedOriginal='sindarealest-preview-original';
const productionBuckets=[binding(shopProd,'IMAGES'),binding(shopProd,'ORIGINALS'),
  binding(adminProd,'IMAGES'),binding(adminProd,'ORIGINALS')].filter(Boolean);
if(images!==expectedImage||originals!==expectedOriginal||images===originals||
  !d1(preview)||!d1(shopProd)||d1(preview)===d1(shopProd)||
  (d1(adminProd)&&d1(preview)===d1(adminProd))||
  productionBuckets.includes(images)||productionBuckets.includes(originals))
  throw Error('R2_QA_BINDING_ISOLATION_NOT_VERIFIED');
manifest.bindingIsolationVerified=true;save();

// UUID generated exclusively for this run. Do not list, delete, or read
// existing catalog images, including other QA runs.
const uid=randomUUID();
const objects=[
  {kind:'public',Bucket:images,Key:uid+'.webp'},
  {kind:'private',Bucket:originals,Key:'private-originals/'+uid+'.webp'}
];
const bytes=readFileSync('public/watermark.webp');
if(bytes.length<20||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')
  throw Error('R2_QA_SOURCE_NOT_WEBP');
const checksum=digest(bytes);
const s3=new S3Client({region:'auto',endpoint:'https://'+account+'.r2.cloudflarestorage.com',
  forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},maxAttempts:2});
const readHead=async obj=>{
  try{await s3.send(new HeadObjectCommand({Bucket:obj.Bucket,Key:obj.Key}));return 'PRESENT';}
  catch(e){if(absent(e))return 'ABSENT';throw Error('R2_QA_HEAD_'+obj.kind+'_'+classify(e));}
};
const cleanup=async ()=>{
  const errors=[];
  // Delete only the two random keys created/attempted by this run.
  for(const obj of objects){
    try{await s3.send(new DeleteObjectCommand({Bucket:obj.Bucket,Key:obj.Key}));}
    catch(e){errors.push('DELETE_'+obj.kind+'_'+classify(e));}
  }
  for(let i=1;i<=2;i++){
    for(const obj of objects){
      try{
        if(await readHead(obj)!=='ABSENT')errors.push('STILL_PRESENT_'+obj.kind+'_PASS_'+i);
      }catch(e){errors.push('ABSENCE_UNVERIFIED_'+obj.kind+'_PASS_'+i);}
    }
    if(errors.length===0)manifest.cleanupPasses=i;
  }
  manifest.cleanupVerified=errors.length===0;
  manifest.cleanupErrorCodes=errors;
};
let failure=null;
try {
  for(const obj of objects){
    if(await readHead(obj)!=='ABSENT')throw Error('R2_QA_UUID_COLLISION_ABORT');
  }
  for(const obj of objects){
    try{
      await s3.send(new PutObjectCommand({Bucket:obj.Bucket,Key:obj.Key,
        Body:bytes,ContentType:'image/webp',
        CacheControl:obj.kind==='private'?'private, no-store':'public, max-age=31536000, immutable',
        Metadata:{visibility:obj.kind==='private'?'private-original':'public-optimized-derivative'}}));
    }catch(e){throw Error('R2_QA_PUT_'+obj.kind+'_'+classify(e));}
  }
  for(const obj of objects){
    try{
      const result=await s3.send(new GetObjectCommand({Bucket:obj.Bucket,Key:obj.Key}));
      const read=Buffer.from(await result.Body.transformToByteArray());
      if(digest(read)!==checksum)throw Error('HASH_MISMATCH');
    }catch(e){throw Error('R2_QA_READBACK_'+obj.kind+'_'+classify(e));}
  }
  manifest.readbackVerified=true;save();
  let response;
  try {
    response=await fetch('https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/media/'+uid+'.webp',
      {headers:{'Cache-Control':'no-store'},signal:AbortSignal.timeout(25000)});
  }catch{throw Error('R2_QA_PUBLIC_MEDIA_NETWORK_FAILURE');}
  if(response.status!==200||!String(response.headers.get('Content-Type')).includes('image/webp'))
    throw Error('R2_QA_PUBLIC_MEDIA_HTTP_'+response.status);
  if(digest(Buffer.from(await response.arrayBuffer()))!==checksum)
    throw Error('R2_QA_PUBLIC_MEDIA_HASH_MISMATCH');
  manifest.publicRouteVerified=true;save();
}catch(e){failure=String(e.message||'R2_QA_FAILED');}
finally{
  try{await cleanup();}catch{manifest.cleanupVerified=false;failure=failure||'R2_QA_CLEANUP_EXCEPTION';}
  manifest.status=!failure&&manifest.readbackVerified&&manifest.publicRouteVerified&&manifest.cleanupVerified&&manifest.cleanupPasses===2
    ? 'PASS_REMOTE_R2_RUN_OWNED_LIFECYCLE':'NOT_ACCEPTED';
  manifest.errorCode=failure;
  manifest.finishedAtUtc=new Date().toISOString();save();
  s3.destroy();
}
console.info('[QA_ADMIN_R2_S3_CANARY] '+JSON.stringify({status:manifest.status,
  sourceSha:sha,protocol:'S3',bindingIsolationVerified:manifest.bindingIsolationVerified,
  readbackVerified:manifest.readbackVerified,publicRouteVerified:manifest.publicRouteVerified,
  cleanupPasses:manifest.cleanupPasses,cleanupVerified:manifest.cleanupVerified,
  errorCode:manifest.errorCode,cleanupErrorCodes:manifest.cleanupErrorCodes,productionTouched:false}));
if(manifest.status!=='PASS_REMOTE_R2_RUN_OWNED_LIFECYCLE')
  throw Error('R2_QA_NOT_ACCEPTED: '+(failure||'cleanup unverified'));
