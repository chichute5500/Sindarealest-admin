// Read-only, one-shot catalogue profile and a single Workers AI capability probe.
// No D1 or R2 writes; no production deploy.
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const db='f6c208a1-052a-445c-a3b7-a442783f9bd3';
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||
process.env.GITHUB_REF!=='refs/heads/chore/ai-descriptions-catalog-2026-10-28'||
!token||!/^[0-9a-f]{32}$/.test(account))throw Error('READ_ONLY_PREFLIGHT_GUARD');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(url,body){
 const res=await fetch(url,{method:body?'POST':'GET',headers:{
 'Authorization':'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000),redirect:'error'});
 const obj=await res.json().catch(()=>null);
 if(!res.ok||!obj?.success)throw Error('API_FAILED_'+res.status+'_'+String(obj?.errors?.[0]?.code||''));
 return obj.result;
}
const [d,p]=await Promise.all([api(base+'/d1/database/'+db),api(base+'/pages/projects/sindarealest2')]);
const binding=p?.deployment_configs?.production?.d1_databases?.DB;
if(d?.uuid!==db||d?.name!=='sindarealest-db'||(binding?.database_id||binding?.id)!==db)
 throw Error('PRODUCTION_D1_IDENTITY_MISMATCH');
const response=await api(base+'/d1/database/'+db+'/query',{sql:'SELECT sku,title,category,category_label,description,published FROM products ORDER BY category,sku LIMIT 2001'});
const q=Array.isArray(response)?response[0]:response;
if(!q?.success||!Array.isArray(q.results))throw Error('QUERY_FAILED');
const rows=q.results;
const pub=rows.filter(r=>Number(r.published)===1);
const group={};
for(const r of pub){
 if(!group[r.category])group[r.category]={count:0,samples:[],oldDescriptions:0};
 group[r.category].count++;
 if(group[r.category].samples.length<3)group[r.category].samples.push({sku:r.sku,title:r.title,description:(r.description||'').slice(0,150)});
 if((r.description||'').trim())group[r.category].oldDescriptions++;
}
console.log('CATALOG_PROFILE='+JSON.stringify({all:rows.length,published:pub.length,categories:group}));
try {
 const url=base+'/ai/run/@cf/meta/llama-3.2-11b-vision-instruct';
 const r=await fetch(url,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({messages:[
    {role:'system',content:'Viết tiếng Việt chính xác, không thêm thông tin chưa kiểm chứng.'},
    {role:'user',content:'Viết một câu mô tả cho sản phẩm giày thể thao SinDarealest, chỉ dựa vào tên và danh mục.'}
  ],max_tokens:120,temperature:0.3}),
  redirect:'error',signal:AbortSignal.timeout(26000)
 });
 const obj=await r.json().catch(()=>null);
 console.log('WORKERS_AI_PROBE='+JSON.stringify({http:r.status,success:obj?.success,
   errorCodes:(obj?.errors||[]).map(e=>e.code),
   hasText:Boolean(obj?.result?.response),
   sample:String(obj?.result?.response||'').slice(0,200)}));
}catch(e){console.log('WORKERS_AI_PROBE_FAILED='+String(e.message).slice(0,180))}
