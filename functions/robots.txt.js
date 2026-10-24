export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  // DNS FQDN notation permits a terminal dot. Normalize it for host classification
  // so it cannot bypass the preview-only crawl guard.
  const hostname = url.hostname.replace(/\.$/, "");
  const previewHost = hostname.endsWith(".sindarealest2.pages.dev")
    && hostname !== "sindarealest2.pages.dev";
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (previewHost) {
    return new Response("User-agent: *\nDisallow: /\n", { headers });
  }
  // Keep /admin/ crawlable so crawlers can see the document-level meta robots noindex
  // directive in public/admin/index.html; robots.txt blocking would hide that directive.
  return new Response("User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: " + url.origin + "/sitemap.xml\n", { headers });
}
