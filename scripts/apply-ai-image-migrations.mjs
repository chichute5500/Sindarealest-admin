import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const database = process.env.CLOUDFLARE_D1_DATABASE || "sindarealest-db";

if (!existsSync(wrangler)) throw new Error("Chưa cài Wrangler; không thể áp dụng migration D1.");
if (!/^[A-Za-z0-9_-]+$/.test(database)) throw new Error("Tên D1 database không hợp lệ.");

function execute(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout || ""}\n${result.stderr || ""}`.trim() };
}

const baseArgs = ["d1", "execute", database, "--remote"];
const table = execute([...baseArgs, "--file=migrations/0007_ai_image_reviews.sql"]);
if (table.status !== 0) {
  throw new Error(`Không áp dụng được migration 0007 trên D1 ${database}:\n${table.output}`);
}

// Migration 0007 may have been applied before source_url was introduced.
// Adding the column is idempotent: an existing column is accepted; every other
// D1 error stops deployment instead of silently hiding a schema problem.
const column = execute([...baseArgs, "--command=ALTER TABLE image_ai_reviews ADD COLUMN source_url TEXT NOT NULL DEFAULT ''"]);
if (column.status !== 0 && !/duplicate column name:\s*source_url/i.test(column.output)) {
  throw new Error(`Không thể đồng bộ cột source_url trên D1 ${database}:\n${column.output}`);
}

const quotaTable = execute([...baseArgs, "--file=migrations/0009_ai_request_limits.sql"]);
if (quotaTable.status !== 0) {
  throw new Error(`Không áp dụng được migration 0009 trên D1 ${database}:\n${quotaTable.output}`);
}

console.log(`D1 ${database}: image_ai_reviews, source_url và bộ giới hạn Gemini đã được kiểm tra/áp dụng.`);
