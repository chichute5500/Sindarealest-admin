import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestGet as getImageAudit, onRequestPost as postImageAudit, onRequestPatch as patchImageAudit } from "../functions/api/admin/image-audit.js";
import { onRequestGet as getImageSearch, onRequestPost as postImageSearch } from "../functions/api/admin/image-search.js";
import { onRequestGet as getImageProxy } from "../functions/api/admin/image-proxy.js";
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
assert.equal(Object.hasOwn(capturedInput, "response_format"), false, "do not send JSON Mode to a vision model unless Cloudflare documents support");
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
  ai: { async run(model, input) { assert.equal(Object.hasOwn(input, "response_format"), false); return { response: { summary: "Brown shoe", confidence: "low" } }; } },
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
assert.match(adminHtml, /readiness\.workersAiBindingConfigured/, "image inventory page must expose read-only AI binding status");
assert.match(adminHtml, /readiness\.elimapiApiKeyConfigured/, "image inventory page must expose whether an ElimAPI key is configured without revealing it");
assert.match(adminHtml, /window\.confirm/, "billable image search must require explicit confirmation before any provider call");
assert.match(adminHtml, /tối đa 2 yêu cầu ElimAPI/, "confirmation must explain the possible upload and image-search requests");
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

let planErrorJsonCalls = 0;
const blockedPlanInJson = await searchElimapiProductsByImage({
  apiKey: "test-key", platform: "taobao", imageBase64: "aGVsbG8=", mimeType: "image/jpeg",
  fetchImpl: async url => {
    planErrorJsonCalls++;
    if (url.endsWith("/upload-image")) {
      return { ok: true, status: 200, async json() { return { imageId: "image-plan-error" }; } };
    }
    return {
      ok: true, status: 200,
      async json() { return { success: false, message: "Image search is not included in the Free plan" }; }
    };
  }
});
assert.equal(blockedPlanInJson.code, "ELIMAPI_IMAGE_SEARCH_PLAN_REQUIRED", "provider plan messages returned in HTTP 200 JSON must still be classified as plan errors");
assert.equal(planErrorJsonCalls, 2, "a plan rejection must stop without retrying the image search");

let missingKeyCalls = 0;
const blockedMissingKey = await searchElimapiProductsByImage({
  apiKey: "", platform: "taobao", imageBase64: "aGVsbG8=", mimeType: "image/jpeg",
  fetchImpl: async () => { missingKeyCalls++; throw new Error("must not call provider"); }
});
assert.equal(blockedMissingKey.code, "ELIMAPI_KEY_MISSING");
assert.equal(missingKeyCalls, 0, "missing ElimAPI credentials must be rejected before any network request");



const validPngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/uO8AAAAASUVORK5CYII=";

