import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliJson } from "./cloudflare-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const temp = mkdtempSync(join(tmpdir(), "sindarealest-d1-migrations-"));
const databaseName = "sindarealest-audit-local";
const configPath = join(temp, "wrangler.toml");

function run(args, label) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    cwd: temp,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.status !== 0) {
    throw new Error(label + " failed: " + (result.error?.message || result.stderr || result.stdout || result.status));
  }
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

try {
  if (!existsSync(wrangler)) throw new Error("Wrangler is not installed; run npm install first.");
  const sourceMigrations = join(root, "migrations");
  const localMigrations = join(temp, "migrations");
  mkdirSync(localMigrations, { recursive: true });
  const migrationFiles = readdirSync(sourceMigrations).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  const contactMigration = migrationFiles.find((name) => name.startsWith("0007_"));
  if (!contactMigration || migrationFiles.length < 7) throw new Error("Expected the complete ordered migration set through 0007.");
  for (const name of migrationFiles.filter((name) => name < contactMigration)) {
    copyFileSync(join(sourceMigrations, name), join(localMigrations, name));
  }

  writeFileSync(configPath, [
    'name = "sindarealest-migration-audit"',
    'compatibility_date = "2026-10-12"',
    "",
    "[[d1_databases]]",
    'binding = "DB"',
    `database_name = "${databaseName}"`,
    'database_id = "00000000-0000-4000-8000-000000000001"',
    'migrations_dir = "./migrations"',
    "",
  ].join("\n"));

  run(["d1", "migrations", "apply", databaseName, "--local", "--config", configPath],
    "Apply migrations 0001–0006 to temporary local D1");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO customers(id,full_name,phone,email,address) VALUES('audit-customer','Audit User','0900000000','audit@example.test','');"],
    "Insert local migration backfill fixture customer");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO orders(id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,customer_note) VALUES('audit-order','AUDIT-ORDER-1','audit-customer','pending_confirmation','unpaid',NULL,NULL,1,'');"],
    "Insert local migration backfill fixture order");

  copyFileSync(join(sourceMigrations, contactMigration), join(localMigrations, contactMigration));
  run(["d1", "migrations", "apply", databaseName, "--local", "--config", configPath],
    "Apply order-contact snapshot migration 0007");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT 1 FROM order_contact_details LIMIT 0;"],
    "Verify order-contact snapshot schema");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT 1 FROM warranty_claim_attachments LIMIT 0;"],
    "Verify private warranty attachment schema");
  const backfill = run(["d1", "execute", databaseName, "--local", "--config", configPath, "--json",
    "--command", "SELECT COUNT(*) AS snapshot_count FROM order_contact_details WHERE order_id='audit-order' AND full_name='Audit User' AND phone='0900000000' AND email='audit@example.test';"],
    "Verify migration 0007 backfills existing order contact");
  const parsed = parseCliJson(backfill.stdout, "kết quả kiểm tra backfill migration 0007");
  const findCount = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) { const found = findCount(item); if (found !== null) return found; }
    } else if (value && typeof value === "object") {
      if (Object.hasOwn(value, "snapshot_count")) {
        const count = Number(value.snapshot_count);
        return Number.isSafeInteger(count) && count >= 0 ? count : null;
      }
      for (const item of Object.values(value)) { const found = findCount(item); if (found !== null) return found; }
    }
    return null;
  };
  if (findCount(parsed) !== 1) throw new Error("Migration 0007 did not backfill the existing order contact correctly.");
  const laterMigrations = migrationFiles.filter((name) => name > contactMigration);
  for (const name of laterMigrations) copyFileSync(join(sourceMigrations, name), join(localMigrations, name));
  if (laterMigrations.length) {
    run(["d1", "migrations", "apply", databaseName, "--local", "--config", configPath],
      "Apply migrations after 0007 to temporary local D1");
  }
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT sku_verified FROM products LIMIT 0;"],
    "Verify product SKU verification column");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT sku_verified FROM order_items LIMIT 0;"],
    "Verify order-item SKU snapshot column");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT fulfillment_type FROM products LIMIT 0;"],
    "Verify product fulfillment type column");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT fulfillment_type FROM order_items LIMIT 0;"],
    "Verify order-item fulfillment snapshot column");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT payment_terms_confirmed_at, public_access_token_hash FROM orders LIMIT 0;"],
    "Verify order payment confirmation and scoped access fields");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT shipping_benefit FROM order_payment_requests LIMIT 0;"],
    "Verify payment shipping benefit field");
  const fulfillmentCountResult = run(["d1", "execute", databaseName, "--local", "--config", configPath, "--json",
    "--command", "SELECT COUNT(*) AS unclassified_seed_count FROM products WHERE fulfillment_type='unclassified';"],
    "Verify historical product types remain unclassified");
  const fulfillmentCountPayload = parseCliJson(fulfillmentCountResult.stdout, "kết quả kiểm tra loại hàng seed chưa phân loại");
  const findUnclassifiedCount = (value) => {
    if (Array.isArray(value)) { for (const item of value) { const found = findUnclassifiedCount(item); if (found !== null) return found; } }
    else if (value && typeof value === "object") {
      if (Object.hasOwn(value, "unclassified_seed_count")) {
        const count = Number(value.unclassified_seed_count);
        return Number.isSafeInteger(count) && count >= 0 ? count : null;
      }
      for (const item of Object.values(value)) { const found = findUnclassifiedCount(item); if (found !== null) return found; }
    }
    return null;
  };
  if (findUnclassifiedCount(fulfillmentCountPayload) !== 235) throw new Error("Migration 0009 must leave all 235 historical products unclassified until a human reviews them.");
  const skuCountResult = run(["d1", "execute", databaseName, "--local", "--config", configPath, "--json",
    "--command", "SELECT COUNT(*) AS unverified_seed_count FROM products WHERE sku_verified=0;"],
    "Verify existing seed SKUs default to unverified");
  const skuCountPayload = parseCliJson(skuCountResult.stdout, "kết quả kiểm tra SKU seed chưa xác minh");
  const findUnverifiedCount = (value) => {
    if (Array.isArray(value)) { for (const item of value) { const found = findUnverifiedCount(item); if (found !== null) return found; } }
    else if (value && typeof value === "object") {
      if (Object.hasOwn(value, "unverified_seed_count")) {
        const count = Number(value.unverified_seed_count);
        return Number.isSafeInteger(count) && count >= 0 ? count : null;
      }
      for (const item of Object.values(value)) { const found = findUnverifiedCount(item); if (found !== null) return found; }
    }
    return null;
  };
  if (findUnverifiedCount(skuCountPayload) !== 235) throw new Error("Migration 0008 must conservatively mark all 235 generated seed identifiers as unverified.");
  // Exercise the migrated payment-ledger schema with synthetic data in this temporary local D1 only.
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "UPDATE orders SET status='confirmed',subtotal=100000,total=100000,price_confirmation_required=0,payment_terms_confirmed_at='2026-10-24T00:00:00.000Z',payment_terms_confirmed_by='local-d1-test',payment_terms_note='Synthetic local D1 fixture' WHERE id='audit-order';"],
    "Prepare synthetic local D1 payment-test order");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total,fulfillment_type) VALUES('audit-item','audit-order','audit-product','AUDIT-SKU-001','Synthetic D1 test item',1,100000,100000,'made_to_order');"],
    "Insert synthetic local D1 order item");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO order_payment_requests(id,order_id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by) VALUES('audit-payment-request','audit-order','deposit',30000,'standard_shipping','SD-AUDIT-REQUEST-001','qr/audit-test.png','TEST BANK','0000000000','SYNTHETIC TEST','pending','local-d1-test');"],
    "Insert synthetic local D1 payment request");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO order_payment_transactions(id,order_id,payment_request_id,direction,amount,transaction_reference,note,actor) VALUES('audit-payment-transaction','audit-order','audit-payment-request','received',30000,'AUDIT-BANK-RECEIPT-001','Synthetic fixture; not a real bank transfer','local-d1-test');"],
    "Insert synthetic local D1 payment-ledger receipt");
  const ledgerResult = run(["d1", "execute", databaseName, "--local", "--config", configPath, "--json",
    "--command", "SELECT o.total AS order_total, SUM(CASE WHEN t.direction='received' THEN t.amount ELSE -t.amount END) AS net_received, COUNT(DISTINCT r.id) AS request_count, COUNT(DISTINCT t.id) AS transaction_count FROM orders o JOIN order_payment_requests r ON r.order_id=o.id JOIN order_payment_transactions t ON t.order_id=o.id WHERE o.id='audit-order' GROUP BY o.id;"],
    "Verify synthetic local D1 payment ledger totals");
  const ledgerPayload = parseCliJson(ledgerResult.stdout, "kết quả kiểm tra payment ledger D1 cục bộ");
  const findLedger = (value) => {
    if (Array.isArray(value)) { for (const item of value) { const found = findLedger(item); if (found !== null) return found; } }
    else if (value && typeof value === "object" && Object.hasOwn(value, "net_received")) return value;
    else if (value && typeof value === "object") {
      for (const item of Object.values(value)) { const found = findLedger(item); if (found !== null) return found; }
    }
    return null;
  };
  const ledger = findLedger(ledgerPayload);
  if (!ledger || Number(ledger.order_total) !== 100000 || Number(ledger.net_received) !== 30000
      || Number(ledger.request_count) !== 1 || Number(ledger.transaction_count) !== 1) {
    throw new Error("Synthetic local D1 payment-ledger fixture did not produce the expected order/request/receipt totals.");
  }

  // A duplicate bank reference must be rejected by the real local SQLite/D1 unique constraint.
  const duplicateReference = spawnSync(process.execPath, [wrangler, "d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "INSERT INTO order_payment_transactions(id,order_id,direction,amount,transaction_reference,note,actor) VALUES('audit-payment-duplicate','audit-order','received',1000,'AUDIT-BANK-RECEIPT-001','duplicate reference test','local-d1-test');"], {
    cwd: temp, encoding: "utf8", env: process.env
  });
  if (duplicateReference.status === 0 || !/UNIQUE constraint failed/i.test((duplicateReference.stderr || "") + (duplicateReference.stdout || ""))) {
    throw new Error("Local D1 must reject duplicate transaction references; the expected UNIQUE constraint failure was not observed.");
  }
  console.log("PASS: synthetic local D1 order, payment request, verified receipt, aggregate ledger totals, and duplicate transaction-reference constraint.");

  console.log("PASS: temporary local D1 migrations; 0007 backfills historic order contacts; 0008 keeps seed SKUs unverified; 0009 leaves historical fulfillment unclassified and adds payment-ledger fields.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
