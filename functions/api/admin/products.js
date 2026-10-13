import { fail, fromRow, genericDbError, json, productInsertStatement, requireAdmin, toAdminProduct, validateProduct } from "../../_lib.js";

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
  const category = categories[normalized];
  if (!category) return fail("Vui lòng chọn một danh mục hợp lệ trong danh sách.");
  try {
    const rows = await context.env.DB.prepare("SELECT sku FROM products WHERE category=?").bind(category[0]).all();
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
    await context.env.DB.batch([
      productInsertStatement(context.env.DB, p),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'product_created', 'product', ?, ?)").bind(crypto.randomUUID(),p.id,JSON.stringify({ sku:p.sku,title:p.title }))
    ]);
    return json({ ok: true, product: toAdminProduct(p), message: "Đã thêm sản phẩm." }, 201);
  } catch (error) { return genericDbError(error); }
}