// Regression tests: an invalid cross-product reference or rejected candidate must be
// rejected before either D1 AI quota or Workers AI is touched.
function makeAuditTestDb(review = null, options = {}) {
  const counters = { quotaQueries: 0, writes: 0, aiCalls: 0, storageHeads: 0 };
  const reviewSchemaColumns = options.reviewSchemaColumns || ["id", "product_id", "image_ref", "image_kind", "status", "analysis_json", "source_url", "source_image_url", "reference_image_ref", "r2_key"];
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
          if (sql.startsWith("SELECT id,sku,title,category,images_json FROM products WHERE id=?")) return product;
          if (sql.startsWith("SELECT id, sku, title, category, images_json FROM products WHERE id=?")) return product;
          if (sql.startsWith("SELECT * FROM image_ai_reviews WHERE id=")) return review;
          if (sql === "SELECT scope FROM ai_request_limits LIMIT 1") {
            if (options.quotaTableMissing) throw new Error("missing table ai_request_limits");
            return { scope: "workers-ai-rolling-24h" };
          }
          if (sql.includes("INSERT INTO ai_request_limits")) {
            counters.quotaQueries++;
            return { request_count: 1, window_start: Math.floor(Date.now() / 1000) };
          }
          return null;
        },
        async run() { counters.writes++; return { success: true }; },
        async all() {
          if (sql === "PRAGMA table_info(image_ai_reviews)") {
            if (options.schemaReadFails) throw new Error("cannot inspect schema");
            return { results: reviewSchemaColumns.map(name => ({ name })) };
          }
          return { results: [] };
        }
      };
      return statement;
    }
  };
  return { DB, counters };
}
async function getImageSearchForRegression(envOverrides = {}) {
  const { DB } = makeAuditTestDb(null);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-search", {
    headers: { Cookie: "sd_admin_session=" + session, Origin: "https://sindarealest.test" }
  });
  return getImageSearch({
    request,
    env: {
      DB, ADMIN_PASSWORD: "test-admin-password",
      SESSION_SECRET: sessionSecret,
      AI: { async run() {} },
      ELIMAPI_API_KEY: "test-key",
      ELIMAPI_IMAGE_SEARCH_ENABLED: "true",
      ...envOverrides
    }
  });
}
const readinessResponse = await getImageSearchForRegression();
assert.equal(readinessResponse.status, 200, "readiness inspection should work without calling external providers");
const readinessPayload = await readinessResponse.json();
assert.equal(readinessPayload.readiness.workersAiBindingConfigured, true);
assert.equal(readinessPayload.readiness.elimapiApiKeyConfigured, true);
assert.equal(readinessPayload.readiness.elimapiImageSearchEnabled, true);
assert.equal(readinessPayload.readiness.quotaTableConfigured, true);
assert.equal(readinessPayload.readiness.reviewSchemaConfigured, true, "readiness must verify the required AI review columns");
assert.deepEqual(readinessPayload.readiness.missingReviewColumns, []);
assert.equal(readinessPayload.readiness.r2BindingConfigured, false, "readiness must report missing R2 binding in this fixture");
assert.equal(readinessPayload.readiness.externalApiVerified, false, "readiness must not claim it verified ElimAPI by making a request");
assert.equal(readinessPayload.readiness.workersAiLicenseVerified, false, "readiness must not claim model license agreement without checking it");
const disabledReadinessResponse = await getImageSearchForRegression({
  AI: null, ELIMAPI_API_KEY: "", ELIMAPI_IMAGE_SEARCH_ENABLED: "false"
});
const disabledReadiness = await disabledReadinessResponse.json();
assert.equal(disabledReadiness.readiness.workersAiBindingConfigured, false);
assert.equal(disabledReadiness.readiness.elimapiApiKeyConfigured, false);
assert.equal(disabledReadiness.readiness.elimapiImageSearchEnabled, false);

async function postAuditForRegression(body, review = null, aiBinding = { async run() { counters.aiCalls++; return { response: "{}" }; } }, dbOptions = {}) {
  const { DB, counters } = makeAuditTestDb(review, dbOptions);
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
      AI: aiBinding
    }
  });
  return { response, counters };
}
const crossProduct = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  imageRef: "images/not-owned-by-product.webp",
  dataUrl: validPngDataUrl
});
assert.equal(crossProduct.response.status, 422, "cross-product references must fail validation");
assert.equal(crossProduct.counters.quotaQueries, 0, "invalid references must not consume D1 AI quota");
assert.equal(crossProduct.counters.aiCalls, 0, "invalid references must not call Workers AI");
assert.equal(crossProduct.counters.writes, 0, "invalid references must not write a review");

const rejectedCandidateKey = "a".repeat(36) + "-ai.webp";
const rejectedCandidate = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  reviewId: "review-rejected",
  dataUrl: validPngDataUrl
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

