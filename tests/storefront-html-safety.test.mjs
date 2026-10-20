import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseImages } from "../functions/_lib.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
// The Hero is deliberately populated from rendered product data. Guard the
// dynamic source so visual tweaks do not pin it to a placeholder image.
const heroSectionStart = html.indexOf('<section class="hero wrap" id="home">');
const heroSectionEnd = html.indexOf("</section>", heroSectionStart);
assert.ok(heroSectionStart >= 0 && heroSectionEnd > heroSectionStart,
  "the public homepage must retain the crocodile-leather Hero section");
const heroSection = html.slice(heroSectionStart, heroSectionEnd);
assert.match(heroSection, /<h1 class="serif"><span>Phong cách đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  "the Hero must keep the confirmed brand headline");
assert.match(heroSection, /<img id="heroProductImage" alt="" decoding="async" fetchpriority="high">/,
  "the Hero image must remain a decorative image with no hardcoded source");
assert.doesNotMatch(heroSection, /<img id="heroProductImage"[^>]*\bsrc=/,
  "do not hardcode a Hero image source in HTML; its source is selected dynamically");

const heroSyncStart = html.indexOf("function syncHeroProductImage()");
const heroSyncEnd = html.indexOf("\\nfunction renderFeatured()", heroSyncStart);
assert.ok(heroSyncStart >= 0 && heroSyncEnd > heroSyncStart,
  "the dynamic Hero image synchronization function must remain present");
const heroSync = html.slice(heroSyncStart, heroSyncEnd);
assert.match(heroSync, /const source=\$\('#catalogGrid \.product-photo img'\)\|\|\$\('#featuredGrid \.feature-slide'\)/,
  "the Hero image must prefer a rendered catalog product and retain the featured-image fallback");
assert.match(heroSync, /source\.currentSrc\|\|source\.src\|\|source\.dataset\.src\|\|source\.getAttribute\('data-src'\)/,
  "the Hero must support resolved, ordinary, and lazy-loaded product image URLs");
assert.match(heroSync, /if\(url\)\{target\.src=url;target\.dataset\.sourceProductImage='true'\}/,
  "the Hero image source must update from the chosen product without a fixed placeholder");

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
