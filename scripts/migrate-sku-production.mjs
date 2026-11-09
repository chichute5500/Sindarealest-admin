// Apply only the verified sneaker SKU correction to the exact Production D1.
// This script runs solely from a manually dispatched GitHub Actions workflow.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdirSync,mkdtempSync,rmSync,writeFileSync,statSync,copyFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";

const repository="chichute5500/Sindarealest-admin";
const project="sindarealest2";
const previewAdmin="sindarealest-admin-preview";
const databaseName="sindarealest-db";
const migration="0024_correct_misclassified_sneaker_sku.sql";
const confirmation="APPLY-SKU-0024-TO-sindarealest-db";

async function main(){
  assert.equal(process.env.GITHUB_REPOSITORY,repository,"Wrong repository");
  assert.equal(process.env.GITHUB_REF,"refs/heads/main","Production D1 migration can run from main only");
  assert.equal(process.env.GITHUB_EVENT_NAME,"workflow_dispatch","Migration must be manually dispatched");
  assert.match(process.env.GITHUB_SHA||"",/^[0-9a-f]{40}$/i,"Invalid workflow source SHA");
  assert.equal(process.env.SKU_MIGRATION_CONFIRMATION,confirmation,"Missing exact migration authorization phrase");
  const operation=process.env.SKU_MIGRATION_OPERATION||"preflight";
  assert.ok(["preflight","apply"].includes(operation),"Operation must be preflight or apply");
  const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
  assert.match(account,/^[a-f0-9]{32}$/i,"Cloudflare account is unavailable");
  assert.ok(token.length>=10,"Cloudflare API credential is unavailable");

  const base="https://api.cloudflare.com/client/v4/accounts/"+account;
  async function cf(path,method="GET",body){
    const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},
      ...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error("Cloudflare preflight failed (HTTP "+response.status+")");
    const result=await response.json();assert.equal(result?.success,true,"Cloudflare API returned failure");return result.result;
  }
  const [live,adminPreview]=await Promise.all([
    cf("/pages/projects/"+project),cf("/pages/projects/"+previewAdmin)
  ]);
  assert.equal(live?.name,project,"Wrong Storefront Pages project");
  assert.equal(live?.production_branch,"main","Storefront Production branch is not main");
  assert.equal(adminPreview?.name,previewAdmin,"Wrong isolated Admin Preview project");
  const productionId=live?.deployment_configs?.production?.d1_databases?.DB?.id;
  const storePreviewId=live?.deployment_configs?.preview?.d1_databases?.DB?.id;
  const adminPreviewId=adminPreview?.deployment_configs?.preview?.d1_databases?.DB?.id;
  assert.match(productionId||"",/^[a-f0-9-]{36}$/i,"Production D1 binding unavailable");
  assert.match(storePreviewId||"",/^[a-f0-9-]{36}$/i,"Storefront Preview D1 binding unavailable");
  assert.match(adminPreviewId||"",/^[a-f0-9-]{36}$/i,"Admin Preview D1 binding unavailable");
  assert.notEqual(productionId.toLowerCase(),adminPreviewId.toLowerCase(),"Admin Preview D1 matches Production D1");
  const meta=await cf("/d1/database/"+encodeURIComponent(productionId));
  assert.equal(meta?.uuid||meta?.id,productionId,"Production D1 identity mismatch");
  assert.equal(meta?.name,databaseName,"Production D1 name mismatch");

  async function query(sql){
    const result=await cf("/d1/database/"+encodeURIComponent(productionId)+"/query","POST",{sql});
    assert.ok(Array.isArray(result)&&Array.isArray(result[0]?.results),"Unexpected D1 query response");
    return result[0].results;
  }
  const ledger=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'");
  assert.equal(ledger.length,1,"Production migration ledger missing; refusing to infer schema state");
  const appliedRows=await query("SELECT name FROM d1_migrations WHERE name IN ('0008_product_sku_verification.sql','0018_payment_delivery_settlement.sql','0019_manual_warranties.sql','0020_manual_warranty_contacts.sql','0021_warranty_policy_snapshots.sql','0022_sepay_payment_gateway.sql','0023_sepay_checkout_intents.sql','"+migration+"')");
  const applied=new Set(appliedRows.map(row=>String(row.name)));
  for(const prerequisite of ["0008_product_sku_verification.sql","0018_payment_delivery_settlement.sql","0019_manual_warranties.sql","0020_manual_warranty_contacts.sql","0021_warranty_policy_snapshots.sql","0022_sepay_payment_gateway.sql","0023_sepay_checkout_intents.sql"])
    assert.ok(applied.has(prerequisite),"Required earlier migration is not recorded: "+prerequisite);

  const duplicate=await query("SELECT id,sku,title,category FROM products WHERE upper(sku)='SD-SN113' LIMIT 2");
  assert.ok(duplicate.length<=1,"Duplicate SD-SN113 records detected");
  const candidates=await query("SELECT id,sku,title,category,sku_verified FROM products WHERE upper(sku)='SD-GL062' LIMIT 2");
  assert.ok(candidates.length<=1,"Multiple SD-GL062 rows detected");
  if(candidates.length){
    const row=candidates[0];
    assert.ok(["sneakers","sneaker"].includes(String(row.category||"").toLowerCase()),"SD-GL062 is not in the sneaker category; refusing mutation");
    assert.ok(String(row.title||"").includes("#113"),"SD-GL062 title does not identify sample #113; refusing mutation");
    assert.equal(duplicate.length,0,"SD-SN113 already exists beside the legacy row; refusing to create a collision");
  }else{
    assert.equal(duplicate.length,1,"Neither the guarded old SKU nor the corrected SKU exists");
    assert.ok(String(duplicate[0].title||"").includes("#113"),"Existing SD-SN113 row does not identify sample #113");
    assert.ok(["sneakers","sneaker"].includes(String(duplicate[0].category||"").toLowerCase()),"Existing SD-SN113 row is not a sneaker");
  }
  const alreadyApplied=applied.has(migration);
  if(alreadyApplied){
    assert.equal(candidates.length,0,"Migration is recorded but legacy SKU remains; manual review required");
    console.log("PASS: SKU migration 0024 is recorded and sample #113 has the corrected SKU; no Production changes made.");
    return;
  }
  if(!candidates.length){
    console.log("PASS: sample #113 already has SD-SN113 and migration 0024 is pending; no Production changes made.");
    return;
  }
  if(operation==="preflight"){
    console.log("PASS: read-only preflight matched one sneaker sample #113 (SD-GL062); Production D1 unchanged.");
    console.log("Storefront Preview D1 shares Production D1: "+String(storePreviewId.toLowerCase()===productionId.toLowerCase())+".");
    return;
  }

  const bookmarkResult=await cf("/d1/database/"+encodeURIComponent(productionId)+"/time_travel/bookmark");
  const bookmark=String(bookmarkResult?.bookmark||"");
  assert.ok(bookmark.length>12,"No Cloudflare D1 Time Travel bookmark; refusing migration");
  const folder=mkdtempSync(join(tmpdir(),"sd-sku-production-"));
  try{
    const migrationDir=join(folder,"migrations");mkdirSync(migrationDir);
    copyFileSync(resolve("migrations",migration),join(migrationDir,migration));
    const config=join(folder,"wrangler.toml"),backup=join(folder,"before-sku-0024.sql");
    writeFileSync(config,[
      'name = "sd-sku-production-migration"','compatibility_date = "2026-10-12"',
      '[[d1_databases]]','binding = "DB"','database_name = '+JSON.stringify(databaseName),
      'database_id = '+JSON.stringify(productionId),'migrations_dir = '+JSON.stringify(migrationDir)
    ].join("\n")+"\n",{mode:0o600});
    const wrangler=resolve("node_modules/wrangler/bin/wrangler.js");
    function run(args,label){
      const result=spawnSync(process.execPath,[wrangler,"d1",...args,"--config",config],{encoding:"utf8",timeout:180000,maxBuffer:8*1024*1024,
        env:{...process.env,CLOUDFLARE_SEND_METRICS:"false"}});
      if(result.error||result.status!==0){
        const raw=[result.stderr,result.stdout].filter(Boolean).join("\n").replace(/\u001b\[[0-9;]*m/g,"");
        const safe=raw.split(/\r?\n/).map(line=>line.trim()).filter(line=>/\b(error|failed|denied|could not|cannot|unable|refused)\b|✘/i.test(line)).slice(0,3)
          .map(line=>line.replace(/Bearer\s+\S+/gi,"Bearer [redacted]").replace(/\b[A-F0-9]{32,}\b/gi,"[redacted-id]")
            .replace(/\b[A-Za-z0-9_-]{48,}\b/g,"[redacted-token]").replace(/https?:\/\/\S+/gi,"[url]").slice(0,240)).join(" | ");
        throw Error(label+" failed (exit "+String(result.status)+"); "+(safe||String(result.error?.code||"no safe error line")));
      }
      return result.stdout;
    }
    run(["export",databaseName,"--remote","--skip-confirmation","--output",backup],"Private pre-migration D1 export");
    assert.ok(statSync(backup).size>1024,"Private pre-migration D1 export is empty");
    console.log("PASS: Time Travel bookmark and private runner-local backup captured; product data omitted from logs.");
    run(["migrations","apply","DB","--remote"],"Apply only SKU migration 0024");
  }finally{rmSync(folder,{recursive:true,force:true});}

  const verified=await query("SELECT id,sku,title,category,sku_verified FROM products WHERE upper(sku)='SD-SN113' LIMIT 2");
  assert.equal(verified.length,1,"Corrected SKU verification failed");
  assert.ok(String(verified[0].title||"").includes("#113"),"Corrected SKU points to a different product");
  assert.ok(["sneakers","sneaker"].includes(String(verified[0].category||"").toLowerCase()),"Corrected SKU is not a sneaker");
  const recorded=await query("SELECT name FROM d1_migrations WHERE name='"+migration+"'");
  assert.equal(recorded.length,1,"SKU migration ledger verification failed");
  console.log("PASS: Production SKU migration 0024 applied and verified for one sneaker sample #113.");
  if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,
    "\n### Production SKU correction PASS\nTarget: verified `sindarealest-db` bound to `sindarealest2` Production.\nApplied and verified migration `0024_correct_misclassified_sneaker_sku.sql`; only the guarded sample #113 SKU changed.\nRecovery: Cloudflare Time Travel bookmark `"+bookmark+"` and private temporary runner export (deleted at job end).\nStorefront Preview shares Production D1: "+String(storePreviewId.toLowerCase()===productionId.toLowerCase())+".\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error=>{console.error("PRODUCTION SKU MIGRATION BLOCKED/FAILED:",error.message);process.exitCode=1;});
