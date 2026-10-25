import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

// Pin the owner-supplied hero PNG bytes, not just its path or CSS behavior.
const ownerSuppliedHeroBytes = readFileSync(new URL('../public/images/hero-upload/tb_image_share_1792519964514 (1).png', import.meta.url));
const ownerSuppliedHeroGitBlobSha = createHash('sha1')
  .update(`blob ${ownerSuppliedHeroBytes.length}\0`)
  .update(ownerSuppliedHeroBytes)
  .digest('hex');
assert.equal(ownerSuppliedHeroGitBlobSha, 'c17cc9058ae3008dc662806d21d2cf8f7d83b8a9',
  'The newly supplied Hero replacement asset must remain byte-for-byte unchanged.');

// Decode the actual source PNG alpha channel, including PNG row filters; do not rely on the .png extension.
const heroPng = ownerSuppliedHeroBytes;
assert.deepEqual([...heroPng.subarray(0, 8)], [137,80,78,71,13,10,26,10], "Hero source must be a valid PNG.");
let pngOffset = 8, pngWidth = 0, pngHeight = 0, pngBitDepth = 0, pngColorType = 0, pngInterlace = -1;
const pngIdat = [];
while (pngOffset + 12 <= heroPng.length) {
  const chunkLength = heroPng.readUInt32BE(pngOffset);
  const chunkType = heroPng.toString("ascii", pngOffset + 4, pngOffset + 8);
  const chunkStart = pngOffset + 8, chunkEnd = chunkStart + chunkLength;
  assert.ok(chunkEnd + 4 <= heroPng.length, "Hero PNG chunks must remain within the source file.");
  if (chunkType === "IHDR") {
    pngWidth = heroPng.readUInt32BE(chunkStart);
    pngHeight = heroPng.readUInt32BE(chunkStart + 4);
    pngBitDepth = heroPng[chunkStart + 8];
    pngColorType = heroPng[chunkStart + 9];
    pngInterlace = heroPng[chunkStart + 12];
  } else if (chunkType === "IDAT") pngIdat.push(heroPng.subarray(chunkStart, chunkEnd));
  pngOffset = chunkEnd + 4;
  if (chunkType === "IEND") break;
}
assert.equal(pngWidth, 1200, "The source Hero PNG width must stay 1200.");
assert.equal(pngHeight, 1600, "The source Hero PNG height must stay 1600.");
assert.equal(pngBitDepth, 8, "The source Hero PNG bit depth must stay 8.");
assert.equal(pngColorType, 6, "The source Hero PNG must contain an RGBA alpha channel.");
assert.equal(pngInterlace, 0, "Source Hero PNG must be non-interlaced for deterministic alpha validation.");
const pngStride = pngWidth * 4;
const scanlines = inflateSync(Buffer.concat(pngIdat));
assert.equal(scanlines.length, pngHeight * (pngStride + 1), "Decoded PNG size must match an RGBA image.");
const paeth = (a,b,c) => {
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
};
let scanOffset=0, priorRow=Buffer.alloc(pngStride);
let transparent=0, semiTransparent=0, opaque=0;
let minX=pngWidth,minY=pngHeight,maxX=-1,maxY=-1;
let tl=255,tr=255,bl=255,br=255;
for(let y=0;y<pngHeight;y++){
  const filter=scanlines[scanOffset++];
  assert.ok(filter>=0&&filter<=4,"Hero PNG row filter must be valid.");
  const row=Buffer.from(scanlines.subarray(scanOffset,scanOffset+pngStride));
  scanOffset+=pngStride;
  for(let i=0;i<pngStride;i++){
    const left=i>=4?row[i-4]:0,up=priorRow[i],upperLeft=i>=4?priorRow[i-4]:0;
    let predictor=0;
    if(filter===1)predictor=left;
    else if(filter===2)predictor=up;
    else if(filter===3)predictor=Math.floor((left+up)/2);
    else if(filter===4)predictor=paeth(left,up,upperLeft);
    row[i]=(row[i]+predictor)&255;
  }
  if(y===0){tl=row[3];tr=row[pngStride-1]}
  if(y===pngHeight-1){bl=row[3];br=row[pngStride-1]}
  for(let x=0;x<pngWidth;x++){
    const alpha=row[x*4+3];
    if(alpha===0)transparent++;else if(alpha===255)opaque++;else semiTransparent++;
    if(alpha>16){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
  }
  priorRow=row;
}
const pixelCount=pngWidth*pngHeight;
assert.deepEqual([tl,tr,bl,br],[0,0,0,0],"All four Hero PNG corners must be fully transparent.");
assert.ok(transparent/pixelCount>0.2,"Hero PNG must have substantial transparent background.");
assert.ok(opaque/pixelCount>0.1,"Hero PNG must retain substantial opaque shoe detail.");
assert.ok(semiTransparent>0,"Hero PNG must retain anti-aliased alpha edges.");
assert.ok(minX>0&&minY>0&&maxX<pngWidth-1&&maxY<pngHeight-1,"Shoe pixels must not touch or be clipped by the canvas edges.");
console.log("PASS: original Hero PNG alpha verified",JSON.stringify({
 width:pngWidth,height:pngHeight,transparentRatio:Number((transparent/pixelCount).toFixed(4)),
 semitransparentPixels:semiTransparent,opaqueRatio:Number((opaque/pixelCount).toFixed(4)),
 visibleBounds:{left:minX,top:minY,right:maxX,bottom:maxY}
}));

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const desktopLight = readFileSync(new URL('../public/images/liquid-glass-light.svg', import.meta.url), 'utf8');
const notFound = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');
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
  assert.ok(maxOpacityFor('body') >= 0.14, name + ' body folds must remain visibly defined against the satin base.');
  assert.ok(maxOpacityFor('body') <= maxBody, name + ' body folds must remain subtle, not broad ribbon bands.');
  assert.ok(maxOpacityFor('shadow') >= 0.035, name + ' fold shadows must define the crease without forming rings.');
  assert.ok(maxOpacityFor('shadow') <= maxShadow, name + ' fold shadows must not form dark rings.');
  assert.ok(maxOpacityFor('inner-shade') >= 0.10, name + ' inner creases must stay visible at the fold edge.');
  assert.ok(maxOpacityFor('inner-shade') <= maxShade, name + ' inner creases must stay quiet.');
  assert.ok(maxOpacityFor('highlight') >= 0.24, name + ' satin highlights must be visible but remain thin.');
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



assert.match(html, /liquid-glass-light\.svg\?v=20261022-3/);
assert.match(html, /liquid-glass-dark\.svg\?v=20261022-3/);
assert.match(html, /liquid-glass-light-mobile\.svg\?v=20261022-3/);
assert.match(html, /liquid-glass-dark-mobile\.svg\?v=20261022-3/);
assert.match(notFound, /liquid-glass-light-mobile\.svg\?v=20261022-3/);
assert.match(notFound, /liquid-glass-dark-mobile\.svg\?v=20261022-3/);
assert.match(notFound, /liquid-glass-light\.svg\?v=20261022-3/);
assert.match(notFound, /liquid-glass-dark\.svg\?v=20261022-3/);

const end = html.indexOf('/* sd-static-reference-final-pass-2026-10-21 */');
assert.ok(end >= 0, 'The final storefront visual-pass stylesheet must remain identifiable.');
const finalCss = html.slice(end, html.indexOf('</style>', end));
assert.match(finalCss, /\.theme-bg--light::after\{background:linear-gradient\(118deg,rgba\(225,241,255,\.07\),rgba\(211,231,249,\.03\) 52%,rgba\(237,247,255,\.07\)\)\}/);
assert.match(finalCss, /\.theme-bg--dark::after\{background:linear-gradient\(118deg,rgba\(3,20,36,\.10\),rgba\(7,31,51,\.06\) 52%,rgba\(3,17,30,\.12\)\)\}/);
const nativeHeroCss = html.match(/<style id="sd-hero-component-authority">([\s\S]*?)<\/style>/)?.[1] || '';
assert.ok(nativeHeroCss, 'A single native HERO CSS authority must exist.');
assert.ok(nativeHeroCss.includes('#home.hero:has(#heroProductImage[hidden]){grid-template-columns:minmax(0,1fr)}')
  && nativeHeroCss.includes('#home.hero:has(#heroProductImage[hidden]) .hero-visual{display:none}'),
  'Missing independently loaded shoes must fail closed and restore a single readable copy column.');
assert.match(html, /<h1 class="serif"><span>Phong cách<\/span><span>Đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  'Native heading retains three editable lines with uppercase red Đ.');
assert.ok(nativeHeroCss.includes('--hero-red:#b71520') &&
  nativeHeroCss.includes('#home .hero-copy h1 span:nth-child(2)') &&
  nativeHeroCss.includes('#home .hero-visual #heroProductImage[hidden]{display:none}'),
  'Red highlight and unloaded image presentation must use real CSS.');
assert.ok(!nativeHeroCss.includes('!important'), 'The single HERO authority must not pile up CSS overrides.');

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
assert.ok(welcomeGuard.includes('body.welcome-active #mobileBottomNav{visibility:visible!important;opacity:1!important;pointer-events:auto!important}')
  && welcomeGuard.includes('body.welcome-active #accountDrawer,')
  && welcomeGuard.includes('body.welcome-active #cartDrawer,')
  && welcomeGuard.includes('body.welcome-active #checkoutDrawer,')
  && welcomeGuard.includes('body.welcome-active #checkoutBackdrop{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;transform:translateX(105%)!important}'),
  'The initial body flag must keep the mobile toolbar mounted beneath the welcome splash while hiding commerce overlays before first paint.');
assert.ok(!welcomeGuard.includes('body:has(#welcomeSplash) #mobileBottomNav{display:none!important'),
  'The DOM splash selector must not remove the mobile toolbar from the welcome fade; the splash layer itself masks it until the transition.');
 
assert.match(desktopLight, /data-satin-style="fine-satin-creases-v12"/);
assert.match(desktopDark, /data-satin-style="fine-satin-creases-v13"/);
assert.match(mobileLight, /data-satin-style="fine-satin-creases-v12"/);
assert.match(mobileDark, /data-satin-style="fine-satin-creases-v13"/);

assert.ok(nativeHeroCss.includes('@media(min-width:761px) and (max-width:1100px)') &&
  nativeHeroCss.includes('grid-template-columns:minmax(0,49%) minmax(0,51%)'),
  'Tablet native HERO must keep editorial horizontal product layout.');

assert.ok(finalCss.includes('@media(max-width:760px){')
  && finalCss.includes('height:calc(100dvh - 96px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;')
  && finalCss.includes('top:calc(7px + env(safe-area-inset-top))!important;')
  && finalCss.includes('bottom:auto!important;'),
  'Mobile drawers must use an explicit viewport height and remain sized independently of the bottom navigation.');
assert.ok(html.includes('<body class="welcome-active">'),
  'The welcome lifecycle guard must be present in the initial body markup before first paint.');
assert.ok(html.includes("document.body.classList.remove('welcome-active')")
  && /s\.parentNode\.removeChild\(s\);\s*document\.body\.classList\.remove\('welcome-active'\)/.test(html),
  'The mobile toolbar and drawers remain hidden through the splash fade and are released only when the splash node is removed.');
assert.ok(html.includes('body.welcome-active #mobileBottomNav{visibility:visible!important;opacity:1!important;pointer-events:auto!important}')
  && html.includes('body.welcome-active #accountDrawer,body.welcome-active #cartDrawer,body.welcome-active #checkoutDrawer{visibility:hidden!important;pointer-events:none!important;transform:translateX(105%)!important}'),
  'The first-paint welcome class must keep the toolbar mounted under the splash while hiding commerce drawers without depending solely on :has().');
assert.ok(html.includes('/* sd-welcome-layering-fix-2026-10-22 */')
  && html.includes('.welcome-splash{z-index:2147483000!important}')
  && !html.includes('body:has(#welcomeSplash) #mobileBottomNav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}'),
  'The welcome splash must mask the mounted mobile toolbar with its higher stacking layer so the toolbar is revealed by the same fade.');
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
assert.ok(heroSync.includes("target.dataset.productImageStatus='owner-presentation-image-active'")
  && heroSync.includes("target.hidden=false")
  && heroSync.includes("target.src='/images/hero-upload/tb_image_share_1792519964514%20(1).png'"),
  'The owner-authorized Hero experiment must load the standalone presentation PNG without depending on catalog SKU data.');
assert.doesNotMatch(heroSync, /products\.find\(p=>String\(p\?\.sku/,
  'The homepage Hero presentation image must not be gated by or misrepresented as a catalog SKU record.');
assert.ok(heroSync.includes("target.onerror=()=>{target.hidden=true;target.dataset.productImageStatus='presentation-image-load-failed'}"),
  'A missing presentation asset must fail closed without leaving an empty Hero image frame.');

assert.ok(html.indexOf('syncHeroProductImage();try{const res=await fetch(\'/api/products\'') < html.indexOf('catch(err){$(\'#catalogGrid\').innerHTML=')
  && html.indexOf('syncHeroProductImage();try{const res=await fetch(\'/api/products\'') >= 0,
  'The temporary Hero image-disable state must initialize before the product API can fail or return early.');
assert.match(finalCss, /\.sd-fullscreen-frame\{border-radius:18px!important;overflow:hidden!important\}/,
  'The full-screen gallery frame must clip the image to softly rounded corners.');
assert.match(finalCss, /\.sd-fullscreen-image\{border-radius:16px!important\}/,
  'The full-screen photo itself must have soft rounded corners.');
assert.match(html, /class="footer-brand"[^>]*>[\s\S]*?<img src="logo\.png" alt="Logo chính thức SinDarealest"/,
  'The footer must use the same official logo asset as the welcome screen.');
assert.match(html, /\.footer-brand img\{[^}]*filter:none!important;mix-blend-mode:normal!important\}/,
  'The official logo asset must not be recoloured or blended by CSS.');

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

assert.ok(html.includes("images/liquid-glass-light.svg?v=20261022-3"));
assert.ok(html.includes("images/liquid-glass-dark.svg?v=20261022-3"));
assert.ok(html.includes("images/liquid-glass-light-mobile.svg?v=20261022-3"));
assert.ok(html.includes("images/liquid-glass-dark-mobile.svg?v=20261022-3"));
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

 
// V12 native visual-contract checks replace obsolete V2–V11 pseudo-element rules.
assert.match(nativeHeroCss, /#home \.hero-visual #heroProductImage\{/,
  'Native HERO shoe PNG must be an independent original asset.');
assert.ok(nativeHeroCss.includes("url('/images/hero-rebuild/marble-shelf-v14.svg')") &&
  nativeHeroCss.includes("url('/images/hero-rebuild/silk-waves.svg')"),
  'Marble and satin remain independent noncomposite decorative layers.');
assert.ok(nativeHeroCss.includes('mask:none;-webkit-mask:none') &&
  nativeHeroCss.includes('mix-blend-mode:normal;object-fit:contain'),
  'Owner product PNG must not be masked, cropped or blended.');
assert.ok(nativeHeroCss.includes('z-index:5;display:block;top:-23%'),
  'Transparent shoe layer must render on top of the stone.');
assert.ok(nativeHeroCss.includes('background:radial-gradient(ellipse 24% 17%') &&
  nativeHeroCss.includes('ellipse 28% 19%'),
  'The independently rendered front and heel contact shadows must remain intact.');
assert.ok(nativeHeroCss.includes('grid-template-columns:minmax(0,55%) minmax(0,45%)') &&
  nativeHeroCss.includes('width:47%;height:100%') &&
  !nativeHeroCss.includes('grid-template-rows:auto auto'),
  'Mobile HERO must be compact and horizontal with native left copy and right shoes.');

// The approved icon board assigns the shopping-bag silhouette to Cart; Products remains a distinct catalogue/list destination.
const mobileProductTab = html.match(/<a class="mobile-tab" href="#products" data-mobile-tab="products">([\s\S]*?)<\/a>/)?.[1] || '';
const mobileCartTab = html.match(/<button class="mobile-tab" type="button" id="mobileCartNav"([\s\S]*?)<\/button>/)?.[1] || '';
assert.match(mobileCartTab, /<path d="M3 4h2l2\.2 11\.1[\s\S]*?L21 8H6"\/>/,
  'The mobile Cart tab must keep its cart-outline icon as shown on the reference board.');
assert.match(mobileCartTab, /<circle cx="10" cy="20" r="1"\/><circle cx="18" cy="20" r="1"\/>/,
  'The mobile Cart icon must retain both wheel details.');
assert.doesNotMatch(mobileProductTab, /<path d="M6 8h12l1 12H5L6 8Z"\/>/,
  'The Products tab must not reuse the shopping-bag silhouette assigned to Cart by the reference board.');
assert.ok(html.includes('.mobile-tab svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}'),
  'Mobile navigation icons must share a thin, consistent outline stroke and rounded line caps from the icon reference.');

// Reference-driven icon pass: replace the five text glyphs in order flow/aftercare with coherent 24x24 SVG strokes.
const orderIconMarkup = [...html.matchAll(/<span class="order-icon" aria-hidden="true">([\s\S]*?)<\/span>/g)].map(match => match[1]);
assert.equal(orderIconMarkup.length, 4, 'The four order steps must each retain one icon.');
assert.deepEqual(
  orderIconMarkup.map(markup => markup.match(/data-order-icon="([^"]+)"/)?.[1]),
  ['product', 'confirmation', 'production', 'complete'],
  'Order-step icons must represent product selection, confirmation, production timing and completion in order.'
);
assert.ok(
  orderIconMarkup.every(markup => /<svg\b[^>]*viewBox="0 0 24 24"[^>]*stroke-width="1\.7"/.test(markup)),
  'Order-step SVGs must share the 24x24 viewBox and thin 1.7 stroke specified by the icon reference.'
);
assert.doesNotMatch(orderIconMarkup.join(''), /[◇✧◷✓]/,
  'Order steps must not use the text glyphs identified in the icon inventory.');
const aftercareIconMarkup = html.match(/<span class="order-commitment-icon" aria-hidden="true">([\s\S]*?)<\/span>/)?.[1] || '';
assert.match(aftercareIconMarkup, /<svg\b[^>]*data-order-icon="aftercare"[^>]*stroke-width="1\.7"/,
  'Aftercare commitment must use the matching thin-stroke shield/check SVG.');
assert.match(html, /id="sd-icon-order-flow-2026-10-22"[\s\S]*#order \.order-icon svg,[\s\S]*width:15px;height:15px[\s\S]*@media\(max-width:760px\)[\s\S]*width:14px;height:14px/,
  'Order SVGs must remain compact within the existing glass icon circles on desktop and mobile.');

// Account drawer action glyphs must use the same thin-stroke SVG treatment without changing action IDs/URLs.
const accountActionStart = html.indexOf('<button type="button" class="account-action tap-target" id="accountAddressAction"');
const accountActionEnd = html.indexOf('<p class="account-note"', accountActionStart);
assert.ok(accountActionStart >= 0 && accountActionEnd > accountActionStart,
  'Account action group must remain present.');
const accountActionHtml = html.slice(accountActionStart, accountActionEnd);
const accountSvgNames = [...accountActionHtml.matchAll(/<span class="account-action-icon" aria-hidden="true"><svg\b[^>]*data-account-icon="([^"]+)"/g)]
  .map(match => match[1]);
assert.deepEqual(accountSvgNames, ['address', 'orders', 'favorites', 'theme', 'contact'],
  'Address, order history, favorites, theme and contact must each use a semantic SVG icon in order.');
assert.equal([...accountActionHtml.matchAll(/class="account-action-chevron"/g)].length, 5,
  'Each account action must keep a dedicated decorative SVG chevron.');
assert.equal([...accountActionHtml.matchAll(/<svg\b[^>]*data-account-icon="chevron"[^>]*stroke-width="1\.7"/g)].length, 5,
  'Each account chevron must use the matching thin-stroke SVG.');
assert.doesNotMatch(accountActionHtml, /[⌖▤◐◎›]/,
  'The account drawer must not fall back to the Unicode pictographs or text chevron being replaced.');
const accountIconStyle = html.match(/<style id="sd-icon-account-actions-2026-10-22">([\s\S]*?)<\/style>/)?.[1] || '';
assert.ok(
  accountIconStyle.includes('#order .order-icon,#order .order-commitment-icon{color:var(--ink)}') &&
  accountIconStyle.includes('width:20px;height:20px') &&
  accountIconStyle.includes('stroke-width:1.7'),
  'Static order icons must use primary ink and account SVGs must use a consistent reference-scale stroke.'
);

// The Zalo CTA icon must match the supplied chat-bubble wordmark reference.
const orderZaloMarkStart = html.indexOf('<span class="order-zalo-mark" aria-hidden="true">');
const orderZaloMarkEnd = html.indexOf('</span>', orderZaloMarkStart);
assert.ok(orderZaloMarkStart >= 0 && orderZaloMarkEnd > orderZaloMarkStart,
  'The order-assurance Zalo CTA must retain its decorative marker.');
const orderZaloMark = html.slice(orderZaloMarkStart, orderZaloMarkEnd);
assert.ok(
  orderZaloMark.includes('viewBox="0 0 32 24"') &&
  orderZaloMark.includes('data-order-icon="zalo"') &&
  orderZaloMark.includes('stroke-width="1.7"') &&
  orderZaloMark.includes('>Zalo</text>'),
  'The CTA marker must render a thin-stroke speech bubble containing the Zalo wordmark rather than a generic Z.');
assert.ok(
  html.includes('.order-zalo-mark svg{display:block;width:28px;height:21px;overflow:visible}') &&
  html.includes('.order-zalo-mark{width:24px;height:18px;flex-basis:24px}.order-zalo-mark svg{width:24px;height:18px}'),
  'The Zalo wordmark must retain a readable responsive size on tablet and mobile layouts.');
assert.ok(
  html.includes('href="https://zalo.me/0827049192"') &&
  html.includes('aria-label="Tư vấn hoặc đặt hàng qua Zalo"'),
  'Changing the Zalo pictogram must not change its destination or accessible action label.');

// Product-detail trust chips use semantic SVGs, not the remaining decorative Unicode glyphs.
const detailPromiseStart = html.indexOf('<div class="promise-tags">');
const detailPromiseEnd = html.indexOf('</div><div class="detail-actions">', detailPromiseStart);
assert.ok(detailPromiseStart >= 0 && detailPromiseEnd > detailPromiseStart,
  'The four product-detail trust chips must remain present.');
const detailPromiseHtml = html.slice(detailPromiseStart, detailPromiseEnd);
const promiseIconNames = [...detailPromiseHtml.matchAll(/data-promise-icon="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(promiseIconNames, ['material', 'craftsmanship', 'support', 'consultation'],
  'Material, craftsmanship, support and consultation must each use a semantic icon in display order.');
assert.equal([...detailPromiseHtml.matchAll(/<svg\b[^>]*viewBox="0 0 24 24"[^>]*stroke-width="1\.7"/g)].length, 4,
  'All trust chips must use the 24x24 thin-stroke SVG system.');
assert.doesNotMatch(detailPromiseHtml, /[✦◇✓↗]/,
  'The trust chips must not fall back to the replaced text glyphs.');
const modalIconStyle = html.match(/<style id="sd-modal-navigation-promise-icons-2026-10-22">([\s\S]*?)<\/style>/)?.[1] || '';
assert.ok(
  modalIconStyle.includes('.promise-tag i{color:var(--ink)}') &&
  modalIconStyle.includes('width:13px;height:13px') &&
  modalIconStyle.includes('stroke-width:1.7'),
  'Trust chip SVGs must remain navy and compact inside the existing circular glass treatment.'
);



assert.ok(nativeHeroCss.includes("grid-template-columns:minmax(0,46%) minmax(0,54%)") &&
  nativeHeroCss.includes("height:clamp(525px,47vw,688px)"),
  'Desktop HERO expands to editorial proportions instead of the obsolete too-small banner.');
assert.ok(nativeHeroCss.includes("width:clamp(250px,79vw,470px)") &&
  nativeHeroCss.includes('height:clamp(185px,61vw,326px)'),
  'Mobile independently layered plinth must be sized to support the shoe soles.');
assert.ok(nativeHeroCss.includes('mask-image:linear-gradient(to bottom,transparent 0%,#000 8%,#000 64%') &&
  nativeHeroCss.includes("url('/images/hero-rebuild/marble-shelf-v14.svg')"),
  'Marble face blends into icy floor rather than forming an opaque floating disk.');

