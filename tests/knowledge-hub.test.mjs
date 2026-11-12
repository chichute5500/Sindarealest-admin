import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { onRequest } from "../functions/_middleware.js";
import { KNOWLEDGE_SLUGS } from "../functions/_knowledge-routes.js";

const root = process.cwd();
assert.equal(KNOWLEDGE_SLUGS.length, 11, "Week 11 checklist is integrated into week 1, so only 11 distinct article URLs exist");
assert.equal(new Set(KNOWLEDGE_SLUGS).size, KNOWLEDGE_SLUGS.length, "Article routes must be unique");

async function dispatch(path, method = "GET") {
  let assetPath = "";
  const request = new Request("https://preview.example" + path, { method });
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
assert.match(await hub.response.text(), /Kiến thức chọn và chăm sóc đồ da cá sấu/);
assert.match(hub.response.headers.get("X-Robots-Tag") || "", /noindex, nofollow/);

const articleSlug = KNOWLEDGE_SLUGS[0];
const article = await dispatch("/kien-thuc/" + articleSlug + "/");
assert.equal(article.response.status, 200);
assert.equal(article.assetPath, "/kien-thuc/" + articleSlug + "/index.html");
const articleHtml = await article.response.text();
assert.match(articleHtml, /<h1\b/);
assert.match(articleHtml, /rel="canonical" href="https:\/\/casauvip\.store\/kien-thuc\//);
assert.match(articleHtml, /name="robots" content="noindex,nofollow"/);
assert.match(articleHtml, /id="checklist-cau-hoi-theo-sku"/);
assert.match(articleHtml, /name="description" content="[^"]{1,155}"/);
assert.match(articleHtml, /<h1>Phân biệt da cá sấu thật và da dập vân: cần kiểm tra gì\?<\/h1>/);
assert.equal((articleHtml.match(/owner-(?:embossed-0[12]|real-belly-0[12]|real-back-parts)-20261112\.webp/g) || []).length, 10,
  "Week 1 must show five owner reference images in HTML and Article schema");
const jsonLd = [...articleHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(([, value]) => JSON.parse(value));
assert.ok(jsonLd.some((schema) => schema["@type"] === "Article"));
const faqSchema = jsonLd.find((schema) => schema["@type"] === "FAQPage");
assert.equal(faqSchema?.mainEntity?.length, 5, "FAQ schema must match the five visible questions");
for (const question of faqSchema.mainEntity) assert.ok(articleHtml.includes(question.name));
assert.match(articleHtml, /src="\/images\/[a-f0-9]{16}\.webp"/);

const normalized = await dispatch("/kien-thuc/" + articleSlug);
assert.equal(normalized.response.status, 301);
assert.equal(normalized.response.headers.get("Location"), "https://preview.example/kien-thuc/" + articleSlug + "/");

const missing = await dispatch("/kien-thuc/not-a-real-article/");
assert.equal(missing.response.status, 404, "Unknown knowledge routes must not resolve through the SPA fallback");
const unsupported = await dispatch("/kien-thuc/", "POST");
assert.equal(unsupported.response.status, 405);
const sitemap = readFileSync(resolve(root, "public/sitemap-pages.xml"), "utf8");
assert.doesNotMatch(sitemap, /\/kien-thuc\//, "Unreviewed draft articles must not enter the production sitemap");

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
  const imageTag = html.match(/<figure class="cover"><img\b[^>]*>/)?.[0] || "";
  const image = imageTag.match(/src="\/images\/([^"]+)"/)?.[1];
  assert.ok(image, slug + " needs an existing product image");
  assert.match(imageTag, /alt="[^"]+"/, slug + " needs descriptive image alt text");
  assert.ok(readFileSync(resolve(root, "public/images", image)), slug + " product image must exist");
  assert.match(html, /href="\/(?:sanpham|bao-hanh|tra-cuu-don-hang)/, slug + " needs a crawlable internal link");
}
console.log("Knowledge hub routing and draft content contracts passed.");
