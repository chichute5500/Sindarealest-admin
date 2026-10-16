/**
 * Return a clear API 404 for unknown endpoints.
 *
 * Without this route, public/_redirects' catch-all rewrite can serve the
 * storefront HTML for removed or mistyped /api/* paths. More specific
 * Pages Functions routes (for example /api/products and /api/admin/login)
 * take precedence over this catch-all route.
 */
export async function onRequest() {
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
