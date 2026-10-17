import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseImages } from "../functions/_lib.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const helperStart = html.indexOf("const escapeHtml=");
const helperEnd = html.indexOf("function showToast(", helperStart);
const thumbStart = html.indexOf("function renderFullscreenThumbs()");
const thumbEnd = html.indexOf("\nfunction openFullscreenImage()", thumbStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "storefront must define its HTML escape helper");
assert.ok(thumbStart >= 0 && thumbEnd > thumbStart, "fullscreen gallery renderer must exist");

const helpers = html.slice(helperStart, helperEnd);
const renderer = html.slice(thumbStart, thumbEnd);
const tray = {
  innerHTML: "",
  querySelector() { return null; },
};
const payload = '"><img src=x onerror=alert(1)>';
vm.runInNewContext(`${helpers}\n${renderer}\nrenderFullscreenThumbs();`, {
  detailImages: [payload],
  detailIndex: 0,
  $: () => tray,
});
assert.equal((tray.innerHTML.match(/<img/g) || []).length, 1, "untrusted image values must not inject additional HTML elements");
assert.ok(tray.innerHTML.includes('src="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"'), "thumbnail src attribute must HTML-escape the image path");

const validMedia = "/media/12345678-1234-1234-1234-123456789012.webp";
assert.deepEqual(
  parseImages(JSON.stringify([
    "images/product-main.webp",
    validMedia,
    "https://attacker.example/tracker.webp",
    "javascript:alert(1)",
    "images/broken.webp\" onerror=\"alert(1)",
    "../private.webp",
    "images/not-an-image.png"
  ])),
  ["images/product-main.webp", validMedia],
  "only local, allowlisted WebP image paths should reach storefront/admin rendering"
);
assert.deepEqual(parseImages("not-json"), [], "invalid image JSON should fail closed");
console.log("Storefront image-path and DOM-injection regression tests passed.");
