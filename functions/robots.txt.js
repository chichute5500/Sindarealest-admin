export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nAllow: /api/products$\nAllow: /api/settings$\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/sitemap-pages.xml\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
