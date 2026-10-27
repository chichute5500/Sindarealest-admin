import { fail, genericDbError, json, readJsonBodyLimited, requireAdmin } from "../../../_lib.js";
import { officialSkuPrefix, normalizeCatalogCategory } from "../../../_catalog-sku.js";

function resolveCategory(value) { return normalizeCatalogCategory(value); }

function buildCaseUpdate(db, rows, skuById) {
  const pairs = rows.map((row) => [row.id, skuById.get(row.id)]);
  const cases = pairs.map(() => "WHEN ? THEN ?").join(" ");
  const ids = pairs.map(() => "?").join(",");
  const sql = `UPDATE products SET sku = CASE id ${cases} ELSE sku END, sku_verified = 1 WHERE id IN (${ids})`;
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
      "SELECT id, sku, sku_verified, published, title, category, category_label, sort_order FROM products ORDER BY sort_order ASC, title COLLATE NOCASE ASC, id ASC"
    ).all();
    const allRows = query.results || [];
    const rows = allRows.filter((row) => Number(row.published) === 1 && Number(row.sku_verified) !== 1);
    if (!rows.length) {
      return json({ ok: true, count: 0, categories: {}, message: "Không có SKU cần cấp mới; SKU chính thức đã xác nhận được giữ nguyên." });
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
        `Chưa thể cấp SKU vì có ${unsupported.length} sản phẩm thuộc danh mục chưa hỗ trợ: ${sample}${extra}. Hãy sửa danh mục của các sản phẩm này rồi thử lại.`,
        400
      );
    }

    // Only the 15 owner-approved category prefixes may receive an official SKU.
    const categoryRules = Object.create(null);
    for (const row of categorized) {
      if (!Object.hasOwn(categoryRules, row.categoryKey)) {
        const prefix=officialSkuPrefix(row.categoryKey);
        if(!prefix)return fail(`Danh mục ${row.categoryKey} chưa có tiền tố SKU chính thức.`,400);
        const known={prefix,label:String(row.category_label||row.categoryKey)};
        categoryRules[row.categoryKey] = known;
      }
    }
    const counters = Object.fromEntries(Object.keys(categoryRules).map((key) => [key, 0]));
    const finalSkuById = new Map();
    const categoryCounts = Object.fromEntries(Object.keys(categoryRules).map((key) => [key, 0]));
    const targetIds = new Set(rows.map((row) => row.id));
    // Reserve EVERY SKU outside the target set, including hidden drafts,
    // otherwise the reset can collide with an existing unverified record.
    const verifiedSkuValues = new Set(allRows
      .filter((row) => !targetIds.has(row.id))
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
      message: `Đã cấp SKU chính thức cho ${rows.length} sản phẩm chưa xác minh. SKU thương mại đã xác nhận được giữ nguyên.`,
    });
  } catch (error) {
    return genericDbError(error);
  }
}
