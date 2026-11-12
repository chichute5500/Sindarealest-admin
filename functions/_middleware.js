import { createSession, sessionCookie, verifySession } from "./_lib.js";
import { sendAdminPush } from "./_notifications.js";
import { renderPublicCatalog } from "./_catalog-ssr.js";
import { canonicalProductPath, isVerifiedCommercialSku, productCategoryRouteSlug, isKnownCatalogCategoryRoute, catalogListingPath } from "./_storefront-route.js";
import { WARRANTY_OG_JPEG_BASE64 } from "./_warranty-og-image.js";
import { CATEGORY_OG_JPEG_BASE64 } from "./_category-og-images.js";
import { KNOWLEDGE_SLUGS } from "./_knowledge-routes.js";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function meta(html, name, content, property = false) {
  const attr = property ? "property" : "name";
  const escaped = escapeHtml(content);
  const re = new RegExp(`<meta\\s+${attr}=["']${name}["'][^>]*>`, "i");
  const tag = `<meta ${attr}="${name}" content="${escaped}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}
// Catalog SEO text lives in the public HTML as static JSON so the initial
// server response and the existing client-side category navigation share one
// source of truth. Do not pull keyword copy from untrusted product fields.
function catalogSeoProfile(html, categorySlug) {
  const match = html.match(/<script\s+id=["']sd-seo-category-copy["']\s+type=["']application\/json["']>([^<]*)<\/script>/i);
  if (!match) return null;
  try {
    const profiles = JSON.parse(match[1]);
    const profile = profiles?.[categorySlug];
    return profile && typeof profile.title === "string"
      && typeof profile.description === "string"
      && typeof profile.heading === "string"
      && typeof profile.intro === "string" ? profile : null;
  } catch { return null; }
}
// The same visible catalog hierarchy is expressed as crawler-readable
// BreadcrumbList JSON-LD. No new D1 read, no invented attributes, no UI changes.
function appendBreadcrumbList(html, origin, entries) {
  if (!Array.isArray(entries) || entries.length < 2) return html;
  const itemListElement = entries.map(({ name, path }, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: String(name || "").slice(0, 200),
    item: new URL(path, origin).href
  }));
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement
  }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return html.replace("</head>", '  <script type="application/ld+json">' + schema + '</script>\n</head>');
}
// Functions-generated HTML bypasses static _headers on some Cloudflare paths.
// Apply the same minimally restrictive document-level controls on all real
// storefront HTML responses, without blocking approved inline scripts, Zalo
// links or image/media assets.
function hardenStorefrontHtmlHeaders(headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  return headers;
}
export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Social link-preview crawlers do not all render WebP. Provide a cached JPEG
  // rendition for each product while keeping the storefront's source images intact.
  if (url.pathname === "/og-image/warranty.jpg") {
    if (context.request.method !== "GET" && context.request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, HEAD" } });
    const encoded = atob(WARRANTY_OG_JPEG_BASE64);
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
    return new Response(context.request.method === "HEAD" ? null : bytes, { status: 200, headers: {
      "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    } });
  }
  const categoryOgMatch = url.pathname.match(/^\/og-category\/([a-z0-9][a-z0-9-]{0,99})\.jpg$/i);
  if (categoryOgMatch) {
    if (context.request.method !== "GET" && context.request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, HEAD" } });
    const encoded = CATEGORY_OG_JPEG_BASE64[categoryOgMatch[1].toLowerCase()];
    if (!encoded) return new Response("Image unavailable", { status: 404 });
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Response(context.request.method === "HEAD" ? null : bytes, { status: 200, headers: {
      "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    } });
  }
  const ogImageMatch = url.pathname.match(/^\/og-image\/([a-z0-9][a-z0-9._-]{0,119})\.jpg$/i);
  if (ogImageMatch) {
    if (context.request.method !== "GET" && context.request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, HEAD" } });
    if (!context.env?.DB) return new Response("Image unavailable", { status: 404 });
    let ogProduct;
    try {
      ogProduct = await context.env.DB.prepare("SELECT images_json FROM products WHERE (lower(slug)=? OR lower(id)=? OR upper(sku)=upper(?)) AND published=1 LIMIT 1")
        .bind(ogImageMatch[1].toLowerCase(), ogImageMatch[1].toLowerCase(), ogImageMatch[1]).first();
    } catch { return new Response("Image unavailable", { status: 404 }); }
    let ogImages = [];
    try { ogImages = JSON.parse(ogProduct?.images_json || "[]"); } catch {}
    const ogSource = Array.isArray(ogImages) ? ogImages.find(value =>
      typeof value === "string" && (/^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(value)
        || /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(value))) : "";
    if (!ogSource) return new Response("Image unavailable", { status: 404 });
    const sourceUrl = new URL(ogSource.startsWith("/") ? ogSource : `/${ogSource}`, url.origin);
    let imageResponse;
    try {
      imageResponse = await fetch(sourceUrl.href, { cf: { image: { format: "jpeg", quality: 85 } } });
    } catch { return new Response("Image conversion unavailable", { status: 502 }); }
    if (!imageResponse.ok) return new Response("Image conversion unavailable", { status: 502 });
    const imageHeaders = new Headers(imageResponse.headers);
    imageHeaders.set("Content-Type", "image/jpeg");
    imageHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    imageHeaders.set("X-Content-Type-Options", "nosniff");
    for (const key of ["Content-Length", "Content-Encoding", "ETag"]) imageHeaders.delete(key);
    return new Response(context.request.method === "HEAD" ? null : imageResponse.body, { status: 200, headers: imageHeaders });
  }
  // Repair two stale URLs reported by Google Search Console: a trailing-period
  // sitemap typo and the retired product-listing root. Keep canonical URLs direct.
  if (url.pathname === "/sitemap.xml.") return Response.redirect(new URL("/sitemap.xml", url.origin), 301);
  if (url.pathname === "/san-pham" || url.pathname === "/san-pham/") return Response.redirect(new URL("/sanpham", url.origin), 301);
  if (url.pathname.startsWith('/api/admin/') && context.request.method !== 'OPTIONS') {
    const hadValidSession = await verifySession(context.request, context.env);
    const response = await context.next();
    // Notify only after a successful write. The two order endpoints already
    // emit their own detailed notifications, so do not send a duplicate.
    if (response.ok && ["POST","PUT","PATCH","DELETE"].includes(context.request.method)) {
      const part=url.pathname.slice("/api/admin/".length).split("/")[0];
      const labels={products:"Sản phẩm",warranties:"Bảo hành",settings:"Cài đặt",
        "payment-requests":"Yêu cầu thanh toán","payment-transactions":"Thanh toán",
        "payment-qr":"QR thanh toán","payment-qr-upload":"QR thanh toán",
        "cod-settlements":"Đối soát COD","order-delivery":"Giao hàng",
        "restore":"Khôi phục dữ liệu"};
      if(Object.hasOwn(labels,part)) {
        const task=sendAdminPush(context.env,{title:labels[part]+" được cập nhật",body:"Có thay đổi mới trong quản trị SinDarealest.",url:"/admin/"});
        if(typeof context.waitUntil==="function")context.waitUntil(task); else await task;
      }
    }
    // Never rotate a session on a response that already sets/clears a cookie.
    // In particular, logout must not be followed by a fresh valid session cookie.
    if (!hadValidSession || !response.ok || !context.env?.SESSION_SECRET || response.headers.has("Set-Cookie")) return response;
    const token = await createSession(context.env.SESSION_SECRET);
    const headers = new Headers(response.headers);
    headers.append('Set-Cookie', sessionCookie(token));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  // Customer warranty requests are important even when Admin is closed.
  if(url.pathname==="/api/warranty-claims" && context.request.method==="POST") {
    const response=await context.next();
    if(response.status===201){
      const task=sendAdminPush(context.env,{title:"Yêu cầu bảo hành mới",body:"Khách hàng vừa gửi yêu cầu hỗ trợ bảo hành.",url:"/admin/"});
      if(typeof context.waitUntil==="function")context.waitUntil(task); else await task;
    }
    return response;
  }
  // Independent public support pages reuse the storefront's verified lookup
  // forms. Serve real 200 HTML without DB reads or copied customer data.
  const supportMatch=url.pathname.match(/^\/(tra-cuu-don-hang|bao-hanh)\/?$/i);
  if(supportMatch){
    if(context.request.method!=="GET"&&context.request.method!=="HEAD")
      return new Response("Method not allowed",{status:405,headers:{"Allow":"GET, HEAD","Cache-Control":"no-store"}});
    const path="/"+supportMatch[1].toLowerCase();
    if(url.pathname!==path)return Response.redirect(new URL(path,url.origin),301);
    const response=await context.next(new Request(new URL("/index.html",url.origin),{
      method:context.request.method,headers:context.request.headers
    }));
    if(!response.ok||!(response.headers.get("content-type")||"").includes("text/html"))return response;
    const warranty=path==="/bao-hanh";
    const heading=warranty?"Kiểm tra bảo hành":"Tra cứu đơn hàng";
    const title=heading+" | SinDarealest";
    const description=warranty
      ?"Kiểm tra thời hạn bảo hành da cá sấu SinDarealest bằng mã bảo hành hoặc số điện thoại và gửi yêu cầu hỗ trợ."
      :"Tra cứu tiến trình đơn hàng SinDarealest bằng mã đơn hoặc số điện thoại. Thông tin cá nhân được bảo vệ.";
    let html=await response.text();
    html=html.replace(/<title>[\s\S]*?<\/title>/i,"<title>"+escapeHtml(title)+"</title>");
    html=html.replace('<h1 id="sdServiceHeading">Tra cứu đơn hàng</h1>','<h1 id="sdServiceHeading">'+escapeHtml(heading)+'</h1>');
    html=meta(html,"description",description);
    html=meta(html,"og:title",title,true);
    html=meta(html,"og:description",description,true);
    html=meta(html,"og:url",url.origin+path,true);
    const supportImageUrl=url.origin+(warranty?"/og-image/warranty.jpg":"/og-sindarealest-casauvip-20261113.jpg");
    html=meta(html,"og:image",supportImageUrl,true);
    html=meta(html,"og:image:type","image/jpeg",true);
    html=meta(html,"og:image:secure_url",supportImageUrl,true);
    html=meta(html,"twitter:title",title);
    html=meta(html,"twitter:description",description);
    html=meta(html,"twitter:image",supportImageUrl);
    const canonical='<link rel="canonical" href="'+escapeHtml(url.origin+path)+'">';
    html=/<link\s+rel=["']canonical["']/i.test(html)
      ?html.replace(/<link\s+rel=["']canonical["'][^>]*>/i,canonical)
      :html.replace("</head>",canonical+"\n</head>");
    const headers=new Headers(response.headers);
    headers.set("Content-Type","text/html; charset=utf-8");
    headers.set("Cache-Control","public, max-age=0, must-revalidate");
    for(const key of ["Content-Length","Content-Encoding","ETag"])headers.delete(key);
    return new Response(html,{status:200,headers:hardenStorefrontHtmlHeaders(headers)});
  }
  if(url.pathname==="/kien-thuc"||url.pathname.startsWith("/kien-thuc/")){
    if(context.request.method!=="GET"&&context.request.method!=="HEAD")
      return new Response("Method not allowed",{status:405,headers:{"Allow":"GET, HEAD","Cache-Control":"no-store"}});
    const match=url.pathname.match(/^\/kien-thuc(?:\/([a-z0-9-]+))?\/?$/);
    if(!match)return new Response("Không tìm thấy trang.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8","X-Robots-Tag":"noindex, nofollow"}});
    const slug=match[1]||"";
    if(slug&&!KNOWLEDGE_SLUGS.includes(slug))
      return new Response("Không tìm thấy bài viết.",{status:404,headers:{"Content-Type":"text/plain; charset=utf-8","X-Robots-Tag":"noindex, nofollow"}});
    const isProductionHost=url.hostname.toLowerCase()==="casauvip.store";
    // Every registered knowledge route has now been approved for publication.
    // Unknown slugs were rejected above; Production serves the hub and all
    // registered articles as indexable pages.
    const publicKnowledgeRoute=isProductionHost;
    const canonicalPath=slug?"/kien-thuc/"+slug+"/":"/kien-thuc/";
    if(url.pathname!==canonicalPath)return Response.redirect(new URL(canonicalPath+url.search,url.origin),301);
    const assetPath=slug?canonicalPath+"index.html":"/kien-thuc/index.html";
    const response=await context.next(new Request(new URL(assetPath,url.origin),{
      method:context.request.method,headers:context.request.headers
    }));
    if(!response.ok||!(response.headers.get("content-type")||"").includes("text/html"))return response;
    const headers=new Headers(response.headers);
    headers.set("Content-Type","text/html; charset=utf-8");
    const robots=publicKnowledgeRoute?"index, follow":"noindex, nofollow";
    headers.set("X-Robots-Tag",robots);
    headers.set("Cache-Control","public, max-age=0, must-revalidate");
    for(const key of ["Content-Length","Content-Encoding","ETag"])headers.delete(key);
    let html=await response.text();
    if(publicKnowledgeRoute)html=html.replace(/<meta\s+name=["']robots["'][^>]*>/i,`<meta name="robots" content="${robots}">`);
    return new Response(html,{status:200,headers:hardenStorefrontHtmlHeaders(headers)});
  }
  // Canonical catalog routes are real server-rendered entry points to the same
  // Storefront app. Never route them through product detail SQL or a blank 404.
  const catalogMatch = url.pathname.match(/^\/sanpham(?:\/([a-z0-9][a-z0-9-]{0,99}))?\/?$/i);
  if (catalogMatch) {
    if (context.request.method !== "GET" && context.request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    let categorySlug = (catalogMatch[1] || "").toLowerCase();
    const legacyCategories = {
      vida:"vinamnu","vinam":"vinamnu","vicamtay":"vinamnu",
      "tui-deo-cheo":"tuithoitrang-golf","tuideocheo":"tuithoitrang-golf",
      tuigolf:"tuithoitrang-golf",clutch:"tuithoitrang-golf",
      tuinu:"tuixach","giay-tay":"giaytay","giay-luoi":"giayluoi"
    };
    categorySlug = legacyCategories[categorySlug] || categorySlug;
    const canonicalPath = categorySlug ? "/sanpham/" + categorySlug : "/sanpham";
    const rawPage=url.searchParams.get("page");
    if(rawPage!==null&&(!/^[1-9][0-9]{0,2}$/.test(rawPage)||Number(rawPage)>250))
      return new Response("Trang không hợp lệ.",{status:404,headers:{"X-Robots-Tag":"noindex, nofollow"}});
    const requestedPage=rawPage===null?1:Number(rawPage);
    // Each paginated listing has a distinct, stable canonical URL.
    const canonicalCatalogUrl=url.origin+canonicalPath+(requestedPage>1?"?page="+requestedPage:"");
    if(rawPage==="1")return Response.redirect(new URL(canonicalPath,url.origin),301);
    if (url.pathname !== canonicalPath) return Response.redirect(new URL(canonicalPath + url.search, url.origin), 301);
    if (categorySlug && !isKnownCatalogCategoryRoute(categorySlug)) {
      if (!context.env?.DB) return new Response("Danh mục chưa sẵn sàng.", {status:503});
      try {
        const rows = await context.env.DB.prepare("SELECT DISTINCT category FROM products WHERE published=1").all();
        if (!(rows.results || []).some(row => productCategoryRouteSlug(row.category) === categorySlug))
          return new Response("Không tìm thấy danh mục.", {status:404,headers:{"X-Robots-Tag":"noindex, nofollow"}});
      } catch { return new Response("Không thể tải danh mục.", {status:503}); }
    }
    const response = await context.next(new Request(new URL("/index.html",url.origin), {
      method:context.request.method,headers:context.request.headers
    }));
    if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
    let html = await response.text();
    // The shared shell is also used for Home. On a direct catalog URL its
    // Home hero is not the page heading; expose the visible catalog heading
    // as the sole active H1 in the initial response.
    html = html.replace('<h1 class="sdh-title" id="sdh-title">', '<h2 class="sdh-title" id="sdh-title">')
      .replace('<span>từ da cá sấu</span></h1>', '<span>từ da cá sấu</span></h2>')
      .replace('<h2 class="section-title" id="catalogHeading">', '<h1 class="section-title" id="catalogHeading">')
      .replace(/(<h1 class="section-title" id="catalogHeading">[^<]*)<\/h2>/, '$1</h1>');
    const catalogLabels = {
      sneaker: "Giày thể thao (Sneaker)", giayluoi: "Giày lười", giaytay: "Giày tây",
      thatlung: "Thắt lưng", vinamnu: "Ví nam & nữ",
      caplaptop: "Cặp – Tab – Laptop", "tuithoitrang-golf": "Túi thời trang & golf", mu: "Mũ",
      tuixach: "Túi xách",
      dep: "Dép", daydongho: "Dây đồng hồ", oplung: "Ốp điện thoại"
    };
    const categoryName = Object.hasOwn(catalogLabels,categorySlug)
      ? catalogLabels[categorySlug] : categorySlug;
    const seoProfile = catalogSeoProfile(html, categorySlug || "all");
    const catalogTitleBase = seoProfile?.title || (categorySlug ? categoryName + " | SinDarealest" : "Tất cả sản phẩm | SinDarealest");
    const catalogDescriptionBase = seoProfile?.description || (categorySlug
      ? "Khám phá sản phẩm " + categoryName + " tại SinDarealest. Xem thiết kế và mã SKU chính thức."
      : "Khám phá toàn bộ sản phẩm da cá sấu tại SinDarealest.");
    const catalogTitle=requestedPage>1?catalogTitleBase+" – Trang "+requestedPage:catalogTitleBase;
    const catalogDescription=requestedPage>1?catalogDescriptionBase+" Trang "+requestedPage+".":catalogDescriptionBase;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(catalogTitle) + "</title>");
    // Give direct-link visitors and crawlers the correct category heading in
    // the initial HTML, before /api/products completes on a slow connection.
    if(categorySlug) html = html.replace(
      '<h1 class="section-title" id="catalogHeading">Tất cả sản phẩm</h1>',
      '<h1 class="section-title" id="catalogHeading">' + escapeHtml(seoProfile?.heading || categoryName) + '</h1>'
    );
    if (seoProfile?.intro) html = html.replace(
      /(<p class="section-note" id="catalogSeoNote">)[\s\S]*?(<\/p>)/,
      (_, opening, closing) => opening + escapeHtml(seoProfile.intro) + closing
    );
    html = meta(html, "description", catalogDescription);
    html = meta(html, "og:title", catalogTitle, true);
    html = meta(html, "og:description", catalogDescription, true);
    html = meta(html, "og:url", canonicalCatalogUrl, true);
    const catalogOgImage = categorySlug
      ? url.origin + "/og-category/" + encodeURIComponent(categorySlug) + ".jpg"
      : url.origin + "/og-sindarealest-casauvip-20261113.jpg";
    html = meta(html, "og:image", catalogOgImage, true);
    html = meta(html, "og:image:alt", categorySlug ? "SinDarealest — " + categoryName : "SinDarealest — Toàn bộ sản phẩm da cá sấu", true);
    html = meta(html, "og:image:secure_url", catalogOgImage, true);
    html = meta(html, "twitter:title", catalogTitle);
    html = meta(html, "twitter:description", catalogDescription);
    html = meta(html, "twitter:image", catalogOgImage);
    html = meta(html, "twitter:card", "summary_large_image");
    const canonicalTag = '<link rel="canonical" href="' + escapeHtml(canonicalCatalogUrl) + '">';
    html = /<link\s+rel=["']canonical["']/i.test(html)
      ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag)
      : html.replace("</head>", "  " + canonicalTag + "\n</head>");
    html = appendBreadcrumbList(html, url.origin, [
      { name: "Trang chủ", path: "/" },
      { name: "Tất cả sản phẩm", path: "/sanpham" },
      ...(categorySlug ? [{ name: categoryName, path: canonicalPath }] : [])
    ]);
    html = await renderPublicCatalog(html,context.env,url.origin,{categorySlug,page:requestedPage});
    const headers = new Headers(response.headers);
    headers.set("Content-Type","text/html; charset=utf-8");
    headers.set("Cache-Control","public, max-age=60, s-maxage=300");
    for (const key of ["Content-Length","Content-Encoding","ETag"]) headers.delete(key);
    return new Response(html,{status:200,headers:hardenStorefrontHtmlHeaders(headers)});
  }
  // Serve the exact Google Search Console ownership file at its required root URL.
  if (url.pathname === "/googleded292a3607df9dd.html" || url.pathname === "/googleded292a3607df9dd") {
    return new Response("google-site-verification: googleded292a3607df9dd.html", {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
  const legacyMatch = url.pathname.match(/^\/san-pham\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i);
  const modernMatch = url.pathname.match(/^\/sanpham\/([a-z0-9][a-z0-9-]{0,99})\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i);
  if (!legacyMatch && !modernMatch) {
    const response = await context.next();
    if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
    // _redirects has an SPA fallback, so a nonexistent URL otherwise returns
    // homepage HTML with HTTP 200. Keep documented static/legal/admin pages.
    const staticHtml = new Set(["/", "/index.html", "/data-deletion", "/data-deletion.html", "/privacy-policy", "/privacy-policy.html", "/terms-of-service", "/terms-of-service.html", "/payment-result", "/payment-result.html", "/admin", "/admin/", "/admin/index.html"]);
    if (!staticHtml.has(url.pathname)) {
      const html = "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"color-scheme\" content=\"light dark\"><title>Không tìm thấy trang | SinDarealest</title><style>\n*{box-sizing:border-box}\n:root{font-family:Inter,\"Segoe UI\",Arial,sans-serif;color:#173449;background:#eaf3fb}\nbody{min-height:100vh;margin:0;background:radial-gradient(ellipse at 16% 10%,rgba(255,255,255,.96),transparent 43%),radial-gradient(ellipse at 88% 82%,rgba(106,172,215,.25),transparent 42%),linear-gradient(145deg,#eaf3fb,#d9ebf8);display:grid;place-items:center;padding:24px}\nmain{width:min(100%,580px);padding:clamp(28px,6vw,58px);text-align:center;border:1px solid rgba(255,255,255,.9);border-radius:30px;background:rgba(246,251,255,.78);-webkit-backdrop-filter:blur(24px) saturate(145%);backdrop-filter:blur(24px) saturate(145%);box-shadow:0 24px 70px rgba(38,82,116,.16),inset 0 1px 0 rgba(255,255,255,.9)}\n.brand{margin:0 0 20px;color:#9a7445;font:600 12px/1.5 Georgia,serif;letter-spacing:.2em}\n.code{margin:0;color:#176fc5;font-size:clamp(64px,14vw,104px);font-weight:750;letter-spacing:-.08em;line-height:.95}\nh1{margin:20px 0 10px;font:600 clamp(24px,5vw,34px)/1.18 Georgia,serif}\np.message{margin:0 auto;max-width:390px;color:#526a7d;line-height:1.65}\n.actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:28px}\na{min-height:46px;display:inline-flex;align-items:center;justify-content:center;padding:11px 19px;border:1px solid rgba(105,154,190,.42);border-radius:999px;color:#173449;text-decoration:none;font-weight:650;background:rgba(255,255,255,.58);transition:transform .16s ease,background-color .16s ease}\na.primary{color:white;background:linear-gradient(135deg,#238be0,#1264b8);border-color:transparent;box-shadow:0 8px 20px rgba(35,119,190,.2)}\na:hover{transform:translateY(-1px);background-color:rgba(255,255,255,.9)}\na:focus-visible{outline:3px solid #176fc5;outline-offset:3px}\n@media(prefers-color-scheme:dark){:root{color:#edf7ff;background:#061522}body{background:radial-gradient(ellipse at 16% 10%,rgba(61,103,134,.35),transparent 43%),radial-gradient(ellipse at 88% 82%,rgba(14,92,146,.28),transparent 42%),linear-gradient(145deg,#061522,#0b2740)}main{background:rgba(8,31,51,.84);border-color:rgba(175,211,237,.3);box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.1)}.brand{color:#d7b67d}p.message{color:#b5cde0}a{color:#edf7ff;background:rgba(24,54,77,.74);border-color:rgba(155,198,229,.38)}}\n@media(prefers-reduced-motion:reduce){a{transition:none}}\n</style></head><body><main><p class=\"brand\">SINDAREALEST · SIGNATURE</p><p class=\"code\" aria-hidden=\"true\">404</p><h1>Không tìm thấy trang</h1><p class=\"message\">Đường dẫn này không còn tồn tại hoặc đã được thay đổi. Bạn có thể quay về trang chủ hoặc tiếp tục khám phá sản phẩm.</p><nav class=\"actions\" aria-label=\"Điều hướng\"><a class=\"primary\" href=\"/\">Về trang chủ</a><a href=\"/sanpham\">Khám phá sản phẩm</a></nav></main></body></html>";
      return new Response(html, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
    }
    if (!["/", "/index.html"].includes(url.pathname)) return response;
    let html = await response.text();
    html = meta(html, "og:url", `${url.origin}/`, true);
    html = meta(html, "og:image", `${url.origin}/og-sindarealest-casauvip-20261113.jpg`, true);
    html = meta(html, "og:image:secure_url", `${url.origin}/og-sindarealest-casauvip-20261113.jpg`, true);
    html = meta(html, "twitter:image", `${url.origin}/og-sindarealest-casauvip-20261113.jpg`);
    // Structured organization identity is available to crawlers without JS.
    const organizationSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": ["Organization", "LocalBusiness"],
      "@id": `${url.origin}/#business`,
      name: "SinDarealest", url: `${url.origin}/`,
      logo: `${url.origin}/images/brand-emblem.png`,
      image: `${url.origin}/og-sindarealest-casauvip-20261113.jpg`,
      telephone: "+84827049192",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Hẻm 48 Võ Trường Toàn",
        addressLocality: "Đà Lạt",
        addressRegion: "Lâm Đồng",
        addressCountry: "VN"
      }
    });
    if (!html.includes('"@type":"LocalBusiness"') && !html.includes('"@type":["Organization","LocalBusiness"]')) {
      html = html.replace("</head>", `  <script type="application/ld+json">${organizationSchema}</script>\n</head>`);
    }
    // Google site-name: the canonical home root declares one WebSite identity.
    const siteNameSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": "WebSite",
      name: "SinDarealest", url: `${url.origin}/`
    });
    if (!html.includes('"@type":"WebSite"')) {
      html = html.replace("</head>", `  <script type="application/ld+json">${siteNameSchema}</script>\n</head>`);
    }
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(`${url.origin}/`)}">`;
    html = /<link\s+rel=["']canonical["']/i.test(html) ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag) : html.replace("</head>", `  ${canonicalTag}\n</head>`);
    html = await renderPublicCatalog(html,context.env,url.origin,{home:true});
    // Add a crawlable path to the knowledge hub in both storefront navigation
    // menus without rewriting the large shared app shell asset.
    const productsLink='<a class="navlink tap-target" href="/sanpham" data-nav="products">Sản phẩm</a>';
    if(html.split(productsLink).length-1===2)
      html=html.replaceAll(productsLink,productsLink+'<a class="navlink tap-target" href="/kien-thuc/">Kiến thức</a>');
    const headers = new Headers(response.headers); headers.set("Content-Type", "text/html; charset=utf-8"); headers.delete("Content-Length"); headers.delete("Content-Encoding"); headers.delete("ETag");
    return new Response(html, { status: response.status, headers:hardenStorefrontHtmlHeaders(headers) });
  }
  // Match the catalog route contract: product-detail HTML is read-only.
  // Never turn an unsupported POST/PATCH/DELETE into an internal GET.
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405, headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store" }
    });
  }
  if (url.pathname.toLowerCase() === "/sanpham/sneaker/sd-gl062")
    return Response.redirect(new URL("/sanpham/sneaker/SD-SN113", url.origin), 301);
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
  const sourceImage = Array.isArray(images) ? images.find(value =>
    typeof value === "string" && (/^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(value)
      || /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(value))) : "";
  const productImagePath = sourceImage ? (sourceImage.startsWith("/") ? sourceImage : `/${sourceImage}`) : "/images/theme-croc-dark.webp";
  const imagePath = "/og-image/" + encodeURIComponent(slug) + ".jpg";
  const canonical = `${url.origin}${canonicalPath}`;
  const verifiedSku = isVerifiedCommercialSku(product) ? String(product.sku).trim() : "";
  let title = `${product.title}${verifiedSku ? ` – ${verifiedSku}` : ""} | SinDarealest`;
  const descriptionBase = String(product.description || `${product.title} — ${product.category_label || "Thời trang da cá sấu cao cấp"}. Liên hệ SinDarealest để được tư vấn chi tiết.`).replace(/\s+/g, " ").trim();
  const productCategoryName = String(product.category_label || "Thời trang da cá sấu").trim();
  const productPriceLine = Number(product.source_price_confirmed) === 1 && Number.isFinite(Number(product.price)) && Number(product.price) > 0
    ? ` Giá ${new Intl.NumberFormat("vi-VN").format(Number(product.price))}đ.` : " Liên hệ Zalo để nhận báo giá.";
  let description = `${product.title} – ${productCategoryName} da cá sấu thật.${productPriceLine} ${descriptionBase}`.slice(0, 300);
  if (verifiedSku) description = `${description.slice(0, 250)} · Mã ${verifiedSku}`.slice(0,300);
  const response = await context.next(new Request(new URL("/index.html", url.origin), { method: "GET", headers: context.request.headers }));
  if (!response.ok) return response;
  let html = await response.text();
  // The direct product URL should have its own heading in rendered DOM and
  // in the server response, while preserving the existing modal presentation.
  html = html.replace('<h1 class="sdh-title" id="sdh-title">', '<h2 class="sdh-title" id="sdh-title">')
    .replace('<span>từ da cá sấu</span></h1>', '<span>từ da cá sấu</span></h2>')
    .replace('<h1 id="detailTitle"></h1>', '<h1 id="detailTitle">' + escapeHtml(product.title) + '</h1>');
  // Preserve real Admin titles/descriptions. For a short, generic product
  // title, add the matching category context only when absent and supported
  // by the public category route; never invent product prices or attributes.
  const productSeo = catalogSeoProfile(html, productCategoryRouteSlug(product.category));
  if (productSeo?.heading && /da cá sấu/i.test(productSeo.heading)) {
    const productName = String(product.title || "").trim();
    if (productName.length <= 48 && !/cá sấu/i.test(productName))
      title = productName + " – " + productSeo.heading + (verifiedSku ? " – " + verifiedSku : "") + " | SinDarealest";
    if (description.length <= 145 && !/cá sấu/i.test(description))
      description = (description + " Khám phá " + productSeo.heading + " tại SinDarealest.").slice(0,270);
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = meta(html, "description", description);
  html = meta(html, "og:type", "product", true);
  html = meta(html, "og:site_name", "SinDarealest", true);
  html = meta(html, "og:title", title, true);
  html = meta(html, "og:description", description, true);
  html = meta(html, "og:url", canonical, true);
  html = meta(html, "og:image", new URL(imagePath, url.origin).href, true);
  html = meta(html, "og:image:secure_url", new URL(imagePath, url.origin).href, true);
  html = meta(html, "og:image:type", "image/jpeg", true);
  html = meta(html, "og:image:alt", product.title, true);
  html = meta(html, "twitter:card", "summary_large_image");
  html = meta(html, "twitter:title", title);
  html = meta(html, "twitter:description", description);
  html = meta(html, "twitter:image", new URL(imagePath, url.origin).href);
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}">`;
  html = /<link\s+rel=["']canonical["']/i.test(html) ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag) : html.replace("</head>", `  ${canonicalTag}\n</head>`);
  // Breadcrumb hierarchy follows the actual catalog and canonical product route.
  // Keep the original Admin product name, not the keyword-expanded SEO title.
  const categorySlug = productCategoryRouteSlug(product.category);
  const categoryLabels = {
    sneaker: "Giày thể thao", giayluoi: "Giày lười", giaytay: "Giày tây",
    thatlung: "Thắt lưng", vinam: "Ví nam", vicamtay: "Ví cầm tay",
    caplaptop: "Cặp – Tab – Laptop", clutch: "Clutch", mu: "Mũ",
    tuideocheo: "Túi đeo chéo", tuigolf: "Túi golf", tuinu: "Túi nữ",
    dep: "Dép", daydongho: "Dây đồng hồ", oplung: "Ốp điện thoại"
  };
  html = appendBreadcrumbList(html, url.origin, [
    { name: "Trang chủ", path: "/" },
    { name: "Tất cả sản phẩm", path: "/sanpham" },
    { name: categoryLabels[categorySlug] || String(product.category || "Danh mục"), path: "/sanpham/" + categorySlug },
    { name: product.title, path: canonicalPath }
  ]);
  const hasPublicOffer = Number(product.source_price_confirmed) === 1
    && Number.isFinite(Number(product.price)) && Number(product.price) > 0;
  const productSchema = {
    "@context": "https://schema.org", "@type": "Product",
    name: product.title,
    description,
    image: new URL(productImagePath, url.origin).href,
    url: canonical,
    category: product.category_label || String(product.category || ""),
    brand: { "@type": "Brand", name: "SinDarealest" },
    ...(verifiedSku ? { sku: verifiedSku } : {}),
    ...(hasPublicOffer ? { offers: {
      "@type": "Offer", url: canonical, priceCurrency: "VND",
      price: Number(product.price),
      // SinDarealest sells online only; this is a channel statement, not an
      // inventory claim. Do not infer stock status for made-to-order items.
      availability: "https://schema.org/OnlineOnly",
      // Reference the public organization-level shipping policy. Its
      // description preserves the full-payment free-shipping condition;
      // do not turn it into a universal zero-rate offer or invent transit days.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        // Stable production entity IDs keep Preview and Production references
        // connected to the same public organization and shipping policy.
        hasShippingService: { "@id": "https://casauvip.store/terms-of-service#shipping-policy" }
      },
      // The public policy page documents deposit-specific exclusions and the video requirement.
      hasMerchantReturnPolicy: { "@id": "https://casauvip.store/terms-of-service#return-policy" },
      seller: { "@id": "https://casauvip.store/#business" }
    } } : {})
  };
  const schema = JSON.stringify(productSchema).replace(/</g, "\\u003c");
  html = html.replace("</head>", `  <script type="application/ld+json">${schema}</script>\n</head>`);
  const noJsPrice = hasPublicOffer
    ? `<p><strong>Giá:</strong> ${escapeHtml(new Intl.NumberFormat("vi-VN").format(Number(product.price)))}₫</p>` : "";
  const noJsQuote = hasPublicOffer ? "" : '<p>Liên hệ Zalo để nhận báo giá.</p>';
  const noJsImageAlt = `${product.category_label || product.category || "Sản phẩm"} da cá sấu thật${verifiedSku ? `, mã ${verifiedSku}` : ""}`;
  const noJsSummary = `<noscript><main class="sd-product-nojs"><h1>${escapeHtml(product.title)}</h1><img src="${escapeHtml(productImagePath)}" alt="${escapeHtml(noJsImageAlt)}"><p><strong>Danh mục:</strong> ${escapeHtml(product.category_label || product.category || "Sản phẩm da cá sấu")}</p>${verifiedSku ? `<p><strong>Mã sản phẩm:</strong> ${escapeHtml(verifiedSku)}</p>` : ""}${noJsPrice}${noJsQuote}<p>${escapeHtml(product.description || description)}</p></main></noscript>`;
  html = html.replace(/<body([^>]*)>/i, `$&${noJsSummary}`);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60, s-maxage=300"); headers.delete("Content-Length"); headers.delete("Content-Encoding"); headers.delete("ETag");
  return new Response(html, { status: response.status, headers:hardenStorefrontHtmlHeaders(headers) });
}
