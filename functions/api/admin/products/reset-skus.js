import { fail, genericDbError, json, readJsonBodyLimited, requireAdmin, slugify } from "../../../_lib.js";

const CATEGORY_RULES = {
  sneakers: { prefix: "SD-SN", label: "Sneaker" },
  loafers: { prefix: "SD-GL", label: "Giày lười" },
  "dress-shoes": { prefix: "SD-GT", label: "Giày tây" },
  belts: { prefix: "SD-TL", label: "Thắt lưng" },
  wallets: { prefix: "SD-VD", label: "Ví da" },
  sandals: { prefix: "SD-DD", label: "Dép" },
  "watch-straps": { prefix: "SD-DH", label: "Dây đồng hồ" },
  "phone-cases": { prefix: "SD-ODT", label: "Ốp điện thoại" },
};

const CATEGORY_ALIASES = {
  sneaker: "sneakers",
  sneakers: "sneakers",
  "giay-luoi": "loafers",
  loafers: "loafers",
  "giay-tay": "dress-shoes",
  "dress-shoes": "dress-shoes",
  "that-lung": "belts",
  belts: "belts",
  "vi-da": "wallets",
  wallets: "wallets",
  dep: "sandals",
  sandals: "sandals",
  "day-dong-ho": "watch-straps",
  "watch-straps": "watch-straps",
  "op-dien-thoai": "phone-cases",
  "phone-cases": "phone-cases",
};

function resolveCategory(value) {
  const key = slugify(String(value ?? "").trim());
  return (Object.hasOwn(CATEGORY_ALIASES, key) ? CATEGORY_ALIASES[key] : key) || null;
}

