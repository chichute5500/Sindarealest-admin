// Read-only schema-compatible Storefront helper. No Admin/D1 writes.
export const PRODUCT_CATEGORY_ROUTE_SLUGS = Object.freeze({"sneakers":"sneaker","loafers":"giayluoi","dress-shoes":"giaytay","belts":"thatlung","wallets":"vida","sandals":"dep","watch-straps":"daydongho","phone-cases":"oplung"});
export function productCategoryRouteSlug(value) {
  const key = String(value || "").trim().toLocaleLowerCase("en");
  if (Object.hasOwn(PRODUCT_CATEGORY_ROUTE_SLUGS, key)) return PRODUCT_CATEGORY_ROUTE_SLUGS[key];
  return String(value || "san-pham").toLocaleLowerCase("vi").replace(/đ/g, "d")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 100) || "san-pham";
}
export function isVerifiedCommercialSku(row) {
  // Missing sku_verified column (migration 0008 not run) always means unverified.
  return Boolean(row && Number(row.sku_verified ?? row.skuVerified) === 1
    && /^[A-Z0-9][A-Z0-9._-]{0,47}$/i.test(String(row.sku || "").trim()));
}
export function canonicalProductPath(row) {
  const key = isVerifiedCommercialSku(row) ? String(row.sku) : String(row.id || row.slug || "");
  return key ? "/sanpham/" + productCategoryRouteSlug(row.category) + "/" + encodeURIComponent(key) : null;
}
export function publicFulfillmentType(row) {
  const value = row?.fulfillment_type ?? row?.fulfillmentType;
  return ["in_stock","made_to_order","unclassified"].includes(value) ? value : "unclassified";
}
