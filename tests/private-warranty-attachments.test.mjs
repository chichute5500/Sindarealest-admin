import assert from "node:assert/strict";
import { createSession, getCurrentDateInVietnam } from "../functions/_lib.js";
import { onRequestPost as uploadWarrantyPhoto } from "../functions/api/warranty-claim-uploads.js";
import { onRequestGet as readClaimPhoto } from "../functions/api/admin/warranty-claim-image.js";
import { onRequestGet as publicMedia } from "../functions/media/[key].js";

const warrantyCode = "SDW-" + "A".repeat(24);
const sessionSecret = "private-warranty-attachment-test-secret".padEnd(40, "x");
const adminPassword = "test-admin-password-long-enough";
const webp = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);

function objectFor(bytes = webp) {
  return {
    body: new Uint8Array(bytes),
    writeHttpMetadata(headers) {
      headers.set("Content-Type", "image/webp");
      headers.set("Cache-Control", "private, no-store");
    },
  };
}

function bucket(initial = {}) {
  const objects = new Map(Object.entries(initial));
  const calls = { puts: [], gets: [], deletes: [] };
  return {
    objects,
    calls,
    async put(key, value, options) {
      calls.puts.push({ key, options });
      objects.set(key, objectFor(value));
    },
    async get(key) {
      calls.gets.push(key);
      return objects.get(key) || null;
    },
    async delete(key) {
      calls.deletes.push(key);
      objects.delete(key);
    },
  };
}

