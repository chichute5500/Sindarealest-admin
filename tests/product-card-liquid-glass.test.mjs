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
assert.ok(html.includes("html.theme-transitioning .product-card"),
  "product card glass should participate in the existing light/dark transition");

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
assert.match(mobileReferenceCss, /\.hero-visual\{height:clamp\(170px,48vw,205px\);min-height:0;aspect-ratio:\.9\/1;border-radius:22px\}/,
  "The mobile Hero must avoid the too-tall crop that cuts off real product imagery.");
assert.match(mobileReferenceCss, /\.hero-visual img\{object-fit:contain;padding:4%;box-sizing:border-box\}/,
  "Mobile Hero must show the full real catalog image instead of cropping the product.");
assert.match(mobileReferenceCss, /\.service-strip \.service-copy\{min-height:52px;padding:4px 2px\}/,
  "The six reference benefit tiles must stay compact on mobile.");
assert.match(html, /\.hero-visual\{height:clamp\(155px,46vw,175px\);min-height:0;aspect-ratio:\.9\/1\}/,
  "Narrow phones must keep the Hero image frame compact without restoring the oversized crop.");
const finalBackgroundStart = html.lastIndexOf(".theme-bg--light::after{");
const finalBackgroundCss = html.slice(finalBackgroundStart, finalBackgroundStart + 6000);
const finalThemeCss = html.slice(html.lastIndexOf("/* Organic liquid-glass wave assets"));
assert.ok(finalBackgroundStart > html.indexOf("/* Reference-match finishing pass"),
  "The softened background calibration must be the final authoritative rule, not an unused earlier selector.");
assert.match(finalBackgroundCss, /linear-gradient\(145deg,transparent 14%,rgba\(255,255,255,\.72\) 22%,rgba\(255,255,255,\.16\) 28%,transparent 38%\)/,
  "Light background must preserve a pearlescent satin highlight crossing the base SVG.");
assert.match(finalBackgroundCss, /linear-gradient\(31deg,transparent 20%,rgba\(128,183,220,\.20\) 31%,rgba\(255,255,255,\.62\) 36%,transparent 48%\)/,
  "Light background must add a diagonal ice-blue silk edge without flattening the SVG.");
assert.match(finalBackgroundCss, /linear-gradient\(145deg,transparent 14%,rgba\(188,222,245,\.18\) 22%,rgba\(255,255,255,\.04\) 28%,transparent 38%\)/,
  "Dark background must preserve subtle sapphire-satin highlights.");
assert.match(finalBackgroundCss, /linear-gradient\(31deg,transparent 20%,rgba\(56,121,164,\.25\) 31%,rgba\(218,240,255,\.22\) 36%,transparent 48%\)/,
  "Dark background must add a diagonal blue-steel ribbon over the navy SVG.");
assert.ok(finalThemeCss.includes(".theme-bg--light{background-color:#eaf3fb;background-image:url('images/liquid-glass-light.svg?v=20261021-2')"),
  "Light theme must use the final cache-versioned pearl-glass SVG background.");
assert.ok(finalThemeCss.includes("html.dark .theme-bg--dark{opacity:1;filter:blur(0px) saturate(.96) brightness(.98) contrast(1.02)}"),
  "Dark theme must preserve the navy-sapphire SVG backdrop without the old color cast.");


assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-light.svg?v=20261021-2')"),
  "The light background must use the dedicated curved pearl-glass wave artwork.");
assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-dark.svg?v=20261021-2')"),
  "The dark background must use the dedicated curved sapphire-glass wave artwork.");
const ambientLightStart = finalThemeCss.indexOf(".theme-bg--light{");
const ambientLight = finalThemeCss.slice(ambientLightStart).split("}")[0] || "";
const ambientDarkStart = finalThemeCss.indexOf(".theme-bg--dark{");
const ambientDark = finalThemeCss.slice(ambientDarkStart).split("}")[0] || "";
assert.ok(ambientLight.includes("images/liquid-glass-light.svg?v=20261021-2"),
  "The light ambient background must be generated as soft glacial gradients rather than reuse a crocodile-scale product texture.");
