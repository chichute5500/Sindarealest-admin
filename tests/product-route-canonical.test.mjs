import assert from "node:assert/strict";
import { onRequest as middleware } from "../functions/_middleware.js";

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
assert.equal(legacy.headers.get("Location"), "https://shop.example/sanpham/giay-tay/internal-abc123");

const wrongCategory = await middleware(contextFor(baseProduct, "/sanpham/vi-da/internal-abc123"));
assert.equal(wrongCategory.status, 301, "a mismatched category segment should redirect to the product's canonical category");
assert.equal(wrongCategory.headers.get("Location"), "https://shop.example/sanpham/giay-tay/internal-abc123");

const canonical = await middleware(contextFor(baseProduct, "/sanpham/giay-tay/internal-abc123"));
assert.equal(canonical.status, 200, "canonical category route should render the product page");
const body = await canonical.text();
assert.match(body, /<link rel="canonical" href="https:\/\/shop\.example\/sanpham\/giay-tay\/internal-abc123">/);
assert.match(body, /<meta property="og:url" content="https:\/\/shop\.example\/sanpham\/giay-tay\/internal-abc123">/);
assert.match(body, /"@type":"Product"/);
assert.match(body, /Giày tây da cá sấu/);

const verifiedProduct = { ...baseProduct, sku: "SD-REAL-001", sku_verified: 1 };
const skuLegacy = await middleware(contextFor(verifiedProduct, "/san-pham/sd-real-001"));
assert.equal(skuLegacy.status, 301, "SKU lookup should stay case-insensitive for legacy links");
assert.equal(skuLegacy.headers.get("Location"), "https://shop.example/sanpham/giay-tay/SD-REAL-001");

console.log("PASS: canonical category/product URLs, legacy redirects, mismatch redirects, SEO metadata, and verified SKU case normalization.");
