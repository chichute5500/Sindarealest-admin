import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as issueWarranty } from "../functions/api/admin/warranties.js";

const SECRET = "warranty-issue-race-test-secret-long-enough";
const PASSWORD = "test-admin-password-long-enough";
const session = await createSession(SECRET);

function makeDB(inserted, { orderStatusAtBatch = "completed", collideFirstCode = false } = {}) {
  const calls = { batchCount: 0, statements: [] };
  return {
    calls,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM orders o JOIN order_items")) {
            return { orderId: "order-1", status: "completed", itemId: "item-1", existingWarrantyId: null };
          }
          return null;
        },
      };
    },
    async batch(statements) {
      calls.batchCount++;
      if (collideFirstCode && calls.batchCount === 1) {
        throw new Error('D1_ERROR: UNIQUE constraint failed: warranties.warranty_code');
      }
      calls.statements = statements.map((statement) => ({ sql: statement.sql, values: statement.values }));
      // Simulate the order changing after the preflight SELECT but before the atomic D1 INSERT.
      const checksCompletedOrderAtInsert = /AND EXISTS \(SELECT 1 FROM orders WHERE id=\? AND status='completed'\)/.test(calls.statements[0].sql);
      const actuallyInserted = inserted && (checksCompletedOrderAtInsert ? orderStatusAtBatch === "completed" : true);
      return [{ meta: { changes: actuallyInserted ? 1 : 0 } }, { meta: { changes: actuallyInserted ? 1 : 0 } }];
    },
  };
}
async function post(DB, overrides = {}) {
  return issueWarranty({
    request: new Request("https://shop.example/api/admin/warranties", {
      method: "POST",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderNumber: "ORD-0001", sku: "SD-SN001", policyName: "Bảo hành đường may",
        durationMonths: 12, startsAt: "2026-10-17", ...overrides,
      }),
    }),
    env: { DB, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: SECRET },
  });
}

// Reject malformed durations without touching D1; keep decimal strings from
// the real browser's FormData serialization backwards-compatible.
for (const [label, value] of [
  ["boolean", true],
  ["array", [12]],
  ["object", { value: 12 }],
  ["whitespace string", " 12 "],
]) {
  const db = makeDB(true);
  const result = await post(db, { durationMonths: value });
  assert.equal(result.status, 400, label + " duration must be rejected");
  assert.equal(db.calls.batchCount, 0, label + " duration must not create warranty records");
}
const stringMonths = makeDB(true);
assert.equal((await post(stringMonths, { durationMonths: "12" })).status, 201,
  "numeric string durations from real HTML FormData must remain supported");

const successDB = makeDB(true);
const success = await post(successDB);
assert.equal(success.status, 201, "first warranty issue should succeed");
assert.match((await success.json()).warrantyCode,/^SDW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
assert.equal(successDB.calls.batchCount, 1, "warranty insert and audit record must be one atomic batch");
assert.match(successDB.calls.statements[0].sql, /INSERT INTO warranties[\s\S]*SELECT[\s\S]*WHERE NOT EXISTS \(SELECT 1 FROM warranties WHERE order_item_id=\?\)/,
  "the insert itself must atomically check for an existing warranty for this order item");
assert.match(successDB.calls.statements[0].sql, /AND EXISTS \(SELECT 1 FROM orders WHERE id=\? AND status='completed'\)/,
  "the atomic warranty insert must recheck that the order is still completed after the preflight read");
assert.match(successDB.calls.statements[1].sql, /INSERT INTO audit_logs[\s\S]*WHERE EXISTS \(SELECT 1 FROM warranties WHERE id=\?\)/,
  "audit event must only be inserted if this request actually created the warranty");

const collisionDB=makeDB(true,{collideFirstCode:true});
const recovered=await post(collisionDB);
assert.equal(recovered.status,201,'manual issue regenerates after a D1 code collision');
assert.equal(collisionDB.calls.batchCount,2,'collision requires a second atomic batch');
assert.match((await recovered.json()).warrantyCode,/^SDW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);

const duplicateDB = makeDB(false);
const duplicate = await post(duplicateDB);
assert.equal(duplicate.status, 409, "concurrent/duplicate issuance should return a conflict when the conditional insert changes no rows");
assert.equal(duplicateDB.calls.batchCount, 1);

const staleOrderDB = makeDB(true, { orderStatusAtBatch: "shipped" });
const staleOrder = await post(staleOrderDB);
assert.equal(staleOrder.status, 409, "warranty issuance must be refused if the order stops being completed after preflight");
assert.equal(staleOrderDB.calls.batchCount, 1, "the stale order guard must run atomically at insert time");

function makeManualDB({ collideFirstCode = false } = {}) {
  const calls = { batchCount: 0, statements: [], preflightQueries: [] };
  return {
    calls,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async all() { calls.preflightQueries.push({sql:this.sql,values:this.values});return {results:[]}; },
      };
    },
    async batch(statements) {
      calls.batchCount++;
      if (collideFirstCode && calls.batchCount === 1) {
        throw new Error('D1_ERROR: UNIQUE constraint failed: manual_warranties.warranty_code');
      }
      calls.statements = statements.map(statement => ({ sql: statement.sql, values: statement.values }));
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };
}
async function postManual(DB, overrides = {}) {
  return issueWarranty({
    request: new Request("https://shop.example/api/admin/warranties", {
      method: "POST",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "manual",
        customerName: "Nguyễn Văn A",
        customerPhone: "0901234567",
        customerAddress: "123 Đường thử, Đà Lạt, Lâm Đồng",
        productName: "Ví da cá sấu",
        price: 2800000,
        durationMonths: 6,
        startsAt: "2026-11-05",
        ...overrides,
      }),
    }),
    env: { DB, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: SECRET },
  });
}
const invalidManualDB = makeManualDB();
const invalidManual = await postManual(invalidManualDB, { price: "2800000.5" });
assert.equal(invalidManual.status, 400, "manual warranty must reject fractional prices");
assert.equal(invalidManualDB.calls.batchCount, 0, "invalid manual warranty must not write to D1");

