import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createOrder } from "../functions/api/orders.js";

const batchedStatements = [];
const product = {
  id: "product-1", sku: "SD-SN001", title: "Giày thử", price: 1500000,
  stock: 5, published: 1, source_price_confirmed: 1,
};
const DB = {
  prepare(sql) {
    const stmt = {
      sql,
      values: [],
      bind(...values) { this.values = values; return this; },
      async run() { return { success: true, meta: { changes: 1 } }; },
      async first() {
        if (sql.includes("SELECT attempts FROM public_rate_limits")) return { attempts: 1 };
        if (sql.includes("SELECT value FROM settings")) return { value: "1" };
        return null;
      },
      async all() {
        if (sql.includes("FROM products WHERE id IN")) return { results: [product] };
        return { results: [] };
      },
    };
    return stmt;
  },
  async batch(statements) {
    batchedStatements.push(...statements.map((s) => ({ sql: s.sql, values: s.values })));
    if (statements[0]?.sql.includes("INSERT INTO public_rate_limits")) {
      return [{ success: true, meta: { changes: 1 } }, { success: true, results: [{ attempts: 1 }] }];
    }
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  },
};

const response = await createOrder({
  request: new Request("https://shop.example/api/orders", {
    method: "POST",
    headers: { Origin: "https://shop.example", "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
    body: JSON.stringify({
      fullName: "Tên gửi lần này",
      phone: "0900000000",
      email: "order@example.test",
      province: "Lâm Đồng",
      provinceCode: "68",
      ward: "Phường thử",
      wardCode: "68001",
      streetAddress: "12 Đường thử",
      address: "12 Đường thử, Phường thử, Lâm Đồng",
      items: [{ id: "product-1", quantity: 2 }],
      paymentOption: "deposit", quotedTotal: 3000000,
      note: "Giao giờ hành chính",
    }),
  }),
  env: { DB },
});

assert.equal(response.status, 201, "valid checkout should create the order");
assert.equal((await response.json()).ok, true);
assert.ok(!batchedStatements.some((s) => /^UPDATE customers\b/i.test(s.sql)),
  "public checkout must never overwrite an existing customer profile");
assert.ok(batchedStatements.some((s) => /INSERT INTO customers\([^)]*\) VALUES\([^)]*\) ON CONFLICT\(phone\) DO NOTHING/i.test(s.sql)),
  "profile creation must resolve same-phone races without updating an existing profile");
const orderInsert = batchedStatements.find((s) => /INSERT INTO orders\([^)]*\) SELECT .*FROM customers c WHERE c\.phone=\?/i.test(s.sql));
assert.ok(orderInsert, "order must bind to the canonical customer row selected atomically by phone");
assert.equal(orderInsert.values.at(-1), "0900000000");
const contactSnapshot = batchedStatements.find((s) => /INSERT INTO order_contact_details/i.test(s.sql));
assert.ok(contactSnapshot, "each order must persist its own contact snapshot");
assert.deepEqual(contactSnapshot.values.slice(1, 4),
  ["Tên gửi lần này", "0900000000", "order@example.test"],
  "snapshot must preserve the data submitted for this order without changing the customer profile");

const warrantyLookupSource = readFileSync(
  new URL("../functions/api/warranty-lookup.js", import.meta.url), "utf8");
