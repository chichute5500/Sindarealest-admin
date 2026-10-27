import { fail, fromRow, genericDbError, json, productInsertStatement, readJsonBodyLimited, requireAdmin, toAdminProduct, validateProduct } from "../../_lib.js";
import { officialSkuPrefix, nextSkuForPrefix } from "../../_catalog-sku.js";

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
  const prefix=officialSkuPrefix(body?.category||body?.categoryLabel);
  if(!prefix)return fail("Danh mục chưa có tiền tố SKU chính thức. Vui lòng chọn một trong 15 danh mục đã duyệt.",400);
  // New products always receive an official, server-generated SKU.
  // Ignore client-provided SKU/verification flags to prevent accidental duplicates,
  // spoofed commercial SKUs or a new 'SKU chưa xác minh' state.
  try {
    const rows=await context.env.DB.prepare("SELECT sku FROM products WHERE sku LIKE ?").bind(prefix+"%").all();
    body.sku=nextSkuForPrefix(rows.results,prefix);
    body.skuVerified=true;
  } catch { return fail("Không thể cấp SKU chính thức. Vui lòng thử lại.",503); }
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

      if (attempt === 4) {
        return fail("Không thể cấp SKU chính thức duy nhất sau nhiều lần thử đồng thời. Hãy tải lại danh sách rồi thử lại.", 409);
      }
      try {
        const rows=await context.env.DB.prepare("SELECT sku FROM products WHERE sku LIKE ?").bind(prefix+"%").all();
        p={ ...p,sku:nextSkuForPrefix(rows.results,prefix),skuVerified:true };
      } catch {
        return fail("Không thể đọc lại SKU sau xung đột. Vui lòng thử lại.", 503);
      }
    }
  }
  return fail("Không thể tạo sản phẩm. Vui lòng thử lại.", 503);
}
