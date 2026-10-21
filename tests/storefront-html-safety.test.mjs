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
assert.match(heroSection, /<h1 class="serif"><span>Phong cách<\/span><span>đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  "the Hero must keep the confirmed three-line brand headline hierarchy");
assert.match(heroSection, /<img id="heroProductImage" alt="" decoding="async" fetchpriority="high">/,
  "the Hero image must remain a decorative image with no hardcoded source");
assert.doesNotMatch(heroSection, /<img id="heroProductImage"[^>]*\bsrc=/,
  "do not hardcode a Hero image source in HTML; its source is selected dynamically");

const heroSyncStart = html.indexOf("function syncHeroProductImage()");
const heroSyncEnd = html.indexOf("function renderFeatured()", heroSyncStart + "function syncHeroProductImage()".length);
assert.ok(heroSyncStart >= 0 && heroSyncEnd > heroSyncStart,
  "the dynamic Hero image synchronization function must remain present");
const heroSync = html.slice(heroSyncStart, heroSyncEnd);
assert.ok(heroSection.includes('<img id="heroProductImage" hidden alt="" decoding="async" fetchpriority="high">'),
  "the Hero image must stay hidden until a verified matching public SKU is available");
assert.ok(heroSync.includes("target.hidden=true") && heroSync.includes("target.removeAttribute('src')"),
  "the hero must start fail-closed and clear any previous image when its SKU cannot be verified");
assert.ok(heroSync.includes("const product=products.find(p=>String(p?.sku??'').trim().toUpperCase()==='SD-GL052'&&p?.skuVerified===true);"),
  "the hero may only select the exact SKU when the public product payload marks that SKU as verified");
assert.ok(heroSync.includes("Array.isArray(product.images)") && heroSync.includes("target.src=url"),
  "the hero image must come from the matching verified product's public image mapping");
assert.ok(heroSync.includes("target.dataset.productImageStatus='verified-public-catalog'"),
  "the hero image state must identify a verified catalog source");
assert.doesNotMatch(heroSync, /hero-sd-gl052\.png|owner-supplied-hero-image|productImageStatus='owner-supplied'/,
  "the hero must not label an unverified local image as the missing SD-GL052 product");

function makeHeroTarget() {
  const attributes = {};
  return {
    hidden: false,
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
  const result = vm.runInNewContext(`${heroSync}\nsyncHeroProductImage();`, {
    products: rows,
    $: selector => selector === '#heroProductImage' ? target : null,
  });
  return { result, target };
}
const missingHero = runHeroSync([]);
assert.equal(missingHero.result, false);
assert.equal(missingHero.target.hidden, true);
assert.equal(missingHero.target.src, '');
assert.equal(missingHero.target.dataset.productImageStatus, 'sku-unavailable');
const unverifiedHero = runHeroSync([{ sku: 'SD-GL052', skuVerified: false, images: ['/media/123e4567-e89b-12d3-a456-426614174000.webp'] }]);
assert.equal(unverifiedHero.result, false, 'an unverified matching SKU must not unlock the hero image');
assert.equal(unverifiedHero.target.hidden, true);
const noImageHero = runHeroSync([{ sku: 'SD-GL052', skuVerified: true, images: [] }]);
assert.equal(noImageHero.result, false, 'the exact verified SKU without a mapped image must still fail closed');
assert.equal(noImageHero.target.hidden, true);
const verifiedHero = runHeroSync([{ sku: 'SD-GL052', skuVerified: true, images: ['/media/123e4567-e89b-12d3-a456-426614174000.webp'] }]);
assert.equal(verifiedHero.result, true);
assert.equal(verifiedHero.target.hidden, false);
assert.equal(verifiedHero.target.src, '/media/123e4567-e89b-12d3-a456-426614174000.webp');
assert.equal(verifiedHero.target.dataset.productSku, 'SD-GL052');
assert.equal(verifiedHero.target.dataset.productImageStatus, 'verified-public-catalog');
verifiedHero.target.onerror();
assert.equal(verifiedHero.target.hidden, true, 'a broken verified image must collapse instead of leaving an empty frame');
assert.equal(verifiedHero.target.src, '');
assert.equal(verifiedHero.target.dataset.productImageStatus, 'image-load-failed');

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
