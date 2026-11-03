import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPatch as patchAdminOrder } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-order-status-transition-test-secret-long-enough";
const ADMIN_PASSWORD = "admin-order-status-transition-test-password";

async function patchOrder({ existingStatus, requestedStatus="completed", verifiedAmount=95000, existingTerms=true, confirmTerms=false, simulateCancelRace = false, simulateReceiptRace=false }) {
  const session = await createSession(SESSION_SECRET);
  const statements = [];
  const DB = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.startsWith("SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at,delivery_status FROM orders WHERE id=?")) return { id: "test-order", status: existingStatus,total:100000,price_confirmation_required:0,payment_terms_confirmed_at:existingTerms?"2026-01-01":null,delivery_status:"in_transit" };
          if (sql.includes("SELECT json_extract(details_json,'$.selectedPaymentOption')")) return { payment_option:"full",payment_amount:95000 };
          if (sql.includes("SELECT id FROM order_payment_requests")) return null;
          return null;
        },
        async all() {
          if (sql === "SELECT id,quantity,unit_price FROM order_items WHERE order_id=?") {
            return { results: [{ id: "item-1", quantity: 1, unit_price: 100000 }] };
          }
          if (sql === "SELECT direction,amount,actor FROM order_payment_transactions WHERE order_id=?") return { results:verifiedAmount>0?[{direction:"received",amount:verifiedAmount,actor:"admin"}]:[] };
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
        if (simulateReceiptRace && sql.startsWith("UPDATE orders SET status=") &&
            sql.includes("FROM order_payment_transactions WHERE order_id=? AND actor<>'admin_cod_completion')>=?"))
          return {meta:{changes:0}};
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
      body: JSON.stringify({ id: "test-order", status: requestedStatus, ...(confirmTerms?{termsConfirmed:true}:{}) }),
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
  const { response, statements } = await patchOrder({ existingStatus: "shipped", simulateCancelRace: true });
  assert.equal(response.status, 409,
    "a concurrent cancellation must prevent a stale status update from reopening the order");
  const update = statements.find(item => item.sql.startsWith("UPDATE orders SET status="));
  assert.ok(update?.sql.includes("AND status<>'cancelled'"),
    "the final order UPDATE must atomically refuse a cancelled row");
  const audit = statements.find(item => item.sql.startsWith("INSERT INTO audit_logs"));
  assert.ok(audit?.sql.includes("WHERE changes()=1"),
    "a rejected status update must not emit a success audit record");
}

{
  const result=await patchOrder({existingStatus:"completed",requestedStatus:"confirmed"});
  assert.equal(result.response.status,409,"Delivered orders must not regress and leave active warranties behind");
  assert.ok(!result.statements.some(s=>s.sql.startsWith("UPDATE orders SET status=")));
}
{
  const result=await patchOrder({existingStatus:"shipped",requestedStatus:"processing"});
  assert.equal(result.response.status,409,"In-transit orders must not be sent backwards");
}
{
  const result=await patchOrder({existingStatus:"confirmed",requestedStatus:"pending_confirmation"});
  assert.equal(result.response.status,409,"Accepted orders must not return to the unaccepted stage");
}
{
  const result=await patchOrder({existingStatus:"pending_confirmation",requestedStatus:"processing"});
  assert.equal(result.response.status,409,"Pending orders may not skip confirmed/deposit stage");
}
{
  const result=await patchOrder({existingStatus:"pending_confirmation",requestedStatus:"confirmed",verifiedAmount:0,existingTerms:false,confirmTerms:true});
  assert.equal(result.response.status,409,"First confirmation without verified deposit is forbidden");
  assert.ok(!result.statements.some(s=>s.sql.startsWith("UPDATE orders SET status=")));
}
{
  const result=await patchOrder({existingStatus:"pending_confirmation",requestedStatus:"confirmed",verifiedAmount:95000,existingTerms:false,confirmTerms:true});
  assert.equal(result.response.status,200,"First confirmation after verified agreed full payment is accepted");
  const update=result.statements.find(s=>s.sql.startsWith("UPDATE orders SET status="));
  assert.ok(update?.sql.includes("FROM order_payment_transactions WHERE order_id=? AND actor<>'admin_cod_completion')>=?"),"Atomic confirmation must re-check verified ledger at D1 UPDATE");
  assert.deepEqual(update.values.slice(-2),["test-order",95000],"Bound required amount must come from customer-agreed payment terms");
}
{
  const result=await patchOrder({existingStatus:"pending_confirmation",requestedStatus:"confirmed",verifiedAmount:95000,existingTerms:false,confirmTerms:true,simulateReceiptRace:true});
  assert.equal(result.response.status,409,"A refund racing first confirmation must block acceptance");
}
console.log("PASS: terminal order states, verified-payment-first acceptance, no skipped status and atomic receipt guards.");
