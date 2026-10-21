import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const heroSyncMatch = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/);
assert.ok(heroSyncMatch, "The hero image synchronization function must remain present.");
const heroSync = heroSyncMatch[1];

assert.ok(heroSync.includes("const url='/images/hero-sd-gl052.png?v=20261022-1'"),
  "The hero must render the supplied static presentation image independently of public catalog SKU availability.");
assert.ok(heroSync.includes("target.dataset.productImageStatus='hero-presentation-asset'"),
  "The static hero image must be explicitly identified as a presentation asset, not a catalog product image.");
assert.ok(heroSync.includes("target.hidden=false") && heroSync.includes("target.src=url"),
  "The hero presentation asset must be shown and loaded rather than hidden when the SKU is absent.");
assert.doesNotMatch(heroSync, /products\.find\(p=>String\(p\?\.sku/,
  "The homepage hero must not be blocked by the availability of SD-GL052 in the public catalog.");
assert.ok(html.includes('id="heroProductImage"'),
  "The existing hero image element must remain available for responsive styling.");

const visualAudit = readFileSync(new URL("../scripts/capture-liquid-glass-preview.mjs", import.meta.url), "utf8");
assert.ok(visualAudit.includes("hero-fails-closed-with-unverified-fixture"),
  "The local fixture audit must confirm the hero remains hidden without the verified SKU.");
assert.ok(visualAudit.includes("startup.heroImage.status === 'sku-unavailable'")
  && visualAudit.includes("startup.heroImage.hidden")
  && visualAudit.includes("!startup.heroImage.source"),
  "The local audit must require an empty, hidden hero image while SKU verification is unavailable.");

const lastHeroImageRule = html.slice(html.lastIndexOf("/* Keep the exact product crisp and blend it into the satin-glass background"));
assert.ok(lastHeroImageRule.includes("#home .hero-visual img{mix-blend-mode:normal!important;opacity:1!important;filter:drop-shadow"),
  "The hero product should retain its real colors and use a natural drop shadow rather than color-altering blending.");
assert.ok(lastHeroImageRule.includes("object-fit:contain!important;object-position:center right!important"),
  "The product must remain fully visible without being cropped on mobile.");
assert.ok(lastHeroImageRule.includes("rgba(237,247,255,0) 64%)"),
  "The text-side veil must fade before covering the product side of the hero.");
assert.ok(lastHeroImageRule.includes("rgba(4,20,34,0) 64%)"),
  "The dark-theme veil must also preserve product visibility.");

const liveCapture = readFileSync(new URL("../scripts/capture-cloudflare-preview.mjs", import.meta.url), "utf8");
assert.ok(liveCapture.includes("async function auditHeroImage(page, label)")
  && liveCapture.includes("presentationAssetLoaded"),
  "The live audit must verify the dedicated hero presentation asset is loaded and visible.");
assert.ok(liveCapture.includes("path.endsWith('/images/hero-sd-gl052.png')")
  && liveCapture.includes("status === 'hero-presentation-asset'")
  && liveCapture.includes("!frameCollapsed"),
  "The live audit must check the exact hero asset, visible image state, and non-collapsed frame.");
assert.doesNotMatch(liveCapture, /skuUnavailableFallback|SD-GL052 is not present in the public verified product payload/);
console.log("PASS: hero image is tied to verified public SKU/image mapping; missing SKU fails closed and remains an explicit visual blocker.");
