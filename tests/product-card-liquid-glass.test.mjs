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
console.log("PASS: storefront product cards use reference ice-blue/navy Liquid Glass on desktop/mobile and during theme transitions.");
