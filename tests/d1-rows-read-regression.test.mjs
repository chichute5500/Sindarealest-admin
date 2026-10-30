/**
 * D1 rows-read regression: executable against a disposable SQLite DB only.
 * No Cloudflare bindings, network calls, Production D1 or Preview D1.
 */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createSession } from "../functions/_lib.js";
import { onRequestGet } from "../functions/api/admin/orders.js";

const db = new DatabaseSync(":memory:");
const migrations = [
  "0001_schema.sql", "0003_storefront_operations.sql",
  "0004_admin_notifications.sql", "0005_address_warranty_verification.sql",
  "0006_remove_warranty_otp.sql", "0007_order_contact_details.sql",
  "0008_product_sku_verification.sql", "0009_fulfillment_and_manual_payments.sql",
  "0015_d1_rows_read_indexes.sql"
];
for (const filename of migrations) {
  db.exec(readFileSync(new URL("../migrations/" + filename, import.meta.url), "utf8"));
}

const plan = (statement, ...args) =>
  db.prepare("EXPLAIN QUERY PLAN " + statement).all(...args).map(x => x.detail).join(" | ");
assert.match(
  plan("SELECT id FROM audit_logs WHERE entity_type='order' AND entity_id=? AND action='order_created' ORDER BY created_at DESC LIMIT 1", "order-a"),
  /idx_audit_entity_action_created/,
  "Order audit lookups must use the composite index"
);
assert.match(
  plan("SELECT * FROM products WHERE published=1 ORDER BY created_at DESC,id DESC LIMIT 2000"),
  /idx_products_published_created/,
  "Public product list must use the index matching its existing newest-first order"
);
assert.match(
  plan("SELECT * FROM products WHERE published=1 AND fulfillment_type=? ORDER BY created_at DESC,id DESC LIMIT 2000", "made_to_order"),
  /idx_products_published_type_created/,
  "Product fulfillment filter must use the covering sort index"
);
const slugPlan = plan("SELECT * FROM products WHERE lower(slug)=? OR lower(id)=? OR upper(sku)=upper(?) LIMIT 1", "item", "item", "item");
for (const index of ["idx_products_lower_slug","idx_products_lower_id","idx_products_upper_sku"])
  assert.ok(slugPlan.includes(index), "Case-folded product lookup must use " + index);

db.prepare("INSERT INTO customers(id,full_name,phone,email,address) VALUES(?,?,?,?,?)")
  .run("customer-a","Profile name","0900000000","profile@example.test","Profile address");
for(const [id,number,created] of [
  ["order-a","SD-TEST-A","2026-10-26 12:00:00"],
  ["order-b","SD-TEST-B","2026-10-25 12:00:00"]
]) db.prepare(
  "INSERT INTO orders(id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,customer_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)"
).run(id,number,"customer-a","processing","pending",150000,150000,0,"",created);
db.prepare("INSERT INTO order_contact_details(order_id,full_name,phone,email) VALUES(?,?,?,?)")
  .run("order-a","Order snapshot","0911111111","order@example.test");
db.prepare("INSERT INTO order_shipping_addresses(order_id,full_address) VALUES(?,?)")
  .run("order-a","Shipping snapshot");
for (const [id,orderId,sku,price] of [
  ["item-a1","order-a","SD-SN001",100000],
  ["item-a2","order-a","SD-GL001",50000],
  ["item-b1","order-b","SD-MU001",150000]
]) db.prepare("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total,sku_verified,fulfillment_type) VALUES(?,?,?,?,?,?,?,?,?,?)")
  .run(id,orderId,id,sku,sku,1,price,price,1,"made_to_order");

const auditInsert = db.prepare(
  "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?)"
);
const audit = (id,orderId,action,details,date) =>
  auditInsert.run(id,"qa",action,"order",orderId,JSON.stringify(details),date);
audit("a-created-old","order-a","order_created",{
  selectedPaymentOption:"full",selectedPaymentAmount:150000
},"2026-10-26 10:00:00");
audit("a-created-new","order-a","order_created",{
  selectedPaymentOption:"deposit",selectedPaymentAmount:30000,
  selectedRemainingAmount:120000,selectedDiscountAmount:0,transferReference:"SD-TEST-PAY"
},"2026-10-26 12:00:00");
audit("a-confirmed-1","order-a","order_updated",{status:"confirmed"},"2026-10-26 13:00:00");
audit("a-confirmed-2","order-a","order_updated",{status:"confirmed"},"2026-10-26 13:15:00");
audit("a-processing","order-a","order_updated",{status:"processing"},"2026-10-26 14:00:00");
for(let i=0;i<250;i++) audit("noise-"+i,"unrelated-"+i,"order_updated",{status:"processing"},"2026-10-26 13:00:00");
// Exercise competing event types and unrelated entities under the same ID.
audit("unrelated-entity","order-a","order_updated",{status:"completed"},"2026-10-26 14:00:00");
audit("b-completed","order-b","order_updated",{status:"completed"},"2026-10-25 13:00:00");


