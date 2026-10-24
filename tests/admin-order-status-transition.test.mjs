import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as patchAdminOrder } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-order-status-transition-test-secret-long-enough";
const ADMIN_PASSWORD = "admin-order-status-transition-test-password";
const session = await createSession(SESSION_SECRET);
const statements = [];
const DB = {
  prepare(sql) {
    const entry = { sql, values: [] };
    statements.push(entry);
    return {
      bind(...values) { entry.values = values; return this; },
      async first() {
        if (sql === "SELECT id FROM orders WHERE id=?") return { id: "cancelled-order" };
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
  },
  async batch(items) {
    return items.map(() => ({ meta: { changes: 1 } }));
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
    body: JSON.stringify({ id: "cancelled-order", status: "completed" }),
  }),
  env: { DB, ADMIN_PASSWORD, SESSION_SECRET },
});

assert.equal(response.status, 409,
  "a cancelled order is terminal and must not be reopened as completed");
assert.equal(statements.some(item => item.sql.startsWith("UPDATE orders SET status=")), false,
  "a cancelled-to-completed transition must be rejected before any order write");
console.log("PASS: cancelled orders cannot be reopened through Admin status updates.");
