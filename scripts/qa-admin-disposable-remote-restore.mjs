/** REAL handler on independently-created disposable remote D1 through D1 REST
 * batch adapter. Never touches existing DB, Pages bindings, Production or R2.
 * Fails closed without create permission. Deletes only the newly-created UUID.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createSession} from '../functions/_lib.js';
import {onRequestPost as restore} from '../functions/api/admin/restore.js';

const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const repo='chichute5500/Sindarealest-admin';
const ref='refs/heads/feature/admin-isolated-handoff-2026-10-20';
const run=String(process.env.GITHUB_RUN_ID||'');
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!==ref||
  !/^[0-9]{8,16}$/.test(run)|| !/^[a-f0-9]{32}$/i.test(String(account||''))||!token)
  throw Error('UNSAFE_DISPOSABLE_RESTORE_CONTEXT');
const sourceSha=String(process.env.GITHUB_SHA||'');
if(!/^[a-f0-9]{40}$/i.test(sourceSha))throw Error('UNVERIFIED_SOURCE_SHA');
const path=join(process.cwd(),'artifacts/disposable-remote-restore',sourceSha.slice(0,12));
mkdirSync(path,{recursive:true});
const proof={sourceSha,scope:'NEWLY_CREATED_UNBOUND_D1_ONLY',result:'NOT_ACCEPTED',
  bindingPreflight:false,created:false,migrations:false,handlerRestore:false,
  readback:false,validationRejected:false,atomicRollback:false,dbDeleted:false,
  productionTouched:false,runOwnedNameNotExposed:true};
const save=()=>writeFileSync(join(path,'manifest.json'),JSON.stringify(proof,null,2)+'\n');
const base='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account);
async function api(suffix,method='GET',body=undefined){
 const r=await fetch(base+suffix,{method,headers:{
   Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.success!==true) {
   const codes=(j?.errors||[]).map(x=>Number(x.code)).filter(Number.isSafeInteger).slice(0,3);
   throw Error('CLOUDFLARE_D1_HTTP_'+r.status+'_CODES_'+codes.join('_'));
 }
 return j.result;
}
const idString=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27,28}$/i.test(x);
const project=async n=>{
 const p=await api('/pages/projects/'+n);
 if(p?.name!==n||p.production_branch!=='main')throw Error('PROJECT_NAME_PRODUCTION_BRANCH_UNVERIFIED');
 return p;
};
const [admin,shop]=await Promise.all([project('sindarealest-admin-preview'),project('sindarealest2')]);
const liveIds=[
 admin.deployment_configs?.preview?.d1_databases?.DB?.id,
 admin.deployment_configs?.production?.d1_databases?.DB?.id,
 shop.deployment_configs?.preview?.d1_databases?.DB?.id,
 shop.deployment_configs?.production?.d1_databases?.DB?.id
].filter(idString);
if(!idString(admin.deployment_configs?.preview?.d1_databases?.DB?.id)||
 !idString(shop.deployment_configs?.production?.d1_databases?.DB?.id)||
 admin.deployment_configs.preview.d1_databases.DB.id===shop.deployment_configs.production.d1_databases.DB.id)
 throw Error('ISOLATION_PREFLIGHT_NOT_VERIFIED');
proof.bindingPreflight=true;save();
const dbName='qa-admin-restore-'+run+'-'+randomUUID().slice(0,8);
let id=null,failed=null,rollbackFailure=null;
let tempConfig=null;
const migrations=['0001_schema.sql','0003_storefront_operations.sql',
  '0004_admin_notifications.sql','0005_address_warranty_verification.sql',
  '0006_remove_warranty_otp.sql','0007_order_contact_details.sql',
  '0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql'];
async function query(body){
 const result=await api('/d1/database/'+id+'/query','POST',body);
 if(!Array.isArray(result)||result.some(x=>x.success===false))
   throw Error('D1_QUERY_FAILED');
 return result;
}
const remote={
 prepare(sql){
  let params=[];
  return {sql,get params(){return params;},
   bind(...values){params=values;return this;},
   async first(){return (await query({sql,params}))[0]?.results?.[0]||null;},
   async all(){return {results:(await query({sql,params}))[0]?.results||[]};},
   async run(){return (await query({sql,params}))[0]}
  };
 },
 async batch(statements){
  return query({batch:statements.map(s=>({sql:s.sql,params:s.params}))});
 }
};
async function scalar(sql,params=[]){return (await query({sql,params}))[0]?.results?.[0]}
const password='DISPOSABLE_REMOTE_QA_ONLY_NOT_REAL_PASSWORD';
const secret='DISPOSABLE_REMOTE_QA_ONLY_SESSION_SECRET_LONG_ENOUGH';
const session=await createSession(secret);
const context=body=>({env:{DB:remote,ADMIN_PASSWORD:password,SESSION_SECRET:secret},request:
 new Request('https://qa.invalid/api/admin/restore',{method:'POST',
 headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin',
  'Content-Type':'application/json',Cookie:'sd_admin_session='+session},
 body:JSON.stringify(body)})});
const stamp='2026-10-25 00:00:00';
const fixture={
 format:'sindarealest-backup-v2',
 settings:{showPrices:true,welcomeEnabled:false,welcomeTitleLine1:'QA',
  welcomeTitleLine2:'SINDAREALEST',welcomeText:'DỮ LIỆU KIỂM THỬ'},
 products:[{id:'qa-restore-item',slug:'qa-restore-item',title:'Sản phẩm test độc lập',
   sku:'QA-RESTORE-001',category:'wallets',categoryLabel:'QA',description:'DISPOSABLE',
   price:120000,stock:1,published:true,images:[],sortOrder:1}],
 operations:{
  customers:[{id:'qa-restore-customer',full_name:'KHÁCH GIẢ LẬP',phone:'00000008080',
   email:'',address:'',created_at:stamp,updated_at:stamp}],
  orders:[{id:'qa-restore-order',order_number:'QA-RESTORE-ORDER-1',
   customer_id:'qa-restore-customer',status:'confirmed',payment_status:'unpaid',
   subtotal:120000,total:120000,price_confirmation_required:0,
   customer_note:'DISPOSABLE',payment_terms_confirmed_at:stamp,
   created_at:stamp,updated_at:stamp}],
  orderItems:[{id:'qa-restore-line',order_id:'qa-restore-order',product_id:'qa-restore-item',
   sku:'QA-RESTORE-001',title:'Sản phẩm test độc lập',quantity:1,
   unit_price:120000,line_total:120000}],
  warranties:[],warrantyClaims:[],auditLogs:[]
 }
};
try{
 const newDb=await api('/d1/database','POST',{name:dbName});
 id=newDb?.uuid||newDb?.id;
 if(!idString(id)||liveIds.includes(id)||newDb?.name!==dbName)
   throw Error('CREATED_D1_ID_OR_NAME_NOT_VERIFIED_STOP');
 proof.created=true;save();
 // Use Wrangler's remote D1 SQL import pathway, not REST /query for full
 // migration scripts containing multiple statements and PRAGMAs.
 tempConfig=mkdtempSync(join(tmpdir(),'qa-d1-unbound-'));
 const configPath=join(tempConfig,'wrangler.toml');
 writeFileSync(configPath,[
   'name = "qa-disposable-restore"',
   'compatibility_date = "2026-10-12"',
   '[[d1_databases]]',
   'binding = "DB"',
   'database_name = "'+dbName+'"',
   'database_id = "'+id+'"',
 ].join('\\n')+'\\n');
 for(const filename of migrations){
  proof.currentMigration=filename;save();
  const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
  const child=spawnSync(process.execPath,[wrangler,'d1','execute',dbName,
    '--remote','--config',configPath,'--file',resolve('migrations',filename)],{
      encoding:'utf8',env:process.env,timeout:90000,maxBuffer:512*1024
    });
  if(child.error||child.status!==0)
    throw Error('REMOTE_D1_WRANGLER_MIGRATION_FAILED_'+filename+'_STATUS_'+child.status);
 }
 proof.currentMigration=null;
 proof.migrations=true;save();
 const tables=(await query({sql:"SELECT name FROM sqlite_master WHERE type='table'"}))[0]?.results||[];
 for(const name of ['products','customers','orders','order_items','audit_logs','warranties','order_payment_transactions'])
  assert.ok(tables.some(t=>t.name===name),'Missing table '+name);
 await query({sql:"INSERT INTO products(id,slug,sku,title,category) VALUES('old','old','QA-OLD','old disposable row','wallets')"});
 const restored=await restore(context(fixture));
 assert.equal(restored.status,200,'Restore POST handler must accept disposable fixture');
 proof.handlerRestore=true;
 assert.equal((await scalar('SELECT id FROM products LIMIT 1')).id,'qa-restore-item');
 assert.equal((await scalar('SELECT COUNT(*) AS n FROM products')).n,1);
 assert.equal((await scalar('SELECT COUNT(*) AS n FROM customers')).n,1);
 assert.equal((await scalar('SELECT COUNT(*) AS n FROM orders')).n,1);
 assert.equal((await scalar('SELECT COUNT(*) AS n FROM order_items')).n,1);
 assert.equal((await scalar("SELECT value FROM settings WHERE key='show_prices'")).value,'1');
 const fk=(await query({sql:'PRAGMA foreign_key_check'}))[0]?.results||[];
 assert.equal(fk.length,0);
 proof.readback=true;save();
 const invalid=structuredClone(fixture);
 invalid.products.push({...invalid.products[0],id:'qa-other',slug:'qa-other'});
 assert.equal((await restore(context(invalid))).status,400);
 assert.equal((await scalar('SELECT COUNT(*) AS n FROM products')).n,1);
 proof.validationRejected=true;save();
 await query({sql:"CREATE TRIGGER qa_restore_abort BEFORE INSERT ON products BEGIN SELECT RAISE(ABORT,'qa_expected_rollback'); END"});
 const rejected=await restore(context(fixture));
 assert.equal(rejected.status,503,'Restore must surface destructive batch SQL abort');
 const preserved=await scalar('SELECT id FROM products LIMIT 1');
 const retained=await scalar('SELECT COUNT(*) AS n FROM orders');
 assert.equal(preserved?.id,'qa-restore-item');
 assert.equal(retained?.n,1);
 proof.atomicRollback=true;save();
}catch(e){failed=String(e?.message||'QA_FAILED');}
finally{
 if(id&&proof.created){
  try{
   // Confirm unbound fresh ID once more before the ONE allowed database deletion.
   if(liveIds.includes(id))throw Error('DELETE_GUARD_MATCHES_LIVE_DB');
   const info=await api('/d1/database/'+id);
   if(info?.name!==dbName)throw Error('DELETE_GUARD_NAME_MISMATCH');
   await api('/d1/database/'+id,'DELETE');
   proof.dbDeleted=true;
  }catch(e){rollbackFailure=String(e?.message||'DB_DELETE_FAILED');}
 }
 proof.result=!failed&&!rollbackFailure&&proof.handlerRestore&&proof.atomicRollback&&proof.dbDeleted
  ?'PASS_REMOTE_DISPOSABLE_RESTORE_ROUTE_AND_ROLLBACK':'NOT_ACCEPTED';
 proof.errorCode=failed;
 proof.cleanupErrorCode=rollbackFailure;
 if(tempConfig)rmSync(tempConfig,{recursive:true,force:true});
 proof.finishedAtUtc=new Date().toISOString();save();
}
console.info('[QA_DISPOSABLE_REMOTE_RESTORE] '+JSON.stringify({
 result:proof.result,created:proof.created,migrations:proof.migrations,
 handlerRestore:proof.handlerRestore,readback:proof.readback,
 validationRejected:proof.validationRejected,atomicRollback:proof.atomicRollback,
 dbDeleted:proof.dbDeleted,errorCode:proof.errorCode,cleanupErrorCode:proof.cleanupErrorCode,
 productionTouched:false}));
if(proof.result!=='PASS_REMOTE_DISPOSABLE_RESTORE_ROUTE_AND_ROLLBACK')
 throw Error('DISPOSABLE_REMOTE_RESTORE_NOT_ACCEPTED');
