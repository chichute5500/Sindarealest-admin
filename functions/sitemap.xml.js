export async function onRequestGet({ request, env }) {
  if (!env?.DB) return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  try {
    const url = new URL(request.url), origin = url.origin;
    const rows = await env.DB.prepare("SELECT id,slug,sku,updated_at FROM products WHERE published=1 ORDER BY sort_order,sku LIMIT 2000").all();
    const escapeXml = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&apos;");
    const urls = [`<url><loc>${origin}/</loc></url>`, ...(rows.results || []).map(p => `<url><loc>${origin}/san-pham/${encodeURIComponent(p.sku || p.id)}</loc>${p.updated_at ? `<lastmod>${escapeXml(new Date(`${p.updated_at.replace(" ", "T")}Z`).toISOString())}</lastmod>` : ""}</url>`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }); }
}
