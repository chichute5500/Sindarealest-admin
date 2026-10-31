import { dbOrFail, fail, fromRow, getSetting, json, FULFILLMENT_TYPES } from "../_lib.js";
import { isVerifiedCommercialSku as isExplicitlyVerifiedSku } from "../_storefront-route.js";

// Cache only the public serialization, never the DB rows or private Admin data.
// Short edge TTL protects D1 Rows Read; the show_prices gate is re-read on each
// request and part of the key, so disabling prices cannot serve a priced cache.
const PUBLIC_CATALOG_EDGE_TTL = 15;
function edgeCatalogCacheKey(request, fulfillmentType, showPrices) {
  const url = new URL(request.url);
  url.pathname = "/api/products";
  url.search = "";
  url.searchParams.set("priceMode", showPrices ? "visible" : "hidden");
  if (fulfillmentType) url.searchParams.set("fulfillmentType", fulfillmentType);
  return new Request(url.toString(), {method:"GET"});
}
async function readCachedCatalog(cache, key) {
  if (!cache) return null;
  try {
    const hit=await cache.match(key);
    if (!hit || !hit.ok) return null;
    // Even if the edge copy is cached, browsers keep fetching current catalog.
    const headers=new Headers(hit.headers);
    headers.set("Cache-Control","no-store");
    return new Response(hit.body,{status:hit.status,headers});
  } catch { return null; }
}
async function storeCachedCatalog(cache, key, response) {
  if (!cache || !response.ok) return;
  try {
    const headers=new Headers(response.headers);
    headers.set("Cache-Control","public, max-age="+PUBLIC_CATALOG_EDGE_TTL);
    const edgeCopy=new Response(response.clone().body,{status:200,headers});
    await cache.put(key,edgeCopy);
  } catch { /* Cache API may be unavailable in local Pages/dev; query still works. */ }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try {
    const requestedType = new URL(request?.url || "https://shop.example/api/products").searchParams.get("fulfillmentType");
    if (requestedType !== null && !FULFILLMENT_TYPES.includes(requestedType)) return fail("Bộ lọc loại hàng không hợp lệ.", 400);
    const showPrices = (await getSetting(env.DB, "show_prices", "0")) === "1";
    const cache = globalThis.caches?.default || null;
    const cacheKey = cache && request ? edgeCatalogCacheKey(request,requestedType,showPrices) : null;
    if (cacheKey) {
      const cached = await readCachedCatalog(cache,cacheKey);
      if (cached) return cached;
    }
    const query = requestedType
      ? env.DB.prepare("SELECT * FROM products WHERE published = 1 AND fulfillment_type = ? ORDER BY created_at DESC, id DESC LIMIT 2000").bind(requestedType)
      : env.DB.prepare("SELECT * FROM products WHERE published = 1 ORDER BY created_at DESC, id DESC LIMIT 2000");
    const result = await query.all();
    const response = json((result.results || []).map((row) => {
      // Public product URLs, JSON-LD and catalog follow the explicit verification gate.
      // Never cache unsanitized internal fields or unconfirmed prices.
      const product = fromRow(row, { publicView: true, showPrices });
      const skuVerified = isExplicitlyVerifiedSku(row);
      return { ...product, sku: skuVerified ? product.sku : null, skuVerified };
    }));
    if (cacheKey) {
      // Cache API writes may consume the whole serialized catalog. In Pages,
      // waitUntil keeps that work alive without making the customer wait for it.
      // Standalone callers without a request context still await it, preserving
      // the deterministic fallback and existing cache/price-gate tests.
      const cacheWrite = storeCachedCatalog(cache,cacheKey,response);
      if (typeof context.waitUntil === "function") context.waitUntil(cacheWrite);
      else await cacheWrite;
    }
    return response;
  } catch {
    return fail("Danh mục đang tạm thời gián đoạn. Vui lòng thử lại sau.", 503);
  }
}
