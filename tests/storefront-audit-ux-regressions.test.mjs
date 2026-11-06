import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.equal([...html.matchAll(/<main\b/g)].length,1,'Only one main landmark is present.');
assert.match(html,/<div id="notFoundPage" class="not-found-page"/,'Retain 404 UX without a second main');
assert.match(html,/id="orderDetailsPanel" class="order-details-panel">/,'Order guide is visible from initial HTML.');
assert.equal([...html.matchAll(/<div class="order-step glass" role="listitem"/g)].length,4,'Order steps use listitem roles on allowed generic containers');
assert.doesNotMatch(html,/<article\b[^>]*\brole="listitem"/,'Do not override native article semantics with listitem roles');
assert.doesNotMatch(html,/ensureOrderGuideOpen|orderDetailsToggle/,'Order guide does not need click-to-expand.');
assert.match(html,/#detailOrderLink'\)\.addEventListener\('click',[^\n]*location\.hash='order'/,'Product detail link still scrolls to order guide.');
assert.match(html,/async function consultProduct\(id\)[^\n]*optionText=option\?/,'Zalo product message includes selected variant');
assert.doesNotMatch(html,/async function consultCart\(\)|id="cartZalo"|\$\('#cartZalo'\)/,'Cart no longer contains the removed Zalo action or handler');
assert.match(html,/revealObserver\.unobserve\(el\)/,'Reveal observer stops after first show');
assert.doesNotMatch(html,/el\.classList\.remove\('is-visible'\)/,'Reveal must not hide elements on reverse scroll');
assert.match(html,/autoDismissElapsed=true;\s*maybeTimedDismiss\(\);\s*\},reduced\?100:1050\)/,'Welcome keeps its approved ~1s minimum, waiting for first paint on slow phones');
assert.match(html,/<h2 class="welcome-title">/, 'Welcome is not a competing document H1');
assert.match(html,/<h1 class="sdh-title" id="sdh-title">/, 'Main Hero remains the primary H1');
assert.ok(html.includes('srcset="/logo-ui-128.webp 128w, /logo-ui-192.webp 192w, /logo-ui-224.webp 224w, /logo-ui-320.webp 320w, /logo-ui.webp 360w" sizes="(max-height:630px) 79px, (max-width:760px) 26vw, 130px"'), 'Welcome logo must select an appropriately sized responsive source');
assert.match(html,/<img width="360" height="360" src="\/logo-ui\.webp"[^>]*class="welcome-logo"/,'Welcome logo reserves its intrinsic square dimensions');
assert.match(html,/\.welcome-loader i\{[^}]*transform:translateX\(-107\.15%\)[^}]*animation:welcomeLoading/,'Welcome loader uses a compositor-friendly transform');
assert.match(html,/@keyframes welcomeLoading\{to\{transform:translateX\(261\.9%\)\}\}/,'Welcome loader sweep retains its full track travel');
assert.ok(html.includes('srcset="/logo-ui-128.webp 128w, /logo-ui-192.webp 192w, /logo-ui-224.webp 224w, /logo-ui.webp 360w" sizes="126px"'), 'Footer logo must use responsive image sources');

/* On the first parse, drawer markup precedes its full animation CSS. aria-hidden
   and inert never hide a painted surface, so preserve a first-paint visibility
   gate until the user explicitly opens the drawer. This catches the Android
   refresh/Welcome-bypass one-frame checkout flash. */
