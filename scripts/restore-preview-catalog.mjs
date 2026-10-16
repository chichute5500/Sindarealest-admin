import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT = "sindarealest2";
const PRODUCTION_BRANCH = "fix/ai-review-quota-scope-2026-10-15";
const PREVIEW_BRANCH = "fix/watermark-detail-only-2026-10-16";
const PRODUCTION_DB_ID = "f6c208a1-052a-445c-a3b7-a442783f9bd3";
const PREVIEW_DB_ID = "6f444e33-5a65-494c-ad1e-aa1bd92f2d92";
const PREVIEW_URL = "https://f387ad55.sindarealest2.pages.dev";
const EXPECTED_SEED_ROWS = 235;

if (!ACCOUNT_ID || !TOKEN) {
  throw new Error("Thiếu CLOUDFLARE_API_TOKEN hoặc CLOUDFLARE_ACCOUNT_ID. Không có thay đổi nào được thực hiện.");
}
if (process.env.GITHUB_REF_NAME !== PREVIEW_BRANCH) {
  throw new Error("Workflow chỉ được phép chạy từ nhánh Preview đã chỉ định; dừng để bảo vệ Production.");
}
if (process.env.GITHUB_REF_NAME === PRODUCTION_BRANCH) {
  throw new Error("Nhánh chạy trùng Production; đã dừng an toàn.");
}

