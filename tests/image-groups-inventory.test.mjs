import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/admin/image-groups-inventory.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "image-group-admin-password-test";
const SESSION_SECRET = "image-group-session-secret-long-enough-for-test";
const session = await createSession(SESSION_SECRET);
const product = { id: "p1", sku: "SD-SN001", title: "Test product", images_json: JSON.stringify(["/media/12345678-1234-1234-1234-123456789012.webp", "media/shop/photos/another-photo.png?cache=1"]) };
let productRows = [product];
const DB = {
  prepare(sql) {
    return {
      offset: 0,
      async all() {
        if (sql.includes("SELECT id,sku,title,images_json FROM products")) return { results: productRows.slice(this.offset, this.offset + 500) };
        return { results: [] };
      },
      bind(offset) { this.offset = Number(offset) || 0; return this; }
    };
  }
};
const pages = {
  start: {
    objects: [
      { key: "12345678-1234-1234-1234-123456789012.webp", size: 5000, uploaded: new Date("2026-01-01T00:00:00Z"), httpMetadata: { contentType: "image/webp" } },
      { key: "Videodouyin-ket-qua/sample-photo.jpg", size: 7000, uploaded: new Date("2026-01-02T00:00:00Z"), httpMetadata: { contentType: "image/jpeg" } },
      { key: "notes/readme.txt", size: 50, uploaded: new Date("2026-01-03T00:00:00Z"), httpMetadata: { contentType: "text/plain" } },
      { key: "photos/fake-raster.jpg", size: 90, uploaded: new Date("2026-01-03T01:00:00Z"), httpMetadata: { contentType: "image/svg+xml" } }
    ], truncated: true, cursor: "page-2"
  },
  "page-2": {
    objects: [
      { key: "shop/photos/another-photo.png", size: 8000, uploaded: new Date("2026-01-04T00:00:00Z"), httpMetadata: { contentType: "image/png" } }
    ], truncated: false
  }
};
const IMAGES = { async list(options) { return pages[options.cursor || "start"]; } };
const requestFor = url => new Request(url, { headers: {
  Cookie: "sd_admin_session=" + session,
  Origin: "https://preview.example",
  "Sec-Fetch-Site": "same-origin"
}});
const first = await onRequestGet({ request: requestFor("https://preview.example/api/admin/image-groups-inventory?limit=500"), env: { DB, IMAGES, ADMIN_PASSWORD, SESSION_SECRET } });
assert.equal(first.status, 200);
const firstBody = await first.json();
assert.equal(firstBody.images.length, 2, "all raster files should be included, not only flat 32-character WebP keys");
assert.equal(firstBody.hasMore, true);
assert.equal(firstBody.nextCursor, "page-2");
assert.equal(firstBody.images.find(item => item.key.includes("Videodouyin-ket-qua/")).mimeType, "image/jpeg");
assert.ok(firstBody.images.some(item => item.url.includes("Videodouyin-ket-qua%2Fsample-photo.jpg")));
assert.equal(firstBody.diagnostics.scannedObjects, 4);
assert.equal(firstBody.diagnostics.nonImageObjects, 2, "SVG content must not be reclassified as raster from a .jpg filename");
const second = await onRequestGet({ request: requestFor("https://preview.example/api/admin/image-groups-inventory?cursor=page-2&limit=500"), env: { DB, IMAGES, ADMIN_PASSWORD, SESSION_SECRET } });
assert.equal(second.status, 200);
const secondBody = await second.json();
assert.equal(secondBody.images.length, 1);
assert.equal(secondBody.hasMore, false);
assert.equal(secondBody.images[0].key, "shop/photos/another-photo.png");
assert.deepEqual(secondBody.images[0].assignedTo.map(owner => owner.sku), ["SD-SN001"], "relative media references with query strings must still map to the owning product");

// Assignment lookup must not stop at the old 2,000-product cap.
productRows = Array.from({ length: 2001 }, (_, index) => ({
  id: "p" + index,
  sku: "SKU-" + String(index).padStart(4, "0"),
  title: "Catalog product " + index,
  images_json: index === 2000 ? JSON.stringify(["/media/12345678-1234-1234-1234-123456789012.webp"]) : "[]"
}));
const largeCatalog = await onRequestGet({ request: requestFor("https://preview.example/api/admin/image-groups-inventory?limit=500"), env: { DB, IMAGES, ADMIN_PASSWORD, SESSION_SECRET } });
assert.equal(largeCatalog.status, 200);
const largeCatalogBody = await largeCatalog.json();
assert.equal(largeCatalogBody.diagnostics.productsIndexed, 2001);
assert.equal(largeCatalogBody.diagnostics.assignmentsIncomplete, false);
assert.deepEqual(largeCatalogBody.images.find(item => item.key === "12345678-1234-1234-1234-123456789012.webp").assignedTo.map(owner => owner.sku), ["SKU-2000"]);
const unauthorized = await onRequestGet({ request: new Request("https://preview.example/api/admin/image-groups-inventory"), env: { DB, IMAGES, ADMIN_PASSWORD, SESSION_SECRET } });
assert.equal(unauthorized.status, 401);
console.log("PASS: inventory pagination walks complete R2 pages and includes raster images regardless of nested paths or filename format.");
