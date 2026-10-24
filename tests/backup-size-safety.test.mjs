import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSession } from "../functions/_lib.js";
import { onRequestGet as createBackup } from "../functions/api/admin/backup.js";

const ADMIN_PASSWORD = "backup-size-test-password-long-enough";
const SESSION_SECRET = "backup-size-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);

function makeDB({ productRows = [], auditLogs = [] } = {}) {
  const executedQueries = [];
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
      executedQueries.push(...statements);
      const total = productRows.length + auditLogs.length;
      return statements.map((statement) => ({
        results: statement.sql.startsWith("SELECT") && statement.sql.includes("AS total_count")
          ? [{ total_count: total }]
          : statement.sql.includes("WHERE (SELECT total_count FROM backup_counts) <= ?")
            ? (total <= 5000
              ? statement.sql.includes("SELECT * FROM products") ? productRows
                : statement.sql.includes("SELECT * FROM audit_logs") ? auditLogs : []
              : [])
            : statement.sql.includes("FROM settings") ? [] : [],
      }));
    },
    get executedQueries() { return executedQueries; },
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
const db = makeDB({ productRows: [{ id: "product-1", sku: "SD-SN001", images_json: "[]" }], auditLogs });
const response = await createBackup({
  request: new Request("https://shop.example/api/admin/backup", {
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
    },
  }),
  env: {
    DB: db,
    ADMIN_PASSWORD,
    SESSION_SECRET,
  },
});
assert.equal(response.status, 413,
  "backup export above the shared record budget must fail explicitly rather than create an unrestorable file");
assert.match((await response.json()).error, /5\.000 bản ghi/);
const guardedQueries = db.executedQueries.filter((statement) => /SELECT \* FROM (products|customers|orders|order_items|warranties|warranty_claims|audit_logs|customer_address_details|order_shipping_addresses|order_contact_details|order_item_details|warranty_claim_attachments|order_payment_requests|order_payment_transactions)/.test(statement.sql));
assert.equal(guardedQueries.length, 14, "all exported data tables, including payment ledgers, must use the shared total-row guard");
assert.ok(guardedQueries.every((statement) => statement.sql.includes("WHERE (SELECT total_count FROM backup_counts) <= ?") && statement.values[0] === 5000 && /LIMIT 5001$/.test(statement.sql)),
  "all table reads must be gated and capped before D1 materializes rows");
assert.ok(guardedQueries.every((statement) => statement.sql.includes("WHERE (SELECT total_count FROM backup_counts) <= ?")),
  "oversized backups must return no table rows before the route rejects the export");

const adminHtml = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /Tệp JSON không chứa tệp ảnh trong R2/,
  "backup and restore UI must explain that R2 image objects are not embedded in JSON backups");

console.log("PASS: backup export enforces shared record and query limits.");
