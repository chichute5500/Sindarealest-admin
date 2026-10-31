/**
 * One-time Cloudflare usage diagnosis. Only GET requests for Pages metadata
 * and read-only GraphQL Analytics POST. No site traffic, SQL, deployment, or writes.
 * Sanitized metrics, no request URLs, client IPs, tokens or customer data.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
// Prefer a separate, read-only Account Analytics token. Never expand the
// existing deployment token's permissions solely for diagnostics.
const analyticsToken=process.env.CLOUDFLARE_ANALYTICS_TOKEN||token;
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
if(!token||!/^[a-f0-9]{32}$/i.test(account))throw Error('Missing/invalid Cloudflare credentials');
const root='https://api.cloudflare.com/client/v4/accounts/'+account;
const end=new Date(),start=new Date(end.getTime()-40*60*60*1000);
const window={startUtc:start.toISOString(),endUtc:end.toISOString()};
const report={generatedAt:end.toISOString(),window,analyticsAccountCount:null,graphqlRowsSeen:0,projectMetadata:[],workerTotals:[],previewHourly:[],previewScriptVersions:[],warnings:[]};
async function api(path,method='GET',body){
 const res=await fetch(path,{method,headers:{Authorization:'Bearer '+(path==='https://api.cloudflare.com/client/v4/graphql'?analyticsToken:token),...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('Cloudflare API HTTP '+res.status);
 const json=await res.json();
 if(json.success===false)throw Error('Cloudflare API rejected: '+String(json.errors?.[0]?.message||'unknown').slice(0,100));
 return json;
}
function smallError(e){return String(e.message||e).replace(/(?:[a-f0-9]{32,}|Bearer\s+\S+)/gi,'[redacted]').slice(0,180);}
for(const name of ['sindarealest-admin-preview','sindarealest2']){
 try{
  const p=(await api(root+'/pages/projects/'+name)).result;
  report.projectMetadata.push({
   project:name,productionBranch:p.production_branch||null,
   previewScriptName:p.preview_script_name||null,
   productionScriptName:p.production_script_name||null,
   usesFunctions:p.uses_functions??null
  });
 }catch(e){report.warnings.push('Cannot read Pages project '+name+': '+smallError(e));}
}
async function gqlField(fieldSelection,alias){
 const query='query WorkersReadOnly($account: string!, $start: Time!, $end: Time!) { viewer { accounts(filter:{accountTag:$account}) {'+alias+': '+fieldSelection+' } } }';
 const d=await api('https://api.cloudflare.com/client/v4/graphql','POST',{
  query,variables:{account,start:window.startUtc,end:window.endUtc}
 });
 if(d.errors?.length)throw Error('GraphQL: '+d.errors.map(x=>x.message).join('; ').slice(0,300));
 const accounts=d.data?.viewer?.accounts;
 if(!Array.isArray(accounts))throw Error('Unexpected GraphQL analytics payload');
 report.analyticsAccountCount=accounts.length;
 if(accounts.length===0)throw Error('GraphQL token has NO accessible account for CLOUDFLARE_ACCOUNT_ID; verify token Account Resources scope and Account ID');
 const values=accounts.flatMap(x=>x?.[alias]||[]);
 report.graphqlRowsSeen+=values.length;
 return values;
}
try{
 const totals=await gqlField('workersInvocationsAdaptive(limit: 2000, filter:{datetime_geq:$start,datetime_leq:$end}, orderBy:[sum_requests_DESC]) { dimensions { scriptName } sum { requests errors subrequests } }','totals');
 const grouped=new Map();
 for(const row of totals){
  const script=String(row.dimensions?.scriptName||'(unknown)').slice(0,128);
  const old=grouped.get(script)||{script,requests:0,errors:0,subrequests:0};
  for(const key of ['requests','errors','subrequests'])old[key]+=Number(row.sum?.[key])||0;
  grouped.set(script,old);
 }
 report.workerTotals=[...grouped.values()].sort((a,b)=>b.requests-a.requests).slice(0,50);
 if(report.workerTotals.length===0)report.warnings.push('No Workers invocations in selected UTC range even though API access succeeded; check Cloudflare analytics retention, selected Account ID and sampling.');
}catch(e){report.warnings.push('Worker totals unavailable: '+smallError(e));}
const preview=report.projectMetadata.find(x=>x.project==='sindarealest-admin-preview')?.previewScriptName;
if(preview && /^[A-Za-z0-9_.-]+$/.test(preview)){
 // Escape an ordinary, source-validated Pages script name into GraphQL via JSON string encoding.
 const lit=JSON.stringify(preview);
 try{
  const rows=await gqlField('workersInvocationsAdaptive(limit: 150, filter:{scriptName:'+lit+',datetime_geq:$start,datetime_leq:$end}, orderBy:[datetimeHour_ASC]) { dimensions { datetimeHour } sum { requests errors subrequests } }','hours');
  report.previewHourly=rows.map(x=>({
   hour:x.dimensions?.datetimeHour,requests:Number(x.sum?.requests)||0,
   errors:Number(x.sum?.errors)||0,subrequests:Number(x.sum?.subrequests)||0
  })).slice(0,120);
 }catch(e){report.warnings.push('Preview hourly analytics unavailable: '+smallError(e));}
 try{
  const rows=await gqlField('workersInvocationsAdaptive(limit: 100, filter:{scriptName:'+lit+',datetime_geq:$start,datetime_leq:$end}, orderBy:[sum_requests_DESC]) { dimensions { scriptVersion } sum { requests errors subrequests } }','versions');
  report.previewScriptVersions=rows.map(x=>({version:String(x.dimensions?.scriptVersion||'unknown').slice(0,80),
   requests:Number(x.sum?.requests)||0,errors:Number(x.sum?.errors)||0,subrequests:Number(x.sum?.subrequests)||0})).slice(0,70);
 }catch(e){report.warnings.push('Preview script-version breakdown unavailable: '+smallError(e));}
}else{report.warnings.push('Preview script name unavailable; per-preview GraphQL filters were skipped.');}
const dir='artifacts/workers-attribution';
mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log('Read-only account Workers Analytics captured; project='+report.projectMetadata.length+
 '; scripts='+report.workerTotals.length+'; hours='+report.previewHourly.length+
 '; versions='+report.previewScriptVersions.length+'; warnings='+report.warnings.length);
for(const r of report.workerTotals.slice(0,12))
 console.log('script='+r.script+' requests='+r.requests+' subrequests='+r.subrequests);
for(const w of report.warnings)console.log('NOTE: '+w);
console.log('NOT a per-branch breakdown; scriptVersion is not established to map to a Pages deployment.');
