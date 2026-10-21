import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { createOrderAccessToken, hashOrderAccessToken } from "../functions/_payments.js";
import { onRequestPost as postVerifiedTransaction } from "../functions/api/admin/payment-transactions.js";
import { onRequestPost as createPaymentRequest } from "../functions/api/admin/payment-requests.js";
import { onRequestGet as getOrderPayment } from "../functions/api/order-payment.js";

const ADMIN_PASSWORD = "payment-ledger-test-password-long";
const SESSION_SECRET = "payment-ledger-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const QR_KEY = "qr-550e8400-e29b-41d4-a716-446655440000.png";
const baseOrder = {
  id: "order-1", order_number: "SD-TEST-001", status: "confirmed",
  total: 100000, payment_status: "unpaid", price_confirmation_required: 0,
  payment_terms_confirmed_at: "2026-10-21T07:00:00Z",
};
function request(url, body, method = "POST", auth = true) {
  return new Request("https://shop.example" + url, {
    method,
    headers: {
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
      ...(auth ? { Cookie: "sd_admin_session=" + session } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function makeDb(options = {}) {
  const calls = [];
  const batches = [];
  return {
    calls, batches,
    prepare(sql) {
      let values = [];
      const stmt = {
        sql,
        bind(...next) { values = next; this.values = next; return this; },
        async first() {
          calls.push({ sql, values });
          if (sql.includes("SELECT id,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders") || sql.includes("SELECT id,order_number,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders")) return options.order ?? baseOrder;
          if (sql.includes("AS net_received")) return { net_received: options.netReceived ?? 0 };
          if (sql.includes("SELECT id,order_id,status FROM order_payment_requests")) return options.paymentRequest ?? null;
          if (sql.includes("SELECT id,order_number,status,payment_status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders")) {
            if (options.publicOrder && values[0] === options.publicOrder.order_number && values[1] === options.publicOrder.public_access_token_hash) return options.publicOrder;
            return null;
          }
          if (sql.includes("FROM order_payment_requests WHERE order_id=? AND status='pending'")) return options.pendingRequest ?? null;
          if (sql.includes("SELECT total FROM orders")) return { total: (options.order ?? baseOrder).total };
          return null;
        },
        async all() {
          calls.push({ sql, values });
          if (sql.includes("FROM order_items WHERE order_id=?")) return { results: options.orderItems ?? [{ fulfillment_type: "made_to_order", quantity: 1, line_total: 100000 }] };
          if (sql.includes("FROM settings")) return { results: options.settings ?? [
            { key: "payment_qr_active", value: "1" },
            { key: "payment_qr_active_key", value: QR_KEY },
            { key: "payment_qr_bank_name", value: "Ngân hàng thử" },
            { key: "payment_qr_account_number", value: "1234567890" },
            { key: "payment_qr_account_name", value: "NGUYEN VAN A" },
          ] };
          if (sql.includes("SELECT direction,amount FROM order_payment_transactions")) return { results: options.transactions ?? [] };
          return { results: [] };
        },
        async run() { calls.push({ sql, values }); return { success: true, meta: { changes: 1 } }; },
      };
      return stmt;
    },
    async batch(statements) {
      batches.push(statements.map(s => ({ sql: s.sql, values: s.values })));
      if (options.failUnique) throw new Error("UNIQUE constraint failed: order_payment_transactions.transaction_reference");
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
}
function adminContext(db, req) { return { request: req, env: { DB: db, ADMIN_PASSWORD, SESSION_SECRET } }; }

{
  const db = makeDb({ netReceived: 50000 });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "refunded", amount: 50001, transactionReference: "BANKREF-OVER", note: "Refund too large"
  })));
  assert.equal(response.status, 409, "refund may not exceed verified net receipts");
  assert.equal(db.batches.length, 0, "invalid over-refund must not insert a ledger row or update payment status");
}
{
  const db = makeDb({ order: { ...baseOrder, payment_terms_confirmed_at: null } });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-NOTREADY"
  })));
  assert.equal(response.status, 409, "money cannot be recorded as receipt before price/terms are confirmed");
  assert.equal(db.batches.length, 0);
}
{
  const db = makeDb();
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-OK-1", note: "Đối chiếu sao kê ngân hàng"
  })));
  assert.equal(response.status, 201, "admin-confirmed real receipt should write the verified ledger");
  assert.ok(db.batches[0].some(s => s.sql.includes("INSERT INTO order_payment_transactions")));
  assert.ok(db.batches[0].some(s => s.sql.includes("UPDATE orders SET payment_status=CASE")));
  assert.ok(db.batches[0].some(s => s.values?.includes("payment_received_verified")), "audit action is passed as a bound value in the batched statement");
}
{
  const db = makeDb({ failUnique: true });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-DUP-1"
  })));
  assert.equal(response.status, 409, "reused bank transaction reference must conflict");
}
{
  const db = makeDb({ order: { ...baseOrder, payment_terms_confirmed_at: null } });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 409, "installment request must wait for confirmed order price and terms");
  assert.equal(db.batches.length, 0, "unconfirmed order cannot create a pending transfer request");
}
{
  const db = makeDb({ order: baseOrder });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 201, "confirmed order can create deposit request with active QR config");
  const payload = await response.json();
  assert.equal(payload.amount, 30000, "made-to-order deposit is server-derived as 30% of the confirmed total");
  assert.equal(payload.shippingBenefit, "standard_shipping");
  assert.equal(payload.freeShipping, false);
  assert.match(payload.transferReference, /^SD[A-Z0-9]+$/);
  assert.ok(db.batches[0].some(s => s.sql.includes("INSERT INTO order_payment_requests")));
  assert.ok(db.batches[0].some(s => s.sql.includes("payment_request_created")));
  assert.doesNotMatch(JSON.stringify(db.batches[0]), /amount=(?:30000|100000)/, "QR config/ledger must not mutate QR image payload");
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-1", public_access_token_hash: tokenHash, total: 100000, payment_terms_confirmed_at: null, price_confirmation_required: 1 };
  const db = makeDb({ publicOrder: order });
  const response = await getOrderPayment({ request: new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-1&token=" + token), env: { DB: db } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.paymentReady, false, "valid order token cannot reveal a payment amount before terms confirmation");
  assert.equal(Object.hasOwn(payload, "amount"), false);
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-2", public_access_token_hash: tokenHash, total: 100000, payment_terms_confirmed_at: "2026-10-21T07:00:00Z", price_confirmation_required: 0 };
  const pendingRequest = { id: "request-1", installment_type: "deposit", amount: 30000, shipping_benefit: "standard_shipping", transfer_reference: "SDREF123456", qr_image_key: QR_KEY, bank_name: "Ngân hàng thử", account_number: "1234567890", account_name: "NGUYEN VAN A", status: "pending", created_at: "2026-10-21T07:01:00Z" };
  const db = makeDb({ publicOrder: order, pendingRequest });
  const response = await getOrderPayment({ request: new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-2&token=" + token), env: { DB: db } });
  const payload = await response.json();
  assert.equal(payload.paymentReady, true);
  assert.equal(payload.amount, 30000, "amount becomes visible only from a server-created pending installment");
  assert.equal(payload.qrImageUrl, "/payment-qr/" + QR_KEY);
}
{
  const db = makeDb();
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-NOAUTH"
  }, "POST", false)));
  assert.equal(response.status, 401, "unauthenticated callers cannot mutate the verified payment ledger");
  assert.equal(db.batches.length, 0);
}

