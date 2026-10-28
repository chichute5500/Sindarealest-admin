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
    // Full-editor PUT must declare the snapshot opened by the owner. Quick
    // single-field PATCH already uses a separate field-level CAS contract.
    const expected = body.expectedProduct;
    const fields = ["id","slug","sku","skuVerified","title","category","categoryLabel",
      "description","price","stock","published","images","sourcePriceConfirmed",
      "sortOrder","fulfillmentType"];
    const current = toAdminProduct(existing);
    if (!expected || typeof expected !== "object" || Array.isArray(expected) ||
        fields.some(key => !Object.hasOwn(expected,key)))
      return fail("Thiếu phiên bản sản phẩm ban đầu. Hãy tải lại và mở sản phẩm trước khi lưu.", 409);
    if (fields.some(key => JSON.stringify(expected[key]) !== JSON.stringify(current[key])))
      return fail("Sản phẩm đã thay đổi trên thiết bị khác. Hãy tải lại trước khi lưu.", 409);
    const checked = validateProduct(body, existing);
    if (checked.error) return fail(checked.error);
    const p = checked.value;
    const result = await context.env.DB.batch([
      context.env.DB.prepare("UPDATE products SET slug=?,sku=?,sku_verified=?,title=?,category=?,category_label=?,description=?,price=?,stock=?,published=?,images_json=?,source_price_confirmed=?,sort_order=?,fulfillment_type=?,updated_at=datetime('now') " +
        "WHERE id=? AND slug IS ? AND sku IS ? AND sku_verified IS ? AND title IS ? AND category IS ? " +
        "AND category_label IS ? AND description IS ? AND price IS ? AND stock IS ? AND published IS ? " +
        "AND images_json IS ? AND source_price_confirmed IS ? AND sort_order IS ? AND fulfillment_type IS ? AND updated_at IS ?")
        .bind(p.slug,p.sku,p.skuVerified?1:0,p.title,p.category,p.categoryLabel,p.description,p.price,p.stock,p.published,JSON.stringify(p.images),p.sourcePriceConfirmed?1:0,p.sortOrder,p.fulfillmentType,id,
          row.slug,row.sku,row.sku_verified,row.title,row.category,row.category_label,row.description,row.price,row.stock,
          row.published,row.images_json,row.source_price_confirmed,row.sort_order,row.fulfillment_type,row.updated_at),
      // If the product disappeared after the preflight SELECT, do not write
      // a false success event into the audit trail.
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'product_updated', 'product', ?, ? WHERE changes()=1").bind(crypto.randomUUID(),id,JSON.stringify({ sku:p.sku,title:p.title,published:!!p.published }))
    ]);
    if (Number(result?.[0]?.meta?.changes) !== 1)
      return fail("Sản phẩm vừa bị xóa hoặc thay đổi. Hãy tải lại danh sách trước khi lưu.", 409);
    return json({ ok: true, product: toAdminProduct(p), message: "Đã lưu thay đổi sản phẩm." });
  } catch (error) { return genericDbError(error); }
}

// Single-field quick edits on Admin cards. Unlike PUT, this never replaces
// other fields that another editor may have modified since the list was loaded.
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const id = String(context.params.id || "");
  const parsed = await readJsonBodyLimited(context.request, 32 * 1024);
  if (parsed.error === "too_large") return fail("Thao tác vượt giới hạn dữ liệu.", 413);
  const input = parsed.value;
  if (parsed.error || !input || typeof input !== "object" || Array.isArray(input)) return fail("Thao tác chỉnh nhanh không hợp lệ.");
  const { field, value, expectedValue } = input;
  if (!["category", "price", "images", "fulfillmentType"].includes(field) || !Object.hasOwn(input, "expectedValue")) return fail("Trường chỉnh nhanh không hợp lệ.");
  try {
    const row = await context.env.DB.prepare("SELECT * FROM products WHERE id=? LIMIT 1").bind(id).first();
    if (!row) return fail("Không tìm thấy sản phẩm.", 404);
    const existing = fromRow(row);
    const before = field === "fulfillmentType" ? existing.fulfillmentType : field === "category"
      ? { category: existing.category, categoryLabel: existing.categoryLabel }
      : field === "images" ? existing.images : existing.price;
    if (JSON.stringify(before) !== JSON.stringify(expectedValue))
      return fail("Sản phẩm đã được chỉnh sửa từ thiết bị khác. Hãy tải lại rồi thử lại.", 409);

    let updates;
    let checkInput = {
      title: existing.title, sku: existing.sku, skuVerified: existing.skuVerified,
      category: existing.category, categoryLabel: existing.categoryLabel,
      description: existing.description, price: existing.price, stock: existing.stock,
      published: existing.published, images: existing.images,
      fulfillmentType: existing.fulfillmentType
    };
    if (field === "category") {
      if (!value || typeof value !== "object" || Array.isArray(value) ||
          typeof value.category !== "string" || !/^[a-z0-9-]{1,80}$/.test(value.category) ||
          typeof value.categoryLabel !== "string" || !value.categoryLabel.trim() ||
          value.categoryLabel.length > 80) return fail("Danh mục không hợp lệ.", 400);
      checkInput.category = value.category;
      checkInput.categoryLabel = value.categoryLabel;
    } else if (field === "price") {
      checkInput.price = value;
    } else if (field === "fulfillmentType") {
      checkInput.fulfillmentType = value;
    } else {
      checkInput.images = value;
    }
    const checked = validateProduct(checkInput, existing);
    if (checked.error) return fail(checked.error, 400);
    const after = checked.value;
    if (field === "category") {
      updates = context.env.DB.prepare("UPDATE products SET category=?, category_label=?, updated_at=datetime('now') WHERE id=? AND category=? AND category_label=?")
        .bind(after.category, after.categoryLabel, id, row.category, row.category_label);
    } else if (field === "fulfillmentType") {
      updates = context.env.DB.prepare("UPDATE products SET fulfillment_type=?, updated_at=datetime(\'now\') WHERE id=? AND fulfillment_type=?")
        .bind(after.fulfillmentType, id, row.fulfillment_type);
    } else if (field === "price") {
      updates = context.env.DB.prepare("UPDATE products SET price=?, source_price_confirmed=?, updated_at=datetime('now') WHERE id=? AND price IS ?")
        .bind(after.price, after.sourcePriceConfirmed ? 1 : 0, id, row.price);
    } else {
      updates = context.env.DB.prepare("UPDATE products SET images_json=?, updated_at=datetime('now') WHERE id=? AND images_json=?")
        .bind(JSON.stringify(after.images), id, row.images_json);
    }
    const results = await context.env.DB.batch([
      updates,
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'product_inline_updated', 'product', ?, ? WHERE changes()=1")
        .bind(crypto.randomUUID(), id, JSON.stringify({ sku: existing.sku, field }))
    ]);
    if (Number(results?.[0]?.meta?.changes) !== 1)
      return fail("Dữ liệu đã thay đổi trong lúc chỉnh sửa. Hãy tải lại danh sách.", 409);
    return json({ ok:true, message:"Đã cập nhật sản phẩm.", field, product:toAdminProduct(after) });
  } catch(error) { return genericDbError(error); }
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
