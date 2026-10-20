import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const heroSyncMatch = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/);
assert.ok(heroSyncMatch, "The hero product image synchronization function must remain present.");
const heroSync = heroSyncMatch[1];

assert.ok(heroSync.includes("const wantedSku='SD-GL052'"),
  "The storefront hero must explicitly target the requested product SKU.");
assert.ok(heroSync.includes("products.find(p=>String(p&&p.sku||'').trim().toUpperCase()===wantedSku)"),
  "The hero must resolve the image from the exact SKU in the API product list.");
assert.ok(heroSync.includes("const image=allImages(product)[0]||product.image||''"),
  "The hero must use an image belonging to the matched product.");
assert.doesNotMatch(heroSync, /catalogGrid|featuredGrid/,
  "The hero must not silently substitute the first unrelated product on the page.");
assert.ok(heroSync.includes("sku-not-found"),
  "The hero must mark the missing-SKU state instead of presenting a different product.");
assert.ok(heroSync.includes("image-missing"),
  "The hero must separately mark a matched SKU that has no image.");

const visualAudit = readFileSync(new URL("../scripts/capture-liquid-glass-preview.mjs", import.meta.url), "utf8");
assert.ok(visualAudit.includes("hero-selects-exact-sd-gl052-or-fails-closed"),
  "The read-only visual audit must validate exact SKU image selection and allow a safe missing-SKU fixture state.");
assert.ok(visualAudit.includes("startup.heroImage.status === 'sku-not-found'"),
  "The read-only visual audit must expect the hero to hide instead of using a guessed fixture image when SD-GL052 is unavailable.");
assert.ok(visualAudit.includes("startup.heroImage.source === expectedHeroImage"),
  "The read-only visual audit must compare the rendered hero source to the exact target product image.");
const lastHeroImageRule = html.slice(html.lastIndexOf("/* Keep the hero product crisp on small screens"));
assert.ok(lastHeroImageRule.includes("#home .hero-visual img{mix-blend-mode:normal!important;opacity:1!important;filter:drop-shadow"),
  "The hero product should retain its real colors and use a natural drop shadow rather than color-altering blending.");
assert.ok(lastHeroImageRule.includes("object-fit:contain!important;object-position:center right!important"),
  "The product must remain fully visible without being cropped on mobile.");
assert.ok(lastHeroImageRule.includes("rgba(237,247,255,0) 64%)"),
  "The text-side veil must fade before covering the product side of the hero.");
assert.ok(lastHeroImageRule.includes("rgba(4,20,34,0) 64%)"),
  "The dark-theme veil must also preserve product visibility.");

const liveCapture = readFileSync(new URL("../scripts/capture-cloudflare-preview.mjs", import.meta.url), "utf8");
assert.ok(liveCapture.includes("async function auditHeroSku(page, label)"),
  "The live Preview capture must verify the requested SKU against the customer-visible public API.");
assert.ok(liveCapture.includes("targetSkuInPublicApi: Boolean(publicProduct)"),
  "The live audit must distinguish a missing/hidden SKU from a successfully loaded target image.");
assert.ok(liveCapture.includes("normalize(source) === normalize(expectedImage)"),
  "The live audit must confirm that the hero renders the exact image associated with SD-GL052.");
assert.ok(liveCapture.includes("SD-GL052 is not present in the public verified product payload"),
  "The live audit must report SKU visibility as a real blocker rather than declaring a hidden hero accepted.");
console.log("PASS: storefront hero targets the exact SD-GL052 SKU and never substitutes another product image.");
