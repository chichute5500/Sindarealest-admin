import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, extractSimilarityScore, inventoryImages, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage, suggestMarketplaceImageKeywords } from "../functions/_lib/gemini.js";
import { canServeAiCandidate } from "../functions/media/[key].js";
assert.equal(normalizeImageRef("/media/example.webp"), "media/example.webp");
const inventory = inventoryImages([
  { id: "p1", sku: "SD001", title: "Giày 1", category: "dress-shoes", images_json: '["images/a.webp","images/b.webp"]' },
  { id: "p2", sku: "SD002", title: "Giày 2", category: "loafers", images_json: '["images/a.webp"]' },
]);
assert.equal(inventory.productCount, 2);
assert.equal(inventory.imageReferenceCount, 3);
assert.equal(inventory.uniqueImageCount, 2);
assert.equal(inventory.duplicateReferenceCount, 1);
assert.equal(inventory.duplicates[0].products.length, 2);
assert.equal(assessCrocodileMaterial("giày da cá sấu giả").status, "reject");
assert.equal(assessCrocodileMaterial("鳄鱼纹压纹PU皮").status, "reject");
assert.equal(assessCrocodileMaterial("giày da cá sấu thật").status, "review");
assert.equal(assessCrocodileMaterial("giày da").status, "review");
assert.equal(extractSimilarityScore({ similarity: 0.91 }), 91);
assert.equal(extractSimilarityScore({ similarity_score: 89.5 }), 89.5);
assert.equal(extractSimilarityScore({ score: 0.99 }), null, "generic score must not be mistaken for image similarity");
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật", similarityScore: 90 }).eligible, true);
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật", similarityScore: 89.99 }).eligible, false);
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật" }).eligible, false, "missing similarity score must fail closed");
assert.equal(evaluateSearchCandidate({ title: "Giày da bò thật", similarityScore: 99 }).eligible, false, "crocodile keyword is mandatory");
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu giả PU", similarityScore: 99 }).eligible, false, "synthetic material must be rejected");
assert.equal(evaluateSearchCandidate({ title: "真鳄鱼皮鞋", similarityScore: 95 }).eligible, true);
assert.ok((await analyzeProductImage({ ai: null, imageBase64: "YWJj" })).error, "missing Workers AI binding must fail safely");
assert.ok((await suggestMarketplaceImageKeywords({ ai: null, imageBase64: "YWJj" })).error, "image search must require Workers AI binding");
assert.ok((await analyzeProductImage({ ai: { run: async () => ({ response: JSON.stringify({ summary: "Giày da", visibleFeatures: ["mũi tròn"], modelAssessment: "same_model_possible", materialAssessment: "uncertain", confidence: "medium", reasons: [], needsHumanReview: true }) }) }, imageBase64: "YWJj" })).analysis, "Workers AI JSON response should be normalized");
const keywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async (model, input) => {
    assert.equal(model, "@cf/meta/llama-3.2-11b-vision-instruct");
    assert.equal(input.messages[0].role, "system");
    assert.equal(input.messages[1].role, "user");
    assert.equal(input.image, "data:image/jpeg;base64,YWJj");
    return { response: JSON.stringify({ keywords: ["黑色皮鞋", "男鞋"], visualSummary: "Giày đen" }) };
  } },
  imageBase64: "YWJj"
});
assert.deepEqual(keywordResult.keywords, ["黑色皮鞋", "男鞋"], "Workers AI Chinese keywords should be preserved");

const wrappedJsonKeywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({
    response: 'Here is the result:\n```json\n{"keywords":["黑色乐福鞋","黑色男鞋"],"visualSummary":"黑色皮鞋"}\n```\n以上是分析结果。'
  }) },
  imageBase64: "YWJj"
});
assert.deepEqual(wrappedJsonKeywordResult.keywords, ["黑色乐福鞋", "黑色男鞋"], "Workers AI JSON surrounded by prose and markdown fences should be recovered");

const malformedButRecoverableKeywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({
    response: 'Result: {keywords: ["黑色乐福鞋", "黑色男鞋",], visualSummary: "黑色皮鞋",}'
  }) },
  imageBase64: "YWJj"
});
assert.deepEqual(malformedButRecoverableKeywordResult.keywords, ["黑色乐福鞋", "黑色男鞋"], "Common trailing commas and unquoted JSON keys should be recovered");
const stringKeywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({ response: JSON.stringify({ keywords: "黑色乐福鞋、男士皮鞋", visualSummary: "黑色鞋" }) }) },
  imageBase64: "YWJj",
  category: "loafers"
});
assert.deepEqual(stringKeywordResult.keywords, ["黑色乐福鞋", "男士皮鞋"], "a JSON string containing separated Chinese keywords should be normalized");

const nestedWorkersResponse = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({ response: { text: JSON.stringify({ keywords: ["棕色皮鞋", "男士商务鞋"], visualSummary: "棕色皮鞋" }) } }) },
  imageBase64: "YWJj"
});
assert.deepEqual(nestedWorkersResponse.keywords, ["棕色皮鞋", "男士商务鞋"], "nested Workers AI response text should be extracted");

const proseKeywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({ response: "根据图片，这是一双黑色男士乐福鞋。建议关键词：黑色乐福鞋、男鞋。" }) },
  imageBase64: "YWJj",
  title: "Giày lười nam",
  category: "loafers"
});
assert.ok(proseKeywordResult.keywords.length >= 2, "Chinese prose without JSON should recover search keywords instead of stopping the search");
assert.ok(proseKeywordResult.keywords.every((keyword) => /[\\u3400-\\u9fff]/.test(keyword)), "recovered keywords must contain Chinese characters");

