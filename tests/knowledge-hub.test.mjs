import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { onRequest } from "../functions/_middleware.js";
import { KNOWLEDGE_SLUGS } from "../functions/_knowledge-routes.js";

const root = process.cwd();
assert.equal(KNOWLEDGE_SLUGS.length, 11, "Week 11 checklist is integrated into week 1, so only 11 distinct article URLs exist");
assert.equal(new Set(KNOWLEDGE_SLUGS).size, KNOWLEDGE_SLUGS.length, "Article routes must be unique");

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
        return new Response(readFileSync(file), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
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
assert.equal((homeHtml.match(/href="\/kien-thuc\/"/g) || []).length, 2,
  "The home page must expose the hub in both crawlable navigation menus");

const hub = await dispatch("/kien-thuc/");
assert.equal(hub.response.status, 200);
assert.equal(hub.assetPath, "/kien-thuc/index.html");
const hubHtml = await hub.response.text();
assert.match(hubHtml, /Kiến thức và hướng dẫn chọn đồ da cá sấu/);
assert.match(hub.response.headers.get("X-Robots-Tag") || "", /noindex, nofollow/);
assert.equal((hubHtml.match(/<article class="card">/g) || []).length, 1,
  "The hub should list only the approved article");
const productionHub = await dispatch("/kien-thuc/", "GET", "casauvip.store");
assert.equal(productionHub.response.status, 200);
assert.equal(productionHub.response.headers.get("X-Robots-Tag"), "index, follow");
const productionHubHtml = await productionHub.response.text();
assert.match(productionHubHtml, /name="robots" content="index, follow"/);
assert.equal((productionHubHtml.match(/<article class="card">/g) || []).length, 1,
  "Production hub must expose only the approved article");
assert.doesNotMatch(productionHubHtml, /Đọc bản nháp|Tuần 2|Tuần 12/);
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
assert.match(articleHtml, /<h1\b/);
assert.match(articleHtml, /rel="canonical" href="https:\/\/casauvip\.store\/kien-thuc\//);
assert.match(articleHtml, /name="robots" content="noindex,nofollow"/);
assert.doesNotMatch(articleHtml, /Từ khóa chính:|Ý định:|Bản nháp, chưa xuất bản|TUẦN 1/);
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
const faqSchema = jsonLd.find((schema) => schema["@type"] === "FAQPage");
assert.equal(faqSchema?.mainEntity?.length, 5, "FAQ schema must match the five visible questions");
for (const question of faqSchema.mainEntity) assert.ok(articleHtml.includes(question.name));
assert.match(articleHtml, /src="\/media\/239f9df4-0112-495b-94e3-5f9412ec7f43\.webp"/);

const productionArticle = await dispatch("/kien-thuc/" + articleSlug + "/", "GET", "casauvip.store");
assert.equal(productionArticle.response.status, 200);
assert.equal(productionArticle.response.headers.get("X-Robots-Tag"), "index, follow");
assert.match(await productionArticle.response.text(), /name="robots" content="index, follow"/);
for (const draftSlug of KNOWLEDGE_SLUGS.slice(1)) {
  const unpublished = await dispatch("/kien-thuc/" + draftSlug + "/", "GET", "casauvip.store");
  assert.equal(unpublished.response.status, 404, draftSlug + " must remain unpublished in Production");
  assert.equal(unpublished.response.headers.get("X-Robots-Tag"), "noindex, nofollow");
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
assert.match(sitemap, /<loc>https:\/\/casauvip\.store\/kien-thuc\/phan-biet-da-ca-sau-that-da-dap-van\/<\/loc>/);
for (const draftSlug of KNOWLEDGE_SLUGS.slice(1)) assert.doesNotMatch(sitemap, new RegExp("/kien-thuc/" + draftSlug + "/"));

for (const slug of KNOWLEDGE_SLUGS) {
  const path = resolve(root, "public/kien-thuc", slug, "index.html");
  const html = readFileSync(path, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/name="description" content="([^"]*)"/)?.[1] || "";
  assert.ok(title && title.length < 60, slug + " needs a concise title under 60 characters");
  assert.ok(description && description.length < 160, slug + " needs a description under 160 characters");
  assert.match(html, /name="robots" content="noindex,nofollow"/, slug + " must remain a draft");
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
}
console.log("Knowledge hub routing and draft content contracts passed.");
