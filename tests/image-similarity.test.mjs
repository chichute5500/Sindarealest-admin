import assert from "node:assert/strict";
import { categoryOf, compareDescriptors, findExactDuplicateGroups, findSimilarGroups, hashDistance, isCachedDescriptorValid } from "../public/admin/image-similarity.js";

const colorsA = [1,0,0,0, 1,0,0,0, 0,0,1,0];
const colorsB = [0,0,0,1, 0,0,0,1, 1,0,0,0];
const shapeA = Array.from({ length: 64 }, (_, index) => index > 20 && index < 44 ? 0.9 : 0.05);
const shapeB = Array.from({ length: 64 }, (_, index) => index < 16 || index > 47 ? 0.95 : 0.02);
const descriptor = (key, p_hash, shape, colors, assignedTo=[], category="sneaker", contentHash="") => ({
  key, p_hash, features: { shape, colors, category, categoryStatus: "classified", categoryConfidence: 95, identityDescriptor: "loại=giày; chất liệu=da; vân=ô nhỏ; silhouette=mũi tròn; đế=đen; đường may=đôi; logo=nhỏ; dấu hiệu=khóa kim loại", ...(contentHash ? { contentHash } : {}) }, assignedTo
});

assert.equal(hashDistance("0000000000000000", "0000000000000000"), 0);
assert.equal(hashDistance("0000000000000000", "ffffffffffffffff"), 64);

assert.equal(categoryOf({ category: "sneaker", features: { shape: shapeA, colors: colorsA, category: "sneaker", categoryStatus: "classified", categoryConfidence: 92 } }), "sneaker");
assert.equal(categoryOf({ category: "sneaker", features: { shape: shapeA, colors: colorsA, category: "sneaker", categoryStatus: "needs_review", categoryConfidence: 92 } }), "unknown",
  "review-needed vision categories must not drive automatic grouping");
assert.equal(categoryOf({ category: "sneaker", features: { shape: shapeA, colors: colorsA, category: "sneaker", categoryStatus: "classified", categoryConfidence: 69 } }), "unknown",
  "low-confidence categories must not be treated as confirmed");
assert.equal(categoryOf({ features_json: JSON.stringify({ category: "loafer", categoryStatus: "classified", categoryConfidence: 88, shape: shapeA, colors: colorsA }) }), "loafer",
  "persisted JSON feature rows should retain confirmed category");

const cacheKey = "cached/shoes/front.webp";
const cacheFeatures = {
  shape: Array(64).fill(0.5),
  colors: Array(12).fill(0.25),
  contentHash: "a".repeat(64),
  identityDescriptor: "loại=giày; chất liệu=da; vân=ô nhỏ; silhouette=mũi tròn; đế=đen; đường may=đôi; logo=nhỏ; dấu hiệu=khóa kim loại",
  category: "sneaker",
  categoryStatus: "classified",
  categoryConfidence: 95
};
const cacheRow = {
  image_key: cacheKey,
  p_hash: "0123456789abcdef",
  features_json: JSON.stringify(cacheFeatures),
  width: 128,
  height: 96,
  source_size: 500,
  source_uploaded: "2026-01-01T00:00:00.000Z"
};
const cacheInventoryItem = {
  key: cacheKey,
  size: 500,
  uploaded: "2026-01-01T00:00:00.000Z"
};
assert.equal(isCachedDescriptorValid(cacheRow, cacheInventoryItem), true,
  "a complete, confidence-qualified cache row should be reusable");
assert.equal(isCachedDescriptorValid({ ...cacheRow, features_json: JSON.stringify({ ...cacheFeatures, shape: [1.2, ...cacheFeatures.shape.slice(1)] }) }, cacheInventoryItem), false,
  "out-of-range shape features must trigger re-indexing");
assert.equal(isCachedDescriptorValid({ ...cacheRow, features_json: JSON.stringify({ ...cacheFeatures, categoryConfidence: 65 }) }, cacheInventoryItem), false,
  "a low-confidence row incorrectly marked classified must trigger re-indexing");
assert.equal(isCachedDescriptorValid({ ...cacheRow, p_hash: "not-a-hash" }, cacheInventoryItem), false,
  "invalid perceptual hashes must trigger re-indexing");
assert.equal(isCachedDescriptorValid({ ...cacheRow, source_size: 499 }, cacheInventoryItem), false,
  "stale source metadata must trigger re-indexing");
assert.equal(isCachedDescriptorValid({
  ...cacheRow,
  features_json: JSON.stringify({ ...cacheFeatures, category: "unknown", categoryStatus: "needs_review", categoryConfidence: 40 })
}, cacheInventoryItem), true,
  "a valid needs_review row should stay in manual review rather than be mislabeled as a successful group");

assert.equal(compareDescriptors(
  descriptor("a.webp", "0011223344556677", shapeA, colorsA),
  descriptor("b.webp", "0011223344556677", shapeA, colorsA)
).score, 100);
assert.equal(compareDescriptors(
  descriptor("a.webp", "0000000000000000", shapeA, colorsA),
  descriptor("z.webp", "ffffffffffffffff", shapeB, colorsB)
).match, false);

