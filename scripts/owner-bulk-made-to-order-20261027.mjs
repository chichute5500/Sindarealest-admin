/**
 * Explicit Owner request 2026-10-27: one-time set every existing product to
 * made_to_order. No defaults changed, no changes to order_items, orders or R2.
 * Production write only from the exact one-off Owner branch Actions workflow.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const EXPECTED_REPO='chichute5500/Sindarealest-admin';
const EXPECTED_REF='refs/heads/feature/admin-inline-edit-photo-drag-preorder-2026-10-27';
const PROD_PROJECT='sindarealest2';
const PROD_DB_NAME='sindarealest-db';
const PROD_DB_ID='f6c208a1-052a-445c-a3b7-a442783f9bd3';
const MARKER='owner_fulfillment_bulk_made_to_order_2026_10_27_v1';
const SNAPSHOT_PATH='artifacts/owner-fulfillment-20261027/product-fulfillment-preimage.json';
const mode=process.env.SD_OWNER_BULK_MODE||'';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
function guard(value,label){if(!value)throw Error('OWNER_BULK_BLOCKED: '+label)}
guard(process.env.GITHUB_REPOSITORY===EXPECTED_REPO,'wrong repository');
guard(process.env.GITHUB_REF===EXPECTED_REF,'wrong branch (must be owner feature branch; NEVER main)');
guard(['preflight','apply'].includes(mode),'mode must be preflight or apply');
guard(/^[a-f0-9-]{20,80}$/i.test(account)&&token.length>10,'missing Cloudflare secrets');
async function api(path,body){
 const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{
  method:body?'POST':'GET',
  headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,
  redirect:'error',signal:AbortSignal.timeout(30000)
 });
 const json=await r.json().catch(()=>({}));
 guard(r.ok&&json.success===true,'Cloudflare verification/query refused (HTTP '+r.status+')');
 return json.result;
}
function bindingId(binding){return binding?.id||binding?.database_id||binding?.uuid||''}
const project=await api('/pages/projects/'+PROD_PROJECT);
guard(project?.name===PROD_PROJECT&&project?.production_branch==='main','incorrect Pages Production project/branch');
const linkedDb=bindingId(project?.deployment_configs?.production?.d1_databases?.DB);
guard(linkedDb===PROD_DB_ID,'Production DB binding differs from explicitly authorized DB');
const db=await api('/d1/database/'+PROD_DB_ID);
guard(db?.name===PROD_DB_NAME&&db?.uuid===PROD_DB_ID,'D1 name/uuid mismatch');
async function query(sql,params=[]){
 guard(typeof sql==='string'&&!sql.includes(';'),'one bounded SQL statement only');
 const items=await api('/d1/database/'+PROD_DB_ID+'/query',{sql,params});
 const one=Array.isArray(items)?items[0]:items;
 guard(one?.success===true&&Array.isArray(one?.results),'unexpected D1 query response');
 return {rows:one.results,changes:Number(one.meta?.changes??0)};
}
const marker=await query('SELECT value FROM settings WHERE key=? LIMIT 1',[MARKER]);
guard(marker.rows.length===0,'one-time operation already completed: refusing to run twice');
const source=await query('SELECT id, sku, fulfillment_type FROM products ORDER BY id LIMIT 2001');
guard(source.rows.length>0&&source.rows.length<=2000,'unexpected product count; refuse bulk change');
guard(source.rows.every(x=>typeof x.id==='string'&&x.id&&typeof x.sku==='string'&&
 ['in_stock','made_to_order','unclassified'].includes(x.fulfillment_type)),'unexpected product identity/type');
const ids=new Set(source.rows.map(x=>x.id));
guard(ids.size===source.rows.length,'duplicate product identifiers');
const beforeCount=source.rows.length;
const changeCount=source.rows.filter(x=>x.fulfillment_type!=='made_to_order').length;
const fingerprint=createHash('sha256').update(JSON.stringify(source.rows)).digest('hex');
const snapshot={marker:MARKER,productionDb:PROD_DB_ID,count:beforeCount,remaining:changeCount,fingerprint,items:source.rows};
if(mode==='preflight'){
 await mkdir('artifacts/owner-fulfillment-20261027',{recursive:true});
 await writeFile(SNAPSHOT_PATH,JSON.stringify(snapshot,null,2),{flag:'wx'});
 console.log('OWNER PREFLIGHT PASS: D1 target verified, '+beforeCount+' existing products, '+changeCount+' require update. Only product IDs/SKUs/types backed up; NO DATA WRITES.');
 process.exit(0);
}
const saved=JSON.parse(await readFile(SNAPSHOT_PATH,'utf8'));
guard(saved.marker===MARKER&&saved.productionDb===PROD_DB_ID&&saved.count===beforeCount&&
 saved.remaining===changeCount&&saved.fingerprint===fingerprint&&JSON.stringify(saved.items)===JSON.stringify(source.rows),'preimage changed since backup: ABORT');
const result=await query(
 "UPDATE products SET fulfillment_type='made_to_order', updated_at=datetime('now') WHERE fulfillment_type!='made_to_order' AND NOT EXISTS (SELECT 1 FROM settings WHERE key=?)",[MARKER]);
guard(result.changes===changeCount,'unexpected updated row count: '+result.changes+' vs '+changeCount);
const verify=await query('SELECT COUNT(*) AS total, SUM(CASE WHEN fulfillment_type=? THEN 1 ELSE 0 END) AS placed FROM products',['made_to_order']);
const counts=verify.rows[0]||{};
guard(Number(counts.total)===beforeCount&&Number(counts.placed)===beforeCount,'POST-UPDATE VERIFICATION FAILED: consult preimage artifact');
await query('INSERT INTO settings(key,value,updated_at) VALUES (?, ?, datetime(\'now\'))',[MARKER,JSON.stringify({count:beforeCount,changed:changeCount,fingerprint})]);
try{
 await query("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'product_bulk_fulfillment', 'products', 'all', ?)",
 [crypto.randomUUID(),JSON.stringify({count:beforeCount,changed:changeCount,target:'made_to_order',ownerApproved:true})]);
}catch{console.warn('Audit summary insertion not verified; marker and product verification are still authoritative.')}
console.log('OWNER BULK PASS: '+beforeCount+'/'+beforeCount+' existing products are made_to_order. Changed '+changeCount+'. Future individual edits and new-product defaults remain unchanged. Order records and R2 untouched.');