function buildCaseUpdate(db, rows, skuById) {
  const pairs = rows.map((row) => [row.id, skuById.get(row.id)]);
  const cases = pairs.map(() => "WHEN ? THEN ?").join(" ");
  const ids = pairs.map(() => "?").join(",");
  const sql = `UPDATE products SET sku = CASE id ${cases} ELSE sku END, sku_verified = 0 WHERE id IN (${ids})`;
  const params = [...pairs.flat(), ...pairs.map(([id]) => id)];
  if (params.length > 100) throw new Error("Quá nhiều sản phẩm trong một lô cập nhật SKU.");
  return db.prepare(sql).bind(...params);
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Yêu cầu đặt lại SKU vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu đặt lại SKU không hợp lệ.");
  const body = parsedBody.value;
  if (body?.confirm !== true) return fail("Thiếu xác nhận đặt lại SKU.", 400);

  const db = context.env.DB;
  try {
    const query = await db.prepare(
      "SELECT id, sku, sku_verified, title, category, category_label, sort_order FROM products ORDER BY sort_order ASC, title COLLATE NOCASE ASC, id ASC"
    ).all();
    const allRows = query.results || [];
    const rows = allRows.filter((row) => Number(row.sku_verified) !== 1);
    if (!rows.length) {
      return json({ ok: true, count: 0, categories: {}, message: "Không có mã nội bộ cần tạo lại; SKU thương mại đã xác nhận được giữ nguyên." });
    }

    // Validate every category before creating any mutation statement.
    const unsupported = [];
    const categorized = rows.map((row) => {
      const categoryKey = resolveCategory(row.category) || resolveCategory(row.category_label);
      if (!categoryKey) {
        unsupported.push({
          title: String(row.title || "Sản phẩm không tên"),
          category: String(row.category_label || row.category || "(trống)"),
        });
        return null;
      }
      return { ...row, categoryKey };
    });
    if (unsupported.length) {
      const sample = unsupported.slice(0, 8)
        .map((p) => `“${p.title}” (danh mục: ${p.category})`).join("; ");
      const extra = unsupported.length > 8 ? `; và ${unsupported.length - 8} sản phẩm khác` : "";
      return fail(
        `Chưa thể đặt lại SKU vì có ${unsupported.length} sản phẩm thuộc danh mục chưa hỗ trợ: ${sample}${extra}. Hãy sửa danh mục của các sản phẩm này rồi thử lại.`,
        400
      );
    }

    // Build rules dynamically so future categories can also receive SKUs.
    const categoryRules = Object.create(null);
    for (const row of categorized) {
      if (!Object.hasOwn(categoryRules, row.categoryKey)) {
        const known = Object.hasOwn(CATEGORY_RULES, row.categoryKey) ? CATEGORY_RULES[row.categoryKey] : null;
        let hash = 0;
        for (const char of row.categoryKey) hash = (hash * 31 + char.charCodeAt(0)) % 1296;
        const compact = row.categoryKey.replace(/-/g, "").toUpperCase();
        categoryRules[row.categoryKey] = known || {
          prefix: "SD-" + (compact.slice(0, 5) || "MISC") + hash.toString(36).toUpperCase().padStart(2, "0"),
          label: String(row.category_label || row.category || row.categoryKey),
        };
      }
    }
    const counters = Object.fromEntries(Object.keys(categoryRules).map((key) => [key, 0]));
    const finalSkuById = new Map();
    const categoryCounts = Object.fromEntries(Object.keys(categoryRules).map((key) => [key, 0]));
    const verifiedSkuValues = new Set(allRows
      .filter((row) => Number(row.sku_verified) === 1)
      .map((row) => String(row.sku || "").trim().toUpperCase())
      .filter(Boolean));
    const assignedInternalSkuValues = new Set();
    for (const row of categorized) {
      const rule = categoryRules[row.categoryKey];
      let serial = counters[row.categoryKey];
      let nextSku = "";
      do {
        serial += 1;
        nextSku = rule.prefix + String(serial).padStart(3, "0");
      } while (verifiedSkuValues.has(nextSku.toUpperCase()) || assignedInternalSkuValues.has(nextSku.toUpperCase()));
      counters[row.categoryKey] = serial;
      categoryCounts[row.categoryKey] += 1;
      assignedInternalSkuValues.add(nextSku.toUpperCase());
      finalSkuById.set(row.id, nextSku);
    }

    // Only internal identifiers are temporarily moved; confirmed commercial SKUs are reserved.
    const occupied = new Set(allRows.map((row) => String(row.sku || "").toUpperCase()));
    const temporarySkuById = new Map();
    for (const row of rows) {
      let temporarySku;
      do {
        temporarySku = `TMP-${crypto.randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase()}`;
      } while (occupied.has(temporarySku));
      occupied.add(temporarySku);
      temporarySkuById.set(row.id, temporarySku);
    }

    const chunkSize = 30; // 90 bound parameters per statement; D1 allows 100.
    const chunks = [];
    for (let i = 0; i < rows.length; i += chunkSize) chunks.push(rows.slice(i, i + chunkSize));

    // All temporary updates, then all final updates, and the audit record are one atomic D1 batch.
    const statements = [
      ...chunks.map((chunk) => buildCaseUpdate(db, chunk, temporarySkuById)),
      ...chunks.map((chunk) => buildCaseUpdate(db, chunk, finalSkuById)),
      db.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'products_sku_reset', 'product', 'all', ?)"
      ).bind(crypto.randomUUID(), JSON.stringify({
        count: rows.length,
        categories: Object.fromEntries(
          Object.entries(categoryCounts).map(([key, count]) => [categoryRules[key].label, count])
        ),
        order: "sort_order,title,id",
      })),
    ];
    await db.batch(statements);

    return json({
      ok: true,
      count: rows.length,
      categories: Object.fromEntries(
        Object.entries(categoryCounts).map(([key, count]) => [categoryRules[key].label, count])
      ),
      message: `Đã tạo lại mã nội bộ cho ${rows.length} sản phẩm chưa xác minh. SKU thương mại đã xác nhận được giữ nguyên.`,
    });
  } catch (error) {
    return genericDbError(error);
  }
}
