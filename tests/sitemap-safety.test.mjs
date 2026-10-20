import assert from "node:assert/strict";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";

const DB = {
  prepare(sql) {
    assert.match(sql, /FROM products WHERE published=1/);
    return {
      async all() {
        return {
          results: [
            { id: "valid-id", sku: "SD-SN001", sku_verified: 1, category: "dress-shoes", category_label: "Giày tây", updated_at: "2026-10-17 10:00:00" },
            { id: "bad-date", sku: "SD-SN002", sku_verified: 1, category: "wallets", category_label: "Ví da", updated_at: "not-a-date" },
            { id: "bad-type", sku: "SD-SN003", sku_verified: 1, category: "belts", category_label: "Thắt lưng", updated_at: { unexpected: true } },
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
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/giaytay\/SD-SN001<\/loc><lastmod>2026-10-17T10:00:00\.000Z<\/lastmod>/);
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/vida\/SD-SN002<\/loc><\/url>/);
assert.match(xml, /<loc>https:\/\/shop\.example\/sanpham\/thatlung\/SD-SN003<\/loc><\/url>/);
console.log("PASS: sitemap skips invalid lastmod values instead of returning 503.");
