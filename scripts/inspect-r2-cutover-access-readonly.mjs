/** Read-only bucket permission probe. No list of keys or bucket names in logs. */
import { S3Client,HeadBucketCommand } from "@aws-sdk/client-s3";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
const a=process.env.R2_ACCESS_KEY_ID||"",s=process.env.R2_SECRET_ACCESS_KEY||"";
const assert=(x,m)=>{if(!x)throw Error(m)};
const bucket=x=>x?.name||x?.bucket_name||"",id=x=>x?.id||x?.database_id||"";
async function cf(project){
 const res=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/pages/projects/"+project,{
  headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)
 });const data=await res.json();
 assert(res.ok&&data.success,"CLOUDFLARE_METADATA_ACCESS_FAILED");
 return data.result;
}
assert(process.env.GITHUB_REPOSITORY==="chichute5500/Sindarealest-admin"&&process.env.GITHUB_REF==="refs/heads/audit/import-218-921-readonly-2026-10-26"&&a&&s&&token&&account,"GUARD");
const [preview,production]=await Promise.all([cf("sindarealest-admin-preview"),cf("sindarealest2")]);
const pv=preview?.deployment_configs?.preview,prod=production?.deployment_configs?.production;
assert(preview?.name==="sindarealest-admin-preview"&&production?.name==="sindarealest2"&&
 id(pv?.d1_databases?.DB)!==id(prod?.d1_databases?.DB),"SEPARATION");
const buckets=[
 ["preview_images",bucket(pv?.r2_buckets?.IMAGES)],
 ["preview_originals",bucket(pv?.r2_buckets?.ORIGINALS)],
 ["production_images",bucket(prod?.r2_buckets?.IMAGES)],
 ["production_originals",bucket(prod?.r2_buckets?.ORIGINALS)],
];
assert(buckets.every(x=>x[1])&&new Set(buckets.map(x=>x[1])).size===4,"BUCKETS_DIFFERENT");
const r2=new S3Client({endpoint:"https://"+account+".r2.cloudflarestorage.com",
 region:"auto",forcePathStyle:true,maxAttempts:1,credentials:{accessKeyId:a,secretAccessKey:s}});
const output={source:"R2_BOUNDED_READ_PERMISSION_ONLY",productionMutations:0,checks:{}};
try{await Promise.all(buckets.map(async([label,b])=>{try{
 await r2.send(new HeadBucketCommand({Bucket:b}),{abortSignal:AbortSignal.timeout(12000)});
 output.checks[label]="HEAD_ACCESSIBLE";
}catch(e){output.checks[label]=String(e?.name||"RequestError").slice(0,60);}}));}
finally{r2.destroy();}
console.log("R2_READ_ACCESS_MATRIX="+JSON.stringify(output));
