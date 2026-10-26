import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as issueWarranty } from "../functions/api/admin/warranties.js";

const SECRET = "warranty-issue-race-test-secret-long-enough";
const PASSWORD = "test-admin-password-long-enough";
const session = await createSession(SECRET);

function makeDB(inserted, { orderStatusAtBatch = "completed" } = {}) {
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
assert.equal(successDB.calls.batchCount, 1, "warranty insert and audit record must be one atomic batch");
assert.match(successDB.calls.statements[0].sql, /INSERT INTO warranties[\s\S]*SELECT[\s\S]*WHERE NOT EXISTS \(SELECT 1 FROM warranties WHERE order_item_id=\?\)/,
  "the insert itself must atomically check for an existing warranty for this order item");
assert.match(successDB.calls.statements[0].sql, /AND EXISTS \(SELECT 1 FROM orders WHERE id=\? AND status='completed'\)/,
  "the atomic warranty insert must recheck that the order is still completed after the preflight read");
assert.match(successDB.calls.statements[1].sql, /INSERT INTO audit_logs[\s\S]*WHERE EXISTS \(SELECT 1 FROM warranties WHERE id=\?\)/,
  "audit event must only be inserted if this request actually created the warranty");

const duplicateDB = makeDB(false);
const duplicate = await post(duplicateDB);
assert.equal(duplicate.status, 409, "concurrent/duplicate issuance should return a conflict when the conditional insert changes no rows");
assert.equal(duplicateDB.calls.batchCount, 1);

const staleOrderDB = makeDB(true, { orderStatusAtBatch: "shipped" });
const staleOrder = await post(staleOrderDB);
assert.equal(staleOrder.status, 409, "warranty issuance must be refused if the order stops being completed after preflight");
assert.equal(staleOrderDB.calls.batchCount, 1, "the stale order guard must run atomically at insert time");
console.log("PASS: warranty issuance prevents duplicate issuance, stale order-status races, and non-atomic audit records.");