const apiBase = "https://api.cloudflare.com/client/v4";

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function cloudflare(path, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(apiBase + path, {
        ...options,
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: "Bearer " + TOKEN,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      const body = await response.json().catch(() => ({}));
      if ((response.status === 429 || response.status >= 500) && attempt < 4) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      if (!response.ok || body.success === false) {
        const details = (body.errors || []).map((error) => error.message).join("; ");
        throw new Error("Cloudflare API (" + response.status + "): " + (details || path));
      }
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < 4 && (error?.name === "TimeoutError" || error?.name === "TypeError")) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Cloudflare API failed after retries.");
}

async function d1Query(databaseId, sql, params = []) {
  const response = await cloudflare(
    "/accounts/" + ACCOUNT_ID + "/d1/database/" + databaseId + "/query",
    { method: "POST", body: JSON.stringify({ sql, params }) }
  );
  const result = response.result?.[0];
  if (!result || result.success === false) {
    const details = (response.errors || []).map((error) => error.message).join("; ");
    throw new Error("D1 query failed: " + (details || sql.slice(0, 120)));
  }
  return result.results || [];
}

function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let inSingleQuote = false;
  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    if (char === "'") {
      if (inSingleQuote && sql[index + 1] === "'") {
        index++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (char === ";" && !inSingleQuote) {
      const chunk = sql.slice(start, index + 1);
      const insertAt = chunk.indexOf("INSERT OR IGNORE INTO products");
      if (insertAt >= 0) statements.push(chunk.slice(insertAt).trim());
      start = index + 1;
    }
  }
  if (inSingleQuote) throw new Error("SQL seed không hợp lệ: chuỗi chưa đóng.");
  return statements;
}

function unescapeSqlString(value) {
  return value.replace(/''/g, "'");
}

function getSeedMeta(statement) {
  const match = statement.match(
    /VALUES\s*\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'/i
  );
  if (!match) throw new Error("Không phân tích được id/slug/SKU của một dòng seed.");
  return { id: unescapeSqlString(match[1]), slug: unescapeSqlString(match[2]), sku: unescapeSqlString(match[3]) };
}

async function runConcurrent(items, limit, callback) {
  let cursor = 0;
  let stopped = false;
  const errors = [];
  async function worker() {
    while (!stopped) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        await callback(items[index], index);
      } catch (error) {
        errors.push({ item: items[index], error: String(error?.message || error) });
        stopped = true;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  if (errors.length) {
    throw new Error(
      "Một hoặc nhiều câu lệnh nhập D1 thất bại; dữ liệu hiện có không bị xóa. Chạy lại an toàn nhờ INSERT OR IGNORE. " +
      errors.slice(0, 3).map((entry) => entry.error).join(" | ")
    );
  }
}

const projectResponse = await cloudflare(
  "/accounts/" + ACCOUNT_ID + "/pages/projects/" + PROJECT
);
const project = projectResponse.result;
if (project?.name !== PROJECT) throw new Error("Không xác minh được đúng Pages project.");

const configs = project.deployment_configs || {};
const productionBindings = configs.production || {};
const previewBindings = configs.preview || {};
const productionDbId = productionBindings.d1_databases?.DB?.id;
const previewDbId = previewBindings.d1_databases?.DB?.id;
const productionImages = productionBindings.r2_buckets?.IMAGES?.name;
const previewImages = previewBindings.r2_buckets?.IMAGES?.name;

if (project.production_branch !== PRODUCTION_BRANCH) {
  throw new Error("Production branch đã thay đổi hoặc không khớp giá trị đã xác minh; dừng trước khi ghi dữ liệu.");
}
if (productionDbId !== PRODUCTION_DB_ID) {
  throw new Error("D1 Production không khớp ID đã xác minh; dừng trước khi ghi dữ liệu.");
}
if (previewDbId !== PREVIEW_DB_ID || previewDbId === productionDbId) {
  throw new Error("D1 Preview không khớp ID riêng đã xác minh; dừng trước khi ghi dữ liệu.");
}
if (productionImages !== "sindarealest-images" || previewImages !== "sindarealest-images-preview") {
  throw new Error("R2 bindings không khớp cấu hình đã xác minh; dừng. Workflow này không ghi vào R2.");
}

console.log("Đã xác minh đúng project:", PROJECT);
console.log("Production branch:", project.production_branch);
console.log("Production D1:", productionDbId, "(chỉ đọc)");
console.log("Preview D1:", previewDbId, "(đích ghi duy nhất)");
console.log("R2 bindings đã xác minh; không ghi hoặc thay đổi R2.");

const seedPath = resolve("migrations/0002_seed_products.sql");
const seedSql = readFileSync(seedPath, "utf8");
const statements = splitSqlStatements(seedSql);
if (statements.length !== EXPECTED_SEED_ROWS) {
  throw new Error("Seed SQL cần đúng " + EXPECTED_SEED_ROWS + " INSERT statements; tìm thấy " + statements.length + ". Dừng trước khi ghi.");
}
const seedMeta = statements.map(getSeedMeta);
const seedIds = new Set(seedMeta.map((item) => item.id));
if (seedIds.size !== EXPECTED_SEED_ROWS) throw new Error("Seed SQL có ID trùng; dừng trước khi ghi.");

const imageKeys = [...new Set(
  [...seedSql.matchAll(/images\/[A-Za-z0-9._-]+\.webp/g)].map((match) => match[0])
)];
if (imageKeys.length < 1) throw new Error("Không tìm thấy ảnh trong seed SQL.");
const missingAssets = imageKeys.filter((key) => !existsSync(resolve("public", key)));
if (missingAssets.length) {
  throw new Error(
    "Thiếu " + missingAssets.length + " ảnh tĩnh nguồn; không ghi D1. Ví dụ: " + missingAssets.slice(0, 5).join(", ")
  );
}
console.log("Seed SQL đã xác minh:", statements.length, "sản phẩm.");
console.log("Ảnh nguồn tĩnh đã xác minh:", imageKeys.length, "đường dẫn; không cần ghi vào R2.");

const beforeProduction = await d1Query(
  PRODUCTION_DB_ID,
  "SELECT COUNT(*) AS total_products, COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END),0) AS published_products FROM products"
);
const beforePreview = await d1Query(
  PREVIEW_DB_ID,
  "SELECT id, slug, sku, published FROM products"
);
const prodBefore = beforeProduction[0] || {};
console.log("Production trước khôi phục:", JSON.stringify(prodBefore));
console.log("Preview trước khôi phục:", JSON.stringify({
  total_products: beforePreview.length,
  published_products: beforePreview.filter((row) => Number(row.published) === 1).length,
}));

const seedBySlug = new Map(seedMeta.map((item) => [item.slug, item]));
const seedBySku = new Map(seedMeta.map((item) => [item.sku, item]));
for (const row of beforePreview) {
  const conflictSlug = seedBySlug.get(row.slug);
  const conflictSku = seedBySku.get(row.sku);
  if (conflictSlug && conflictSlug.id !== row.id) {
    throw new Error("Preview có slug trùng với sản phẩm seed nhưng ID khác (" + row.slug + "); dừng để không sửa dữ liệu thử nghiệm.");
  }
  if (conflictSku && conflictSku.id !== row.id) {
    throw new Error("Preview có SKU trùng với sản phẩm seed nhưng ID khác (" + row.sku + "); dừng để không sửa dữ liệu thử nghiệm.");
  }
}

console.log("Bắt đầu nhập " + statements.length + " sản phẩm vào D1 Preview bằng INSERT OR IGNORE...");
let completed = 0;
await runConcurrent(statements, 6, async (statement) => {
  await d1Query(PREVIEW_DB_ID, statement);
  completed++;
  if (completed % 25 === 0 || completed === statements.length) {
    console.log("Đã xử lý " + completed + "/" + statements.length + " dòng seed.");
  }
});

// If a canonical seed product already existed but had been hidden, restore only its published flag.
// Other fields such as price, stock, images, and descriptions are deliberately preserved.
const initiallyHiddenSeedRows = beforePreview.filter(
  (row) => seedIds.has(row.id) && Number(row.published) !== 1
);
for (const row of initiallyHiddenSeedRows) {
  await d1Query(
    PREVIEW_DB_ID,
    "UPDATE products SET published = 1 WHERE id = ?",
    [row.id]
  );
  console.log("Đã bật hiển thị cho bản ghi seed có sẵn:", row.sku || row.id);
}

const afterPreviewRows = await d1Query(
  PREVIEW_DB_ID,
  "SELECT id, slug, sku, published, images_json FROM products"
);
const rowsById = new Map(afterPreviewRows.map((row) => [row.id, row]));
const missingSeedIds = seedMeta.filter((item) => !rowsById.has(item.id)).map((item) => item.id);
const hiddenSeedRows = seedMeta.filter((item) => {
  const row = rowsById.get(item.id);
  return row && Number(row.published) !== 1;
});
if (missingSeedIds.length || hiddenSeedRows.length) {
  throw new Error(
    "Kiểm tra sau nhập chưa đạt: thiếu ID seed=" + missingSeedIds.length +
    ", seed chưa hiển thị=" + hiddenSeedRows.length +
    ". Không có bản ghi nào bị xóa; log này giúp xác định xung đột còn lại."
  );
}

const imageDataRows = afterPreviewRows.filter((row) => {
  try { return Array.isArray(JSON.parse(row.images_json || "[]")) && JSON.parse(row.images_json || "[]").length > 0; }
  catch { return false; }
});
const prodAfter = await d1Query(
  PRODUCTION_DB_ID,
  "SELECT COUNT(*) AS total_products, COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END),0) AS published_products FROM products"
);
const productionAfter = prodAfter[0] || {};
if (
  Number(productionAfter.total_products) !== Number(prodBefore.total_products) ||
  Number(productionAfter.published_products) !== Number(prodBefore.published_products)
) {
  throw new Error("Số lượng sản phẩm Production đã thay đổi trong lúc chạy; hãy kiểm tra log. Script không chủ động ghi vào Production.");
}

console.log("Preview sau khôi phục:", JSON.stringify({
  total_products: afterPreviewRows.length,
  published_products: afterPreviewRows.filter((row) => Number(row.published) === 1).length,
  restored_seed_products: seedMeta.length,
  seed_products_with_image_data: imageDataRows.filter((row) => seedIds.has(row.id)).length,
  extra_existing_preview_rows: afterPreviewRows.filter((row) => !seedIds.has(row.id)).length,
}));
console.log("Production sau khôi phục:", JSON.stringify(productionAfter));
console.log("Xác nhận: câu lệnh ghi chỉ nhắm D1 Preview; không có lệnh ghi vào Production hoặc R2.");

// D1 is queried directly through the authenticated Cloudflare API above.
// A public Preview URL may return an Access/login HTML page to an automated runner.
// Distinguish that case from a real JSON/API mismatch; never undo a successful DB restore.
let liveVerified = false;
let liveCheckBlocked = false;
let lastLiveProblem = "";
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await fetch(PREVIEW_URL + "/api/products", { signal: AbortSignal.timeout(12000) });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      throw new Error("Preview API HTTP " + response.status);
    }
    if (!contentType.toLowerCase().includes("application/json")) {
      console.log(
        "Bỏ qua kiểm tra HTTP trực tiếp: Preview trả Content-Type " + contentType +
        ", không phải JSON; có thể đang hiển thị trang đăng nhập/bảo vệ Preview."
      );
      liveCheckBlocked = true;
      break;
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length < EXPECTED_SEED_ROWS) {
      throw new Error(
        "Preview API returned " + (Array.isArray(data) ? data.length : "a non-array") +
        " products despite the authenticated D1 check."
      );
    }
    const sampleImages = [...new Set(
      data.flatMap((product) => Array.isArray(product.images) ? product.images : [])
        .map((value) => String(value).replace(/^\.\//, ""))
        .filter((value) => /^images\/[A-Za-z0-9._-]+\.webp$/.test(value))
    )].slice(0, 5);
    for (const key of sampleImages) {
      const imageResponse = await fetch(new URL(key, PREVIEW_URL + "/"), { signal: AbortSignal.timeout(12000) });
      const imageType = imageResponse.headers.get("content-type") || "";
      if (!imageResponse.ok || !imageType.toLowerCase().startsWith("image/")) {
        throw new Error(
          "Ảnh Preview không tải được: " + key + " (HTTP " + imageResponse.status + ", " + imageType + ")"
        );
      }
    }
    liveVerified = true;
    console.log(
      "Kiểm tra trực tiếp Preview thành công:", data.length,
      "sản phẩm API; tải được", sampleImages.length, "ảnh mẫu."
    );
    break;
  } catch (error) {
    lastLiveProblem = String(error?.message || error);
    if (attempt < 2) await sleep(1500 * (attempt + 1));
  }
}
if (!liveVerified && !liveCheckBlocked) {
  throw new Error(
    "D1 đã được khôi phục và xác minh, nhưng Preview trả dữ liệu JSON không đúng hoặc ảnh mẫu không tải được: " +
    lastLiveProblem + ". D1 không bị xóa; hãy kiểm tra log này trước khi sửa thêm."
  );
}
if (liveCheckBlocked) {
  console.log(
    "D1 đã được xác minh trực tiếp qua Cloudflare API. Kiểm tra HTTP công khai chưa kết luận được vì Preview trả trang không phải JSON."
  );
}

console.log("HOÀN TẤT: danh mục đã khôi phục ở Preview, ảnh vẫn lấy từ public/images và Production được giữ nguyên.");
