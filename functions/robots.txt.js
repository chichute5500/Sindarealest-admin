export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const previewHost = url.hostname.endsWith(".sindarealest2.pages.dev")
    && url.hostname !== "sindarealest2.pages.dev";
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (previewHost) {
    return new Response("User-agent: *\nDisallow: /\n", { headers });
  }
  return new Response("User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: " + url.origin + "/sitemap.xml\n", { headers });
}
