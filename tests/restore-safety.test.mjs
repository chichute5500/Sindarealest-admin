import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as restoreBackup } from "../functions/api/admin/restore.js";

const ADMIN_PASSWORD = "restore-test-admin-password-long";
const SESSION_SECRET = "restore-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);

function product() {
  return {
    id: "product-1", slug: "product-1", title: "Giày thử nghiệm", sku: "SD-SN001",
    category: "sneakers", categoryLabel: "Sneaker", price: null, stock: null,
    published: true, images: [], description: "", sortOrder: 1,
  };
}
function makeDB({ failBatch = false } = {}) {
  let batchCalls = 0;
  let statements = [];
  return {
    prepare(sql) {
      return { sql, values: [], bind(...values) { this.values = values; return this; } };
    },
    async batch(next) {
      batchCalls++;
      statements = next;
      if (failBatch) throw new Error("simulated atomic batch failure");
      return next.map(() => ({ success: true, meta: { changes: 1 } }));
    },
    get batchCalls() { return batchCalls; },
    get statements() { return statements; },
  };
}
function request(backup, extraHeaders = {}) {
  return new Request("https://shop.example/api/admin/restore", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(backup),
  });
}
const env = { ADMIN_PASSWORD, SESSION_SECRET };

{
  const db = makeDB();
  const response = await restoreBackup({
    request: request({ format: "sindarealest-backup-v1", products: [product()], settings: { showPrices: true } }),
    env: { ...env, DB: db },
  });
  assert.equal(response.status, 200, "valid v1 backups should still restore");
  assert.equal(db.batchCalls, 1);
  assert.ok(db.statements.some((statement) => statement.sql === "DELETE FROM products"));
  assert.ok(!db.statements.some((statement) => statement.sql.startsWith("DELETE FROM orders")),
    "v1 backups must preserve operational data they do not contain");
}

{
  const db = makeDB();
  const response = await restoreBackup({
    request: request({ format: "sindarealest-backup-v1", products: [product(), { ...product(), id: "product-2", slug: "product-2" }], settings: { showPrices: true } }),
    env: { ...env, DB: db },
  });
  assert.equal(response.status, 400, "duplicate SKUs must be rejected before destructive restore");
  assert.equal(db.batchCalls, 0, "invalid backup must not issue any D1 writes");
}

{
  const db = makeDB();
  const response = await restoreBackup({
    request: request({ format: "sindarealest-backup-v1", products: [], settings: { showPrices: true } }, { "Content-Length": String(21 * 1024 * 1024) }),
    env: { ...env, DB: db },
  });
  assert.equal(response.status, 413, "oversized declared backups must be rejected before JSON parsing");
  assert.equal(db.batchCalls, 0);
}

{
  const db = makeDB();
  const legacyV2 = {
    format: "sindarealest-backup-v2",
    products: [product()],
    settings: {
      showPrices: true, welcomeEnabled: false,
      welcomeTitleLine1: "Xin chào", welcomeTitleLine2: "SinDarealest", welcomeText: "Chào mừng",
    },
    operations: {
      customers: [{
        id: "customer-1", full_name: "Nguyễn An", phone: "0900000000",
        email: "an@example.test", address: "", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
      }],
      orders: [{
        id: "order-1", order_number: "ORD-0001", customer_id: "customer-1",
        status: "pending_confirmation", payment_status: "unpaid", subtotal: null, total: null,
        price_confirmation_required: 1, customer_note: "",
        created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
      }],
      orderItems: [{
        id: "item-1", order_id: "order-1", product_id: "product-1",
        sku: "SD-SN001", title: "Giày thử nghiệm", quantity: 1, unit_price: null, line_total: null,
      }],
      warranties: [], warrantyClaims: [], auditLogs: [],
    },
  };
  const response = await restoreBackup({ request: request(legacyV2), env: { ...env, DB: db } });
  assert.equal(response.status, 200, "older v2 backups without contact snapshots should remain restorable");
  const contact = db.statements.find((statement) => statement.sql.startsWith("INSERT INTO order_contact_details"));
  assert.ok(contact, "restore must synthesize contact snapshots when older backups omit them");
  assert.equal(contact.values[0], "order-1");
  assert.equal(contact.values[1], "Nguyễn An");
  assert.equal(contact.values[2], "0900000000");
}

{
  const malformedProductDB = makeDB();
  const malformedProductResponse = await restoreBackup({
    request: request({ format: "sindarealest-backup-v1", products: [null], settings: { showPrices: true } }),
    env: { ...env, DB: malformedProductDB },
  });
  assert.equal(malformedProductResponse.status, 400, "null product rows should be rejected as a controlled validation error");
  assert.equal(malformedProductDB.batchCalls, 0, "malformed product rows must not issue D1 writes");

  const malformedOperationsDB = makeDB();
  const malformedOperationsResponse = await restoreBackup({
    request: request({
      format: "sindarealest-backup-v2",
      products: [],
      settings: { showPrices: true, welcomeEnabled: true, welcomeTitleLine1: "Xin chào", welcomeTitleLine2: "SinDarealest", welcomeText: "Chào mừng" },
      operations: { customers: [null], orders: [], orderItems: [], warranties: [], warrantyClaims: [], auditLogs: [] },
    }),
    env: { ...env, DB: malformedOperationsDB },
  });
  assert.equal(malformedOperationsResponse.status, 400, "null operational rows should be rejected as a controlled validation error");
  assert.equal(malformedOperationsDB.batchCalls, 0, "malformed operational rows must not issue D1 writes");
}

