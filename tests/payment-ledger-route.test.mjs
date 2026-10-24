import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { createOrderAccessToken, hashOrderAccessToken } from "../functions/_payments.js";
import { onRequestPost as postVerifiedTransaction } from "../functions/api/admin/payment-transactions.js";
import { onRequestPost as createPaymentRequest, onRequestGet as getAdminPaymentRequests } from "../functions/api/admin/payment-requests.js";
import { onRequestPatch as cancelPaymentRequest } from "../functions/api/admin/payment-requests.js";
import { onRequestGet as getOrderPayment } from "../functions/api/order-payment.js";
import { onRequestGet as getPaymentSettings } from "../functions/api/payment-settings.js";

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
          if (sql.includes("AS received_amount")) return options.paymentTotals ?? { received_amount: 0, refunded_amount: 0 };
          if (sql.includes("SELECT id,order_id,status FROM order_payment_requests")) return options.paymentRequest ?? null;
          if (sql.includes("SELECT id,order_number,status,payment_status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders")) {
            if (options.publicOrder && values[0] === options.publicOrder.order_number && values[1] === options.publicOrder.public_access_token_hash) return options.publicOrder;
            return null;
          }
          if (sql.includes("FROM order_payment_requests WHERE order_id=?")) return options.pendingRequest ?? null;
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
          if (sql.includes("FROM order_payment_transactions WHERE order_id=? ORDER BY created_at DESC LIMIT 100")) return { results: options.displayTransactions ?? [] };
          if (sql.includes("FROM order_payment_requests WHERE order_id=? ORDER BY created_at DESC LIMIT 50")) return { results: options.displayRequests ?? [] };
          return { results: [] };
        },
        async run() { calls.push({ sql, values }); return { success: true, meta: { changes: 1 } }; },
      };
      return stmt;
    },
    async batch(statements) {
      batches.push(statements.map(s => ({ sql: s.sql, values: s.values })));
      if (options.failUnique) throw new Error("UNIQUE constraint failed: order_payment_transactions.transaction_reference");
      const atomicRefundRejected = Boolean(options.atomicRefundGuardReject
        && statements[0]?.sql.includes("WHERE (? != 'refunded' OR ? <="));
      const cancellationRace = Boolean(options.cancelUpdateHasNoChanges
        && statements[0]?.sql.includes("UPDATE order_payment_requests SET status='cancelled'"));
      if (options.simulateOrderChangedBeforeBatch) {
        options.order = {
          ...(options.order ?? baseOrder),
          total: 200000,
          payment_terms_confirmed_at: "2026-10-24T07:00:01.000Z"
        };
        options.orderItems = [{ fulfillment_type: "made_to_order", quantity: 1, line_total: 200000 }];
      }
      // Simulate a QR receiver/config rotation after preflight reads but before the atomic insert.
      if (options.simulateQrConfigChangedBeforeBatch) {
        options.settings = [
          { key: "payment_qr_active", value: "1" },
          { key: "payment_qr_active_key", value: "qr-550e8400-e29b-41d4-a716-446655440001.png" },
          { key: "payment_qr_bank_name", value: "Ngân hàng mới" },
          { key: "payment_qr_account_number", value: "9876543210" },
          { key: "payment_qr_account_name", value: "NGUYEN VAN B" },
        ];
      }
      const activeQrSnapshotGuardPresent = statement => [
        "key='payment_qr_active' AND value='1'",
        "key='payment_qr_active_key' AND value=?",
        "key='payment_qr_bank_name' AND value=?",
        "key='payment_qr_account_number' AND value=?",
        "key='payment_qr_account_name' AND value=?",
      ].every(fragment => statement.sql.includes(fragment));
      if (options.simulateOrderCancelledBeforeTransactionBatch) {
        options.order = { ...(options.order ?? baseOrder), status: "cancelled" };
      }
      if (options.simulateOrderTermsUnconfirmedBeforeTransactionBatch) {
        options.order = { ...(options.order ?? baseOrder), price_confirmation_required: 1, payment_terms_confirmed_at: null };
      }
      if (options.simulatePaymentRequestCancelledBeforeTransactionBatch) {
        options.paymentRequest = { ...(options.paymentRequest ?? { id: "request-cancel-race", order_id: "order-1" }), status: "cancelled" };
      }
      if (options.simulatePaymentRequestSettledBeforeTransactionBatch) {
        options.paymentRequest = { ...(options.paymentRequest ?? { id: "request-settled-race", order_id: "order-1" }), status: "settled" };
      }
      return statements.map((statement, index) => {
        const stalePaymentRequestInsert = Boolean(options.simulateOrderChangedBeforeBatch && index === 0
          && statement.sql.includes("INSERT INTO order_payment_requests")
          && statement.sql.includes("WHERE EXISTS (SELECT 1 FROM orders"));
        const auditWithoutRequest = Boolean(options.simulateOrderChangedBeforeBatch && index === 1
          && statement.sql.includes("payment_request_created")
          && statement.sql.includes("WHERE EXISTS (SELECT 1 FROM order_payment_requests WHERE id=?"));
        const staleQrConfigRejected = Boolean(options.simulateQrConfigChangedBeforeBatch && index === 0
          && statement.sql.includes("INSERT INTO order_payment_requests")
          && activeQrSnapshotGuardPresent(statement));
        const auditWithoutRequestAfterQrRotation = Boolean(options.simulateQrConfigChangedBeforeBatch && index === 1
          && statement.sql.includes("payment_request_created")
          && statement.sql.includes("WHERE EXISTS (SELECT 1 FROM order_payment_requests WHERE id=?"));
        const receivedInsert = index === 0 && statement.sql.includes("INSERT INTO order_payment_transactions")
          && statement.values?.includes("received");
        const receiptOrderGuard = statement.sql.includes("EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled'")
          && statement.sql.includes("price_confirmation_required=0")
          && statement.sql.includes("payment_terms_confirmed_at IS NOT NULL");
        const receiptRequestGuard = statement.sql.includes("EXISTS (SELECT 1 FROM order_payment_requests WHERE id=? AND order_id=? AND status='pending')");
        const staleReceiptRejected = (receivedInsert && receiptOrderGuard
          && (options.simulateOrderCancelledBeforeTransactionBatch || options.simulateOrderTermsUnconfirmedBeforeTransactionBatch))
          || (receivedInsert && receiptRequestGuard
            && (options.simulatePaymentRequestCancelledBeforeTransactionBatch || options.simulatePaymentRequestSettledBeforeTransactionBatch));
        // Simulate the final insert boundary: only SQL that rechecks order state can reject these races.
        const changes = atomicRefundRejected || (cancellationRace && index === 0) || stalePaymentRequestInsert || auditWithoutRequest || staleQrConfigRejected || auditWithoutRequestAfterQrRotation || staleReceiptRejected ? 0 : 1;
        return { success: true, meta: { changes } };
      });
    },
  };
}
function adminContext(db, req) { return { request: req, env: { DB: db, ADMIN_PASSWORD, SESSION_SECRET, IMAGES: { head: async key => ({ key }) } } }; }

