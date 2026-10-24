import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as patchAdminOrder } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-order-status-transition-test-secret-long-enough";
const ADMIN_PASSWORD = "admin-order-status-transition-test-password";

async function patchOrder({ existingStatus, simulateCancelRace = false }) {
  const session = await createSession(SESSION_SECRET);
  const statements = [];
  const DB = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql === "SELECT id,status FROM orders WHERE id=?") return { id: "test-order", status: existingStatus };
          if (sql.includes("SELECT id FROM order_payment_requests")) return null;
          return null;
        },
        async all() {
          if (sql === "SELECT id,quantity,unit_price FROM order_items WHERE order_id=?") {
            return { results: [{ id: "item-1", quantity: 1, unit_price: 100000 }] };
          }
          return { results: [] };
        },
      };
      statements.push(statement);
      return statement;
    },
    async batch(items) {
      return items.map((item, index) => {
        const sql = item.sql;
        if (simulateCancelRace && sql.startsWith("UPDATE orders SET status=")) return { meta: { changes: 0 } };
        if (simulateCancelRace && sql.startsWith("INSERT INTO audit_logs") && sql.includes("WHERE changes()=1")) return { meta: { changes: 0 } };
        return { meta: { changes: 1 } };
      });
    },
  };
  const response = await patchAdminOrder({
    request: new Request("https://shop.example/api/admin/orders", {
      method: "PATCH",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "test-order", status: "completed" }),
    }),
    env: { DB, ADMIN_PASSWORD, SESSION_SECRET },
  });
  return { response, statements };
}

{
  const { response, statements } = await patchOrder({ existingStatus: "cancelled" });
  assert.equal(response.status, 409,
    "a cancelled order is terminal and must not be reopened as completed");
  assert.equal(statements.some(item => item.sql.startsWith("UPDATE orders SET status=")), false,
    "a cancelled-to-completed transition must be rejected before any order write");
}

{
  const { response, statements } = await patchOrder({ existingStatus: "processing", simulateCancelRace: true });
  assert.equal(response.status, 409,
    "a concurrent cancellation must prevent a stale status update from reopening the order");
  const update = statements.find(item => item.sql.startsWith("UPDATE orders SET status="));
  assert.ok(update?.sql.includes("AND status<>'cancelled'"),
    "the final order UPDATE must atomically refuse a cancelled row");
  const audit = statements.find(item => item.sql.startsWith("INSERT INTO audit_logs"));
  assert.ok(audit?.sql.includes("WHERE changes()=1"),
    "a rejected status update must not emit a success audit record");
}

console.log("PASS: cancelled orders cannot be reopened, including a concurrent cancellation race.");