assert.ok(ambientDark.includes("images/liquid-glass-dark.svg?v=20261021-2"),
  "The dark ambient background must be generated as flowing navy/sapphire gradients rather than reuse a crocodile-scale product texture.");
assert.doesNotMatch(ambientLight, /theme-croc-/,
  "Light page ambience must not use the crocodile-scale raster texture as its background.");
assert.doesNotMatch(ambientDark, /theme-croc-/,
  "Dark page ambience must not use the crocodile-scale raster texture as its background.");
const welcomeLightStart = finalThemeCss.indexOf(".welcome-texture--light{");
const welcomeLight = finalThemeCss.slice(welcomeLightStart).split("}")[0] || "";
const welcomeDarkStart = finalThemeCss.indexOf(".welcome-texture--dark{");
const welcomeDark = finalThemeCss.slice(welcomeDarkStart).split("}")[0] || "";
assert.ok(welcomeLight.includes("images/liquid-glass-light.svg?v=20261021-2"),
  "Light welcome splash must use the same pearl/glacial ambient design language.");
assert.ok(welcomeDark.includes("images/liquid-glass-dark.svg?v=20261021-2"),
  "Dark welcome splash must use the same navy/sapphire ambient design language.");
assert.doesNotMatch(welcomeLight, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in light mode.");
assert.doesNotMatch(welcomeDark, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in dark mode.");


assert.ok(finalThemeCss.includes("@media(max-width:760px){\n .theme-bg--light{background-image:url('images/liquid-glass-light-mobile.svg?v=20261021-2')}")
  && finalThemeCss.includes(".theme-bg--dark{background-image:url('images/liquid-glass-dark-mobile.svg?v=20261021-2')}"),
  "Portrait viewports must use dedicated vertical wave compositions so the curved ribbons remain visible.");
const lightMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light-mobile.svg", import.meta.url), "utf8");
const darkMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark-mobile.svg", import.meta.url), "utf8");
assert.ok(lightMobileWaveArtwork.includes('viewBox="0 0 390 844"')
  && lightMobileWaveArtwork.includes('id="satin-crease-detail"')
  && lightMobileWaveArtwork.includes('id="fold"') && lightMobileWaveArtwork.includes('id="glint"'),
  "The light mobile SVG must use a portrait canvas and layered fine satin creases.");
assert.ok(darkMobileWaveArtwork.includes('viewBox="0 0 390 844"')
  && darkMobileWaveArtwork.includes('id="satin-crease-detail"')
  && darkMobileWaveArtwork.includes('id="fold"') && darkMobileWaveArtwork.includes('id="glint"'),
  "The dark mobile SVG must use a portrait canvas and layered fine satin creases.");

const lightWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light.svg", import.meta.url), "utf8");
const darkWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark.svg", import.meta.url), "utf8");
assert.ok(lightWaveArtwork.includes('id="satin-crease-detail"') && lightWaveArtwork.includes('id="fold"') && lightWaveArtwork.includes('id="glint"'),
  "Light desktop SVG must include layered pearl-satin folds and narrow highlights.");
assert.ok(darkWaveArtwork.includes('id="satin-crease-detail"') && darkWaveArtwork.includes('id="fold"') && darkWaveArtwork.includes('id="glint"'),
  "Dark desktop SVG must include layered sapphire-satin folds and narrow highlights.");

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
assert.ok(html.includes('#home .hero-visual img{\n    width:100%;height:100%;object-fit:cover;object-position:center right;\n    padding:0;opacity:.98;mix-blend-mode:multiply;'),
  "Mobile hero imagery should blend into the single editorial banner instead of reading as a separate outlined card.");
assert.ok(html.includes('  .service-strip{\n    width:calc(100vw - 26px);\n    margin:0 auto;\n    grid-template-columns:repeat(3,minmax(0,1fr));'),
  "The reference six-benefit block must retain three columns and two rows on mobile.");
assert.ok(html.includes(".product-info{padding:9px 9px 39px}") && html.includes(".product-info{padding:11px 12px 44px}"),
  "Product-card content must reserve space for its separate quick-add action instead of letting the cart button overlap price/details.");

console.log("PASS: storefront product cards use reference ice-blue/navy Liquid Glass on desktop/mobile and during theme transitions.");
