import assert from "node:assert/strict";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage, compareProductImages, generateSearchKeywords, parseModelJson, runWorkersAiVision, WORKERS_AI_VISION_MODEL } from "../functions/_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../functions/_lib/ai-quota.js";
import { canServeAiCandidate } from "../functions/media/[key].js";

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
    visibleFeatures: ["màu nâu", "mũi nhọn"],
    modelAssessment: "same_model_possible",
    materialAssessment: "crocodile_claim_unverified",
    confidence: "medium",
    reasons: ["Không thể xác minh chất liệu chỉ bằng ảnh."],
    needsHumanReview: true
  }) };
} };
const analyzed = await analyzeProductImage({ ai, imageBase64: validBase64, mimeType: "image/webp", title: "Giày", sku: "SD001" });
assert.ok(analyzed.analysis);
assert.equal(calls, 1, "one Workers AI request per analysis");
assert.equal(capturedModel, WORKERS_AI_VISION_MODEL);
assert.ok(capturedInput.prompt.includes("Không tạo phần trăm tương đồng ảnh"));
assert.ok(Array.isArray(capturedInput.image), "image bytes use the documented Workers AI input");
assert.equal(capturedInput.temperature, 0.1);
assert.equal(analyzed.analysis.provider, "Cloudflare Workers AI");
assert.equal(analyzed.analysis.needsHumanReview, true);

calls = 0;
const search = await generateSearchKeywords({
  ai: { async run(model, input) { calls++; assert.equal(model, WORKERS_AI_VISION_MODEL); assert.ok(input.prompt.includes("1688")); return { response: '{"keywords":["鳄鱼皮男鞋","复古皮鞋"],"visualSummary":"男鞋"}' }; } },
  imageBase64: validBase64, mimeType: "image/jpeg", platform: "1688"
});
assert.deepEqual(search.keywords, ["鳄鱼皮男鞋", "复古皮鞋"]);
assert.equal(calls, 1);

const empty = await runWorkersAiVision({ ai: { async run() { return { response: "" }; } }, prompt: "test", imageBase64: validBase64 });
assert.equal(empty.code, "WORKERS_AI_EMPTY_RESPONSE");
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
const invalidJson = await analyzeProductImage({ ai: { async run() { return { response: "No JSON result" }; } }, imageBase64: validBase64 });
assert.equal(invalidJson.code, "WORKERS_AI_INVALID_JSON");

const candidateKey = "a".repeat(36) + "-ai.webp";
const candidateReview = { image_kind: "candidate", status: "pending", r2_key: candidateKey, image_ref: "/media/" + candidateKey };
assert.equal(canServeAiCandidate(candidateReview), false, "pending AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "rejected" }), false, "rejected AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved" }), true, "approved AI candidate may be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved", image_ref: "/media/other.webp" }), false, "mismatched image reference must be blocked");

const adminHtml = (await import("node:fs")).readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /Workers AI/);
assert.match(adminHtml, /data-view="ai"/);
assert.doesNotMatch(adminHtml, /const phashSimilarity=async/);
assert.doesNotMatch(adminHtml, /foundGroups=await Promise\\.allSettled/);
assert.match(adminHtml, /Chưa có mô hình so khớp thị giác chuyên biệt/);
assert.doesNotMatch(adminHtml, /window\\.__sdAiInventoryAutoScanned/, "Opening the AI tab must not auto-scan");
const imageSearchSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-search.js", import.meta.url), "utf8");
assert.match(imageSearchSource, /consumeWorkersAiRequest/);
assert.match(imageSearchSource, /isSearchPage: true/);
assert.doesNotMatch(imageSearchSource, /GEMINI_API_KEY|google_search|NEXSCOPE/);
const auditSource = (await import("node:fs")).readFileSync(new URL("../functions/api/admin/image-audit.js", import.meta.url), "utf8");
assert.match(auditSource, /saveSource/);
assert.match(auditSource, /chưa có mô hình so khớp thị giác chuyên biệt/i);
assert.match((await import("node:fs")).readFileSync(new URL("../functions/_lib/ai-quota.js", import.meta.url), "utf8"), /workers-ai-rolling-24h/);
assert.equal(typeof consumeWorkersAiRequest, "function");
assert.equal(typeof (await import("../functions/api/admin/image-proxy.js")).onRequestGet, "function");

console.log("PASS: Workers AI vision input/output, one-call quota behavior, JSON validation, Chinese search keywords, fail-closed 90% gate, material screening, D1 inventory, and manual image approval.");
