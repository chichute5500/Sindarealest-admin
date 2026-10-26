/**
 * One-time private production D1 backup to production's PRIVATE R2 originals bucket.
 * Stores full SQL, including order/customer history, only in access-controlled R2.
 * No SQL data logged, no public GitHub artifacts, NO production D1 changes.
 */
import { createHash,randomUUID } from "node:crypto";
import { S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand } from "@aws-sdk/client-s3";
import { setTimeout as sleep } from "node:timers/promises";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const token=process.env.CLOUDFLARE_API_TOKEN||"";
const access=process.env.R2_PRODUCTION_ACCESS_KEY_ID||"";
const secret=process.env.R2_PRODUCTION_SECRET_ACCESS_KEY||"";
const output={operation:"PRODUCTION_D1_FULL_SQL_PRIVATE_BACKUP_ONLY",productionWritesToD1:0,productChanges:0,
  productionR2PrivateBackupWritten:false,backupVerified:false,success:false};
const requireSafe=(x,msg)=>{if(!x)throw Error(msg)};
const id=x=>x?.id||x?.database_id||"";
const bucket=x=>x?.name||x?.bucket_name||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,
  redirect:"error",signal:AbortSignal.timeout(30000)
 });
 const j=await r.json().catch(()=>null);
 requireSafe(r.ok&&j?.success,"CLOUDFLARE_METADATA_OR_EXPORT_HTTP_"+r.status);
 return j.result;
}
async function main(){
 requireSafe(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin" &&
   process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26" &&
   /^[0-9a-f]{40}$/i.test(process.env.GITHUB_SHA||"")&&
   /^[0-9a-f]{32}$/i.test(account)&&token&&access&&secret,"SOURCE_OR_CREDENTIAL_GUARD");
 const [p,t]=await Promise.all([
   cf("/pages/projects/sindarealest-admin-preview"),
   cf("/pages/projects/sindarealest2")
 ]);
 const pv=p?.deployment_configs?.preview,pr=t?.deployment_configs?.production;
 const pid=id(pv?.d1_databases?.DB),tid=id(pr?.d1_databases?.DB);
 const privateBucket=bucket(pr?.r2_buckets?.ORIGINALS);
 const all=[bucket(pv?.r2_buckets?.IMAGES),bucket(pv?.r2_buckets?.ORIGINALS),bucket(pr?.r2_buckets?.IMAGES),privateBucket];
 requireSafe(p?.name==="sindarealest-admin-preview"&&t?.name==="sindarealest2"&&
   pid&&tid&&pid!==tid&&all.every(Boolean)&&new Set(all).size===4,
   "PRODUCTION_IDENTITY_OR_PRIVATE_R2_ISOLATION_UNVERIFIED");
 const url="/d1/database/"+encodeURIComponent(tid)+"/export";
 let state=await cf(url,{output_format:"polling"});
 for(let i=0;i<120&&state?.status!=="complete"&&state?.status!=="error";i++){
   requireSafe(state?.at_bookmark,"D1_EXPORT_MISSING_BOOKMARK");
   await sleep(2000);
   state=await cf(url,{output_format:"polling",current_bookmark:state.at_bookmark});
 }
 requireSafe(state?.status==="complete"&&!state?.error,"D1_EXPORT_INCOMPLETE");
 const signed=state?.result?.signed_url;
 requireSafe(typeof signed==="string"&&signed.startsWith("https://"),"D1_EXPORT_SIGNED_URL_MISSING");
 const dl=await fetch(signed,{signal:AbortSignal.timeout(60000),redirect:"error"});
 requireSafe(dl.ok,"D1_EXPORT_DOWNLOAD_FAILED_"+dl.status);
 const declared=Number(dl.headers.get("content-length")||0);
 requireSafe(declared<=150*1024*1024,"D1_EXPORT_EXCEEDS_150_MB");
 const bytes=Buffer.from(await dl.arrayBuffer());
 requireSafe(bytes.length>100&&bytes.length<=150*1024*1024,"D1_EXPORT_INVALID_BYTE_SIZE");
 const sql=bytes.toString("utf8");
 requireSafe(/\bCREATE TABLE\b/i.test(sql)&&/\bINSERT INTO\b|\bINSERT OR\b/i.test(sql)&&
  /products/i.test(sql)&&/orders/i.test(sql)&&/customers/i.test(sql),"FULL_SQL_BACKUP_INTEGRITY_FAILED");
 const digest=createHash("sha256").update(bytes).digest("hex");
 const dest="private-catalog-cutover-backups/2026-10-26/full-d1-"+randomUUID()+".sql";
 const s3=new S3Client({region:"auto",forcePathStyle:true,
  endpoint:"https://"+account+".r2.cloudflarestorage.com",maxAttempts:2,
  credentials:{accessKeyId:access,secretAccessKey:secret}});
 try {
  await s3.send(new PutObjectCommand({Bucket:privateBucket,Key:dest,Body:bytes,
    ContentType:"application/sql",CacheControl:"private, no-store",
    Metadata:{"visibility":"private-backup","sha256":digest,"source":"production-d1"}}));
  output.productionR2PrivateBackupWritten=true;
  const head=await s3.send(new HeadObjectCommand({Bucket:privateBucket,Key:dest}));
  requireSafe(head.ContentLength===bytes.length&&head.Metadata?.sha256===digest,"R2_BACKUP_HEAD_MISMATCH");
  const result=await s3.send(new GetObjectCommand({Bucket:privateBucket,Key:dest}));
  const verified=Buffer.from(await result.Body.transformToByteArray());
  requireSafe(createHash("sha256").update(verified).digest("hex")===digest,"R2_BACKUP_READBACK_SHA_MISMATCH");
  output.backupVerified=true;output.success=true;output.backupKey=dest;output.sizeBytes=bytes.length;
  output.sha256=digest;output.privateBucketRole="PRODUCTION_ORIGINALS";
 }finally{s3.destroy();}
}
try{await main();}catch(e){output.error=String(e.message||e).slice(0,140);}
console.log("SAFE_PRIVATE_PRODUCTION_D1_BACKUP="+JSON.stringify(output));
if(!output.success)process.exitCode=1;
