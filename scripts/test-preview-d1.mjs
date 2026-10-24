import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliJson } from "./cloudflare-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const databaseName = "sindarealest-admin-preview-db";
const databaseId = "573ad702-05fc-405e-8ef3-0cf2e7fea98d";
const expectedBranch = "refs/heads/feature/admin-isolated-handoff-2026-10-20";

if (process.env.GITHUB_REF !== expectedBranch || process.env.ADMIN_D1_TEST_MODE !== "preview") {
  throw new Error("Refusing remote D1 test: it is allowed only in the explicit isolated Preview workflow on the protected feature ref.");
}
if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
  throw new Error("Remote Preview D1 test requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets.");
}
if (!/^\d+$/.test(process.env.GITHUB_RUN_ID || "") || !/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT || "1")) {
  throw new Error("Remote Preview D1 test requires a numeric GitHub Actions run ID/attempt.");
}
if (!existsSync(wrangler)) throw new Error("Wrangler is not installed; run npm install first.");

const runKey = (process.env.GITHUB_RUN_ID + "-" + (process.env.GITHUB_RUN_ATTEMPT || "1")).slice(0, 40);
const customerId = "d1qa-customer-" + runKey;
const orderId = "d1qa-order-" + runKey;
const itemId = "d1qa-item-" + runKey;
const requestId = "d1qa-request-" + runKey;
const transactionId = "d1qa-transaction-" + runKey;
const orderNumber = "D1QA-" + runKey;
const requestReference = "D1QA-REQ-" + runKey;
const transactionReference = "D1QA-BANK-" + runKey;
const configDir = mkdtempSync(join(tmpdir(), "sindarealest-preview-d1-"));
const configPath = join(configDir, "wrangler.toml");
writeFileSync(configPath, [
  'name = "sindarealest-admin-preview-d1-qa"',
  'compatibility_date = "2026-10-12"',
  "",
  "[[d1_databases]]",
  'binding = "DB"',
  'database_name = "' + databaseName + '"',
  'database_id = "' + databaseId + '"',
  ""
].join("\n"));

function execute(sql, { json = false, expectFailure = false } = {}) {
  const args = [wrangler, "d1", "execute", databaseName, "--remote", "--config", configPath];
  if (json) args.push("--json");
  args.push("--command", sql);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: 45_000,
    maxBuffer: 2 * 1024 * 1024
  });
  const output = (result.stdout || "") + "\n" + (result.stderr || "");
  if (expectFailure) {
    assert.notEqual(result.status, 0, "Expected the isolated Preview D1 constraint to reject invalid test SQL.");
    return output;
  }
  if (result.error || result.status !== 0) {
    throw new Error("Remote Preview D1 query failed: " + (result.error?.message || output.slice(-2500) || result.status));
  }
  return json ? parseCliJson(result.stdout, "kết quả kiểm thử D1 Preview") : result.stdout;
}

function firstRow(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstRow(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    if (Object.hasOwn(value, "order_total") || Object.hasOwn(value, "table_count")) return value;
    for (const item of Object.values(value)) {
      const found = firstRow(item);
      if (found) return found;
    }
  }
  return null;
}

let seeded = false;
try {
  // Read-only preflight: verify the selected Preview DB has the expected tables before inserting anything.
  const tables = execute(
    "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type='table' AND name IN ('customers','orders','order_items','order_payment_requests','order_payment_transactions')",
    { json: true }
  );
  const tableRow = firstRow(tables);
  assert.equal(Number(tableRow?.table_count), 5,
    "The dedicated Preview D1 must already have the customers/orders/items/payment-ledger schema; this test never applies migrations.");

  execute("INSERT INTO customers(id,full_name,phone,email,address) VALUES('" + customerId + "','Synthetic D1 QA Customer','D1QA-" + runKey + "','d1qa-" + runKey + "@example.test','Preview-only synthetic address')");
  seeded = true;
  execute("INSERT INTO orders(id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,customer_note,payment_terms_confirmed_at,payment_terms_confirmed_by,payment_terms_note) VALUES('" +
    orderId + "','" + orderNumber + "','" + customerId + "','confirmed','unpaid',100000,100000,0,'Synthetic Preview D1 test row','2026-10-24T00:00:00.000Z','d1qa-test','Synthetic fixture; not a real order')");
  execute("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total,fulfillment_type) VALUES('" +
    itemId + "','" + orderId + "','d1qa-product-" + runKey + "','D1QA-SKU-" + runKey + "','Synthetic D1 QA item',1,100000,100000,'made_to_order')");
  execute("INSERT INTO order_payment_requests(id,order_id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by) VALUES('" +
    requestId + "','" + orderId + "','deposit',30000,'standard_shipping','" + requestReference + "','d1qa/" + runKey + ".png','SYNTHETIC BANK','0000000000','SYNTHETIC QA','pending','d1qa-test')");
  execute("INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) VALUES('" +
    transactionId + "','" + orderId + "','" + requestId + "','received',30000,'" + transactionReference + "','Synthetic fixture only; no real transfer','d1qa-test')");

  const result = execute(
    "SELECT o.total AS order_total, SUM(CASE WHEN t.direction='received' THEN t.amount ELSE -t.amount END) AS net_received, COUNT(DISTINCT r.id) AS request_count, COUNT(DISTINCT t.id) AS transaction_count FROM orders o JOIN order_payment_requests r ON r.order_id=o.id JOIN order_payment_transactions t ON t.order_id=o.id WHERE o.id='" + orderId + "' GROUP BY o.id",
    { json: true }
  );
  const row = firstRow(result);
  assert.equal(Number(row?.order_total), 100000);
  assert.equal(Number(row?.net_received), 30000);
  assert.equal(Number(row?.request_count), 1);
  assert.equal(Number(row?.transaction_count), 1);

  const duplicate = execute(
    "INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,note,actor) VALUES('d1qa-duplicate-" + runKey + "','" + orderId + "','received',1000,'" + transactionReference + "','duplicate reference regression','d1qa-test')",
    { expectFailure: true }
  );
  assert.match(duplicate, /UNIQUE constraint failed/i,
    "The real Preview D1 must reject duplicate transaction references.");

  console.log("PASS: dedicated Preview D1 schema, synthetic customer/order/item/payment request/receipt, aggregate totals, and duplicate-reference constraint verified. Test rows will be deleted in cleanup.");
} finally {
  if (seeded) {
    // Restrict cleanup to this run's exact synthetic primary keys; never delete by broad prefix or business status.
    const cleanup = [
      "DELETE FROM order_payment_transactions WHERE id='" + transactionId + "'",
      "DELETE FROM order_payment_requests WHERE id='" + requestId + "'",
      "DELETE FROM order_items WHERE id='" + itemId + "'",
      "DELETE FROM orders WHERE id='" + orderId + "' AND customer_id='" + customerId + "'",
      "DELETE FROM customers WHERE id='" + customerId + "' AND phone='D1QA-" + runKey + "'"
    ];
    for (const sql of cleanup) {
      const result = spawnSync(process.execPath, [wrangler, "d1", "execute", databaseName, "--remote", "--config", configPath, "--command", sql], {
        cwd: root, encoding: "utf8", env: process.env, timeout: 45_000, maxBuffer: 1024 * 1024
      });
      if (result.error || result.status !== 0) {
        console.error("WARNING: synthetic Preview D1 cleanup failed for a run-scoped test row: " +
          (result.error?.message || (result.stderr || result.stdout || "").slice(-1000)));
        process.exitCode = 1;
      }
    }
  }
  rmSync(configDir, { recursive: true, force: true });
}
