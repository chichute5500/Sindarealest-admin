import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const heroSyncMatch = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/);
assert.ok(heroSyncMatch, "The hero image synchronization function must remain present.");
const heroSync = heroSyncMatch[1];

assert.ok(heroSync.includes("const url='/images/hero-upload/tb_image_share_1792519964514-blended.png?v=20261023-2'"),
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
assert.ok(visualAudit.includes("hero-presentation-asset-visible-with-unverified-fixture"),
  "The local fixture audit must confirm the hero presentation asset remains visible without a verified SKU.");
assert.ok(visualAudit.includes("startup.heroImage.status === 'hero-presentation-asset'")
  && visualAudit.includes("startup.heroImage.loaded")
  && visualAudit.includes("!startup.heroImage.hidden")
  && visualAudit.includes("startup.heroImage.source.includes('/images/hero-upload/tb_image_share_1792519964514-blended.png')"),
  "The local audit must require the presentation asset to load and remain visible independent of SKU verification.");

const styleContents = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join("\n");
const heroImageRules = [...styleContents.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => selector.includes(".hero-visual img"));
assert.ok(heroImageRules.length >= 5, "The hero display contract must cover base, responsive, and theme-specific CSS rules.");
for (const [, selector, declarations] of heroImageRules) {
  for (const declaration of declarations.split(";").map(value => value.trim()).filter(Boolean)) {
    const effect = declaration.match(/^(-webkit-)?(filter|mask(?:-image)?|clip-path|mix-blend-mode|opacity|transform)\s*:\s*(.*?)\s*$/i);
    if (!effect) continue;
    const property = effect[2].toLowerCase();
    const value = effect[3].replace(/!important\s*$/i, "").trim().toLowerCase();
    const neutral = (((property === "filter" || property.startsWith("mask") || property === "clip-path" || property === "transform") && value === "none")
      || (property.startsWith("mask") && value.startsWith("radial-gradient("))
      || (property === "mix-blend-mode" && (value === "normal" || value === "multiply"))
      || (property === "opacity" && value === "1")
      // Explicitly permit the small source-preserving zoom used to make the shoes read larger;
      // color/brightness filters and arbitrary transforms remain disallowed.
      || (property === "transform" && (value === "scale(1.04)" || value === "scale(1.02)")));
    assert.ok(neutral, "Hero image CSS must not apply visual effects (" + selector.trim() + ": " + declaration + ").");
  }
  assert.doesNotMatch(declarations, /object-fit\s*:\s*cover/i, "The owner-supplied hero asset must never be cropped.");
}
assert.ok(html.includes("/* Owner-supplied Hero presentation asset: retain shoe RGB/detail; feathered-alpha derivative is a separate file. */"));
const edgeProcessor = readFileSync(new URL("../scripts/process-hero-edge.py", import.meta.url), "utf8");
assert.ok(edgeProcessor.includes("FEATHER_RADIUS = 48")
  && edgeProcessor.includes('source.putalpha(new_alpha)')
  && edgeProcessor.includes('"rgb_modified": False')
  && edgeProcessor.includes("GaussianBlur(radius=KEEP_MASK_RADIUS)"),
  "Hero edge blend must feather only alpha, preserve original RGB/color, and protect shoe regions.");
assert.ok(edgeProcessor.includes("padding = FEATHER_RADIUS * 3")
  && edgeProcessor.includes('padded_alpha = Image.new("L"')
  && edgeProcessor.includes("padded_alpha.paste(alpha, (padding, padding))")
  && edgeProcessor.includes("source alpha silhouette with transparent padding; shoe regions protected"),
  "Hero edge feather must follow the real alpha silhouette and pad canvas edges transparently instead of guessing a platform polygon.");
assert.doesNotMatch(edgeProcessor, /^PLATFORM\s*=\s*\[/m,
  "Hero feathering must not use an approximate polygon to define the platform silhouette.");
assert.doesNotMatch(edgeProcessor, /MinFilter|PLATFORM_EDGE_RADIUS|PLATFORM_INNER_BLUR/,
  "The rejected polygon-derived platform edge band must remain removed.");
const heroEdgeTreatment = html.slice(html.lastIndexOf('<style id="hero-image-blend-owner-asset">'));
assert.ok(heroEdgeTreatment.includes("mix-blend-mode:normal!important")
  && heroEdgeTreatment.includes("#home .hero-visual{")
  && heroEdgeTreatment.includes("mask-image:none!important")
  && !heroEdgeTreatment.includes("mask-image:radial-gradient(")
  && heroEdgeTreatment.includes("width:118%!important")
  && heroEdgeTreatment.includes("max-height:290px!important"),
  "The derived Hero shoes must be enlarged while alpha edges blend into the page and the original RGB stays unchanged.");
assert.ok(html.includes("filter:none!important;-webkit-mask:none!important;mask:none!important"));
assert.ok(html.includes("object-fit:contain!important;object-position:center!important"));
assert.ok(html.includes("#home .hero-visual::after,#home.hero:after"));
assert.ok(html.includes("#home .hero-visual::before{")
  && html.includes("z-index:0!important;")
  && html.includes("filter:blur(16px)!important;")
  && html.includes("position:relative!important;z-index:1!important;"),
  "The hero presentation asset must be untouched above a separate background halo.");
assert.ok(html.includes("grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;")
  && html.includes("grid-column:1!important;")
  && html.includes("grid-column:2!important;")
  && html.includes("width:88%!important;height:auto!important;max-width:100%!important;max-height:210px!important;")
  && html.includes("object-fit:contain!important;object-position:center!important;")
  && html.includes("margin:0!important;"),
  "On mobile, hero copy and image must use separate side-by-side columns while the full source-derived image stays centered and clear.");

const liveCapture = readFileSync(new URL("../scripts/capture-cloudflare-preview.mjs", import.meta.url), "utf8");
assert.ok(liveCapture.includes("async function auditHeroImage(page, label)")
  && liveCapture.includes("presentationAssetLoaded"),
  "The live audit must verify the dedicated hero presentation asset is loaded and visible.");
assert.ok(liveCapture.includes("path.endsWith('/images/hero-upload/tb_image_share_1792519964514-blended.png')")
  && liveCapture.includes("status === 'hero-presentation-asset'")
  && liveCapture.includes("!frameCollapsed"),
  "The live audit must check the exact hero asset, visible image state, and non-collapsed frame.");
assert.doesNotMatch(liveCapture, /skuUnavailableFallback|SD-GL052 is not present in the public verified product payload/);
console.log("PASS: hero presentation image remains visible independently of catalog SKU verification.");
