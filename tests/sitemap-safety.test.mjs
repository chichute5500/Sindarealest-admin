import assert from "node:assert/strict";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";

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
