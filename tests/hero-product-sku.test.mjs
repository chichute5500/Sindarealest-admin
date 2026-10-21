import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const heroSyncMatch = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/);
assert.ok(heroSyncMatch, "The hero image synchronization function must remain present.");
const heroSync = heroSyncMatch[1];

assert.ok(heroSync.includes("/images/hero-sd-gl052.png?v=20261021-hero-upload"),
  "The hero must use the owner-uploaded static image asset.");
assert.ok(heroSync.includes("owner-supplied"),
  "The hero must identify its source as the owner-supplied image.");
assert.doesNotMatch(heroSync, /products\.find|wantedSku|sku-not-found|catalogGrid|featuredGrid/,
  "The hero must not depend on a missing API SKU or silently substitute an unrelated product.");
assert.ok(html.includes('id="heroProductImage"'),
  "The existing hero image element must remain available for responsive styling.");

const visualAudit = readFileSync(new URL("../scripts/capture-liquid-glass-preview.mjs", import.meta.url), "utf8");
assert.ok(visualAudit.includes("hero-uses-owner-uploaded-image"),
  "The read-only visual audit must check the uploaded hero image.");
assert.ok(visualAudit.includes("startup.heroImage.source.split('?')[0] === expectedHeroImage"),
  "The local audit must verify the exact uploaded asset path.");
assert.ok(visualAudit.includes("startup.heroImage.status === 'owner-supplied'"),
  "The local audit must verify the owner-supplied image state.");

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
assert.ok(liveCapture.includes("async function auditHeroImage(page, label)"),
  "The live Preview capture must verify the uploaded hero image.");
assert.ok(liveCapture.includes("path === '/images/hero-sd-gl052.png'"),
  "The live audit must confirm the exact uploaded asset path.");
assert.ok(liveCapture.includes("status === 'owner-supplied'"),
  "The live audit must require the owner-supplied image state.");
assert.ok(!liveCapture.includes("SD-GL052 is not present in the public verified product payload"),
  "The live audit must no longer block on API SKU discovery after the owner supplies the image.");
console.log("PASS: storefront hero uses the owner-uploaded image without requiring API SKU discovery.");
