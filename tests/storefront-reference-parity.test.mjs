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
  assert.ok(maxOpacityFor('body') >= 0.07, name + ' body folds must remain subtly visible against the satin base.');
  assert.ok(maxOpacityFor('body') <= maxBody, name + ' body folds must remain subtle, not broad ribbon bands.');
  assert.ok(maxOpacityFor('shadow') <= maxShadow, name + ' fold shadows must not form dark rings.');
  assert.ok(maxOpacityFor('inner-shade') <= maxShade, name + ' inner creases must stay quiet.');
  assert.ok(maxOpacityFor('highlight') >= 0.13, name + ' highlights must remain perceptible in both themes.');
  assert.ok(maxOpacityFor('highlight') <= maxHighlight, name + ' highlights must read as fine satin, not bright strokes.');
}
assertSatinFoldContrast('Desktop light satin', desktopLight, 0.15, 0.05, 0.13, 0.25);
assertSatinFoldContrast('Desktop dark satin', desktopDark, 0.15, 0.05, 0.13, 0.25);
assertSatinFoldContrast('Mobile light satin', mobileLight, 0.15, 0.05, 0.13, 0.25);
assertSatinFoldContrast('Mobile dark satin', mobileDark, 0.15, 0.05, 0.13, 0.25);

function assertOrganicSatinGeometry(name, svg) {
  const paths = [...svg.matchAll(/<path data-fold-layer="body" d="([^"]+)"/g)].map(match => match[1]);
  assert.equal(paths.length, 8, name + ' must have eight independently placed drape folds.');
  assert.equal(new Set(paths).size, 8, name + ' folds must not repeat one uniform diagonal sweep.');
  assert.ok(paths.every(path => path.split(' C ').length - 1 >= 2),
    name + ' folds must use multiple changing curves so the satin reads as gathered fabric, not long straight stripes.');
}
assertOrganicSatinGeometry('Desktop light satin', desktopLight);
assertOrganicSatinGeometry('Desktop dark satin', desktopDark);
assertOrganicSatinGeometry('Mobile light satin', mobileLight);
assertOrganicSatinGeometry('Mobile dark satin', mobileDark);

function assertFineSatinMicroCreases(name, svg, minimumPaths) {
  const micro = [...svg.matchAll(/<path data-fold-layer="micro" d="([^"]+)" stroke-width="([\d.]+)" opacity="([\d.]+)"\/>/g)];
  assert.ok(micro.length >= minimumPaths, name + ' must retain several fine secondary satin creases.');
  assert.ok(micro.every(path => Number(path[2]) <= 0.75 && Number(path[3]) <= 0.26),
    name + ' secondary creases must remain fine and low-contrast, not form broad ribbons.');
  assert.ok(micro.every(path => (path[1].match(/ C /g) || []).length >= 2),
    name + ' secondary creases must be subtly irregular curves rather than straight decorative stripes.');
}
assertFineSatinMicroCreases('Desktop light satin', desktopLight, 10);
assertFineSatinMicroCreases('Desktop dark satin', desktopDark, 10);
assertFineSatinMicroCreases('Mobile light satin', mobileLight, 8);
assertFineSatinMicroCreases('Mobile dark satin', mobileDark, 8);



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
  'The hero must disable empty pseudo-card layers only while the approved presentation image is actually unavailable.');
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
  'The hero must not retain an empty second column if the approved presentation asset fails to load.');
assert.match(html, /#home \.hero-visual:has\(#heroProductImage\[hidden\]\)\{display:none!important\}/,
  'An unloaded presentation asset must not leave an empty image frame.');
assert.match(html, /#home\.hero:has\(#heroProductImage\[hidden\]\) \.hero-copy\{width:100%;max-width:100%\}/,
  'The hero copy must use the available width when no presentation image can be shown.');
