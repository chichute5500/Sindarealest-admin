/**
 * SAFE, RESUMABLE R2 MEDIA STAGING ONLY.
 * Copies 921 verified WebP derivatives + 921 original images from isolated
 * Preview to Production under unchanged UUID keys. No D1 changes or deletes.
 * Run manually after setting the separate Production-scoped R2 credentials.
 */
import {createHash} from "node:crypto";
import {S3Client,HeadBucketCommand,HeadObjectCommand,GetObjectCommand,PutObjectCommand} from "@aws-sdk/client-s3";

const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const cloudToken=process.env.CLOUDFLARE_API_TOKEN||"";
const pKey=process.env.R2_ACCESS_KEY_ID||"";
const pSecret=process.env.R2_SECRET_ACCESS_KEY||"";
const tKey=process.env.R2_PRODUCTION_ACCESS_KEY_ID||"";
const tSecret=process.env.R2_PRODUCTION_SECRET_ACCESS_KEY||"";
const expected="refs/heads/audit/import-218-921-readonly-2026-10-26";
const result={scope:"PRODUCTION_R2_STAGING_ONLY",expectedModels:218,expectedPhotos:921,
  sourcePhotos:0,createdOptimized:0,createdOriginal:0,alreadyStagedOptimized:0,
  alreadyStagedOriginal:0,confirmedOptimized:0,confirmedOriginal:0,
  databaseWrites:0,productPublished:0,objectsDeleted:0,productionDeployment:0,done:false};
