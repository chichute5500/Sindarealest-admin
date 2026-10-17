import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
}

try {
  if (!existsSync(wrangler)) throw new Error("Wrangler is not installed; run npm install first.");
  symlinkSync(join(root, "migrations"), join(temp, "migrations"), "dir");
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
    "Apply migrations to temporary local D1");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT 1 FROM order_contact_details LIMIT 0;"],
    "Verify order-contact snapshot schema");
  run(["d1", "execute", databaseName, "--local", "--config", configPath,
    "--command", "SELECT 1 FROM warranty_claim_attachments LIMIT 0;"],
    "Verify private warranty attachment schema");
  console.log("PASS: all D1 migrations apply from a clean local database and required new tables exist.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
