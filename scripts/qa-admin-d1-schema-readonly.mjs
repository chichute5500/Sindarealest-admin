/** Inspect only isolated Preview D1 schema and payment-ledger table shape. No D1 row writes. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const gitRef=process.env.GITHUB_REF;
if(!account||!token||gitRef!=='refs/heads/feature/admin-isolated-handoff-2026-10-20')
  throw Error('Unsafe missing account/token or branch; refused.');
const api='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account);
async function call(url,opt={}){
 const r=await fetch(url,{...opt,headers:{Authorization:'Bearer '+token,...opt.headers},signal:AbortSignal.timeout(15000)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.success!==true) throw Error('Read-only Cloudflare check HTTP '+r.status);
 return j.result;
}
const [p,store]=await Promise.all([
 call(api+'/pages/projects/sindarealest-admin-preview'),
 call(api+'/pages/projects/sindarealest2')
]);
const id=p?.deployment_configs?.preview?.d1_databases?.DB?.id,
prod=p?.deployment_configs?.production?.d1_databases?.DB?.id,
storeProd=store?.deployment_configs?.production?.d1_databases?.DB?.id;
const isId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/i.test(x);
if(p?.name!=='sindarealest-admin-preview'||store?.name!=='sindarealest2'||
 p.production_branch!=='main'||!isId(id)||!isId(storeProd)||id===storeProd||(isId(prod)&&prod===id))
  throw Error('Preview DB not positively isolated; zero queries issued');
async function d1(query,params=[]){
 if(!/^(?:SELECT |PRAGMA table_info\()/i.test(query))throw Error('Only SELECT/PRAGMA allowed');
 const response=await call(api+'/d1/database/'+encodeURIComponent(id)+'/query',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:query,params})});
 if(!Array.isArray(response)||response.some(x=>x.success===false))throw Error('Read-only D1 query failed');
 return response[0]?.results||[];
}
const requirements={
 products:['id','sku','sku_verified','title','published','images_json','fulfillment_type'],
 customers:['id','full_name','phone'],
 orders:['id','customer_id','status','payment_status','payment_terms_confirmed_at','public_access_token_hash'],
 order_items:['id','order_id','product_id','unit_price','fulfillment_type'],
 warranties:['id','order_id','order_item_id','warranty_code','status'],
 warranty_claims:['id','order_id','customer_id','status'],
 audit_logs:['id','actor','action','entity_id'],
 order_payment_requests:['id','order_id','installment_type','amount','status','transfer_reference'],
 order_payment_transactions:['id','order_id','direction','amount','transaction_reference','verified_at']
};
const report={observedAtUtc:new Date().toISOString(),environment:'ISOLATED_PREVIEW_D1',dbBinding:'DB',isolatedBindingConfirmed:true,
 evidenceScope:'CLOUDFLARE_D1_REMOTE_READ_ONLY_SCHEMA_PRAGMA',result:'NOT_VERIFIED',tables:{},paymentLedgerTablesVerified:false,qaCleanupSpotcheck:'NOT_CHECKED',noBusinessWrites:true};
let all=true;
for(const [table,cols] of Object.entries(requirements)){
 const rows=await d1('PRAGMA table_info('+table+')');
 const present=new Set(rows.map(x=>x.name));
 const missing=cols.filter(c=>!present.has(c));
 report.tables[table]={exists:rows.length>0,missingColumns:missing};
 if(rows.length===0||missing.length)all=false;
}
report.paymentLedgerTablesVerified=['order_payment_requests','order_payment_transactions'].every(t=>report.tables[t]?.exists&&report.tables[t]?.missingColumns.length===0);
const prior='qa_40110305263';
const q1=await d1('SELECT COUNT(*) AS n FROM products WHERE id=?',[prior+'_product']);
const q2=await d1('SELECT COUNT(*) AS n FROM audit_logs WHERE entity_id=?',[prior+'_product']);
report.qaCleanupSpotcheck=(Number(q1[0]?.n)===0&&Number(q2[0]?.n)===0)?'ZERO_RUN_OWNED_PRODUCT_AND_AUDIT':'NOT_VERIFIED';
report.result=(all&&report.paymentLedgerTablesVerified&&report.qaCleanupSpotcheck==='ZERO_RUN_OWNED_PRODUCT_AND_AUDIT')?'SCHEMA_AND_LEDGER_SHAPE_VERIFIED':'NOT_VERIFIED';
const folder=join(process.cwd(),'artifacts','admin-preview-evidence',(process.env.GITHUB_SHA||'unknown').slice(0,12));
mkdirSync(folder,{recursive:true});
writeFileSync(join(folder,'isolated-d1-schema-readonly.json'),JSON.stringify(report,null,2)+'\n');
console.info('[QA_REMOTE_PREVIEW_SCHEMA] '+JSON.stringify(report));
if(report.result!=='SCHEMA_AND_LEDGER_SHAPE_VERIFIED')process.exitCode=1;
