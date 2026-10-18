import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin/image-groups.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "classification-test-admin-password";
const SESSION_SECRET = "classification-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const key = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp";
let modelCalls = 0, lastModelInput = null, malformed = false, failNextTransient = false, failNextQuota = false, failNextMultiImage = false, compareMode = false, reviewInsertBatches = 0;
const DB = {
  prepare(sql) {
    return { sql, args: [], bind(...args) { this.args = args; return this; },
      async first() { return null; }, async all() { return { results: [] }; },
      async run() { return { meta: { changes: 1 } }; }
    };
  },
  async batch(statements) {
    if (statements.some(statement => statement.sql.includes("INSERT INTO public_rate_limits"))) {
      return [{ meta: { changes: 1 } }, { results: [{ attempts: 1 }] }];
    }
    if (statements.some(statement => statement.sql.includes("INSERT INTO image_group_reviews"))) reviewInsertBatches++;
    return statements.map(() => ({ meta: { changes: 1 } }));
  }
};
const env = {
  DB, ADMIN_PASSWORD, SESSION_SECRET,
  IMAGES: { async head(imageKey) { return { key: imageKey }; }, async get(imageKey) { return { key: imageKey }; } },
  AI: { async run(model, input) {
    modelCalls++; lastModelInput = { model, input };
    if (failNextQuota) { failNextQuota = false; const error = new Error("Workers AI quota exceeded (429)"); error.status = 429; throw error; }
    if (failNextTransient) { failNextTransient = false; throw new Error("Workers AI gateway timeout (503)"); }
    if (failNextMultiImage && input.messages?.some(message => Array.isArray(message.content) && message.content.some(part => part.type === "image_url"))) {
      failNextMultiImage = false;
      throw new Error("3030: Internal Server Error");
    }
    if (compareMode && input.image) return { response: JSON.stringify({ shoe_type: "sneaker", material_texture: "vân da rõ", toe: "tròn", sole: "đế thấp", stitching: "đường may đôi", logo: "logo nhỏ bên hông", unique_marks: "vân da và đường may giống nhau" }), tool_calls: [], usage: {} };
    if (compareMode && input.messages?.some(message => typeof message.content === "string" && message.content.includes("mô tả từ phân tích thị giác"))) {
      return malformed ? { response: "not valid JSON", tool_calls: [] } :
        { response: JSON.stringify({ pairs: [{ a: 0, b: 1, same_product: true, confidence: 95, rationale: "Mô tả trùng vân da, đường may và đế." }] }), tool_calls: [], usage: {} };
    }
    if (compareMode) return malformed ? { response: "not valid JSON", tool_calls: [] } :
      { response: { pairs: [{ a: 0, b: 1, same_product: true, confidence: 95, rationale: "Trùng vân da, đường may và chi tiết đế." }] }, tool_calls: [], usage: {} };
    return malformed ? { response: "not valid JSON", tool_calls: [] } :
      { response: { category: "dress_shoe", confidence: 91 }, tool_calls: [], usage: {} };
  } }
};
const dataUrl = "data:image/jpeg;base64," + Buffer.from("fixture-image").toString("base64");
const request = () => new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({ action: "classify-categories", imageKeys: [key], imageData: [{ key, dataUrl }] })
});
async function call() {
  const response = await onRequestPost({ request: request(), env });
  return { status: response.status, body: await response.json() };
}
const valid = await call();
assert.equal(valid.status, 200, JSON.stringify(valid.body));
assert.deepEqual(valid.body.items, [{ key, category: "dress_shoe", confidence: 91, status: "classified" }]);
assert.equal(lastModelInput.model, "@cf/meta/llama-3.2-11b-vision-instruct");
assert.equal(lastModelInput.input.image, dataUrl, "the actual image bytes must be passed in the documented vision image field");
assert.equal(lastModelInput.input.messages[0].role, "system", "the system instruction must be present for the verified vision request shape");
assert.equal(lastModelInput.input.messages[1].role, "user", "the user message must carry the category prompt");
assert.equal(typeof lastModelInput.input.messages[1].content, "string", "classification prompt should be plain text");
assert.equal(lastModelInput.input.response_format, undefined, "do not send the schema-constrained shape that failed real Preview inference");

malformed = true;
const invalid = await call();
assert.equal(invalid.status, 502, "malformed model output must stop classification safely");
assert.equal(invalid.body.items, undefined, "malformed output must not be accepted as a classification");
assert.equal(modelCalls, 3, "malformed output is retried once, then rejected");

