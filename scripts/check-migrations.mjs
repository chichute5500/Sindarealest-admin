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
  const migrationFiles = readdirSync(sourceMigrations).filter((name) => /^\\d{4}_.+\\.sql$/.test(name)).sort();
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
  ].join("\\n"));

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
  console.log("PASS: clean D1 migrations apply locally, required tables exist, and migration 0007 backfills historic order contacts.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
