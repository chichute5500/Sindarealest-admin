import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequest as middleware } from "../functions/_middleware.js";
import { productCategoryRouteSlug } from "../functions/_lib.js";

const html = '<!doctype html><html><head><title>Base title</title><meta name="description" content="Base description"><meta property="og:url" content="https://shop.example/"><link rel="canonical" href="https://shop.example/"></head><body></body></html>';
function contextFor(product, urlPath) {
  const request = new Request('https://shop.example' + urlPath);
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /FROM products WHERE lower\(slug\)=\? OR lower\(id\)=\? OR upper\(sku\)=upper\(\?\)/);
        return {
          bind(...values) {
            assert.equal(values.length, 3);
            return { async first() { return product; } };
          },
        };
      },
    },
  };
  return { request, env, next: async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }) };
}
const baseProduct = {
  id: "internal-abc123",
  slug: "giay-tay-da-ca-sau-abc123",
  sku: "SD001",
  sku_verified: 0,
  title: "Giày tây da cá sấu",
  description: "Mô tả kiểm thử",
  category: "dress-shoes",
  category_label: "Giày tây",
  images_json: '["images/product-main.webp"]',
  published: 1,
};

const legacy = await middleware(contextFor(baseProduct, "/san-pham/internal-abc123"));
assert.equal(legacy.status, 301, "legacy detail route should redirect permanently");
assert.equal(legacy.headers.get("Location"), "https://shop.example/sanpham/giaytay/internal-abc123");

const wrongCategory = await middleware(contextFor(baseProduct, "/sanpham/vida/internal-abc123"));
assert.equal(wrongCategory.status, 301, "a mismatched category segment should redirect to the product's canonical category");
assert.equal(wrongCategory.headers.get("Location"), "https://shop.example/sanpham/giaytay/internal-abc123");

const canonical = await middleware(contextFor(baseProduct, "/sanpham/giaytay/internal-abc123"));
assert.equal(canonical.status, 200, "canonical category route should render the product page");
const body = await canonical.text();
assert.match(body, /<link rel="canonical" href="https:\/\/shop\.example\/sanpham\/giaytay\/internal-abc123">/);
assert.match(body, /<meta property="og:url" content="https:\/\/shop\.example\/sanpham\/giaytay\/internal-abc123">/);
assert.match(body, /"@type":"Product"/);
assert.doesNotMatch(body, /\"sku\":\"SD001\"/, 'unverified internal SKU values must not be exposed as a commercial schema.org SKU');
assert.match(body, /Giày tây da cá sấu/);

const verifiedProduct = { ...baseProduct, sku: "SD-REAL-001", sku_verified: 1 };
const skuLegacy = await middleware(contextFor(verifiedProduct, "/san-pham/sd-real-001"));
assert.equal(skuLegacy.status, 301, "SKU lookup should stay case-insensitive for legacy links");
assert.equal(skuLegacy.headers.get("Location"), "https://shop.example/sanpham/giaytay/SD-REAL-001");

console.log("PASS: canonical category/product URLs, legacy redirects, mismatch redirects, SEO metadata, and verified SKU case normalization.");


assert.equal(productCategoryRouteSlug("dress-shoes"), "giaytay", "stored category key maps to the stable Vietnamese URL slug");
assert.equal(productCategoryRouteSlug("sneakers"), "sneaker");
assert.equal(productCategoryRouteSlug("loafers"), "giayluoi");
assert.equal(productCategoryRouteSlug("belts"), "thatlung");
assert.equal(productCategoryRouteSlug("wallets"), "vida");
assert.equal(productCategoryRouteSlug("sandals"), "dep");
assert.equal(productCategoryRouteSlug("watch-straps"), "daydongho");
assert.equal(productCategoryRouteSlug("phone-cases"), "oplung");
assert.equal(productCategoryRouteSlug("custom-category"), "custom-category", "unknown categories use a normalized fallback");


// Keep the duplicated browser and Pages Functions route maps in sync.
// Parse source text as JSON-compatible object literals instead of evaluating code.
const storefrontSource = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
assert.match(storefrontSource, /p\\.skuVerified===true&&String\\(p\\.sku\\|\\|''\\)\\.trim\\(\\)\\?\\(p\\.sku\\):\\(p\\.id\\|\\|p\\.slug\\)/,
  "client-generated product URLs may use SKU only when the API explicitly marks it verified; otherwise they must use the internal product key");
const sharedLibrarySource = readFileSync(new URL("../functions/_lib.js", import.meta.url), "utf8");
const frontendRouteMapMatch = storefrontSource.match(/const productCategoryRouteSlugs=Object\.freeze\((\{[^;]*\})\);function routeSlug/);
const backendRouteMapMatch = sharedLibrarySource.match(/const PRODUCT_CATEGORY_ROUTE_SLUGS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(frontendRouteMapMatch, "the public storefront must declare its category route slug map");
assert.ok(backendRouteMapMatch, "Pages Functions must declare its category route slug map");
const parseRouteMap = (match) => JSON.parse(match[1].replace(/,\s*([}\]])/g, "$1"));
assert.deepEqual(
  parseRouteMap(frontendRouteMapMatch),
  parseRouteMap(backendRouteMapMatch),
  "frontend and Pages Functions category route maps must match",
);


// Invalid encoded segments must be rejected by the browser route parser before decodeURIComponent runs.
// These constraints mirror functions/_middleware.js so malformed paths fall through to the storefront 404 view.
const strictFrontendRouteMatcher = String.raw`location.pathname.match(/^\/sanpham\/[a-z0-9][a-z0-9-]{0,99}\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i)||location.pathname.match(/^\/san-pham\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i)`;
assert.equal((storefrontSource.split(strictFrontendRouteMatcher).length - 1), 2,
  "initial load and history navigation must both validate product route segments before decoding");

const modernClientRoute = /^\/sanpham\/[a-z0-9][a-z0-9-]{0,99}\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i;
const legacyClientRoute = /^\/san-pham\/([a-z0-9][a-z0-9._-]{0,119})\/?$/i;
assert.equal(modernClientRoute.exec("/sanpham/giaytay/internal-abc123")?.[1], "internal-abc123");
assert.equal(legacyClientRoute.exec("/san-pham/SD-REAL-001")?.[1], "SD-REAL-001");
for (const malformedPath of [
  "/san-pham/%E0%A4%A",
  "/sanpham/giaytay/%E0%A4%A",
  "/sanpham/%E0%A4%A/internal-abc123",
  "/san-pham/invalid%segment",
]) {
  assert.equal(legacyClientRoute.test(malformedPath) || modernClientRoute.test(malformedPath), false,
    "Malformed or non-canonical path must not reach decodeURIComponent: " + malformedPath);
}
