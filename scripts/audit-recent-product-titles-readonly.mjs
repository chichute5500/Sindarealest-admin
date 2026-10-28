// Read-only production D1 audit: only product identity fields, no customer data.
import { defaultProductTitle, officialSkuPrefix, normalizeCatalogCategory } from '../functions/_catalog-sku.js';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'',token=process.env.CLOUDFLARE_API_TOKEN||'';
const database='f6c208a1-052a-445c-a3b7-a442783f9bd3',project='sindarealest2';
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||
   process.env.GITHUB_REF!=='refs/heads/audit/recent-product-titles-2026-10-28'||
   !/^[a-f0-9]{32}$/.test(account)||!token)
 throw Error('RECENT_TITLES_READONLY_GUARD_FAILED');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function req(path,params){
 const r=await fetch(base+path,{method:params?'POST':'GET',
 headers:{Authorization:'Bearer '+token,...(params?{'Content-Type':'application/json'}:{})},
 body:params?JSON.stringify(params):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||!j?.success)throw Error('CLOUDFLARE_RECENT_PRODUCT_READ_ERROR_HTTP_'+r.status);
 return j.result;
}
const [db,pages]=await Promise.all([req('/d1/database/'+database),req('/pages/projects/'+project)]);
const binding=pages?.deployment_configs?.production?.d1_databases?.DB;
if(db?.uuid!==database||db?.name!=='sindarealest-db'||pages?.name!==project||
  (binding?.id||binding?.database_id)!==database||pages?.production_branch!=='main')
 throw Error('RECENT_PRODUCT_TARGET_NOT_VERIFIED');
const sql='SELECT id,sku,title,category,category_label,created_at,updated_at,published FROM products ORDER BY created_at DESC, id DESC LIMIT 60';
const result=await req('/d1/database/'+database+'/query',{sql,params:[]});
const q=Array.isArray(result)?result[0]:result;
if(!q?.success||!Array.isArray(q.results))throw Error('RECENT_PRODUCT_D1_QUERY_FAILED');
const details=q.results.map(row=>{
 const category=normalizeCatalogCategory(row.category),expected=defaultProductTitle(category,row.sku);
 return {id:row.id,sku:row.sku,title:row.title,category:row.category,
 category_label:row.category_label,created_at:row.created_at,updated_at:row.updated_at,
 published:row.published,expected:expected||null,
 mismatch:!!expected&&row.title!==expected,
 skuMatch:!!expected&&String(row.sku).toUpperCase().startsWith(officialSkuPrefix(category))};
});
console.log('PRODUCTION_RECENT_PRODUCTS='+JSON.stringify(details));
console.log('PRODUCTION_RECENT_SUMMARY='+JSON.stringify({
 scanned:details.length,canonical:details.filter(x=>x.skuMatch).length,
 mismatched:details.filter(x=>x.mismatch).length,
 newest:details[0]?.created_at??null,oldest:details.at(-1)?.created_at??null,
 byDay:Object.entries(details.reduce((a,x)=>(a[String(x.created_at||'').slice(0,10)]=(a[String(x.created_at||'').slice(0,10)]||0)+1,a),{}))
}));
