/**
 * One-run, owner-authorized synthetic fixture for the ISOLATED ADMIN PREVIEW D1 ONLY.
 * This never deploys, migrates, uploads files, changes secrets, or touches Production.
 * Every SQL statement is parameterized and scoped to run-owned QA IDs.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {recoverQaJournal} from './qa-journal-state.mjs';
import {join} from 'node:path';
const project='sindarealest-admin-preview';
const storefront='sindarealest2';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const rid=String(process.env.GITHUB_RUN_ID||'');
if(!/^\d{8,16}$/.test(rid)||!account||!token||process.env.GITHUB_REF!=='refs/heads/feature/admin-isolated-handoff-2026-10-20')
 throw new Error('Unsafe QA environment; no database operations performed');
const tag='qa_'+rid;
const rec=Object.fromEntries(['product','customer','order','item','warranty','claim','audit'].map(v=>[v,tag+'_'+v]));
const sku='QA-'+rid,code='QA-WARRANTY-'+rid,orderNo='QA-ORDER-'+rid;
const folder=join(process.cwd(),'artifacts','admin-12-screen-live',(process.env.GITHUB_SHA||'unknown').slice(0,12));
mkdirSync(folder,{recursive:true});
const journalPath=join(folder,'synthetic-qa-lifecycle.json');
const emptyJournal={tag,checkedAt:new Date().toISOString(),environment:'ISOLATED_PREVIEW_ONLY',isolated:false,seeded:false,cleanupVerified:false,records:{},dbIdsExposed:false};
const journal=recoverQaJournal(existsSync(journalPath)?readFileSync(journalPath,'utf8'):null,tag,emptyJournal);
const save=()=>writeFileSync(join(folder,'synthetic-qa-lifecycle.json'),JSON.stringify(journal,null,2)+'\n');
const request=async(url,opts={})=>{
 const res=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token,...opts.headers},signal:AbortSignal.timeout(20000)});
 const json=await res.json().catch(()=>null);
 if(!res.ok||!json?.success)throw new Error('Cloudflare API call rejected HTTP '+res.status+' (codes: '+JSON.stringify((json?.errors||[]).map(e=>e.code).slice(0,3))+')');
 return json;
};
async function preflight(){
 const url='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/pages/projects/';
 const [a,b]=await Promise.all([request(url+project),request(url+storefront)]);
 const p=a.result,s=b.result;
 const previewDb=p?.deployment_configs?.preview?.d1_databases?.DB?.id;
 const ownProd=p?.deployment_configs?.production?.d1_databases?.DB?.id;
 const shopProd=s?.deployment_configs?.production?.d1_databases?.DB?.id;
 const good=v=>typeof v==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
 if(p?.name!==project||s?.name!==storefront||p.production_branch!=='main'||
   !good(previewDb)||!good(shopProd)||previewDb===shopProd||(good(ownProd)&&previewDb===ownProd))
   throw new Error('ISOLATED_PREVIEW_D1_NOT_VERIFIED; refusing synthetic writes');
 journal.isolated=true;save();
 return previewDb;
}
const sqlApi=(dbId)=>'https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/d1/database/'+encodeURIComponent(dbId)+'/query';
async function sql(db,statement,params=[]){
 const result=await request(sqlApi(db),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:statement,params:params.map(String)})});
 if(!Array.isArray(result.result)||result.result.some(item=>item.success===false))throw Error('D1 query failed for QA-only statement');
 return result.result[0]?.results||[];
}
const rows=[
 ['products',rec.product,'INSERT INTO products (id,slug,sku,sku_verified,title,category,category_label,description,price,stock,published,images_json,source_price_confirmed,sort_order,fulfillment_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
  [rec.product,'qa-admin-'+rid,sku,'0','QA TEST - KHÔNG PHẢI SẢN PHẨM THẬT','wallets','Ví da','Dữ liệu ảo; tự xóa sau nghiệm thu.','120000','1','0','[]','1','99999','in_stock']],
 ['customers',rec.customer,'INSERT INTO customers (id,full_name,phone,email,address) VALUES (?,?,?,?,?)',
  [rec.customer,'QA TEST - KHÔNG PHẢI KHÁCH HÀNG','QA-NOT-PHONE-'+rid,'qa-'+rid+'@example.invalid','DỮ LIỆU KIỂM THỬ - KHÔNG GIAO HÀNG']],
 ['orders',rec.order,'INSERT INTO orders (id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,customer_note) VALUES (?,?,?,?,?,?,?,?,?)',
  [rec.order,orderNo,rec.customer,'completed','unpaid','120000','120000','0','QA TEST - KHÔNG THỰC HIỆN GIAO HÀNG / THANH TOÁN']],
 ['order_items',rec.item,'INSERT INTO order_items (id,order_id,product_id,sku,sku_verified,title,quantity,unit_price,line_total,fulfillment_type) VALUES (?,?,?,?,?,?,?,?,?,?)',
  [rec.item,rec.order,rec.product,sku,'0','QA TEST - VÍ DA GIẢ LẬP','1','120000','120000','in_stock']],
 ['warranties',rec.warranty,'INSERT INTO warranties (id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status) VALUES (?,?,?,?,?,?,?,?,?)',
  [rec.warranty,rec.order,rec.item,code,'QA TEST - KHÔNG CÓ GIÁ TRỊ BẢO HÀNH','12','2026-10-01','2027-10-01','active']],
 ['warranty_claims',rec.claim,'INSERT INTO warranty_claims (id,order_id,customer_id,warranty_code,message,status,admin_note) VALUES (?,?,?,?,?,?,?)',
  [rec.claim,rec.order,rec.customer,code,'QA TEST - KHÔNG XỬ LÝ YÊU CẦU NÀY','reviewing','DỮ LIỆU ẢO']],
 ['audit_logs',rec.audit,'INSERT INTO audit_logs (id,actor,action,entity_type,entity_id,details_json) VALUES (?,?,?,?,?,?)',
  [rec.audit,'qa_synthetic','qa_fixture_created','qa',rec.product,'{"synthetic":true}']]
];
async function count(db,table,id){
 const result=await sql(db,'SELECT COUNT(1) AS n FROM '+table+' WHERE id=?',[id]);
 return Number(result[0]?.n||0);
}
async function seed(db){
 for(const [table,id] of rows){if((await count(db,table,id))!==0)throw Error('QA owned fixture ID already exists; stop without overwriting');}
 for(const [table,id,statement,params] of rows){
   await sql(db,statement,params);
   if((await count(db,table,id))!==1)throw Error('QA fixture failed post-insert verification');
   journal.records[table]='SEEDED';save();
 }
 journal.seeded=true;save();
 console.log('[QA_FIXTURE] Synthetic records inserted into independently verified isolated Preview D1. No legitimate rows replaced.');
}
async function cleanup(db){
 let failures=[];
 // Delete exclusively run-owned IDs, in foreign-key-safe dependency order.
 const order=['warranty_claims','warranties','order_items','orders','customers','products','audit_logs'];
 for(const table of order){
  const row=rows.find(r=>r[0]===table);if(!row)continue;
  try{await sql(db,'DELETE FROM '+table+' WHERE id=?',[row[1]])}catch(e){failures.push({table,error:e.message})}
 }
 // Remove only run-owned audit entries emitted by any fixture UI mutation (no broad deletes).
 for(const key of ['product','order','customer','item','warranty','claim']){
  try{await sql(db,"DELETE FROM audit_logs WHERE entity_id=? AND actor IN ('admin','qa_synthetic')",[rec[key]])}catch(e){failures.push({table:'audit_logs',error:e.message})}
 }
 for(const [table,id] of rows){
  try{
   const n=await count(db,table,id);journal.records[table]=n===0?'REMOVED':'LEFTOVER';
   if(n!==0)failures.push({table,error:'remaining QA rows '+n});
  }catch(e){failures.push({table,error:e.message})}
 }
 journal.cleanupVerified=failures.length===0;journal.cleanedAtUtc=new Date().toISOString();journal.failures=failures;save();
 if(failures.length)throw Error('QA cleanup incomplete: '+JSON.stringify(failures));
 console.log('[QA_CLEANUP] Verified zero remaining run-owned synthetic records in all seven tables.');
}
async function main(){
 const mode=process.argv[2]||'run';let db=null,error=null;
 try{
  db=await preflight();
  if(mode==='cleanup'){await cleanup(db);return}
  if(mode!=='run')throw Error('Invalid QA mode');
  try{
   await seed(db);
   const verifiedTitle='QA VERIFIED SAVED '+rid;
   const apiTest=spawnSync('npx',['playwright','test','tests/e2e/admin-qa-write-persistence.spec.js','--workers=1','--reporter=line'],{
     stdio:'inherit',env:{...process.env,QA_TEST_PRODUCT_ID:rec.product,QA_EXPECTED_UPDATED_TITLE:verifiedTitle},timeout:180000});
   if(apiTest.error||apiTest.status!==0)throw Error('Authenticated Admin QA product PUT/GET regression not verified; automatic cleanup required');
   const persisted=await sql(db,'SELECT title,price,stock FROM products WHERE id=?',[rec.product]);
   if(persisted.length!==1||persisted[0].title!==verifiedTitle||Number(persisted[0].price)!==123456||Number(persisted[0].stock)!==2)
      throw Error('Exact isolated D1 QA row did not persist expected API changes');
   journal.authenticatedAdminSaveVerified=true; journal.d1ReadbackVerified=true; save();
   const warrantyBackup=spawnSync('npx',['playwright','test','tests/e2e/admin-qa-warranty-backup.spec.js','--workers=1','--reporter=line'],{
      stdio:'inherit',env:{...process.env,QA_TEST_CLAIM_ID:rec.claim,QA_TEST_PRODUCT_ID:rec.product},timeout:180000});
   if(warrantyBackup.error||warrantyBackup.status!==0)throw Error('QA claim update + backup GET verification failed; cleanup mandatory');
   const claimReadback=await sql(db,'SELECT status,admin_note FROM warranty_claims WHERE id=?',[rec.claim]);
   if(claimReadback.length!==1||claimReadback[0].status!=='approved'||claimReadback[0].admin_note!=='QA ONLY - AUTO DELETE '+rec.claim)
     throw Error('QA warranty claim D1 readback mismatch');
   journal.warrantyClaimWriteVerified=true;
   journal.backupReadSnapshotVerified=true;
   save();
   const child=spawnSync('npx',['playwright','test','tests/e2e/admin-12-screen-live-qa.spec.js','--workers=2','--reporter=line,html'],{stdio:'inherit',env:{...process.env,QA_EXPECT_ORDER_ID:rec.order},timeout:900000});
   if(child.error||child.status!==0)throw Error('12-screen Playwright not fully green; exit '+String(child.status));
   // Order writes send Admin push notifications. Never exercise that route if any
   // subscription is present in isolated Preview D1; real subscribers are not QA fixtures.
   const pushRows=await sql(db,'SELECT COUNT(1) AS n FROM admin_push_subscriptions');
   if(pushRows.length!==1||Number(pushRows[0].n)!==0)
     throw Error('ISOLATED_QA_PUSH_SUBSCRIPTIONS_NOT_EMPTY; refusing order API write and cleaning fixtures');
   const orderQa=spawnSync('npx',['playwright','test','tests/e2e/admin-qa-order-persistence.spec.js','--workers=1','--reporter=line'],{
     stdio:'inherit',env:{...process.env,QA_TEST_ORDER_ID:rec.order,QA_TEST_ORDER_ITEM_ID:rec.item},timeout:180000});
   if(orderQa.error||orderQa.status!==0)throw Error('Authenticated Admin order pricing/terms QA failed; cleaning fixtures');
   const orderReadback=await sql(db,'SELECT status,subtotal,total,payment_terms_confirmed_at,payment_terms_confirmed_by,payment_terms_note FROM orders WHERE id=?',[rec.order]);
   const itemReadback=await sql(db,'SELECT unit_price,line_total FROM order_items WHERE id=? AND order_id=?',[rec.item,rec.order]);
   const auditReadback=await sql(db,"SELECT COUNT(1) AS n FROM audit_logs WHERE entity_id=? AND actor='admin' AND action='order_updated'",[rec.order]);
   if(orderReadback.length!==1||orderReadback[0].status!=='completed'||
     Number(orderReadback[0].subtotal)!==135000||Number(orderReadback[0].total)!==135000||
     !orderReadback[0].payment_terms_confirmed_at||orderReadback[0].payment_terms_confirmed_by!=='admin'||
     orderReadback[0].payment_terms_note!=='QA ONLY - PRICE TERMS '+rid||
     itemReadback.length!==1||Number(itemReadback[0].unit_price)!==135000||
     Number(itemReadback[0].line_total)!==135000||auditReadback.length!==1||Number(auditReadback[0].n)!==1)
     throw Error('Isolated D1 order price/terms/audit readback mismatch; cleaning fixtures');
   journal.orderApiPriceTermsVerified=true;
   journal.orderD1ReadbackVerified=true;
   journal.orderAuditVerified=true;
   save();
  }catch(e){error=e;console.error('[QA_SCREEN_RESULT] '+e.message)}
  finally{try{await cleanup(db)}catch(cleanupErr){console.error('[QA_CLEANUP_ERROR] '+cleanupErr.message);error=error||cleanupErr}}
  if(error)throw error;
 } finally {save()}
}
await main();