async function getAuditForRegression(dbOptions = {}) {
  const { DB, counters } = makeAuditTestDb(null, dbOptions);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-audit", {
    headers: { Cookie: "sd_admin_session=" + session, Origin: "https://sindarealest.test" }
  });
  const response = await getImageAudit({ request, env: { DB, ADMIN_PASSWORD: "test-admin-password", SESSION_SECRET: sessionSecret } });
  return { response, counters };
}
async function patchAuditForRegression(review, body, dbOptions = {}) {
  const { DB, counters } = makeAuditTestDb(review, dbOptions);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-audit", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: "sd_admin_session=" + session,
      Origin: "https://sindarealest.test"
    },
    body: JSON.stringify(body)
  });
  const response = await patchImageAudit({
    request,
    env: {
      DB, ADMIN_PASSWORD: "test-admin-password",
      SESSION_SECRET: sessionSecret,
      IMAGES: { async head() { counters.storageHeads++; return {}; }, async delete() {} }
    }
  });
  return { response, counters };
}
const approvalWithoutComparison = await patchAuditForRegression({
  id: "review-uncompared", product_id: "product-1",
  image_kind: "candidate", status: "pending",
  image_ref: "/media/" + "a".repeat(36) + "-ai.webp",
  r2_key: "a".repeat(36) + "-ai.webp", analysis_json: "{}"
}, { reviewId: "review-uncompared", decision: "approve" });
assert.equal(approvalWithoutComparison.response.status, 422, "candidate approval must require a recorded two-image comparison");
assert.equal(approvalWithoutComparison.counters.storageHeads, 0, "uncompared candidates must not be promoted from R2");
assert.equal(approvalWithoutComparison.counters.writes, 0, "uncompared candidates must not be written to the product gallery");

const queueReadWithoutQuota = await getAuditForRegression({ quotaTableMissing: true });
assert.equal(queueReadWithoutQuota.response.status, 200, "admin must still be able to inspect the review queue when the AI quota table is missing");

const rejectWithoutQuota = await patchAuditForRegression({
  id: "review-to-reject", product_id: "product-1",
  image_kind: "existing", status: "pending",
  image_ref: "images/reference.webp", r2_key: "", analysis_json: "{}"
}, { reviewId: "review-to-reject", decision: "reject" }, { quotaTableMissing: true });
assert.equal(rejectWithoutQuota.response.status, 200, "manual rejection must remain available even if AI quota setup is incomplete");
assert.equal(rejectWithoutQuota.counters.writes, 1, "manual rejection should write the rejection status without requiring an AI quota table");

const approvalWithMissingSchema = await patchAuditForRegression({
  id: "review-missing-schema", product_id: "product-1",
  image_kind: "candidate", status: "pending",
  image_ref: "/media/" + "b".repeat(36) + "-ai.webp",
  r2_key: "b".repeat(36) + "-ai.webp", analysis_json: "{}"
}, { reviewId: "review-missing-schema", decision: "approve" }, {
  reviewSchemaColumns: ["id", "product_id", "image_ref", "image_kind", "status", "analysis_json", "source_url", "r2_key"]
});
assert.equal(approvalWithMissingSchema.response.status, 503, "approval must fail closed when the review schema is incomplete");
assert.equal((await approvalWithMissingSchema.response.json()).code, "AI_REVIEW_SCHEMA_INCOMPLETE");
assert.equal(approvalWithMissingSchema.counters.writes, 0, "approval must not write data before schema preflight");
assert.equal(approvalWithMissingSchema.counters.storageHeads, 0, "approval must not inspect/promote R2 candidates before schema preflight");

const malformedAuditImage = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  imageRef: "images/reference.webp",
  dataUrl: "data:image/webp;base64,a"
});
assert.equal(malformedAuditImage.response.status, 400, "malformed base64 must be rejected before AI analysis");
assert.equal(malformedAuditImage.counters.quotaQueries, 0, "malformed image data must not consume AI quota");
assert.equal(malformedAuditImage.counters.aiCalls, 0, "malformed image data must not call Workers AI");
assert.equal(malformedAuditImage.counters.writes, 0, "malformed image data must not write a review");

const auditWithoutAi = await postAuditForRegression({
  action: "analyze", productId: "product-1",
  imageRef: "images/reference.webp", dataUrl: validPngDataUrl
}, null, null);
assert.equal(auditWithoutAi.response.status, 503, "image audit must report a missing Workers AI binding");
assert.equal(auditWithoutAi.counters.quotaQueries, 0, "missing AI binding must not consume D1 AI quota");
assert.equal(auditWithoutAi.counters.aiCalls, 0, "missing AI binding must not call a model");
assert.equal(auditWithoutAi.counters.writes, 0, "missing AI binding must not create a review");

