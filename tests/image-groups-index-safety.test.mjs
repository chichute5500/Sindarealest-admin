import assert from "node:assert/strict";
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

const oversized = await onRequestPost({ request: request({ action: "invalidate-index", keys: Array.from({ length: 101 }, (_, i) => "image-" + i + ".webp") }), env });
assert.equal(oversized.status, 400);

const unauthorized = await onRequestPost({ request: new Request("https://preview.example/api/admin/image-groups-index", { method: "POST", body: JSON.stringify({ action: "invalidate-index", keys: ["a.webp"] }) }), env });
assert.equal(unauthorized.status, 401);
console.log("PASS: stale image descriptors can be invalidated safely; operation requires admin auth and limits each batch to 100 keys.");
