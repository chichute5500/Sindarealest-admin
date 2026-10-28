// Scoped one-time product-title normalization for 22 Owner-approved new items.
// Never touches prices, descriptions, SKUs, images, category, published, or URL slugs.
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { defaultProductTitle } from '../functions/_catalog-sku.js';
const {CLOUDFLARE_API_TOKEN:token='',CLOUDFLARE_ACCOUNT_ID:account=''}=process.env;
const id='f6c208a1-052a-445c-a3b7-a442783f9bd3',project='sindarealest2';
const branch='refs/heads/fix/recent-production-product-titles-2026-10-28';
const mode=process.argv[2],dir='artifacts/recent-product-titles-20261028';
if(!['prepare','apply'].includes(mode)||
 process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||
 process.env.GITHUB_REF!==branch||
 !/^[a-f0-9]{32}$/.test(account)||!token)
 throw Error('PRODUCT_TITLE_MAINTENANCE_GUARD_FAILED');
const expectedSku=[
 ...Array.from({length:16},(_,i)=>'SD-GL'+String(i+26).padStart(3,'0')),
 ...Array.from({length:6},(_,i)=>'SD-SN'+String(i+69).padStart(3,'0'))
];
const allowed=new Set(expectedSku);
if(allowed.size!==22)throw Error('INVALID_ALLOWLIST');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(path,sql){
 const r=await fetch(base+path,{
  method:sql?'POST':'GET',
  headers:{Authorization:'Bearer '+token,...(sql?{'Content-Type':'application/json'}:{})},
  body:sql?JSON.stringify(sql):undefined,
  redirect:'error',signal:AbortSignal.timeout(30000)
 });
 const j=await r.json().catch(()=>null);
 if(!r.ok||!j?.success)throw Error('CLOUDFLARE_PRODUCT_TITLES_HTTP_'+r.status);
 return j.result;
}
const [db,pages]=await Promise.all([api('/d1/database/'+id),api('/pages/projects/'+project)]);
const binding=pages?.deployment_configs?.production?.d1_databases?.DB;
if(db?.uuid!==id||db?.name!=='sindarealest-db'||pages?.name!==project||
 pages?.production_branch!=='main'||(binding?.id||binding?.database_id)!==id)
 throw Error('PRODUCTION_DATABASE_BINDING_GUARD_FAILED');
async function query(sql,params=[]){
 const result=await api('/d1/database/'+id+'/query',{sql,params});
 const q=Array.isArray(result)?result[0]:result;
 if(!q?.success||!Array.isArray(q.results))throw Error('PRODUCTION_D1_QUERY_FAILED');
 return q;
}
const sql='SELECT id,sku,title,category,category_label,slug,created_at,updated_at FROM products WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC LIMIT 100';
const rows=(await query(sql,['2026-10-28 00:00:00','2026-10-29 00:00:00'])).results;
const scoped=rows.filter(row=>allowed.has(row.sku));
if(scoped.length!==22 || new Set(scoped.map(x=>x.sku)).size!==22)
 throw Error('TARGET_SET_CHANGED_EXPECT_22_TODAY');
for(const row of scoped){
 if(row.category!==(row.sku.startsWith('SD-GL')?'loafers':'sneakers')||
 !row.created_at?.startsWith('2026-10-28 ')||
 typeof row.title!=='string'||!row.slug||!row.id||!row.updated_at||
 !defaultProductTitle(row.category,row.sku))
  throw Error('PRODUCT_IDENTITY_GUARD_FAILED_'+row.sku);
}
const plan=scoped.map(row=>({
 id:row.id,sku:row.sku,category:row.category,slug:row.slug,
 created_at:row.created_at,updated_at:row.updated_at,
 from:row.title,to:defaultProductTitle(row.category,row.sku)
}));
if(mode==='prepare'){
 await mkdir(dir,{recursive:true});
 await writeFile(dir+'/rollback-manifest.json',JSON.stringify({
  created_at:new Date().toISOString(),source_sha:process.env.GITHUB_SHA,
  target_project:project,scope:'only 22 new products created on 2026-10-28',
  entries:plan
 },null,2));
 console.log('TITLE_RENAME_PREVIEW='+JSON.stringify({
  targets:plan.length,mismatched:plan.filter(x=>x.from!==x.to).length,
  categories:{loafers:plan.filter(x=>x.category==='loafers').length,
   sneakers:plan.filter(x=>x.category==='sneakers').length},
  changes:plan.filter(x=>x.from!==x.to).map(x=>({sku:x.sku,from:x.from,to:x.to}))
 }));
 console.log('SAFE_READONLY_PREVIEW_SUCCESS_NO_WRITES');
} else {
 const manifest=JSON.parse(await readFile(dir+'/rollback-manifest.json','utf8'));
 if(manifest.source_sha!==process.env.GITHUB_SHA||
 manifest.entries?.length!==22||
 manifest.target_project!==project||
 JSON.stringify(manifest.entries.map(x=>x.sku).sort())!==JSON.stringify([...allowed].sort()))
  throw Error('ROLLBACK_MANIFEST_MISMATCH');
 const bySku=new Map(plan.map(x=>[x.sku,x]));
 // Fail closed if names, SKUs, dates, or slugs changed after the dry run.
 for(const old of manifest.entries){
  const fresh=bySku.get(old.sku);
  if(!fresh||Object.keys(fresh).some(k=>fresh[k]!==old[k]))throw Error('CONCURRENT_PRODUCT_EDIT_'+old.sku);
 }
 let changed=0,skipped=0;
 for(const row of manifest.entries){
  if(row.from===row.to){skipped++;continue}
  const updated=await query(
   "UPDATE products SET title=?,updated_at=datetime('now') WHERE id=? AND sku=? AND category=? AND title=? AND created_at=? AND updated_at=?",
   [row.to,row.id,row.sku,row.category,row.from,row.created_at,row.updated_at]
  );
  if(Number(updated.meta?.changes)!==1)throw Error('TITLE_CAS_WRITE_NOT_ONE_'+row.sku);
  changed++;
 }
 const after=(await query(sql,['2026-10-28 00:00:00','2026-10-29 00:00:00'])).results;
 for(const orig of manifest.entries){
  const now=after.find(x=>x.id===orig.id);
  if(!now||now.title!==orig.to||now.sku!==orig.sku||now.slug!==orig.slug||
   now.category!==orig.category||now.created_at!==orig.created_at)
   throw Error('TITLE_POST_WRITE_VERIFICATION_FAILED_'+orig.sku);
 }
 console.log('PRODUCTION_TITLE_RENAME_VERIFIED='+JSON.stringify({
   targeted:22,changed,alreadyCorrect:skipped,
   unchangedUrlsAndSkus:true,verified:22
 }));
}
