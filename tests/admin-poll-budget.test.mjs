/** Local-only Admin polling budget; no network or Production D1 calls. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../public/admin/index.html",import.meta.url),"utf8");
function part(begin){
 const start=source.indexOf(begin),end=source.indexOf("\n}",start)+2;
 assert.ok(start>=0&&end>start,"Missing Admin policy function: "+begin);
 return source.slice(start,end);
}
const policy=new Function(part("function adminResourcesForView(targetView){")+"\n"+part("function adminSyncResourceNames(targetView,broad,full){")+"\n"+part("function adminSyncBackoffMs(failures){")+"\nreturn {adminSyncResourceNames,adminSyncBackoffMs};")();
const names=policy.adminSyncResourceNames;
assert.deepEqual(names("dashboard",false,false),["orders","logs"],"Dashboard keeps 10-second order refresh");
assert.deepEqual(names("orders",false,false),["orders","logs"],"Orders keeps 10-second order refresh");
assert.deepEqual(names("order-detail",false,false),["orders","logs"],"Order detail keeps 10-second order refresh");
for(const view of ["products","customers","warranties","settings","backup","activity"]){
 assert.deepEqual(names(view,false,false),["logs"],"Inactive order listing must not be polled: "+view);
 assert.ok(!names(view,true,false).includes("orders"),"45-second broad sync must not fetch inactive orders: "+view);
 assert.ok(names(view,true,false).includes("logs"),"Notifications remain live: "+view);
}
assert.deepEqual(names("products",true,false),["products","logs"]);
assert.deepEqual(names("customers",true,false),["customers","logs"]);
assert.deepEqual(names("settings",true,false),["settings","paymentQr","logs"]);
assert.deepEqual(names("backup",true,false),["products","warranties","settings","logs"]);
assert.deepEqual(names("order-detail",true,false),["orders","products","logs"]);
const all=["products","settings","paymentQr","orders","customers","warranties","logs"];
assert.deepEqual(names("orders",false,true),all,"Manual full refresh continues to fetch every resource");
assert.deepEqual([1,2,3,4,5,99].map(policy.adminSyncBackoffMs),[15000,30000,60000,120000,120000,120000]);
assert.match(source,/!full&&Date\.now\(\)<adminSyncRetryAfter/,"Automatic retries must honor backoff");
assert.match(source,/adminSyncRetryAfter=lastAdminSync\+adminSyncBackoffMs\(adminSyncFailureStreak\)/);
assert.match(source,/adminSyncFailureStreak=0;adminSyncRetryAfter=0/,"Success resets the backoff");
assert.match(source,/setInterval\(\(\)=>\{if\(adminSyncSafe\(\)\)void syncAdminData\(\)\.catch\(\(\)=>\{\}\)\},10000\)/,"10-second order cadence preserved");
assert.ok(!source.includes("const names=broad?['orders','logs','customers','warranties','products','settings','paymentQr']:['orders','logs']"),"No unconditional full-data polling");
console.log("PASS: view-scoped Admin polling, notifications, manual full refresh, and bounded failure backoff.");