// The visible transaction list is capped at 100 rows; summary amounts must use the complete ledger aggregate.
{
  const displayTransactions = Array.from({ length: 100 }, (_, index) => ({
    id: "visible-" + index, direction: "received", amount: 1000
  }));
  const db = makeDb({
    order: { ...baseOrder, total: 300000 },
    paymentTotals: { received_amount: 200000, refunded_amount: 50000 },
    displayTransactions
  });
  const response = await getAdminPaymentRequests(adminContext(db, request("/api/admin/payment-requests?orderId=order-1", undefined, "GET")));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.transactions.length, 100, "the response keeps the transaction display list bounded");
  assert.deepEqual(payload.summary, {
    receivedAmount: 200000,
    refundedAmount: 50000,
    netReceivedAmount: 150000,
    remainingBalance: 150000,
    overpaidAmount: 0
  }, "financial summary must use full-ledger totals, not only the visible 100 rows");
  assert.ok(db.calls.some(call => call.sql.includes("AS received_amount")), "GET must query aggregate totals separately from the capped display list");
}

{
  const db = makeDb({ netReceived: 50000 });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "refunded", amount: 50001, transactionReference: "BANKREF-OVER", note: "Refund too large"
  })));
  assert.equal(response.status, 409, "refund may not exceed verified net receipts");
  assert.equal(db.batches.length, 0, "invalid over-refund must not insert a ledger row or update payment status");
}

