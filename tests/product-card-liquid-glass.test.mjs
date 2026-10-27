import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const productCard = html.match(/\.product-card\{[^}]+\}/)?.[0] || "";

assert.ok(productCard.includes("backdrop-filter:blur(22px) saturate(145%)"),
  "desktop product cards should use a real backdrop blur and saturation");
assert.ok(productCard.includes("-webkit-backdrop-filter:blur(22px) saturate(145%)"),
  "desktop product cards should retain the WebKit backdrop-filter fallback");
assert.ok(productCard.includes("inset 0 1px 0 rgba(255,255,255,.28)"),
  "product cards should keep the layered specular highlight that gives the glass surface depth");
assert.ok(html.includes(".contact-link,.product-card{backdrop-filter:blur(13px) saturate(135%)"),
  "mobile product cards should use the reduced blur appropriate for small screens");
const themeFastCss = readFileSync(new URL("../public/material-gallery.css", import.meta.url), "utf8");
assert.match(themeFastCss, /html\.theme-transitioning body :is\([\s\S]*?\.product-card[\s\S]*?\)\{\s*transition:none!important;/,
  "Product glass colours must update without hundreds of expensive per-card shadow/blur animations");

assert.match(html, /--page:#eaf3fb/, "Light mode must use the reference ice-blue palette.");
assert.match(html, /--card-glass:rgba\(236,246,255,\.78\)/, "Light product cards must have a clearly visible frosted surface.");
assert.match(html, /--page:#061522/, "Dark mode must use deep navy instead of pure black.");
assert.match(html, /--card-glass:rgba\(8,27,46,\.86\)/, "Dark product cards must remain distinct from the page background.");
assert.match(html, /--benefit-tile-glass:linear-gradient\(145deg,rgba\(36,66,91,\.96\)/, "Dark commitment tiles must use layered navy glass.");

const mobileReferenceStart = html.indexOf("/* Mobile proportions tuned against the reference home screen");
const mobileReferenceEnd = html.indexOf("@media(max-width:360px){", mobileReferenceStart);
assert.ok(mobileReferenceStart >= 0 && mobileReferenceEnd > mobileReferenceStart,
  "The mobile reference-fit block must remain a single identifiable design section.");
const mobileReferenceCss = html.slice(mobileReferenceStart, mobileReferenceEnd);
const codeHeroCss = readFileSync(new URL("../public/code-hero.css", import.meta.url), "utf8");
assert.match(codeHeroCss, /height:clamp\(236px,66vw,270px\)/,
  "The live mobile code-only Hero must retain its owner-approved compact height.");
assert.match(codeHeroCss, /\.sd-code-hero \.sdh-visual\{height:100%\}/,
  "Mobile Hero must keep its CSS-only visual composition without loading a product photo.");
assert.match(mobileReferenceCss, /\.service-strip \.service-copy\{min-height:52px;padding:4px 2px\}/,
  "The six reference benefit tiles must stay compact on mobile.");
assert.match(codeHeroCss, /@media\(max-width:370px\)\{\.sd-code-hero\{/,
  "Narrow-phone Hero must preserve its dedicated code-only layout.");
const finalBackgroundStart = html.lastIndexOf(".theme-bg--light::after{");
const finalBackgroundCss = html.slice(finalBackgroundStart, finalBackgroundStart + 6000);
const finalThemeCss = html.slice(html.lastIndexOf("/* Organic liquid-glass wave assets"));
assert.ok(finalBackgroundStart > html.indexOf("/* Reference-match finishing pass"),
  "The softened background calibration must be the final authoritative rule, not an unused earlier selector.");
assert.match(finalBackgroundCss, /linear-gradient\(118deg,rgba\(225,241,255,\.07\),rgba\(211,231,249,\.03\) 52%,rgba\(237,247,255,\.07\)\)/,
  "Light overlay must stay subtle so the organic satin folds come from the dedicated SVG, not opaque CSS ribbons.");
assert.match(finalBackgroundCss, /\.theme-bg--dark::after\{background:linear-gradient\(118deg,rgba\(3,20,36,\.10\),rgba\(7,31,51,\.06\) 52%,rgba\(3,17,30,\.12\)\)\}/,
  "Dark overlay must remain a subtle tint over the organic satin art instead of recreating broad wave bands.");


assert.ok(finalThemeCss.includes(".theme-bg--light{background-color:#eaf3fb;background-image:url('images/liquid-glass-light.svg?v=20261022-3')"),
  "Light theme must use the final cache-versioned pearl-glass SVG background.");
assert.ok(html.includes("html.dark .theme-bg--dark{filter:none!important}"),
  "Dark theme must use the final Owner-approved navy-sapphire SVG with no obsolete filter casts.");
assert.doesNotMatch(finalThemeCss,/html\.dark \.theme-bg--dark\{[^}]*filter:blur\(/,
  "A pre-final blur filter shadowed by the approved final rule must not reappear.");


assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-light.svg?v=20261022-3')"),
  "The light background must use the dedicated organic pearl-blue satin fold artwork.");
assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-dark.svg?v=20261022-3')"),
  "The dark background must use the dedicated organic navy-sapphire satin fold artwork.");
const ambientLightStart = finalThemeCss.indexOf(".theme-bg--light{");
const ambientLight = finalThemeCss.slice(ambientLightStart).split("}")[0] || "";
const ambientDarkStart = finalThemeCss.indexOf(".theme-bg--dark{");
const ambientDark = finalThemeCss.slice(ambientDarkStart).split("}")[0] || "";
assert.ok(ambientLight.includes("images/liquid-glass-light.svg?v=20261022-3"),
  "The light ambient background must be generated as soft glacial gradients rather than reuse a crocodile-scale product texture.");
assert.ok(ambientDark.includes("images/liquid-glass-dark.svg?v=20261022-3"),
  "The dark ambient background must be generated as flowing navy/sapphire gradients rather than reuse a crocodile-scale product texture.");
assert.doesNotMatch(ambientLight, /theme-croc-/,
  "Light page ambience must not use the crocodile-scale raster texture as its background.");
assert.doesNotMatch(ambientDark, /theme-croc-/,
  "Dark page ambience must not use the crocodile-scale raster texture as its background.");
const welcomeLightStart = finalThemeCss.indexOf(".welcome-texture--light{");
const welcomeLight = finalThemeCss.slice(welcomeLightStart).split("}")[0] || "";
const welcomeDarkStart = finalThemeCss.indexOf(".welcome-texture--dark{");
const welcomeDark = finalThemeCss.slice(welcomeDarkStart).split("}")[0] || "";
assert.ok(welcomeLight.includes("images/liquid-glass-light.svg?v=20261022-3"),
  "Light welcome splash must use the same pearl/glacial ambient design language.");
assert.ok(welcomeDark.includes("images/liquid-glass-dark.svg?v=20261022-3"),
  "Dark welcome splash must use the same navy/sapphire ambient design language.");
assert.doesNotMatch(welcomeLight, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in light mode.");
assert.doesNotMatch(welcomeDark, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in dark mode.");


assert.ok(finalThemeCss.includes("@media(max-width:760px){\n .theme-bg--light{background-image:url('images/liquid-glass-light-mobile.svg?v=20261022-3')}")
  && finalThemeCss.includes(".theme-bg--dark{background-image:url('images/liquid-glass-dark-mobile.svg?v=20261022-3')}"),
  "Portrait viewports must use dedicated vertical wave compositions so the irregular gathered folds remain visible.");
assert.match(finalBackgroundCss, /\.theme-bg--light::after\{background:linear-gradient\(118deg,rgba\(225,241,255,\.07\),rgba\(211,231,249,\.03\) 52%,rgba\(237,247,255,\.07\)\)\}/,
  "The last Light overlay must preserve the base SVG and avoid broad overlay ribbons.");
assert.match(finalBackgroundCss, /\.theme-bg--dark::after\{background:linear-gradient\(118deg,rgba\(3,20,36,\.10\),rgba\(7,31,51,\.06\) 52%,rgba\(3,17,30,\.12\)\)\}/,
  "The last Dark overlay must preserve the base SVG and avoid broad overlay ribbons.");
const lightMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light-mobile.svg", import.meta.url), "utf8");
const darkMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark-mobile.svg", import.meta.url), "utf8");
assert.ok(lightMobileWaveArtwork.includes('viewBox="0 0 390 844"')
  && lightMobileWaveArtwork.includes('id="base"') && lightMobileWaveArtwork.includes('id="glow"')
  && lightMobileWaveArtwork.includes('id="blur"') && lightMobileWaveArtwork.includes('stroke-linecap="round"'),
  "The light mobile SVG must use a portrait canvas with soft layered satin folds.");
assert.ok(darkMobileWaveArtwork.includes('viewBox="0 0 390 844"')
  && darkMobileWaveArtwork.includes('id="base"') && darkMobileWaveArtwork.includes('id="glow"')
  && darkMobileWaveArtwork.includes('id="blur"') && darkMobileWaveArtwork.includes('stroke-linecap="round"'),
  "The dark mobile SVG must use a portrait canvas with soft layered satin folds.");

const lightWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light.svg", import.meta.url), "utf8");
const darkWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark.svg", import.meta.url), "utf8");
assert.ok(lightWaveArtwork.includes('id="base"') && lightWaveArtwork.includes('id="glow"') && lightWaveArtwork.includes('data-fold-index="4"'),
  "Light desktop SVG must include layered pearl-satin folds and soft highlights.");
assert.ok(darkWaveArtwork.includes('id="base"') && darkWaveArtwork.includes('id="glow"') && darkWaveArtwork.includes('data-fold-index="4"'),
  "Dark desktop SVG must include layered sapphire-satin folds and soft highlights.");

assert.ok(finalThemeCss.includes("#productOverlay{align-items:stretch;justify-content:stretch;padding:0"),
  "Mobile product detail must use the reference full-screen gallery composition rather than a floating inset modal.");
assert.ok(finalThemeCss.includes("#productOverlay .detail-modal{width:100%;max-width:none;height:100dvh;max-height:100dvh;border:0;border-radius:0"),
  "The mobile product detail surface must occupy the full viewport while preserving desktop modal behavior.");
assert.ok(finalThemeCss.includes("#productOverlay .detail-favorite-btn{right:58px;top:calc(10px + env(safe-area-inset-top))}"),
  "On mobile, the favorite button must be offset from the close button so both controls remain clickable.");


assert.ok(html.includes('id="sd-reference-parity-2026-10-21"'),
  "The shared reference-design stylesheet must remain identifiable for later visual audits.");

assert.ok(html.includes('.brand-symbol,\nhtml.dark .brand-symbol{\n  filter:drop-shadow(0 1px 3px rgba(74,111,139,.16))!important;'),
  "The official brand emblem must retain its source appearance instead of being forced to grayscale or recolored.");
assert.ok(html.includes('<span class="sd-fullscreen-brand-mark"><img src="images/brand-emblem.png" alt=""></span>'),
  "The fullscreen gallery must use the official brand emblem asset, not a text monogram pretending to be the logo.");
assert.ok(html.includes('sd-fullscreen-brand-footer') && html.includes('<img src="images/brand-emblem.png" alt=""><span class="sd-fullscreen-brand-copy">'),
  "The fullscreen gallery footer must display the actual emblem asset.");
assert.ok(html.includes('.sd-fullscreen-viewer{\n  color:var(--ink);\n  background:rgba(231,244,253,.76);'),
  "The light fullscreen viewer must use the reference's bright frosted-glass treatment.");
assert.ok(html.includes('html.dark .sd-fullscreen-viewer{color:#edf7ff;background:rgba(3,18,32,.84)}'),
  "The dark fullscreen viewer must stay navy glass rather than reuse the light palette.");
assert.ok(html.includes('<section class="sd-code-hero wrap" id="home"'),
  "Only the owner-approved code Hero is active.");
assert.doesNotMatch(codeHeroCss, /url\(|!important/,
  "CSS-only Hero must not load legacy hero photos or force overlapping !important rules.");

assert.ok(html.includes('  .service-strip{\n    width:calc(100vw - 26px);\n    margin:0 auto;\n    grid-template-columns:repeat(3,minmax(0,1fr));'),
  "The reference six-benefit block must retain three columns and two rows on mobile.");
assert.ok(html.includes(".product-info{padding:9px 9px 36px}") && html.includes(".product-info{padding:11px 12px 44px}"),
  "Product-card content must reserve space for its separate quick-add action instead of letting the cart button overlap price/details.");

assert.ok(html.includes('<div class="product-meta-row"><span class="product-category">') && html.includes("${fulfillmentBadge(p)}"),
  "Catalog product category and fulfillment status should share one compact metadata row on mobile.");
assert.ok(html.includes('<div class="product-open" role="button" tabindex="0" data-open-product=')
  && html.includes("if(op&&e.target===op&&(e.key==='Enter'||e.key===' ')){e.preventDefault();op.click();return}"),
  "Product cards must use valid flow-content containers and preserve Enter/Space activation for keyboard users.");
assert.ok(html.includes(".product-open:focus-visible{outline:2px solid var(--gold-hi);outline-offset:3px}"),
  "Keyboard-focusable product cards must retain a visible focus indicator after replacing the native button wrapper.");

console.log("PASS: storefront product cards use reference ice-blue/navy Liquid Glass on desktop/mobile and during theme transitions.");

assert.ok(finalThemeCss.includes('body:has(.sd-fullscreen-viewer.open) .mobile-bottom-nav{display:none!important}'),
  "Immersive fullscreen gallery must not be obscured by the persistent app navigation.");
assert.ok(finalThemeCss.includes('background:rgba(247,252,255,.995)!important;')
  && finalThemeCss.includes('background:rgba(4,20,34,.995)!important;'),
  "Persistent mobile navigation must keep sufficient contrast over scrolling content in both themes.");


const sixTileRefinementStart = html.lastIndexOf("/* 2026-10-21 visual refinement: six benefit tiles");
const sixTileRefinementEnd = html.indexOf("</style>", sixTileRefinementStart);
assert.ok(sixTileRefinementStart >= 0 && sixTileRefinementEnd > sixTileRefinementStart,
  "The six-tile satin refinement must be present in the final style block.");
const sixTileRefinementCss = html.slice(sixTileRefinementStart, sixTileRefinementEnd);
assert.ok(sixTileRefinementCss.includes(".service-strip.glass{")
  && sixTileRefinementCss.includes("background:rgba(244,250,255,.24)")
  && sixTileRefinementCss.includes(".service-strip .service-copy{")
  && sixTileRefinementCss.includes(".service-strip .service-text strong{font-size:12px")
  && sixTileRefinementCss.includes("html.dark .service-strip.glass{")
  && sixTileRefinementCss.includes("html.dark .service-strip .service-copy{")
  && sixTileRefinementCss.includes(".service-strip{gap:7px;padding:7px}")
  && sixTileRefinementCss.includes(".service-strip .service-text strong{font-size:11px"),
  "The six-tile refinement must show the satin through a translucent container and tiles while keeping legible light/dark and mobile content.");
assert.doesNotMatch(sixTileRefinementCss, /#benefits/,
  "The six-tile refinement must not depend on a nonexistent benefits section ID.");


/* Regression guard: each viewport/theme uses eight layered satin folds instead of broad looping ribbons. */
for (const [name, svg] of [
  ['light desktop', lightWaveArtwork], ['dark desktop', darkWaveArtwork],
  ['light mobile', lightMobileWaveArtwork], ['dark mobile', darkMobileWaveArtwork]
]) {
  assert.match(svg, name.includes('dark')
    ? /data-satin-style="fine-satin-creases-v13"/
    : /data-satin-style="fine-satin-creases-v12"/,
    name + ' must use the appropriate organic satin asset revision rather than the legacy parallel ribbons.');
  assert.ok((svg.match(/data-fold-layer="body"/g) || []).length >= 6,
    name + ' must keep multiple independent folded fabric ridges.');
  assert.ok((svg.match(/data-fold-layer="highlight"/g) || []).length >= 6,
    name + ' must retain fine specular creases on top of the shaded folds.');
  assert.ok((svg.match(/data-fold-layer="fine"/g) || []).length >= 6,
    name + ' must retain additional micro-creases that keep the fabric from reading as plain diagonal stripes.');
  const bodyPaths = [...svg.matchAll(/<path data-fold-layer="body" d="([^"]+)"/g)].map(match => match[1]);
  assert.equal(bodyPaths.length, 8, name + ' must keep eight separate satin creases.');
  assert.equal(new Set(bodyPaths).size, 8, name + ' must not reuse uniform diagonal paths.');
  assert.ok(bodyPaths.every(path => path.split(' C ').length - 1 >= 2),
    name + ' must use multi-stage gathered curves, not single-segment diagonal stripes.');
}
assert.ok(lightWaveArtwork.includes('stroke-width="2.6"') && lightWaveArtwork.includes('stroke-width="6.5"') && lightWaveArtwork.includes('stroke-width="1"'),
  'Light desktop satin must retain layered satin body and shadow folds within the desktop stroke budget.');
assert.ok(darkWaveArtwork.includes('stroke-width="1.9"') && darkWaveArtwork.includes('stroke-width="6.5"') && darkWaveArtwork.includes('stroke-width="1"'),
  'Dark desktop satin must keep its layered satin folds while using the thinner v12 body lines.');
assert.ok(lightMobileWaveArtwork.includes('stroke-width="5.8"') && lightMobileWaveArtwork.includes('stroke-width="0.9"'),
  'Light mobile satin must show crease details while respecting the mobile stroke budget.');
assert.ok(darkMobileWaveArtwork.includes('stroke-width="5.8"') && darkMobileWaveArtwork.includes('stroke-width="0.9"'),
  'Dark mobile satin must show crease details while respecting the mobile stroke budget.');


/* Product photos should sit on satin without changing the catalog's real image URLs. */
assert.ok(
  html.includes('<style id="sd-satin-gallery-blend-2026-10-21">')
  && html.includes('.sd-fullscreen-frame{\n  background:transparent!important;border:0!important;box-shadow:none!important;')
  && html.includes('html:not(.dark) .detail-main-image{\n  mix-blend-mode:multiply!important;background:transparent!important;border-color:transparent!important;')
  && html.includes('html.dark .detail-main-image{mix-blend-mode:normal!important}'),
  "Gallery and detail images must blend into satin without a second frame while preserving dark-mode product colours."
);


const catalogFilterPill = html.match(/\.filter-pill\{[^}]+\}/)?.[0] || "";
assert.match(catalogFilterPill, /min-height:32px;padding:6px 13px/,
  "The generic filter-pill fallback should stay compact without changing its horizontal spacing.");
assert.match(html, /\.filter-pill\{font-size:11px;min-height:35px;padding:7px 13px\}/,
  "The compact mobile filter-pill fallback should stay slim while retaining readable labels.");
assert.ok(html.includes('#products .filter-pill:active:not(:disabled):not(.active):not([aria-pressed="true"]),')
  && html.includes('transform:translateY(1px) scale(.965)'),
  "Slimming catalog filter pills must preserve the existing press feedback.");

assert.match(html, /#products \.filter-pill\{[^}]*min-height:38px;\s*padding:6px 19px;/,
  "The visible filter frame must be 38px high while keeping full text and width.");

assert.match(html, /#products \.filter-pill\{min-height:38px;padding:5px 11px;font-size:13\.5px\}/,
  "Narrow-phone filter frame must be 38px while preserving the original text and horizontal padding.");
assert.ok(html.includes('.filter-pill.active,.filter-pill:hover{background:var(--panel-strong);border-color:var(--gold);box-shadow:inset 0 1px rgba(255,255,255,.26)}'),
  "Slimming catalog filter pills must preserve the existing active/hover Liquid Glass feedback.");

assert.ok(html.includes('#products .filter-pill::before{')
  && html.includes('inset:-3px 0;')
  && html.includes('pointer-events:auto;'),
  "The 38px visible chip must preserve a >=44px effective touch area via transparent extensions.");
assert.ok(html.includes('inset:1px 1px;') && html.includes('animation:sdCatalogSpecularSweep .46s cubic-bezier(.2,.8,.2,1) both;'),
  "The specular sweep must sit adjacent to the reduced frame while preserving light/dark selection animation.");
