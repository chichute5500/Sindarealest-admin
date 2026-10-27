import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestGet as getAdminOrders } from "../functions/api/admin/orders.js";

const SESSION_SECRET = "admin-orders-query-regression-secret-which-is-long-enough";
const ADMIN_PASSWORD = "test-only-admin-password-long";
const base = {
  order_number: "SD-TEST-001",
  status: "pending_confirmation",
  payment_status: "unpaid",
  subtotal: null,
  total: null,
  price_confirmation_required: 1,
  customer_note: "",
  created_at: "2026-10-17 10:00:00",
  updated_at: "2026-10-17 10:00:00",
  full_name: "Test Customer",
  phone: "0900000000",
  email: "",
  address: "Test address",
};
const rows = [
  { ...base, id: "order-1", itemId: "item-1", itemProductId: "product-1", itemSku: "SD-SN001", itemTitle: "Sneaker A", itemQuantity: 1, itemUnitPrice: null, itemLineTotal: null },
  { ...base, id: "order-1", itemId: "item-2", itemProductId: "product-2", itemSku: "SD-GL001", itemTitle: "Loafer B", itemQuantity: 2, itemUnitPrice: 2500000, itemLineTotal: 5000000 },
  { ...base, id: "order-2", order_number: "SD-TEST-002", itemId: null, itemProductId: null, itemSku: null, itemTitle: null, itemQuantity: null, itemUnitPrice: null, itemLineTotal: null },
];
const calls = [];
const DB = {
  prepare(sql) {
    calls.push(sql);
    return {
      bind() { return this; },
      async first() { return null; },
      async all() { return { results: rows }; },
    };
  },
};
const session = await createSession(SESSION_SECRET);
const response = await getAdminOrders({
  request: new Request("https://shop.example/api/admin/orders", {
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
    },
  }),
  env: { DB, ADMIN_PASSWORD, SESSION_SECRET },
});
assert.equal(response.status, 200, "authorized admin order list should load");
const payload = await response.json();
assert.equal(calls.length, 1, "loading 1,000 orders must use one D1 read instead of an N+1 request per order");
assert.match(calls[0], /WITH recent_orders AS/i, "parent-order limit should be applied before joining items");
assert.match(calls[0], /LEFT JOIN order_items/i, "single query should include order items");
assert.equal(payload.orders.length, 2, "multiple order rows must be grouped by order ID");
assert.equal(payload.orders[0].items.length, 2, "all line items should remain grouped under the order");
assert.equal(payload.orders[0].items[0].unitPrice, null, "unconfirmed prices must remain null");
assert.equal(payload.orders[0].items[1].lineTotal, 5000000, "confirmed line totals must be preserved");
assert.deepEqual(payload.orders[1].items, [], "orders with no item rows should still be returned with an empty list");
assert.ok(!Object.hasOwn(payload.orders[0], "itemId"), "join implementation fields must not leak into the order response");
for(const column of ["timeline_confirmed_at","timeline_processing_at","timeline_shipped_at","timeline_completed_at","timeline_payment_at"]) {
 assert.ok(calls[0].includes(column),"Timeline query must expose real "+column);
}
assert.ok(calls[0].includes("tx.rowid<=pt.rowid"),"Deposit milestone must be based on crossing the verified transfer threshold");
assert.ok(calls[0].includes("admin_cod_completion"),"COD collection must not rewrite initial deposit date");
console.log("Admin orders single-query and authentic milestone date regression tests passed.");
