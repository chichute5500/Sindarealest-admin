import { dbOrFail, fail, fromRow, getSetting, json, FULFILLMENT_TYPES } from "../_lib.js";
import { isVerifiedCommercialSku as isExplicitlyVerifiedSku } from "../_storefront-route.js";

export async function onRequestGet({ request, env }) {
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try {
    const showPrices = (await getSetting(env.DB, "show_prices", "0")) === "1";
    const requestedType = new URL(request?.url || "https://shop.example/api/products").searchParams.get("fulfillmentType");
    if (requestedType !== null && !FULFILLMENT_TYPES.includes(requestedType)) return fail("Bộ lọc loại hàng không hợp lệ.", 400);
    const query = requestedType
      ? env.DB.prepare("SELECT * FROM products WHERE published = 1 AND fulfillment_type = ? ORDER BY created_at DESC, id DESC LIMIT 2000").bind(requestedType)
      : env.DB.prepare("SELECT * FROM products WHERE published = 1 ORDER BY created_at DESC, id DESC LIMIT 2000");
    const result = await query.all();
    return json((result.results || []).map((row) => {
      // Public product URLs, JSON-LD and catalog must follow the same explicit
      // verification gate even if a historical DB lacks migration 0008.
      // Preserve Admin price/fulfillment filtering and internal record fields.
      const product = fromRow(row, { publicView: true, showPrices });
      const skuVerified = isExplicitlyVerifiedSku(row);
      return { ...product, sku: skuVerified ? product.sku : null, skuVerified };
    }));
  } catch {
    return fail("Không thể tải dữ liệu sản phẩm từ D1. Vui lòng thử lại sau; dữ liệu tĩnh dự phòng đã được tắt để tránh hiển thị sản phẩm cũ.", 503);
  }
}
