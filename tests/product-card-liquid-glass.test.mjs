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
const finalBackgroundCss = html.slice(finalBackgroundStart, finalBackgroundStart + 2200);
assert.ok(finalBackgroundStart > html.indexOf("/* Reference-match finishing pass"),
  "The softened background calibration must be the final authoritative rule, not an unused earlier selector.");
assert.match(finalBackgroundCss, /linear-gradient\(118deg,rgba\(225,241,255,\.52\),rgba\(211,231,249,\.46\) 52%,rgba\(237,247,255,\.54\)\)/,
  "Light background must diffuse hard crocodile-scale detail while preserving its original source image.");
assert.match(finalBackgroundCss, /linear-gradient\(118deg,rgba\(3,20,36,\.68\),rgba\(7,31,51,\.63\) 52%,rgba\(3,17,30,\.72\)\)/,
  "Dark background must retain visible source texture while softening its contrast.");
assert.match(finalBackgroundCss, /\.theme-bg--light\{filter:blur\(1px\) hue-rotate\(25deg\) saturate\(\.70\) brightness\(1\.035\) contrast\(\.95\)\}/,
  "Light backdrop should keep its original theme image while softening sharp texture.");
assert.match(finalBackgroundCss, /html\.dark \.theme-bg--dark\{filter:blur\(1\.5px\) hue-rotate\(0deg\) saturate\(\.86\) brightness\(\.86\) contrast\(\.92\)\}/,
  "Dark backdrop should preserve navy tone, soft highlights and visible texture.");

console.log("PASS: storefront product cards use reference ice-blue/navy Liquid Glass on desktop/mobile and during theme transitions.");