const items = [
  descriptor("batch-1/a.webp", "0000000000000000", shapeA, colorsA),
  descriptor("batch-2/b.webp", "0000000000000000", shapeA, colorsA),
  descriptor("batch-3/c.webp", "ffffffffffffffff", shapeB, colorsB),
  descriptor("batch-4/d.webp", "ffffffffffffffff", shapeB, colorsB)
];
let lastProgress;
const result = await findSimilarGroups(items, { threshold: 70, onProgress: update => { lastProgress = update; } });
assert.equal(result.compared, 6, "all six pairs must be compared across the complete inventory, not within batches");
assert.equal(result.groups.length, 2);
assert.deepEqual(result.groups.map(group => group.imageKeys.length).sort(), [2,2]);
assert.ok(result.groups.some(group => group.imageKeys.includes("batch-1/a.webp") && group.imageKeys.includes("batch-2/b.webp")));
assert.ok(result.groups.some(group => group.imageKeys.includes("batch-3/c.webp") && group.imageKeys.includes("batch-4/d.webp")));
assert.equal(lastProgress.total, 6);

const large = Array.from({ length: 65 }, (_, index) =>
  descriptor("large-batch/" + String(index).padStart(3, "0") + ".webp", "0011223344556677", shapeA, colorsA)
);
const split = await findSimilarGroups(large);
assert.equal(split.compared, 65 * 64 / 2, "large inventory still compares all cross-batch image pairs");
assert.deepEqual(split.groups.map(group => group.imageKeys.length).sort((a,b)=>a-b), [7,7,7,7,7,7,7,8,8]);
assert.ok(split.groups.every(group => group.imageKeys.length <= 8), "every candidate group is small enough for exhaustive AI pairwise verification");

const alreadyAssigned = items.slice(0,2).map(item => ({ ...item, assignedTo: [{ sku: "SD-SN001" }] }));
const skipped = await findSimilarGroups(alreadyAssigned);
assert.equal(skipped.groups.length, 0, "do not re-propose images already assigned to the same SKU");
const crossSku = items.slice(0,2).map((item, index) => ({
  ...item,
  assignedTo: [{ sku: index === 0 ? "SD-TL001" : "SD-TL002" }]
}));
assert.equal((await findSimilarGroups(crossSku)).groups.length, 0,
  "never propose visually similar images that already belong to different SKUs");

// Sort proposed gallery members by the computed similarity rank, not by file name.
const rankAnchor = descriptor("z-anchor.webp", "1111111111111111", Array(64).fill(0), colorsA);
const rankStrong = descriptor("b-strong.webp", "1111111111111111", Array(64).fill(0.1), colorsA);
const rankWeak = descriptor("a-weaker.webp", "1111111111111111", Array(64).fill(0.3), colorsA);
const ranked = await findSimilarGroups([rankAnchor, rankStrong, rankWeak]);
const rankedGroup = ranked.groups.find(group => group.imageKeys.length === 3);
assert.ok(rankedGroup, "fixture should propose one coherent 3-image set");
assert.deepEqual(rankedGroup.imageKeys, rankedGroup.members.map(member => member.key),
  "imageKeys and member ordering should remain aligned");
assert.notDeepEqual(rankedGroup.imageKeys, [...rankedGroup.imageKeys].sort(),
  "proposal ordering must not be replaced by lexical filename ordering");

// A bridge image must not transitively combine otherwise incompatible products.
const chainA = descriptor("chain/a.webp", "0011223344556677", Array(64).fill(0), colorsA);
const chainBShape = Array.from({ length: 64 }, (_, i) => i < 40 ? 0.5 : 0);
const chainCShape = Array.from({ length: 64 }, (_, i) => i < 40 ? 1 : 0);
const chainB = descriptor("chain/b.webp", "0011223344556677", chainBShape, colorsA);
const chainC = descriptor("chain/c.webp", "0011223344556677", chainCShape, colorsA);
assert.equal(compareDescriptors(chainA, chainB).match, true, "neighboring views may be grouped when shape/color both agree");
assert.equal(compareDescriptors(chainB, chainC).match, true, "the bridge pair is individually similar");
assert.equal(compareDescriptors(chainA, chainC).match, false, "the endpoints are not similar enough to belong to one set");
const coherent = await findSimilarGroups([chainA, chainB, chainC]);
assert.deepEqual(coherent.groups.map(group => group.imageKeys.length).sort((a,b)=>a-b), [2], "a transitive bridge must not create a mixed 3-image set");
assert.ok(coherent.groups.some(group => group.imageKeys.includes("chain/a.webp") && group.imageKeys.includes("chain/b.webp")));
// Complete-link grouping must not combine a pairwise-conflicting lookalike into one product set.
const allZeroShape = Array(64).fill(0);
const firstHalfShape = Array.from({ length: 64 }, (_, i) => i < 32 ? 0.8 : 0);
const secondHalfShape = Array.from({ length: 64 }, (_, i) => i >= 32 ? 0.8 : 0);
const pairA = descriptor("strict/a.webp", "1111111111111111", allZeroShape, colorsA);
const pairB = descriptor("strict/b.webp", "1111111111111111", firstHalfShape, colorsA);
const pairC = descriptor("strict/c.webp", "1111111111111111", secondHalfShape, colorsA);
assert.equal(compareDescriptors(pairA, pairB).match, true);
assert.equal(compareDescriptors(pairA, pairC).match, true);
assert.equal(compareDescriptors(pairB, pairC).match, false);
const strict = await findSimilarGroups([pairA, pairB, pairC]);
assert.ok(strict.groups.every(group => group.imageKeys.length < 3), "a candidate must directly match every member, not just the anchor");

