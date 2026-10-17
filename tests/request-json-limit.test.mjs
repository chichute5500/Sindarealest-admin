import assert from "node:assert/strict";
import { readJsonBodyLimited } from "../functions/_lib.js";

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

const invalid = await readJsonBodyLimited(new Request("https://shop.example/api/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{broken",
}), 1024);
assert.equal(invalid.error, "invalid", "malformed JSON should return a controlled parse error");

console.log("PASS: bounded JSON parser rejects oversized request bodies before unbounded buffering.");
