import assert from "node:assert/strict";
import {
  imageBackupBindingsReady,
  markImageBackupCronHeartbeat,
  readImageBackupSettings,
  runImageBackup,
  setImageBackupSettings,
} from "../functions/_lib/image-backup.js";

class FakeDB {
  constructor() { this.values = new Map(); }
  prepare(sql) {
    const db = this;
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() {
        assert.match(sql, /^SELECT value FROM settings/);
        return db.values.has(args[0]) ? { value: db.values.get(args[0]) } : null;
      },
      async run() {
        if (sql.startsWith("INSERT OR IGNORE")) {
          if (!db.values.has(args[0])) db.values.set(args[0], args[1]);
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT INTO settings")) {
          db.values.set(args[0], args[1]);
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE settings SET value=")) {
          const current = db.values.get(args[1]) || "0";
          if (Number(current.slice(0, 10)) < args[2]) {
            db.values.set(args[1], args[0]);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        if (sql.startsWith("DELETE FROM settings")) {
          if (db.values.get(args[0]) === args[1]) db.values.delete(args[0]);
          return { meta: { changes: 1 } };
        }
        throw Error("Unexpected SQL: " + sql);
      },
    };
  }
}
function obj(key, etag, content = "image") {
  const data = new TextEncoder().encode(content);
  return { key, etag, size: data.byteLength, data, httpMetadata: { contentType: "image/webp" } };
}
class Source {
  constructor(objects = []) { this.objects = objects; this.gets = 0; this.lists = 0; }
  async list({ cursor, limit }) {
    this.lists++;
    const offset = cursor ? Number(cursor) : 0;
    const selected = this.objects.slice(offset, offset + limit);
    const end = offset + selected.length;
    return { objects: selected, truncated: end < this.objects.length, cursor: end < this.objects.length ? String(end) : undefined };
  }
  async get(key) {
    this.gets++;
    const row = this.objects.find(row => row.key === key);
    return row ? { ...row, body: row.data } : null;
  }
  async put() { throw Error("Source bucket must never be written."); }
  async delete() { throw Error("Source bucket must never be deleted."); }
}
class Backup {
  constructor() { this.objects = new Map(); this.puts = 0; this.gets = 0; }
  async head(key) { return this.objects.get(key) || null; }
  async put(key, body, opts) {
    this.puts++;
    const data = body instanceof Uint8Array ? body : new Uint8Array(await new Response(body).arrayBuffer());
    this.objects.set(key, { size: data.length, body: data, ...opts });
  }
  async delete() { throw Error("Automated backup must never delete history."); }
}
function env(images, originals, backup = new Backup()) {
  return { DB: new FakeDB(), IMAGES: new Source(images), ORIGINALS: new Source(originals),
    IMAGE_BACKUPS: backup, IMAGE_BACKUP_BUCKET_VERIFIED: "true" };
}

// Readiness gate prevents accidental activation against missing/unverified buckets.
const missing = env([], []);
missing.IMAGE_BACKUP_BUCKET_VERIFIED = "false";
assert.equal(imageBackupBindingsReady(missing), false);
await assert.rejects(() => setImageBackupSettings(missing, { enabled: true, cadence: "daily" }), /IMAGE_BACKUPS/);
await assert.rejects(() => runImageBackup(missing, { force: true }), /cấu hình/);
assert.equal((await readImageBackupSettings(missing)).enabled, false);

// Both sources must be copied; metadata must be private and source objects unchanged.
const e = env([obj("product/one.webp", "abc123")], [obj("private-originals/one.jpg", "def456", "photo")]);
assert.equal((await readImageBackupSettings(e)).enabled, false);
assert.equal((await readImageBackupSettings(e)).schedulerLastSeenAt, null);
await markImageBackupCronHeartbeat(e);
assert.ok((await readImageBackupSettings(e)).schedulerLastSeenAt);
const first = await runImageBackup(e, { force: true });
assert.equal(first.state.phase, "idle");
assert.equal(first.state.scanned, 2);
assert.equal(first.state.copied, 2);
assert.equal(e.IMAGE_BACKUPS.objects.size, 2);
assert.deepEqual([...e.IMAGE_BACKUPS.objects.keys()].map(k => k.split("/")[1]).sort(), ["images", "originals"]);
for (const entry of e.IMAGE_BACKUPS.objects.values()) {
  assert.equal(entry.httpMetadata.cacheControl, "private, no-store");
  assert.ok(entry.customMetadata.sourceEtag);
}
assert.ok(first.state.lastCompletedAt);
const second = await runImageBackup(e, { force: true });
assert.equal(second.state.copied, 0);
assert.equal(second.state.existing, 2);
assert.equal(e.IMAGE_BACKUPS.puts, 2, "Unchanged object must not be recopied");

// A new version must not erase old backup versions.
e.IMAGES.objects = [obj("product/one.webp", "abc124", "new image")];
const changed = await runImageBackup(e, { force: true });
assert.equal(changed.state.copied, 1);
assert.equal(e.IMAGE_BACKUPS.objects.size, 3);

// A new scan cannot be scheduled again early, but manual force can.
await setImageBackupSettings(e, { enabled: true, cadence: "weekly" });
const beforeLists = e.IMAGES.lists;
const notDue = await runImageBackup(e);
assert.equal(notDue.skipped, "not-due");
assert.equal(e.IMAGES.lists, beforeLists);

// Large catalog is processed in bounded batches with persisted progress/cursors.
const big = env(Array.from({ length: 70 }, (_, i) => obj("p" + i + ".webp", "e" + i)), []);
await setImageBackupSettings(big, { enabled: true, cadence: "daily" });
const part = await runImageBackup(big);
assert.equal(part.state.phase, "IMAGES");
assert.equal(part.state.scanned, 8);
assert.equal(part.state.lastCompletedAt, null);
let full = part;
for(let attempt=0;attempt<20&&full.state.phase!=="idle";attempt++)full=await runImageBackup(big);
assert.equal(full.state.phase, "idle");
assert.equal(full.state.scanned, 70);
assert.equal(full.state.copied, 70);
assert.equal(big.IMAGE_BACKUPS.objects.size, 70);

// A failed copy cannot falsely complete a scan and can be retried.
const failure = env([obj("fragile.webp", "abc777")], []);
const originalPut = failure.IMAGE_BACKUPS.put.bind(failure.IMAGE_BACKUPS);
failure.IMAGE_BACKUPS.put = async () => { throw new Error("SIMULATED-R2-FAIL"); };
await assert.rejects(() => runImageBackup(failure, { force: true }), /SIMULATED-R2-FAIL/);
const incomplete = await readImageBackupSettings(failure);
assert.equal(incomplete.state.lastCompletedAt, null);
assert.match(incomplete.state.lastError, /SIMULATED-R2-FAIL/);
failure.IMAGE_BACKUPS.put = originalPut;
const retry = await runImageBackup(failure, { force: true });
assert.equal(retry.state.copied, 1);
assert.equal(retry.state.phase, "idle");

console.log("PASS: image backup binding gate, source immutability, both R2 buckets, versioning, resumable pagination, scheduling and failure/retry.");