const manualDB = makeManualDB();
const manual = await postManual(manualDB);
assert.equal(manual.status, 201, "manual warranty must be issuable without any order or SKU");
const manualResult = await manual.json();
assert.match(manualResult.warrantyCode, /^SDW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
assert.equal(manualDB.calls.batchCount, 1, "manual warranty and audit record must be written atomically");
assert.ok(manualDB.calls.preflightQueries[0].sql.includes("FROM warranties") && manualDB.calls.preflightQueries[0].sql.includes("FROM manual_warranties"),
  "new codes must be preflight-checked against both warranty namespaces");
assert.ok(manualDB.calls.statements[0].sql.includes("INSERT INTO manual_warranties") &&
  manualDB.calls.statements[1].sql.includes("INSERT INTO audit_logs"),
  "warranty and audit must be written in the same atomic D1 batch");

const manualCollisionDB = makeManualDB({ collideFirstCode: true });
const manualCollision = await postManual(manualCollisionDB);
assert.equal(manualCollision.status, 201, "standalone code collision must regenerate a fresh code");
assert.equal(manualCollisionDB.calls.batchCount, 2);
const multiDB=makeManualDB();
const multi=await postManual(multiDB,{items:[
  {productName:"Ví da cá sấu",price:"1600000",durationMonths:"6",startsAt:"2026-11-07"},
  {productName:"Túi da cá sấu",price:"4500000",durationMonths:"12",startsAt:"2026-11-07"},
]});
assert.equal(multi.status,201,"two products must be issuable in a single request");
const multiResult=await multi.json();
assert.equal(multiResult.warranties.length,2);
assert.notEqual(multiResult.warranties[0].warrantyCode,multiResult.warranties[1].warrantyCode);
assert.equal(multiResult.warranties[0].durationMonths,6);
assert.equal(multiResult.warranties[1].durationMonths,12);
assert.equal(multiDB.calls.batchCount,1,"both product codes and audits must share one transaction");
assert.equal(multiDB.calls.statements.length,4,"one issue and one audit per product");
assert.equal(multiDB.calls.preflightQueries[0].values.length,4,"preflight must check both namespaces for both generated codes");
const invalidSecondDB=makeManualDB();
const invalidSecond=await postManual(invalidSecondDB,{items:[
  {productName:"Ví da cá sấu",price:"1600000",durationMonths:"6",startsAt:"2026-11-07"},
  {productName:"Túi da cá sấu",price:"4500000.5",durationMonths:"12",startsAt:"2026-11-07"},
]});
assert.equal(invalidSecond.status,400,"invalid second product must reject the entire purchase");
assert.equal(invalidSecondDB.calls.batchCount,0,"invalid multi-product request must not issue any code");
assert.equal((await postManual(makeManualDB(),{items:[]})).status,400,"empty purchase must fail");
assert.equal((await postManual(makeManualDB(),{items:Array(11).fill({productName:"Ví da",price:"1600000",durationMonths:"6",startsAt:"2026-11-07"})})).status,400,"more than ten products must fail");
console.log("PASS: warranty issuance prevents duplicates and issues multiple product codes atomically.");
