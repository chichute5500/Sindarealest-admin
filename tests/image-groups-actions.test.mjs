import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { onRequestPost } from "../functions/api/admin/image-groups-index.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "image-groups-action-admin-test";
const SESSION_SECRET = "image-groups-action-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(`
CREATE TABLE products(id TEXT PRIMARY KEY, sku TEXT NOT NULL, title TEXT NOT NULL, images_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE image_group_index(image_key TEXT PRIMARY KEY, p_hash TEXT NOT NULL, features_json TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, source_size INTEGER NOT NULL DEFAULT 0, source_uploaded TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE image_group_sets(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE, similarity INTEGER NOT NULL CHECK(similarity BETWEEN 0 AND 100), rationale TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), product_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT);
CREATE TABLE image_group_set_members(group_id TEXT NOT NULL, image_key TEXT NOT NULL, similarity INTEGER NOT NULL CHECK(similarity BETWEEN 0 AND 100), PRIMARY KEY(group_id,image_key));
CREATE TABLE image_group_image_claims(image_key TEXT PRIMARY KEY, group_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved')), created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE audit_logs(id TEXT PRIMARY KEY, actor TEXT NOT NULL DEFAULT 'system', action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL DEFAULT '', details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')));
`);

class D1Statement {
  constructor(sql) { this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async first() { return sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.args);
    return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}
let pendingConcurrentClaim = null;
const DB = {
  prepare(sql) { return new D1Statement(sql); },
  async batch(statements) {
    // Simulate another request acquiring a member after this request's reads
    // but immediately before its final transactional group insert.
    if (pendingConcurrentClaim && statements.some(statement =>
      statement.sql.includes("INSERT INTO image_group_image_claims") &&
      statement.args[0] === pendingConcurrentClaim.imageKey
    )) {
      const fixture = pendingConcurrentClaim;
      pendingConcurrentClaim = null;
      sqlite.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status) VALUES(?,?,?,'Tầng 1 đã phân loại ảnh vào nhóm giày thể thao.','pending')")
        .run(fixture.id, fixture.fingerprint, 90);
      for (const [key, score] of [[fixture.imageKey, 90], [fixture.peerKey, 88]]) {
        sqlite.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) VALUES(?,?,?)").run(fixture.id, key, score);
        sqlite.prepare("INSERT INTO image_group_image_claims(image_key,group_id,status) VALUES(?,?,'pending')").run(key, fixture.id);
      }
    }
    sqlite.exec("BEGIN");
    try {
      const results = statements.map(statement => {
        const result = sqlite.prepare(statement.sql).run(...statement.args);
        return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid || 0) } };
      });
      sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
};
const env = {
  DB,
  IMAGES: { async head(key) { return key ? { key } : null; }, async get(key) { return key ? { key } : null; } },
  ADMIN_PASSWORD,
  SESSION_SECRET
};
const request = body => new Request("https://preview.example/api/admin/image-groups-index", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify(body)
});
async function call(body) {
  const response = await onRequestPost({ request: request(body), env });
  let result = {};
  try { result = await response.json(); } catch {}
  return { status: response.status, ...result };
}
async function hashGroup(keys) {
  const canonical = "visual-similarity-v1\n" + [...keys].sort().join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function seedImage(key, category = "sneaker", categoryStatus = "classified", categoryConfidence = 95) {
  const contentHash = [...key].map(character => character.charCodeAt(0).toString(16).padStart(2, "0")).join("").padEnd(64, "0").slice(0, 64);
  const features = {
    category, categoryStatus, categoryConfidence,
    shape: Array(64).fill(0.5),
    colors: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
    contentHash
  };
  sqlite.prepare("INSERT OR REPLACE INTO image_group_index(image_key,p_hash,features_json,width,height,source_size,source_uploaded) VALUES(?,?,?,?,?,?,?)")
    .run(key, "a".repeat(16), JSON.stringify(features), 120, 90, 5000, "");
}
async function seedGroup(id, keys, category = "sneaker", scores = []) {
  sqlite.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status) VALUES(?,?,?,?, 'pending')")
    .run(id, await hashGroup(keys), 94, "fixture proposal");
  keys.forEach((key, index) => {
    seedImage(key, category);
    sqlite.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) VALUES(?,?,?)")
      .run(id, key, scores[index] ?? (96 - index));
    sqlite.prepare("INSERT INTO image_group_image_claims(image_key,group_id,status) VALUES(?,?,'pending')").run(key, id);
  });
}
function members(groupId) {
  return sqlite.prepare("SELECT image_key FROM image_group_set_members WHERE group_id=? ORDER BY image_key").all(groupId).map(row => row.image_key);
}
const ids = { a: crypto.randomUUID(), b: crypto.randomUUID(), approval: crypto.randomUUID(), product: "fixture-product" };
await seedGroup(ids.a, ["a.webp","b.webp","c.webp","d.webp"]);
await sqlite.prepare("INSERT INTO products(id,sku,title,images_json) VALUES(?,?,?,?)").run(ids.product, "FIXTURE-001", "Fixture product", '["/media/existing.webp"]');

// Split: selected images move to a new pending proposal, with claims and audit updated atomically.
const split = await call({ action: "split-group", groupId: ids.a, selectedKeys: ["a.webp","b.webp"] });
assert.equal(split.status, 200, JSON.stringify(split));
assert.deepEqual(members(ids.a), ["c.webp","d.webp"]);
assert.deepEqual(members(split.newGroupId), ["a.webp","b.webp"]);
assert.equal(sqlite.prepare("SELECT group_id FROM image_group_image_claims WHERE image_key='a.webp'").get().group_id, split.newGroupId);
assert.equal(sqlite.prepare("SELECT action FROM audit_logs WHERE action='image_group_split'").get().action, "image_group_split");

// Merge: reject overlap/category conflicts and merge matching pending groups into a stable target.
const merge = await call({ action: "merge-groups", groupIds: [ids.a, split.newGroupId], targetGroupId: ids.a });
assert.equal(merge.status, 200, JSON.stringify(merge));
assert.deepEqual(members(ids.a), ["a.webp","b.webp","c.webp","d.webp"]);
assert.equal(sqlite.prepare("SELECT status FROM image_group_sets WHERE id=?").get(split.newGroupId).status, "rejected");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_image_claims WHERE group_id=? AND status='pending'").get(ids.a).count, 4);
assert.equal(sqlite.prepare("SELECT action FROM audit_logs WHERE action='image_group_merge'").get().action, "image_group_merge");

// Move one image between same-category sets and keep both proposed sets pending.
ids.b = crypto.randomUUID();
await seedGroup(ids.b, ["e.webp","f.webp"]);
const move = await call({ action: "move-image", sourceGroupId: ids.a, targetGroupId: ids.b, imageKey: "a.webp" });
assert.equal(move.status, 200, JSON.stringify(move));
assert.deepEqual(members(ids.a), ["b.webp","c.webp","d.webp"]);
assert.deepEqual(members(ids.b), ["a.webp","e.webp","f.webp"]);
assert.equal(sqlite.prepare("SELECT group_id FROM image_group_image_claims WHERE image_key='a.webp'").get().group_id, ids.b);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action='image_group_move'").get().count, 1);

// Conflicting categories must never merge.
ids.catA = crypto.randomUUID(); ids.catB = crypto.randomUUID();
await seedGroup(ids.catA, ["g.webp","h.webp"], "dress_shoe");
await seedGroup(ids.catB, ["i.webp","j.webp"], "watch_strap");
const crossCategoryMerge = await call({ action: "merge-groups", groupIds: [ids.catA, ids.catB], targetGroupId: ids.catA });
assert.equal(crossCategoryMerge.status, 409);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_set_members WHERE group_id IN (?,?)").get(ids.catA, ids.catB).count, 4);

// Approval stores exact before/after snapshots; undo restores the exact previous product gallery without deleting R2 objects.
ids.approval = crypto.randomUUID();
await seedGroup(ids.approval, ["undo-a.webp","undo-b.webp"], "sneaker");
const approved = await call({ action: "approve-group", groupId: ids.approval, productId: ids.product });
assert.equal(approved.status, 200, JSON.stringify(approved));
const afterApprove = sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json;
assert.deepEqual(JSON.parse(afterApprove), ["/media/existing.webp","/media/undo-a.webp","/media/undo-b.webp"]);
assert.equal(sqlite.prepare("SELECT status FROM image_group_image_claims WHERE image_key='undo-a.webp'").get().status, "approved");
const approvalAudit = sqlite.prepare("SELECT id,details_json FROM audit_logs WHERE action='image_similarity_group_approved'").get();
const snapshot = JSON.parse(approvalAudit.details_json);
assert.equal(snapshot.previousImagesJson, '["/media/existing.webp"]');
assert.equal(snapshot.nextImagesJson, afterApprove);
const undone = await call({ action: "undo-approval", auditId: approvalAudit.id });
assert.equal(undone.status, 200, JSON.stringify(undone));
assert.equal(sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json, '["/media/existing.webp"]');
assert.equal(sqlite.prepare("SELECT status FROM image_group_sets WHERE id=?").get(ids.approval).status, "pending");
assert.equal(sqlite.prepare("SELECT status FROM image_group_image_claims WHERE image_key='undo-a.webp'").get().status, "pending");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action='image_similarity_group_approval_undone'").get().count, 1);
const repeatedUndo = await call({ action: "undo-approval", auditId: approvalAudit.id });
assert.equal(repeatedUndo.status, 409, "an approval can be undone only once");

const changedApprovalId = crypto.randomUUID();
await seedGroup(changedApprovalId, ["changed-undo-a.webp", "changed-undo-b.webp"]);
const changedApproved = await call({ action: "approve-group", groupId: changedApprovalId, productId: ids.product });
assert.equal(changedApproved.status, 200, JSON.stringify(changedApproved));
const changedAuditRow = sqlite.prepare("SELECT id,details_json FROM audit_logs WHERE action='image_similarity_group_approved'")
  .all().find(row => JSON.parse(row.details_json).groupId === changedApprovalId);
assert.ok(changedAuditRow, "the changed-gallery fixture must have an approval snapshot");
const newerGalleryJson = JSON.stringify([
  ...JSON.parse(sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json),
  "/media/admin-added-after-approval.webp"
]);
sqlite.prepare("UPDATE products SET images_json=? WHERE id=?").run(newerGalleryJson, ids.product);
const guardedUndo = await call({ action: "undo-approval", auditId: changedAuditRow.id });
assert.equal(guardedUndo.status, 409, "undo must refuse to overwrite a gallery edited after approval");
assert.equal(sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json, newerGalleryJson,
  "a refused undo must preserve the newer gallery exactly");
sqlite.prepare("UPDATE products SET images_json=? WHERE id=?").run('["/media/existing.webp"]', ids.product);


// Server must reject a mixed-category proposal even if a browser submits it.
seedImage("mixed-shoe.webp", "sneaker");
seedImage("mixed-watch-strap.webp", "watch_strap");
const mixedGroup = await call({
  action: "save-groups",
  groups: [{
    imageKeys: ["mixed-shoe.webp", "mixed-watch-strap.webp"],
    similarity: 96,
    rationale: "Tầng 1 đã phân loại ảnh vào nhóm “giày thể thao”.",
    members: [
      { key: "mixed-shoe.webp", similarity: 96 },
      { key: "mixed-watch-strap.webp", similarity: 96 }
    ]
  }]
});
assert.equal(mixedGroup.status, 409, "the server rejects a proposal that mixes shoes and watch straps");

// Server-side gates reject client-supplied low scores, unconfirmed categories,
// and visually dissimilar descriptors even when the browser claims 96/100.
const lowScoreKeys = ["low-score-a.webp", "low-score-b.webp"];
lowScoreKeys.forEach(key => seedImage(key));
const lowScoreFingerprint = await hashGroup(lowScoreKeys);
const lowScore = await call({
  action: "save-groups",
  groups: [{ imageKeys: lowScoreKeys, similarity: 90, rationale: "browser score spoof", members: [] }]
});
assert.equal(lowScore.status, 400, "the server must reject a submitted grouping score below 91/100");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint=?").get(lowScoreFingerprint).count, 0);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_image_claims WHERE image_key IN (?,?)").get(...lowScoreKeys).count, 0);

const verifiedMemberKeys = ["verified-member-a.webp", "verified-member-b.webp"];
verifiedMemberKeys.forEach(key => seedImage(key));
const verifiedMemberFingerprint = await hashGroup(verifiedMemberKeys);
const verifiedMemberProposal = await call({
  action: "save-groups",
  groups: [{
    imageKeys: verifiedMemberKeys,
    similarity: 96,
    rationale: "valid verified visual pair",
    members: verifiedMemberKeys.map(key => ({ key, similarity: 1 }))
  }]
});
assert.equal(verifiedMemberProposal.status, 201, JSON.stringify(verifiedMemberProposal));
const verifiedMemberGroup = sqlite.prepare("SELECT similarity FROM image_group_sets WHERE fingerprint=?").get(verifiedMemberFingerprint);
assert.equal(verifiedMemberGroup.similarity, 100, "persist the server-recomputed weakest-pair score");
const verifiedMemberScores = sqlite.prepare("SELECT similarity FROM image_group_set_members WHERE group_id=(SELECT id FROM image_group_sets WHERE fingerprint=?)").all(verifiedMemberFingerprint);
assert.equal(verifiedMemberScores.length, 2);
assert.ok(verifiedMemberScores.every(row => row.similarity >= 91), "member confidence must be recomputed by the server, not copied from browser input");


const reviewKeys = ["review-needed-a.webp", "review-needed-b.webp"];
seedImage(reviewKeys[0], "sneaker", "needs_review", 69);
seedImage(reviewKeys[1]);
const reviewFingerprint = await hashGroup(reviewKeys);
const reviewProposal = await call({
  action: "save-groups",
  groups: [{ imageKeys: reviewKeys, similarity: 96, rationale: "unconfirmed category", members: [] }]
});
assert.equal(reviewProposal.status, 409, "needs_review or category confidence below 70 must fail closed");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint=?").get(reviewFingerprint).count, 0);

const spoofKeys = ["spoofed-similarity-a.webp", "spoofed-similarity-b.webp"];
spoofKeys.forEach(key => seedImage(key));
sqlite.prepare("UPDATE image_group_index SET p_hash=? WHERE image_key=?").run("0".repeat(16), spoofKeys[0]);
sqlite.prepare("UPDATE image_group_index SET p_hash=? WHERE image_key=?").run("f".repeat(16), spoofKeys[1]);
const spoofFingerprint = await hashGroup(spoofKeys);
const spoofedScore = await call({
  action: "save-groups",
  groups: [{ imageKeys: spoofKeys, similarity: 96, rationale: "browser score spoof", members: [] }]
});
assert.equal(spoofedScore.status, 409, "the server must recompute pair similarity from stored perceptual hashes");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint=?").get(spoofFingerprint).count, 0);

const weakApprovalId = crypto.randomUUID();
await seedGroup(weakApprovalId, ["weak-approval-a.webp", "weak-approval-b.webp"]);
sqlite.prepare("UPDATE image_group_sets SET similarity=90 WHERE id=?").run(weakApprovalId);
const beforeWeakApproval = sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json;
const weakApproval = await call({ action: "approve-group", groupId: weakApprovalId, productId: ids.product });
assert.equal(weakApproval.status, 409, "legacy or corrupted pending groups below 91/100 must not bypass the approval gate");
assert.equal(sqlite.prepare("SELECT images_json FROM products WHERE id=?").get(ids.product).images_json, beforeWeakApproval);

// An explicit audited administrator merge may resolve a visual false negative.
// This is a human decision, not an AI proposal bypass: the stored score must
// still be >=91 and all indexed descriptors/categories must remain valid.
const manualOverrideId = crypto.randomUUID();
const manualOverrideKeys = ["manual-override-a.webp", "manual-override-b.webp"];
await seedGroup(manualOverrideId, manualOverrideKeys);
sqlite.prepare("UPDATE image_group_index SET p_hash=? WHERE image_key=?").run("0".repeat(16), manualOverrideKeys[0]);
sqlite.prepare("UPDATE image_group_index SET p_hash=? WHERE image_key=?").run("f".repeat(16), manualOverrideKeys[1]);
sqlite.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,?,?,?,?,?)")
  .run(crypto.randomUUID(), "admin", "image_group_merge", "image_group_set", manualOverrideId,
    JSON.stringify({ mergedGroupIds: [manualOverrideId], imageKeys: manualOverrideKeys }));
const manualOverride = await call({ action: "approve-group", groupId: manualOverrideId, productId: ids.product });
assert.equal(manualOverride.status, 200, "audited manual review must retain the ability to merge a visual false negative");
assert.equal(sqlite.prepare("SELECT status FROM image_group_sets WHERE id=?").get(manualOverrideId).status, "approved");


assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE status='pending' AND rationale LIKE '%giày thể thao%'").get().count, 0,
  "a mixed-category proposal must never enter the pending queue");

// Regressions: reject split/merge/move if a claim is missing or points at another group.
ids.badSplit = crypto.randomUUID();
await seedGroup(ids.badSplit, ["bad-split-a.webp","bad-split-b.webp","bad-split-c.webp","bad-split-d.webp"]);
sqlite.prepare("DELETE FROM image_group_image_claims WHERE image_key=?").run("bad-split-a.webp");
const badSplit = await call({ action: "split-group", groupId: ids.badSplit, selectedKeys: ["bad-split-a.webp","bad-split-b.webp"] });
assert.equal(badSplit.status, 409, "split must refuse a member without its pending claim");
assert.deepEqual(members(ids.badSplit), ["bad-split-a.webp","bad-split-b.webp","bad-split-c.webp","bad-split-d.webp"]);
const badSplitFingerprint = await hashGroup(["bad-split-a.webp","bad-split-b.webp"]);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint=?").get(badSplitFingerprint).count, 0,
  "failed split must not create a new group with the selected images");

ids.badMergeA = crypto.randomUUID(); ids.badMergeB = crypto.randomUUID();
await seedGroup(ids.badMergeA, ["bad-merge-a.webp","bad-merge-b.webp"]);
await seedGroup(ids.badMergeB, ["bad-merge-c.webp","bad-merge-d.webp"]);
sqlite.prepare("UPDATE image_group_image_claims SET group_id=? WHERE image_key=?").run(crypto.randomUUID(), "bad-merge-c.webp");
const badMerge = await call({ action: "merge-groups", groupIds: [ids.badMergeA, ids.badMergeB], targetGroupId: ids.badMergeA });
assert.equal(badMerge.status, 409, "merge must refuse a claim owned by a different group");
assert.deepEqual(members(ids.badMergeA), ["bad-merge-a.webp","bad-merge-b.webp"]);
assert.deepEqual(members(ids.badMergeB), ["bad-merge-c.webp","bad-merge-d.webp"]);
assert.equal(sqlite.prepare("SELECT status FROM image_group_sets WHERE id=?").get(ids.badMergeB).status, "pending");

ids.badMoveA = crypto.randomUUID(); ids.badMoveB = crypto.randomUUID();
await seedGroup(ids.badMoveA, ["bad-move-a.webp","bad-move-b.webp","bad-move-c.webp"]);
await seedGroup(ids.badMoveB, ["bad-move-d.webp","bad-move-e.webp"]);
sqlite.prepare("DELETE FROM image_group_image_claims WHERE image_key=?").run("bad-move-a.webp");
const badMove = await call({ action: "move-image", sourceGroupId: ids.badMoveA, targetGroupId: ids.badMoveB, imageKey: "bad-move-a.webp" });
assert.equal(badMove.status, 409, "move must refuse a source member without its pending claim");
assert.deepEqual(members(ids.badMoveA), ["bad-move-a.webp","bad-move-b.webp","bad-move-c.webp"]);
assert.deepEqual(members(ids.badMoveB), ["bad-move-d.webp","bad-move-e.webp"]);

// save-groups must not persist early valid proposals when a later proposal fails validation.
for (const key of ["atomic-first-a.webp", "atomic-first-b.webp", "atomic-invalid-a.webp", "atomic-invalid-b.webp"]) seedImage(key);
seedImage("atomic-invalid-b.webp", "watch_strap");
const atomicFirstFingerprint = await hashGroup(["atomic-first-a.webp","atomic-first-b.webp"]);
const invalidBatch = await call({
  action: "save-groups",
  groups: [
    { imageKeys: ["atomic-first-a.webp","atomic-first-b.webp"], similarity: 96, rationale: "atomic-first-valid", members: [] },
    { imageKeys: ["atomic-invalid-a.webp","atomic-invalid-b.webp"], similarity: 94, rationale: "atomic-second-mixed", members: [] }
  ]
});
assert.equal(invalidBatch.status, 409, "a later mixed-category proposal should reject the whole request");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint=?").get(atomicFirstFingerprint).count, 0,
  "no earlier valid group may be stored when any proposal in the request fails validation");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_image_claims WHERE image_key IN ('atomic-first-a.webp','atomic-first-b.webp')").get().count, 0);

// A competing claim appearing after validation must roll back all proposed groups from this save request.
for (const key of ["race-first-a.webp", "race-first-b.webp", "race-second-owned.webp", "race-second-new.webp", "race-concurrent-peer.webp"]) seedImage(key);
const raceFirstFingerprint = await hashGroup(["race-first-a.webp","race-first-b.webp"]);
const raceSecondFingerprint = await hashGroup(["race-second-owned.webp","race-second-new.webp"]);
pendingConcurrentClaim = {
  id: crypto.randomUUID(),
  fingerprint: await hashGroup(["race-second-owned.webp","race-concurrent-peer.webp"]),
  imageKey: "race-second-owned.webp",
  peerKey: "race-concurrent-peer.webp"
};
const raceConflict = await call({
  action: "save-groups",
  groups: [
    { imageKeys: ["race-first-a.webp","race-first-b.webp"], similarity: 96, rationale: "Tầng 1 đã phân loại ảnh vào nhóm giày thể thao.", members: [] },
    { imageKeys: ["race-second-owned.webp","race-second-new.webp"], similarity: 95, rationale: "Tầng 1 đã phân loại ảnh vào nhóm giày thể thao.", members: [] }
  ]
});
assert.equal(raceConflict.status, 409, "a concurrent claim conflict must fail closed");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_sets WHERE fingerprint IN (?,?)").get(raceFirstFingerprint, raceSecondFingerprint).count, 0,
  "D1 must roll back all new proposals when any claim in the request conflicts");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_image_claims WHERE image_key='race-second-owned.webp'").get().count, 1,
  "the competing request's winning claim is preserved");
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM image_group_set_members WHERE group_id=?").get(pendingConcurrentClaim?.id || sqlite.prepare("SELECT id FROM image_group_sets WHERE fingerprint=?").get(await hashGroup(["race-second-owned.webp","race-concurrent-peer.webp"])).id).count, 2,
  "the winning concurrent group stays intact");

console.log("PASS: SQLite integration fixtures verify group mutations, claim integrity, approval/undo, no partial save on invalid proposals, and atomic rollback on a simulated concurrent claim.");
sqlite.close();
