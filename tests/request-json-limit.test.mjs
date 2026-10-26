import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readBodyBytesLimited, readJsonBodyLimited } from "../functions/_lib.js";

const valid = await readJsonBodyLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Giày", items: [{ id: "p1", quantity: 1 }] }),
}), 1024);
assert.deepEqual(valid.value, { title: "Giày", items: [{ id: "p1", quantity: 1 }] },
  "valid bounded JSON should parse normally");

const declaredTooLarge = await readJsonBodyLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": String(4096),
  },
  body: "{}",
}), 1024);
assert.equal(declaredTooLarge.error, "too_large",
  "declared oversized payloads should be rejected before reading the body");

const streamedTooLarge = await readJsonBodyLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "x".repeat(2048) }),
}), 1024);
assert.equal(streamedTooLarge.error, "too_large",
  "payloads without a trustworthy Content-Length must still be bounded while streaming");

const binaryTooLarge = await readBodyBytesLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: new Uint8Array(2048),
}), 1024);
assert.equal(binaryTooLarge.error, "too_large",
  "shared binary body reader must cap streams without Content-Length");

const invalid = await readJsonBodyLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{broken",
}), 1024);
assert.equal(invalid.error, "invalid", "malformed JSON should return a controlled parse error");

const boundedRoutes = [
  "../functions/api/orders.js",
  "../functions/api/warranty-lookup.js",
  "../functions/api/warranty-claims.js",
  "../functions/api/admin/login.js",
  "../functions/api/admin/ai-description.js",
  "../functions/api/admin/orders.js",
  "../functions/api/admin/products.js",
  "../functions/api/admin/products/[id].js",
  "../functions/api/admin/products/reset-skus.js",
  "../functions/api/admin/settings.js",
  "../functions/api/admin/warranties.js",
  "../functions/api/admin/push-subscriptions.js",
];
for (const path of boundedRoutes) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(source, /readJsonBodyLimited/,
    path + " must use the shared bounded JSON parser");
}
// Multipart can be bounded by the shared reader or a TransformStream which
// avoids duplicating a 26MB request in Pages Function memory. Both must reject
// actual streamed bytes, not just trust Content-Length.
const productImageUpload = readFileSync(new URL("../functions/api/admin/upload.js", import.meta.url), "utf8");
assert.match(productImageUpload,/MAX_MULTIPART_BYTES = MAX_ORIGINAL_BYTES \+ MAX_DERIVATIVE_BYTES/);
assert.match(productImageUpload,/TransformStream/,"Photo uploads use one-pass bounded multipart parsing");
assert.match(productImageUpload,/consumed>MAX_MULTIPART_BYTES/,"Unknown-length photo streams enforce same cap");
assert.match(productImageUpload,/exceeded\)return fail\([^\n]+413\)/,"Overflow returns JSON HTTP 413");
const warrantyImageUpload=readFileSync(new URL("../functions/api/warranty-claim-uploads.js", import.meta.url), "utf8");
assert.match(warrantyImageUpload,/readBodyBytesLimited/,"Warranty upload retains the shared reader");
console.log("PASS: bounded JSON and multipart parsers reject oversized request bodies before unbounded buffering.");
