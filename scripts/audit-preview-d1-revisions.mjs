/** Guarded idempotent 0016/0017 installer for independent audit Preview D1 only. */
import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
const PAGES_PREVIEW="sindarealest-admin-preview";
const PAGES_PROD="sindarealest2";
const DB_PREVIEW="sindarealest-admin-preview-db";
export function selectIsolatedPreviewD1(preview,prod,meta) {
  assert.equal(preview?.name,PAGES_PREVIEW,"Unexpected Preview project");
  assert.equal(prod?.name,PAGES_PROD,"Unexpected Production project");
  assert.ok(preview?.id && prod?.id && preview.id!==prod.id,"Projects must be independent");
  const id=preview.deployment_configs?.preview?.d1_databases?.DB?.id;
  const prodId=prod.deployment_configs?.production?.d1_databases?.DB?.id;
  assert.match(id||"",/^[0-9a-f-]{36}$/i,"Missing Preview D1 ID");
  assert.match(prodId||"",/^[0-9a-f-]{36}$/i,"Missing Production D1 ID");
  assert.notEqual(id,prodId,"Refusing Production D1 ID");
  assert.notEqual(id,prod.deployment_configs?.preview?.d1_databases?.DB?.id,"Refusing Production-project Preview D1");
  assert.equal(meta?.uuid||meta?.id,id,"D1 metadata ID mismatch");
  assert.equal(meta?.name,DB_PREVIEW,"Refusing any other D1 name");
  return {id,name:DB_PREVIEW};
}
const rows=payload=>(Array.isArray(payload)?payload:[payload]).flatMap(x=>Array.isArray(x?.results)?x.results:[]);
async function main() {
  assert.equal(process.env.GITHUB_REF,"refs/heads/fix/audit-2026-10","Wrong branch");
  assert.equal(process.env.GITHUB_EVENT_NAME,"push","Only branch push is authorized");
  assert.match(process.env.GITHUB_SHA||"",/^[0-9a-f]{40}$/i,"Missing SHA");
  const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
  const token=process.env.CLOUDFLARE_API_TOKEN||"";
  assert.match(account,/^[0-9a-f]{32}$/i,"Missing account");
  assert.ok(token,"Missing token");
  const base="https://api.cloudflare.com/client/v4/accounts/"+account;
  async function cf(path){
    const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});
    assert.ok(r.ok,"Cloudflare identity read HTTP "+r.status);
    const j=await r.json();assert.equal(j?.success,true,"Cloudflare identity response failed");
    return j.result;
  }
  const [preview,prod]=await Promise.all([cf("/pages/projects/"+PAGES_PREVIEW),cf("/pages/projects/"+PAGES_PROD)]);
  const id=preview.deployment_configs?.preview?.d1_databases?.DB?.id;
  assert.match(id||"",/^[0-9a-f-]{36}$/i,"No isolated Preview DB binding");
  const target=selectIsolatedPreviewD1(preview,prod,await cf("/d1/database/"+id));
  const tmp=mkdtempSync(join(tmpdir(),"sd-preview-d1-"));
  const cfg=join(tmp,"wrangler.toml");
  writeFileSync(cfg,[
    'name = "sd-audit-preview-d1"',
    'compatibility_date = "2026-10-12"',
    '[[d1_databases]]',
    'binding = "DB"',
    'database_name = "'+target.name+'"',
    'database_id = "'+target.id+'"',
    ""
  ].join("\n"),{mode:0o600});
  function execD1(args,label){
    const r=spawnSync(process.execPath,[resolve("node_modules/wrangler/bin/wrangler.js"),
      "d1","execute",target.name,"--remote","--config",cfg,"--yes","--json",...args],
      {encoding:"utf8",timeout:150000,maxBuffer:10*1024*1024,
        env:{...process.env,CLOUDFLARE_SEND_METRICS:"false"}});
    if(r.error||r.status!==0)throw Error(label+" failed: "+(r.error?.message||r.stderr||r.status).toString().slice(0,300));
    let j;try{j=JSON.parse(r.stdout)}catch{throw Error(label+" returned non-JSON output");}
    assert.ok(!(Array.isArray(j)?j:[j]).some(x=>x?.success===false),label+" SQL failed");
    return rows(j);
  }
  const countSQL="SELECT (SELECT COUNT(*) FROM products) AS p,(SELECT COUNT(*) FROM audit_logs) AS l,(SELECT COUNT(*) FROM orders) AS o,(SELECT COUNT(*) FROM customers) AS c";
  try{
    const before=execD1(["--command",countSQL],"Before counts")[0];
    assert.ok(before&&Number.isInteger(before.p)&&Number.isInteger(before.l),"Missing tables");
    for(const name of ["0016_admin_products_revision.sql","0017_admin_audit_revision.sql"]){
      const path=resolve("migrations",name);
      assert.match(readFileSync(path,"utf8"),/CREATE TRIGGER IF NOT EXISTS/,"Unexpected migration");
      execD1(["--file",path],"Apply "+name);
      console.log("Isolated Preview migrated: "+name);
    }
    const schema=execD1(["--command",
      "SELECT name FROM sqlite_master WHERE (type='index' AND name IN ('idx_products_sort_sku','idx_audit_created_id_desc')) OR (type='trigger' AND (name LIKE 'trg_products_revision_%' OR name LIKE 'trg_audit_logs_revision_%')) ORDER BY name"
    ],"Check schema").map(x=>x.name).sort();
    const expected=["idx_products_sort_sku","idx_audit_created_id_desc",
      "trg_products_revision_insert","trg_products_revision_update","trg_products_revision_delete",
      "trg_audit_logs_revision_insert","trg_audit_logs_revision_update","trg_audit_logs_revision_delete"].sort();
    assert.deepEqual(schema,expected,"Migration indexes/triggers incomplete");
    const markers=execD1(["--command",
      "SELECT key,value FROM settings WHERE key IN ('products_revision','audit_logs_revision') ORDER BY key"
    ],"Check markers");
    assert.deepEqual(markers.map(x=>x.key).sort(),["audit_logs_revision","products_revision"]);
    assert.ok(markers.every(x=>/^\d+$/.test(String(x.value))),"Invalid revision value");
    assert.deepEqual(execD1(["--command",countSQL],"After counts")[0],before,"Business row counts changed");
    console.log("PASS: Preview D1 only; two indexes + six triggers + two revisions; all business row counts unchanged.");
    if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,
      "\n### Preview D1: PASS\n0016/0017 applied; two indexes, six triggers, both revision counters verified. Business counts unchanged. Production untouched.\n",{flag:"a"});
  }finally{rmSync(tmp,{force:true,recursive:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(e=>{console.error("Preview-only D1 migration BLOCKED/FAILED:",e.message);process.exitCode=1;});