assert.match(finalCss, /\.welcome-content\{[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important/);
assert.match(finalCss, /\.welcome-skip\{margin-top:12px!important\}/);


/* Desktop hero fallback and mobile drawer/navigation separation are deliberate responsive contracts. */
assert.ok(html.includes('id="sdWelcomeFirstPaintGuard"')
  && html.indexOf('id="sdWelcomeFirstPaintGuard"') < html.indexOf('</head>')
  && html.indexOf('body:has(#welcomeSplash) #mobileBottomNav') < html.indexOf('</head>')
  && html.indexOf('body:has(#welcomeSplash) #accountDrawer') < html.indexOf('</head>'),
  'Welcome splash guards must be in the document head to prevent first-paint toolbar and account/cart/checkout drawer flashes.');
const welcomeGuardStart = html.indexOf('id="sdWelcomeFirstPaintGuard"');
const welcomeGuardEnd = html.indexOf('</style>', welcomeGuardStart);
const welcomeGuard = html.slice(welcomeGuardStart, welcomeGuardEnd);
assert.ok(welcomeGuardStart > -1 && welcomeGuardEnd > welcomeGuardStart
  && welcomeGuardStart < html.indexOf('</head>'),
  'The welcome first-paint guard must be parsed from the document head.');
assert.ok(welcomeGuard.includes('body.welcome-active #mobileBottomNav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}')
  && welcomeGuard.includes('body.welcome-active #accountDrawer,')
  && welcomeGuard.includes('body.welcome-active #cartDrawer,')
  && welcomeGuard.includes('body.welcome-active #checkoutDrawer,')
  && welcomeGuard.includes('body.welcome-active #checkoutBackdrop{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;transform:translateX(105%)!important}'),
  'The initial body flag must hide the bottom toolbar and every commerce overlay before first paint without relying on :has().');
assert.ok(welcomeGuard.includes('body:has(#welcomeSplash) #mobileBottomNav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}'),
  'The DOM splash selector remains a secondary guard for the welcome lifecycle.');
 
assert.match(desktopLight, /data-satin-style="fine-satin-creases-v11"/);
assert.match(desktopDark, /data-satin-style="fine-satin-creases-v12"/);
assert.match(mobileLight, /data-satin-style="fine-satin-creases-v11"/);
assert.match(mobileDark, /data-satin-style="fine-satin-creases-v12"/);

assert.ok(finalCss.includes('@media(min-width:761px){')
  && finalCss.includes('#home.hero:has(#heroProductImage[hidden]) .hero-copy{')
  && finalCss.includes('flex-direction:column!important;')
  && finalCss.includes('max-width:980px!important;'),
  'Desktop hero copy must stack vertically and use a generous editorial width when no verified image is available.');
assert.ok(finalCss.includes('#home.hero:has(#heroProductImage[hidden]) .hero-copy h1{')
  && finalCss.includes('font-size:clamp(42px,5.2vw,72px)!important;'),
  'Desktop fallback headline must keep the reference three-line hierarchy rather than break each phrase into narrow columns.');
assert.ok(finalCss.includes('@media(max-width:760px){')
  && finalCss.includes('height:calc(100dvh - 96px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;')
  && finalCss.includes('top:calc(7px + env(safe-area-inset-top))!important;')
  && finalCss.includes('bottom:auto!important;'),
  'Mobile drawers must use an explicit viewport height and remain sized independently of the bottom navigation.');
assert.ok(html.includes('<body class="welcome-active">'),
  'The welcome lifecycle guard must be present in the initial body markup before first paint.');
assert.ok(html.includes("document.body.classList.remove('welcome-active')")
  && html.includes("s.parentNode.removeChild(s);document.body.classList.remove('welcome-active')"),
  'The mobile toolbar and drawers remain hidden through the splash fade and are released only when the splash node is removed.');
assert.ok(html.includes('body.welcome-active #mobileBottomNav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}')
  && html.includes('body.welcome-active #accountDrawer,body.welcome-active #cartDrawer,body.welcome-active #checkoutDrawer{visibility:hidden!important;pointer-events:none!important;transform:translateX(105%)!important}'),
  'The first-paint welcome class must hide the bottom toolbar and commerce drawers without depending solely on :has().');
assert.ok(html.includes('/* sd-welcome-layering-fix-2026-10-22 */')
  && html.includes('.welcome-splash{z-index:2147483000!important}')
  && html.includes('body:has(#welcomeSplash) #mobileBottomNav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}'),
  'The welcome splash must sit above the mobile toolbar and hide it for the full welcome lifecycle.');
assert.ok(html.includes('body:has(#welcomeSplash) #accountDrawer,')
  && html.includes('body:has(#welcomeSplash) #cartDrawer,')
  && html.includes('body:has(#welcomeSplash) #checkoutDrawer{visibility:hidden!important;pointer-events:none!important;transform:translateX(105%)!important}'),
  'Account/cart/checkout drawers must not flash above the welcome screen before the splash is dismissed.');

const heroStart = html.indexOf('<section class="hero wrap" id="home">');
const heroEnd = html.indexOf('</section>', heroStart);
const hero = html.slice(heroStart, heroEnd);
assert.ok(hero.includes('<img id="heroProductImage"'), 'The real product image remains dynamically populated.');
assert.ok(hero.includes('<img id="heroProductImage" hidden alt="" decoding="async" fetchpriority="high">'),
  'The hero starts hidden in static markup so the approved presentation asset can be assigned by runtime; catalog SKU availability is not a gate.');
const heroSync = html.match(/function syncHeroProductImage\(\)\{([\s\S]*?)\}\s*function renderFeatured/)?.[1] || '';
assert.ok(heroSync.includes("const url='/images/hero-sd-gl052.png?v=20261022-1'")
  && heroSync.includes("target.dataset.productImageStatus='hero-presentation-asset'")
  && heroSync.includes("target.hidden=false") && heroSync.includes("target.src=url"),
  'The homepage hero must load the dedicated presentation asset independently of public catalog SKU availability.');
assert.doesNotMatch(heroSync, /products\.find\(p=>String\(p\?\.sku/,
  'The homepage hero presentation image must not be gated by or misrepresented as an SD-GL052 catalog record.');
assert.ok(html.includes('target.dataset.productImageStatus=\'hero-asset-load-failed\''),
  'A failed image request must be diagnosable without hiding the user-approved hero presentation asset.');
assert.ok(html.includes('id="sdGalleryWhiteBackgroundKey"'), 'A browser-only SVG filter is available for photos with a near-white canvas.');
assert.match(html, /function syncFullscreenBackgroundKey\(img\)[\s\S]*?votes>=6[\s\S]*?sd-white-background-keyed/,
  'Only gallery photos whose corner samples confirm a near-white canvas may use background removal.');
assert.match(finalCss, /\.sd-fullscreen-frame\{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;/,
  'The full-screen gallery must not add a separate bordered or shadowed image card.');
assert.match(finalCss, /\.sd-fullscreen-image\.sd-white-background-keyed\{filter:url\(#sdGalleryWhiteBackgroundKey\)\}/,
  'Gallery background blending must be display-only and applied only after a white-canvas check.');
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

assert.ok(html.includes("images/liquid-glass-light.svg?v=20261022-1"));
assert.ok(html.includes("images/liquid-glass-dark.svg?v=20261022-1"));
assert.ok(html.includes("images/liquid-glass-light-mobile.svg?v=20261022-1"));
assert.ok(html.includes("images/liquid-glass-dark-mobile.svg?v=20261022-1"));
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

assert.ok(html.includes('/* Keep the sticky header frosted, but prevent scrolled page imagery/text from ghosting through the official brand lockup. */')
  && html.includes('.nav-wrap .nav{background:rgba(244,250,255,.94)!important}')
  && html.includes('html.dark .nav-wrap .nav{background:rgba(4,20,34,.94)!important}'),
  'Sticky header glass must retain subtle satin translucency while preventing the scrolled footer logo and copy from ghosting behind the official brand mark.');

assert.ok(html.includes('.account-drawer{\n    height:auto!important;\n    bottom:auto!important;'),
  'Mobile account drawer must fit its content rather than leave a large empty panel.');

// A populated mobile cart fills the available panel above persistent mobile navigation.
assert.match(html, /@media\(max-width:760px\)\{\s*\.cart-drawer:has\(\.cart-row\)\{\s*height:auto!important;\s*bottom:auto!important;\s*min-height:0!important;\s*max-height:calc\(100dvh - 96px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)!important;/,
  'A populated mobile cart must fit its content when short and stay within the viewport/safe-area maximum when long.');
assert.match(html, /\.cart-drawer:has\(\.cart-row\) \.cart-list\{\s*flex:1 1 auto!important;\s*max-height:none;\s*min-height:0!important;\s*overflow-y:auto!important;/,
  'The populated cart list must keep its content height for short carts and scroll independently when a long cart reaches the maximum height.');

 
// Theme toggles must avoid long backdrop-filter interpolation that causes mobile jank.
const performantThemeTransition = html.slice(html.lastIndexOf('/* Keep theme toggles responsive on phones:'));
assert.match(performantThemeTransition, /transition:background-color \.22s ease,border-color \.22s ease,box-shadow \.22s ease,color \.22s ease!important/,
  'Theme switching should use a short 220ms paint-only transition.');
assert.doesNotMatch(performantThemeTransition, /transition:[^}]*backdrop-filter/,
  'Theme switching must not animate expensive backdrop-filter changes across glass surfaces.');

 
// The hero must reveal the satin texture beneath a readable, non-opaque text veil.
const satinHeroVisibility = html.slice(html.lastIndexOf('/* Satin visibility correction:'));
assert.match(satinHeroVisibility, /#home\.hero\.wrap\{\s*background:rgba\(246,251,255,\.20\)!important;/,
  'Light hero surface must be transparent enough to reveal satin folds.');
assert.match(satinHeroVisibility, /html\.dark #home\.hero\.wrap\{\s*background:rgba\(7,27,45,\.22\)!important;/,
  'Dark hero surface must reveal the navy satin texture.');
assert.match(satinHeroVisibility, /rgba\(237,247,255,\.90\) 0%,rgba\(237,247,255,\.82\) 28%,rgba\(237,247,255,\.64\) 48%,rgba\(237,247,255,\.42\) 66%,rgba\(237,247,255,\.18\) 84%/,
  'Light mobile hero veil must keep copy readable where the product image overlaps while revealing satin and the full product toward the right.');
assert.match(satinHeroVisibility, /rgba\(4,20,34,\.80\) 0%,rgba\(4,20,34,\.70\) 28%,rgba\(4,20,34,\.52\) 48%,rgba\(4,20,34,\.34\) 66%,rgba\(4,20,34,\.14\) 84%/,
  'Dark mobile hero veil must keep copy readable where the product image overlaps while revealing satin and the full product toward the right.');

// The supplied hero asset contains a studio tabletop; blend the desktop image's lower edge into the satin canvas.
const desktopHeroEdgeBlend = html.slice(html.indexOf('/* sd-hero-desktop-floor-blend-2026-10-22:'));
assert.ok(desktopHeroEdgeBlend.includes('@media(min-width:761px)'), 'The photo-edge fade must be restricted to desktop.');
assert.ok(desktopHeroEdgeBlend.includes('#home .hero-visual::after'), 'The photo-edge fade must not replace or mutate the supplied image asset.');
assert.ok(desktopHeroEdgeBlend.includes('linear-gradient(180deg,rgba(237,247,255,0) 52%,rgba(237,247,255,.02) 58%,rgba(237,247,255,.08) 64%,rgba(237,247,255,.14) 72%,rgba(237,247,255,.24) 84%,rgba(237,247,255,.36) 100%)'),
  'Light desktop hero must fade the source photo tabletop into satin without replacing the owner-supplied image.');
assert.ok(desktopHeroEdgeBlend.includes('linear-gradient(180deg,rgba(4,20,34,0) 52%,rgba(4,20,34,.02) 58%,rgba(4,20,34,.07) 64%,rgba(4,20,34,.13) 72%,rgba(4,20,34,.24) 84%,rgba(4,20,34,.36) 100%)'),
  'Dark desktop hero must fade the source photo tabletop into the navy satin canvas.');
assert.ok(desktopHeroEdgeBlend.includes('#home .hero-visual-caption{position:absolute;z-index:3}'),
  'The hero caption must remain above the photo edge blend.');
