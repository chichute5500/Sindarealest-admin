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
  if (body.skuVerified === true) {
    body.sku = String(body.sku ?? "").trim().toUpperCase();
    body.skuVerified = true;
    if (!body.sku) return fail("Nhập SKU thương mại đã xác nhận, hoặc bỏ chọn trạng thái SKU chính thức để cấp mã nội bộ.", 400);
  } else {
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
      body.skuVerified = false;
    } catch { return fail("Không thể tạo mã sản phẩm nội bộ từ danh mục. Vui lòng thử lại.", 503); }
  }
  const checked = validateProduct(body);
  if (checked.error) return fail(checked.error);
  let p = checked.value;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await context.env.DB.batch([
        productInsertStatement(context.env.DB, p),
        context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'product_created', 'product', ?, ?)").bind(crypto.randomUUID(),p.id,JSON.stringify({ sku:p.sku,title:p.title }))
      ]);
      return json({ ok: true, product: toAdminProduct(p), message: "Đã thêm sản phẩm." }, 201);
    } catch (error) {
      // Multiple admin saves can race after reading the same highest SKU. Retry
      // only for a SKU uniqueness conflict; never mask unrelated DB failures.
      if (!/UNIQUE constraint failed:\s*products\.sku/i.test(String(error?.message || ""))) {
        return genericDbError(error);
      }
      if (p.skuVerified) return fail("SKU thương mại này đã tồn tại. Hãy kiểm tra mã đã nhập; hệ thống không tự đổi SKU thương mại.", 409);
      if (attempt === 4) {
        return fail("Không thể cấp mã nội bộ duy nhất sau nhiều lần thử đồng thời. Hãy tải lại danh sách rồi thử lại.", 409);
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