{
  const db = makeDb({ orderItems: [{ fulfillment_type: "in_stock", quantity: 1, line_total: 500000 }], order: { ...baseOrder, total: 500000 } });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.amount, 100000, "in-stock deposit must be the fixed 100,000 VND");
  assert.equal(payload.shippingBenefit, "standard_shipping");
  assert.equal(payload.freeShipping, false);
}
{
  const db = makeDb();
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit", amount: 1
  })));
  assert.equal(response.status, 400, "browser-supplied payment amounts must be rejected");
  assert.equal(db.batches.length, 0);
}
{
  const db = makeDb();
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "full"
  })));
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.amount, 100000);
  assert.equal(payload.shippingBenefit, "free_shipping");
  assert.equal(payload.freeShipping, true, "full payment qualifies for freeship");
}
{
  const db = makeDb({ orderItems: [
    { fulfillment_type: "in_stock", quantity: 1, line_total: 50000 },
    { fulfillment_type: "made_to_order", quantity: 1, line_total: 50000 }
  ] });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "full"
  })));
  assert.equal(response.status, 409, "mixed fulfillment types require manual consultation");
  assert.equal(db.batches.length, 0);
}
{
  const db = makeDb({ orderItems: [{ fulfillment_type: "unclassified", quantity: 1, line_total: 100000 }] });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 409, "unclassified products must not receive automatic payment requests");
  assert.equal(db.batches.length, 0);
}

console.log("PASS payment ledger route behavior: owner-derived deposit amounts, client amount rejection, mixed/unclassified cart gates, freeship and verified ledger.");
