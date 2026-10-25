// Isolated combined Storefront/Admin Cloudflare Preview D1 schema — read only, no IDs or row data logged.
import { mkdirSync, writeFileSync } from 'node:fs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token||process.env.GITHUB_REF!=='refs/heads/integration/full-site-admin-storefront-2026-10-25')throw Error('Wrong branch or missing token');
const root='https://api.cloudflare.com/client/v4/accounts/'+account;
async function call(url,options={}){
 const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(16000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok||data?.success!==true)throw Error('Cloudflare read-only schema inspection unavailable HTTP '+r.status);
 return data.result;
}
const [isolated,shop]=await Promise.all([
 call(root+'/pages/projects/sindarealest-admin-preview'),
 call(root+'/pages/projects/sindarealest2')
]);
const db=p=>p?.d1_databases?.DB?.id||p?.d1_databases?.DB?.database_id;
const target=db(isolated?.deployment_configs?.preview);
const prod=db(shop?.deployment_configs?.production);
const isolatedProd=db(isolated?.deployment_configs?.production);
if(isolated?.name!=='sindarealest-admin-preview'||shop?.name!=='sindarealest2'||
 isolated?.production_branch!=='main'||shop?.production_branch!=='main'||
 !target||!prod||target===prod||(isolatedProd&&isolatedProd===target))
 throw Error('Isolated D1 identity cannot be guaranteed; NO QUERY sent.');
async function inspect(table) {
 if(!/^[a-z_]+$/.test(table))throw Error('Unsafe table name');
 const result=await call(root+'/d1/database/'+encodeURIComponent(target)+'/query',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({sql:'PRAGMA table_info('+table+')',params:[]})
 });
 if(!Array.isArray(result)||!result.length||result.some(x=>!x.success))
  throw Error('Read-only PRAGMA unavailable for '+table);
 return new Set((result[0].results||[]).map(r=>r.name));
}
const required={
 products:['id','slug','sku','sku_verified','category','published','fulfillment_type'],
 customers:['id','phone'],
 orders:['id','customer_id','status','payment_status','payment_terms_confirmed_at','public_access_token_hash'],
 order_items:['id','order_id','product_id','sku_verified','fulfillment_type'],
 order_payment_requests:['id','order_id','installment_type','amount','status','transfer_reference'],
 order_payment_transactions:['id','order_id','direction','amount','transaction_reference','verified_at'],
 warranties:['id','order_id','status'],
 warranty_claims:['id','order_id','status'],
 audit_logs:['id','actor','action','entity_id']
};
const report={sha:process.env.GITHUB_SHA?.slice(0,12),target:'isolated-admin-preview-D1',noBusinessWrites:true,isolationPassed:true,tables:{}};
let failures=0;
for(const [table,cols] of Object.entries(required)){
 const found=await inspect(table),missing=cols.filter(c=>!found.has(c));
 report.tables[table]={verified:missing.length===0,missing};
 if(missing.length){failures++;console.error('::error::PREVIEW_SCHEMA_MISSING '+table+': '+missing.join(','))}
 else console.log('PASS read-only schema '+table);
}
report.pass=failures===0;
mkdirSync('artifacts/full-site-preview-evidence',{recursive:true});
writeFileSync('artifacts/full-site-preview-evidence/schema.json',JSON.stringify(report,null,2)+'\n');
if(failures)throw Error('Preview D1 has '+failures+' tables with missing contract fields; NOT accepted. No migrations executed.');
console.log('PASS: Preview D1 product SKU, fulfillment and payment ledger schema is compatible; no writes.');
