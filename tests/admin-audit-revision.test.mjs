/**
 * Real Admin audit endpoint + SQLite migration. All records are synthetic,
 * in-memory. No Cloudflare, customer, production or Preview data is modified.
 */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {createSession} from "../functions/_lib.js";
import {onRequestGet} from "../functions/api/admin/audit-logs.js";

const db=new DatabaseSync(":memory:");
for(const file of ["0001_schema.sql","0003_storefront_operations.sql","0017_admin_audit_revision.sql"])
  db.exec(readFileSync(new URL("../migrations/"+file,import.meta.url),"utf8"));
const migration=readFileSync(new URL("../migrations/0017_admin_audit_revision.sql",import.meta.url),"utf8");
db.exec(migration);
const current=()=>db.prepare("SELECT value FROM settings WHERE key='audit_logs_revision'").get()?.value??null;
assert.equal(current(),"0","Idempotent migration cannot reset revision");
const listSQL="SELECT id,actor,action,entity_type,entity_id,details_json,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 200";
const plan=db.prepare("EXPLAIN QUERY PLAN "+listSQL).all().map(x=>x.detail).join(" | ");
assert.match(plan,/idx_audit_created_id_desc/,"Full audit history should use the covering sort index");
const secret="qa-only-long-enough-session-secret-for-crypto-signing";
const session=await createSession(secret);
let fullReads=0,cheapReads=0;
const env={ADMIN_PASSWORD:"qa-only-admin-password",SESSION_SECRET:secret,DB:{
  prepare(sql) {
    if(sql===listSQL)fullReads++;
    if(sql.includes("key='audit_logs_revision'"))cheapReads++;
    let params=[];
    return {
      bind(...x){params=x;return this;},
      async first(){return db.prepare(sql).get(...params)??null;},
      async all(){return {results:db.prepare(sql).all(...params)};}
    };
  }
}};
const read=async(token=null,authenticated=true)=>{
  const url="https://qa.invalid/api/admin/audit-logs"+(token===null?"":"?revision="+encodeURIComponent(token));
  const request=new Request(url,{headers:{
    Origin:"https://qa.invalid","Sec-Fetch-Site":"same-origin",
    ...(authenticated?{Cookie:"sd_admin_session="+session}:{})
  }});
  const response=await onRequestGet({request,env});
  return {status:response.status,body:await response.json()};
};
const insert=(id,time="2026-11-01 01:00:00")=>db.prepare(
  "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?)"
).run(id,"qa","test_only","product",id,"{}",time);
insert("alpha");
insert("beta");
assert.equal(current(),"2","Audit insert triggers invalidate the client");
let response=await read();
assert.equal(response.status,200);
assert.deepEqual(response.body.logs.map(x=>x.id),["beta","alpha"],"Preserve audit ordering");
assert.equal(response.body.revision,"2");
assert.equal(fullReads,1);
response=await read("2");
assert.deepEqual(response.body,{unchanged:true,revision:"2"});
for(let i=0;i<50;i++)assert.equal((await read("2")).body.unchanged,true);
assert.equal(fullReads,1,"50 idle polls must not repeat the heavy log query");
assert.equal(cheapReads,52,"All polls should use the single-indexed revision lookup");

db.prepare("UPDATE audit_logs SET action='qa_changed' WHERE id='beta'").run();
assert.equal(current(),"3");
response=await read("2");
assert.equal(fullReads,2);
assert.equal(response.body.logs[0].action,"qa_changed");
assert.equal(response.body.revision,"3");

db.prepare("DELETE FROM audit_logs WHERE id='alpha'").run();
assert.equal(current(),"4");
response=await read("3");
assert.deepEqual(response.body.logs.map(x=>x.id),["beta"]);
const beforeRestore=Number(current());
db.exec("BEGIN");
try {
 db.prepare("DELETE FROM audit_logs").run();
 insert("restored");
 db.exec("COMMIT");
}catch(e){db.exec("ROLLBACK");throw e;}
assert.equal(Number(current()),beforeRestore+2,"Restore-style delete plus insert must invalidate audit history");
response=await read(String(beforeRestore));
assert.deepEqual(response.body.logs.map(x=>x.id),["restored"]);
const forbidden=await read(current(),false);
assert.equal(forbidden.status,401);
const beforeFall=fullReads;
db.prepare("DELETE FROM settings WHERE key='audit_logs_revision'").run();
response=await read("6");
assert.ok(Array.isArray(response.body.logs));
assert.equal(Object.hasOwn(response.body,"revision"),false,"Missing revision should use legacy payload");
assert.equal(fullReads,beforeFall+1,"Pre-migration fallback always reads the full log list");
console.log("PASS: Admin audit revision, 50 idle polls, auth, index, restore and fallback.");
