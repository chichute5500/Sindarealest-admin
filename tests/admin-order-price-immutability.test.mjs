import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as updateAdminOrder } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-order-price-immutability-session-secret";
const ADMIN_PASSWORD = "admin-order-price-immutability-password";
const session = await createSession(SESSION_SECRET);
const baselineItem = { id: "item-1", quantity: 1, unit_price: 100000 };

function makeDB({ items = [baselineItem], hasTransactions = false, hasPendingRequest = false } = {}) {
  const calls = { first: [], all: [], batches: [] };
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.first.push({ sql, values: this.values });
          if (sql === "SELECT id FROM orders WHERE id=?") return { id: "order-1" };
          if (/EXISTS\s*\(SELECT 1 FROM order_payment_transactions/.test(sql)) {
            return { hasTransactions: hasTransactions ? 1 : 0, hasPendingRequest: hasPendingRequest ? 1 : 0 };
          }
          return null;
        },
        async all() {
          calls.all.push({ sql, values: this.values });
          if (sql.includes("SELECT id,quantity,unit_price FROM order_items WHERE order_id=?")) return { results: items };
          if (sql.includes("FROM admin_push_subscriptions")) return { results: [] };
          return { results: [] };
        },
        async run() { return { success: true, meta: { changes: 1 } }; }
      };
      return statement;
    },
    async batch(statements) {
      calls.batches.push(statements.map(s => ({ sql: s.sql, values: s.values })));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    }
  };
}

async function patchOrder(DB, prices) {
  return updateAdminOrder({
    request: new Request("https://shop.example/api/admin/orders", {
      method: "PATCH",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: "order-1",
        status: "confirmed",
        termsConfirmed: true,
        paymentTermsNote: "Điều kiện đã xác nhận",
        prices
      })
    }),
    env: { DB, ADMIN_PASSWORD, SESSION_SECRET }
  });
}

{
  const db = makeDB({ hasPendingRequest: true });
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 200000 }]);
  assert.equal(response.status, 409, "a repricing attempt must be refused while a QR payment request remains pending");
  assert.equal(db.calls.batches.length, 0, "a pending payment request must prevent every order/item/audit write");
}

{
  const db = makeDB({ hasTransactions: true });
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 200000 }]);
  assert.equal(response.status, 409, "a repricing attempt must be refused after any verified receipt/refund ledger entry");
  assert.equal(db.calls.batches.length, 0, "a verified payment ledger must prevent every order/item/audit write");
}

{
  const db = makeDB({ hasPendingRequest: true });
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 100000 }]);
  assert.equal(response.status, 200, "saving an order with unchanged prices must remain allowed even while a QR request is pending");
  assert.equal(db.calls.batches.length, 1, "ordinary saves must retain their existing write path");
}

{
  const db = makeDB();
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 200000 }]);
  assert.equal(response.status, 200, "an order without financial activity may still be repriced");
  assert.equal(db.calls.batches.length, 1);
}

console.log("PASS: order repricing respects pending QR requests and verified payment history, while unchanged-price saves remain allowed.");
