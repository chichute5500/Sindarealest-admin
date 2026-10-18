import assert from "node:assert/strict";
import { compareDescriptors, findExactDuplicateGroups, findSimilarGroups, hashDistance } from "../public/admin/image-similarity.js";

const colorsA = [1,0,0,0, 1,0,0,0, 0,0,1,0];
const colorsB = [0,0,0,1, 0,0,0,1, 1,0,0,0];
const shapeA = Array.from({ length: 64 }, (_, index) => index > 20 && index < 44 ? 0.9 : 0.05);
const shapeB = Array.from({ length: 64 }, (_, index) => index < 16 || index > 47 ? 0.95 : 0.02);
const descriptor = (key, p_hash, shape, colors, assignedTo=[], category="sneaker", contentHash="") => ({
  key, p_hash, features: { shape, colors, category, ...(contentHash ? { contentHash } : {}) }, assignedTo
});

assert.equal(hashDistance("0000000000000000", "0000000000000000"), 0);
assert.equal(hashDistance("0000000000000000", "ffffffffffffffff"), 64);
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
assert.deepEqual(split.groups.map(group => group.imageKeys.length).sort((a,b)=>a-b), [5,30,30]);
assert.ok(split.groups.every(group => group.imageKeys.length <= 30), "no proposed group exceeds product gallery capacity");

const alreadyAssigned = items.slice(0,2).map(item => ({ ...item, assignedTo: [{ sku: "SD-SN001" }] }));
const skipped = await findSimilarGroups(alreadyAssigned);
assert.equal(skipped.groups.length, 0, "do not re-propose images already assigned to the same SKU");

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

console.log("PASS: full-inventory comparisons, category-first isolation, anchor-first grouping, no transitive bridge grouping, and same-SKU skip.");
