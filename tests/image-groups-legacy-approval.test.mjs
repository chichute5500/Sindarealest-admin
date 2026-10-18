import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin/image-groups.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "legacy-image-approval-test-password";
const SESSION_SECRET = "legacy-image-approval-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const reviewId = crypto.randomUUID();
let batchCalls = 0;
const DB = {
  prepare(sql) {
    return {
      sql, args: [],
      bind(...args) { this.args = args; return this; },
      async first() {
        if (this.sql.includes("FROM image_group_reviews WHERE id=? AND status='pending'")) {
          return { id: reviewId, image_a: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp", image_b: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp", same_product: 1, confidence: 94, status: "pending" };
        }
        if (this.sql.includes("SELECT * FROM products WHERE id=?")) {
          return { id: "product-1", sku: "FIXTURE-1", images_json: "{broken-json" };
        }
        return null;
      },
      async all() { return { results: [] }; },
      async run() { return { meta: { changes: 0 } }; }
    };
  },
  async batch() { batchCalls++; return []; }
};
const request = new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({ action: "approve", reviewId, productId: "product-1" })
});
const response = await onRequestPost({
  request,
  env: {
    DB, ADMIN_PASSWORD, SESSION_SECRET,
    IMAGES: { async get(key) { return { key }; }, async head(key) { return { key }; } }
  }
});
assert.equal(response.status, 409);
assert.match(await response.text(), /Không ghi đè để tránh mất dữ liệu/);
assert.equal(batchCalls, 0, "invalid existing product JSON must stop before any database write");
console.log("PASS: legacy AI image approval refuses corrupt existing product image JSON without issuing a database batch.");
