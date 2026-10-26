import { createSession, sameSiteRequest, sessionCookie, verifySession } from "./_lib.js";
import { canonicalProductPath, isVerifiedCommercialSku } from "./_storefront-route.js";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function meta(html, name, content, property = false) {
  const attr = property ? "property" : "name";
  const escaped = escapeHtml(content);
  const re = new RegExp(`<meta\\s+${attr}=["']${name}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${name}" content="${escaped}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith('/api/admin/') && context.request.method !== 'OPTIONS') {
    const hadValidSession = sameSiteRequest(context.request) && await verifySession(context.request, context.env);
    const response = await context.next();
    // Never rotate a session on a response that already sets/clears a cookie.
    // In particular, logout must not be followed by a fresh valid session cookie.
    if (!hadValidSession || !response.ok || !context.env?.SESSION_SECRET || response.headers.has("Set-Cookie")) return response;
    const token = await createSession(context.env.SESSION_SECRET);
    const headers = new Headers(response.headers);
    headers.append('Set-Cookie', sessionCookie(token));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  const legacyMatch = url.pathname.match(/^\/san-pham\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i);
  const modernMatch = url.pathname.match(/^\/sanpham\/([a-z0-9][a-z0-9-]{0,99})\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i);
  if (!legacyMatch && !modernMatch) {
    const response = await context.next();
    if (!response.ok || !["/", "/index.html"].includes(url.pathname) || !(response.headers.get("content-type") || "").includes("text/html")) return response;
    let html = await response.text();
    html = meta(html, "og:url", `${url.origin}/`, true);
    html = meta(html, "og:image", `${url.origin}/og-sindarealest.jpg`, true);
    html = meta(html, "twitter:image", `${url.origin}/og-sindarealest.jpg`);
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(`${url.origin}/`)}">`;
    html = /<link\s+rel=["']canonical["']/i.test(html) ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag) : html.replace("</head>", `  ${canonicalTag}\n</head>`);
    const headers = new Headers(response.headers); headers.set("Content-Type", "text/html; charset=utf-8"); headers.delete("Content-Length"); headers.delete("Content-Encoding"); headers.delete("ETag");
    return new Response(html, { status: response.status, headers });
  }
  const slug = (modernMatch ? modernMatch[2] : legacyMatch[1]).toLowerCase();
  if (!context.env?.DB) return new Response("Dịch vụ dữ liệu chưa sẵn sàng.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  let product;
  try { product = await context.env.DB.prepare("SELECT * FROM products WHERE lower(slug)=? OR lower(id)=? OR upper(sku)=upper(?) LIMIT 1").bind(slug,slug,slug).first(); }
  catch { return new Response("Không thể tải sản phẩm.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }); }
  if (!product || Number(product.published) !== 1) return new Response("Không tìm thấy sản phẩm.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } });
  const canonicalPath = canonicalProductPath(product);
  if (!canonicalPath) return new Response("Không tìm thấy sản phẩm.", { status: 404 });
  if (url.pathname !== canonicalPath) return Response.redirect(new URL(canonicalPath, url.origin), 301);
  let images = [];
  try { images = JSON.parse(product.images_json || "[]"); } catch {}
  const candidateImage = Array.isArray(images) && typeof images[0] === "string" ? images[0] : "";
  const imagePath = /^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(candidateImage) ? `/${candidateImage}` : /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(candidateImage) ? candidateImage : "/og-sindarealest.jpg";
  const canonical = `${url.origin}${canonicalPath}`;
  const title = `${product.title} | SinDarealest`;
  const descriptionBase = String(product.description || `${product.title} — ${product.category_label || "Thời trang da cá sấu cao cấp"}. Liên hệ SinDarealest để được tư vấn chi tiết.`).replace(/\s+/g, " ").trim();
  const description = (isVerifiedCommercialSku(product) ? `${descriptionBase.slice(0, 250)} · SKU: ${product.sku}` : descriptionBase).slice(0, 300);
  const response = await context.next(new Request(new URL("/index.html", url.origin), { method: "GET", headers: context.request.headers }));
  if (!response.ok) return response;
  let html = await response.text();
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = meta(html, "description", description);
  html = meta(html, "og:type", "product", true);
  html = meta(html, "og:site_name", "SinDarealest", true);
  html = meta(html, "og:title", title, true);
  html = meta(html, "og:description", description, true);
  html = meta(html, "og:url", canonical, true);
  html = meta(html, "og:image", new URL(imagePath, url.origin).href, true);
  html = meta(html, "og:image:alt", product.title, true);
  html = meta(html, "twitter:card", "summary_large_image");
  html = meta(html, "twitter:title", title);
  html = meta(html, "twitter:description", description);
  html = meta(html, "twitter:image", new URL(imagePath, url.origin).href);
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}">`;
  html = /<link\s+rel=["']canonical["']/i.test(html) ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag) : html.replace("</head>", `  ${canonicalTag}\n</head>`);
  const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: product.title, description, image: [new URL(imagePath, url.origin).href], ...(isVerifiedCommercialSku(product) ? { sku: product.sku } : {}), url: canonical, brand: { "@type": "Brand", name: "SinDarealest" } }).replace(/<\//g, "<\\/");
  html = html.replace("</head>", `  <script type="application/ld+json">${schema}</script>\n</head>`);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60, s-maxage=300"); headers.delete("Content-Length"); headers.delete("Content-Encoding"); headers.delete("ETag");
  return new Response(html, { status: response.status, headers });
}
