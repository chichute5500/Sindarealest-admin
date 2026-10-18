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
const DB = {
  prepare(sql) { return new D1Statement(sql); },
  async batch(statements) {
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
function seedImage(key, category = "sneaker") {
  sqlite.prepare("INSERT OR REPLACE INTO image_group_index(image_key,p_hash,features_json,width,height,source_size,source_uploaded) VALUES(?,?,?,?,?,?,?)")
    .run(key, "a".repeat(16), JSON.stringify({ category, contentHash: "b".repeat(64) }), 120, 90, 5000, "");
}
async function seedGroup(id, keys, category = "sneaker", scores = []) {
  sqlite.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status) VALUES(?,?,?,?, 'pending')")
    .run(id, await hashGroup(keys), 88, "fixture proposal");
  keys.forEach((key, index) => {
    seedImage(key, category);
    sqlite.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) VALUES(?,?,?)")
      .run(id, key, scores[index] ?? (90 - index));
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

console.log("PASS: SQLite integration fixtures verified split, merge, move, category conflict rejection, snapshot-protected approval, undo, claims, and audit entries.");
sqlite.close();
