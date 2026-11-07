// Apply only SePay migrations 0022/0023 to the verified Production D1.
// This script is intentionally gated to one manual GitHub Actions invocation.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {copyFileSync,mkdirSync,mkdtempSync,rmSync,writeFileSync,statSync,readdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";

const repository="chichute5500/Sindarealest-admin";
const site="sindarealest2";
const previewSite="sindarealest-admin-preview";
const databaseName="sindarealest-db";
const targetMigrations=["0022_sepay_payment_gateway.sql","0023_sepay_checkout_intents.sql"];
const prerequisites=["0018_payment_delivery_settlement.sql","0019_manual_warranties.sql","0020_manual_warranty_contacts.sql","0021_warranty_policy_snapshots.sql"];

export function assertProductionIdentity(live,previewAdmin,meta){
  assert.equal(live?.name,site,"Wrong Production Pages project");
  assert.equal(live?.production_branch,"main","Production branch is not main");
  assert.equal(previewAdmin?.name,previewSite,"Wrong Admin Preview Pages project");
  const productionId=live?.deployment_configs?.production?.d1_databases?.DB?.id;
  const storePreviewId=live?.deployment_configs?.preview?.d1_databases?.DB?.id;
  const adminPreviewId=previewAdmin?.deployment_configs?.preview?.d1_databases?.DB?.id;
  assert.match(productionId||"",/^[a-f0-9-]{36}$/i,"Production D1 binding is missing");
  assert.match(adminPreviewId||"",/^[a-f0-9-]{36}$/i,"Admin Preview D1 binding is missing");
  assert.notEqual(productionId.toLowerCase(),adminPreviewId.toLowerCase(),"Production D1 matches Admin Preview D1");
  assert.equal(meta?.uuid||meta?.id,productionId,"Production D1 metadata identity mismatch");
  assert.equal(meta?.name,databaseName,"Production D1 name mismatch");
  return {id:productionId,name:databaseName,storePreviewSharesProduction:storePreviewId?.toLowerCase()===productionId.toLowerCase()};
}