db.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor,verified_at) VALUES(?,?,?,?,?,?,?)")
  .run("payment-a1","order-a","received",30000,"BANK-TEST-1","admin","2026-10-26 14:30:00");
db.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor,verified_at) VALUES(?,?,?,?,?,?,?)")
  .run("payment-a2","order-a","received",120000,"BANK-TEST-2","admin_cod_completion","2026-10-30 17:00:00");

db.prepare("INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,actor,verified_at) VALUES(?,?,?,?,?,?,?)")
  .run("payment-a3","order-a","refunded",5000,"BANK-TEST-REFUND","admin","2026-10-30 18:00:00");
db.prepare("INSERT INTO order_payment_requests(id,order_id,installment_type,amount,transfer_reference,qr_image_key,bank_name,account_number,account_name,status) VALUES(?,?,?,?,?,?,?,?,?,?)")
  .run("request-pending-a","order-a","balance",120000,"SD-TEST-REQUEST","qa/pending.png","TEST BANK","111111","QA CUSTOMER","pending");

const SECRET = "d1-rows-read-qa-secret-at-least-thirty-two-characters";
const session = await createSession(SECRET);
let calls = 0;
let executedSql = "";
const D1 = {
  prepare(sql) {
    ++calls;
    executedSql = sql;
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; }
    };
  }
};
const response = await onRequestGet({
  request: new Request("https://qa.invalid/api/admin/orders", {
    headers: {
      Cookie:"sd_admin_session=" + session,
      Origin:"https://qa.invalid",
      "Sec-Fetch-Site":"same-origin"
    }
  }),
  env: { DB:D1, ADMIN_PASSWORD:"test-admin-password", SESSION_SECRET:SECRET }
});
assert.equal(response.status,200,"Optimized real-SQL order list must remain available");
assert.equal(calls,1,"Admin order read remains one D1 request");
// Execute the exact, immutable SQL snapshot from the old main and the new SQL
// on identical input rows. The query must remain byte-for-byte equivalent at
// the result-row level, independent from hand-picked expectations below.
const baselineSql = readFileSync(
  new URL("./fixtures/d1-admin-orders-original.sql", import.meta.url), "utf8"
);
const baselineRows = db.prepare(baselineSql).all();
const optimizedRows = db.prepare(executedSql).all();
assert.deepEqual(
  optimizedRows,baselineRows,
  "All fields, raw amounts, real status dates, joins, row order and nulls must equal original main SQL"
);
assert.equal(optimizedRows.length,3,"Both query versions return all order item rows");

const { orders } = await response.json();
assert.equal(orders.length,2);
const a = orders.find(order => order.id==="order-a");
const b = orders.find(order => order.id==="order-b");
assert.ok(a && b);
assert.equal(a.items.length,2);
assert.equal(b.items.length,1);
assert.equal(a.full_name,"Order snapshot");
assert.equal(a.phone,"0911111111");
assert.equal(a.address,"Shipping snapshot");
assert.equal(a.customer_payment_option,"deposit");
assert.equal(a.customer_payment_amount,30000);
assert.equal(a.customer_payment_remaining_amount,120000);
assert.equal(a.customer_payment_discount_amount,0);
assert.equal(a.customer_transfer_reference,"SD-TEST-PAY");
assert.equal(a.timeline_confirmed_at,"2026-10-26 13:00:00");
assert.equal(a.timeline_processing_at,"2026-10-26 14:00:00");
assert.equal(a.timeline_shipped_at,null);
assert.equal(a.timeline_completed_at,null);
assert.equal(a.timeline_payment_at,"2026-10-26 14:30:00");
assert.equal(a.received_amount,150000);
assert.equal(a.refunded_amount,5000);
assert.equal(a.pending_payment_request_id,"request-pending-a");
assert.equal(a.pending_payment_amount,120000);
assert.equal(a.pending_payment_type,"balance");
assert.equal(a.pending_payment_reference,"SD-TEST-REQUEST");
assert.equal(b.timeline_completed_at,"2026-10-25 13:00:00");
assert.equal(b.customer_payment_option,null);
assert.equal(b.timeline_payment_at,null);
assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0);
db.close();
console.log("PASS: D1 composite/index plans and Admin order response semantics on disposable SQLite.");
