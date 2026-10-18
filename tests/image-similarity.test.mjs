import assert from "node:assert/strict";
import { compareDescriptors, findSimilarGroups, hashDistance } from "../public/admin/image-similarity.js";

const colorsA = [1,0,0,0, 1,0,0,0, 0,0,1,0];
const colorsB = [0,0,0,1, 0,0,0,1, 1,0,0,0];
const shapeA = Array.from({ length: 64 }, (_, index) => index > 20 && index < 44 ? 0.9 : 0.05);
const shapeB = Array.from({ length: 64 }, (_, index) => index < 16 || index > 47 ? 0.95 : 0.02);
const descriptor = (key, p_hash, shape, colors, assignedTo=[]) => ({
  key, p_hash, features: { shape, colors }, assignedTo
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

const alreadyAssigned = items.slice(0,2).map(item => ({ ...item, assignedTo: [{ sku: "SD-SN001" }] }));
const skipped = await findSimilarGroups(alreadyAssigned);
assert.equal(skipped.groups.length, 0, "do not re-propose images already assigned to the same SKU");
console.log("PASS: similarity index compares every pair across the full descriptor set and skips groups already attached to one SKU.");
