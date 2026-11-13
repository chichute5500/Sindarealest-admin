import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { onRequest } from "../functions/_middleware.js";
import { KNOWLEDGE_SLUGS } from "../functions/_knowledge-routes.js";

const root = process.cwd();
const knowledgeCss = readFileSync(resolve(root, "public/kien-thuc/knowledge.css"), "utf8");
const knowledgeJs = readFileSync(resolve(root, "public/kien-thuc/knowledge.js"), "utf8");
assert.equal(KNOWLEDGE_SLUGS.length, 11, "Week 11 checklist is integrated into week 1, so only 11 distinct article URLs exist");
assert.equal(new Set(KNOWLEDGE_SLUGS).size, KNOWLEDGE_SLUGS.length, "Article routes must be unique");
assert.match(knowledgeCss, /\.related ul\s*\{[^}]*display:\s*flex/s, "Shared knowledge stylesheet must keep related article links in responsive chips");
assert.match(knowledgeCss, /@media\s*\(max-width:\s*960px\)/, "Knowledge navigation must collapse before the header runs out of room");
assert.match(knowledgeJs, /event\.key === "Escape"/, "Knowledge menu must close with Escape");
assert.match(knowledgeJs, /backdrop\.addEventListener\("click"/, "Knowledge menu must close from its backdrop");
assert.match(knowledgeJs, /aria-expanded/, "Knowledge menu must expose its open state to assistive technology");
assert.match(knowledgeJs, /sessionStorage\.setItem\(THEME_KEY/, "Knowledge theme choice must persist for the browser session");

async function dispatch(path, method = "GET", host = "preview.example") {
  let assetPath = "";
  const request = new Request("https://" + host + path, { method });
  const response = await onRequest({
    request,
    env: {},
    next: async (rewritten) => {
      const requestedPath = rewritten ? new URL(rewritten.url).pathname : new URL(request.url).pathname;
      assetPath = requestedPath === "/" ? "/index.html" : requestedPath;
      const file = resolve(root, "public", assetPath.replace(/^\/+/, ""));
      try {
        const contentType = assetPath.endsWith(".css") ? "text/css; charset=utf-8"
          : assetPath.endsWith(".js") ? "application/javascript; charset=utf-8"
          : assetPath.endsWith(".webp") ? "image/webp" : "text/html; charset=utf-8";
        return new Response(readFileSync(file), {
          status: 200,
          headers: { "Content-Type": contentType }
        });
      } catch {
        return new Response("<html><body>SPA fallback</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }
  });
  return { response, assetPath };
}

const home = await dispatch("/");
assert.equal(home.response.status, 200);
const homeHtml = await home.response.text();
assert.match(homeHtml, /@media\(max-width:960px\) and \(min-width:761px\)/,
  "Storefront navigation must collapse into a visible menu before its PC header overflows");
assert.match(homeHtml, /matchMedia\('\(min-width:961px\)'\)[\s\S]{0,300}closeMobileMenuOnDesktop/,
  "An open storefront menu must reset when the viewport returns to wide desktop");
const homeTitle = "SinDarealest | Giày, Ví, Thắt Lưng & Phụ Kiện Da Cá Sấu Thật 100%";
const homeDescription = "Thương hiệu đồ da cá sấu thủ công SinDarealest: Giày Sneaker, Giày lười, Giày tây, Ví nam nữ, Thắt lưng liền nguyên tấm & Phụ kiện da cá sấu thật 100%. Bảo hành 6–12 tháng, bảo dưỡng trọn đời.";
const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
assert.ok(homeHtml.includes("<title>" + escapeAttribute(homeTitle) + "</title>"), "Server-rendered home title must use the approved storefront title");
assert.ok(homeHtml.includes('<meta name="description" content="' + escapeAttribute(homeDescription) + '">'), "Server-rendered home description must use the approved storefront copy");
assert.ok(homeHtml.includes("const SD_HOME_TITLE='" + homeTitle + "';"), "The client-side home title must match the server title");
assert.ok(homeHtml.includes("const SD_HOME_DESCRIPTION='" + homeDescription + "';"), "The client-side home description must match the server description");
assert.ok(homeHtml.includes("document.title=SD_HOME_TITLE;"), "Returning from a product detail must restore the canonical home title");
assert.ok(homeHtml.includes("sdSetMeta('meta[name=\"description\"]',SD_HOME_DESCRIPTION)"), "Returning from a product detail must restore the canonical home description");
assert.equal((homeHtml.match(/href="\/kien-thuc\/"/g) || []).length, 3,
  "The home page must expose the hub in both navigation menus and the featured section");
const featuredKnowledge = homeHtml.match(/<section class="section wrap sd-home-knowledge"[^]*?<\/section>/)?.[0] || "";
assert.ok(featuredKnowledge, "Home page must include a featured knowledge section before the footer");
assert.match(featuredKnowledge, /<h2[^>]*>Cẩm nang chọn &amp; chăm sóc đồ da cá sấu<\/h2>/);
assert.equal((featuredKnowledge.match(/class="glass-soft sd-home-knowledge-card"/g) || []).length, 4,
  "The homepage should feature four Liquid Glass knowledge cards");
for (const [path,title] of [
  ["/kien-thuc/phan-biet-da-ca-sau-that-da-dap-van/", "Phân biệt da cá sấu thật và da dập vân: cần kiểm tra gì?"],
  ["/kien-thuc/da-bung-da-lung-da-hong-ca-sau/", "Da bụng, da lưng và da hông cá sấu khác nhau thế nào?"],
  ["/kien-thuc/chon-that-lung-da-ca-sau/", "Chọn thắt lưng da cá sấu: bản dây, khóa và cách đo size"],
  ["/kien-thuc/chon-size-giay-da-ca-sau-online/", "Cách chọn size giày da cá sấu khi mua online"]
]) {
  assert.ok(featuredKnowledge.includes('href="' + path + '"'), "Featured knowledge section must link to " + path);
  assert.ok(featuredKnowledge.includes("<h3>" + title + "</h3>"), "Featured knowledge title must match " + path);
}
assert.ok(featuredKnowledge.includes('href="/kien-thuc/">Xem tất cả 11 bài viết'), "The home page must link to all 11 knowledge articles");
const homeSchemas = [...homeHtml.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)].map(([, value]) => JSON.parse(value));
const businessSchema = homeSchemas.find((schema) => Array.isArray(schema["@type"]) && schema["@type"].includes("LocalBusiness"));
assert.deepEqual(businessSchema?.sameAs, [
  "https://www.facebook.com/ThoiTrangDaCaSau",
  "https://www.instagram.com/dacasau.sindarealest/",
  "https://shopee.vn/dacasau.sindarealest"
], "The home business schema must include official social and Shopee profiles");

const hub = await dispatch("/kien-thuc/");
assert.equal(hub.response.status, 200);
assert.equal(hub.assetPath, "/kien-thuc/index.html");
const hubHtml = await hub.response.text();
assert.match(hubHtml, /Kiến thức và hướng dẫn chọn đồ da cá sấu/);
assert.ok(hubHtml.includes('href="/kien-thuc/knowledge.css?v=20261113"'), "Hub must use the shared Liquid Glass stylesheet");
assert.ok(hubHtml.includes('src="/kien-thuc/knowledge.js?v=20261113"'), "Hub must load the accessible menu and theme controls");
assert.ok(hubHtml.includes('id="knowledgeMenuToggle"'), "Hub must expose the responsive menu control");
assert.match(hub.response.headers.get("X-Robots-Tag") || "", /noindex, nofollow/);
assert.equal((hubHtml.match(/<article class="card">/g) || []).length, 11,
  "Preview hub should expose the 11 approved, distinct article URLs");
for (const [path, contentType, expectedContent] of [
  ["/kien-thuc/knowledge.css?v=20261113", "text/css", ".site-head"],
  ["/kien-thuc/knowledge.js?v=20261113", "application/javascript", "THEME_KEY"]
]) {
  const asset = await dispatch(path);
  assert.equal(asset.response.status, 200, path + " must pass through the Knowledge page router to static assets");
  assert.match(asset.response.headers.get("Content-Type") || "", new RegExp(contentType));
  assert.ok((await asset.response.text()).includes(expectedContent), path + " must return the real asset body");
}
const productionHub = await dispatch("/kien-thuc/", "GET", "casauvip.store");
assert.equal(productionHub.response.status, 200);
assert.equal(productionHub.response.headers.get("X-Robots-Tag"), "index, follow");
const productionHubHtml = await productionHub.response.text();
assert.match(productionHubHtml, /name="robots" content="index, follow"/);
assert.equal((productionHubHtml.match(/<article class="card">/g) || []).length, 11,
  "Production hub must expose all approved articles");
assert.ok(productionHubHtml.includes('src="/media/239f9df4-0112-495b-94e3-5f9412ec7f43.webp" alt="Ví da cá sấu gù 8 đỉnh, mã SD-VN024."'),
  "The knowledge hub card must use the SD-VN024 product image.");
assert.doesNotMatch(productionHubHtml, /Đọc bản nháp|Bản nháp|Tuần 2|Tuần 12|Từ khóa chính:|Từ khóa phụ:|Người kiểm tra:/);
for (const slug of KNOWLEDGE_SLUGS) {
  assert.ok(productionHubHtml.includes('href="/kien-thuc/' + slug + '/"'),
    "Production hub must link to approved article " + slug);
}
assert.match(productionHubHtml, /Đồ da cá sấu theo từng danh mục/);
for (const categoryPath of [
  "/sanpham/sneaker", "/sanpham/giayluoi", "/sanpham/giaytay",
  "/sanpham/thatlung", "/sanpham/vinamnu", "/sanpham/dep",
  "/sanpham/daydongho", "/sanpham/oplung", "/sanpham/caplaptop",
  "/sanpham/tuithoitrang-golf", "/sanpham/tuixach"
]) {
  assert.ok(productionHubHtml.includes('href="' + categoryPath + '"'),
    "The public knowledge hub must link to product category " + categoryPath);
}
assert.doesNotMatch(productionHubHtml, /loài cá sấu|môi trường sống|thức ăn của cá sấu/i,
  "The product-focused hub must not target animal/species search intent");

const articleSlug = KNOWLEDGE_SLUGS[0];
const article = await dispatch("/kien-thuc/" + articleSlug + "/");
assert.equal(article.response.status, 200);
assert.equal(article.assetPath, "/kien-thuc/" + articleSlug + "/index.html");
const articleHtml = await article.response.text();
assert.equal(articleSlug, "phan-biet-da-ca-sau-that-da-dap-van", "The eleventh article slug remains the first approved production route");
assert.match(articleHtml, /<h1\b/);
assert.match(articleHtml, /rel="canonical" href="https:\/\/casauvip\.store\/kien-thuc\//);
assert.match(articleHtml, /name="robots" content="noindex,nofollow"/);
assert.match(article.response.headers.get("X-Robots-Tag") || "", /noindex, nofollow/);
assert.doesNotMatch(articleHtml, /Từ khóa chính:|Từ khóa phụ:|Ý định:|Bản nháp, chưa xuất bản|TUẦN 1/);
assert.match(articleHtml, /Người kiểm duyệt nội dung: Công Chí · 5 năm kinh nghiệm/);
assert.match(articleHtml, /id="checklist-cau-hoi-theo-sku"/);
assert.doesNotMatch(articleHtml, /AI cũng chỉ có thể mô tả|theo chú thích của chủ doanh nghiệp|do chủ doanh nghiệp cung cấp/i);
assert.match(articleHtml, /Lưu ý:<\/strong> Ảnh trong bài chỉ giúp nhận biết ban đầu, không xác nhận chất liệu/i);
assert.match(articleHtml, /rãnh vân khá nông và đều/i);
assert.match(articleHtml, /nhịp lặp theo chu kỳ/i);
assert.match(articleHtml, /khuôn ép/i);
assert.match(articleHtml, /vảy vuông hoặc tròn/i);
assert.match(articleHtml, /rãnh khớp nối sâu/i);
assert.match(articleHtml, /ISO \(cơ quan cảm giác\)/i);
assert.match(articleHtml, /gờ gù và gai lưng nhô cao, phân bố bất đối xứng/i);
assert.match(articleHtml, /vảy chân nhỏ xếp lớp tự nhiên/i);
assert.match(articleHtml, /Không cắt, đốt, cào, nhỏ hóa chất hoặc thử nước/i);
assert.match(articleHtml, /lớp nền bên dưới có thể là da bò thật hoặc vật liệu tổng hợp/i);

assert.match(articleHtml, /name="description" content="[^"]{1,155}"/);
assert.match(articleHtml, /<h1>Phân biệt da cá sấu thật và da dập vân: cần kiểm tra gì\?<\/h1>/);

assert.ok(articleHtml.includes('src="/media/239f9df4-0112-495b-94e3-5f9412ec7f43.webp" alt="Ví da cá sấu gù 8 đỉnh, mã SD-VN024."'));
assert.ok(articleHtml.includes("<figcaption>Ví da cá sấu gù 8 đỉnh, mã SD-VN024.</figcaption>"));
assert.equal((articleHtml.match(/owner-(?:embossed-0[12]|real-belly-0[12]|real-back-parts)-20261112\.webp/g) || []).length, 10,
  "Week 1 must show five owner reference images in HTML and Article schema");
const jsonLd = [...articleHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(([, value]) => JSON.parse(value));
const articleSchema = jsonLd.find((schema) => schema["@type"] === "Article");
assert.ok(articleSchema);
assert.equal(articleSchema.reviewedBy?.name, "Công Chí");
const relatedBlock = articleHtml.match(/<nav class="related" aria-label="Bài viết kiến thức liên quan">[^]*?<\/nav>/)?.[0] || "";
assert.ok(relatedBlock, "The latest article must use the shared related-knowledge navigation pattern");
assert.ok(articleHtml.includes('href="/kien-thuc/knowledge.css?v=20261113"'), "Article must use the shared Liquid Glass stylesheet");
assert.match(knowledgeCss, /\.related ul\s*\{[^}]*display:\s*flex/s, "The latest article related links must use a responsive chip layout");
for (const [path,title] of [
  ["/kien-thuc/da-bung-da-lung-da-hong-ca-sau/", "Da bụng, da lưng và da hông cá sấu khác nhau thế nào?"],
  ["/kien-thuc/da-ca-sau-that-co-ben-khong/", "Đồ da cá sấu thật có bền không?"],
  ["/kien-thuc/cach-chon-vi-da-ca-sau-nam/", "Cách chọn ví da cá sấu nam theo nhu cầu sử dụng"],
  ["/kien-thuc/chon-that-lung-da-ca-sau/", "Chọn thắt lưng da cá sấu: bản dây, khóa và cách đo size"]
]) {
  assert.ok(relatedBlock.includes('href="' + path + '"'), "The related block must link to " + path);
  assert.ok(relatedBlock.includes(">" + title + "</a>"), "The related link title must match " + path);
}
assert.doesNotMatch(articleHtml, /Đọc tiếp và xem sản phẩm/, "The old product-tag block should be replaced by related knowledge links");
const faqSchema = jsonLd.find((schema) => schema["@type"] === "FAQPage");
assert.equal(faqSchema?.mainEntity?.length, 5, "FAQ schema must match the five visible questions");
for (const question of faqSchema.mainEntity) assert.ok(articleHtml.includes(question.name));
assert.match(articleHtml, /src="\/media\/239f9df4-0112-495b-94e3-5f9412ec7f43\.webp"/);

const productionArticle = await dispatch("/kien-thuc/" + articleSlug + "/", "GET", "casauvip.store");
assert.equal(productionArticle.response.status, 200);
assert.equal(productionArticle.response.headers.get("X-Robots-Tag"), "index, follow");
assert.match(await productionArticle.response.text(), /name="robots" content="index, follow"/);
for (const publishedSlug of KNOWLEDGE_SLUGS) {
  const published = await dispatch("/kien-thuc/" + publishedSlug + "/", "GET", "casauvip.store");
  assert.equal(published.response.status, 200, publishedSlug + " must serve on Production");
  assert.equal(published.response.headers.get("X-Robots-Tag"), "index, follow");
  const publishedHtml = await published.response.text();
  assert.match(publishedHtml, /name="robots" content="index, follow"/);
  assert.ok(publishedHtml.includes('rel="canonical" href="https://casauvip.store/kien-thuc/' + publishedSlug + '/"'),
    publishedSlug + " must have the trailing-slash canonical listed in the sitemap");
  assert.doesNotMatch(publishedHtml, /href=["']\/(?:tra-cuu|lien-he|gioi-thieu)\/?["']/,
    publishedSlug + " must not link to a legacy short route");
  const missingSlash = await dispatch("/kien-thuc/" + publishedSlug);
  assert.equal(missingSlash.response.status, 301, publishedSlug + " without a trailing slash should canonicalize");
  assert.equal(missingSlash.response.headers.get("Location"), "https://preview.example/kien-thuc/" + publishedSlug + "/");
  const previewRoute = await dispatch("/kien-thuc/" + publishedSlug + "/");
  assert.equal(previewRoute.response.status, 200, publishedSlug + " must remain available in Preview");
  assert.equal(previewRoute.response.headers.get("X-Robots-Tag"), "noindex, nofollow");
}

const normalized = await dispatch("/kien-thuc/" + articleSlug);
assert.equal(normalized.response.status, 301);
assert.equal(normalized.response.headers.get("Location"), "https://preview.example/kien-thuc/" + articleSlug + "/");

const missing = await dispatch("/kien-thuc/not-a-real-article/");
assert.equal(missing.response.status, 404, "Unknown knowledge routes must not resolve through the SPA fallback");
const unsupported = await dispatch("/kien-thuc/", "POST");
assert.equal(unsupported.response.status, 405);
const sitemap = readFileSync(resolve(root, "public/sitemap-pages.xml"), "utf8");
assert.match(sitemap, /<loc>https:\/\/casauvip\.store\/kien-thuc\/<\/loc>/);
const hubSitemapEntry = sitemap.match(/<url><loc>https:\/\/casauvip\.store\/kien-thuc\/<\/loc>.*?<\/url>/)?.[0] || "";
assert.ok(hubSitemapEntry, "The hub must have a sitemap entry");
assert.doesNotMatch(hubSitemapEntry, /<lastmod>/, "Do not advertise an unverified modification date for an unchanged hub");
assert.match(sitemap, /<loc>https:\/\/casauvip\.store\/kien-thuc\/phan-biet-da-ca-sau-that-da-dap-van\/<\/loc>/);
for (const publishedSlug of KNOWLEDGE_SLUGS) {
  const loc = "https://casauvip.store/kien-thuc/" + publishedSlug + "/";
  assert.ok(sitemap.includes("<loc>" + loc + "</loc>"), publishedSlug + " must be in page sitemap");
  assert.equal(sitemap.split("<loc>" + loc + "</loc>").length - 1, 1,
    publishedSlug + " must have exactly one sitemap URL");
}

for (const slug of KNOWLEDGE_SLUGS) {
  const path = resolve(root, "public/kien-thuc", slug, "index.html");
  const html = readFileSync(path, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/name="description" content="([^"]*)"/)?.[1] || "";
  if (slug === "bao-quan-do-da-ca-sau-tai-nha") {
    assert.equal(title, "Cách bảo quản đồ da cá sấu tại nhà (Ví, Thắt lưng, Túi) bền đẹp | SinDarealest");
    assert.ok(title.length < 100, slug + " title should remain within a readable search-result length");
  } else if (slug === "ve-sinh-bao-duong-giay-da-ca-sau") {
    assert.equal(title, "Hướng dẫn vệ sinh và bảo dưỡng giày da cá sấu đúng chuẩn | SinDarealest");
    assert.ok(title.length < 100, slug + " title should remain within a readable search-result length");
  } else {
    assert.ok(title && title.length < 60, slug + " needs a concise title under 60 characters");
  }
  assert.ok(description && description.length < 160, slug + " needs a description under 160 characters");
  assert.match(html, /name="robots" content="noindex,nofollow"/, slug + " must retain private static robots metadata");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, slug + " must have exactly one main heading");
  assert.match(html, /<script type="application\/ld\+json">.*?BreadcrumbList/, slug + " needs breadcrumb data");
  if (slug === articleSlug) {
    assert.ok(html.includes('src="/media/239f9df4-0112-495b-94e3-5f9412ec7f43.webp"'),
      slug + " must use the verified SD-VN024 cover image");
    assert.ok(html.includes('alt="Ví da cá sấu gù 8 đỉnh, mã SD-VN024."'),
      slug + " needs descriptive cover alt text");
  } else {
    const imageTag = html.match(/<figure class="cover"><img\b[^>]*>/)?.[0] || "";
    const imageSrc = imageTag.match(/src="([^"]+)"/)?.[1];
    assert.ok(imageSrc, slug + " needs a product image");
    assert.match(imageTag, /alt="[^"]+"/, slug + " needs descriptive image alt text");
    const image = imageSrc.startsWith("/images/") ? imageSrc.slice("/images/".length) : "";
    assert.ok(image, slug + " needs an existing local product image");
    assert.ok(readFileSync(resolve(root, "public/images", image)), slug + " product image must exist");
  }
  assert.match(html, /href="\/(?:sanpham|bao-hanh|tra-cuu-don-hang)/, slug + " needs a crawlable internal link");
  if (slug !== articleSlug) {
    assert.match(html, /name="keywords" content="[^"]+"/, slug + " needs recorded secondary keyword coverage");
    assert.doesNotMatch(html, /Từ khóa chính:|Từ khóa phụ:|Ý định:|Người kiểm tra:|Bản nháp, chưa xuất bản/,
      slug + " must not expose draft editorial labels after publication");
    const faqSection = html.match(/<section class="faq"[^]*?<\/section>/)?.[0] || "";
    assert.ok(faqSection, slug + " needs a visible FAQ section");
    const questions = [...faqSection.matchAll(/<h3>([^]*?)<\/h3>/g)].map(match => match[1].trim());
    const answers = [...faqSection.matchAll(/<h3>[^]*?<\/h3>\s*<p>([^]*?)<\/p>/g)].map(match => match[1].trim());
    const schemaEntities = [...html.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)]
      .map(match => JSON.parse(match[1])).flatMap(schema => schema["@graph"] || [schema]);
    assert.ok(schemaEntities.some(schema => schema["@type"] === "BlogPosting"), slug + " needs BlogPosting schema");
    assert.ok(schemaEntities.some(schema => schema["@type"] === "BreadcrumbList"), slug + " needs BreadcrumbList schema");
    const faqSchemas = schemaEntities.filter(schema => schema["@type"] === "FAQPage");
    assert.equal(faqSchemas.length, 1, slug + " must have exactly one FAQPage schema entity");
    const faqSchema = faqSchemas[0];
    assert.ok(faqSchema, slug + " needs FAQ schema when FAQ is visible");
    assert.deepEqual(faqSchema.mainEntity.map(entity => entity.name), questions, slug + " FAQ schema questions must match visible questions");
    assert.deepEqual(faqSchema.mainEntity.map(entity => entity.acceptedAnswer.text), answers, slug + " FAQ schema answers must match visible answers");
    assert.ok(html.includes('href="/kien-thuc/knowledge.css?v=20261113"'), slug + " must use the shared Liquid Glass stylesheet");
    assert.ok(html.includes('src="/kien-thuc/knowledge.js?v=20261113"'), slug + " must load the accessible menu and theme controls");
    assert.equal(questions.length, 4, slug + " needs four article-specific FAQs");
  }
  for (const imageMatch of html.matchAll(/<img\b[^>]*src="(\/images\/knowledge\/[^"]+)"/g)) {
    assert.ok(readFileSync(resolve(root, "public", imageMatch[1].slice(1))), slug + " includes an existing owner reference image");
  }
}
console.log("Knowledge hub routing, publication and content contracts passed.");