{
  // A pre-check may pass while another refund commits concurrently. The SQL guard
  // must recheck net receipts at insert time and suppress every follow-on mutation.
  const db = makeDb({ netReceived: 100000, atomicRefundGuardReject: true });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "refunded", amount: 70000, transactionReference: "BANKREF-RACE-1"
  })));
  assert.equal(response.status, 409, "concurrent refunds must not exceed the net receipt ledger");
  assert.equal(db.batches.length, 1);
  const statements = db.batches[0];
  assert.ok(statements[0].sql.includes("WHERE (? != 'refunded' OR ? <="), "the refund guard must remain atomic and parenthesized");
  assert.ok(statements.slice(1).every(statement => /EXISTS \(SELECT 1 FROM order_payment_transactions WHERE id=\?\)/.test(statement.sql)),
    "status updates and audit writes must be gated on successful ledger insertion");
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
  const db = makeDb({ simulateOrderCancelledBeforeTransactionBatch: true });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-CANCEL-RACE"
  })));
  assert.equal(response.status, 409, "a concurrent order cancellation must block the receipt at the atomic insert boundary");
  const statements = db.batches[0];
  assert.ok(statements[0].sql.includes("EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled'"),
    "the receipt INSERT must recheck that the order is not cancelled");
  assert.ok(statements.slice(1).every(s => s.sql.includes("EXISTS (SELECT 1 FROM order_payment_transactions WHERE id=?)")),
    "order status and audit writes must be skipped when the receipt insert is rejected");
}

{
  const db = makeDb({ simulateOrderTermsUnconfirmedBeforeTransactionBatch: true });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", direction: "received", amount: 30000, transactionReference: "BANKREF-TERMS-RACE"
  })));
  assert.equal(response.status, 409, "a concurrent removal of price/terms confirmation must block the receipt at the atomic insert boundary");
  assert.ok(db.batches[0][0].sql.includes("price_confirmation_required=0")
    && db.batches[0][0].sql.includes("payment_terms_confirmed_at IS NOT NULL"),
    "the receipt INSERT must recheck confirmed price and payment terms");
}

{
  const db = makeDb({
    paymentRequest: { id: "request-cancel-race", order_id: "order-1", status: "pending" },
    simulatePaymentRequestCancelledBeforeTransactionBatch: true
  });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", paymentRequestId: "request-cancel-race", direction: "received",
    amount: 30000, transactionReference: "BANKREF-REQUEST-CANCEL-RACE"
  })));
  assert.equal(response.status, 409, "a request cancelled after preflight must not receive a newly recorded transaction");
  assert.ok(db.batches[0][0].sql.includes("EXISTS (SELECT 1 FROM order_payment_requests WHERE id=? AND order_id=? AND status='pending')"),
    "the receipt INSERT must recheck the linked payment request at the write boundary");
}

{
  const db = makeDb({
    paymentRequest: { id: "request-already-settled", order_id: "order-1", status: "settled" }
  });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", paymentRequestId: "request-already-settled", direction: "received",
    amount: 30000, transactionReference: "BANKREF-SETTLED-REQUEST"
  })));
  assert.equal(response.status, 409, "a settled QR request must not accept another receipt");
  assert.equal(db.batches.length, 0, "a settled request must be rejected before ledger or audit writes");
}
{
  const db = makeDb({
    paymentRequest: { id: "request-settled-race", order_id: "order-1", status: "pending" },
    simulatePaymentRequestSettledBeforeTransactionBatch: true
  });
  const response = await postVerifiedTransaction(adminContext(db, request("/api/admin/payment-transactions", {
    orderId: "order-1", paymentRequestId: "request-settled-race", direction: "received",
    amount: 30000, transactionReference: "BANKREF-SETTLED-RACE"
  })));
  assert.equal(response.status, 409, "a request that settles after preflight must reject a second receipt at the atomic insert boundary");
  assert.ok(db.batches[0][0].sql.includes("status='pending'"),
    "the receipt INSERT must recheck that its linked QR request remains pending");
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
  const ctx = adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  }));
  ctx.env.IMAGES.head = async () => null;
  const response = await createPaymentRequest(ctx, ctx.request);
  assert.equal(response.status, 409, "payment request must fail closed when active QR object is missing");
  assert.equal(db.batches.length, 0, "missing QR object must not create a payable request");
}
{
  const db = makeDb({ orderItems: [
    { fulfillment_type: "made_to_order", quantity: 1, line_total: null },
    { fulfillment_type: "made_to_order", quantity: 1, line_total: 100000 }
  ] });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 409, "an unpriced order item must fail closed even when other lines add up to the confirmed total");
  assert.equal(db.batches.length, 0, "an order with any unpriced item must not create a payment request");
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
  assert.equal(payload.freeShippingApplied, false);
  assert.match(payload.transferReference, /^SD[A-Z0-9]+$/);
  assert.ok(db.batches[0].some(s => s.sql.includes("INSERT INTO order_payment_requests")));
  assert.ok(db.batches[0].some(s => s.sql.includes("payment_request_created")));
  assert.doesNotMatch(JSON.stringify(db.batches[0]), /amount=(?:30000|100000)/, "QR config/ledger must not mutate QR image payload");
}

