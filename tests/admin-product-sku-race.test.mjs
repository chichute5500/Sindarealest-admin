import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as createProduct } from "../functions/api/admin/products.js";

const ADMIN_PASSWORD = "sku-race-test-admin-password";
const SESSION_SECRET = "sku-race-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const skuState = [];
let skuReads = 0;
let batchCalls = 0;

const DB = {
  prepare(sql) {
    const statement = { sql, values: [], bind(...values) { this.values = values; return this; } };
    statement.all = async () => {
      if (sql.startsWith("SELECT sku FROM products WHERE sku LIKE ?")) {
        skuReads++;
        return { results: skuReads === 1 ? [] : skuState.map((sku) => ({ sku })) };
      }
      return { results: [] };
    };
    return statement;
  },
  async batch(statements) {
    batchCalls++;
    const insert = statements.find((statement) => statement.sql.startsWith("INSERT INTO products"));
    assert.ok(insert, "product insert statement should be in the D1 batch");
    const sku = insert.values[2];
    if (batchCalls === 1) {
      // Simulate another admin request creating SKU001 after this request's
      // initial SELECT but before its INSERT.
      skuState.push("SD-SN001");
      throw new Error("UNIQUE constraint failed: products.sku");
    }
    assert.equal(sku, "SD-SN002");
    skuState.push(sku);
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  },
};

const response = await createProduct({
  request: new Request("https://shop.example/api/admin/products", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Giày thử SKU",
      category: "sneakers",
      categoryLabel: "Sneakers",
      description: "Mô tả kiểm tra",
      price: null,
      stock: null,
      published: false,
      images: [],
      sourcePriceConfirmed: false,
      sortOrder: 0,
    }),
  }),
  env: { DB, ADMIN_PASSWORD, SESSION_SECRET },
});
assert.equal(response.status, 201, "SKU conflict caused by a concurrent admin request should retry safely");
const payload = await response.json();
assert.equal(payload.product.sku, "SD-SN002");
assert.equal(payload.product.skuVerified, false, "auto-generated SKU must be marked as an internal identifier");
assert.deepEqual(skuState, ["SD-SN001", "SD-SN002"], "no duplicate SKU should be committed");
assert.equal(batchCalls, 2, "only the colliding SKU insertion should be retried");
console.log("PASS: concurrent product creation retries automatic SKU allocation after a unique conflict.");
