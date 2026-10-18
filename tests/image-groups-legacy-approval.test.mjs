import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin/image-groups.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "legacy-image-approval-test-password";
const SESSION_SECRET = "legacy-image-approval-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const reviewId = crypto.randomUUID();
let batchCalls = 0, reviewConfidence = 94;
const DB = {
  prepare(sql) {
    return {
      sql, args: [],
      bind(...args) { this.args = args; return this; },
      async first() {
        if (this.sql.includes("FROM image_group_reviews WHERE id=? AND status='pending'")) {
          if (this.sql.includes("confidence>=91") && reviewConfidence < 91) return null;
          return { id: reviewId, image_a: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp", image_b: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp", same_product: 1, confidence: reviewConfidence, status: "pending" };
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
const request = () => new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({ action: "approve", reviewId, productId: "product-1" })
});
const env = { DB, ADMIN_PASSWORD, SESSION_SECRET, IMAGES: { async get(key) { return { key }; }, async head(key) { return { key }; } } };
reviewConfidence = 70;
const lowConfidenceResponse = await onRequestPost({ request: request(), env });
assert.equal(lowConfidenceResponse.status, 409);
assert.match(await lowConfidenceResponse.text(), /độ tin cậy từ 91% trở lên/);
assert.equal(batchCalls, 0, "low-confidence proposal must be rejected before any database write");
reviewConfidence = 94;
const response = await onRequestPost({ request: request(), env });
assert.equal(response.status, 409);
assert.match(await response.text(), /Không ghi đè để tránh mất dữ liệu/);
assert.equal(batchCalls, 0, "invalid existing product JSON must stop before any database write");
console.log("PASS: legacy AI image approval enforces the 91% confidence gate and refuses corrupt product image JSON without database writes.");
