// Clean only this GitHub Actions run's own two synthetic rows on isolated Preview D1.
const branch="feat/manual-warranty-management-20261105",repo="chichute5500/Sindarealest-admin";
const run=process.env.GITHUB_RUN_ID||"",account=process.env.CLOUDFLARE_ACCOUNT_ID||"",token=process.env.CLOUDFLARE_API_TOKEN||"";
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=="refs/heads/"+branch||
  !/^\d+$/.test(run)||!/^[a-f0-9]{32}$/i.test(account)||token.length<12)throw Error("QA_CLEANUP_SCOPE_MISSING");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
async function api(path,method="GET",payload){
 const r=await fetch(base+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  ...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("QA_CLEANUP_HTTP_"+r.status);
 const value=await r.json();
 if(value?.success!==true)throw Error("QA_CLEANUP_API_FAILED");
 return value.result;
}
const [preview,prod]=await Promise.all([
  api("/pages/projects/sindarealest-admin-preview"),api("/pages/projects/sindarealest2")
]);
const id=(x,e)=>x?.deployment_configs?.[e]?.d1_databases?.DB?.id||x?.deployment_configs?.[e]?.d1_databases?.DB?.database_id||"";
const target=id(preview,"preview"),prodId=id(prod,"production"),adminProd=id(preview,"production");
if(preview?.name!=="sindarealest-admin-preview"||prod?.name!=="sindarealest2"||
  !/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(target)||!prodId||
  target.toLowerCase()===prodId.toLowerCase()||
  (adminProd&&target.toLowerCase()===adminProd.toLowerCase()))
  throw Error("QA_CLEANUP_D1_NOT_ISOLATED");
const path="/d1/database/"+target+"/query";
async function query(sql,params=[]){
 const result=await api(path,"POST",{sql,params});
 if(!Array.isArray(result)||result[0]?.success!==true)throw Error("QA_CLEANUP_D1_QUERY_FAILED");
 return result[0]?.results||[];
}
const name="PR174 QA "+run,phone="0000000000";
const rows=await query("SELECT id FROM manual_warranties WHERE customer_name=? AND customer_phone=? AND product_name LIKE 'PR174 QA %'",[name,phone]);
if(rows.length>2)throw Error("QA_CLEANUP_RECORD_COUNT_UNEXPECTED");
for(const row of rows){
 if(!/^[a-f0-9-]{36}$/i.test(row.id))throw Error("QA_CLEANUP_INVALID_ROW_ID");
 await query("DELETE FROM audit_logs WHERE entity_type='manual_warranty' AND action='manual_warranty_issued' AND entity_id=?",[row.id]);
 await query("DELETE FROM manual_warranties WHERE id=? AND customer_name=? AND customer_phone=?",[row.id,name,phone]);
}
const after=await query("SELECT COUNT(*) AS n FROM manual_warranties WHERE customer_name=? AND customer_phone=?",[name,phone]);
if(Number(after[0]?.n)!==0)throw Error("QA_CLEANUP_VERIFY_FAILED");
console.log("PASS: cleaned only current-run synthetic warranty records from isolated Preview D1; Production untouched.");
