import { canonicalProductPath, catalogListingPath, PRODUCT_CATEGORY_ROUTE_SLUGS } from "./_storefront-route.js";

const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const xmlResponse = (body, fallback = false) => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
  { headers: {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": fallback ? "no-store" : "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
    ...(fallback ? { "X-Sitemap-Fallback": "base-pages" } : {})
  } }
);
const xmlUrl = (url, lastmod = "") => `<url><loc>${escapeXml(url)}</loc>${lastmod}</url>`;
const basePaths = ["/", "/sanpham"];

// Even when D1 is temporarily unavailable, return a valid public sitemap of
// stable storefront/category routes instead of a 503. Never cache a fallback.
function fallbackSitemap(origin) {
  const categories = [...new Set(Object.values(PRODUCT_CATEGORY_ROUTE_SLUGS))].sort();
  return xmlResponse([ ...basePaths, ...categories.map((slug) => "/sanpham/" + slug) ]
    .map((path) => xmlUrl(origin + path)).join(""), true);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url), origin = url.origin;
  const previewHost = url.hostname.toLowerCase().endsWith(".sindarealest2.pages.dev")
    && url.hostname.toLowerCase() !== "sindarealest2.pages.dev";
  if (previewHost) return new Response("Preview sitemap unavailable", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
  });
  if (!env?.DB) return fallbackSitemap(origin);
  try {
    // Avoid reading large descriptions/images for 2,000 products on each
    // sitemap request: a slow D1 query can cause intermittent crawler failures.
    const rows = await env.DB.prepare(
      "SELECT id,slug,sku,sku_verified,category,updated_at FROM products WHERE published=1 ORDER BY created_at DESC,id DESC LIMIT 2000"
    ).all();
    const products = rows.results || [];
    const categoryPaths = [...new Set(products.map((p) => catalogListingPath(p.category)))].sort();
    const entries = [ ...basePaths, ...categoryPaths ].map((path) => xmlUrl(origin + path));
    for (const product of products) {
      const path = canonicalProductPath(product);
      if (!path) continue;
      let lastmod = "";
      if (product.updated_at !== null && product.updated_at !== undefined && String(product.updated_at).trim()) {
        const raw = String(product.updated_at).trim();
        const date = new Date(`${raw.replace(" ", "T")}Z`);
        if (Number.isFinite(date.getTime())) lastmod = `<lastmod>${escapeXml(date.toISOString())}</lastmod>`;
      }
      entries.push(xmlUrl(origin + path, lastmod));
    }
    return xmlResponse(entries.join(""));
  } catch {
    return fallbackSitemap(origin);
  }
}
