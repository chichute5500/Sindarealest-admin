import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as updateWarrantyClaim } from "../functions/api/admin/warranties.js";

const SECRET = "warranty-claim-atomicity-test-secret-long-enough";
const PASSWORD = "test-admin-password-long-enough";
const session = await createSession(SECRET);

function makeDB(changes) {
  const calls = { batches: 0, statements: [] };
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
      };
      return statement;
    },
    async batch(statements) {
      calls.batches += 1;
      calls.statements = statements.map((s) => ({ sql: s.sql, values: s.values }));
      return [{ meta: { changes } }, { meta: { changes: changes ? 1 : 0 } }];
    },
  };
}

async function requestPatch(DB) {
  return updateWarrantyClaim({
    request: new Request("https://shop.example/api/admin/warranties", {
      method: "PATCH",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({ id: "claim-123", status: "reviewing", adminNote: "Đang kiểm tra" }),
    }),
    env: { DB, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: SECRET },
  });
}

const successDB = makeDB(1);
const success = await requestPatch(successDB);
assert.equal(success.status, 200, "existing warranty claim should update");
assert.equal(successDB.calls.batches, 1, "claim update and audit log must share one atomic D1 batch");
assert.equal(successDB.calls.statements.length, 2);
assert.match(successDB.calls.statements[0].sql, /UPDATE warranty_claims SET status=/);
assert.match(successDB.calls.statements[1].sql, /INSERT INTO audit_logs[\s\S]*SELECT[\s\S]*WHERE EXISTS/);

const missingDB = makeDB(0);
const missing = await requestPatch(missingDB);
assert.equal(missing.status, 404, "missing claim should return 404");
assert.equal(missingDB.calls.batches, 1);
console.log("PASS: warranty claim updates and audit records are atomic.");
