import { fail, fromRow, genericDbError, json, productInsertStatement, readJsonBodyLimited, requireAdmin, toAdminProduct, validateProduct } from "../../_lib.js";

function makeCategoryPrefix(slug) {
  const compact = String(slug || "").replace(/-/g, "").toUpperCase();
  let hash = 0;
  for (const char of String(slug || "")) hash = (hash * 31 + char.charCodeAt(0)) % 1296;
  return "SD-" + (compact.slice(0, 5) || "MISC") + hash.toString(36).toUpperCase().padStart(2, "0");
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare("SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000").all();
    return json({ products: (result.results || []).map((row) => fromRow(row)) });
  } catch (error) { return genericDbError(error); }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 32 * 1024);
  if (parsedBody.error === "too_large") return fail("Biểu mẫu sản phẩm vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Biểu mẫu sản phẩm không hợp lệ.");
  const body = parsedBody.value;
  const sourceImportRequested = Object.prototype.hasOwnProperty.call(body, "importSource");
  if (sourceImportRequested && context.env.ZIP_IMPORT_ENABLED !== "1") {
    return fail("Nhập ZIP chưa được bật trong môi trường cách ly.", 403);
  }
  // ZIP imports may only create hidden products, even if a client changes the request.
  if (sourceImportRequested) body.published = false;
  const rawCategory = String(body?.category || body?.categoryLabel || "").trim();
  const normalized = rawCategory.toLocaleLowerCase("vi").replace(/đ/g,"d").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const categories = {
    sneaker: ["sneakers","SD-SN"], sneakers: ["sneakers","SD-SN"],
    "giay-luoi": ["loafers","SD-GL"], loafers: ["loafers","SD-GL"],
    "giay-tay": ["dress-shoes","SD-GT"], "dress-shoes": ["dress-shoes","SD-GT"],
    "that-lung": ["belts","SD-TL"], belts: ["belts","SD-TL"],
    "vi-da": ["wallets","SD-VD"], wallets: ["wallets","SD-VD"],
    dep: ["sandals","SD-DD"], sandals: ["sandals","SD-DD"],
    "day-dong-ho": ["watch-straps","SD-DH"], "watch-straps": ["watch-straps","SD-DH"],
    "op-dien-thoai": ["phone-cases","SD-ODT"], "phone-cases": ["phone-cases","SD-ODT"]
  };
  const category = Object.hasOwn(categories, normalized) ? categories[normalized] : (normalized ? [normalized, makeCategoryPrefix(normalized)] : null);
  if (!category) return fail("Vui lòng chọn một danh mục hợp lệ trong danh sách.");
  try {
    const rows = await context.env.DB.prepare("SELECT sku FROM products WHERE sku LIKE ?").bind(category[1] + "%").all();
    let max = 0;
    for (const row of rows.results || []) {
      const sku = String(row.sku || "").toUpperCase();
      if (!sku.startsWith(category[1])) continue;
      const suffix = sku.slice(category[1].length);
      if (/^\d+$/.test(suffix)) { const number = Number(suffix); if (Number.isSafeInteger(number)) max = Math.max(max, number); }
    }
    body.sku = category[1] + String(max + 1).padStart(3, "0");
    body.category = category[0];
    body.categoryLabel = rawCategory;
  } catch { return fail("Không thể tạo SKU từ danh mục. Vui lòng thử lại.", 503); }
  const checked = validateProduct(body);
  if (checked.error) return fail(checked.error);

  let importSource = null;
  if (sourceImportRequested) {
    const source = body.importSource;
    if (!source || typeof source !== "object" || Array.isArray(source) || !String(source.exportId || "").trim()) {
      return fail("Thông tin nguồn ZIP không hợp lệ.");
    }
    let sourceJson;
    try { sourceJson = JSON.stringify(source.sourceRecord ?? {}); }
    catch { return fail("Không thể lưu dữ liệu nguồn ZIP."); }
    if (typeof sourceJson !== "string" || sourceJson.length > 100000) {
      return fail("Dữ liệu nguồn của sản phẩm vượt giới hạn 100 KB.");
    }
    importSource = {
      exportId: String(source.exportId).trim().slice(0, 180),
      exportFolder: String(source.exportFolder || "").slice(0, 500),
      productId: String(source.productId || "").slice(0, 180),
      title: String(source.title || "").slice(0, 500),
      category: String(source.category || "").slice(0, 180),
      description: String(source.description || "").slice(0, 10000),
      price: String(source.price ?? "").slice(0, 120),
      currency: String(source.currency || "").slice(0, 40),
      url: String(source.url || "").slice(0, 2000),
      sourceJson,
    };
  }

  let p = checked.value;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const statements = [productInsertStatement(context.env.DB, p)];
      if (importSource) {
        statements.push(context.env.DB.prepare(
          "INSERT INTO product_source_imports (product_id,export_id,export_folder,source_product_id,source_title,source_category,source_description,source_price,source_currency,source_url,source_record_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          p.id,
          importSource.exportId,
          importSource.exportFolder,
          importSource.productId,
          importSource.title,
          importSource.category,
          importSource.description,
          importSource.price,
          importSource.currency,
          importSource.url,
          importSource.sourceJson
        ));
      }
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', ?, 'product', ?, ?)"
      ).bind(
        crypto.randomUUID(),
        importSource ? "product_created_from_zip" : "product_created",
        p.id,
        JSON.stringify({ sku: p.sku, title: p.title, exportId: importSource?.exportId || null })
      ));
      await context.env.DB.batch(statements);
      return json({ ok: true, product: toAdminProduct(p), message: "Đã thêm sản phẩm." }, 201);
    } catch (error) {
      // Multiple admin saves can race after reading the same highest SKU. Retry
      // only for a SKU uniqueness conflict; never mask unrelated DB failures.
      if (!/UNIQUE constraint failed:\s*products\.sku/i.test(String(error?.message || ""))) {
        return genericDbError(error);
      }
      if (attempt === 4) {
        return fail("Không thể cấp SKU duy nhất sau nhiều lần thử đồng thời. Hãy tải lại danh sách rồi thử lại.", 409);
      }
      try {
        const rows = await context.env.DB.prepare("SELECT sku FROM products WHERE sku LIKE ?").bind(category[1] + "%").all();
        let max = 0;
        for (const row of rows.results || []) {
          const sku = String(row.sku || "").toUpperCase();
          if (!sku.startsWith(category[1])) continue;
          const suffix = sku.slice(category[1].length);
          if (/^\d+$/.test(suffix)) {
            const number = Number(suffix);
            if (Number.isSafeInteger(number)) max = Math.max(max, number);
          }
        }
        p = { ...p, sku: category[1] + String(max + 1).padStart(3, "0") };
      } catch {
        return fail("Không thể đọc lại SKU sau xung đột. Vui lòng thử lại.", 503);
      }
    }
  }
  return fail("Không thể tạo sản phẩm. Vui lòng thử lại.", 503);
}
