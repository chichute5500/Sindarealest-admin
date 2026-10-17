import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestGet as createBackup } from "../functions/api/admin/backup.js";

const ADMIN_PASSWORD = "backup-size-test-password-long-enough";
const SESSION_SECRET = "backup-size-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);

function makeDB({ productRows = [], auditLogs = [] } = {}) {
  return {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
      };
      return statement;
    },
    async batch(statements) {
      return statements.map((statement) => ({
        results: statement.sql.includes("FROM products") ? productRows
          : statement.sql.includes("FROM audit_logs") ? auditLogs
          : [],
      }));
    },
  };
}

const auditLogs = Array.from({ length: 5000 }, (_, i) => ({
  id: "log-" + i,
  actor: "admin",
  action: "test",
  entity_type: "test",
  entity_id: String(i),
  details_json: "{}",
  created_at: "2026-01-01 00:00:00",
}));
const response = await createBackup({
  request: new Request("https://shop.example/api/admin/backup", {
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
    },
  }),
  env: {
    DB: makeDB({ productRows: [{ id: "product-1", sku: "SD-SN001", images_json: "[]" }], auditLogs }),
    ADMIN_PASSWORD,
    SESSION_SECRET,
  },
});
assert.equal(response.status, 413,
  "backup export above the shared record budget must fail explicitly rather than create an unrestorable file");
assert.match((await response.json()).error, /5\.000 bản ghi/);
console.log("PASS: backup export enforces the same record budget as restore.");
