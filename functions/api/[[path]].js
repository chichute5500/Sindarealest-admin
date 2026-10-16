/**
 * Return a clear API 404 for unknown endpoints.
 *
 * The root optional-multipath route can match every URL. It must pass all
 * non-API traffic through to the Pages asset/redirect handler, otherwise it
 * could shadow valid static pages and the site's /index.html fallback.
 * More specific API functions take precedence over this route.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
    return context.next();
  }
  return new Response(JSON.stringify({
    error: "API endpoint not found.",
    code: "API_ROUTE_NOT_FOUND",
  }), {
    status: 404,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
