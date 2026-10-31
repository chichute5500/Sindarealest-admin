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

/* Cloudflare Pages Functions report uses a SEPARATE Analytics dataset from
 * workersInvocationsAdaptive; the latter can contain zero for Pages traffic.
 * Introspect once, select only available aggregate/project/time dimensions,
 * and never request IPs, raw URLs, client agents or row-level traffic.
 */
report.pagesFunctions={schema:{},rows:[],totalsByProject:[],totalsByBranch:[],warnings:[]};
try{
 const g=await api('https://api.cloudflare.com/client/v4/graphql','POST',{
  query: 'query PagesSchema { dims:__type(name:"AccountPagesFunctionsInvocationsAdaptiveGroupsDimensions"){fields{name}} filt:__type(name:"AccountPagesFunctionsInvocationsAdaptiveGroupsFilter_InputObject"){inputFields{name}} sum:__type(name:"AccountPagesFunctionsInvocationsAdaptiveGroupsSum"){fields{name}} group:__type(name:"AccountPagesFunctionsInvocationsAdaptiveGroups"){fields{name}} }'
 });
 if(g.errors?.length)throw Error('Pages schema introspection: '+g.errors.map(e=>e.message).join('; ').slice(0,170));
 const values=(key,member)=>((g.data?.[key]?.[member])||[]).map(x=>x.name).filter(x=>/^[A-Za-z]\w*$/.test(x));
 const dims=values('dims','fields'),filters=values('filt','inputFields'),sums=values('sum','fields'),groups=values('group','fields');
 report.pagesFunctions.schema={dimensions:dims,filters,aggregates:sums,groups};
 if(!dims.length||!filters.length||!groups.length)throw Error('Pages schema not exposed by Cloudflare Analytics');
 const groupBy=['projectName','projectId','deploymentId','deploymentName','deploymentBranch','branch','branchName','environment','environmentName','scriptName','datetimeHour','date','status','invocationStatus','hostname','host'].filter(x=>dims.includes(x));
 const selects=groupBy.length?groupBy:[dims[0]];
 const metrics=['requests','subrequests','errors','success','successes','invocations'].filter(x=>sums.includes(x));
 const bounds=filters.includes('datetime_geq')&&filters.includes('datetime_leq')
  ?{sql:'datetime_geq:$start, datetime_leq:$end', vars:'$start: Time!, $end: Time!', values:{start:window.startUtc,end:window.endUtc}}
  :filters.includes('datetimeHour_geq')&&filters.includes('datetimeHour_leq')
   ?{sql:'datetimeHour_geq:$start, datetimeHour_leq:$end',vars:'$start: Time!, $end: Time!',values:{start:window.startUtc,end:window.endUtc}}
   :filters.includes('date_geq')&&filters.includes('date_leq')
    ?{sql:'date_geq:$start, date_leq:$end',vars:'$start: Date!, $end: Date!',values:{start:window.startUtc.slice(0,10),end:window.endUtc.slice(0,10)}}
    :null;
 if(!bounds)throw Error('Pages dataset time filters unrecognized; do not perform unbounded query');
 const order=groupBy.includes('datetimeHour')?',orderBy:[datetimeHour_ASC]':'';
 const sub=['count',selects.length?'dimensions { '+selects.join(' ')+' }':'',metrics.length?'sum { '+metrics.join(' ')+' }':''].filter(Boolean).join(' ');
 const query='query PagesInvocations($account:string!, '+bounds.vars.slice(1)+') { viewer { accounts(filter:{accountTag:$account}) { pagesFunctionsInvocationsAdaptiveGroups(limit:1000, filter:{'+bounds.sql+'}'+order+') { '+sub+' } } } }';
 const d=await api('https://api.cloudflare.com/client/v4/graphql','POST',{query,variables:{account,...bounds.values}});
 if(d.errors?.length)throw Error('Pages analytics: '+d.errors.map(e=>e.message).join('; ').slice(0,250));
 const accounts=d.data?.viewer?.accounts||[];
 if(!accounts.length)throw Error('Pages Analytics: selected account not visible');
 const rows=accounts.flatMap(x=>x.pagesFunctionsInvocationsAdaptiveGroups||[]);
 report.pagesFunctions.rows=rows.slice(0,250).map(x=>({
  dimensions:Object.fromEntries(Object.entries(x.dimensions||{}).filter(([k])=>selects.includes(k))),
  count:Number(x.count)||0,
  sum:Object.fromEntries(Object.entries(x.sum||{}).filter(([k])=>metrics.includes(k)).map(([k,v])=>[k,Number(v)||0]))
 }));
 const aggregate=(field)=>{
  const map=new Map();
  for(const x of rows){
   const k=String(x.dimensions?.[field]||'(unknown)').slice(0,120);
   const a=map.get(k)||{name:k,count:0,requests:0,subrequests:0};
   a.count+=Number(x.count)||0;
   a.requests+=Number(x.sum?.requests)||0;
   a.subrequests+=Number(x.sum?.subrequests)||0;
   map.set(k,a);
  }
  return [...map.values()].sort((a,b)=>b.count-a.count).slice(0,35);
 };
 const proj=['projectName','projectId','scriptName'].find(x=>groupBy.includes(x));
 const br=['branch','branchName','deploymentBranch','deploymentId','environment'].find(x=>groupBy.includes(x));
 if(proj)report.pagesFunctions.totalsByProject=aggregate(proj);
 if(br)report.pagesFunctions.totalsByBranch=aggregate(br);
 report.pagesFunctions.rowCount=rows.length;
 report.pagesFunctions.groupDimension=proj||null;
 report.pagesFunctions.branchDimension=br||null;
 if(!rows.length)report.pagesFunctions.warnings.push('Pages dataset returned no records for UTC window; not proof of zero traffic');
}catch(e){report.pagesFunctions.warnings.push(smallError(e));}

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