function check(x,msg){if(!x)throw Error(msg);}
const id=v=>v?.id||v?.database_id||"";
const bucket=v=>v?.name||v?.bucket_name||"";
async function cf(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",
  headers:{Authorization:"Bearer "+cloudToken,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(30000)});
 const json=await r.json().catch(()=>null);
 check(r.ok&&json?.success===true,"CLOUDFLARE_ACCESS_OR_METADATA_UNAVAILABLE");
 return json.result;
}
async function safeSelect(db,sql){
 check(/^\s*SELECT\b/i.test(sql)&&!sql.includes(";"),"UNSAFE_QUERY");
 const x=await cf("/d1/database/"+encodeURIComponent(db)+"/query",{sql});
 const t=Array.isArray(x)?x[0]:x;
 check(t?.success===true&&Array.isArray(t.results),"D1_QUERY_UNAVAILABLE");
 return t.results;
}
function imageList(row){try{const x=JSON.parse(row.images_json||"[]");return Array.isArray(x)?x:[];}catch{return [];}}
const pathname=/^\/media\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp)$/i;
const digest=b=>createHash("sha256").update(b).digest("hex");
async function getBytes(s3,b,key){
 const obj=await s3.send(new GetObjectCommand({Bucket:b,Key:key}),{abortSignal:AbortSignal.timeout(60000)});
 const bytes=Buffer.from(await obj.Body.transformToByteArray());
 check(bytes.length>0&&bytes.length<=25*1024*1024,"R2_UNEXPECTED_OBJECT_LENGTH");
 return {bytes,meta:obj.Metadata||{},type:obj.ContentType||"application/octet-stream",cache:obj.CacheControl||""};
}
function is404(e){return Number(e?.$metadata?.httpStatusCode)===404||/NoSuchKey|NotFound/i.test(String(e?.name||""));}
async function copyFile(src,sourceBucket,dst,targetBucket,key,role){
 const original=await getBytes(src,sourceBucket,key);
 if(role==="optimized")check(original.type==="image/webp"||key.endsWith(".webp"),"INVALID_OPTIMIZED_MEDIA");
 if(role==="original")check(key.startsWith("private-originals/"),"NON_PRIVATE_ORIGINAL_PATH");
 let exists=false;
 try{
  const meta=await dst.send(new HeadObjectCommand({Bucket:targetBucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});
  check(meta.ContentLength===original.bytes.length,"EXISTING_TARGET_KEY_LENGTH_COLLISION");
  exists=true;
 }catch(e){if(!is404(e))throw e;}
 if(!exists){
  await dst.send(new PutObjectCommand({
   Bucket:targetBucket,Key:key,Body:original.bytes,
   ContentType:original.type,CacheControl:role==="original"?"private, no-store":"public, max-age=31536000, immutable",
   Metadata:{...original.meta,"sha256":digest(original.bytes),"source":"owner-import-preview-2026-10-26"}
  }),{abortSignal:AbortSignal.timeout(90000)});
 }
 const verified=await getBytes(dst,targetBucket,key);
 check(digest(verified.bytes)===digest(original.bytes),"R2_COPIED_BYTES_DIFFER");
 return exists;
}
async function main(){
 check(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
  process.env.GITHUB_REF===expected&&/^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||"")&&
  /^[a-f0-9]{32}$/i.test(account)&&cloudToken&&pKey&&pSecret&&tKey&&tSecret,
  "BRANCH_OR_SEPARATE_PRODUCTION_KEY_REQUIRED");
 const [preview,prod]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),
  cf("/pages/projects/sindarealest2")]);
 const pv=preview?.deployment_configs?.preview,tv=prod?.deployment_configs?.production;
 const pDb=id(pv?.d1_databases?.DB),tDb=id(tv?.d1_databases?.DB);
 const pImage=bucket(pv?.r2_buckets?.IMAGES),pOriginal=bucket(pv?.r2_buckets?.ORIGINALS);
 const tImage=bucket(tv?.r2_buckets?.IMAGES),tOriginal=bucket(tv?.r2_buckets?.ORIGINALS);
 check(preview?.name==="sindarealest-admin-preview"&&prod?.name==="sindarealest2"&&
   pDb&&tDb&&pDb!==tDb&&[pImage,pOriginal,tImage,tOriginal].every(Boolean)&&
   new Set([pImage,pOriginal,tImage,tOriginal]).size===4,"ISOLATION_GUARD_FAILED");
 const [rows,existing]=await Promise.all([
  safeSelect(pDb,"SELECT id,sku,published,stock,sku_verified,fulfillment_type,images_json,image_colors_json,created_at FROM products"),
  safeSelect(tDb,"SELECT id,sku FROM products")
 ]);
 const cohort=rows.filter(r=>r.published===0&&r.sku_verified===0&&r.stock===null&&
  r.fulfillment_type==="unclassified"&&String(r.created_at).startsWith("2026-10-26")&&
  imageList(r).length>0&&imageList(r).every(x=>pathname.test(String(x)))&&
  (()=>{try{return JSON.parse(r.image_colors_json).length===imageList(r).length}catch{return false}})());
 const pictures=cohort.flatMap(r=>imageList(r));
 check(cohort.length===218&&pictures.length===921&&new Set(pictures).size===921,"PREVIEW_COHORT_MISMATCH");
 const ids=new Set(existing.map(r=>r.id)),skus=new Set(existing.map(r=>r.sku));
 check(cohort.every(r=>!ids.has(r.id)&&!skus.has(r.sku)),"PRODUCTION_SKU_OR_ID_COLLISION");
 result.sourcePhotos=pictures.length;
 const src=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
  forcePathStyle:true,maxAttempts:3,credentials:{accessKeyId:pKey,secretAccessKey:pSecret}});
 const dst=new S3Client({region:"auto",endpoint:"https://"+account+".r2.cloudflarestorage.com",
  forcePathStyle:true,maxAttempts:3,credentials:{accessKeyId:tKey,secretAccessKey:tSecret}});
 try{
  // Explicitly fail before any writing if Production keys lack bucket access.
  await Promise.all([tImage,tOriginal].map(Bucket=>dst.send(new HeadBucketCommand({Bucket}),{abortSignal:AbortSignal.timeout(15000)})));
  let cursor=0,firstError=null;
  async function worker(){
    while(cursor<pictures.length&&!firstError){
      const i=cursor++,key=pathname.exec(pictures[i])[1];
      try{
       const img=await src.send(new HeadObjectCommand({Bucket:pImage,Key:key}),{abortSignal:AbortSignal.timeout(18000)});
       const original=img.Metadata?.originalkey||img.Metadata?.originalKey;
       check(/^private-originals\/[0-9a-f-]+\.(?:jpg|jpeg|png|webp)$/i.test(original||""),"ORIGINAL_LINK_MISSING");
       const existedOriginal=await copyFile(src,pOriginal,dst,tOriginal,original,"original");
       if(existedOriginal)result.alreadyStagedOriginal++;else result.createdOriginal++;
       result.confirmedOriginal++;
       const existedOptimized=await copyFile(src,pImage,dst,tImage,key,"optimized");
       if(existedOptimized)result.alreadyStagedOptimized++;else result.createdOptimized++;
       result.confirmedOptimized++;
      }catch(e){firstError={at:i+1,error:String(e?.message||e).slice(0,140)};}
    }
  }
  await Promise.all(Array.from({length:5},()=>worker()));
  if(firstError)throw Error("TRANSFER_STOPPED_AT_ITEM_"+firstError.at+": "+firstError.error);
  check(result.confirmedOptimized===921&&result.confirmedOriginal===921,"COPY_NOT_COMPLETE");
  result.done=true;
 }finally{src.destroy();dst.destroy();}
}
try{await main();}catch(e){result.error=String(e.message||e).slice(0,180);}
console.log("R2_STAGE_REPORT="+JSON.stringify(result));
if(!result.done)process.exitCode=1;