// QR config can rotate between preflight and D1 batch. A stale request must not be reported as created.
{
  const db = makeDb({ simulateQrConfigChangedBeforeBatch: true });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 409, "a concurrent QR/receiver configuration change must reject the stale payment request");
  assert.equal(db.batches.length, 1, "the QR snapshot must be rechecked at the final atomic write boundary");
  const [insert, audit] = db.batches[0];
  assert.match(insert.sql, /EXISTS \(SELECT 1 FROM settings WHERE key='payment_qr_active' AND value='1'\)/);
  for (const settingKey of ["payment_qr_active_key", "payment_qr_bank_name", "payment_qr_account_number", "payment_qr_account_name"]) {
    assert.ok(insert.sql.includes("key='" + settingKey + "' AND value=?"), "request insert must match current " + settingKey);
  }
  assert.match(audit.sql, /payment_request_created/);
  assert.match(audit.sql, /WHERE EXISTS \(SELECT 1 FROM order_payment_requests WHERE id=\?\)/,
    "audit insertion must depend on the QR request insert succeeding");
}

// An order can change after request preflight but before the atomic insert. Never commit a QR amount from the stale snapshot.
{
  const db = makeDb({
    order: { ...baseOrder, total: 100000, payment_terms_confirmed_at: "2026-10-24T07:00:00.000Z" },
    orderItems: [{ fulfillment_type: "made_to_order", quantity: 1, line_total: 100000 }],
    simulateOrderChangedBeforeBatch: true
  });
  const response = await createPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    orderId: "order-1", paymentOption: "deposit"
  })));
  assert.equal(response.status, 409, "a price/terms change after preflight must reject the stale payment request");
  assert.equal(db.batches.length, 1, "the stale snapshot is rejected at the final write boundary");
  const [insert, audit] = db.batches[0];
  assert.ok(insert.sql.includes("INSERT INTO order_payment_requests") && insert.sql.includes("SELECT"),
    "the request insert must be conditional, not a blind VALUES write");
  assert.ok(insert.sql.includes("payment_terms_confirmed_at=?") && insert.sql.includes("total=?"),
    "the insert must match the order price/terms snapshot validated before computing the amount");
  assert.ok(insert.sql.includes("NOT EXISTS (SELECT 1 FROM order_payment_transactions"),
    "a concurrent verified transaction must not race with creation of a deposit/full request");
  assert.ok(audit.sql.includes("WHERE EXISTS (SELECT 1 FROM order_payment_requests WHERE id=?"),
    "audit log entry must exist only if the conditional payment request insert succeeds");
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-1", public_access_token_hash: tokenHash, total: 100000, payment_terms_confirmed_at: null, price_confirmation_required: 1 };
  const db = makeDb({ publicOrder: order });
  const response = await getOrderPayment({ request: new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-1&token=" + token), env: { DB: db, IMAGES: { head: async key => ({ key }) } } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.paymentReady, false, "valid order token cannot reveal a payment amount before terms confirmation");
  assert.equal(payload.total, null, "unconfirmed order price/terms must not expose a total even when a stale total exists in storage");
  assert.equal(Object.hasOwn(payload, "amount"), false);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store", "token-scoped payment response must not be cached");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-OLD-QR", public_access_token_hash: tokenHash, payment_terms_confirmed_at: "2026-10-21T07:00:00Z", price_confirmation_required: 0 };
  const oldKey = QR_KEY;
  const currentKey = "qr-550e8400-e29b-41d4-a716-446655440001.png";
  const pendingRequest = { id:"request-old-qr", installment_type:"deposit", amount:30000, shipping_benefit:"standard_shipping", transfer_reference:"SDOLDQR1234", qr_image_key:oldKey, bank_name:"Old Bank", account_number:"1111222233", account_name:"NGUYEN VAN A", status:"pending", created_at:"2026-10-21T07:01:00Z" };
  const settings = [{key:"payment_qr_active",value:"1"},{key:"payment_qr_active_key",value:currentKey}];
  const db = makeDb({ publicOrder:{...order,order_number:"SD-TOKEN-OLD-QR"}, pendingRequest, settings });
  const response = await getOrderPayment({ request:new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-OLD-QR&token="+token), env:{ DB:db, IMAGES:{ head:async key=>({key}) } } });
  const payload = await response.json();
  assert.equal(payload.paymentReady, false, "a pending request whose QR was replaced must not remain payable");
  assert.equal(payload.amount, null, "an obsolete QR request must not expose an amount");
  assert.equal(payload.qrImageUrl, undefined, "an obsolete QR request must not expose a dead image URL");
  assert.equal(payload.transferReference, null, "an obsolete QR request must not invite a transfer using stale instructions");
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-MISSING-QR", public_access_token_hash: tokenHash, payment_terms_confirmed_at: "2026-10-21T07:00:00Z", price_confirmation_required: 0 };
  const pendingRequest = { id:"request-missing-qr", installment_type:"deposit", amount:30000, shipping_benefit:"standard_shipping", transfer_reference:"SDMISSQR1234", qr_image_key:QR_KEY, bank_name:"Test Bank", account_number:"1234567890", account_name:"NGUYEN VAN A", status:"pending", created_at:"2026-10-21T07:01:00Z" };
  const settings = [{key:"payment_qr_active",value:"1"},{key:"payment_qr_active_key",value:QR_KEY}];
  const db = makeDb({ publicOrder:{...order,order_number:"SD-TOKEN-MISSING-QR"}, pendingRequest, settings });
  const response = await getOrderPayment({ request:new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-MISSING-QR&token="+token), env:{ DB:db, IMAGES:{ head:async()=>null } } });
  const payload = await response.json();
  assert.equal(payload.paymentReady, false, "active QR config with a missing bucket object must not be payable");
  assert.equal(payload.amount, null);
  assert.equal(payload.qrImageUrl, undefined);
}
{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-2", public_access_token_hash: tokenHash, total: 100000, payment_terms_confirmed_at: "2026-10-21T07:00:00Z", price_confirmation_required: 0 };
  const pendingRequest = { id: "request-1", installment_type: "deposit", amount: 30000, shipping_benefit: "standard_shipping", transfer_reference: "SDREF123456", qr_image_key: QR_KEY, bank_name: "Ngân hàng thử", account_number: "1234567890", account_name: "NGUYEN VAN A", status: "pending", created_at: "2026-10-21T07:01:00Z" };
  const db = makeDb({ publicOrder: order, pendingRequest });
  const response = await getOrderPayment({ request: new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-2&token=" + token), env: { DB: db, IMAGES: { head: async key => ({ key }) } } });
  const payload = await response.json();
  assert.equal(response.headers.get("Cache-Control"), "private, no-store", "ready payment instructions and amount must not be cached");
  assert.equal(payload.paymentReady, true);
  const selectedRequest = db.calls.find(call => call.sql.includes("FROM order_payment_requests WHERE order_id=?"));
  assert.match(selectedRequest.sql, /ORDER BY CASE WHEN status=\x27pending\x27 THEN 0 ELSE 1 END/, "the pending request should be selected even when timestamps tie");
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
  assert.equal(payload.freeShippingApplied, false);
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
  assert.equal(payload.freeShippingEligible, true, "full payment request is eligible for freeship");
  assert.equal(payload.freeShippingApplied, false, "pending full payment is not yet an applied delivery benefit");
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


{
  const token = createOrderAccessToken();
  const tokenHash = await hashOrderAccessToken(token);
  const order = { ...baseOrder, order_number: "SD-TOKEN-FULL-PAID", public_access_token_hash: tokenHash, payment_status: "paid", total: 100000, payment_terms_confirmed_at: "2026-10-21T07:00:00Z", price_confirmation_required: 0 };
  const paidRequest = { id: "request-paid", installment_type: "full", amount: 100000, shipping_benefit: "free_shipping", transfer_reference: "SDFULL123456", qr_image_key: QR_KEY, bank_name: "Ngân hàng thử", account_number: "1234567890", account_name: "NGUYEN VAN A", status: "settled", created_at: "2026-10-21T07:01:00Z" };
  const db = makeDb({ publicOrder: order, pendingRequest: paidRequest });
  const response = await getOrderPayment({ request: new Request("https://shop.example/api/order-payment?orderNumber=SD-TOKEN-FULL-PAID&token=" + token), env: { DB: db, IMAGES: { head: async key => ({ key }) } } });
  const payload = await response.json();
  assert.equal(payload.paymentReady, false);
  assert.equal(payload.freeShippingEligible, true);
  assert.equal(payload.freeShipping, true, "freeship becomes applied only after server payment status is paid");
  assert.equal(Object.hasOwn(payload, "amount"), true);
  assert.equal(payload.amount, null, "paid order must not request another transfer");
}

{
  const settings = {
    payment_qr_active: "1", payment_qr_active_key: QR_KEY,
    payment_qr_bank_name: "Ngân hàng thử", payment_qr_account_number: "1234567890",
    payment_qr_account_name: "NGUYEN VAN A", payment_qr_instructions: "Ghi đúng nội dung chuyển khoản"
  };
  const db = { prepare() { let key; return { bind(value) { key = value; return this; }, async first() { return Object.hasOwn(settings, key) ? { value: settings[key] } : null; } }; } };
  const response = await getPaymentSettings({ env: { DB: db, IMAGES: { head: async key => ({ key }) } } });
  const payload = await response.json();
  assert.equal(payload.configured, true, "public payment settings only advertise a verified active configuration when its QR object exists");
  assert.equal(payload.qrImageUrl, "/payment-qr/" + QR_KEY);
}
{
  const settings = {
    payment_qr_active: "1", payment_qr_active_key: QR_KEY,
    payment_qr_bank_name: "Ngân hàng thử", payment_qr_account_number: "1234567890",
    payment_qr_account_name: "NGUYEN VAN A", payment_qr_instructions: "Ghi đúng nội dung chuyển khoản"
  };
  const db = { prepare() { let key; return { bind(value) { key = value; return this; }, async first() { return Object.hasOwn(settings, key) ? { value: settings[key] } : null; } }; } };
  const response = await getPaymentSettings({ env: { DB: db, IMAGES: { head: async () => null } } });
  const payload = await response.json();
  assert.equal(payload.configured, false, "missing QR storage asset must fail closed on the public config endpoint");
  assert.equal(payload.qrImageUrl, "");
  assert.equal(payload.bankName, "");
  assert.equal(payload.accountNumber, "");
  assert.equal(payload.accountName, "");
}
{
  const db = makeDb({
    paymentRequest: { id: "request-cancel-race", order_id: "order-1", status: "pending" },
    cancelUpdateHasNoChanges: true
  });
  const response = await cancelPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    action: "cancel", id: "request-cancel-race"
  })));
  assert.equal(response.status, 409, "a request settled by another actor before the guarded UPDATE must not report cancellation success");
  assert.equal(db.batches.length, 1);
  const statements = db.batches[0];
  assert.match(statements[0].sql, /UPDATE order_payment_requests SET status='cancelled'.*WHERE id=\? AND status='pending'/);
  assert.match(statements[1].sql, /INSERT INTO audit_logs[\s\S]*SELECT \?,'admin','payment_request_cancelled','order',\?,\? WHERE changes\(\)=1/,
    "the audit event must be conditional on the preceding cancellation UPDATE changing one row");
}
{
  const db = makeDb({
    paymentRequest: { id: "request-cancel-success", order_id: "order-1", status: "pending" }
  });
  const response = await cancelPaymentRequest(adminContext(db, request("/api/admin/payment-requests", {
    action: "cancel", id: "request-cancel-success"
  })));
  assert.equal(response.status, 200, "a pending request whose guarded UPDATE changes one row may be cancelled");
  assert.equal((await response.json()).ok, true);
  assert.match(db.batches[0][1].sql, /WHERE changes\(\)=1/);
}

console.log("PASS payment ledger route behavior: owner-derived deposit amounts, client amount rejection, mixed/unclassified cart gates, freeship and verified ledger.");
