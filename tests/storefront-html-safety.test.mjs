import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseImages } from "../functions/_lib.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
// The homepage hero uses a dedicated presentation asset. It is not a catalog
// product card and must not disappear just because a public SKU is unavailable.
const heroSectionStart = html.indexOf('<section class="hero wrap" id="home">');
const heroSectionEnd = html.indexOf("</section>", heroSectionStart);
assert.ok(heroSectionStart >= 0 && heroSectionEnd > heroSectionStart,
  "the public homepage must retain the crocodile-leather Hero section");
const heroSection = html.slice(heroSectionStart, heroSectionEnd);
assert.match(heroSection, /<h1 class="serif"><span>Phong cách<\/span><span>đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  "the Hero must keep the confirmed three-line brand headline hierarchy");
assert.match(heroSection, /<img id="heroProductImage" hidden alt="" decoding="async" fetchpriority="high">/,
  "the hero image element must remain available for responsive styling without hardcoding an HTML source");
assert.doesNotMatch(heroSection, /<img id="heroProductImage"[^>]*\bsrc=/,
  "the hero image source must be assigned by the runtime synchronizer");

const heroSyncStart = html.indexOf("function syncHeroProductImage()");
const heroSyncEnd = html.indexOf("function renderFeatured()", heroSyncStart + "function syncHeroProductImage()".length);
assert.ok(heroSyncStart >= 0 && heroSyncEnd > heroSyncStart,
  "the Hero image synchronization function must remain present");
const heroSync = html.slice(heroSyncStart, heroSyncEnd);
assert.ok(heroSync.includes("const url='/images/hero-upload/tb_image_share_1792519964514-blended.png?v=20261023-4'"),
  "the Hero must use the supplied presentation asset independently of catalog availability");
assert.ok(heroSync.includes("target.dataset.productImageStatus='hero-presentation-asset'")
  && heroSync.includes("target.hidden=false") && heroSync.includes("target.src=url"),
  "the Hero must display the presentation asset and label it separately from a catalog image");
assert.doesNotMatch(heroSync, /products\.find|skuVerified/,
  "the Hero presentation image must not be gated by the public product SKU payload");

function makeHeroTarget() {
  const attributes = {};
  return {
    hidden: true,
    alt: "",
    dataset: {},
    onerror: null,
    getAttribute(name) { return Object.hasOwn(attributes, name) ? attributes[name] : null; },
    removeAttribute(name) { delete attributes[name]; },
    set src(value) { attributes.src = String(value); },
    get src() { return attributes.src || ''; },
  };
}
function runHeroSync(rows) {
  const target = makeHeroTarget();
  const result = vm.runInNewContext(heroSync + String.fromCharCode(10) + "syncHeroProductImage();", {
    products: rows,
    $: selector => selector === '#heroProductImage' ? target : null,
  });
  return { result, target };
}
for (const rows of [[], [{ sku: 'SD-GL052', skuVerified: false, images: [] }]]) {
  const hero = runHeroSync(rows);
  assert.equal(hero.result, true, "the hero presentation asset must render regardless of catalog SKU state");
  assert.equal(hero.target.hidden, false);
  assert.equal(hero.target.src, '/images/hero-upload/tb_image_share_1792519964514-blended.png?v=20261023-4');
  assert.equal(hero.target.dataset.productImageStatus, 'hero-presentation-asset');
}
const visibleHero = runHeroSync([]);
visibleHero.target.onerror();
assert.equal(visibleHero.target.hidden, false, "a failed asset request must not hide the user-approved hero");
assert.equal(visibleHero.target.src, '/images/hero-upload/tb_image_share_1792519964514-blended.png?v=20261023-4');
assert.equal(visibleHero.target.dataset.productImageStatus, 'hero-asset-load-failed');

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
