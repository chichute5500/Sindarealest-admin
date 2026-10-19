import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin/image-groups.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "classification-test-admin-password";
const SESSION_SECRET = "classification-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const key = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp";
let modelCalls = 0, lastModelInput = null, malformed = false, failNextTransient = false, failNextQuota = false, compareMode = false, compareConfidence = 95, comparePair = [0, 1], malformedCompareOnce = false, reviewInsertBatches = 0, visualMode = "similar", compareOwners = [];
const DB = {
  prepare(sql) {
    return { sql, args: [], bind(...args) { this.args = args; return this; },
      async first() { return null; }, async all() {
              if (sql.includes("FROM products") && sql.includes("images_json")) return { results: compareOwners };
              if (sql.includes("FROM image_group_index WHERE image_key IN")) {
                const similar = visualMode === "similar";
                const shapeA = Array(64).fill(0.9), shapeB = Array(64).fill(0.05);
                const colorsA = [1,0,0,0,1,0,0,0,0,0,1,0], colorsB = [0,0,0,1,0,0,0,1,1,0,0,0];
                return { results: this.args.map((imageKey, index) => ({ image_key: imageKey, p_hash: similar ? "0011223344556677" : (index ? "ffffffffffffffff" : "0000000000000000"), features_json: JSON.stringify({ category: "sneaker", categoryStatus: "classified", categoryConfidence: 95, shape: similar ? Array(64).fill(0.5) : (index ? shapeB : shapeA), colors: similar ? colorsA : (index ? colorsB : colorsA), contentHash: String(index ? "c" : "b").repeat(64) }) })) };
              }
              return { results: [] };
            },
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
    if (compareMode && input.image) return { response: JSON.stringify({ shoe_type: "sneaker", material_texture: "vân da rõ", toe: "tròn", sole: "đế thấp", stitching: "đường may đôi", logo: "logo nhỏ bên hông", unique_marks: "vân da và đường may giống nhau" }), tool_calls: [], usage: {} };
    if (compareMode && input.messages?.some(message => typeof message.content === "string" && message.content.includes("mô tả từ phân tích thị giác"))) {
      if (malformedCompareOnce) { malformedCompareOnce = false; return { response: "not valid JSON", tool_calls: [] }; }
      return malformed ? { response: "not valid JSON", tool_calls: [] } :
        { response: JSON.stringify({ pairs: [{ a: comparePair[0], b: comparePair[1], same_product: true, confidence: compareConfidence, rationale: "Mô tả trùng vân da, đường may và đế." }] }), tool_calls: [], usage: {} };
    }
    if (compareMode) {
      const systemPrompt = String(input.messages?.[0]?.content || "");
      if (systemPrompt.includes("forensic shoe-photo analyst")) {
        return { response: JSON.stringify({ shoe_type: "dress_shoe", texture: "vân da", toe: "mũi tròn", sole: "đế đen", stitching: "đường may rõ" }), tool_calls: [], usage: {} };
      }
      if (systemPrompt.includes("Compare visual descriptions") || systemPrompt.includes("Return ONLY valid JSON with a top-level pairs array")) {
        return malformed ? { response: "not valid JSON", tool_calls: [] } :
          { response: JSON.stringify({ pairs: [{ a: 0, b: 1, same_product: true, confidence: compareConfidence, rationale: "Trùng vân da, đường may và chi tiết đế." }] }), tool_calls: [], usage: {} };
      }
      return { response: "unexpected comparison request shape", tool_calls: [], usage: {} };
    }
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
assert.equal(modelCalls, beforeCompareCalls + 4, "pair comparison should retry a transient 503, describe both images separately, then compare the descriptions");
assert.equal(reviewInsertBatches, beforeReviewWrites + 1, "successful retry should save a single pending review batch");
assert.equal(lastModelInput.input.messages[0].role, "system", "pair comparison must include the system instruction");
assert.match(lastModelInput.input.messages[0].content, /Compare all supplied visual descriptions/, "the final comparison must use all image-specific visual descriptions");
assert.equal(lastModelInput.input.image, undefined, "the final comparison uses text descriptors after each image was analyzed separately");
assert.equal(lastModelInput.input.response_format, undefined, "comparison must avoid schema-constrained decoding that failed real Preview inference");

// Compare the complete selection, including the first and last image. Older
// four-image windows omitted pairs at opposite ends of a five-to-eight image
// request; a single text-only comparison must now cover the entire selection.
const largeKeys = [
  "catalog/shoes/first.webp",
  "catalog/shoes/second.webp",
  "catalog/shoes/third.webp",
  "catalog/shoes/fourth.webp",
  "catalog/shoes/last.webp"
];
const largeRequest = () => new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({
    action: "compare",
    imageKeys: largeKeys,
    imageData: largeKeys.map(key => ({ key, dataUrl }))
  })
});
comparePair = [0, 4];
const beforeLargeCalls = modelCalls;
const beforeLargeWrites = reviewInsertBatches;
const largeResponse = await onRequestPost({ request: largeRequest(), env });
const largeResult = await largeResponse.json();
assert.equal(largeResponse.status, 201, JSON.stringify(largeResult));
assert.equal(largeResult.matches, 1, "the first-to-last pair must be considered");
assert.equal(modelCalls, beforeLargeCalls + 6, "five selected images must each be analyzed before one complete-list text comparison");
assert.equal(reviewInsertBatches, beforeLargeWrites + 1, "all qualifying pairs are saved only after the complete comparison succeeds");
assert.match(lastModelInput.input.messages.find(message => message.role === "user").content, /Ảnh 4/, "the comparison prompt must contain the last selected image");
assert.ok(lastModelInput.input.messages.find(message => message.role === "user").content.includes(largeKeys[4]), "the complete pair comparison must retain the last image key");
comparePair = [0, 1];


compareConfidence = 90;
const beforeLowConfidenceWrites = reviewInsertBatches;
const lowConfidenceResponse = await onRequestPost({ request: compareRequest(), env });
const lowConfidenceResult = await lowConfidenceResponse.json();
assert.equal(lowConfidenceResponse.status, 200, JSON.stringify(lowConfidenceResult));
assert.deepEqual(lowConfidenceResult.matches, [], "pairs below 91 confidence must not be proposed for review");
assert.equal(reviewInsertBatches, beforeLowConfidenceWrites, "low-confidence pair proposals must not be persisted");
compareConfidence = 95;

// Even a confident AI verdict is rejected when indexed visual descriptors disagree.
visualMode = "different";
const beforeVisualGateWrites = reviewInsertBatches;
const visualGateResponse = await onRequestPost({ request: compareRequest(), env });
const visualGateResult = await visualGateResponse.json();
assert.equal(visualGateResponse.status, 200, JSON.stringify(visualGateResult));
assert.deepEqual(visualGateResult.matches, [], "AI text similarity cannot override mismatched pHash, shape, or color descriptors");
assert.equal(reviewInsertBatches, beforeVisualGateWrites, "descriptor-rejected pairs must not be persisted");
visualMode = "similar";

// Even a high-confidence visual match is discarded when the two images already belong to different SKUs.
compareOwners = [
  { id: "product-a", sku: "SKU-A", images_json: JSON.stringify(["/media/catalog/shoes/a.webp"]) },
  { id: "product-b", sku: "SKU-B", images_json: JSON.stringify(["/media/catalog/shoes/b.webp"]) }
];
const beforeCrossSkuWrites = reviewInsertBatches;
const crossSkuResponse = await onRequestPost({ request: compareRequest(), env });
const crossSkuResult = await crossSkuResponse.json();
assert.equal(crossSkuResponse.status, 200, JSON.stringify(crossSkuResult));
assert.deepEqual(crossSkuResult.matches, [], "visual similarity must not override existing different-SKU ownership");
assert.equal(reviewInsertBatches, beforeCrossSkuWrites, "cross-SKU pair must not be persisted as a pending review");
compareOwners = [];

// Malformed compare output must fail closed before any review batch is written.
malformed = true;
const beforeMalformedCalls = modelCalls;
const beforeMalformedWrites = reviewInsertBatches;
const malformedCompareResponse = await onRequestPost({ request: compareRequest(), env });
assert.equal(malformedCompareResponse.status, 502);
assert.equal(modelCalls, beforeMalformedCalls + 4, "malformed comparison output is rejected only after one format retry");
assert.equal(reviewInsertBatches, beforeMalformedWrites, "invalid model output must not persist partial pair proposals");
malformed = false;

malformedCompareOnce = true;
const beforeFormatRetryCalls = modelCalls;
const beforeFormatRetryWrites = reviewInsertBatches;
const recoveredFormatResponse = await onRequestPost({ request: compareRequest(), env });
const recoveredFormatResult = await recoveredFormatResponse.json();
assert.equal(recoveredFormatResponse.status, 201, JSON.stringify(recoveredFormatResult));
assert.equal(recoveredFormatResult.matches, 1, "one malformed JSON response should recover on the bounded format retry");
assert.equal(modelCalls, beforeFormatRetryCalls + 4, "format retry should add exactly one text-only model request");
assert.equal(reviewInsertBatches, beforeFormatRetryWrites + 1, "only the recovered valid result may be persisted");

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

console.log("PASS: mocked Workers AI endpoint passes actual images, accepts nested raster keys, uses single-image descriptors for comparison, rejects malformed output, retries transient failures, distinguishes quota errors, and avoids partial compare writes.");
