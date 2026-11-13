import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as sitemap, onRequestHead as sitemapHead } from "../functions/sitemap.xml.js";
import { onRequestGet as robotsTxt } from "../functions/robots.txt.js";
import { onRequestGet as publicSettings } from "../functions/api/settings.js";

const DB = {
  prepare(sql) {
    assert.match(sql, /FROM products WHERE published=1/);
    assert.match(sql, /SELECT id,slug,sku,sku_verified,category,updated_at/);
    assert.doesNotMatch(sql, /SELECT \*/);
    return {
      async all() {
        return {
          results: [
            { id: "valid-id", sku: "SD-SN001", sku_verified: 1, category:"sneakers", updated_at: "2026-10-17 10:00:00" },
            { id: "bad-date", sku: "SD-SN002", sku_verified: 1, category:"sneakers", updated_at: "not-a-date" },
            { id: "bad-type", sku: "SD-SN003", sku_verified: 1, category:"sneakers", updated_at: { unexpected: true } },
          ],
        };
      },
    };
  },
};

const response = await sitemap({
  request: new Request("https://shop.example/sitemap.xml"),
  env: { DB },
});
assert.equal(response.status, 200, "malformed product timestamps must not break the entire sitemap");
assert.match(response.headers.get("Content-Type"), /application\/xml/);
const xml = await response.text();
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/sneaker\/SD-SN001<\/loc><lastmod>2026-10-17T10:00:00\.000Z<\/lastmod>/);
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/sneaker\/SD-SN002<\/loc><\/url>/);
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/sneaker\/SD-SN003<\/loc><\/url>/);
console.log("PASS: sitemap skips invalid lastmod values instead of returning 503.");

const fallbackCases = [
  { env: {}, label: "missing DB binding" },
  { env: { DB: { prepare() { return { async all() { throw Error("D1 unavailable"); } }; } } }, label: "transient D1 error" }
];
for (const { env, label } of fallbackCases) {
  const response = await sitemap({ request: new Request("https://shop.example/sitemap.xml"), env });
  assert.equal(response.status, 200, label);
  assert.match(response.headers.get("Content-Type"), /application\/xml/, label);
  assert.equal(response.headers.get("Cache-Control"), "no-store", label);
  assert.equal(response.headers.get("X-Sitemap-Fallback"), "base-pages", label);
  const body = await response.text();
  assert.match(body, /<loc>https:\/\/shop\.example\/sanpham\/sneaker<\/loc>/, label);
  assert.match(body, /<loc>https:\/\/shop\.example\/<\/loc>/, label);
}
const preview = await sitemap({ request: new Request("https://test.sindarealest2.pages.dev/sitemap.xml"), env: {} });
assert.equal(preview.status, 404, "Preview should never expose an indexable sitemap");

const noDbHead = await sitemapHead({
  request: new Request("https://shop.example/sitemap.xml", { method: "HEAD" }),
  env: { DB: { prepare() { throw Error("HEAD must never query D1"); } } },
});
assert.equal(noDbHead.status, 200, "HEAD should not return Cloudflare 404");
assert.match(noDbHead.headers.get("Content-Type"), /application\/xml/);
assert.equal(noDbHead.headers.get("X-Robots-Tag"), null, "Public sitemap HEAD must not be noindex");
assert.equal(await noDbHead.text(), "", "HEAD must have no body");
const previewHead = await sitemapHead({
  request: new Request("https://test.sindarealest2.pages.dev/sitemap.xml", { method: "HEAD" }),
});
assert.equal(previewHead.status, 404, "Preview sitemap must remain private for HEAD");
assert.equal(previewHead.headers.get("X-Robots-Tag"), "noindex, nofollow");


// Google can discover both the full product sitemap and the independent
// static catalog sitemap via robots.txt without relying on Search Console.
const robotsResponse = await robotsTxt({
  request: new Request("https://sindarealest2.pages.dev/robots.txt"),
});
assert.equal(robotsResponse.status, 200);
const robotsBody = await robotsResponse.text();
assert.match(robotsBody, /User-agent: \*/);
assert.match(robotsBody, /^Allow: \/$/m);
assert.match(robotsBody, /^Disallow: \/admin\/$/m);
assert.match(robotsBody, /^Disallow: \/api\/$/m);
assert.match(robotsBody, /^Allow: \/api\/products/m, "Public product JSON must be crawlable for JS hydration");
assert.match(robotsBody, /^Allow: \/api\/settings/m, "Public display settings must be crawlable");
assert.doesNotMatch(robotsBody, /^Allow: \/api\/customer/m, "Customer session APIs must remain blocked");
assert.doesNotMatch(robotsBody, /^Allow: \/api\/admin/m, "Admin APIs must remain blocked");
const advertised = [...robotsBody.matchAll(/^Sitemap: (.+)$/gm)].map(match => match[1]);
assert.deepEqual(advertised, [
  "https://sindarealest2.pages.dev/sitemap.xml",
  "https://sindarealest2.pages.dev/sitemap-pages.xml",
]);
assert.ok(!robotsBody.includes("Disallow: /sitemap"), "Sitemaps must not be blocked");
console.log("PASS: robots.txt advertises both public sitemaps without changing crawl policy.");


// Public display settings support rendered storefront HTML but should not appear
// as standalone search results. No production data or network is used here.
const settingsResponse = await publicSettings({
  env: { DB: { prepare() { return { bind() { return { async first() { return null; } }; } }; } } }
});
assert.equal(settingsResponse.status, 200);
assert.equal(settingsResponse.headers.get("X-Robots-Tag"), "noindex");

const staticPagesSitemap = readFileSync(new URL("../public/sitemap-pages.xml", import.meta.url), "utf8");
assert.match(staticPagesSitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(staticPagesSitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
assert.match(staticPagesSitemap, /<\/urlset>\s*$/);
const staticPageLocs = [...staticPagesSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
assert.ok(staticPageLocs.length > 0, "static sitemap must include URLs");
assert.equal(new Set(staticPageLocs).size, staticPageLocs.length, "static sitemap URLs must be unique");
for (const path of ["/kien-thuc/", ...["bao-quan-do-da-ca-sau-tai-nha","chon-giay-da-ca-sau-theo-phong-cach","cach-chon-vi-da-ca-sau-nam","chon-that-lung-da-ca-sau","da-bung-da-lung-da-hong-ca-sau","chon-size-giay-da-ca-sau-online","hang-co-san-va-hang-dat-rieng","qua-tang-da-ca-sau-cho-nam","da-ca-sau-that-co-ben-khong","ve-sinh-bao-duong-giay-da-ca-sau"].map((slug) => "/kien-thuc/" + slug + "/"), "/kien-thuc/phan-biet-da-ca-sau-that-da-dap-van/", "/bao-hanh", "/tra-cuu-don-hang"]) {
  assert.ok(staticPageLocs.includes("https://casauvip.store" + path), path + " must be in the static page sitemap");
}
for (const path of ["/privacy-policy", "/terms-of-service", "/data-deletion"]) {
  assert.ok(staticPageLocs.includes("https://casauvip.store" + path), path + " must be in the static page sitemap");
  assert.ok(!staticPageLocs.includes("https://casauvip.store" + path + "/"), path + " must match its no-slash canonical URL");
}
assert.ok(!staticPageLocs.some((loc) => /\/(?:lien-he|gioi-thieu|tra-cuu)\/?$/.test(loc)), "sitemap must not list nonexistent placeholder routes");

const staticHeaders = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
assert.match(staticHeaders, /\/sitemap-pages\.xml\s+Content-Type: application\/xml; charset=utf-8/);
