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

function assertSatinFoldScale(name, svg, maxStroke, maxBlur, expectedPaths) {
  const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(match => Number(match[1]));
  const blur = [...svg.matchAll(/<feGaussianBlur stdDeviation="([\d.]+)"\/>/g)].map(match => Number(match[1]));
  assert.ok(widths.length >= expectedPaths, name + ' must retain multiple narrow satin fold and highlight strokes.');
  assert.ok(Math.max(...widths) <= maxStroke,
    name + ' must not use oversized brush strokes that create broad ring-like bands.');
  assert.ok(blur.length > 0 && Math.max(...blur) <= maxBlur,
    name + ' must keep blur tight enough to preserve fine fabric creases.');
}
assertSatinFoldScale('Desktop light satin', desktopLight, 18, 4, 25);
assertSatinFoldScale('Desktop dark satin', desktopDark, 18, 4, 25);
assertSatinFoldScale('Mobile light satin', mobileLight, 12, 3, 25);
assertSatinFoldScale('Mobile dark satin', mobileDark, 12, 3, 25);

function assertSatinFoldContrast(name, svg, maxBody, maxShadow, maxShade, maxHighlight) {
  const maxOpacityFor = layer => {
    const values = [...svg.matchAll(new RegExp('<path data-fold-layer="' + layer + '"[^>]*\\sopacity="([\\d.]+)"', 'g'))]
      .map(match => Number(match[1]));
    assert.ok(values.length > 0, name + ' must keep the ' + layer + ' satin layer.');
    return Math.max(...values);
  };
  assert.ok(maxOpacityFor('body') <= maxBody, name + ' body folds must remain subtle, not broad ribbon bands.');
  assert.ok(maxOpacityFor('shadow') <= maxShadow, name + ' fold shadows must not form dark rings.');
  assert.ok(maxOpacityFor('inner-shade') <= maxShade, name + ' inner creases must stay quiet.');
  assert.ok(maxOpacityFor('highlight') <= maxHighlight, name + ' highlights must read as fine satin, not bright strokes.');
}
assertSatinFoldContrast('Desktop light satin', desktopLight, 0.055, 0.025, 0.055, 0.11);
assertSatinFoldContrast('Desktop dark satin', desktopDark, 0.055, 0.025, 0.055, 0.11);
assertSatinFoldContrast('Mobile light satin', mobileLight, 0.055, 0.025, 0.055, 0.11);
assertSatinFoldContrast('Mobile dark satin', mobileDark, 0.055, 0.025, 0.055, 0.11);