for(const [id,openPattern] of [
  ['cartDrawer',/const panel=\$\('#cartDrawer'\);panel\.style\.visibility='';panel\.removeAttribute\('inert'\)/],
  ['checkoutDrawer',/panel\.style\.visibility='';backdrop\.style\.visibility='';/],
  ['checkoutBackdrop',/panel\.style\.visibility='';backdrop\.style\.visibility='';/],
  ['accountDrawer',/panel\.style\.visibility='';panel\.removeAttribute\('inert'\)/]
]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*style="visibility:hidden"'),'Closed '+id+' must be hidden before deferred CSS is parsed');
  assert.match(html,openPattern,'First deliberate open must clear the initial inline guard for '+id);
}
assert.match(html,/\.checkout-drawer\.open\{transform:translateX\(0\);visibility:visible/,'Keep the original checkout slide-in effect');
assert.match(html,/\.checkout-drawer\{position:fixed;[^\n]*visibility:hidden;pointer-events:none;transition:transform/,'Closed checkout uses the original delayed visibility slide-out');

const headMarkup=html.slice(0,html.indexOf('</head>'));
const styleStarts=[...html.matchAll(/<style\b[^>]*>/gi)].map(m=>m.index);
assert.equal(styleStarts.length,30,'Critical hero CSS is added while preserving every approved rule block');
assert.ok(styleStarts.every(offset=>offset<headMarkup.length),
 'All visual CSS must be available before the first header/hero can paint');
assert.match(headMarkup,/\.brand-copy\{display:flex;flex-direction:column;/,
 'Brand must be stacked before header is inserted (no first-paint joined name/tagline)');
assert.match(headMarkup,/@media\(max-width:760px\)\{\s*\.nav-wrap \.nav \.brand\{/,
 'Approved mobile nav brand geometry must be ready before first paint');

// Filter chips hydrate asynchronously after SSR. Reserve exactly one 40px
// mobile chip row + 10px vertical padding before JavaScript inserts children,
// so the catalog grid cannot jump ~40px during the first viewport render.
assert.ok(headMarkup.includes('#products .catalog-tools .filter-pills{min-height:50px;gap:8px;padding:2px 2px 8px;'),
 'Mobile category filter rail must reserve its final row height before hydration');
const startup=html.indexOf('async function init()');
const productsFetch=html.indexOf("await fetch('/api/products'",startup);
assert.ok(startup>=0&&productsFetch>startup,'Startup and products request exist');
const prior=html.slice(startup,productsFetch);
assert.ok(!prior.includes('loadCheckoutProvinces();'),
 'Homepage startup must not fetch provinces before opening checkout');
assert.ok(html.includes('checkoutProvinceLoadStarted=true;\n  void loadCheckoutProvinces();'),
 'Checkout fetches province options once on first opening');
assert.ok(prior.includes('bindReveal(document);'),
 'Editorial reveal must start before a slow products API response');
assert.ok(prior.includes("document.addEventListener('DOMContentLoaded',setupMobileBottomNav,{once:true})"),
 'Mobile dock must bind when later HTML nav is parsed, before products API resolves');
assert.ok(prior.includes('setupNavSpy();'),'Nav spy should not wait for products API');
assert.ok(!html.slice(productsFetch).includes('setupMobileBottomNav();'),
 'Never attach duplicate dock listeners after hydration');
console.log('PASS: Storefront first-paint and pending-products mobile dock contracts');

/* Cold-home network: the 219KB craft photo and both material thumbnails are
 * below the first viewport. Preserve their original no-JS sources while
 * allowing the existing near-viewport image observer to fetch them on demand. */
for(const [selector,file] of [
 ['id="craftTileImage"','2c341b173eff94f1.webp'],
 ['material-photo--dark','theme-croc-dark-tile.webp'],
 ['material-photo--light','theme-croc-albino-tile.webp']
]){
 assert.ok(html.includes(selector)&&html.includes('data-src="images/'+file+'"'),
  'Mosaic image must remain present and deferred: '+file);
 assert.ok(html.includes('src="images/'+file+'" loading="lazy"'),
  'No-JS visitors retain the real artwork: '+file);
}
assert.match(html,/#craftTileImage\[data-src\],#materialTile img\.material-photo\[data-src\]/,
 'Near-viewport image observer should activate all three mosaic photos');
assert.ok(html.includes('id="artSlide" data-src="images/5151ab24330c6931.webp"'),
 'First art photo must not download on the cold home viewport');
assert.ok(html.includes('<noscript><img class="mosaic-photo" src="images/5151ab24330c6931.webp"'),
 'No-JS art keeps its original photo');
assert.ok(html.includes("activateArtFirstSlide();\n   setupArtSlideshow();"),
 'Home art photo must activate before slideshow when approaching viewport');