const duplicateHash = "a".repeat(64);
const duplicateA = descriptor("duplicate/a.webp", "0011223344556677", shapeA, colorsA, [], "sneaker", duplicateHash);
const duplicateB = descriptor("duplicate/b.webp", "0011223344556677", shapeA, colorsA, [], "sneaker", duplicateHash);
const exactDuplicates = findExactDuplicateGroups([duplicateA, duplicateB]);
assert.equal(exactDuplicates.length, 1, "byte-identical copies are detected with SHA-256, not only perceptual similarity");
assert.deepEqual(exactDuplicates[0].imageKeys, ["duplicate/a.webp", "duplicate/b.webp"]);
assert.equal(compareDescriptors(duplicateA, duplicateB).exactDuplicate, true);
assert.equal(compareDescriptors(duplicateA, duplicateB).match, false, "byte-identical duplicates stay in the duplicate-review section");
assert.equal((await findSimilarGroups([duplicateA, duplicateB])).groups.length, 0, "exact duplicates must not be proposed as same-product views");
assert.equal(findExactDuplicateGroups([duplicateA, { ...duplicateB, features: { ...duplicateB.features, contentHash: "b".repeat(64) } }]).length, 0);

 // The anchor decides membership by its direct matches and not by candidate-to-candidate similarity.
const anchor = descriptor("anchor/a.webp", "0011223344556677", shapeA, colorsA);
const directMatchB = descriptor("anchor/b.webp", "0011223344556677", shapeA, colorsA);
const directMatchC = descriptor("anchor/c.webp", "0011223344556677", shapeA, colorsA);
const anchored = await findSimilarGroups([anchor, directMatchB, directMatchC]);
assert.equal(anchored.groups.length, 1, "the first unprocessed image forms a set from its own direct matches");
assert.deepEqual(anchored.groups[0].imageKeys, ["anchor/a.webp", "anchor/b.webp", "anchor/c.webp"]);
assert.equal(anchored.groups[0].category, "sneaker", "every second-tier image set belongs to a first-tier product category");

const crossCategory = await findSimilarGroups([
  descriptor("category/shoe.webp", "0011223344556677", shapeA, colorsA, [], "sneaker"),
  descriptor("category/belt.webp", "0011223344556677", shapeA, colorsA, [], "belt"),
  descriptor("category/unknown.webp", "0011223344556677", shapeA, colorsA, [], "unknown"),
  descriptor("category/shoe-2.webp", "0011223344556677", shapeA, colorsA, [], "sneaker")
]);
assert.equal(crossCategory.groups.length, 1, "different product categories and unknown classifications must never be grouped together");
assert.deepEqual(crossCategory.groups[0].imageKeys, ["category/shoe-2.webp", "category/shoe.webp"]);
assert.equal(crossCategory.groups[0].category, "sneaker");


const uncertainCategory = descriptor("category/uncertain.webp", "0011223344556677", shapeA, colorsA);
uncertainCategory.features.categoryConfidence = 69;
uncertainCategory.features.categoryStatus = "needs_review";
assert.equal((await findSimilarGroups([
  descriptor("category/certain-a.webp", "0011223344556677", shapeA, colorsA),
  { ...uncertainCategory, key: "category/uncertain-a.webp" }
])).groups.length, 0, "a valid-looking category below the 70% confidence gate must not enter visual grouping");
const flaggedCategory = descriptor("category/flagged.webp", "0011223344556677", shapeA, colorsA);
flaggedCategory.features.categoryConfidence = 94;
flaggedCategory.features.categoryStatus = "needs_review";
assert.equal((await findSimilarGroups([
  descriptor("category/certain-b.webp", "0011223344556677", shapeA, colorsA),
  { ...flaggedCategory, key: "category/flagged-b.webp" }
])).groups.length, 0, "an explicitly review-needed category must remain excluded even if its confidence field is high");

console.log("PASS: full-inventory comparisons, category-first isolation, low-confidence exclusion, anchor-first grouping, no transitive bridge grouping, and same-SKU skip.");
