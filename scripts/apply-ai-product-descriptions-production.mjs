/**
 * One-time SinDarealest description refresh, owner request 28 October 2026.
 * Production D1: modify product.description only (+updated_at). Does not deploy or
 * change SKU, title, slug, images, price, stock, category, fulfillment or orders.
 * Copy is AI-assisted editorial text derived from product title/category, not
 * from uninspected image pixels. Do not claim visual product verification.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { generateDescriptionPlan } from './ai-product-description-copy.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const database='f6c208a1-052a-445c-a3b7-a442783f9bd3';
const project='sindarealest2';
const marker='owner_catalog_ai_editorial_descriptions_2026_10_28';
const branch='refs/heads/chore/ai-descriptions-catalog-2026-10-28';
function must(v,message){if(!v)throw Error(message)}
must(process.env.GITHUB_REPOSITORY==='chichute5500/Sindarealest-admin'&&
 process.env.GITHUB_REF===branch&&process.env.GITHUB_EVENT_NAME==='push'&&
 /^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA||'')&&
 /^[0-9a-f]{32}$/.test(account)&&token.length>0,'EXECUTION_GUARD_FAILED');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(path,body){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{
  Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
 const j=await r.json().catch(()=>null);
 must(r.ok&&j?.success===true,'CLOUDFLARE_ERROR_'+r.status);
 return j.result;
}
async function query(sql,params=[]){
 const rs=await api('/d1/database/'+database+'/query',{sql,params});
 const r=Array.isArray(rs)?rs[0]:rs;
 must(r?.success===true&&Array.isArray(r.results),'D1_QUERY_FAILED');
 return {rows:r.results,changes:Number(r.meta?.changes??-1)};
}
const [db,pages]=await Promise.all([api('/d1/database/'+database),api('/pages/projects/'+project)]);
const binding=pages?.deployment_configs?.production?.d1_databases?.DB;
must(db?.uuid===database&&db?.name==='sindarealest-db'&&pages?.name===project&&
 (binding?.id||binding?.database_id)===database,'PRODUCTION_BINDING_IDENTITY_FAILED');
const sql='SELECT id,sku,title,category,category_label,description,published FROM products WHERE published=1 LIMIT 2001';
const before=await query(sql);
const rows=before.rows;
must(rows.length===217&&new Set(rows.map(r=>r.category)).size===15,'PUBLISHED_COHORT_UNEXPECTED');
const count=await query('SELECT COUNT(*) AS total FROM products WHERE published=1');
must(Number(count.rows?.[0]?.total)===rows.length,'CATALOG_CHANGED_DURING_READ');
const plan=generateDescriptionPlan(rows);
const already=plan.every(p=>p.before===p.after);
const m=await query('SELECT value FROM settings WHERE key=? LIMIT 1',[marker]);
if(m.rows.length){
 must(already,'MARKER_PRESENT_BUT_DESCRIPTIONS_CHANGED');
 console.log('CATALOG_DESCRIPTIONS=ALREADY_COMPLETED count='+plan.length);
}else if(already){
 console.log('CATALOG_DESCRIPTIONS=ALREADY_MATCHING count='+plan.length);
}else{
 await mkdir('backup',{recursive:true});
 await writeFile('backup/catalog-descriptions-before-2026-10-28.json',
  JSON.stringify({date:'2026-10-28',scope:'published-products-descriptions-only',
    database,products:plan},null,2)+'\n',{flag:'wx'});
 console.log('CATALOG_DESCRIPTIONS_PREFLIGHT=PASS count='+plan.length+
  ' categories='+new Set(rows.map(r=>r.category)).size+
  ' existing='+plan.filter(p=>p.before.trim()).length+
  ' min_chars='+Math.min(...plan.map(p=>p.after.length))+
  ' max_chars='+Math.max(...plan.map(p=>p.after.length)));
 // Atomic catalog-wide snapshot check guards against concurrent edits:
 // even one changed title/description/SKU cancels the entire UPDATE.
 const payload=JSON.stringify(plan);
 const update=`
 WITH desired AS (
  SELECT json_extract(value,'$.id') AS id,
    json_extract(value,'$.sku') AS sku,
    json_extract(value,'$.title') AS title,
    json_extract(value,'$.category') AS category,
    json_extract(value,'$.before') AS old_text,
    json_extract(value,'$.after') AS new_text
  FROM json_each(?)
 ),
 valid AS (
  SELECT COUNT(*) AS n FROM products AS p
  JOIN desired AS d ON p.id=d.id AND p.sku=d.sku
    AND p.title=d.title AND p.category=d.category
    AND p.description=d.old_text AND p.published=1
 )
 UPDATE products SET description=desired.new_text,updated_at=datetime('now')
 FROM desired
 WHERE products.id=desired.id AND products.sku=desired.sku
   AND products.title=desired.title AND products.category=desired.category
   AND products.description=desired.old_text AND products.published=1
   AND (SELECT n FROM valid)=?
 `;
 const result=await query(update,[payload,plan.length]);
 console.log('CATALOG_DESCRIPTIONS_UPDATE_REPORTED='+result.changes);
 const after=await query(sql);
 const afterById=new Map(after.rows.map(r=>[r.id,r]));
 must(after.rows.length===plan.length&&plan.every(p=>{
  const row=afterById.get(p.id);
  return row?.sku===p.sku&&row?.title===p.title&&row?.category===p.category&&
    Number(row.published)===1&&row.description===p.after;
 }), 'POSTCHECK_MISMATCH_NOT_ALL_ROWS_UPDATED');
 await query("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now'))",
  [marker,JSON.stringify({count:plan.length,categories:15,
    date:'2026-10-28',source:'AI-assisted-title-and-category-editorial'})]);
 console.log('CATALOG_DESCRIPTIONS=PASS total='+plan.length+
  ' changed='+plan.filter(p=>p.before!==p.after).length+
  ' categories=15 unchanged_non_description_fields=true');
}
