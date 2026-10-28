/**
 * Return a stable JSON 404 for unknown /api/* endpoints.
 *
 * More-specific Pages Functions (for example /api/products and /api/admin/login)
 * should keep precedence. This fallback prevents the site's static SPA redirect
 * from turning a missing API endpoint into HTTP 200 HTML.
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
