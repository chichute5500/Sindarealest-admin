/**
 * One-time, owner-approved Production D1 catalog cleanup (27 Oct 2026).
 * DELETE only products.published=0; do not delete orders, warranties or R2.
 * Preserve id/slug, so legacy /sanpham/<category>/<id> URLs 301 to the new SKU.
 * Requires exact Production Pages+D1 binding and a main push. Runs once using
 * a D1 settings marker; later hidden draft products will NOT be deleted.
 */
import { planCatalogCutover } from './catalog-cutover-plan.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const database='f6c208a1-052a-445c-a3b7-a442783f9bd3';
const project='sindarealest2';
const marker='catalog_cutover_official_sku_2026_10_27';
function must(condition,message){if(!condition)throw Error(message)}
async function api(path,body){
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{
  method:body?'POST':'GET',
  headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)
 });
 const data=await response.json().catch(()=>null);
 must(response.ok&&data?.success===true,'CLOUDFLARE_REQUEST_FAILED_'+response.status);
 return data.result;
}
async function query(sql,params=[]){
 const res=await api('/d1/database/'+database+'/query',{sql,params});
 const q=Array.isArray(res)?res[0]:res;
 must(q?.success===true&&Array.isArray(q.results),'D1_SQL_QUERY_FAILED');
 return {rows:q.results,changes:Number(q?.meta?.changes??-1)};
}
function identity(binding){return binding?.id||binding?.database_id||''}
must(process.env.GITHUB_REPOSITORY==='chichute5500/Sindarealest-admin'&&
 process.env.GITHUB_REF==='refs/heads/main'&&
 process.env.GITHUB_EVENT_NAME==='push'&&
 process.env.CLOUDFLARE_PAGES_PROJECT===project&&
 /^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||'')&&
 /^[0-9a-f]{32}$/.test(account)&&token,'PRODUCTION_EXECUTION_GUARD_FAILED');
const db=await api('/d1/database/'+database);
must(db?.uuid===database&&db?.name==='sindarealest-db','PRODUCTION_D1_IDENTITY_FAILED');
const pages=await api('/pages/projects/'+project);
must(pages?.name===project&&identity(pages?.deployment_configs?.production?.d1_databases?.DB)===database,
 'PRODUCTION_PAGES_D1_BINDING_MISMATCH');
// The marker MUST be checked before reading or changing future catalog drafts.
const status=await query('SELECT value FROM settings WHERE key=? LIMIT 1',[marker]);
if(status.rows.length) {
 console.log('CATALOG_CUTOVER=ALREADY_COMPLETED; no D1 mutations attempted');
} else {
 const before=await query('SELECT id,sku,sku_verified,category,category_label,published,created_at,sort_order FROM products LIMIT 3001');
 const plan=planCatalogCutover(before.rows);
 must(plan.published.length>=200&&plan.published.length<=400,'PRODUCTION_PUBLISHED_COHORT_UNEXPECTED');
 must(plan.hidden.length>=200&&plan.hidden.length<=1000,'PRODUCTION_HIDDEN_COHORT_UNEXPECTED');
 const check=await query('SELECT COUNT(*) AS total, SUM(CASE WHEN published=1 THEN 1 ELSE 0 END) AS live, SUM(CASE WHEN published=0 THEN 1 ELSE 0 END) AS hidden FROM products');
 must(check.rows.length===1&&Number(check.rows[0].total)===before.rows.length&&
  Number(check.rows[0].live)===plan.published.length&&Number(check.rows[0].hidden)===plan.hidden.length,
  'CATALOG_CHANGED_DURING_PREFLIGHT');
 console.log('CATALOG_CUTOVER_PREFLIGHT=PASS live='+plan.published.length+' hidden='+plan.hidden.length+' categories=15');
 // Two-phase renaming: reserve every SKU (including hidden legacy values)
 // before allocating the approved 15-category IDs. Hidden rows are NOT deleted
 // until all live rows are verified in their final states.
 const temp=await query("UPDATE products SET sku='MIG-'||upper(hex(randomblob(16))),sku_verified=0 WHERE published IN(0,1)");
 must(temp.changes===before.rows.length,'TEMP_SKU_UPDATE_COUNT_MISMATCH');
 const mapping=JSON.stringify(plan.planned);
 const final=await query("UPDATE products SET sku=(SELECT json_extract(value,'$.sku') FROM json_each(?) WHERE json_extract(value,'$.id')=products.id), sku_verified=1 WHERE published=1",[mapping]);
 must(final.changes===plan.published.length,'OFFICIAL_SKU_UPDATE_COUNT_MISMATCH');
 const verified=await query('SELECT id,sku,sku_verified,published,category FROM products LIMIT 3001');
 const expected=new Map(plan.planned.map(x=>[x.id,x.sku]));
 must(verified.rows.length===before.rows.length&&verified.rows.filter(x=>Number(x.published)===1).length===plan.published.length&&
   verified.rows.filter(x=>Number(x.published)===1).every(x=>
     Number(x.sku_verified)===1&&expected.get(x.id)===x.sku),'CATALOG_OFFICIAL_POSTCHECK_FAILED');
 // Historical orders and warranties are snapshots, intentionally untouched.
 // R2 files are NOT deleted. Deletion only occurs AFTER SKU verification.
 const removed=await query('DELETE FROM products WHERE published=0');
 must(removed.changes===plan.hidden.length,'HIDDEN_DELETE_COUNT_MISMATCH');
 const after=await query('SELECT id,sku,sku_verified,published,category FROM products LIMIT 3001');
 must(after.rows.length===plan.published.length&&after.rows.every(x=>Number(x.published)===1&&
  Number(x.sku_verified)===1&&expected.get(x.id)===x.sku),'CATALOG_POSTCHECK_FAILED');
 await query("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now'))",[marker,JSON.stringify({
  date:'2026-10-27',removed:plan.hidden.length,verified:plan.published.length,categories:15
 })]);
 console.log('CATALOG_CUTOVER=PASS removed_hidden='+plan.hidden.length+' official_skus='+plan.published.length+
  ' legacy_id_links=preserved');
}
