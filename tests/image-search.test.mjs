import assert from "node:assert/strict";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage, compareProductImages, generateSearchKeywords, parseModelJson, runWorkersAiVision, WORKERS_AI_VISION_MODEL } from "../functions/_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../functions/_lib/ai-quota.js";
import { canServeAiCandidate } from "../functions/media/[key].js";
import { normalizeElimapiProducts, searchElimapiProducts } from "../functions/_lib/elimapi.js";

assert.equal(WORKERS_AI_VISION_MODEL, "@cf/meta/llama-3.2-11b-vision-instruct");
assert.equal(normalizeImageRef("/media/example.webp"), "media/example.webp");
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
assert.equal(compareProductImages().available, false);
assert.equal(compareProductImages().similarityScore, null);
assert.equal(compareProductImages().eligible, false);

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
assert.doesNotMatch(adminHtml, /window\\.__sdAiInventoryAutoScanned/, "Opening the AI tab must not auto-scan");
const imageSearchSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-search.js", import.meta.url), "utf8");
assert.match(imageSearchSource, /consumeWorkersAiRequest/);
assert.match(imageSearchSource, /searchElimapiProducts/);
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

console.log("PASS: Workers AI keyword normalization, Elimapi product/price mapping, API authentication handling, safe source URLs, fail-closed 90% gate, material screening, D1 inventory, and manual image approval.");
