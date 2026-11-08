import { createSession, sessionCookie, verifySession } from "./_lib.js";
import { sendAdminPush } from "./_notifications.js";
import { renderPublicCatalog } from "./_catalog-ssr.js";
import { canonicalProductPath, isVerifiedCommercialSku, productCategoryRouteSlug, isKnownCatalogCategoryRoute, catalogListingPath } from "./_storefront-route.js";
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
    html=meta(html,"og:image",url.origin+"/og-sindarealest-crisp-20261028.jpg",true);
    html=meta(html,"og:image:secure_url",url.origin+"/og-sindarealest-crisp-20261028.jpg",true);
    html=meta(html,"twitter:title",title);
    html=meta(html,"twitter:description",description);
    html=meta(html,"twitter:image",url.origin+"/og-sindarealest-crisp-20261028.jpg");
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
      '<h2 class="section-title" id="catalogHeading">Tất cả sản phẩm</h2>',
      '<h2 class="section-title" id="catalogHeading">' + escapeHtml(seoProfile?.heading || categoryName) + '</h2>'
    );
    if (seoProfile?.intro) html = html.replace(
      /(<p class="section-note" id="catalogSeoNote">)[\s\S]*?(<\/p>)/,
      (_, opening, closing) => opening + escapeHtml(seoProfile.intro) + closing
    );
    html = meta(html, "description", catalogDescription);
    html = meta(html, "og:title", catalogTitle, true);
    html = meta(html, "og:description", catalogDescription, true);
    html = meta(html, "og:url", canonicalCatalogUrl, true);
    // Image URLs MUST be absolute for Zalo/Facebook/Messenger and other
    // link-preview crawlers. Use the real brand's existing 1200x630 JPEG.
    html = meta(html, "og:image", url.origin + "/og-sindarealest-crisp-20261028.jpg", true);
    html = meta(html, "og:image:alt", categorySlug ? "SinDarealest — " + categoryName : "SinDarealest — Toàn bộ sản phẩm da cá sấu", true);
    html = meta(html, "og:image:secure_url", url.origin + "/og-sindarealest-crisp-20261028.jpg", true);
    html = meta(html, "twitter:title", catalogTitle);
    html = meta(html, "twitter:description", catalogDescription);
    html = meta(html, "twitter:image", url.origin + "/og-sindarealest-crisp-20261028.jpg");
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
      return new Response("Không tìm thấy trang.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    if (!["/", "/index.html"].includes(url.pathname)) return response;
    let html = await response.text();
    html = meta(html, "og:url", `${url.origin}/`, true);
    html = meta(html, "og:image", `${url.origin}/og-sindarealest-crisp-20261028.jpg`, true);
    html = meta(html, "og:image:secure_url", `${url.origin}/og-sindarealest-crisp-20261028.jpg`, true);
    html = meta(html, "twitter:image", `${url.origin}/og-sindarealest-crisp-20261028.jpg`);
    // Structured organization identity is available to crawlers without JS.
    const organizationSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": "Organization",
      name: "SinDarealest", url: `${url.origin}/`,
      logo: `${url.origin}/images/brand-emblem.png`
    });
    if (!html.includes('"@type":"Organization"')) {
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
  const imagePath = /^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(candidateImage) ? `/${candidateImage}` : /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(candidateImage) ? candidateImage : "/og-sindarealest-crisp-20261028.jpg";
  const canonical = `${url.origin}${canonicalPath}`;
  let title = `${product.title} | SinDarealest`;
  const descriptionBase = String(product.description || `${product.title} — ${product.category_label || "Thời trang da cá sấu cao cấp"}. Liên hệ SinDarealest để được tư vấn chi tiết.`).replace(/\s+/g, " ").trim();
  let description = (isVerifiedCommercialSku(product) ? `${descriptionBase.slice(0, 250)} · SKU: ${product.sku}` : descriptionBase).slice(0, 300);
  const response = await context.next(new Request(new URL("/index.html", url.origin), { method: "GET", headers: context.request.headers }));
  if (!response.ok) return response;
  let html = await response.text();
  // Preserve real Admin titles/descriptions. For a short, generic product
  // title, add the matching category context only when absent and supported
  // by the public category route; never invent product prices or attributes.
  const productSeo = catalogSeoProfile(html, productCategoryRouteSlug(product.category));
  if (productSeo?.heading && /da cá sấu/i.test(productSeo.heading)) {
    const productName = String(product.title || "").trim();
    if (productName.length <= 48 && !/cá sấu/i.test(productName))
      title = productName + " – " + productSeo.heading + " | SinDarealest";
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
  html = meta(html, "og:image:type", imagePath.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg", true);
  if (imagePath.toLowerCase().endsWith(".webp")) {
    // The product's original WebP dimensions are not the homepage OG dimensions.
    html = html.replace(/<meta\\s+property=["']og:image:(?:width|height)["'][^>]*>\\s*/gi, "");
  }
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
  // No publicly verified Offer, customer review, or aggregate rating is
  // available here. Declaring Product without one of these causes a Google
  // product-snippet error. Keep a truthful indexable WebPage schema instead
  // of inventing a price, inventory status, rating or review.
  const schema = JSON.stringify({
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, description, url: canonical,
    primaryImageOfPage: new URL(imagePath, url.origin).href,
    publisher: { "@type": "Organization", name: "SinDarealest" }
  }).replace(/<\//g, "<\\/");
  html = html.replace("</head>", `  <script type="application/ld+json">${schema}</script>\n</head>`);
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60, s-maxage=300"); headers.delete("Content-Length"); headers.delete("Content-Encoding"); headers.delete("ETag");
  return new Response(html, { status: response.status, headers:hardenStorefrontHtmlHeaders(headers) });
}
