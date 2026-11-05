// PR174 isolated Preview D1 SQL acceptance diagnostic with synthetic records only.
import { randomUUID,randomBytes } from 'node:crypto';
const branch='feat/manual-warranty-management-20261105';
const repo='chichute5500/Sindarealest-admin';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'', token=process.env.CLOUDFLARE_API_TOKEN||'';
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=='refs/heads/'+branch||
  !/^\d+$/.test(process.env.GITHUB_RUN_ID||'')||!/^[a-f0-9]{32}$/i.test(account)||token.length<12)
  throw Error('DIAG_SCOPE_NOT_VERIFIED');
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
async function api(path,body){
 const res=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('DIAG_HTTP_'+res.status);
 const v=await res.json();
 if(v?.success!==true)throw Error('DIAG_CLOUDFLARE_API_'+JSON.stringify((v.errors||[]).map(x=>x.code)).slice(0,100));
 return v.result;
}
const [preview,prod]=await Promise.all([api('/pages/projects/sindarealest-admin-preview'),api('/pages/projects/sindarealest2')]);
const dbid=(p,e)=>p?.deployment_configs?.[e]?.d1_databases?.DB?.id||p?.deployment_configs?.[e]?.d1_databases?.DB?.database_id||'';
const id=dbid(preview,'preview'),production=dbid(prod,'production'),adminProd=dbid(preview,'production');
if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(id)||!production||id===production||id===adminProd)
 throw Error('DIAG_SHARED_DATABASE_BLOCKED');
const qpath='/d1/database/'+id+'/query';
async function query(sql,params=[]){
 const result=await api(qpath,{sql,params});
 if(!Array.isArray(result)||result[0]?.success!==true)
   throw Error('DIAG_SQL_ERROR_'+JSON.stringify(result?.[0]?.error||'unknown').slice(0,200));
 return result[0];
}
const code='SDW-'+randomBytes(3).toString('hex').toUpperCase().slice(0,4).replaceAll('0','2').replaceAll('1','3');
const wId=randomUUID(),auditId=randomUUID(),name='PR174 SQL QA '+process.env.GITHUB_RUN_ID;
const diagnostics=[];
try{
 const p=await query('SELECT warranty_code FROM warranties WHERE upper(warranty_code) IN (?) UNION ALL SELECT warranty_code FROM manual_warranties WHERE upper(warranty_code) IN (?)',[code,code]);
 diagnostics.push({stage:'code-preflight',rows:p.results?.length});
 const a=await query("INSERT INTO manual_warranties(id,warranty_code,customer_name,customer_phone,customer_address,product_name,price,policy_name,duration_months,starts_at,ends_at,status) VALUES(?,?,?,?,?,?,?,'Bảo hành trực tiếp',?,?,?,'active')",
  [wId,code,name,'0000000000','Dữ liệu QA','Ví QA',1600000,6,'2026-11-05','2027-05-05']);
 diagnostics.push({stage:'warranty-insert',metaChanges:a.meta?.changes??null});
 const b=await query("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','manual_warranty_issued','manual_warranty',?,?)",
  [auditId,wId,JSON.stringify({note:'synthetic QA'})]);
 diagnostics.push({stage:'audit-insert',metaChanges:b.meta?.changes??null});
 console.log('PASS: isolated Preview D1 accepts exact manual warranty and audit SQL; '+JSON.stringify(diagnostics));
}finally{
 await query('DELETE FROM audit_logs WHERE id=? AND entity_type=?',[auditId,'manual_warranty']);
 await query('DELETE FROM manual_warranties WHERE id=? AND customer_name=?',[wId,name]);
 const check=await query('SELECT COUNT(*) AS n FROM manual_warranties WHERE id=?',[wId]);
 if(Number(check.results?.[0]?.n)!==0)throw Error('DIAG_QA_CLEANUP_FAILED');
 console.log('PASS: direct SQL QA rows removed from isolated Preview D1.');
}
