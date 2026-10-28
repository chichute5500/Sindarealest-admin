// Read-only production D1 category identity audit; no customer fields, no product mutations.
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'',token=process.env.CLOUDFLARE_API_TOKEN||'';
const database='f6c208a1-052a-445c-a3b7-a442783f9bd3',project='sindarealest2';
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||
   process.env.GITHUB_REF!=='refs/heads/fix/category-canonical-dedupe-2026-10-28'||
   !/^[a-f0-9]{32}$/.test(account)||!token)throw Error('CATEGORY_AUDIT_GUARD_FAILED');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function req(path,params){
 const r=await fetch(base+path,{method:params?'POST':'GET',
 headers:{Authorization:'Bearer '+token,...(params?{'Content-Type':'application/json'}:{})},
 body:params?JSON.stringify(params):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||!j?.success)throw Error('CLOUDFLARE_CATEGORY_AUDIT_ERROR_'+r.status);
 return j.result;
}
const [db,pages]=await Promise.all([req('/d1/database/'+database),req('/pages/projects/'+project)]);
const binding=pages?.deployment_configs?.production?.d1_databases?.DB;
if(db?.uuid!==database||db?.name!=='sindarealest-db'||pages?.name!==project||
 (binding?.id||binding?.database_id)!==database)throw Error('CATEGORY_D1_TARGET_MISMATCH');
const sql='SELECT category, category_label, published, COUNT(*) AS n FROM products GROUP BY category,category_label,published ORDER BY category,category_label,published';
const response=await req('/d1/database/'+database+'/query',{sql,params:[]});
const q=Array.isArray(response)?response[0]:response;
if(!q?.success||!Array.isArray(q.results))throw Error('CATEGORY_D1_QUERY_FAILED');
console.log('CATEGORY_D1_AUDIT='+JSON.stringify(q.results));
const d=await req('/d1/database/'+database+'/query',{sql:"SELECT id,sku,title,category,category_label,slug,published FROM products WHERE category IN ('giay-the-thao','wallets') ORDER BY sku LIMIT 40",params:[]});
const detail=Array.isArray(d)?d[0]:d;
if(!detail?.success||!Array.isArray(detail.results))throw Error('CATEGORY_ALIAS_QUERY_FAILED');
console.log('CATEGORY_ALIAS_ROWS='+JSON.stringify(detail.results));
console.log('CATEGORY_D1_COUNTS='+JSON.stringify({
 published:q.results.filter(r=>Number(r.published)===1).reduce((n,r)=>n+Number(r.n),0),
 canonicalCodes:new Set(q.results.filter(r=>Number(r.published)===1).map(r=>r.category)).size,
 visibleLabels:new Set(q.results.filter(r=>Number(r.published)===1).map(r=>r.category_label)).size
}));
