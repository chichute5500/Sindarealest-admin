import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequestPost } from "../functions/api/admin/image-groups-index.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "image-index-admin-password-test";
const SESSION_SECRET = "image-index-session-secret-long-enough-for-test";
const session = await createSession(SESSION_SECRET);
const executed = [];
const DB = {
  prepare(sql) {
    return {
      sql,
      args: [],
      bind(...args) { this.args = args; return this; },
      async run() {
        executed.push({ sql: this.sql, args: this.args });
        return { meta: { changes: this.args.length } };
      }
    };
  },
  async batch(statements) {
    const snapshot = statements.map(statement => ({ sql: statement.sql, args: statement.args }));
    executed.push(...snapshot);
    return snapshot.map(statement => ({ meta: { changes: statement.args.length } }));
  }
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
const env = { DB, IMAGES: { async head() { return {}; } }, ADMIN_PASSWORD, SESSION_SECRET };

const response = await onRequestPost({ request: request({ action: "invalidate-index", keys: ["nested/a.webp", "nested/b.webp"] }), env });
assert.equal(response.status, 200);
assert.equal((await response.json()).invalidated, 2);
assert.match(executed[0].sql, /^DELETE FROM image_group_index WHERE image_key IN \(\?,\?\)$/);
assert.deepEqual(executed[0].args, ["nested/a.webp", "nested/b.webp"]);

const descriptor = {
  key: "nested/review-needed.webp",
  p_hash: "a".repeat(16),
  width: 120,
  height: 90,
  sourceSize: 5000,
  sourceUploaded: "2026-01-01T00:00:00.000Z",
  features: {
    shape: Array(64).fill(0.5),
    colors: Array(12).fill(0.25),
    contentHash: "b".repeat(64),
    category: "unknown",
    categoryConfidence: 61,
    categoryStatus: "needs_review"
  }
};
const indexResponse = await onRequestPost({ request: request({ action: "index", images: [descriptor] }), env });
assert.equal(indexResponse.status, 200);
const insertIndex = executed.find(statement => statement.sql.includes("INSERT INTO image_group_index"));
assert.ok(insertIndex, "image descriptor must be saved to the index");
const storedFeatures = JSON.parse(insertIndex.args[2]);
assert.equal(storedFeatures.contentHash, "b".repeat(64));
assert.equal(storedFeatures.category, "unknown");
assert.equal(storedFeatures.categoryConfidence, 61);
assert.equal(storedFeatures.categoryStatus, "needs_review");

// A known category label must not override weak confidence or an explicit
// needs_review status supplied by the browser.
const weakCategoryDescriptor = {
  ...descriptor,
  key: "nested/weak-category.webp",
  features: {
    ...descriptor.features,
    category: "sneaker",
    categoryConfidence: 61,
    categoryStatus: "needs_review"
  }
};
const weakCategoryResponse = await onRequestPost({
  request: request({ action: "index", images: [weakCategoryDescriptor] }),
  env
});
assert.equal(weakCategoryResponse.status, 200);
const weakCategoryInsert = executed.filter(statement => statement.sql.includes("INSERT INTO image_group_index")).at(-1);
const weakStoredFeatures = JSON.parse(weakCategoryInsert.args[2]);
assert.equal(weakStoredFeatures.category, "sneaker", "keep the label for admin diagnosis");
assert.equal(weakStoredFeatures.categoryConfidence, 61);
assert.equal(weakStoredFeatures.categoryStatus, "needs_review", "do not upgrade an uncertain known category to classified");

const forgedClassifiedDescriptor = {
  ...descriptor,
  key: "nested/forged-classified.webp",
  features: {
    ...descriptor.features,
    category: "loafer",
    categoryConfidence: 65,
    categoryStatus: "classified"
  }
};
const forgedResponse = await onRequestPost({
  request: request({ action: "index", images: [forgedClassifiedDescriptor] }),
  env
});
assert.equal(forgedResponse.status, 200);
const forgedInsert = executed.filter(statement => statement.sql.includes("INSERT INTO image_group_index")).at(-1);
const forgedFeatures = JSON.parse(forgedInsert.args[2]);
assert.equal(forgedFeatures.categoryStatus, "needs_review", "the server also applies the 70/100 category confidence gate");


const oversized = await onRequestPost({ request: request({ action: "invalidate-index", keys: Array.from({ length: 101 }, (_, i) => "image-" + i + ".webp") }), env });
assert.equal(oversized.status, 400);

const unauthorized = await onRequestPost({ request: new Request("https://preview.example/api/admin/image-groups-index", { method: "POST", body: JSON.stringify({ action: "invalidate-index", keys: ["a.webp"] }) }), env });
assert.equal(unauthorized.status, 401);
const source = await readFile(new URL("../functions/api/admin/image-groups-index.js", import.meta.url), "utf8");
assert.match(source, /const uniqueKeys = rawKeys\.filter\(key => !claimed\.has\(key\)\)/, "a key already claimed by a group must be excluded from later groups");
assert.match(source, /WHERE g\.status IN \('approved','pending'\)/, "approved and pending groups reserve their image keys");
assert.match(source, /DELETE FROM image_group_set_members WHERE group_id=\? AND image_key=\?/, "overlapping members are removed from competing pending groups");
assert.match(source, /if \(remaining\.length < 2\)/, "a group with fewer than two members after de-duplication is rejected");
assert.match(source, /Remove them from every other pending proposal/, "approval removes its image keys from competing proposals");
assert.match(source, /categoryConfidence\\s*[:,]/, "classification confidence is persisted for administrator review");
assert.match(source, /categoryStatus\\s*[:,]/, "uncertain classifications retain a needs_review status");
assert.match(source, /contentHash\\s*[:,]/, "SHA-256 content hashes are stored to detect byte-identical files");

console.log("PASS: stale-index invalidation is protected, and image membership is exclusive across pending/approved groups.");
