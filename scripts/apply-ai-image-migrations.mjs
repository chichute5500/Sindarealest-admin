import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseCliJson } from "./cloudflare-utils.mjs";

const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const database = String(process.env.CLOUDFLARE_D1_DATABASE || "").trim();
const target = String(process.env.CLOUDFLARE_D1_TARGET || "").trim().toLowerCase();
const knownProductionDatabase = "sindarealest-db";
const knownPreviewDatabase = "sindarealest-ai-preview-db";

if (!existsSync(wrangler)) throw new Error("Chưa cài Wrangler; không thể áp dụng migration D1.");
if (!database) {
  throw new Error("Đã chặn migration: hãy đặt CLOUDFLARE_D1_DATABASE thành tên D1 đích một cách tường minh. Không có lệnh D1 từ xa nào được chạy.");
}
if (!/^[A-Za-z0-9_-]+$/.test(database)) throw new Error("Tên D1 database không hợp lệ.");
if (!["preview", "production"].includes(target)) {
  throw new Error("Đã chặn migration: đặt CLOUDFLARE_D1_TARGET=preview hoặc production một cách tường minh. Không có lệnh D1 từ xa nào được chạy.");
}
if (target === "preview" && database !== knownPreviewDatabase) {
  throw new Error("Đã chặn migration: môi trường Preview của dự án này chỉ được trỏ tới D1 đã xác minh sindarealest-ai-preview-db. Không có lệnh D1 từ xa nào được chạy.");
}
if (target === "production" &&
    (process.env.ALLOW_PRODUCTION_D1_MIGRATIONS !== "true" ||
     process.env.CONFIRM_PRODUCTION_D1_DATABASE !== database)) {
  throw new Error("Đã chặn migration Production. Chỉ tiếp tục khi ALLOW_PRODUCTION_D1_MIGRATIONS=true và CONFIRM_PRODUCTION_D1_DATABASE khớp chính xác tên D1 đích.");
}

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

function requireSuccess(result, description) {
  if (result.status !== 0) {
    throw new Error(description + " trên D1 " + database + " thất bại:\n" + result.output);
  }
}

function findColumnRows(value) {
  if (Array.isArray(value)) {
    if (value.some(row => row && Number.isInteger(row.cid) && typeof row.name === "string")) {
      return value.filter(row => row && Number.isInteger(row.cid) && typeof row.name === "string");
    }
    for (const item of value) {
      const found = findColumnRows(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = findColumnRows(item);
      if (found) return found;
    }
  }
  return null;
}

function readReviewColumns() {
  const result = execute([...baseArgs, "--json", "--command", "PRAGMA table_info(image_ai_reviews);"]);
  requireSuccess(result, "Không đọc được schema image_ai_reviews");
  const parsed = parseCliJson(result.output, "schema image_ai_reviews từ D1");
  const rows = findColumnRows(parsed);
  if (!rows) {
    throw new Error("Không xác minh được bảng image_ai_reviews qua PRAGMA table_info. Đã dừng; không coi schema là hợp lệ.");
  }
  return new Set(rows.map(row => String(row.name)));
}

function ensureColumn(column) {
  // Inspect first, because SQLite/D1 does not provide portable
  // ALTER TABLE ... ADD COLUMN IF NOT EXISTS support.
  let columns = readReviewColumns();
  if (!columns.has(column)) {
    const result = execute([...baseArgs, "--command", `ALTER TABLE image_ai_reviews ADD COLUMN ${column} TEXT NOT NULL DEFAULT '';`]);
    if (result.status !== 0 && !new RegExp("duplicate column name:\\s*" + column, "i").test(result.output)) {
      throw new Error("Không thể thêm cột " + column + " trên D1 " + database + ":\n" + result.output);
    }
    // A successful CLI exit is not proof that the remote schema changed.
    columns = readReviewColumns();
    if (!columns.has(column)) {
      throw new Error("D1 " + database + " vẫn thiếu cột " + column + " sau lệnh ALTER TABLE. Đã dừng và không báo migration thành công.");
    }
    console.log("Verified image_ai_reviews." + column);
  } else {
    console.log("Already present: image_ai_reviews." + column);
  }
}

const table = execute([...baseArgs, "--file=migrations/0007_ai_image_reviews.sql"]);
requireSuccess(table, "Không áp dụng được migration 0007");

ensureColumn("source_url");

const quotaTable = execute([...baseArgs, "--file=migrations/0009_ai_request_limits.sql"]);
requireSuccess(quotaTable, "Không áp dụng được migration 0009");

// These fields are required by the Taobao/1688 image-review queue.
// Add each one only if absent, then verify it by querying the live remote schema.
ensureColumn("source_image_url");
ensureColumn("reference_image_ref");

const finalColumns = readReviewColumns();
const requiredColumns = ["source_url", "source_image_url", "reference_image_ref"];
const missingColumns = requiredColumns.filter(column => !finalColumns.has(column));
if (missingColumns.length) {
  throw new Error("Xác minh cuối thất bại trên D1 " + database + ": thiếu " + missingColumns.join(", ") + ". Không gọi AI/ElimAPI.");
}

console.log("VERIFIED: D1 " + database + " (" + target + ") contains source_url, source_image_url, reference_image_ref in image_ai_reviews. AI image review schema migration completed.");
