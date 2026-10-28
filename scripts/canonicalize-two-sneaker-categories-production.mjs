/**
 * One-time owner-approved Production D1 category normalization.
 * Scope: SD-SN069 & SD-SN070 only, category field (and category_label if needed).
 * Never modify SKU, slug, product title, description, images, price, stock,
 * published status, order / warranty records, or R2. No web deployment.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';
const dbid = 'f6c208a1-052a-445c-a3b7-a442783f9bd3';
const branch = 'refs/heads/ops/canonicalize-two-sneakers-d1-2026-10-28';
const expectedRows = [
  { id:'b29731e7-48da-4418-8c21-5a04d316241d', sku:'SD-SN069' },
  { id:'2f86e258-bcf4-470c-a53c-bb27560be464', sku:'SD-SN070' }
];
function must(v, name) { if(!v) throw Error(name); }
must(
 process.env.GITHUB_REPOSITORY === 'chichute5500/Sindarealest-admin' &&
 process.env.GITHUB_REF === branch && process.env.GITHUB_EVENT_NAME === 'push' &&
 /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '') &&
 /^[a-f0-9]{32}$/.test(account) && token.length>0,
 'CATEGORY_NORMALIZATION_EXECUTION_GUARD_FAILED'
);
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(path,body){
 const response=await fetch(base+path,{
  method:body===undefined?'GET':'POST',
  headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
  body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(30000), redirect:'error'
 });
 const data=await response.json().catch(()=>null);
 must(response.ok&&data?.success===true,'CLOUDFLARE_REQUEST_FAILED_'+response.status);
 return data.result;
}
async function sql(query,params=[]){
 const x=await api('/d1/database/'+dbid+'/query',{sql:query,params});
 const r=Array.isArray(x)?x[0]:x;
 must(r?.success===true&&Array.isArray(r.results),'D1_SQL_QUERY_FAILED');
 return {rows:r.results,changes:Number(r.meta?.changes??-1)};
}
const [db,pages]=await Promise.all([
 api('/d1/database/'+dbid),
 api('/pages/projects/sindarealest2')
]);
const bound=pages?.deployment_configs?.production?.d1_databases?.DB;
must(db?.uuid===dbid&&db?.name==='sindarealest-db'&&pages?.name==='sindarealest2'&&
 (bound?.id||bound?.database_id)===dbid,'PRODUCTION_D1_BINDING_MISMATCH');

const queryAll='SELECT id,sku,slug,title,description,category,category_label,published,price,stock,images_json,source_price_confirmed,fulfillment_type,sort_order,created_at,updated_at FROM products WHERE sku IN (?,?) ORDER BY sku';
const skus=expectedRows.map(x=>x.sku);
const snapshot=(await sql(queryAll,skus)).rows;
must(snapshot.length===2&&expectedRows.every((expected,index)=>snapshot[index]?.id===expected.id&&
  snapshot[index]?.sku===expected.sku&&Number(snapshot[index]?.published)===1),
 'SKU_ID_PUBLISHED_SNAPSHOT_MISMATCH');
const allCanonical=snapshot.every(x=>x.category==='sneakers');
const allLegacy=snapshot.every(x=>x.category==='giay-the-thao'&&
 x.category_label==='Giày thể thao');
must(allCanonical||allLegacy,'UNEXPECTED_MIXED_OR_CHANGED_CATEGORY_STATE');
const prior=await sql("SELECT category,COUNT(*) AS n FROM products WHERE published=1 GROUP BY category ORDER BY category");
const counts=Object.fromEntries(prior.rows.map(r=>[r.category,Number(r.n)]));
const total=prior.rows.reduce((sum,r)=>sum+Number(r.n),0);
must(total===219,'UNEXPECTED_PUBLISHED_PRODUCT_COUNT');
must(allCanonical
 ? Object.keys(counts).length===15&&counts.sneakers===70
 : Object.keys(counts).length===16&&counts.sneakers===68&&counts['giay-the-thao']===2,
 'CATALOG_PREFLIGHT_COUNT_CHANGED');
if(allCanonical){
 console.log('CANONICAL_D1=ALREADY_COMPLETED products=70 categories=15');
}else{
 await mkdir('backup',{recursive:true});
 await writeFile('backup/sneaker-alias-before-2026-10-28.json',
  JSON.stringify({date:'2026-10-28',table:'products',database:dbid,old:snapshot},null,2)+'\n',{flag:'wx'});
 console.log('CANONICAL_D1_PREFLIGHT=PASS published='+total+
  ' legacy=2 canonical_sneakers=68 backup=written');
 const statement=`
 UPDATE products SET category='sneakers', category_label='Giày thể thao'
 WHERE published=1 AND category='giay-the-thao' AND category_label='Giày thể thao'
 AND ((id=? AND sku=?) OR (id=? AND sku=?))
 AND (SELECT COUNT(*) FROM products WHERE published=1 AND category='giay-the-thao')=2
 AND (SELECT COUNT(*) FROM products WHERE published=1 AND category='sneakers')=68
 `;
 const result=await sql(statement,[expectedRows[0].id,expectedRows[0].sku,expectedRows[1].id,expectedRows[1].sku]);
 must(result.changes===2,'UPDATE_CHANGED_ROW_COUNT_NOT_TWO');
 const updated=(await sql(queryAll,skus)).rows;
 const final=(await sql("SELECT category,COUNT(*) AS n FROM products WHERE published=1 GROUP BY category ORDER BY category")).rows;
 const afterCount=Object.fromEntries(final.map(r=>[r.category,Number(r.n)]));
 const afterTotal=final.reduce((sum,r)=>sum+Number(r.n),0);
 must(updated.length===2&&updated.every((r,i)=>r.category==='sneakers'&&
   r.category_label==='Giày thể thao'&&r.id===snapshot[i].id&&
   r.sku===snapshot[i].sku&&
   Object.keys(snapshot[i]).every(k=>
     k==='category'||k==='category_label'||r[k]===snapshot[i][k])) &&
   afterTotal===219&&final.length===15&&afterCount.sneakers===70&&
   !Object.hasOwn(afterCount,'giay-the-thao'),
  'PRODUCTION_POSTCHECK_FAILED');
 console.log('CANONICAL_D1=PASS changed=2 sneaker_products=70 published=219 categories=15 sku_slug_prices_images_descriptions_unchanged=true');
}