assert.match(html, /\.theme-bg--light\{background-color:#eaf3fb;background-image:url\('images\/liquid-glass-light\.svg\?v=/);
assert.match(html, /\.theme-bg--dark\{background-color:#061522;background-image:url\('images\/liquid-glass-dark\.svg\?v=/);
assert.match(html, /\.theme-bg--light\{background-image:url\('images\/liquid-glass-light-mobile\.svg\?v=/);
assert.match(html, /\.theme-bg--dark\{background-image:url\('images\/liquid-glass-dark-mobile\.svg\?v=/);

const end = html.indexOf('/* sd-static-reference-final-pass-2026-10-21 */');
assert.ok(end >= 0, 'The final storefront visual-pass stylesheet must remain identifiable.');
const finalCss = html.slice(end, html.indexOf('</style>', end));
assert.match(finalCss, /\.theme-bg--light::after\{background:linear-gradient\(118deg,rgba\(225,241,255,\.07\),rgba\(211,231,249,\.03\) 52%,rgba\(237,247,255,\.07\)\)\}/);
assert.match(finalCss, /\.theme-bg--dark::after\{background:linear-gradient\(118deg,rgba\(3,20,36,\.10\),rgba\(7,31,51,\.06\) 52%,rgba\(3,17,30,\.12\)\)\}/);
assert.match(finalCss, /#home\.hero:has\(#heroProductImage\[hidden\]\)::before,[\s\S]*?content:none!important;display:none!important;background:none!important/,
  'The hero must disable its empty pseudo-card layers when SD-GL052 is unavailable.');
assert.match(finalCss, /\.hero-copy\{display:flex!important;min-height:0!important;height:auto!important;width:100%!important;/,
  'The hero copy must determine its own height without a hidden image keeping a tall blank frame.');
assert.match(finalCss, /\.hero-visual:has\(#heroProductImage\[hidden\]\)\{display:none!important;visibility:hidden!important;min-height:0!important;height:0!important;/,
  'The unavailable product image frame must collapse completely.');
assert.match(html, /<h1 class="serif"><span>Phong cách<\/span><span>đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  'The hero headline must keep the exact three-line hierarchy from the supplied mobile reference.');
assert.match(finalCss, /#home \.hero h1 span:first-child\{max-width:6em\}/);
assert.match(finalCss, /#home \.hero h1 span:last-child\{max-width:7em\}/);
assert.match(finalCss, /#home \.hero-visual img\[hidden\]\{display:none!important\}/);
assert.match(html, /#home\.hero:has\(#heroProductImage\[hidden\]\)\{grid-template-columns:minmax\(0,1fr\)!important\}/,
  'When the exact SKU is unavailable, the hero must not retain an empty second column.');
assert.match(html, /#home \.hero-visual:has\(#heroProductImage\[hidden\]\)\{display:none!important\}/,
  'A hidden exact-SKU image must hide its empty image frame.');
assert.match(html, /#home\.hero:has\(#heroProductImage\[hidden\]\) \.hero-copy\{width:100%;max-width:100%\}/,
  'The hero copy must use the available width when no verified product image can be shown.');
assert.match(finalCss, /\.welcome-content\{[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important/);
assert.match(finalCss, /\.welcome-skip\{margin-top:12px!important\}/);


/* Desktop hero fallback and mobile drawer/navigation separation are deliberate responsive contracts. */
assert.match(desktopLight, /data-satin-style="fine-satin-drape-v7"/);
assert.match(desktopDark, /data-satin-style="fine-satin-drape-v7"/);
assert.match(mobileLight, /data-satin-style="fine-satin-drape-v7"/);
assert.match(mobileDark, /data-satin-style="fine-satin-drape-v7"/);

assert.ok(finalCss.includes('@media(min-width:761px){')
  && finalCss.includes('#home.hero:has(#heroProductImage[hidden]) .hero-copy{')
  && finalCss.includes('flex-direction:column!important;')
  && finalCss.includes('max-width:980px!important;'),
  'Desktop hero copy must stack vertically and use a generous editorial width when no verified image is available.');
assert.ok(finalCss.includes('#home.hero:has(#heroProductImage[hidden]) .hero-copy h1{')
  && finalCss.includes('font-size:clamp(42px,5.2vw,72px)!important;'),
  'Desktop fallback headline must keep the reference three-line hierarchy rather than break each phrase into narrow columns.');
assert.ok(finalCss.includes('@media(max-width:760px){')
  && finalCss.includes('#mobileBottomNav{z-index:1300!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}')
  && finalCss.includes('height:calc(100dvh - 96px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;')
  && finalCss.includes('top:calc(7px + env(safe-area-inset-top))!important;')
  && finalCss.includes('bottom:auto!important;'),
  'Mobile drawers must use an explicit viewport height and allow the fixed bottom navigation to remain visible.');

const heroStart = html.indexOf('<section class="hero wrap" id="home">');
const heroEnd = html.indexOf('</section>', heroStart);
const hero = html.slice(heroStart, heroEnd);
assert.ok(hero.includes('<img id="heroProductImage"'), 'The real product image remains dynamically populated.');
const heroSync = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/)?.[1] || '';
assert.ok(heroSync.includes("target.dataset.productImageStatus='owner-supplied'")
  && heroSync.includes("target.dataset.sourceProductImage='true'"),
  'The hero-specific image state must remain explicit and separate from catalog product identity.');
assert.doesNotMatch(heroSync, /products\.find|wantedSku|catalogGrid|featuredGrid/,
  'The hero-specific image must not select or substitute a catalog product through SKU discovery.');
assert.ok(html.includes('id="sdFullscreenViewer"'), 'The full-screen image gallery remains available.');
assert.ok(html.includes('id="cartDrawer"') && html.includes('id="checkoutDrawer"'), 'Cart and checkout screens remain in the storefront.');
assert.ok(html.includes('id="accountDrawer"') && html.includes('id="mobileAccountNav"'), 'Account screen and mobile navigation remain.');
assert.ok(html.includes('id="contact"') && html.includes('id="siteFooter"'), 'Contact and brand footer screens remain.');
assert.ok(html.includes('id="mobileBottomNav"'), 'The mobile app-style bottom navigation remains.');

assert.match(finalCss, /@media\(max-width:760px\)\{[\s\S]*?\.nav-wrap \.nav \.brand\{[\s\S]*?position:static!important;[\s\S]*?left:auto!important;[\s\S]*?transform:none!important/,
  'The mobile brand lockup must sit beside the menu, matching the supplied reference rather than being centered.');
for (const [name, svg] of [['mobile light', mobileLight], ['mobile dark', mobileDark], ['desktop light', desktopLight], ['desktop dark', desktopDark]]) {
  assert.match(svg, /id="base"/, name + ' background must define its satin base.');
  assert.match(svg, /id="glow"/, name + ' background must include a soft light bloom.');
  assert.match(svg, /id="blur"/, name + ' background must use softly layered satin fold strokes rather than broad looped ribbons.');
  assert.match(svg, /stroke-linecap="round"/, name + ' background folds must flow organically.');
  const ids = [...svg.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, name + ' background must not contain duplicate SVG ids.');
}

assert.match(html, /--sd-reference-surface-strong:rgba\(249,253,255,\.95\)/,
  'Light theme drawers must use an opaque enough frosted-glass surface for readable commerce content.');

assert.ok(html.includes("images/liquid-glass-light.svg?v=20261021-17"));
assert.ok(html.includes("images/liquid-glass-dark.svg?v=20261021-17"));
assert.ok(html.includes("images/liquid-glass-light-mobile.svg?v=20261021-17"));
assert.ok(html.includes("images/liquid-glass-dark-mobile.svg?v=20261021-17"));
assert.doesNotMatch(html, /liquid-glass-(?:light|dark)(?:-mobile)?\.svg\?v=20261021-1(?:\D|$)/,
  'All four satin backgrounds must use the updated cache key.');

assert.match(html, /html\.dark\{[\s\S]*?--sd-reference-surface-strong:rgba\(7,27,45,\.94\)/,
  'Dark theme drawers must retain a readable navy-glass surface.');
assert.match(html, /\.account-drawer,\.cart-drawer,\.checkout-drawer\{[\s\S]*?backdrop-filter:blur\(24px\) saturate\(145%\)/,
  'Cart, account and checkout drawers must blur the storefront behind the translucent surface.');
console.log('PASS: mobile/desktop satin assets, reference-aligned splash and headline, and key storefront screen contracts.');


assert.ok(html.includes('color:#15344b!important;') && html.includes('html.dark .detail-zoom-btn') && html.includes('background:rgba(5,22,37,.94)!important;'),
  'Gallery and product-image controls must have contrast-safe light and dark states.');
assert.ok(html.includes('.product-photo img{mix-blend-mode:multiply}') && html.includes('html.dark .product-photo img{mix-blend-mode:normal}'),
  'Product image sources remain unchanged while light-mode photo backgrounds blend into the satin surface.');

assert.ok(html.includes('body:has(.sd-fullscreen-viewer.open) .sd-fullscreen-thumbs{bottom:calc(52px + env(safe-area-inset-bottom))!important}'),
  'Fullscreen gallery thumbnails must leave room for the brand footer when mobile navigation is hidden.');

assert.ok(html.includes('.account-drawer{\n    height:auto!important;\n    bottom:auto!important;'),
  'Mobile account drawer must fit its content rather than leave a large empty panel.');

// A populated mobile cart should fit its content instead of stretching one item across the full screen.
assert.match(html, /@media\(max-width:760px\)\{\s*\.cart-drawer:has\(\.cart-row\)\{\s*height:auto!important;\s*bottom:auto!important;\s*min-height:0!important;\s*max-height:calc\(100dvh - 96px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)!important;/,
  'A mobile cart containing items must size to content while respecting the viewport maximum.');
assert.match(html, /\.cart-drawer:has\(\.cart-row\) \.cart-list\{\s*flex:0 1 auto!important;\s*max-height:40dvh;\s*min-height:0!important;\s*overflow-y:auto!important;/,
  'A populated cart list must not absorb all free vertical space and must remain scrollable for multiple items.');

 
// Theme toggles must avoid long backdrop-filter interpolation that causes mobile jank.
const performantThemeTransition = html.slice(html.lastIndexOf('/* Keep theme toggles responsive on phones:'));
assert.match(performantThemeTransition, /transition:background-color \.22s ease,border-color \.22s ease,box-shadow \.22s ease,color \.22s ease!important/,
  'Theme switching should use a short 220ms paint-only transition.');
assert.doesNotMatch(performantThemeTransition, /transition:[^}]*backdrop-filter/,
  'Theme switching must not animate expensive backdrop-filter changes across glass surfaces.');
