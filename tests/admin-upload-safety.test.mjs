import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as uploadProductImage } from "../functions/api/admin/upload.js";

const ADMIN_PASSWORD = "admin-upload-test-password-long";
const SESSION_SECRET = "admin-upload-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);

function bucket() {
  return {
    puts: [],
    deletes: [],
    async put(key, bytes, options) { this.puts.push({ key, bytes: new Uint8Array(bytes), options }); },
    async delete(key) { this.deletes.push(key); },
  };
}
function webpBytes() {
  const bytes = new Uint8Array(16);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return bytes;
}
function makeRequest({ originalType = "image/webp", originalBytes = webpBytes(), includeOriginal = true } = {}) {
  const form = new FormData();
  form.append("file", new Blob([webpBytes()], { type: "image/webp" }), "display.webp");
  if (includeOriginal) form.append("original", new Blob([originalBytes], { type: originalType }), "original");
  return new Request("https://shop.example/api/admin/upload", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
    },
    body: form,
  });
}
const originals = bucket(), images = bucket();
const valid = await uploadProductImage({
  request: makeRequest(),
  env: { DB: {}, ADMIN_PASSWORD, SESSION_SECRET, ORIGINALS: originals, IMAGES: images },
});
assert.equal(valid.status, 201, "a valid WebP derivative and original should upload");
assert.equal(originals.puts.length, 1, "original should be stored privately");
assert.equal(images.puts.length, 1, "optimized derivative should be stored in the public bucket");
assert.equal(originals.puts[0].options.customMetadata.visibility, "private-original");
assert.equal(images.puts[0].options.customMetadata.visibility, "public-optimized-derivative");

const badOriginals = bucket(), badImages = bucket();
const mislabeled = await uploadProductImage({
  request: makeRequest({ originalType: "image/jpeg", originalBytes: new TextEncoder().encode("not a JPEG file") }),
  env: { DB: {}, ADMIN_PASSWORD, SESSION_SECRET, ORIGINALS: badOriginals, IMAGES: badImages },
});
assert.equal(mislabeled.status, 400, "original bytes must match the declared JPEG/PNG/WebP type");
assert.equal(badOriginals.puts.length, 0, "mislabeled originals must be rejected before storage");
assert.equal(badImages.puts.length, 0, "rejecting the original must not leave a public derivative behind");

const missingOriginals = bucket(), missingImages = bucket();
const missingOriginal = await uploadProductImage({
  request: makeRequest({ includeOriginal: false }),
  env: { DB: {}, ADMIN_PASSWORD, SESSION_SECRET, ORIGINALS: missingOriginals, IMAGES: missingImages },
});
assert.equal(missingOriginal.status, 400, "missing original file must be rejected instead of storing the optimized derivative as the original");
assert.equal(missingOriginals.puts.length, 0, "missing original must not write to private storage");
assert.equal(missingImages.puts.length, 0, "missing original must not write a public derivative");

// Preview lacking ORIGINALS must fail closed *before* the public derivative is put.
const missingBindingImages = bucket();
const missingBinding = await uploadProductImage({
  request: makeRequest(),
  env: { DB: {}, ADMIN_PASSWORD, SESSION_SECRET, IMAGES: missingBindingImages },
});
assert.equal(missingBinding.status, 503, "unbound private ORIGINALS is a hard upload blocker");
assert.equal(missingBindingImages.puts.length, 0, "no orphaned public R2 derivative when ORIGINALS binding is absent");

// R2 is nontransactional; if the second (public) write fails, roll back ONLY
// the newly created private key, never a previously existing product image.
const rolledBackOriginals = bucket();
const failedPublicImages = { async put() { throw new Error("simulated public R2 write outage"); } };
const failedDerivative = await uploadProductImage({
  request: makeRequest(),
  env: { DB: {}, ADMIN_PASSWORD, SESSION_SECRET, ORIGINALS: rolledBackOriginals, IMAGES: failedPublicImages },
});
assert.equal(failedDerivative.status, 503, "partial image upload cannot claim success");
assert.equal(rolledBackOriginals.puts.length, 1, "private original was staged first");
assert.deepEqual(rolledBackOriginals.deletes, [rolledBackOriginals.puts[0].key],
  "failed public derivative must delete exactly its own newly staged private original");

console.log("PASS: admin image uploads validate original file signatures and keep originals private.");