// The whole-inventory scanner also accepts nested and non-WebP raster keys.
malformed = false;
const alternateKey = "catalog/shoes/loafer-front.png";
const alternateRequest = new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({
    action: "classify-categories",
    imageKeys: [alternateKey],
    imageData: [{ key: alternateKey, dataUrl }]
  })
});
const alternateResponse = await onRequestPost({ request: alternateRequest, env });
const alternateBody = await alternateResponse.json();
assert.equal(alternateResponse.status, 200, JSON.stringify(alternateBody));
assert.deepEqual(alternateBody.items, [{ key: alternateKey, category: "dress_shoe", confidence: 91, status: "classified" }]);
assert.equal(modelCalls, 4, "nested PNG/JPEG-like keys must actually be sent through the vision model");

// A transient upstream timeout is retried once; a successful retry completes the item.
failNextTransient = true;
const retryRequest = new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({
    action: "classify-categories",
    imageKeys: [alternateKey],
    imageData: [{ key: alternateKey, dataUrl }]
  })
});
const retryResponse = await onRequestPost({ request: retryRequest, env });
const retryBody = await retryResponse.json();
assert.equal(retryResponse.status, 200, JSON.stringify(retryBody));
assert.equal(modelCalls, 6, "one transient 503 must cause exactly one retry before success");



// Legacy pair-comparison path must retry one transient upstream timeout.
compareMode = true;
const compareBody = {
  action: "compare",
  imageKeys: ["catalog/shoes/a.webp", "catalog/shoes/b.webp"],
  imageData: [
    { key: "catalog/shoes/a.webp", dataUrl },
    { key: "catalog/shoes/b.webp", dataUrl }
  ]
};
const compareRequest = () => new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify(compareBody)
});
const beforeCompareCalls = modelCalls;
const beforeReviewWrites = reviewInsertBatches;
failNextTransient = true;
const compareResponse = await onRequestPost({ request: compareRequest(), env });
const compareResult = await compareResponse.json();
assert.equal(compareResponse.status, 201, JSON.stringify(compareResult));
assert.equal(compareResult.matches, 1);
assert.equal(modelCalls, beforeCompareCalls + 2, "pair comparison should retry exactly once after a transient 503");
assert.equal(reviewInsertBatches, beforeReviewWrites + 1, "successful retry should save a single pending review batch");
assert.equal(lastModelInput.input.messages[0].role, "system", "pair comparison must include the verified system instruction");
assert.ok(Array.isArray(lastModelInput.input.messages[1].content), "pair comparison must send the image content parts in the user message");
assert.equal(lastModelInput.input.response_format, undefined, "multi-image comparison must avoid the schema-constrained format that failed real Preview inference");
assert.equal(lastModelInput.input.messages[1].content.filter(part => part.type === "image_url").length, 2, "both real candidate images must be present in the comparison input");

// A live-style 3030 error on multi-image inference falls back to two documented
// single-image vision calls plus a text comparison, and saves only pending review.
failNextMultiImage = true;
const beforeFallbackCalls = modelCalls;
const beforeFallbackWrites = reviewInsertBatches;
const fallbackResponse = await onRequestPost({ request: compareRequest(), env });
const fallbackResult = await fallbackResponse.json();
assert.equal(fallbackResponse.status, 201, JSON.stringify(fallbackResult));
assert.equal(fallbackResult.matches, 1);
assert.equal(modelCalls, beforeFallbackCalls + 4, "3030 fallback must analyze each image separately and compare descriptors");
assert.equal(reviewInsertBatches, beforeFallbackWrites + 1, "fallback proposal remains a pending review, not a public image update");

// Malformed compare output must fail closed before any review batch is written.
malformed = true;
const beforeMalformedCalls = modelCalls;
const beforeMalformedWrites = reviewInsertBatches;
const malformedCompareResponse = await onRequestPost({ request: compareRequest(), env });
assert.equal(malformedCompareResponse.status, 502);
assert.equal(modelCalls, beforeMalformedCalls + 1);
assert.equal(reviewInsertBatches, beforeMalformedWrites, "invalid model output must not persist partial pair proposals");
malformed = false;

// Upstream quota errors must not be retried or persisted as successful proposals.
const beforeQuotaCalls = modelCalls;
const beforeQuotaWrites = reviewInsertBatches;
failNextQuota = true;
const quotaResponse = await onRequestPost({ request: compareRequest(), env });
const quotaResult = await quotaResponse.json();
assert.equal(quotaResponse.status, 429, JSON.stringify(quotaResult));
assert.equal(quotaResponse.headers.get("Retry-After"), "60");
assert.equal(modelCalls, beforeQuotaCalls + 1, "quota errors should not trigger a second paid model request");
assert.equal(reviewInsertBatches, beforeQuotaWrites, "quota failure must not save proposed image pairs");

console.log("PASS: mocked Workers AI endpoint passes actual images, accepts nested raster keys, rejects malformed output, retries transient failures, distinguishes quota errors, and avoids partial compare writes.");
