import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as createProduct } from "../functions/api/admin/products.js";

const ADMIN_PASSWORD = "zip-import-admin-password-test";
const SESSION_SECRET = "zip-import-session-secret-long-enough-for-tests";
const session = await createSession(SESSION_SECRET);

function database() {
  const batchCalls = [];
  const prepared = [];
  const DB = {
    prepare(sql) {
      const statement = { sql, args: [], bind(...args) { this.args = args; return this; } };
      prepared.push(statement);
      statement.all = async () => {
        if (sql.startsWith("SELECT sku FROM products WHERE sku LIKE")) return { results: [] };
        return { results: [] };
      };
      return statement;
    },
    async batch(statements) {
      batchCalls.push(statements);
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { DB, batchCalls, prepared };
}

function request(body) {
  return new Request("https://preview.example/api/admin/products", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://preview.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const product = {
  title: "Sneaker ZIP test",
  category: "sneakers",
  categoryLabel: "Sneaker",
  description: "Created through isolated ZIP import regression fixture",
  price: null,
  stock: null,
  published: true,
  images: ["/media/12345678-1234-1234-1234-123456789012.webp"],
  sourcePriceConfirmed: false,
  sortOrder: 0,
  importSource: {
    exportId: "collector-export-0001",
    exportFolder: "images/collector-export-0001/",
    productId: "taobao-product-1",
    title: "Source title",
    category: "Sneaker",
    description: "Source description",
    price: "199",
    currency: "CNY",
    url: "https://example.invalid/item/1",
    sourceRecord: { export_id: "collector-export-0001", title_vi: "Giày nguồn" },
  },
};

// ZIP source metadata must be rejected before any D1 statement is prepared when the flag is off.
{
  const { DB, batchCalls, prepared } = database();
  const response = await createProduct({
    request: request(product),
    env: { DB, ADMIN_PASSWORD, SESSION_SECRET, ZIP_IMPORT_ENABLED: "0" },
  });
  assert.equal(response.status, 403);
  assert.equal(batchCalls.length, 0, "disabled ZIP import must never start a database write batch");
  assert.equal(prepared.length, 0, "the disabled feature gate should run before querying SKU state");
}

// When enabled on an isolated test binding, product, provenance metadata, and audit log must be atomic.
{
  const { DB, batchCalls } = database();
  const response = await createProduct({
    request: request(product),
    env: { DB, ADMIN_PASSWORD, SESSION_SECRET, ZIP_IMPORT_ENABLED: "1" },
  });
  assert.equal(response.status, 201, await response.clone().text());
  const result = await response.json();
  assert.equal(result.product.published, false, "server must force ZIP-created products to remain hidden");
  assert.equal(result.product.sku, "SD-SN001");
  assert.equal(batchCalls.length, 1, "product creation should commit in one D1 batch");
  assert.equal(batchCalls[0].length, 3, "batch must contain product, source metadata, and audit records");

  const productInsert = batchCalls[0].find(statement => statement.sql.startsWith("INSERT INTO products"));
  assert.ok(productInsert, "the product row should be part of the atomic batch");
  assert.equal(productInsert.args[9], 0, "client published=true must be overridden before validation");

  const sourceInsert = batchCalls[0].find(statement => statement.sql.includes("INSERT INTO product_source_imports"));
  assert.ok(sourceInsert, "source metadata should be in the same batch as product creation");
  assert.equal(sourceInsert.args[1], "collector-export-0001");
  assert.equal(sourceInsert.args[2], "images/collector-export-0001/");
  assert.equal(sourceInsert.args[10], JSON.stringify(product.importSource.sourceRecord));

  const auditInsert = batchCalls[0].find(statement => statement.sql.startsWith("INSERT INTO audit_logs"));
  assert.ok(auditInsert, "ZIP creation should create an audit log in the same batch");
  assert.equal(auditInsert.args[1], "product_created_from_zip");
  assert.equal(JSON.parse(auditInsert.args[3]).exportId, "collector-export-0001");
}

console.log("PASS: ZIP product API is feature-gated, forces imported products hidden, and batches product/source/audit writes atomically.");
