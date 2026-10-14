import assert from "node:assert/strict";
import { assessCrocodileMaterial, evaluateSearchCandidate, extractSimilarityScore, inventoryImages, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage } from "../functions/_lib/gemini.js";
import { requestGeminiInteraction } from "../functions/_lib/gemini-interactions.js";
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
assert.ok((await analyzeProductImage({ apiKey: "", imageBase64: "abc" })).error);
assert.ok((await analyzeProductImage({ apiKey: "x".repeat(20), imageBase64: "abc" })).error);
const candidateKey = "a".repeat(36) + "-ai.webp";
const candidateReview = { image_kind: "candidate", status: "pending", r2_key: candidateKey, image_ref: "/media/" + candidateKey };
assert.equal(canServeAiCandidate(candidateReview), false, "pending AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "rejected" }), false, "rejected AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved" }), true, "approved AI candidate may be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved", image_ref: "/media/other.webp" }), false, "mismatched image reference must be blocked");
assert.doesNotMatch((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /google_search/, "Free-tier search must not use paid Google Search grounding");
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /saveSource/);
assert.match((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /evaluateSearchCandidate/);
assert.doesNotMatch((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /google_search/, "Free-tier search must not use paid Google Search grounding");
assert.match((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /GEMINI_API_KEY/);
const imageSearchHandler = (await import("../functions/api/admin/image-search.js")).onRequestPost.toString();
assert.match(imageSearchHandler, /RESOURCE_EXHAUSTED/, "Gemini quota errors must be distinguished");
assert.match(imageSearchHandler, /PERMISSION_DENIED/, "Gemini permission errors must be distinguished");
assert.match(imageSearchHandler, /INVALID_ARGUMENT/, "Gemini request-format errors must be distinguished");
assert.match(imageSearchHandler, /apiError\.message/, "The actual Google API diagnostic must be shown to admin");
assert.match(imageSearchHandler, /đã ẩn API key/, "The API key must be redacted from diagnostics");
assert.match(imageSearchHandler, /TimeoutError/, "Gemini timeouts must have a specific diagnostic");
const interactionSource = (await import("node:fs")).readFileSync(new URL("../functions/_lib/gemini-interactions.js", import.meta.url), "utf8");
assert.match(interactionSource, /v1beta\/interactions/, "Use the recommended Gemini Interactions API");
assert.match(interactionSource, /gemini-3\.8-flash/, "Use the primary Gemini Flash model");
assert.match(interactionSource, /gemini-3\.6-flash/, "Use a fallback model when the primary returns HTTP 503");
assert.match(interactionSource, /x-goog-api-key/, "Send API key in the request header");
assert.match(interactionSource, /response.status !== 503/, "Only retry a transient HTTP 503, not quota/auth errors");
assert.doesNotMatch(imageSearchHandler, /type: "google_search"/, "Free-tier mode must not enable paid Google Search grounding");
assert.match(imageSearchHandler, /isSearchPage: true/, "Free-tier mode returns an explicit search page, not a fabricated product URL");
assert.match(imageSearchHandler, /consumeGeminiRequest/, "Search requests must be guarded by the shared quota limiter");
assert.doesNotMatch(imageSearchHandler, /gemini-2\.5-flash:generateContent/, "Do not call the unavailable legacy model endpoint");
assert.doesNotMatch((await import("../functions/api/admin/image-search.js")).onRequestPost.toString(), /NEXSCOPE/);
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /phash-63/);
assert.match((await import("../functions/api/admin/image-audit.js")).onRequestPatch.toString(), /similarityScore < 90/);
assert.equal(typeof (await import("../functions/api/admin/image-proxy.js")).onRequestGet, "function");
const adminHtml = (await import("node:fs")).readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /const phashSimilarity=async/);
assert.match(adminHtml, /api\/admin\/image-proxy\?url=/);
assert.match(adminHtml, /score>=90&&item\.hasKeyword===true/);
assert.match(adminHtml, /data-view="ai"/);
assert.doesNotMatch(adminHtml, /window\.__sdAiInventoryAutoScanned/, "Opening the AI tab must not auto-scan");
assert.doesNotMatch(adminHtml, /foundGroups=await Promise\.allSettled\(\[\x27taobao\x27,\x271688\x27\]/, "AI analysis must not automatically call both marketplace searches");
assert.match(adminHtml, /20 yêu cầu Gemini trong 24 giờ/);
const geminiSource = (await import("../functions/_lib/gemini.js")).analyzeProductImage.toString();
assert.match(geminiSource, /requestGeminiInteraction/);
assert.doesNotMatch(geminiSource, /gemini-2\.5-flash:generateContent/);
assert.doesNotMatch(geminiSource, /google_search/);
const quotaSource = (await import("../functions/_lib/ai-quota.js")).consumeGeminiRequest.toString();
assert.match(quotaSource, /gemini-rolling-24h/);
assert.match(quotaSource, /gemini-15-seconds/);

const originalFetch = globalThis.fetch;
const attemptedModels = [];
try {
  globalThis.fetch = async (_url, options) => {
    attemptedModels.push(JSON.parse(options.body).model);
    if (attemptedModels.length === 1) return new Response(JSON.stringify({ error: { status: "UNAVAILABLE", message: "busy" } }), { status: 503, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ status: "completed", steps: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const fallback = await requestGeminiInteraction({ apiKey: "test-key", input: "test", timeoutMs: 1000 });
  assert.equal(fallback.response.status, 200);
  assert.deepEqual(attemptedModels, ["gemini-3.8-flash", "gemini-3.6-flash"], "HTTP 503 triggers exactly one fallback model request");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS: inventory, measured pHash threshold, mandatory keywords, fake-material rejection, proxy and server-side save gate, Gemini validation, bounded 503 fallback, AI publication gate");
