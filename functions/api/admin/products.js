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
