import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const heroSyncMatch = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/);
assert.ok(heroSyncMatch, "The hero image synchronization function must remain present.");
const heroSync = heroSyncMatch[1];

assert.ok(heroSync.includes("target.hidden=false")
  && heroSync.includes("target.src='/images/hero-upload/tb_image_share_1792519964514%20(1).png'")
  && heroSync.includes("target.dataset.productImageStatus='owner-presentation-image-active'")
  && heroSync.includes("target.alt='Đôi giày loafer da cá sấu SinDarealest'"),
  "The Hero must use the original owner-supplied RGBA PNG with descriptive alt text.");
assert.ok(html.includes('id="heroProductImage"'),
  "The existing Hero image element must remain available for responsive styling.");

const visualAudit = readFileSync(new URL("../scripts/capture-liquid-glass-preview.mjs", import.meta.url), "utf8");
assert.ok(visualAudit.includes("hero-image-temporarily-hidden-owner-request")
  && visualAudit.includes("startup.heroImage.status === 'temporarily-disabled-owner-request'")
  && visualAudit.includes("startup.heroImage.hidden")
  && visualAudit.includes("startup.heroImage.source === ''"),
  "The local fixture audit must validate the temporary hidden Hero state.");

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
    const neutral = ((property === "filter" && value === "drop-shadow(0 12px 16px rgba(0,0,0,.18))") || ((property === "filter" || property.startsWith("mask") || property === "clip-path" || property === "transform") && value === "none")
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
assert.ok(html.includes("/* Hero uses the original owner-supplied RGBA PNG; preserve all product pixels and let the storefront ice-blue surface show through its alpha. */"));
const edgeProcessor = readFileSync(new URL("../scripts/process-hero-edge.py", import.meta.url), "utf8");
assert.ok(edgeProcessor.includes("FEATHER_RADIUS = 48")
  && edgeProcessor.includes('padded_source.putalpha(new_alpha)')
  && edgeProcessor.includes('"rgb_modified": False')
  && edgeProcessor.includes("GaussianBlur(radius=KEEP_MASK_RADIUS)"),
  "Hero edge blend must feather only alpha, preserve original RGB/color, and protect shoe regions.");
assert.ok(edgeProcessor.includes("padding = FEATHER_RADIUS * 3")
  && edgeProcessor.includes('padded_alpha = Image.new("L"')
  && edgeProcessor.includes("padded_alpha.paste(alpha, (padding, padding))")
  && edgeProcessor.includes("blurred_padded_alpha = padded_alpha.filter(")
  && edgeProcessor.includes("padded_source.alpha_composite(source, (padding, padding))")
  && edgeProcessor.includes("padded_source.putalpha(new_alpha)")
  && edgeProcessor.includes('"output_keeps_transparent_padding": list(result.size) == [width + padding * 2, height + padding * 2]')
  && !edgeProcessor.includes(".crop((padding, padding, padding + width, padding + height))")
  && edgeProcessor.includes("source alpha silhouette with transparent padding; shoe regions protected"),
  "Hero edge feather must follow the real alpha silhouette and pad canvas edges transparently instead of guessing a platform polygon.");
assert.doesNotMatch(edgeProcessor, /^PLATFORM\s*=\s*\[/m,
  "Hero feathering must not use an approximate polygon to define the platform silhouette.");
assert.doesNotMatch(edgeProcessor, /MinFilter|PLATFORM_EDGE_RADIUS|PLATFORM_INNER_BLUR/,
  "The rejected polygon-derived platform edge band must remain removed.");
const heroEdgeTreatment = html.slice(html.lastIndexOf("/* Hero uses the original owner-supplied RGBA PNG; preserve all product pixels and let the storefront ice-blue surface show through its alpha. */"));
assert.ok(heroEdgeTreatment.includes("mix-blend-mode:normal!important")
  && heroEdgeTreatment.includes("#home .hero-visual{")
  && heroEdgeTreatment.includes("mask-image:none!important")
  && !heroEdgeTreatment.includes("mask-image:radial-gradient(")
  && heroEdgeTreatment.includes("width:clamp(244px,67vw,270px)!important")
  && heroEdgeTreatment.includes("max-height:none!important"),
  "The derived Hero shoes must remain enlarged while alpha edges blend into the page and original RGB stays unchanged.");
assert.ok(heroEdgeTreatment.includes("@media(min-width:761px) and (max-width:1000px)")
  && heroEdgeTreatment.includes("width:113%!important")
  && heroEdgeTreatment.includes("max-height:540px!important;margin-left:0!important;margin-right:0!important"),
  "Tablet Hero sizing must preserve the entire transparent PNG in the right column with clear separation from copy.");
assert.ok(html.includes("filter:drop-shadow(0 12px 16px rgba(0,0,0,.18))!important")
  && html.includes("-webkit-mask:none!important;mask:none!important"));
assert.ok(html.includes("object-fit:contain!important;object-position:center!important"));
assert.ok(html.includes("#home.hero:after{content:none!important;display:none!important;background:none!important}")
  && !html.includes("#home .hero-visual::after,#home.hero:after"),
  "Only the outer Hero decoration is disabled; the CSS pedestal front face must not be suppressed.");
const heroPedestalStyles = html.slice(html.lastIndexOf("/* Reference Hero pedestal:"));
assert.ok(heroPedestalStyles.includes("#home .hero-visual::before,")
  && heroPedestalStyles.includes("#home .hero-visual::after{")
  && heroPedestalStyles.includes("radial-gradient(ellipse at 30% 28%")
  && heroPedestalStyles.includes("clip-path:polygon(1% 0,99% 0,94% 100%,6% 100%)")
  && heroPedestalStyles.includes("bottom:27%;")
  && heroPedestalStyles.includes("width:136%;height:8%;bottom:27%")
  && heroPedestalStyles.includes("width:145%;height:9%;bottom:30%;transform:translateX(-50%) rotate(-3deg)")
  && html.includes("position:relative!important;z-index:1!important;"),
  "Hero keeps an explicit pearl-marble oval, visible slanted plinth face, responsive sizing, and the original shoe PNG in front.");
const canonicalMobile = html.slice(html.lastIndexOf("/* Mobile Hero — owner reference, single authoritative layout."));
assert.ok(canonicalMobile.includes("grid-template-columns:minmax(0,58fr) minmax(0,42fr)!important;")
  && canonicalMobile.includes("height:clamp(216px,57vw,230px)!important;")
  && canonicalMobile.includes("position:absolute!important;top:0!important;right:0!important;")
  && canonicalMobile.includes("object-fit:contain!important;object-position:center center!important;")
  && canonicalMobile.includes("top:-55px!important;left:-30px!important;"),
  "Mobile Hero shoes must float beside, not beneath, the editorial copy.");

const liveCapture = readFileSync(new URL("../scripts/capture-cloudflare-preview.mjs", import.meta.url), "utf8");
assert.ok(liveCapture.includes("async function auditHeroImage(page, label)")
  && liveCapture.includes("ownerPresentationImageActive"),
  "The live audit must verify the authorized visible Hero presentation image.");

assert.doesNotMatch(liveCapture, /skuUnavailableFallback|SD-GL052 is not present in the public verified product payload/);
assert.ok(canonicalMobile.includes("height:clamp(216px,57vw,230px)!important;")
  && canonicalMobile.includes("bottom:20px!important;")
  && canonicalMobile.includes("bottom:4px!important;")
  && heroPedestalStyles.includes("inset:auto!important;left:50%!important;bottom:27%!important;filter:none!important;"),
  "The mobile Hero uses a single compact, visible platform beneath the unchanged shoe PNG.");
console.log("PASS: owner-authorized Hero presentation PNG and restrained drop-shadow experiment are enforced.");
