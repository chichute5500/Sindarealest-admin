import assert from "node:assert/strict";
import { assessCrocodileMaterial, inventoryImages, normalizeImageRef } from "../functions/_lib/image-audit.js";
import { analyzeProductImage } from "../functions/_lib/gemini.js";
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
assert.ok((await analyzeProductImage({ apiKey: "", imageBase64: "abc" })).error);
assert.ok((await analyzeProductImage({ apiKey: "x".repeat(20), imageBase64: "abc" })).error);
const candidateKey = "a".repeat(36) + "-ai.webp";
const candidateReview = { image_kind: "candidate", status: "pending", r2_key: candidateKey, image_ref: "/media/" + candidateKey };
assert.equal(canServeAiCandidate(candidateReview), false, "pending AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "rejected" }), false, "rejected AI candidate must not be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved" }), true, "approved AI candidate may be public");
assert.equal(canServeAiCandidate({ ...candidateReview, status: "approved", image_ref: "/media/other.webp" }), false, "mismatched image reference must be blocked");
assert.ok(true, "source URL test extension placeholder");
console.log("PASS: image inventory, material safeguards, Gemini validation, AI candidate publication gate");
