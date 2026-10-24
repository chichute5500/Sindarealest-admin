import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as uploadPaymentQr } from "../functions/api/admin/payment-qr-upload.js";

const SECRET = "payment-qr-upload-atomicity-secret-32-chars-minimum";
const PASSWORD = "payment-qr-upload-atomicity-admin-password";
const PRIOR_PENDING = "qr-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png";
const ACTIVE_KEY = "qr-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png";
const SESSION = await createSession(SECRET);
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fixture({ failBatch = false } = {}) {
  const state = new Map([
    ["payment_qr_active", "1"],
    ["payment_qr_active_key", ACTIVE_KEY],
    ["payment_qr_pending_key", PRIOR_PENDING],
  ]);
  const writes = { batchCalls: [], runCalls: [], uploaded: [], deleted: [], audits: [] };
  const DB = {
    state, writes,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async run() {
          writes.runCalls.push({ sql: this.sql, values: this.values });
          if (this.sql.startsWith("INSERT INTO settings")) {
            state.set(String(this.values[0]), String(this.values[1]));
            return { success: true, meta: { changes: 1 } };
          }
          if (this.sql.startsWith("INSERT INTO audit_logs")) {
            if (failBatch) throw new Error("simulated audit insert failure");
            writes.audits.push({ sql: this.sql, values: this.values });
            return { success: true, meta: { changes: 1 } };
          }
          throw new Error("Unexpected statement: " + this.sql);
        },
      };
      return statement;
    },
    async batch(statements) {
      writes.batchCalls.push(statements.map(s => ({ sql: s.sql, values: s.values })));
      if (failBatch) throw new Error("simulated atomic D1 batch failure");
      for (const s of statements) {
        if (s.sql.startsWith("INSERT INTO settings")) {
          state.set(String(s.values[0]), String(s.values[1]));
        } else if (s.sql.startsWith("INSERT INTO audit_logs")) {
          writes.audits.push({ sql: s.sql, values: s.values });
        } else {
          throw new Error("Unexpected batch statement: " + s.sql);
        }
      }
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const objects = new Map();
  const IMAGES = {
    objects,
    async put(key, bytes, options) {
      writes.uploaded.push({ key, size: bytes.byteLength, options });
      objects.set(key, { bytes, options });
    },
    async delete(key) {
      writes.deleted.push(key);
      objects.delete(key);
    },
  };
  return { DB, IMAGES, state, writes, objects };
}

async function postUpload(f) {
  const form = new FormData();
  form.append("file", new Blob([PNG_SIGNATURE], { type: "image/png" }), "bank-qr.png");
  const request = new Request("https://shop.example/api/admin/payment-qr-upload", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + SESSION,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
    },
    body: form,
  });
  return uploadPaymentQr({
    request,
    env: { DB: f.DB, IMAGES: f.IMAGES, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: SECRET },
  });
}

{
  const f = fixture();
  const response = await postUpload(f);
  assert.equal(response.status, 201, "a valid QR upload should be accepted as pending");
  const payload = await response.json();
  assert.equal(payload.active, false, "upload must never activate a QR by itself");
  assert.equal(f.state.get("payment_qr_active"), "1");
  assert.equal(f.state.get("payment_qr_active_key"), ACTIVE_KEY);
  assert.match(f.state.get("payment_qr_pending_key"), /^qr-[0-9a-f-]{36}\.png$/);
  assert.equal(f.writes.batchCalls.length, 1,
    "pending-key update and audit record must commit in one D1 batch");
  assert.equal(f.writes.batchCalls[0].length, 2,
    "the D1 batch must contain both the pending-key write and its audit event");
  assert.equal(f.writes.runCalls.length, 0, "upload metadata must not be committed via separate run calls");
  assert.equal(f.writes.audits.length, 1);
}

{
  const f = fixture({ failBatch: true });
  const response = await postUpload(f);
  assert.equal(response.status, 503, "a failed D1 batch should be reported as a service error");
  assert.equal(f.state.get("payment_qr_pending_key"), PRIOR_PENDING,
    "a failed audit/metadata transaction must not leave a new QR marked pending");
  assert.equal(f.state.get("payment_qr_active_key"), ACTIVE_KEY,
    "failed upload metadata persistence must not affect the active QR");
  assert.equal(f.state.get("payment_qr_active"), "1");
  assert.equal(f.writes.uploaded.length, 1, "the regression must stage an R2 object before simulating D1 failure");
  assert.deepEqual(f.writes.deleted, [f.writes.uploaded[0].key],
    "a newly uploaded R2 object must be cleaned up when the D1 transaction fails");
  assert.equal(f.objects.size, 0, "failed upload must not leave the newly staged QR object behind");
}

console.log("PASS: QR upload commits pending pointer and audit atomically and cleans up staged R2 on failure.");
