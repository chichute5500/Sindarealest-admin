import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const desktopLight = readFileSync(new URL('../public/images/liquid-glass-light.svg', import.meta.url), 'utf8');
const desktopDark = readFileSync(new URL('../public/images/liquid-glass-dark.svg', import.meta.url), 'utf8');
const mobileLight = readFileSync(new URL('../public/images/liquid-glass-light-mobile.svg', import.meta.url), 'utf8');
const mobileDark = readFileSync(new URL('../public/images/liquid-glass-dark-mobile.svg', import.meta.url), 'utf8');

assert.match(desktopLight, /viewBox="0 0 1440 1000"/);
assert.match(desktopDark, /viewBox="0 0 1440 1000"/);
assert.match(mobileLight, /viewBox="0 0 390 844"/);
assert.match(mobileDark, /viewBox="0 0 390 844"/);
assert.match(html, /\.theme-bg--light\{background-color:#eaf3fb;background-image:url\('images\/liquid-glass-light\.svg\?v=/);
assert.match(html, /\.theme-bg--dark\{background-color:#061522;background-image:url\('images\/liquid-glass-dark\.svg\?v=/);
assert.match(html, /\.theme-bg--light\{background-image:url\('images\/liquid-glass-light-mobile\.svg\?v=/);
assert.match(html, /\.theme-bg--dark\{background-image:url\('images\/liquid-glass-dark-mobile\.svg\?v=/);

const end = html.indexOf('/* sd-static-reference-final-pass-2026-10-21 */');
assert.ok(end >= 0, 'The final storefront visual-pass stylesheet must remain identifiable.');
const finalCss = html.slice(end, html.indexOf('</style>', end));
assert.match(finalCss, /\.theme-bg--light::after\{[\s\S]*?linear-gradient\(145deg,transparent 14%,rgba\(255,255,255,\.72\) 22%/);
assert.match(finalCss, /\.theme-bg--dark::after\{[\s\S]*?rgba\(183,220,245,\.22\)/);
assert.match(finalCss, /#home \.hero h1 span:first-child\{max-width:6em\}/);
assert.match(finalCss, /#home \.hero h1 span:last-child\{max-width:7em\}/);
assert.match(finalCss, /#home \.hero-visual img\[hidden\]\{display:none!important\}/);
assert.match(finalCss, /\.welcome-content\{[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important/);
assert.match(finalCss, /\.welcome-skip\{margin-top:12px!important\}/);

const heroStart = html.indexOf('<section class="hero wrap" id="home">');
const heroEnd = html.indexOf('</section>', heroStart);
const hero = html.slice(heroStart, heroEnd);
assert.ok(hero.includes('<img id="heroProductImage"'), 'The real product image remains dynamically populated.');
assert.ok(html.includes("const wantedSku='SD-GL052'"), 'Hero selection must preserve exact SKU matching.');
assert.ok(html.includes('id="sdFullscreenViewer"'), 'The full-screen image gallery remains available.');
assert.ok(html.includes('id="cartDrawer"') && html.includes('id="checkoutDrawer"'), 'Cart and checkout screens remain in the storefront.');
assert.ok(html.includes('id="accountDrawer"') && html.includes('id="mobileAccountNav"'), 'Account screen and mobile navigation remain.');
assert.ok(html.includes('id="contact"') && html.includes('id="siteFooter"'), 'Contact and brand footer screens remain.');
assert.ok(html.includes('id="mobileBottomNav"'), 'The mobile app-style bottom navigation remains.');
console.log('PASS: mobile/desktop satin assets, reference-aligned splash and headline, and key storefront screen contracts.');
