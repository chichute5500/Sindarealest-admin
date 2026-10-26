/** Exact-source cohort photo counters in Production R2. READ-ONLY. */
import {S3Client,ListObjectsV2Command} from "@aws-sdk/client-s3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
const id=process.env.R2_PRODUCTION_ACCESS_KEY_ID||"",secret=process.env.R2_PRODUCTION_SECRET_ACCESS_KEY||"";
const check=(x,msg)=>{if(!x)throw Error(msg)};
const dbid=x=>x?.id||x?.database_id||"",bucket=x=>x?.name||x?.bucket_name||"";
async function api(path,body){
 const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{
  method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 const j=await r.json();check(r.ok&&j.success,"CLOUDFLARE_READ_FAILED");
 return j.result;
}
async function list(s3,b){
 let key="",out=new Set(),count=0;
 for(let n=0;n<15;n++){
  const x=await s3.send(new ListObjectsV2Command({Bucket:b,MaxKeys:1000,...(key?{ContinuationToken:key}:{})}));
  for(const a of x.Contents||[]){if(a.Key)out.add(a.Key);}
  count+=(x.Contents||[]).length;
  if(!x.IsTruncated)return out;
  check(x.NextContinuationToken,"R2_LIST_CONTINUATION_MISSING");key=x.NextContinuationToken;
 }
 throw Error("R2_LIST_OVER_15000");
}
check(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&
 process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&
 account&&token&&id&&secret,"READ_ONLY_GUARD");
const [p,t]=await Promise.all([
  api("/pages/projects/sindarealest-admin-preview"),api("/pages/projects/sindarealest2")]);
const pv=p.deployment_configs?.preview,pr=t.deployment_configs?.production;
const sourceDB=dbid(pv.d1_databases?.DB),targetDB=dbid(pr.d1_databases?.DB);
const img=bucket(pr.r2_buckets?.IMAGES),orig=bucket(pr.r2_buckets?.ORIGINALS);
check(sourceDB&&targetDB&&sourceDB!==targetDB&&img&&orig&&img!==orig,"PREVIEW_TARGET_ISOLATION");
const q=await api("/d1/database/"+encodeURIComponent(sourceDB)+"/query",{sql:"SELECT images_json, published, sku_verified, stock, fulfillment_type, created_at FROM products"});
const result=Array.isArray(q)?q[0]:q;check(result?.success,"D1_QUERY_NOT_SUCCESSFUL");
const rows=result.results||[];
let imgs=[];
for(const a of rows){
 if(a.published!==0||a.sku_verified!==0||a.stock!==null||
   a.fulfillment_type!=="unclassified"||!String(a.created_at).startsWith("2026-10-26"))continue;
 try{const v=JSON.parse(a.images_json);if(Array.isArray(v)&&v.length&&v.every(x=>/^\/media\/[0-9a-f-]+\.webp$/i.test(x)))imgs.push(...v);}catch{}
}
check(imgs.length===921&&new Set(imgs).size===921,"PREVIEW_IMPORT_UNEXPECTED");
const mediaIds=imgs.map(s=>s.slice("/media/".length,-".webp".length));
const client=new S3Client({endpoint:"https://"+account+".r2.cloudflarestorage.com",
 region:"auto",forcePathStyle:true,maxAttempts:2,credentials:{accessKeyId:id,secretAccessKey:secret}});
try{
 const [targetImages,targetOriginals]=await Promise.all([list(client,img),list(client,orig)]);
 const downloaded=mediaIds.filter(x=>targetImages.has(x+".webp")).length;
 const originals=mediaIds.filter(x=>
   ["jpg","jpeg","png","webp"].some(ext=>targetOriginals.has("private-originals/"+x+"."+ext))).length;
 console.log("R2_TARGET_COPY_PROGRESS="+JSON.stringify({
   operation:"R2_PRODUCTION_READ_ONLY_PROGRESS",expectedEach:921,
   importedDerivativesPresent:downloaded,importedOriginalsPresent:originals,
   productionWrites:0,previewWrites:0,queriedBuckets:2
 }));
}finally{client.destroy();}
