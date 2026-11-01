import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as updateAdminOrder } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-order-price-immutability-session-secret";
const ADMIN_PASSWORD = "admin-order-price-immutability-password";
const session = await createSession(SESSION_SECRET);
const baselineItem = { id: "item-1", quantity: 1, unit_price: 100000 };

function makeDB({ items = [baselineItem], hasTransactions = false, hasPendingRequest = false, conflictDuringBatch = false } = {}) {
  const calls = { first: [], all: [], batches: [] };
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.first.push({ sql, values: this.values });
          if (sql.startsWith("SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at,delivery_status FROM orders WHERE id=?")) return { id: "order-1", status: "processing",total:100000,price_confirmation_required:0,payment_terms_confirmed_at:"2026-01-01",delivery_status:"not_shipped" };
          if (sql === "SELECT id FROM order_payment_requests WHERE order_id=? AND status='pending' LIMIT 1") {
            return hasPendingRequest ? { id: "pending-request-1" } : null;
          }
          if (sql.startsWith("SELECT EXISTS (SELECT 1 FROM order_payment_transactions")) {
            return { has_transactions: hasTransactions ? 1 : 0, has_pending_request: hasPendingRequest ? 1 : 0 };
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
      return statements.map(statement => {
        const guardedWrite = statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_transactions")
          && statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests");
        const cancellationGuardedWrite = statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')");
        return { success: true, meta: { changes: conflictDuringBatch && (guardedWrite || cancellationGuardedWrite) ? 0 : 1 } };
      });
    }
  };
}

async function patchOrder(DB, prices, status = "confirmed") {
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
        status,
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
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 100000 }], "cancelled");
  assert.equal(response.status, 409, "cancelling an order with a pending QR request must be refused until the request is explicitly cancelled");
  assert.equal(db.calls.batches.length, 0, "a pending QR request must prevent an order cancellation write");
}

{
  const db = makeDB({ conflictDuringBatch: true });
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 100000 }], "cancelled");
  assert.equal(response.status, 409, "a QR request appearing after the preflight read must still block order cancellation at the atomic write boundary");
  assert.equal(db.calls.batches.length, 1);
  const orderUpdate = db.calls.batches[0].find(statement => statement.sql.startsWith("UPDATE orders SET status=?"));
  assert.ok(orderUpdate?.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')"),
    "the order cancellation UPDATE must atomically require no pending QR request");
  assert.ok(db.calls.batches[0].every(statement =>
    statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')")
  ), "every cancellation batch write (item, order, and audit) must guard against a concurrently created pending QR request");
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
  const statements = db.calls.batches[0];
  assert.equal(statements.length, 3, "the order claim, one item, and the audit row are written together");
  assert.match(statements[0].sql, /^UPDATE orders SET status=/,
    "the conditional parent order UPDATE must execute before any item repricing");
  assert.match(statements[0].sql, /AND status=\?/,
    "the parent UPDATE must compare against the original order status");
  assert.match(statements[0].sql, /SELECT COUNT\(\*\) FROM order_items/,
    "the parent UPDATE must compare the original complete item snapshot");
  assert.match(statements[1].sql, /^UPDATE order_items.*changes\(\)=1/,
    "child price writes must be gated on the successful parent claim");
  assert.ok(statements.every(statement =>
    statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_transactions")
    && statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests")
  ), "all repricing writes must recheck payment activity inside the atomic batch");
}

{
  const db = makeDB({ conflictDuringBatch: true });
  const response = await patchOrder(db, [{ itemId: "item-1", unitPrice: 200000 }]);
  assert.equal(response.status, 409, "a payment request created after preflight must still block repricing atomically");
  assert.equal(db.calls.batches.length, 1);
  assert.ok(db.calls.batches[0].every(statement =>
    statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_transactions")
    && statement.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_requests")
  ), "item, order, and audit writes must all be guarded against a concurrent payment");
}

{
  const db=makeDB();
  const result=await patchOrder(db,[
    {itemId:"item-1",unitPrice:200000},
    {itemId:"item-1",unitPrice:210000}
  ]);
  assert.equal(result.status,400,"repeated updates to one order item must be rejected");
  assert.equal(db.calls.batches.length,0,"duplicate prices must not write to D1");
}

// D1 rejects statements whose bound-parameter count differs from SQL placeholders.
// Earlier mocks accepted an extra order ID here, so CI passed while live PATCH returned 503.
for (const {label,price,status} of [
  {label:"ordinary unchanged-price update",price:100000,status:"confirmed"},
  {label:"confirmed order repricing",price:200000,status:"confirmed"},
  {label:"cancelled transition",price:100000,status:"cancelled"}
]) {
  const db=makeDB();
  const response=await patchOrder(db,[{itemId:"item-1",unitPrice:price}],status);
  assert.equal(response.status,200,label+" should be accepted in the simulated no-ledger case");
  assert.equal(db.calls.batches.length,1,label+" should use one atomic batch");
  for (const {sql,values} of db.calls.batches[0]) {
    assert.equal(values.length,sql.split('?').length-1,
      label+": SQL must bind exactly one value per placeholder for D1 execution");
  }
}

console.log("PASS: order repricing guards financial history and order cancellation refuses pending QR requests, including the concurrent-create race.");