function mockDB(startDate = '2026-01-01') {
  const state = { attachmentKey: "", settings: new Map() };
  const db = {
    state,
    prepare(sql) {
      let values = [];
      const statement = {
        sql,
        bind(...next) { values = next; return statement; },
        async first() {
          if (sql.includes("SELECT attempts FROM public_rate_limits")) return { attempts: 1 };
          if (sql.includes("FROM warranties w") && sql.includes("upper(w.warranty_code)=?")) {
            return { id: "warranty-id", warranty_code: warrantyCode, status: "active", starts_at: startDate, ends_at: "2099-12-31" };
          }
          if (sql.includes("SELECT image_key FROM warranty_claim_attachments")) {
            return values[0] === state.attachmentKey && state.attachmentKey
              ? { image_key: state.attachmentKey }
              : null;
          }
          if (sql.includes("FROM settings WHERE key=?")) return state.settings.get(values[0]) || null;
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO settings")) {
            state.settings.set(values[0], { value: values[1], updated_at: "2099-12-31 00:00:00" });
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) {
        if (statement.sql.includes("SELECT attempts FROM public_rate_limits")) {
          results.push({ results: [{ attempts: 1 }] });
        } else {
          const result = await statement.run();
          results.push({ ...result, results: [] });
        }
      }
      return results;
    },
  };
  return db;
}

async function submitPhoto(env, includeLookupToken = true) {
  const form = new FormData();
  form.set("warrantyCode", warrantyCode);
  if (includeLookupToken) {
    const claimToken = "c".repeat(32);
    env.DB.state.settings.set("warranty_lookup:" + claimToken, {
      value: JSON.stringify({ warrantyCode, warrantyId: "warranty-id" }),
      updated_at: "2099-12-31 00:00:00",
    });
    form.set("claimToken", claimToken);
  }
  form.set("file", new Blob([webp], { type: "image/webp" }), "claim.webp");
  return uploadWarrantyPhoto({
    request: new Request("https://shop.example/api/warranty-claim-uploads", {
      method: "POST",
      headers: { Origin: "https://shop.example", "CF-Connecting-IP": "198.51.100.20" },
      body: form,
    }),
    env,
  });
}

const db = mockDB();
const originals = bucket();
const images = bucket();
const rawCodeOnlyUpload = await submitPhoto({ DB: mockDB(), ORIGINALS: bucket(), IMAGES: bucket() }, false);
assert.equal(rawCodeOnlyUpload.status, 403, "photo upload must require a successful lookup token rather than a raw warranty code");

const oversizedUploadRequest = new Request("https://shop.example/api/warranty-claim-uploads", {
  method: "POST",
  headers: {
    Origin: "https://shop.example",
    "CF-Connecting-IP": "198.51.100.21",
    "Content-Type": "multipart/form-data; boundary=test-boundary",
    "Content-Length": String(7 * 1024 * 1024),
  },
  body: "--test-boundary--\\r\\n",
});
const oversizedUpload = await uploadWarrantyPhoto({
  request: oversizedUploadRequest,
  env: { DB: mockDB(), ORIGINALS: bucket(), IMAGES: bucket() },
});
assert.equal(oversizedUpload.status, 413, "oversized declared multipart requests must be rejected before form parsing");

const streamedOversizedUploadRequest = new Request("https://shop.example/api/warranty-claim-uploads", {
  method: "POST",
  headers: {
    Origin: "https://shop.example",
    "CF-Connecting-IP": "198.51.100.22",
    "Content-Type": "multipart/form-data; boundary=test-boundary",
  },
  body: new Uint8Array(6 * 1024 * 1024 + 1),
});
assert.equal(streamedOversizedUploadRequest.headers.has("Content-Length"), false,
  "streaming limit regression must exercise requests without Content-Length");
const streamedOversizedUpload = await uploadWarrantyPhoto({
  request: streamedOversizedUploadRequest,
  env: { DB: mockDB(), ORIGINALS: bucket(), IMAGES: bucket() },
});
assert.equal(streamedOversizedUpload.status, 413,
  "oversized multipart requests without Content-Length must be rejected while streaming");



const upload = await submitPhoto({ DB: db, ORIGINALS: originals, IMAGES: images });
assert.equal(upload.status, 201, "photo uploads should succeed when private ORIGINALS is configured");
const uploaded = await upload.json();
assert.match(uploaded.imageKey, /^warranty-claims\/[0-9a-f]{32}\.webp$/);
assert.equal(originals.calls.puts.length, 1, "warranty evidence must be written to private ORIGINALS");
assert.equal(originals.calls.puts[0].key, uploaded.imageKey);
assert.equal(originals.calls.puts[0].options.httpMetadata.cacheControl, "private, no-store");
assert.equal(originals.calls.puts[0].options.customMetadata.visibility, "private-warranty-claim");
assert.equal(images.calls.puts.length, 0, "customer evidence must not be written to the display-image bucket");
assert.ok(db.state.settings.has("warranty_upload:" + uploaded.imageKey), "upload token metadata must be stored after the private object");

const yearNext = String(Number(getCurrentDateInVietnam().slice(0, 4)) + 1);
const futureOriginals = bucket();
const futureStartUpload = await submitPhoto({ DB: mockDB(yearNext + "-01-01"), ORIGINALS: futureOriginals, IMAGES: bucket() });
assert.equal(futureStartUpload.status, 404, "warranty photo upload must be rejected before the warranty start date");
assert.equal(futureOriginals.calls.puts.length, 0, "future-start warranty rejection must happen before storing evidence");

const missingPrivateBucket = await submitPhoto({ DB: mockDB(), IMAGES: bucket() });
assert.equal(missingPrivateBucket.status, 503, "new warranty uploads must fail closed without private ORIGINALS");
assert.equal((await missingPrivateBucket.json()).ok, false);

db.state.attachmentKey = uploaded.imageKey;
const session = await createSession(sessionSecret);
const adminEnv = {
  DB: db,
  IMAGES: images,
  ORIGINALS: originals,
  ADMIN_PASSWORD: adminPassword,
  SESSION_SECRET: sessionSecret,
};
const adminRequest = () => new Request(
  "https://shop.example/api/admin/warranty-claim-image?key=" + encodeURIComponent(uploaded.imageKey),
  { headers: { Cookie: "sd_admin_session=" + session } },
);
const privateImage = await readClaimPhoto({ request: adminRequest(), env: adminEnv });
assert.equal(privateImage.status, 200, "an authenticated admin should be able to read private evidence");
assert.equal(privateImage.headers.get("Cache-Control"), "private, no-store");
assert.deepEqual(new Uint8Array(await privateImage.arrayBuffer()), webp);
assert.equal(originals.calls.gets.at(-1), uploaded.imageKey);
assert.equal(images.calls.gets.length, 0, "new private evidence should be read from ORIGINALS first");

const legacyKey = "warranty-claims/" + "b".repeat(32) + ".webp";
db.state.attachmentKey = legacyKey;
images.objects.set(legacyKey, objectFor());
const legacyRequest = new Request(
  "https://shop.example/api/admin/warranty-claim-image?key=" + encodeURIComponent(legacyKey),
  { headers: { Cookie: "sd_admin_session=" + session } },
);
const legacyImage = await readClaimPhoto({ request: legacyRequest, env: adminEnv });
assert.equal(legacyImage.status, 200, "older evidence already in IMAGES must remain accessible to admins");
assert.equal(images.calls.gets.at(-1), legacyKey, "legacy fallback should use IMAGES only when ORIGINALS has no object");

// A private R2 outage must never trigger the legacy public-bucket fallback.
const outageLegacyReads = bucket({ [legacyKey]: objectFor() });
const brokenPrivateBucket = {
  async get() { throw new Error("simulated private R2 outage"); },
};
const outage = await readClaimPhoto({
  request: legacyRequest,
  env: { ...adminEnv, ORIGINALS: brokenPrivateBucket, IMAGES: outageLegacyReads },
});
assert.equal(outage.status, 503, "private R2 read errors must fail closed");
assert.equal(outageLegacyReads.calls.gets.length, 0,
  "a private R2 outage is not evidence that a public legacy image should be substituted");
assert.equal((await outage.json()).ok, false);

const publicResponse = await publicMedia({ params: { key: uploaded.imageKey }, env: { IMAGES: images } });
assert.equal(publicResponse.status, 404, "public media routing must reject private warranty evidence paths");
assert.equal(images.calls.gets.at(-1), legacyKey, "the public media route must not fetch a warranty attachment from IMAGES");

console.log("PASS: warranty evidence is stored privately, legacy admin access remains, and public media rejects claim paths.");
