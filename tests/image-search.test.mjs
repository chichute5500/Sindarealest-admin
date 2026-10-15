import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as postImageAudit } from "../functions/api/admin/image-audit.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages, isAllowedSourceImageUrl, isAllowedSourceProductUrl, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage, compareProductImages, generateSearchKeywords, parseModelJson, runWorkersAiVision, WORKERS_AI_VISION_MODEL } from "../functions/_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../functions/_lib/ai-quota.js";
import { canServeAiCandidate } from "../functions/media/[key].js";
import { normalizeElimapiProducts, searchElimapiProducts, searchElimapiProductsByImage } from "../functions/_lib/elimapi.js";

assert.equal(WORKERS_AI_VISION_MODEL, "@cf/meta/llama-3.2-11b-vision-instruct");
assert.equal(normalizeImageRef("/media/example.webp"), "media/example.webp");
assert.equal(isAllowedSourceProductUrl("https://item.taobao.com/item.htm?id=12345"), true);
assert.equal(isAllowedSourceProductUrl("https://detail.1688.com/offer/offer001.html"), true);
assert.equal(isAllowedSourceProductUrl("javascript:alert(1)"), false);
assert.equal(isAllowedSourceProductUrl("https://item.taobao.com.evil.example/item.htm?id=12345"), false);
assert.equal(isAllowedSourceProductUrl("https://detail.1688.com/search?foo=bar"), false);
assert.equal(isAllowedSourceProductUrl("https://detail.1688.com./item.htm?id=12345"), false, "a trailing-dot 1688 host must not fall through to the Taobao URL-path validator");
assert.equal(isAllowedSourceImageUrl("https://img.alicdn.com/example.jpg"), true);
assert.equal(isAllowedSourceImageUrl("http://img.alicdn.com/example.jpg"), false);
assert.equal(isAllowedSourceImageUrl("https://example.com/pixel.jpg"), false);
assert.equal(isAllowedSourceImageUrl("https://alicdn.com.evil.example/pixel.jpg"), false);
assert.equal(isAllowedSourceImageUrl("https://img.alicdn.com:8443/example.jpg"), false, "non-standard CDN ports must be rejected");
assert.equal(isAllowedSourceImageUrl("https://user@img.alicdn.com/example.jpg"), false, "credentials embedded in CDN URLs must be rejected");
const inventory = inventoryImages([
  { id: "p1", sku: "SD001", title: "Giày 1", category: "dress-shoes", images_json: '["images/a.webp","images/b.webp"]' },
  { id: "p2", sku: "SD002", title: "Giày 2", category: "loafers", images_json: '["images/a.webp"]' }
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

assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật", similarityScore: 90 }).eligible, false, "a client-supplied percentage without a validated matching model must fail closed");
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật", similarityScore: 95, comparisonMethod: "phash-63", calibrated: true }).eligible, false, "legacy pHash scores are not accepted as calibrated specialized-model scores");
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu thật", similarityScore: 95, comparisonMethod: "validated-visual-embedding-v1", calibrated: false }).eligible, false);
assert.equal(evaluateSearchCandidate({ title: "Giày da bò thật", similarityScore: 99, comparisonMethod: "validated-visual-embedding-v1", calibrated: true }).eligible, false, "crocodile keyword remains mandatory");
assert.equal(evaluateSearchCandidate({ title: "Giày da cá sấu giả PU", similarityScore: 99, comparisonMethod: "validated-visual-embedding-v1", calibrated: true }).eligible, false, "synthetic material must be rejected");
assert.equal(evaluateSearchCandidate({ title: "真鳄鱼皮鞋", similarityScore: 95, comparisonMethod: "validated-visual-embedding-v1", calibrated: true }).eligible, true, "pure eligibility helper only; API must verify score provenance");

assert.equal(parseModelJson('{"keywords":["鳄鱼皮鞋"]}').keywords[0], "鳄鱼皮鞋");
assert.equal(parseModelJson('\\x60\\x60\\x60json\\n{"keywords":["鞋"]}\\n\\x60\\x60\\x60').keywords[0], "鞋");
assert.equal(parseModelJson("no json here"), null);
assert.equal(parseModelJson('Model answer: {"summary":"shoe with {curved} stitching","ok":true} trailing note').summary, "shoe with {curved} stitching", "parser should handle braces inside quoted strings and harmless surrounding prose");
assert.equal(parseModelJson('before {"broken": } then {"valid":true} after').valid, true, "parser should recover a later complete JSON object when an earlier brace block is malformed");
const unavailableComparison = await compareProductImages();
assert.equal(unavailableComparison.available, false);
assert.equal(unavailableComparison.similarityScore, null);
assert.equal(unavailableComparison.eligible, false);
let comparisonCalls = 0;
const pairComparison = await compareProductImages({
  ai: { async run(model, input) {
    comparisonCalls++;
    assert.equal(model, WORKERS_AI_VISION_MODEL);
    assert.ok(input.prompt.includes("BÊN TRÁI = ảnh gốc"));
    assert.ok(input.prompt.includes("Do not return any numeric similarity score"));
    return { response: JSON.stringify({
      verdict: "same_model_likely",
      similarities: ["Cùng dáng mũi giày"],
      differences: ["Góc chụp khác nhau"],
      confidence: "medium",
      summary: "Hai ảnh có dáng và đường may tương đồng; cần kiểm tra thủ công.",
      needsHumanReview: true
    }) };
  } },
  imageBase64: "aGVsbG8=", mimeType: "image/webp", title: "Giày", sku: "SD001"
});
assert.equal(comparisonCalls, 1, "one qualitative image comparison requires one Workers AI call");
assert.equal(pairComparison.available, true);
assert.equal(pairComparison.verdict, "same_model_likely");
assert.equal(pairComparison.similarityScore, null, "qualitative comparison must not fabricate a percentage");
assert.equal(pairComparison.calibrated, false);
assert.equal(pairComparison.eligible, false, "qualitative comparison must never auto-approve a candidate");
assert.equal(pairComparison.needsHumanReview, true);

const validBase64 = "aGVsbG8=";
let calls = 0;
let capturedModel = "";
let capturedInput = null;
const ai = { async run(model, input) {
  calls++;
  capturedModel = model;
  capturedInput = input;
  return { response: JSON.stringify({
    summary: "Giày da màu nâu, mũi nhọn.",
    visibleFeatures: ["màu nâu", "mũi nhọn", "bề mặt có vân nổi"],
    modelAssessment: "same_model_possible",
    materialAssessment: "crocodile_claim_unverified",
    confidence: "medium",
    reasons: ["Không thể xác minh chất liệu chỉ bằng ảnh.", "Ảnh đơn lẻ không có ảnh đối chiếu để xác nhận cùng mẫu."],
    needsHumanReview: true
  }) };
} };
const analyzed = await analyzeProductImage({ ai, imageBase64: validBase64, mimeType: "image/webp", title: "Giày", sku: "SD001" });
assert.ok(analyzed.analysis);
assert.ok(analyzed.analysis.visibleFeatures.length >= 2, "analysis returns concrete visual features");
assert.ok(analyzed.analysis.reasons.length >= 1, "analysis includes at least one reason from the model response");
assert.equal(calls, 1, "one Workers AI request per analysis");
assert.equal(capturedModel, WORKERS_AI_VISION_MODEL);
assert.ok(capturedInput.prompt.includes("một ảnh đơn"), "prompt must distinguish single-image inference from actual image matching");
assert.equal(capturedInput.image, "data:image/webp;base64,aGVsbG8=", "vision image is passed as a base64 data URL supported by Cloudflare");
assert.equal(capturedInput.temperature, 0.1);
assert.deepEqual(capturedInput.response_format, { type: "json_object" }, "Workers AI JSON mode should be enabled for structured model outputs");
assert.equal(analyzed.analysis.provider, "Cloudflare Workers AI");
assert.equal(analyzed.analysis.needsHumanReview, true);
const vagueAnalysis = await analyzeProductImage({
  ai: { async run() { return { response: JSON.stringify({
    summary: "Giày Sneaker da cá sấu – Tuyển chọn 01 có thể là một sản phẩm thuộc danh mục sneakers của cửa hàng.",
    visibleFeatures: ["giày"], modelAssessment: "same_model_possible",
    materialAssessment: "possible_synthetic", confidence: "low",
    reasons: ["lý do không rõ ràng"], needsHumanReview: true
  }) }; } },
  imageBase64: validBase64, title: "Giày Sneaker", sku: "SD-SN001"
});
assert.equal(vagueAnalysis.code, "WORKERS_AI_INVALID_SCHEMA", "reject generic summaries and insufficient visual evidence instead of saving them");
assert.ok(capturedInput.prompt.includes("summary phải mô tả trực tiếp"), "prompt requires specific visible observations instead of repeating metadata");
assert.ok(capturedInput.prompt.includes("một ảnh đơn"), "prompt must prevent unsupported single-image identity verification");

calls = 0;
const search = await generateSearchKeywords({
  ai: { async run(model, input) { calls++; assert.equal(model, WORKERS_AI_VISION_MODEL); assert.ok(input.prompt.includes("1688")); return { response: '{"keywords":["鳄鱼皮男鞋","复古皮鞋"],"visualSummary":"男鞋"}' }; } },
  imageBase64: validBase64, mimeType: "image/jpeg", platform: "1688"
});
assert.deepEqual(search.keywords, ["鳄鱼皮男鞋", "复古皮鞋"]);
assert.equal(calls, 1);

const empty = await runWorkersAiVision({ ai: { async run() { return { response: "" }; } }, prompt: "test", imageBase64: validBase64 });
assert.equal(empty.code, "WORKERS_AI_EMPTY_RESPONSE");
const nested = await runWorkersAiVision({ ai: { async run() { return { result: { response: "nested documented-style response" } }; } }, prompt: "test", imageBase64: validBase64 });
assert.equal(nested.text, "nested documented-style response", "accept a nested response envelope when the provider wraps its result");
const nestedResponse = await runWorkersAiVision({ ai: { async run() { return { response: { text: "text nested under response" } }; } }, prompt: "test", imageBase64: validBase64 });
assert.equal(nestedResponse.text, "text nested under response", "accept a response.text envelope");
const structuredObject = await runWorkersAiVision({
  ai: { async run(model, input) { assert.deepEqual(input.response_format, { type: "json_object" }); return { response: { summary: "Brown shoe", confidence: "low" } }; } },
  prompt: "Return JSON", imageBase64: validBase64
});
assert.equal(structuredObject.text, JSON.stringify({ summary: "Brown shoe", confidence: "low" }), "accept a structured JSON object returned directly by Workers AI JSON mode");
const noBinding = await runWorkersAiVision({ ai: null, prompt: "test", imageBase64: validBase64 });
assert.equal(noBinding.code, "WORKERS_AI_BINDING_MISSING");
const invalidImage = await runWorkersAiVision({ ai, prompt: "test", imageBase64: "not base64" });
assert.equal(invalidImage.status, 400);
let quotaCalls = 0;
const quota = await runWorkersAiVision({ ai: { async run() { quotaCalls++; throw new Error("429 quota exceeded"); } }, prompt: "test", imageBase64: validBase64 });
assert.equal(quota.status, 429);
assert.equal(quotaCalls, 1, "quota failures are not retried");
const license = await runWorkersAiVision({ ai: { async run() { throw new Error("must agree to license"); } }, prompt: "test", imageBase64: validBase64 });
assert.equal(license.code, "WORKERS_AI_LICENSE_REQUIRED");
const nestedError = await runWorkersAiVision({
  ai: { async run() { throw Object.assign(new Error("AI API Error: invalid request data:image/webp;base64,aGVsbG8="), { cause: new Error("HTTP 400") }); } },
  prompt: "test", imageBase64: validBase64
});
assert.equal(nestedError.code, "WORKERS_AI_REQUEST_FAILED");
let invalidJsonDiagnostic = "";
const originalWarn = console.warn;
console.warn = (...args) => { invalidJsonDiagnostic += args.join(" "); };
let invalidJson;
try {
  invalidJson = await analyzeProductImage({ ai: { async run() { return { response: "Model output was unexpectedly plain text, not JSON." }; } }, imageBase64: validBase64 });
} finally {
  console.warn = originalWarn;
}
assert.equal(invalidJson.code, "WORKERS_AI_INVALID_JSON");
assert.ok(invalidJson.diagnostic, "invalid JSON failures should return sanitized diagnostics to the admin API");
assert.equal(invalidJson.diagnostic.responseLength, "Model output was unexpectedly plain text, not JSON.".length);
assert.match(invalidJson.diagnostic.responsePreview, /unexpectedly plain text/);
assert.match(invalidJson.error, /unexpectedly plain text/, "admin-visible error should include a sanitized response preview without requiring another route change");
assert.match(invalidJsonDiagnostic, /workers_ai_invalid_json/, "invalid JSON must emit a diagnostic event");
assert.match(invalidJsonDiagnostic, /unexpectedly plain text/, "diagnostic must include a short sanitized preview of model output");
assert.match(invalidJsonDiagnostic, /responseLength/, "diagnostic must include the response length");
let responseDiagnostic = "";
const originalInfo = console.info;
console.info = (...args) => { responseDiagnostic += args.join(" "); };
try {
  await runWorkersAiVision({ ai: { async run() { return { response: { text: "nested model output preview" } }; } }, prompt: "test", imageBase64: validBase64 });
} finally {
  console.info = originalInfo;
}
assert.match(responseDiagnostic, /selectedTextField/);
assert.match(responseDiagnostic, /response\.text/);
assert.match(responseDiagnostic, /nested model output preview/, "diagnostic must include preview for nested text envelopes");
const invalidSchema = await analyzeProductImage({ ai: { async run() { return { response: JSON.stringify({ summary: "Có thể là giày", modelAssessment: "uncertain" }) }; } }, imageBase64: validBase64 });
assert.equal(invalidSchema.code, "WORKERS_AI_INVALID_SCHEMA", "valid JSON with missing required fields must not be saved as an analysis");
assert.ok(invalidSchema.diagnostic, "schema failures should include safe field-level diagnostic metrics");
assert.ok(invalidSchema.diagnostic.issues.includes("summary_too_short"));
assert.ok(invalidSchema.diagnostic.issues.includes("visibleFeatures_not_array"));
assert.ok(invalidSchema.diagnostic.issues.includes("reasons_not_array"));
assert.ok(invalidSchema.diagnostic.issues.includes("materialAssessment_invalid"));
assert.ok(invalidSchema.diagnostic.issues.includes("confidence_invalid"));
assert.ok(invalidSchema.diagnostic.issues.includes("needsHumanReview_not_boolean"));
assert.match(invalidSchema.error, /visibleFeatures không phải danh sách/, "admin should receive actionable field-level diagnostics");
assert.equal(JSON.stringify(invalidSchema.diagnostic).includes("Có thể là giày"), false, "diagnostics must not log raw model descriptions");

const candidateKey = "a".repeat(36) + "-ai.webp";
const candidateReview = { image_kind: "candidate", status: "pending", r2_key: candidateKey, image_ref: "/media/" + candidateKey };
assert.equal(canServeAiCandidate(candidateReview), false, "pending AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "rejected" }), false, "rejected AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved" }), true, "approved AI candidate may be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved", image_ref: "/media/other.webp" }), false, "mismatched image reference must be blocked");

const adminHtml = (await import("node:fs")).readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /Workers AI/);
assert.match(adminHtml, /d\.code/, "Admin API errors should display safe diagnostic codes");
assert.match(adminHtml, /data-view="ai"/);
assert.doesNotMatch(adminHtml, /const phashSimilarity=async/);
assert.doesNotMatch(adminHtml, /foundGroups=await Promise\\.allSettled/);
assert.match(adminHtml, /Chưa có mô hình so khớp thị giác chuyên biệt/);
assert.match(adminHtml, /data-download-candidate/);
assert.match(adminHtml, /data-reference-image-ref/);
assert.match(adminHtml, /data-ai-compare/);
assert.ok(adminHtml.includes('/api/admin/image-candidate?reviewId='));
assert.match(adminHtml, /sourceImageUrl/);
assert.match(adminHtml, /referenceImageRef/);
assert.doesNotMatch(adminHtml, /window\\.__sdAiInventoryAutoScanned/, "Opening the AI tab must not auto-scan");
const imageSearchSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-search.js", import.meta.url), "utf8");
assert.match(imageSearchSource, /consumeWorkersAiRequest/);
assert.match(imageSearchSource, /ELIMAPI_IMAGE_SEARCH_ENABLED/, "image search must be explicitly enabled after confirming the ElimAPI plan");
assert.ok(imageSearchSource.indexOf("ELIMAPI_IMAGE_SEARCH_ENABLED") < imageSearchSource.indexOf("consumeWorkersAiRequest(context.env.DB)"), "disabled image search must fail before consuming Workers AI quota");
assert.match(imageSearchSource, /searchElimapiProducts(ByImage)?/);
assert.match(imageSearchSource, /ELIMAPI_API_KEY/);
assert.doesNotMatch(imageSearchSource, /https:\/\/s\.taobao\.com\/search|https:\/\/s\.1688\.com\/selloffer/);
assert.doesNotMatch(imageSearchSource, /GEMINI_API_KEY|google_search|NEXSCOPE/);
const auditSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-audit.js", import.meta.url), "utf8");
assert.match(auditSource, /saveSource/);
assert.match(auditSource, /code: result\.code/, "Workers AI diagnostic codes must be returned to the admin client");
assert.match(auditSource, /chưa có mô hình so khớp thị giác chuyên biệt/i);
assert.match((await import("node:fs")).readFileSync(new URL("../functions/_lib/ai-quota.js", import.meta.url), "utf8"), /workers-ai-rolling-24h/);
assert.equal(typeof consumeWorkersAiRequest, "function");
assert.equal(typeof (await import("../functions/api/admin/image-proxy.js")).onRequestGet, "function");
const imageProxySource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-proxy.js", import.meta.url), "utf8");
assert.match(imageProxySource, /isAllowedSourceImageUrl/);
assert.doesNotMatch(imageProxySource, /ALLOWED_HOST/, "proxy must use the same shared URL allowlist for source and redirect URLs");
const candidateAuditSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-audit.js", import.meta.url), "utf8");
assert.match(candidateAuditSource, /Nội dung base64 của ảnh không hợp lệ/, "malformed image bytes should return a controlled 400 response");
assert.equal(typeof (await import("../functions/api/admin/image-candidate.js")).onRequestGet, "function");
const imageSearchSourceText = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-search.js", import.meta.url), "utf8");
assert.match(imageSearchSourceText, /imageRef/);
assert.ok(imageSearchSourceText.includes('ownedImages.some'));
const auditSourceText = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-audit.js", import.meta.url), "utf8");
assert.match(auditSourceText, /reference_image_ref/);
assert.match(auditSourceText, /Ảnh cần phân tích không thuộc bộ ảnh của sản phẩm đã chọn/, "existing-image analysis must reject cross-product image references");
assert.match(auditSourceText, /source_image_url/);
assert.match(auditSourceText, /compareCandidate/);
assert.match(auditSourceText, /isAllowedSourceProductUrl/);
assert.match(auditSourceText, /isAllowedSourceImageUrl/);
const migrations = (await import("node:fs")).readFileSync(new URL("../migrations/0010_ai_image_source_image_url.sql", import.meta.url), "utf8");
assert.match(migrations, /ADD COLUMN source_image_url/);
assert.match(migrations, /ADD COLUMN reference_image_ref/);


const normalizedAliases = await generateSearchKeywords({
  ai: { async run() { return { response: 'Here are keywords: ```json\\n{"searchKeywords":"1. 鳄鱼皮男鞋，复古皮鞋\\n鳄鱼皮钱包","visual_summary":"深棕色皮鞋"}\\n```' }; } },
  imageBase64: validBase64, mimeType: "image/jpeg", platform: "taobao"
});
assert.deepEqual(normalizedAliases.keywords, ["鳄鱼皮男鞋", "复古皮鞋", "鳄鱼皮钱包"]);
assert.equal(normalizedAliases.visualSummary, "深棕色皮鞋");

const normalizedProducts = normalizeElimapiProducts({
  paginate: { total: 1 },
  items: [{
    id: "12345", title: "真鳄鱼皮鞋", title_en: "Genuine crocodile leather shoes",
    promotion_price: "288.00", price: "318.00",
    original_product_url: "https://item.taobao.com/item.htm?id=12345",
    img_urls: ["https://img.alicdn.com/example.jpg"], shop_name: "Demo shop"
  }]
}, "taobao");
assert.equal(normalizedProducts.length, 1);
assert.equal(normalizedProducts[0].price, "288.00");
assert.equal(normalizedProducts[0].currency, "CNY");
assert.equal(normalizedProducts[0].productUrl, "https://item.taobao.com/item.htm?id=12345");
assert.equal(normalizedProducts[0].imageUrl, "https://img.alicdn.com/example.jpg");
assert.equal(normalizedProducts[0].eligible, false, "real source results must not be auto-approved without calibrated visual matching");
const unsafeUrl = normalizeElimapiProducts({ items: [{ id: "987", title: "Test", url: "javascript:alert(1)", price: 12 }] }, "1688");
assert.equal(unsafeUrl[0].productUrl, "https://detail.1688.com/offer/987.html", "unsafe or off-platform product URLs are replaced with a safe platform URL");
assert.equal(unsafeUrl[0].price, "12");

let elimapiRequest;
const elimapiResult = await searchElimapiProducts({
  apiKey: "test-key",
  platform: "1688",
  query: "鳄鱼皮鞋",
  fetchImpl: async (url, options) => {
    elimapiRequest = { url, options };
    return { ok: true, status: 200, async json() { return { paginate: { total: 1 }, items: [{ id: "offer001", title: "真鳄鱼皮鞋", price: 88 }] }; } };
  }
});
assert.equal(elimapiResult.products.length, 1);
assert.equal(elimapiRequest.url, "https://openapi.elim.asia/v2/products/search");
assert.equal(elimapiRequest.options.headers["x-api-key"], "test-key");
assert.equal(JSON.parse(elimapiRequest.options.body).platform, "alibaba");
assert.equal(JSON.parse(elimapiRequest.options.body).q, "鳄鱼皮鞋");
const noElimapiKey = await searchElimapiProducts({ apiKey: "", platform: "taobao", query: "鞋" });
assert.equal(noElimapiKey.code, "ELIMAPI_KEY_MISSING");

let imageApiCalls = [];
const imageSearchResult = await searchElimapiProductsByImage({
  apiKey: "test-key",
  platform: "1688",
  imageBase64: "aGVsbG8=",
  mimeType: "image/jpeg",
  query: "鳄鱼皮鞋",
  fetchImpl: async (url, options) => {
    imageApiCalls.push({ url, options });
    if (url.endsWith("/upload-image")) {
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-api-key"], "test-key");
      assert.ok(options.body instanceof FormData, "image upload uses multipart/form-data");
      assert.equal(options.body.get("platform"), "alibaba");
      const file = options.body.get("file");
      assert.equal(file.type, "image/jpeg");
      assert.equal(file.name, "reference.jpg");
      return { ok: true, status: 200, async json() { return { imageId: "image-123" }; } };
    }
    assert.equal(url, "https://openapi.elim.asia/v2/products/search-by-image");
    assert.equal(options.headers["x-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.platform, "alibaba");
    assert.equal(body.imgId, "image-123");
    assert.equal(body.keyword, "鳄鱼皮鞋");
    assert.equal(body.page, 1);
    assert.equal(body.size, 20);
    return {
      ok: true,
      status: 200,
      async json() {
        return { paginate: { total: 1 }, items: [{
          id: "offer002", title: "真鳄鱼皮鞋", price: "88.00",
          original_product_url: "https://detail.1688.com/offer/offer002.html",
          img_urls: ["https://img.alicdn.com/candidate.jpg"]
        }] };
      }
    };
  }
});
assert.equal(imageApiCalls.length, 2, "image search makes one upload and one search request, without automatic retries");
assert.equal(imageSearchResult.searchMode, "image");
assert.equal(imageSearchResult.total, 1);
assert.equal(imageSearchResult.products[0].productUrl, "https://detail.1688.com/offer/offer002.html");
assert.equal(imageSearchResult.products[0].imageUrl, "https://img.alicdn.com/candidate.jpg");

let blockedImageSearchCalls = 0;
const blockedPlan = await searchElimapiProductsByImage({
  apiKey: "test-key", platform: "taobao", imageBase64: "aGVsbG8=", mimeType: "image/jpeg",
  fetchImpl: async () => {
    blockedImageSearchCalls++;
    return { ok: false, status: 403, async json() { return { message: "Image search is not included in the Free plan" }; } };
  }
});
assert.equal(blockedPlan.code, "ELIMAPI_IMAGE_SEARCH_PLAN_REQUIRED");
assert.equal(blockedImageSearchCalls, 1, "a rejected upload must stop before the search request and must not retry");

let missingKeyCalls = 0;
const blockedMissingKey = await searchElimapiProductsByImage({
  apiKey: "", platform: "taobao", imageBase64: "aGVsbG8=", mimeType: "image/jpeg",
  fetchImpl: async () => { missingKeyCalls++; throw new Error("must not call provider"); }
});
assert.equal(blockedMissingKey.code, "ELIMAPI_KEY_MISSING");
assert.equal(missingKeyCalls, 0, "missing ElimAPI credentials must be rejected before any network request");



// Regression tests: an invalid cross-product reference or rejected candidate must be
// rejected before either D1 AI quota or Workers AI is touched.
function makeAuditTestDb(review = null) {
  const counters = { quotaQueries: 0, writes: 0, aiCalls: 0 };
  const product = {
    id: "product-1", sku: "SD001", title: "Giày mẫu", category: "dress-shoes",
    images_json: JSON.stringify(["images/reference.webp"]), published: 1
  };
  const DB = {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.startsWith("SELECT id,sku,title,category,images_json,published FROM products WHERE id=?")) return product;
          if (sql.startsWith("SELECT * FROM image_ai_reviews WHERE id=? AND product_id=?")) return review;
          if (sql.includes("INSERT INTO ai_request_limits")) {
            counters.quotaQueries++;
            return { request_count: 1, window_start: Math.floor(Date.now() / 1000) };
          }
          return null;
        },
        async run() { counters.writes++; return { success: true }; },
        async all() { return { results: [] }; }
      };
      return statement;
    }
  };
  return { DB, counters };
}
async function postAuditForRegression(body, review = null) {
  const { DB, counters } = makeAuditTestDb(review);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "sd_admin_session=" + session,
      Origin: "https://sindarealest.test"
    },
    body: JSON.stringify(body)
  });
  const response = await postImageAudit({
    request,
    env: {
      DB, ADMIN_PASSWORD: "test-admin-password",
      SESSION_SECRET: sessionSecret,
      AI: { async run() { counters.aiCalls++; return { response: "{}" }; } }
    }
  });
  return { response, counters };
}
const crossProduct = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  imageRef: "images/not-owned-by-product.webp",
  dataUrl: "data:image/webp;base64,aGVsbG8="
});
assert.equal(crossProduct.response.status, 422, "cross-product references must fail validation");
assert.equal(crossProduct.counters.quotaQueries, 0, "invalid references must not consume D1 AI quota");
assert.equal(crossProduct.counters.aiCalls, 0, "invalid references must not call Workers AI");
assert.equal(crossProduct.counters.writes, 0, "invalid references must not write a review");

const rejectedCandidateKey = "a".repeat(36) + "-ai.webp";
const rejectedCandidate = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  reviewId: "review-rejected",
  dataUrl: "data:image/webp;base64,aGVsbG8="
}, {
  id: "review-rejected", product_id: "product-1",
  image_kind: "candidate", status: "rejected",
  image_ref: "/media/" + rejectedCandidateKey,
  r2_key: rejectedCandidateKey, analysis_json: "{}"
});
assert.equal(rejectedCandidate.response.status, 409, "rejected candidates must not be silently reopened by analysis");
assert.equal(rejectedCandidate.counters.quotaQueries, 0, "rejected candidates must not consume AI quota");
assert.equal(rejectedCandidate.counters.aiCalls, 0, "rejected candidates must not call Workers AI");
assert.equal(rejectedCandidate.counters.writes, 0, "rejected candidates must not be rewritten as pending");

console.log("PASS: AI image audit rejects cross-product references and non-pending candidates before quota/model calls.");

console.log("PASS: Workers AI keyword normalization, Elimapi product/price mapping, API authentication handling, safe source URLs, fail-closed 90% gate, material screening, D1 inventory, and manual image approval.");