const unusableKeywordResult = await suggestMarketplaceImageKeywords({
  ai: { run: async () => ({ response: "I cannot output JSON." }) },
  imageBase64: "YWJj",
  title: "Giày tây nam",
  category: "dress-shoes"
});
assert.deepEqual(unusableKeywordResult.keywords, ["男士皮鞋", "商务皮鞋"], "unparseable output should use deterministic category keywords without extra AI calls");
assert.ok((await suggestMarketplaceImageKeywords({ ai: { run: async () => { throw new Error("quota limit"); } }, imageBase64: "YWJj" })).status === 429, "Workers AI quota errors should not auto-retry");
const candidateKey = "a".repeat(36) + "-ai.webp";
const candidateReview = { image_kind: "candidate", status: "pending", r2_key: candidateKey, image_ref: "/media/" + candidateKey };
assert.equal(canServeAiCandidate(candidateReview), false, "pending AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "rejected" }), false, "rejected AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved" }), true, "approved AI candidate may be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved", image_ref: "/media/other.webp" }), false, "mismatched image reference must be blocked");
const imageSearchModule = await import("../functions/api/admin/image-search.js");
assert.equal(typeof imageSearchModule.onRequestPost, "function");
assert.equal(imageSearchModule.isSupportedSourceUrl("https://item.taobao.com/item.htm?id=123456"), true);
assert.equal(imageSearchModule.isSupportedSourceUrl("https://evil.example/item.htm?id=123456"), false);
assert.equal(imageSearchModule.isSupportedSourceUrl("https://s.taobao.com/search?q=sneaker"), false);
assert.match(imageSearchModule.onRequestPost.toString(), /ELIMAPI_API_KEY/);
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /saveSource/);
assert.match((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /evaluateSearchCandidate/);
assert.match((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /uploadReferenceImage/);
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /phash-63/);
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /similarityScore < 90/);
assert.equal(typeof (await import("../functions/api/admin/image-proxy.js")).onRequestGet, "function");
const adminHtml = (await import("node:fs")).readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /const phashSimilarity=async/);
assert.match(adminHtml, /api\/admin\/image-proxy\?url=/);
assert.match(adminHtml, /score>=90&&item\.hasKeyword===true/);
assert.match(adminHtml, /galleryUrls/);

// Integration regression test: Workers AI -> Elimapi upload -> image search -> details.
// This confirms the actual request shapes without spending a real API quota.
const savedFetch = globalThis.fetch;
const upstreamCalls = [];
globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  upstreamCalls.push({ url, options });
  if (url.endsWith("/v2/products/upload-image")) {
    assert.ok(options.body instanceof FormData, "Elimapi image upload must use multipart FormData");
    assert.equal(options.body.get("platform"), "alibaba");
    return new Response(JSON.stringify({ imageId: "test-image-123" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (url.endsWith("/v2/products/search-by-image")) {
    assert.match(options.headers?.["Content-Type"] || "", /^application\/json$/i, "Elimapi JSON requests must set Content-Type");
    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.platform, "alibaba");
    assert.equal(requestBody.imgId, "test-image-123");
    assert.equal(requestBody.size, 20);
    return new Response(JSON.stringify({ items: [{
      id: "123456",
      title_en: "Giày da cá sấu thật",
      description: "Leather shoes",
      img_urls: ["https://img.alicdn.com/example.jpg"]
    }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (url.endsWith("/v2/products/detail")) {
    assert.match(options.headers?.["Content-Type"] || "", /^application\/json$/i);
    return new Response(JSON.stringify({ product: { img_urls: ["https://img.alicdn.com/detail.jpg"] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error("Unexpected upstream request: " + url);
};
try {
  const sessionSecret = "test-session-secret-".repeat(3);
  const session = await createSession(sessionSecret);
  const route = await import("../functions/api/admin/image-search.js");
  const response = await route.onRequestPost({
    request: new Request("https://shop.example/api/admin/image-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://shop.example",
        Cookie: "sd_admin_session=" + session
      },
      body: JSON.stringify({ platform: "1688", imageBase64: "YWJj", title: "Giày da cá sấu", category: "shoes" })
    }),
    env: {
      DB: {},
      ADMIN_PASSWORD: "long-enough-admin-password",
      SESSION_SECRET: sessionSecret,
      ELIMAPI_API_KEY: "test-api-key-".repeat(2),
      AI: { run: async (model, input) => {
        assert.equal(model, "@cf/meta/llama-3.2-11b-vision-instruct");
        assert.equal(input.messages[1].role, "user");
        assert.match(input.messages[1].content, /Taobao|1688/);
        assert.equal(input.image, "data:image/jpeg;base64,YWJj");
        return { response: JSON.stringify({ keywords: ["鳄鱼皮鞋", "黑色男鞋"], visualSummary: "Giày đen" }) };
      } }
    }
  });
  assert.equal(response.status, 200, "image-search integration should succeed");
  const result = await response.json();
  assert.equal(result.engine, "cloudflare-workers-ai");
  assert.equal(result.platform, "1688");
  assert.deepEqual(result.keywords, ["鳄鱼皮鞋", "黑色男鞋"]);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].productUrl, "https://detail.1688.com/offer/123456.html");
  assert.deepEqual(result.results[0].galleryUrls, ["https://img.alicdn.com/example.jpg", "https://img.alicdn.com/detail.jpg"]);
  assert.equal(upstreamCalls.length, 3, "should upload image, search by image, and fetch one product detail");
} finally {
  globalThis.fetch = savedFetch;
}

console.log("PASS: inventory, measured pHash threshold, mandatory keywords, fake-material rejection, proxy and server-side save gate, Workers AI response validation, AI publication gate");
