import assert from "node:assert/strict";
import { onRequestPost as createWarrantyClaim } from "../functions/api/warranty-claims.js";

const TOKEN = "a".repeat(32);
const WARRANTY_CODE = "SDW-" + "A".repeat(24);

function makeDB({ claimChanges = 1 } = {}) {
  const calls = { batches: [] };
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM settings WHERE key=?")) {
            return { value: JSON.stringify({ warrantyId: "warranty-1", warrantyCode: WARRANTY_CODE }) };
          }
          if (sql.includes("FROM warranties w JOIN orders o")) {
            return {
              id: "warranty-1", order_id: "order-1", customer_id: "customer-1",
              order_number: "ORD-0001", warranty_code: WARRANTY_CODE,
              status: "active", starts_at: "2026-01-01", ends_at: "2027-01-01",
            };
          }
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      calls.batches.push(statements.map((s) => ({ sql: s.sql, values: s.values })));
      if (statements[0]?.sql.includes("INSERT INTO public_rate_limits")) {
        return [{ success: true }, { success: true, results: [{ attempts: 1 }] }];
      }
      return statements.map((_, index) => ({ meta: { changes: index === 0 ? claimChanges : 1 } }));
    },
  };
}

async function submit(DB) {
  return createWarrantyClaim({
    request: new Request("https://shop.example/api/warranty-claims", {
      method: "POST",
      headers: {
        Origin: "https://shop.example",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.10",
      },
      body: JSON.stringify({
        claimToken: TOKEN, issueType: "defect",
        message: "Sản phẩm có lỗi cần kiểm tra",
      }),
    }),
    env: { DB, SESSION_SECRET: "warranty-claim-token-test-secret-long-enough" },
  });
}

const successDB = makeDB({ claimChanges: 1 });
const success = await submit(successDB);
assert.equal(success.status, 201, "a valid unused lookup token should create a claim");
const claimBatch = successDB.calls.batches.find((batch) => batch[0]?.sql.includes("INSERT INTO warranty_claims"));
assert.ok(claimBatch, "claim creation should run in one D1 batch");
assert.match(claimBatch[0].sql, /INSERT INTO warranty_claims[\s\S]*SELECT[\s\S]*WHERE EXISTS \(SELECT 1 FROM settings/);
assert.ok(claimBatch.some((s) => /DELETE FROM settings WHERE key=\? AND EXISTS \(SELECT 1 FROM warranty_claims/.test(s.sql)),
  "lookup token should only be deleted when the claim was inserted");
assert.ok(claimBatch.some((s) => /INSERT INTO audit_logs[\s\S]*SELECT[\s\S]*WHERE EXISTS/.test(s.sql)),
  "audit log should only be written when the claim was inserted");

const reusedDB = makeDB({ claimChanges: 0 });
const reused = await submit(reusedDB);
assert.equal(reused.status, 409, "a token already consumed by a concurrent request should not create another claim");
assert.equal(reusedDB.calls.batches.filter((batch) => batch[0]?.sql.includes("INSERT INTO warranty_claims")).length, 1);
console.log("PASS: warranty lookup token is consumed atomically and duplicate claim submissions are rejected.");