const comparisonWithoutAi = await postAuditForRegression({
  action: "compareCandidate", productId: "product-1", reviewId: "review-pending",
  referenceImageRef: "images/reference.webp", dataUrl: "data:image/webp;base64,UklGRgAAAABXRUJQ"
}, {
  id: "review-pending", product_id: "product-1",
  image_kind: "candidate", status: "pending",
  image_ref: "/media/" + "a".repeat(36) + "-ai.webp",
  r2_key: "a".repeat(36) + "-ai.webp",
  reference_image_ref: "images/reference.webp",
  analysis_json: "{}"
}, null);
assert.equal(comparisonWithoutAi.response.status, 503, "image comparison must report a missing Workers AI binding");
assert.equal(comparisonWithoutAi.counters.quotaQueries, 0, "missing AI binding must not consume comparison quota");
assert.equal(comparisonWithoutAi.counters.aiCalls, 0, "missing AI binding must not call a model");
assert.equal(comparisonWithoutAi.counters.writes, 0, "missing AI binding must not write comparison results");

async function postImageSearchForRegression(body, aiBinding = null, dbOptions = {}) {
  const { DB, counters } = makeAuditTestDb(null, dbOptions);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "sd_admin_session=" + session,
      Origin: "https://sindarealest.test"
    },
    body: JSON.stringify(body)
  });
  const response = await postImageSearch({
    request,
    env: {
      DB, ADMIN_PASSWORD: "test-admin-password",
      SESSION_SECRET: sessionSecret,
      AI: typeof aiBinding === "function" ? aiBinding(counters) : aiBinding,
      ELIMAPI_API_KEY: "test-key",
      ELIMAPI_IMAGE_SEARCH_ENABLED: "true"
    }
  });
  return { response, counters };
}
const malformedSearchImage = await postImageSearchForRegression({
  platform: "taobao", productId: "product-1",
  imageRef: "images/reference.webp", dataUrl: "data:image/webp;base64,a"
});
assert.equal(malformedSearchImage.response.status, 400, "image search must reject malformed base64 immediately");
assert.equal(malformedSearchImage.counters.quotaQueries, 0, "invalid image search data must not consume Workers AI quota");
assert.equal(malformedSearchImage.counters.aiCalls, 0, "invalid image search data must not call Workers AI");

const searchWithoutAi = await postImageSearchForRegression({
  platform: "taobao", productId: "product-1",
  imageRef: "images/reference.webp", dataUrl: "data:image/jpeg;base64,/9j/"
});
assert.equal(searchWithoutAi.response.status, 503, "image search must fail clearly when Workers AI is not bound");
assert.equal(searchWithoutAi.counters.quotaQueries, 0, "missing Workers AI binding must not consume quota before search");
assert.equal(searchWithoutAi.counters.aiCalls, 0, "missing Workers AI binding must not call a model");

const validSearchBody = {
  platform: "taobao", productId: "product-1",
  imageRef: "images/reference.webp", dataUrl: validPngDataUrl
};
const schemaBlockedSearch = await postImageSearchForRegression(
  validSearchBody,
  counters => ({ async run() { counters.aiCalls++; return { response: "{}" }; } }),
  { reviewSchemaColumns: ["id", "product_id", "image_ref", "image_kind", "status", "analysis_json", "source_url", "r2_key"] }
);
assert.equal(schemaBlockedSearch.response.status, 503, "image search must stop when required D1 review columns are missing");
const schemaBlockedPayload = await schemaBlockedSearch.response.json();
assert.equal(schemaBlockedPayload.code, "AI_REVIEW_SCHEMA_INCOMPLETE");
assert.deepEqual(schemaBlockedPayload.missingColumns, ["source_image_url", "reference_image_ref"]);
assert.equal(schemaBlockedSearch.counters.quotaQueries, 0, "missing review columns must block before consuming quota");
assert.equal(schemaBlockedSearch.counters.aiCalls, 0, "missing review columns must block before calling Workers AI");

const quotaSchemaBlockedSearch = await postImageSearchForRegression(
  validSearchBody,
  counters => ({ async run() { counters.aiCalls++; return { response: "{}" }; } }),
  { quotaTableMissing: true }
);
assert.equal(quotaSchemaBlockedSearch.response.status, 503, "image search must stop when the D1 quota table is missing");
assert.equal((await quotaSchemaBlockedSearch.response.json()).code, "AI_QUOTA_SCHEMA_MISSING");
assert.equal(quotaSchemaBlockedSearch.counters.quotaQueries, 0, "missing quota table must block before quota consumption");
assert.equal(quotaSchemaBlockedSearch.counters.aiCalls, 0, "missing quota table must block before Workers AI");

