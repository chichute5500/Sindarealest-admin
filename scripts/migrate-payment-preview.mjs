// Apply the required payment schemas to the isolated Admin Preview D1 only.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const branch="feat/storefront-payment-cod-sync-20261101";
if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin"||process.env.GITHUB_REF!=="refs/heads/"+branch)
  throw Error("Migration is restricted to the payment experiment branch.");
const account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
if(!/^[a-f0-9]{32}$/.test(account)||token.length<10)throw Error("Cloudflare Preview credentials are unavailable.");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function cf(path,method="GET",data){
  const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    ...(data?{body:JSON.stringify(data)}:{}),redirect:"error",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("Cloudflare Preview guard failed (HTTP "+response.status+").");
  const result=await response.json();if(result?.success!==true)throw Error("Cloudflare Preview guard failed.");return result.result;
}
const [preview,previewStore]=await Promise.all([
  cf("/pages/projects/sindarealest-admin-preview"),
  cf("/pages/projects/sindarealest2")
]);
assert.equal(preview?.name,"sindarealest-admin-preview");
assert.equal(previewStore?.name,"sindarealest2");
const previewId=preview?.deployment_configs?.preview?.d1_databases?.DB?.id||preview?.deployment_configs?.preview?.d1_databases?.DB?.database_id;
const storeProductionId=previewStore?.deployment_configs?.production?.d1_databases?.DB?.id||previewStore?.deployment_configs?.production?.d1_databases?.DB?.database_id;
const adminProductionId=preview?.deployment_configs?.production?.d1_databases?.DB?.id||preview?.deployment_configs?.production?.d1_databases?.DB?.database_id;
if(!/^[a-f0-9-]{36}$/i.test(previewId||"")||!/^[a-f0-9-]{36}$/i.test(storeProductionId||""))
  throw Error("Cannot verify Preview and Production D1 identities; refusing migration.");
if(adminProductionId&&!/^[a-f0-9-]{36}$/i.test(adminProductionId))
  throw Error("Malformed Admin Production D1 identity; refusing migration.");
if(storeProductionId.toLowerCase()===previewId.toLowerCase()||
  (adminProductionId&&/^[a-f0-9-]{36}$/i.test(adminProductionId)&&adminProductionId.toLowerCase()===previewId.toLowerCase()))
  throw Error("Target Preview D1 matches a Production D1; refusing migration.");
const dbName=(await cf("/d1/database/"+encodeURIComponent(previewId))).name;
if(!dbName)throw Error("Preview D1 name is unavailable.");
async function query(sql){
  const response=await cf("/d1/database/"+encodeURIComponent(previewId)+"/query","POST",{sql});
  if(!Array.isArray(response)||!Array.isArray(response[0]?.results))throw Error("Unexpected Preview D1 query response.");
  return response[0].results;
}
const ledgerTable=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'");
const recorded=ledgerTable.length===1
  ?await query("SELECT name FROM d1_migrations WHERE name IN ('0018_payment_delivery_settlement.sql','0019_sepay_payment_gateway.sql','0020_sepay_checkout_intents.sql')")
  :[];
const has0018=recorded.some(row=>row.name==="0018_payment_delivery_settlement.sql");
const has0019=recorded.some(row=>row.name==="0019_sepay_payment_gateway.sql");
const has0020=recorded.some(row=>row.name==="0020_sepay_checkout_intents.sql");
const settlementTable=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='order_cod_settlements'");
const deliveryColumn=await query("SELECT name FROM pragma_table_info('orders') WHERE name='delivery_status'");
const sepayTable=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='sepay_payment_orders'");
const intentTable=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='sepay_checkout_intents'");
if(!has0018&&(settlementTable.length||deliveryColumn.length))throw Error("Preview has payment/delivery schema without migration 0018 history; refusing to alter schema.");
if(has0018&&(!settlementTable.length||!deliveryColumn.length))throw Error("Partial migration 0018 schema detected; refusing to continue.");
if(!has0019&&sepayTable.length)throw Error("Preview has SePay table without migration 0019 history; refusing to alter schema.");
if(has0019&&!sepayTable.length)throw Error("Partial migration 0019 schema detected; refusing to continue.");
if(!has0020&&intentTable.length)throw Error("Preview has SePay checkout-intent table without migration 0020 history; refusing to alter schema.");
if(has0020&&!intentTable.length)throw Error("Partial migration 0020 schema detected; refusing to continue.");
if(!has0018||!has0019||!has0020){
  const folder=mkdtempSync(join(tmpdir(),"sd-payment-preview-migration-"));
  try{
    mkdirSync(join(folder,"migrations"));
    for(const name of ["0018_payment_delivery_settlement.sql","0019_sepay_payment_gateway.sql","0020_sepay_checkout_intents.sql"])
      copyFileSync(new URL("../migrations/"+name,import.meta.url),join(folder,"migrations",name));
    writeFileSync(join(folder,"wrangler.toml"),[
      'name = "sd-payment-preview-migration"','compatibility_date = "2026-10-12"',
      '[[d1_databases]]','binding = "DB"','database_name = '+JSON.stringify(dbName),
      'database_id = '+JSON.stringify(previewId),'migrations_dir = "./migrations"'
    ].join("\n")+"\n",{mode:0o600});
    const wrangler=join(process.cwd(),"node_modules/wrangler/bin/wrangler.js");
    const run=spawnSync(process.execPath,[wrangler,"d1","migrations","apply","DB","--remote","--config",join(folder,"wrangler.toml")],
      {env:process.env,encoding:"utf8",timeout:120000});
    if(run.error||run.status!==0)throw Error("Preview-only migration failed: "+String(run.stderr||run.stdout||run.error?.message||"").slice(-800));
  }finally{rmSync(folder,{recursive:true,force:true});}
}
const applied=await query("SELECT name FROM d1_migrations WHERE name IN ('0018_payment_delivery_settlement.sql','0019_sepay_payment_gateway.sql','0020_sepay_checkout_intents.sql')");
const verifiedNames=new Set(applied.map(row=>row.name));
const verifiedSettlement=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='order_cod_settlements'");
const verifiedDelivery=await query("SELECT name FROM pragma_table_info('orders') WHERE name='delivery_status'");
const verifiedSepay=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='sepay_payment_orders'");
const verifiedIntents=await query("SELECT name FROM sqlite_master WHERE type='table' AND name='sepay_checkout_intents'");
if(!verifiedNames.has("0018_payment_delivery_settlement.sql")||!verifiedSettlement.length||!verifiedDelivery.length)
  throw Error("Preview payment/delivery migration verification failed.");
if(!verifiedNames.has("0019_sepay_payment_gateway.sql")||!verifiedSepay.length)
  throw Error("Preview SePay migration verification failed.");
if(!verifiedNames.has("0020_sepay_checkout_intents.sql")||!verifiedIntents.length)
  throw Error("Preview SePay checkout-intent migration verification failed.");
console.log("PASS: Preview migrations 0018–0020 verified on isolated Preview D1; Production D1 untouched.");