async function main(){
  assert.equal(process.env.GITHUB_REPOSITORY,repository,"Wrong repository");
  assert.equal(process.env.GITHUB_REF,"refs/heads/main","Production migration can run from main only");
  assert.equal(process.env.GITHUB_EVENT_NAME,"workflow_dispatch","Production migration must be manually dispatched");
  assert.match(process.env.GITHUB_SHA||"",/^[0-9a-f]{40}$/i,"Invalid workflow source SHA");
  assert.equal(process.env.SEPAY_MIGRATION_CONFIRMATION,"APPLY-SEPAY-0022-0023-TO-sindarealest-db","Missing exact migration authorization phrase");
  const operation=process.env.SEPAY_MIGRATION_OPERATION||"preflight";
  assert.ok(["preflight","apply"].includes(operation),"Operation must be preflight or apply");
  const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
  assert.match(account,/^[a-f0-9]{32}$/i,"Cloudflare account is unavailable");
  assert.ok(token.length>=10,"Cloudflare API credential is unavailable");
  const base="https://api.cloudflare.com/client/v4/accounts/"+account;
  async function cf(path,method="GET",body){
    const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},
      ...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error("Cloudflare preflight failed (HTTP "+response.status+")");
    const result=await response.json();assert.equal(result?.success,true,"Cloudflare preflight returned failure");return result.result;
  }
  const [live,previewAdmin]=await Promise.all([
    cf("/pages/projects/"+site),cf("/pages/projects/"+previewSite)
  ]);
  const productionId=live?.deployment_configs?.production?.d1_databases?.DB?.id;
  const previewStoreId=live?.deployment_configs?.preview?.d1_databases?.DB?.id;
  assert.match(previewStoreId||"",/^[a-f0-9-]{36}$/i,"Storefront Preview database identity unavailable");
  const meta=await cf("/d1/database/"+encodeURIComponent(productionId||""));
  const target=assertProductionIdentity(live,previewAdmin,meta);
  if(target.storePreviewSharesProduction)
    console.log("WARNING: Storefront Preview is bound to Production D1; use the isolated Admin Preview database for checkout QA.");
  else
    console.log("PASS: Storefront Preview and Production D1 are isolated.");

  async function query(sql){
    const result=await cf("/d1/database/"+encodeURIComponent(target.id)+"/query","POST",{sql});
    assert.ok(Array.isArray(result)&&Array.isArray(result[0]?.results),"Unexpected D1 query response");
    return result[0].results;
  }
  const ledgerExists=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'");
  assert.equal(ledgerExists.length,1,"Production migration ledger missing; refusing to infer schema history");
  const ledgerRows=await query("SELECT name FROM d1_migrations");
  const ledger=new Set(ledgerRows.map(row=>String(row.name)));
  const allMigrations=readdirSync(resolve("migrations")).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
  assert.ok(targetMigrations.every(name=>allMigrations.includes(name)),"Target SePay migration files are missing");
  const unrelatedPending=allMigrations.filter(name=>!targetMigrations.includes(name)&&!ledger.has(name));
  assert.deepEqual(unrelatedPending,[],"Production has unapplied non-SePay migrations; refusing to run them: "+unrelatedPending.join(", "));
  for(const migration of prerequisites)assert.ok(ledger.has(migration),"Required prior migration is not recorded: "+migration);

  const tableNames=async(names)=>query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ("+names.map(name=>"'"+name+"'").join(",")+")");
  const [orders,settlements,gateways,intents,transactions]=await Promise.all([
    tableNames(["orders"]),tableNames(["order_cod_settlements"]),tableNames(["sepay_payment_orders"]),
    tableNames(["sepay_checkout_intents"]),tableNames(["sepay_checkout_transactions"])
  ]);
  assert.equal(orders.length,1,"Production orders table missing");
  assert.equal(settlements.length,1,"Required payment/delivery schema missing");

  const has22=ledger.has(targetMigrations[0]),has23=ledger.has(targetMigrations[1]);
  if(!has22)assert.equal(gateways.length,0,"Untracked SePay gateway table exists; refusing to alter schema");
  if(!has23)assert.equal(intents.length+transactions.length,0,"Untracked SePay checkout tables exist; refusing to alter schema");
  if(has22)assert.equal(gateways.length,1,"Recorded migration 0022 schema is incomplete");
  if(has23)assert.equal(intents.length+transactions.length,2,"Recorded migration 0023 schema is incomplete");
  console.log("Production D1 preflight: prerequisite migrations 0018–0021 are recorded; SePay ledger state: 0022="+has22+", 0023="+has23+"; schema state: gateway="+Boolean(gateways.length)+", intent="+Boolean(intents.length)+", transactions="+Boolean(transactions.length)+".");
  if(operation==="preflight"){
    console.log("PASS: read-only Production migration preflight complete; no backup or D1 changes were made.");
    return;
  }
  if(has22&&has23){
    console.log("PASS: SePay migrations 0022/0023 and tables already exist; Production D1 unchanged.");
    return;
  }

  // Preserve a recovery point and a private runner-local SQL backup before mutation.
  const bookmarkResult=await cf("/d1/database/"+encodeURIComponent(target.id)+"/time_travel/bookmark");
  const bookmark=String(bookmarkResult?.bookmark||"");
  assert.ok(bookmark.length>12,"No Cloudflare D1 Time Travel bookmark; refusing migration");
  const folder=mkdtempSync(join(tmpdir(),"sd-sepay-production-"));
  const config=join(folder,"wrangler.toml"),backup=join(folder,"before-sepay.sql");
  try{
    mkdirSync(join(folder,"migrations"));
    // Wrangler validates the local migration history against the remote ledger. Include the full
    // history, but the guard above requires every non-target migration to already be recorded.
    for(const name of allMigrations)copyFileSync(resolve("migrations",name),join(folder,"migrations",name));
    writeFileSync(config,[
      'name = "sd-sepay-production-migration"','compatibility_date = "2026-10-12"',
      '[[d1_databases]]','binding = "DB"','database_name = '+JSON.stringify(target.name),
      'database_id = '+JSON.stringify(target.id),'migrations_dir = '+JSON.stringify(join(folder,"migrations"))
    ].join("\n")+"\n",{mode:0o600});
    const wrangler=resolve("node_modules/wrangler/bin/wrangler.js");
    function run(args,label,timeout=180000){
      const result=spawnSync(process.execPath,[wrangler,"d1",...args,"--config",config],{encoding:"utf8",timeout,maxBuffer:8*1024*1024,
        env:{...process.env,CLOUDFLARE_SEND_METRICS:"false"}});
      if(result.error||result.status!==0)throw Error(label+" failed (exit "+String(result.status)+"); details redacted");
      return result.stdout;
    }
    run(["export",target.name,"--remote","--skip-confirmation","--output",backup],"Private pre-migration D1 export");
    assert.ok(statSync(backup).size>1024,"Private pre-migration D1 export is empty");
    console.log("PASS: Time Travel recovery bookmark and private runner-local backup captured; records omitted from logs.");
    try{
      run(["migrations","apply","DB","--remote","--yes"],"Apply only SePay migrations 0022/0023",240000);
    }catch(error){
      const state=await query("SELECT name FROM d1_migrations WHERE name IN ('"+targetMigrations.join("','")+"')");
      const names=new Set(state.map(row=>String(row.name)));
      const [gatewayNow,intentNow,transactionsNow]=await Promise.all([
        tableNames(["sepay_payment_orders"]),tableNames(["sepay_checkout_intents"]),tableNames(["sepay_checkout_transactions"])
      ]);
      console.error("Post-failure read-only Production state: 0022="+names.has(targetMigrations[0])+", 0023="+names.has(targetMigrations[1])+", gateway="+Boolean(gatewayNow.length)+", intent="+Boolean(intentNow.length)+", transactions="+Boolean(transactionsNow.length)+". No customer/payment rows were queried.");
      throw error;
    }
  }finally{rmSync(folder,{recursive:true,force:true});}

  const applied=await query("SELECT name FROM d1_migrations WHERE name IN ('"+targetMigrations.join("','")+"')");
  const appliedNames=new Set(applied.map(row=>String(row.name)));
  assert.ok(targetMigrations.every(name=>appliedNames.has(name)),"Production migration ledger verification failed");
  const [gatewayAfter,intentAfter,transactionsAfter,indexes]=await Promise.all([
    tableNames(["sepay_payment_orders"]),tableNames(["sepay_checkout_intents"]),tableNames(["sepay_checkout_transactions"]),
    query("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_sepay_payment_orders_order_created','idx_sepay_checkout_intents_status_expiry','idx_sepay_checkout_transactions_intent')")
  ]);
  assert.equal(gatewayAfter.length,1,"Production SePay gateway table missing after migration");
  assert.equal(intentAfter.length,1,"Production SePay intent table missing after migration");
  assert.equal(transactionsAfter.length,1,"Production SePay transaction table missing after migration");
  assert.equal(indexes.length,3,"Production SePay indexes incomplete after migration");
  console.log("PASS: Production SePay migrations 0022/0023 verified: 3 tables, 3 indexes; no payment rows were created.");
  if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,
    "\n### Production SePay D1 migration PASS\nTarget: verified `sindarealest-db` bound to `sindarealest2` Production.\nApplied and verified migrations `0022` and `0023`; required history `0018`–`0021` was present.\nRecovery: Cloudflare Time Travel bookmark `"+bookmark+"` and private temporary runner export (deleted at job end).\n"+(target.storePreviewSharesProduction?"Warning: Storefront Preview shares Production D1; use isolated Admin Preview for checkout QA.\n":"Storefront Preview D1 is separate from Production.\n")+"No customer or payment rows were read into logs or created by these migrations. Webhook/runtime configuration requires separate read-only verification.\n",{flag:"a"});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error=>{console.error("PRODUCTION SEPAY MIGRATION BLOCKED/FAILED:",error.message);process.exitCode=1;});
