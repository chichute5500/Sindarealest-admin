import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseImages } from "../functions/_lib.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
// Hero uses actual semantic Vietnamese text, keyboard-accessible CTA and no image assets.
const hero=html.match(/<section class="sd-code-hero wrap" id="home"[\s\S]*?<\/section>/)?.[0]||'';
assert.ok(hero,'the homepage hero must exist');
assert.match(hero,/<h1 class="sdh-title" id="sdh-title">/);
assert.match(hero,/Phong cách<\/span><span class="sdh-em">Đẳng cấp<\/span><span>từ da cá sấu/);
assert.match(hero,/<a class="sdh-cta" href="#products">Khám phá ngay/);
assert.doesNotMatch(hero,/<(?:img|picture|video|canvas)\b/);
assert.doesNotMatch(html,/syncHeroProductImage\(\)/);

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
