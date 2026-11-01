import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.equal([...html.matchAll(/<main\b/g)].length,1,'Only one main landmark is present.');
assert.match(html,/<div id="notFoundPage" class="not-found-page"/,'Retain 404 UX without a second main');
assert.match(html,/function ensureOrderGuideOpen\(\)/,'Order guide can be expanded by deep link');
assert.match(html,/#detailOrderLink'\)\.addEventListener\('click',[^\n]*ensureOrderGuideOpen\(\)/,'Product detail link expands order guide');
assert.match(html,/hashchange',[^\n]*location\.hash==='#order'/,'Hashchange expands order guide');
assert.match(html,/async function consultProduct\(id\)[^\n]*optionText=option\?/,'Zalo product message includes selected variant');
assert.match(html,/async function consultCart\(\)[^\n]*Biến thể:/,'Zalo cart message includes variants');
assert.match(html,/revealObserver\.unobserve\(el\)/,'Reveal observer stops after first show');
assert.doesNotMatch(html,/el\.classList\.remove\('is-visible'\)/,'Reveal must not hide elements on reverse scroll');
assert.match(html,/window\.setTimeout\(dismiss,reduced\?100:1050\)/,'Welcome has a shorter delay');
assert.match(html,/<h2 class="welcome-title">/, 'Welcome is not a competing document H1');
assert.match(html,/<h1 class="sdh-title" id="sdh-title">/, 'Main Hero remains the primary H1');

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
assert.equal(styleStarts.length,28,'CSS is retained without accidentally dropping an approved rule block');
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
