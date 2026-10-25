import { fail, fromRow, genericDbError, json, readJsonBodyLimited, requireAdmin, toAdminProduct, validateProduct } from "../../../_lib.js";

export async function onRequestPut(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const id = String(context.params.id || "");
  const parsedBody = await readJsonBodyLimited(context.request, 32 * 1024);
  if (parsedBody.error === "too_large") return fail("Biểu mẫu sản phẩm vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Biểu mẫu sản phẩm không hợp lệ.");
  const body = parsedBody.value;
  try {
    const row = await context.env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(id).first();
    if (!row) return fail("Không tìm thấy sản phẩm.", 404);
    const existing = fromRow(row);
    const checked = validateProduct(body, existing);
    if (checked.error) return fail(checked.error);
    const p = checked.value;
    const result = await context.env.DB.batch([
      context.env.DB.prepare("UPDATE products SET slug=?,sku=?,sku_verified=?,title=?,category=?,category_label=?,description=?,price=?,stock=?,published=?,images_json=?,source_price_confirmed=?,sort_order=?,fulfillment_type=?,updated_at=datetime('now') WHERE id=?")
        .bind(p.slug,p.sku,p.skuVerified?1:0,p.title,p.category,p.categoryLabel,p.description,p.price,p.stock,p.published,JSON.stringify(p.images),p.sourcePriceConfirmed?1:0,p.sortOrder,p.fulfillmentType,id),
      // If the product disappeared after the preflight SELECT, do not write
      // a false success event into the audit trail.
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'product_updated', 'product', ?, ? WHERE changes()=1").bind(crypto.randomUUID(),id,JSON.stringify({ sku:p.sku,title:p.title,published:!!p.published }))
    ]);
    if (Number(result?.[0]?.meta?.changes) !== 1)
      return fail("Sản phẩm vừa bị xóa hoặc thay đổi. Hãy tải lại danh sách trước khi lưu.", 409);
    return json({ ok: true, product: toAdminProduct(p), message: "Đã lưu thay đổi sản phẩm." });
  } catch (error) { return genericDbError(error); }
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const id = String(context.params.id || "");
  try {
    const product = await context.env.DB.prepare("SELECT sku,title FROM products WHERE id=? LIMIT 1").bind(id).first();
    if (!product) return fail("Không tìm thấy sản phẩm.", 404);
    const result = await context.env.DB.batch([
      context.env.DB.prepare("DELETE FROM products WHERE id=?").bind(id),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'product_deleted', 'product', ?, ? WHERE changes()=1").bind(crypto.randomUUID(),id,JSON.stringify({ sku:product.sku,title:product.title }))
    ]);
    if (Number(result?.[0]?.meta?.changes) !== 1)
      return fail("Sản phẩm đã bị xóa bởi thao tác khác. Hãy tải lại danh sách.", 409);
    return json({ ok: true, message: "Đã xóa sản phẩm khỏi danh mục." });
  } catch (error) { return genericDbError(error); }
}