{
  const validRelationshipsBackup = () => ({
    format: "sindarealest-backup-v2",
    products: [],
    settings: {
      showPrices: true, welcomeEnabled: true,
      welcomeTitleLine1: "Xin chào", welcomeTitleLine2: "SinDarealest", welcomeText: "Chào mừng",
    },
    operations: {
      customers: [
        { id: "customer-1", full_name: "Nguyễn An", phone: "0900000001", email: "", address: "", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
        { id: "customer-2", full_name: "Nguyễn Bình", phone: "0900000002", email: "", address: "", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
      ],
      orders: [
        { id: "order-1", order_number: "ORD-0001", customer_id: "customer-1", status: "pending_confirmation", payment_status: "unpaid", subtotal: null, total: null, price_confirmation_required: 1, customer_note: "", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
        { id: "order-2", order_number: "ORD-0002", customer_id: "customer-2", status: "pending_confirmation", payment_status: "unpaid", subtotal: null, total: null, price_confirmation_required: 1, customer_note: "", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
      ],
      orderItems: [
        { id: "item-1", order_id: "order-1", product_id: "product-1", sku: "SD-SN001", title: "Giày một", quantity: 1, unit_price: null, line_total: null },
        { id: "item-2", order_id: "order-2", product_id: "product-2", sku: "SD-SN002", title: "Giày hai", quantity: 1, unit_price: null, line_total: null },
      ],
      warranties: [], warrantyClaims: [], auditLogs: [],
    },
  });

  const mismatchedWarranty = validRelationshipsBackup();
  mismatchedWarranty.operations.warranties.push({
    id: "warranty-1", order_id: "order-1", order_item_id: "item-2",
    warranty_code: "WR-0001", policy_name: "Bảo hành thử", duration_months: 12,
    starts_at: "2026-01-01", ends_at: "2027-01-01", status: "active", created_at: "2026-01-01 00:00:00",
  });
  const warrantyDB = makeDB();
  const warrantyResponse = await restoreBackup({ request: request(mismatchedWarranty), env: { ...env, DB: warrantyDB } });
  assert.equal(warrantyResponse.status, 400, "warranty order and order-item references must belong to the same order");
  assert.equal(warrantyDB.batchCalls, 0, "mismatched warranty relationships must be rejected before writes");

  const mismatchedClaim = validRelationshipsBackup();
  mismatchedClaim.operations.warrantyClaims.push({
    id: "claim-1", order_id: "order-1", customer_id: "customer-2",
    warranty_code: "", message: "Yêu cầu kiểm tra", status: "received", admin_note: "",
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
  });
  const claimDB = makeDB();
  const claimResponse = await restoreBackup({ request: request(mismatchedClaim), env: { ...env, DB: claimDB } });
  assert.equal(claimResponse.status, 400, "warranty claim customer must match the order's customer");
  assert.equal(claimDB.batchCalls, 0, "mismatched claim relationships must be rejected before writes");
}

{
  const db = makeDB({ failBatch: true });
  const response = await restoreBackup({
    request: request({ format: "sindarealest-backup-v1", products: [product()], settings: { showPrices: true } }),
    env: { ...env, DB: db },
  });
  assert.equal(response.status, 503, "failed D1 batch should return a controlled error");
  assert.equal(db.batchCalls, 1, "all destructive writes must be in one atomic D1 batch");
}

{
  const db = makeDB();
  const customers = Array.from({ length: 642 }, (_, index) => ({
    id: "customer-" + index,
    full_name: "Khách hàng " + index,
    phone: String(10000000000 + index),
    email: "",
    address: "",
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
  }));
  const response = await restoreBackup({
    request: request({
      format: "sindarealest-backup-v2",
      products: [],
      settings: { showPrices: true, welcomeEnabled: true, welcomeTitleLine1: "Xin chào", welcomeTitleLine2: "SinDarealest", welcomeText: "Chào mừng" },
      operations: { customers, orders: [], orderItems: [], warranties: [], warrantyClaims: [], auditLogs: [] },
    }),
    env: { ...env, DB: db },
  });
  assert.equal(response.status, 413, "restore must reject batches that exceed the conservative D1 binding budget");
  assert.equal(db.batchCalls, 0, "binding-budget overflow must be rejected before any destructive D1 batch");
}

console.log("PASS: restore safety — v1 preservation, invalid/oversized rejection, legacy v2 snapshot backfill, binding-budget guard, and single-batch failure handling.");
