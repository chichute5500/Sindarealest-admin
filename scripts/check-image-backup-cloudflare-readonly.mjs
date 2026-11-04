/**
 * READ-ONLY Cloudflare preflight for scheduled SinDarealest image backups.
 * No Cloudflare POST/PUT/PATCH/DELETE and no D1/R2 object queries or writes.
 * Fail closed on any missing permission or unexpected binding/privacy state.
 */
const expected = Object.freeze({
  project: "sindarealest2",
  productionBranch: "main",
  bindings: Object.freeze({
    IMAGES: "sindarealest-images",
    ORIGINALS: "sindarealest-original",
    IMAGE_BACKUPS: "sin-images-backup",
  }),
  database: "sindarealest-db",
});
const identity = value => typeof value === "string" ? value.trim() : "";

export function assessImageBackupConfig(pagesPayload, managedPayload, customPayload, d1Payload) {
  const blockers=[];
  const project=pagesPayload?.result;
  const bindings=project?.deployment_configs?.production;
  if (pagesPayload?.success!==true || project?.name!==expected.project ||
      project?.production_branch!==expected.productionBranch) blockers.push("WRONG_PAGES_PROJECT_OR_PRODUCTION_BRANCH");
  const seen = new Set();
  for (const [binding, name] of Object.entries(expected.bindings)) {
    const row=bindings?.r2_buckets?.[binding];
    const actual=identity(row?.name || row?.bucket_name);
    if (actual!==name) blockers.push("INCORRECT_BINDING_"+binding);
    if (actual && seen.has(actual)) blockers.push("SHARED_SOURCE_AND_BACKUP_BUCKET");
    seen.add(actual);
  }
  const dbId=identity(bindings?.d1_databases?.DB?.id || bindings?.d1_databases?.DB?.database_id);
  if (!/^[a-f0-9-]{36}$/i.test(dbId)) blockers.push("D1_BINDING_NOT_VERIFIED");
  const matches=Array.isArray(d1Payload?.result)?d1Payload.result.filter(r=>r.name===expected.database && r.uuid===dbId):[];
  if (d1Payload?.success!==true || matches.length!==1) blockers.push("D1_DATABASE_ID_MISMATCH_OR_PERMISSION");
  if (managedPayload?.success!==true || managedPayload?.result?.enabled!==false)
    blockers.push("R2_BACKUP_MANAGED_PUBLIC_ACCESS_NOT_VERIFIED_DISABLED");
  const domains=customPayload?.result?.domains;
  if (customPayload?.success!==true || !Array.isArray(domains) || domains.some(x=>x?.enabled===true))
    blockers.push("R2_BACKUP_CUSTOM_DOMAIN_NOT_VERIFIED_PRIVATE");
  return {ok:blockers.length===0,blockers,checkedBindings:Object.keys(expected.bindings),
    details:"Read-only Production identity and backup privacy preflight; no data writes."};
}

async function readApi(path,{accountId,token}) {
  const url="https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(accountId)+path;
  const res=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error("Cloudflare read-only verification unavailable: HTTP "+res.status);
  const payload=await res.json();
  if(payload?.success!==true)throw Error("Cloudflare returned unsuccessful read-only verification.");
  return payload;
}

export async function checkCurrentCloudflare(env=process.env) {
  const accountId=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
  if(!accountId || !token) throw Error("Missing Cloudflare read-only verification credentials.");
  const common={accountId,token};
  const project=await readApi("/pages/projects/sindarealest2",common);
  const root="/r2/buckets/sin-images-backup/domains/";
  const [managed,custom,d1]=await Promise.all([
    readApi(root+"managed",common),
    readApi(root+"custom",common),
    readApi("/d1/database?name=sindarealest-db&per_page=100",common),
  ]);
  const report=assessImageBackupConfig(project,managed,custom,d1);
  if(!report.ok)throw Error("Cloudflare image backup deployment blocked: "+report.blockers.join(", "));
  return report;
}

if (process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href) {
  try {
    const result=await checkCurrentCloudflare();
    console.log("PASS: verified Production DB/R2 identities, three distinct buckets and private IMAGE_BACKUPS. No Cloudflare resources were changed.");
    console.log(JSON.stringify(result));
  }catch(err){
    console.error("BLOCKED: "+String(err?.message||"Preflight failed").slice(0,380));
    process.exitCode=1;
  }
}
