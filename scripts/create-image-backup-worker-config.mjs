/**
 * Creates an ephemeral Wrangler JSON config AFTER live read-only Cloudflare
 * verification. Never embeds production D1 ids or secrets in git.
 */
import {writeFileSync} from "node:fs";
import {checkCurrentCloudflare} from "./check-image-backup-cloudflare-readonly.mjs";

export function makeImageBackupWorkerConfig(databaseId) {
  if(typeof databaseId!=="string"||!/^[a-f0-9-]{36}$/i.test(databaseId))
    throw Error("Production D1 id cannot be verified.");
  return {
    name:"sindarealest-image-backup",
    main:"workers/image-backup-worker.js",
    compatibility_date:"2026-10-01",
    workers_dev:false,
    triggers:{crons:["*/5 * * * *"]},
    // Read-only Cloudflare preflight must PASS before generating this gate.
    vars:{IMAGE_BACKUP_BUCKET_VERIFIED:"true"},
    d1_databases:[{binding:"DB",database_name:"sindarealest-db",database_id:databaseId}],
    r2_buckets:[
      {binding:"IMAGES",bucket_name:"sindarealest-images"},
      {binding:"ORIGINALS",bucket_name:"sindarealest-original"},
      {binding:"IMAGE_BACKUPS",bucket_name:"sin-images-backup"},
    ],
  };
}

export async function main(env=process.env) {
  const result=await checkCurrentCloudflare(env);
  if(result.ok!==true)throw Error("Cloudflare preflight did not PASS.");
  const accountId=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
  const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(accountId)+"/pages/projects/sindarealest2",{
    headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000),
  });
  if(!response.ok)throw Error("Failed to reread Production Pages bindings.");
  const pages=await response.json();
  const d1=pages?.result?.deployment_configs?.production?.d1_databases?.DB;
  const config=makeImageBackupWorkerConfig(d1?.id||d1?.database_id);
  const file=env.IMAGE_BACKUP_WORKER_CONFIG_PATH||".wrangler-image-backup.generated.json";
  if(file!==".wrangler-image-backup.generated.json")throw Error("Unsafe generated configuration destination.");
  writeFileSync(file,JSON.stringify(config,null,2)+"\n",{mode:0o600,flag:"wx"});
  console.log("PASS: created ephemeral Worker config for three distinct R2 bindings, verified D1 and private backup R2.");
  console.log("No secrets, source object keys or Cloudflare account id were written into the generated config.");
}

if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
  try{await main()}catch(error){console.error("BLOCKED: "+String(error?.message||"Invalid Worker config").slice(0,280));process.exitCode=1}
}
