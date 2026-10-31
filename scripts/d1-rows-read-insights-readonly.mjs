/**
 * Read-only account D1 telemetry: GraphQL Analytics + Wrangler insights.
 * Never execute SQL against a database; never print raw SQL or credentials.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if(!account || !token) throw new Error("GitHub Cloudflare secrets are missing (read-only telemetry cannot run)");
const databases = [
  {name:"sindarealest-admin-preview-db",id:"573ad702-05fc-405e-8ef3-0cf2e7fea98d"},
  {name:"sindarealest-db",id:"f6c208a1-052a-445c-a3b7-a442783f9bd3"}
];
const labels = new Map(databases.map(x=>[x.id,x.name]));
const dates = [new Date(Date.now()-86400000).toISOString().slice(0,10),new Date().toISOString().slice(0,10)];
const query = `query D1RowsReadAudit($account: string!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      d1AnalyticsAdaptiveGroups(limit: 500, filter: { date_geq: $start, date_leq: $end }) {
        dimensions { date databaseId }
        sum { rowsRead rowsWritten readQueries writeQueries }
      }
    }
  }
}`;
const response = await fetch("https://api.cloudflare.com/client/v4/graphql",{
  method:"POST", headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({query,variables:{account,start:dates[0],end:dates[1]}}),
  signal:AbortSignal.timeout(30000)
});
if(!response.ok) throw new Error("Cloudflare Analytics endpoint returned HTTP "+response.status);
const gql = await response.json();
if(gql.errors?.length) throw new Error("Cloudflare GraphQL unavailable: "+gql.errors.map(e=>e.message).join("; ").slice(0,220));
const rows = gql.data?.viewer?.accounts?.flatMap(x=>x.d1AnalyticsAdaptiveGroups||[])||[];
if(!Array.isArray(rows)) throw new Error("Cloudflare returned unexpected Analytics payload");

const output = {generatedAt:new Date().toISOString(),timeWindowUtc:dates,databases:[],accountTotals:{}};
for(const date of dates) {
  const relevant=rows.filter(x=>x.dimensions?.date===date);
  const totals=relevant.reduce((a,r)=>{
    for(const field of ["rowsRead","rowsWritten","readQueries","writeQueries"])a[field]+=(Number(r.sum?.[field])||0);
    return a;
  },{rowsRead:0,rowsWritten:0,readQueries:0,writeQueries:0});
  output.accountTotals[date]=totals;
}
const classify = sql => {
  const s=String(sql||"").toLowerCase();
  if(s.includes("with recent_orders"))return "admin_orders";
  if(s.includes("from audit_logs"))return "audit_logs";
  if(s.includes("from products") && s.includes("published"))return "public_products";
  if(s.includes("from products"))return "admin_products_or_detail";
  if(s.includes("from customers"))return "customers";
  if(s.includes("from order_payment"))return "payments";
  if(s.includes("from customer_auth"))return "customer_auth";
  return "other";
};
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const wrangler=resolve(root,"node_modules/wrangler/bin/wrangler.js");
for(const db of databases){
  const daily=rows.filter(x=>x.dimensions?.databaseId===db.id)
    .map(x=>({date:x.dimensions.date, ...Object.fromEntries(
      ["rowsRead","rowsWritten","readQueries","writeQueries"].map(k=>[k,Number(x.sum?.[k])||0])
    )}));
  const args=[wrangler,"d1","insights",db.id,"--time-period=12h","--sort-type=sum",
    "--sort-by=reads","--limit=20","--json"];
  const child=spawnSync(process.execPath,args,{
    cwd:root, env:{...process.env,CI:"true"},encoding:"utf8",timeout:45000,
    maxBuffer:2*1024*1024
  });
  const item={name:db.name,databaseId:db.id,daily,topQueries:[]};
  if(child.status!==0){
    item.insightsStatus="unavailable; Account Analytics Read permission may be missing";
  } else {
    try {
      const raw=JSON.parse(child.stdout.trim());
      const queries=Array.isArray(raw)?raw:Array.isArray(raw?.data)?raw.data:[];
      item.insightsStatus="ok";
      item.topQueries=queries.map(x=>({
        category:classify(x.query),
        fingerprint:createHash("sha256").update(String(x.query||"")).digest("hex").slice(0,10),
        totalRowsRead:Number(x.totalRowsRead)||0,
        avgRowsRead:Number(x.avgRowsRead)||0,
        count:Number(x.numberOfTimesRun)||0,
        avgDurationMs:Number(x.avgDurationMs)||0
      }));
    } catch {
      item.insightsStatus="unparseable Wrangler insights output";
    }
  }
  output.databases.push(item);
}
const directory=resolve(root,"artifacts","d1-readonly");
mkdirSync(directory,{recursive:true});
writeFileSync(resolve(directory,"summary.json"),JSON.stringify(output,null,2)+"\n",{mode:0o600});
console.log("D1 Analytics dates UTC: "+dates.join(", "));
console.log("Account totals (all D1 databases, including other projects):");
for(const [date,stats] of Object.entries(output.accountTotals))
  console.log(date+": rowsRead="+stats.rowsRead+", rowsWritten="+stats.rowsWritten);
for(const db of output.databases){
  console.log("\n"+db.name+":");
  for(const row of db.daily)console.log("  "+row.date+": rowsRead="+row.rowsRead+" readQueries="+row.readQueries);
  console.log("  Insights: "+db.insightsStatus);
  for(const q of db.topQueries.slice(0,10))
    console.log("  "+q.category+" ["+q.fingerprint+"]: total="+q.totalRowsRead+", avg="+q.avgRowsRead+", calls="+q.count);
}
console.log("Note: historical analytics include pre-optimization traffic; no D1 index changes or application deploy happened.");