const storageBlockedSearch = await postImageSearchForRegression(
  validSearchBody,
  counters => ({ async run() { counters.aiCalls++; return { response: "{}" }; } })
);
assert.equal(storageBlockedSearch.response.status, 503, "image search must stop if R2 cannot support the candidate workflow");
assert.equal((await storageBlockedSearch.response.json()).code, "IMAGE_STORAGE_BINDING_INCOMPLETE");
assert.equal(storageBlockedSearch.counters.quotaQueries, 0, "missing R2 operations must block before quota consumption");
assert.equal(storageBlockedSearch.counters.aiCalls, 0, "missing R2 operations must block before Workers AI");

const unreadableSchemaSearch = await postImageSearchForRegression(
  validSearchBody,
  counters => ({ async run() { counters.aiCalls++; return { response: "{}" }; } }),
  { schemaReadFails: true }
);
assert.equal(unreadableSchemaSearch.response.status, 503, "image search must fail closed when D1 schema inspection itself fails");
assert.equal((await unreadableSchemaSearch.response.json()).code, "AI_REVIEW_SCHEMA_UNREADABLE");
assert.equal(unreadableSchemaSearch.counters.quotaQueries, 0, "unreadable schema must block before consuming quota");
assert.equal(unreadableSchemaSearch.counters.aiCalls, 0, "unreadable schema must block before Workers AI");

const auditSchemaBlocked = await postAuditForRegression(
  { action: "analyze", productId: "product-1", imageRef: "images/reference.webp", dataUrl: validPngDataUrl },
  null,
  null,
  { reviewSchemaColumns: ["id", "product_id", "image_ref", "image_kind", "status", "analysis_json", "source_url", "reference_image_ref", "r2_key"] }
);
assert.equal(auditSchemaBlocked.response.status, 503, "image audit must stop if a required review column is missing");
assert.equal((await auditSchemaBlocked.response.json()).code, "AI_REVIEW_SCHEMA_INCOMPLETE");
assert.equal(auditSchemaBlocked.counters.quotaQueries, 0, "audit schema preflight must happen before quota consumption");
assert.equal(auditSchemaBlocked.counters.aiCalls, 0, "audit schema preflight must happen before AI calls");
assert.equal(auditSchemaBlocked.counters.writes, 0, "audit schema preflight must happen before D1 writes");


async function getImageProxyForRegression(url) {
  const { DB } = makeAuditTestDb(null);
  const sessionSecret = "test-session-secret-".padEnd(40, "x");
  const session = await createSession(sessionSecret);
  const request = new Request("https://sindarealest.test/api/admin/image-proxy?url=" + encodeURIComponent(url), {
    headers: { Cookie: "sd_admin_session=" + session, Origin: "https://sindarealest.test" }
  });
  return getImageProxy({ request, env: { DB, ADMIN_PASSWORD: "test-admin-password", SESSION_SECRET: sessionSecret } });
}
const originalFetch = globalThis.fetch;
let proxyFetchCalls = 0;
try {
  globalThis.fetch = async () => {
    proxyFetchCalls++;
    return new Response(null, { status: 302, headers: { Location: "https://evil.example/metadata" } });
  };
  const redirectAttack = await getImageProxyForRegression("https://img.alicdn.com/example.webp");
  assert.equal(redirectAttack.status, 502, "image proxy must reject redirects to untrusted hosts");
  assert.equal(proxyFetchCalls, 1, "image proxy must stop before fetching an untrusted redirect target");

  proxyFetchCalls = 0;
  const invalidInitialHost = await getImageProxyForRegression("https://evil.example/pixel.webp");
  assert.equal(invalidInitialHost.status, 400, "image proxy must reject an untrusted initial host");
  assert.equal(proxyFetchCalls, 0, "untrusted initial URLs must be rejected before network access");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS: AI image audit rejects cross-product references and non-pending candidates before quota/model calls.");

console.log("PASS: Workers AI keyword normalization, Elimapi product/price mapping, API authentication handling, safe source URLs, fail-closed 90% gate, material screening, D1 inventory, and manual image approval.");
