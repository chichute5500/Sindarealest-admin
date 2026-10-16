/**
 * Return a clear JSON 404 for unknown API endpoints.
 *
 * This route is scoped to /api/* by its location under functions/api/.
 * Cloudflare Pages gives more-specific route files (such as products.js
 * and admin/login.js) precedence over this optional multi-segment route.
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
