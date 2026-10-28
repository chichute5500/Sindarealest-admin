/**
 * SinDarealest importer: retry-safe draft creation.
 * The client owns a random UUID for one import operation. A retry never creates
 * a second product, even when the original successful response is lost.
 * This endpoint MUST NOT replace the ordinary Admin product-create endpoint.
 */
import {
  fail, genericDbError, json, productInsertStatement,
  readJsonBodyLimited, requireAdmin, toAdminProduct, validateProduct,
} from '../../_lib.js';
import { officialSkuPrefix, nextSkuForPrefix } from '../../_catalog-sku.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPORT_LIMIT = 32 * 1024;
const noStore = { 'Cache-Control': 'no-store' };

function sameImport(row, p) {
  let images;
  try { images = JSON.parse(row.images_json); } catch { return false; }
  return Number(row.published) === 0 &&
    row.title === p.title && row.category === p.category &&
    row.category_label === p.categoryLabel &&
    row.description === p.description &&
    (row.price == null ? null : Number(row.price)) === p.price &&
    (row.stock == null ? null : Number(row.stock)) === p.stock &&
    row.fulfillment_type === p.fulfillmentType &&
    JSON.stringify(images) === JSON.stringify(p.images);
}

async function findById(db, id) {
  return await db.prepare('SELECT * FROM products WHERE id=? LIMIT 1').bind(id).first();
}

function replayResponse(row, p) {
  if (!sameImport(row, p)) {
    return fail('Mã nhập đã được dùng cho dữ liệu khác hoặc sản phẩm đã đổi trạng thái; không tạo lại.', 409);
  }
  return json({ ok: true, replayed: true, product: toAdminProduct({ ...p, sku: row.sku, skuVerified: true, published: 0 }) }, 200, noStore);
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id || !UUID.test(id)) return fail('Mã phiên nhập không hợp lệ.', 400);
  try {
    const row = await findById(context.env.DB, id);
    return json({ ok: true, exists: Boolean(row), product: row
      ? { id: row.id, title: row.title, sku: row.sku, published: Boolean(row.published) }
      : null }, 200, noStore);
  } catch (error) { return genericDbError(error); }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsed = await readJsonBodyLimited(context.request, IMPORT_LIMIT);
  if (parsed.error === 'too_large') return fail('Dữ liệu nhập vượt giới hạn 32 KB.', 413);
  const body = parsed.value;
  if (parsed.error || !body || typeof body !== 'object' || Array.isArray(body)) return fail('Dữ liệu nhập không hợp lệ.', 400);
  const importId = typeof body.importId === 'string' ? body.importId.toLowerCase() : '';
  if (!UUID.test(importId)) return fail('Thiếu mã nhập duy nhất hợp lệ.', 400);
  const prefix = officialSkuPrefix(body.category);
  if (!prefix) return fail('Danh mục không có tiền tố SKU được duyệt.', 400);

  // Ignore client-supplied SKU, id and published flag. Always draft/hidden.
  const checked = validateProduct({ ...body, sku: prefix + '001', skuVerified: true, published: false, stock: null });
  if (checked.error) return fail(checked.error, 400);
  const initial = checked.value;
  const pBase = { ...initial, id: importId, slug: `${initial.slug.replace(/-[0-9a-f]{8}$/i, '')}-${importId.slice(0, 8)}`, published: 0 };
  if (pBase.slug.length > 100) pBase.slug = pBase.slug.slice(0, 100);

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const existing = await findById(context.env.DB, importId);
      if (existing) return replayResponse(existing, pBase);
      const rows = await context.env.DB.prepare('SELECT sku FROM products WHERE sku LIKE ?').bind(prefix + '%').all();
      const p = { ...pBase, sku: nextSkuForPrefix(rows.results, prefix) };
      await context.env.DB.batch([
        productInsertStatement(context.env.DB, p),
        context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'product_imported_draft', 'product', ?, ?)")
          .bind(crypto.randomUUID(), importId, JSON.stringify({ sku: p.sku, title: p.title, source: 'taobao-image-import' })),
      ]);
      return json({ ok: true, replayed: false, product: toAdminProduct(p) }, 201, noStore);
    } catch (error) {
      // An ambiguous error might mean another concurrent request committed.
      // Always re-read by id before deciding to retry or report failure.
      try {
        const existing = await findById(context.env.DB, importId);
        if (existing) return replayResponse(existing, pBase);
      } catch { return fail('Không xác minh được trạng thái phiên nhập.', 503); }
      if (!/UNIQUE constraint failed:\s*products\.sku/i.test(String(error?.message || ''))) return genericDbError(error);
      if (attempt === 5) return fail('Không thể cấp SKU duy nhất.', 409);
    }
  }
  return fail('Không thể hoàn tất nhập sản phẩm.', 503);
}
