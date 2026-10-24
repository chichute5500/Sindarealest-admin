import { productCategoryRouteSlug } from "./_lib.js";
export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.replace(/\.$/, "");
  const previewHost = hostname.endsWith(".sindarealest2.pages.dev")
    && hostname !== "sindarealest2.pages.dev";
  if (previewHost) {
    return new Response("Sitemap unavailable on Preview hosts", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (!env?.DB) return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  try {
    const url = new URL(request.url), origin = url.origin;
    const rows = await env.DB.prepare("SELECT id,slug,sku,sku_verified,category,category_label,updated_at FROM products WHERE published=1 ORDER BY sort_order,sku LIMIT 2000").all();
    const escapeXml = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&apos;");
    const urls = [`<url><loc>${origin}/</loc></url>`, ...(rows.results || []).map((p) => {
      let lastmod = "";
      if (p.updated_at !== null && p.updated_at !== undefined && String(p.updated_at).trim()) {
        const raw = String(p.updated_at).trim();
        const date = new Date(`${raw.replace(" ", "T")}Z`);
        if (Number.isFinite(date.getTime())) lastmod = `<lastmod>${escapeXml(date.toISOString())}</lastmod>`;
      }
      return `<url><loc>${origin}/sanpham/${productCategoryRouteSlug(p.category)}/${encodeURIComponent(Number(p.sku_verified) === 1 && p.sku ? p.sku : (p.id || p.slug))}</loc>${lastmod}</url>`;
    })];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }); }
}
