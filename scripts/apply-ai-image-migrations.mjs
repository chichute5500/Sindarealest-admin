import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const database = String(process.env.CLOUDFLARE_D1_DATABASE || "").trim();
const target = String(process.env.CLOUDFLARE_D1_TARGET || "").trim().toLowerCase();
const knownProductionDatabase = "sindarealest-db";

if (!existsSync(wrangler)) throw new Error("Chưa cài Wrangler; không thể áp dụng migration D1.");
if (!database) {
  throw new Error("Đã chặn migration: hãy đặt CLOUDFLARE_D1_DATABASE thành tên D1 đích một cách tường minh. Không có lệnh D1 từ xa nào được chạy.");
}
if (!/^[A-Za-z0-9_-]+$/.test(database)) throw new Error("Tên D1 database không hợp lệ.");
if (!["preview", "production"].includes(target)) {
  throw new Error("Đã chặn migration: đặt CLOUDFLARE_D1_TARGET=preview hoặc production một cách tường minh. Không có lệnh D1 từ xa nào được chạy.");
}
if (target === "preview" && database === knownProductionDatabase) {
  throw new Error("Đã chặn migration: sindarealest-db là D1 Production đã biết, không thể dùng làm Preview.");
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
const table = execute([...baseArgs, "--file=migrations/0007_ai_image_reviews.sql"]);
if (table.status !== 0) {
  throw new Error("Không áp dụng được migration 0007 trên D1 " + database + ":\n" + table.output);
}

const column = execute([...baseArgs, "--command=ALTER TABLE image_ai_reviews ADD COLUMN source_url TEXT NOT NULL DEFAULT ''"]);
if (column.status !== 0 && !/duplicate column name:\s*source_url/i.test(column.output)) {
  throw new Error("Không thể đồng bộ cột source_url trên D1 " + database + ":\n" + column.output);
}

const quotaTable = execute([...baseArgs, "--file=migrations/0009_ai_request_limits.sql"]);
if (quotaTable.status !== 0) {
  throw new Error("Không áp dụng được migration 0009 trên D1 " + database + ":\n" + quotaTable.output);
}

for (const column of ["source_image_url", "reference_image_ref"]) {
  const result = execute([...baseArgs, "--command=ALTER TABLE image_ai_reviews ADD COLUMN " + column + " TEXT NOT NULL DEFAULT ''"]);
  if (result.status !== 0 && !new RegExp("duplicate column name:\\s*" + column, "i").test(result.output)) {
    throw new Error("Không thể đồng bộ cột " + column + " trên D1 " + database + ":\n" + result.output);
  }
}

console.log("D1 " + database + " (" + target + "): image_ai_reviews, source/CDN URLs, reference image and AI quota schema checked/applied.");
