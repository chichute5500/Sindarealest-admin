import { fail, fromRow, genericDbError, json, productInsertStatement, requireAdmin, toAdminProduct, validateProduct } from "../../_lib.js";

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
  let body;
  try { body = await context.request.json(); } catch { return fail("Biểu mẫu sản phẩm không hợp lệ."); }
  const sourceImportRequested = Object.prototype.hasOwnProperty.call(body || {}, "importSource");
  if (sourceImportRequested && context.env.ZIP_IMPORT_ENABLED !== "1") return fail("Nhập ZIP chưa được bật trong môi trường Preview biệt lập.", 403);
  // Never let a ZIP import publish new inventory, even if a client sends published=true.
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
  const category = categories[normalized] || (normalized ? [normalized, makeCategoryPrefix(normalized)] : null);
  if (!category) return fail("Vui lòng chọn một danh mục hợp lệ trong danh sách.");
  try {
    const rows = await context.env.DB.prepare("SELECT sku FROM products").all();
    let max = 0;
    for (const row of rows.results || []) {
      const sku = String(row.sku || "").toUpperCase();
      if (!sku.startsWith(category[1])) continue;
      const suffix = sku.slice(category[1].length);
      if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix) || 0);
    }
    body.sku = category[1] + String(max + 1).padStart(3, "0");
    body.category = category[0];
    body.categoryLabel = rawCategory;
  } catch { return fail("Không thể tạo SKU từ danh mục. Vui lòng thử lại.", 503); }
  const checked = validateProduct(body);
  if (checked.error) return fail(checked.error);
  try {
    const p = checked.value;
    const statements = [productInsertStatement(context.env.DB, p)];
    const source = body?.importSource;
    if (source !== undefined) {
      if (!source || typeof source !== "object" || Array.isArray(source) || !String(source.exportId || "").trim()) {
        return fail("Thông tin nguồn ZIP không hợp lệ.");
      }
      let sourceJson;
      try { sourceJson = JSON.stringify(source.sourceRecord ?? {}); }
      catch { return fail("Không thể lưu dữ liệu nguồn ZIP."); }
      if (sourceJson.length > 100000) return fail("Dữ liệu nguồn của sản phẩm vượt giới hạn 100 KB.");
      statements.push(context.env.DB.prepare(
        "INSERT INTO product_source_imports (product_id,export_id,export_folder,source_product_id,source_title,source_category,source_description,source_price,source_currency,source_url,source_record_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        p.id,
        String(source.exportId).slice(0, 180),
        String(source.exportFolder || "").slice(0, 500),
        String(source.productId || "").slice(0, 180),
        String(source.title || "").slice(0, 500),
        String(source.category || "").slice(0, 180),
        String(source.description || "").slice(0, 10000),
        String(source.price ?? "").slice(0, 120),
        String(source.currency || "").slice(0, 40),
        String(source.url || "").slice(0, 2000),
        sourceJson
      ));
    }
    statements.push(context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', ?, 'product', ?, ?)").bind(
      crypto.randomUUID(),
      source ? "product_created_from_zip" : "product_created",
      p.id,
      JSON.stringify({ sku: p.sku, title: p.title, exportId: source?.exportId || null })
    ));
    await context.env.DB.batch(statements);
    return json({ ok: true, product: toAdminProduct(p), message: "Đã thêm sản phẩm." }, 201);
  } catch (error) { return genericDbError(error); }
}
