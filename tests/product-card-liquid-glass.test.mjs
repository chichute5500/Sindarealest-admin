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
assert.match(finalBackgroundCss, /linear-gradient\(118deg,rgba\(225,241,255,\.52\),rgba\(211,231,249,\.46\) 52%,rgba\(237,247,255,\.54\)\)/,
  "Light background must provide a soft frosted veil over the newly generated glacial gradient backdrop.");
assert.match(finalBackgroundCss, /linear-gradient\(118deg,rgba\(3,20,36,\.68\),rgba\(7,31,51,\.63\) 52%,rgba\(3,17,30,\.72\)\)/,
  "Dark background must provide a deep navy translucent veil over the newly generated sapphire gradient backdrop.");
assert.ok(finalThemeCss.includes(".theme-bg--light{background-color:#eaf3fb;background-image:url('images/liquid-glass-light.svg?v=20261020-2')"),
  "Light theme must use the final cache-versioned pearl-glass SVG background.");
assert.ok(finalThemeCss.includes("html.dark .theme-bg--dark{opacity:1;filter:blur(0px) saturate(.96) brightness(.98) contrast(1.02)}"),
  "Dark theme must preserve the navy-sapphire SVG backdrop without the old color cast.");


assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-light.svg?v=20261020-2')"),
  "The light background must use the dedicated curved pearl-glass wave artwork.");
assert.ok(finalThemeCss.includes("background-image:url('images/liquid-glass-dark.svg?v=20261020-2')"),
  "The dark background must use the dedicated curved sapphire-glass wave artwork.");
const ambientLightStart = finalThemeCss.indexOf(".theme-bg--light{");
const ambientLight = finalThemeCss.slice(ambientLightStart).split("}")[0] || "";
const ambientDarkStart = finalThemeCss.indexOf(".theme-bg--dark{");
const ambientDark = finalThemeCss.slice(ambientDarkStart).split("}")[0] || "";
assert.ok(ambientLight.includes("images/liquid-glass-light.svg?v=20261020-2"),
  "The light ambient background must be generated as soft glacial gradients rather than reuse a crocodile-scale product texture.");
assert.ok(ambientDark.includes("images/liquid-glass-dark.svg?v=20261020-2"),
  "The dark ambient background must be generated as flowing navy/sapphire gradients rather than reuse a crocodile-scale product texture.");
assert.doesNotMatch(ambientLight, /theme-croc-/,
  "Light page ambience must not use the crocodile-scale raster texture as its background.");
assert.doesNotMatch(ambientDark, /theme-croc-/,
  "Dark page ambience must not use the crocodile-scale raster texture as its background.");
const welcomeLightStart = finalThemeCss.indexOf(".welcome-texture--light{");
const welcomeLight = finalThemeCss.slice(welcomeLightStart).split("}")[0] || "";
const welcomeDarkStart = finalThemeCss.indexOf(".welcome-texture--dark{");
const welcomeDark = finalThemeCss.slice(welcomeDarkStart).split("}")[0] || "";
assert.ok(welcomeLight.includes("images/liquid-glass-light.svg?v=20261020-2"),
  "Light welcome splash must use the same pearl/glacial ambient design language.");
assert.ok(welcomeDark.includes("images/liquid-glass-dark.svg?v=20261020-2"),
  "Dark welcome splash must use the same navy/sapphire ambient design language.");
assert.doesNotMatch(welcomeLight, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in light mode.");
assert.doesNotMatch(welcomeDark, /theme-croc-/,
  "Welcome splash must not bring the hard crocodile scale texture back in dark mode.");


const mobileWaveCss = finalThemeCss.slice(finalThemeCss.lastIndexOf("@media(max-width:760px)"));
assert.ok(mobileWaveCss.includes("images/liquid-glass-light-mobile.svg?v=20261020-3")
  && mobileWaveCss.includes("images/liquid-glass-dark-mobile.svg?v=20261020-3"),
  "Portrait viewports must use dedicated vertical wave compositions so the curved ribbons remain visible.");
const lightMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light-mobile.svg", import.meta.url), "utf8");
const darkMobileWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark-mobile.svg", import.meta.url), "utf8");
assert.ok(lightMobileWaveArtwork.includes('viewBox="0 0 390 844"') && lightMobileWaveArtwork.includes('stroke="url(#ribbon)"'),
  "The light mobile SVG must use a portrait canvas and broad curved ribbons.");
assert.ok(darkMobileWaveArtwork.includes('viewBox="0 0 390 844"') && darkMobileWaveArtwork.includes('stroke="url(#ribbon)"'),
  "The dark mobile SVG must use a portrait canvas and broad curved ribbons.");

const lightWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-light.svg", import.meta.url), "utf8");
const darkWaveArtwork = readFileSync(new URL("../public/images/liquid-glass-dark.svg", import.meta.url), "utf8");
assert.ok(lightWaveArtwork.includes('stroke="url(#silk)"') && lightWaveArtwork.includes('C70 20 280 70 430 280'),
  "Light SVG must include smooth curved pearl-satin ribbons.");
assert.ok(darkWaveArtwork.includes('stroke="url(#silk)"') && darkWaveArtwork.includes('C70 20 280 70 430 280'),
  "Dark SVG must include smooth curved sapphire-satin ribbons.");

console.log("PASS: storefront product cards use reference ice-blue/navy Liquid Glass on desktop/mobile and during theme transitions.");