const adminWarrantySource = readFileSync(
  new URL("../functions/api/admin/warranties.js", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../migrations/0007_order_contact_details.sql", import.meta.url), "utf8");
assert.ok(warrantyLookupSource.includes("COALESCE(oc.phone,c.phone)") &&
  warrantyLookupSource.includes("LEFT JOIN order_contact_details oc ON oc.order_id=o.id"),
  "public warranty lookup must use the contact number associated with the purchase");
assert.ok(adminWarrantySource.includes("COALESCE(oc.full_name,c.full_name)") &&
  adminWarrantySource.includes("LEFT JOIN order_contact_details oc ON oc.order_id=o.id"),
  "admin warranty views must show purchase-time contact information");
assert.ok(migration.includes("INSERT OR IGNORE INTO order_contact_details") &&
  migration.includes("FROM orders o") && migration.includes("JOIN customers c ON c.id = o.customer_id"),
  "migration must backfill historic orders without deleting operational data");



// Invalid or unpublished prices must not be persisted into an order-item snapshot.
// Every case uses an isolated in-memory DB double; there are no D1/production writes.
async function runPriceCase({ price, confirmed, showPrices }) {
  const savedStatements = [];
  const testProduct = {
    id: "product-price-case",
    sku: "INTERNAL-TEST",
    sku_verified: 0,
    title: "Sản phẩm kiểm thử trong bộ nhớ",
    price,
    stock: 5,
    published: 1,
    source_price_confirmed: confirmed ? 1 : 0,
  };
  const testDB = {
    prepare(sql) {
      const stmt = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async run() { return { success: true, meta: { changes: 1 } }; },
        async first() {
          if (sql.includes("SELECT attempts FROM public_rate_limits")) return { attempts: 1 };
          if (sql.includes("SELECT value FROM settings")) return { value: showPrices ? "1" : "0" };
          return null;
        },
        async all() {
          if (sql.includes("FROM products WHERE id IN")) return { results: [testProduct] };
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch(statements) {
      if (statements[0]?.sql.includes("INSERT INTO public_rate_limits")) {
        return [{ success: true, meta: { changes: 1 } }, { success: true, results: [{ attempts: 1 }] }];
      }
      savedStatements.push(...statements.map((s) => ({ sql: s.sql, values: s.values })));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const response = await createOrder({
    request: new Request("https://shop.example/api/orders", {
      method: "POST",
      headers: { Origin: "https://shop.example", "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
      body: JSON.stringify({
        fullName: "Khách kiểm thử",
        phone: "0900000000",
        email: "",
        province: "Lâm Đồng",
        provinceCode: "68",
        ward: "Phường thử",
        wardCode: "68001",
        streetAddress: "12 Đường thử",
        address: "12 Đường thử, Phường thử, Lâm Đồng",
        items: [{ id: "product-price-case", quantity: 2 }],
        ...(showPrices&&confirmed&&Number.isSafeInteger(price)&&price>=0?{paymentOption:"deposit",quotedTotal:price*2}:{}),
        note: "",
      }),
    }),
    env: { DB: testDB },
  });
  assert.equal(response.status, 201, "a valid order request can still be accepted pending price confirmation: "+await response.clone().text());
  const body = await response.json();
  const itemStatement = savedStatements.find((s) => /INSERT INTO order_items\b/.test(s.sql));
  const orderStatement = savedStatements.find((s) => /INSERT INTO orders\b/.test(s.sql));
  assert.ok(itemStatement, "an order-item snapshot is built for the price scenario");
  assert.ok(orderStatement, "an order summary is built for the price scenario");
  return { body, itemValues: itemStatement.values, orderValues: orderStatement.values };
}

for (const invalidCase of [
  { name: "negative", price: -1, confirmed: true, showPrices: true },
  { name: "fractional", price: 1.5, confirmed: true, showPrices: true },
  { name: "empty", price: "", confirmed: true, showPrices: true },
  { name: "unconfirmed", price: 1500000, confirmed: false, showPrices: true },
  { name: "public toggle disabled", price: 1500000, confirmed: true, showPrices: false },
]) {
  const result = await runPriceCase(invalidCase);
  assert.equal(result.itemValues[7], null, invalidCase.name + ": order-item price must be NULL");
  assert.equal(result.itemValues[8], null, invalidCase.name + ": order-item line total must be NULL");
  assert.equal(result.orderValues[2], null, invalidCase.name + ": order subtotal must be NULL");
  assert.equal(result.orderValues[3], null, invalidCase.name + ": order total must be NULL");
  assert.equal(result.orderValues[4], 1, invalidCase.name + ": order must require price confirmation");
  assert.equal(result.body.priceConfirmationRequired, true, invalidCase.name + ": public response must require price confirmation");
  assert.equal(result.body.total, null, invalidCase.name + ": public response must not return a fabricated total");
}
const validPriceResult = await runPriceCase({ price: 1234567, confirmed: true, showPrices: true });
assert.equal(validPriceResult.itemValues[7], 1234567, "a confirmed, visible whole-VND price remains available");
assert.equal(validPriceResult.itemValues[8], 2469134, "a valid visible price is multiplied by item quantity");
assert.equal(validPriceResult.orderValues[2], 2469134, "a fully priced order keeps its calculated subtotal");
assert.equal(validPriceResult.orderValues[3], 2469134, "a fully priced order keeps its calculated total");
assert.equal(validPriceResult.orderValues[4], 0, "a fully priced order does not require price confirmation");
assert.equal(validPriceResult.body.priceConfirmationRequired, false, "valid confirmed totals stay confirmed");
assert.equal(validPriceResult.body.total, 2469134, "valid total is returned when appropriate");
console.log("PASS: order snapshots never persist negative, fractional, blank, unconfirmed, or publicly hidden prices.");
