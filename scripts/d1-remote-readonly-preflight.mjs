/**
 * Cloudflare D1 preflight, strictly limited to known read-only SQL forms.
 * Uses D1 Read token; no CREATE INDEX, migration, or customer data access.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
if(!/^[a-f0-9]{32}$/.test(account||"") || !token)
  throw new Error("Cloudflare account ID/API token not configured");
const databases=[
  {name:"sindarealest-admin-preview-db",id:"573ad702-05fc-405e-8ef3-0cf2e7fea98d"},
  {name:"sindarealest-db",id:"f6c208a1-052a-445c-a3b7-a442783f9bd3"}
];
const base="https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database/";
const request=async(url,sql)=>{
  const response=await fetch(url,{method:sql?"POST":"GET",
    headers:{Authorization:"Bearer "+token,...(sql?{"Content-Type":"application/json"}:{})},
    ...(sql?{body:JSON.stringify({sql})}:{}),
    signal:AbortSignal.timeout(25000)
  });
  if(!response.ok)throw new Error("Cloudflare API request failed HTTP "+response.status);
  const data=await response.json();
  if(data.success!==true)throw new Error("Cloudflare API response not successful: "+String(data.errors?.[0]?.message||"unknown").slice(0,150));
  return data.result;
};
const readSql=[
  "PRAGMA index_list('audit_logs');",
  "PRAGMA index_list('products');",
  "PRAGMA index_list('order_items');",
  "EXPLAIN QUERY PLAN SELECT id FROM audit_logs WHERE entity_type='order' AND entity_id='qa-no-real-order' AND action='order_created' ORDER BY created_at DESC LIMIT 1;"
];
const report={generatedAt:new Date().toISOString(),isReadOnly:true,databaseChecks:[]};
for(const expected of databases) {
  const info=await request(base+expected.id);
  if(info.name!==expected.name || info.uuid!==expected.id)
    throw new Error("D1 database identity mismatch: refusing further checks");
  let bookmarkStatus="unavailable",bookmark=null;
  try{
    const b=await request(base+expected.id+"/time_travel/bookmark");
    if(typeof b?.bookmark==="string"){
      bookmarkStatus="available";bookmark=b.bookmark;
    }
  }catch{bookmarkStatus="API unsupported or insufficient permissions";}
  const entry={name:expected.name,id:expected.id,version:info.version||"unknown",
    bookmarkStatus,bookmark,indices:{},auditPlan:[],metaRowsRead:0};
  for(const sql of readSql){
    if(!/^\s*(PRAGMA index_list\('|EXPLAIN QUERY PLAN SELECT )/i.test(sql))
      throw new Error("Refusing a SQL command other than readonly PRAGMA / EXPLAIN SELECT");
    const raw=await request(base+expected.id+"/query",sql);
    const parts=Array.isArray(raw)?raw:[raw];
    const first=parts[0]||{};
    if(first.success===false)throw new Error("D1 read-only query unsuccessful");
    const records=Array.isArray(first.results)?first.results:[];
    entry.metaRowsRead+=Number(first.meta?.rows_read)||0;
    if(sql.startsWith("PRAGMA index_list")){
      const table=sql.match(/'([^']+)'/)[1];
      entry.indices[table]=records.map(x=>x.name).filter(x=>typeof x==="string").sort();
    }else{
      entry.auditPlan=records.map(x=>String(x.detail||"")).filter(Boolean);
    }
  }
  report.databaseChecks.push(entry);
  console.log(expected.name+": identity VERIFIED; bookmark="+bookmarkStatus+
    "; table indexes audit/products/items="+[entry.indices.audit_logs?.length,entry.indices.products?.length,entry.indices.order_items?.length].join("/")+
    "; audit composite index="+entry.indices.audit_logs?.includes("idx_audit_entity_action_created")+
    "; read-only check rowsRead="+entry.metaRowsRead);
  console.log("  Audit lookup plan: "+entry.auditPlan.join(" | ").slice(0,350));
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
mkdirSync(resolve(root,"artifacts","d1-readonly"),{recursive:true});
writeFileSync(resolve(root,"artifacts","d1-readonly","preflight.json"),
  JSON.stringify(report,null,2)+"\n",{mode:0o600});
console.log("Strictly read-only D1 preflight complete: no customer/order rows were retrieved and no schema or data changed.");
