import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const authCss=readFileSync(new URL('../public/customer-auth.css',import.meta.url),'utf8');
const heroCss=readFileSync(new URL('../public/code-hero.css',import.meta.url),'utf8');
test('soft inset catalog uses existing live filter elements and keeps data binding',()=>{
 assert.match(html,/id="catalogSearch"/);
 assert.match(html,/id="categoryFilters"/);
 assert.match(html,/class="filter-pill tap-target/);
 assert.match(html,/selectedCategory===c/);
 assert.match(html,/function renderFilters\(/);
 assert.match(html,/function renderCatalog\(/);
 assert.match(html,/#products \.filter-pill\.active/);
 assert.match(html,/#products \.search-field:focus-within/);
 assert.doesNotMatch(html,/sdCatalogGlassActivate|sdCatalogSpecularSweep/);
});
test('one final icon material preserves badge, wishlist and bottom navigation',()=>{
 assert.match(html,/id="sd-unified-icon-system-final"/);
 assert.match(html,/id="mobileBottomNav"/);
 assert.match(html,/id="mobileCartNav"/);
 assert.match(html,/id="cartOpen"/);
 assert.match(html,/\.detail-favorite-btn\[aria-pressed="true"\]/);
 assert.match(html,/color:#E5484D!important/);
 assert.match(html,/\.cart-count\{/);
 assert.match(html,/--sd-control-shadow:/);
 assert.match(html,/--sd-control-down:/);
 assert.match(html,/#mobileBottomNav \.mobile-tab\.is-active/);
 assert.match(html,/@media\(hover:hover\) and \(pointer:fine\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
});

test('dark selected controls cannot mask tactile :active material',()=>{
 assert.ok(html.includes('html.dark #products .filter-pill.active:active:not(:disabled)'));
 assert.ok(html.includes('html.dark #productOverlay .detail-actions .detail-purchase-button:active:not(:disabled)'));
 assert.ok(html.includes('html.dark #productOverlay .sd-product-option-chip.is-selected:active:not(:disabled)'));
 assert.ok(html.includes('box-shadow:var(--sd-3d-depressed)'));
 assert.ok(html.includes('transition-duration:105ms'));
});

test('one clear face, one masked optical edge and separate depth roles in both themes',()=>{
 assert.match(html,/--sd-3d-shadow:0 2px 4px rgba\(48,84,117,\.12\),0 10px 22px/);
 assert.match(html,/--sd-3d-face:radial-gradient/);
 assert.match(html,/--sd-3d-surface:var\(--sd-3d-face\);/);
 assert.match(html,/--sd-3d-surface-search:var\(--sd-3d-face\)/);
 assert.match(html,/--sd-3d-rim:radial-gradient\(ellipse 70% 92% at 1% 0%/);
 assert.match(html,/radial-gradient\(ellipse 53% 108% at 100% 36%/);
 assert.match(html,/radial-gradient\(ellipse 100% 47% at 60% 110%/);
 const raisedShadows=[...html.matchAll(/--sd-3d-shadow:([^;]+);/g)].map(([,value])=>value);
 assert.equal(raisedShadows.length,2,'light and dark raised controls share one default shadow role');
 for(const shadow of raisedShadows)assert.doesNotMatch(shadow,/inset/,'default glass stays optically raised, not cushioned');
 assert.match(html,/--sd-3d-depressed:0 1px 2px/);
 assert.match(html,/--sd-glass-panel-shadow:/);
 assert.match(html,/--sd-3d-selected:/);
 assert.doesNotMatch(html,/--sd-3d-bevel(?:-pressed)?:/);
});
test('touch press controller survives scroll, cancel and does not alter product business state',()=>{
 assert.match(html,/id="sd-glass-touch-press-controller"/);
 assert.match(html,/addEventListener\('touchstart',down/);
 assert.match(html,/addEventListener\('touchend',release/);
 assert.match(html,/addEventListener\('touchcancel',release/);
 assert.match(html,/addEventListener\('touchmove',release/);
 assert.match(html,/addEventListener\('scroll',release,true/);
 assert.match(html,/removeAttribute\('data-sd-glass-press'\)/);
 assert.match(html,/#products \.filter-pill\[data-sd-glass-press="true"\]/);
});

test('catalog excludes color below the face; rim cannot introduce a second bevel ring',()=>{
 const start=html.indexOf('/* One real optical rim:');
 const end=html.indexOf('#products .filter-pill.active,#products .filter-pill[aria-pressed="true"]',start);
 assert.ok(start>0 && end>start);
 const rim=html.slice(start,end);
 assert.match(rim,/position:absolute;inset:0;border-radius:inherit;pointer-events:none/);
 assert.match(rim,/padding:1\.5px;background:var\(--sd-3d-rim\);opacity:\.88/);
 assert.doesNotMatch(rim,/filter:blur/,'masked edge remains a fine specular line');
 assert.match(rim,/-webkit-mask-composite:xor/);
 assert.match(rim,/mask-composite:exclude/);
 assert.doesNotMatch(rim,/box-shadow:/);
 assert.match(rim,/transition:opacity 250ms/);
 assert.match(rim,/transition-duration:105ms/);
 assert.doesNotMatch(html,/#products \.filter-pill\[data-sd-glass-press="true"\]::after\{\s*box-shadow:/);
 assert.match(html,/#products \.search-field,#products \.filter-pill\{/);
 assert.match(html,/background:var\(--sd-3d-face\)/);
});

test('Final Glass UI 2.0 replaces opaque legacy shells without duplicating materials',()=>{
 assert.equal((html.match(/--sd-glass-shell-strong:/g)||[]).length,2,'both themes define the same strong shell');
 assert.equal((html.match(/--sd-glass-panel-shadow:/g)||[]).length,2);
 assert.equal((html.match(/--sd-glass-input-shadow:/g)||[]).length,2);
 assert.match(html,/--sd-glass-shell:var\(--sd-3d-face\);/);
 assert.doesNotMatch(html,/\.nav-wrap \.nav\{background:rgba\(237,245,251,\.95\)!important/);
 assert.doesNotMatch(html,/\.mobile-bottom-nav\{\s*background:rgba\(247,252,255,\.995\)!important/);
 assert.match(html,/\.nav-wrap \.nav\{border:1px solid transparent;background:var\(--sd-glass-shell-strong\)!important/);
 assert.match(html,/#mobileBottomNav\.mobile-bottom-nav\{\s*border:1px solid transparent;background:var\(--sd-glass-shell-strong\)!important/);
 assert.match(html,/\.service-strip \.service-copy\{\s*min-height:78px;[^}]+background:var\(--sd-glass-shell\)/);
 assert.match(html,/\.service-strip \.service\.tap-target::before\{content:none\}/);
 assert.match(html,/\.service-strip \.service-copy\{min-height:70px/);
 assert.match(html,/#order \.order-cta--compact #orderDetailsToggle\{min-height:42px/);
 assert.match(html,/#warrantyLookupSubmit\{min-height:40px/);
 assert.match(html,/#order \.order-cta--compact #orderDetailsToggle\{min-height:46px[^}]+background:var\(--sd-glass-shell\)/);
 assert.match(html,/\.product-card,\.catalog-card\{\s*border-radius:18px;border-color:transparent;\s*background:var\(--sd-glass-shell\)/);
});
test('Interactive surfaces, forms, nav, order tracking, cart and account use shared optics',()=>{
 const finalCss=html.slice(html.indexOf('<style id="sd-unified-icon-system-final">'));
 for(const selector of ['.sd-track-panel','.sd-track-controls input','.checkout-fields input',
   '.checkout-fields select','.checkout-fields textarea','.nav-wrap .navlink.active',
   '.checkout-drawer .sd-checkout-option','.cart-row','.contact-link']){
  assert.ok(finalCss.includes(selector),selector+' must opt into the shared system');
 }
 assert.match(html,/\.service-strip \.service\[data-sd-glass-press="true"\] \.service-copy/);
 assert.match(html,/\.service-strip \.service,.navlink,.text-link,.contact-link,.icon-btn/);
 assert.match(finalCss,/\[aria-invalid="true"\]/);
 assert.match(finalCss,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(authCss,/background:var\(--sd-glass-shell-strong,var\(--sd-account-surface\)\)/);
 assert.match(authCss,/background:var\(--sd-glass-shell,var\(--sd-account-button\)\)/);
 assert.match(authCss,/#sdCustomerAuth \.sd-auth-google-mark/);
});
test('Style sheet order and functional features stay intact after refactor',()=>{
 const styles=(html.match(/<style(?:\s|>)/g)||[]).length;
 const ends=(html.match(/<\/style>/g)||[]).length;
 assert.equal(styles,ends);
 assert.match(html,/<\/style>\s*<\/body>\s*<\/html>\s*$/);
 for(const anchor of ['id="welcomeSplash"','id="categoryFilters"','id="sdTrackForm"',
  'id="mobileBottomNav"','id="accountDrawer"','id="checkoutDrawer"','function renderCatalog(',
  'function openCheckout(']){
  assert.ok(html.includes(anchor),anchor+' disappeared');
 }
});

test('Hero CTA retains approved blink and gains same prismatic rim without layout changes',()=>{
 assert.match(heroCss,/\.sd-code-hero \.sdh-cta--zalo::before\{[^}]*sdh-cta-border-pulse/);
 assert.match(heroCss,/\.sd-code-hero \.sdh-cta::after\{[^}]*background:var\(--sd-3d-rim/);
 assert.match(heroCss,/\.sd-code-hero \.sdh-cta::after\{[^}]*mask-composite:exclude/);
 assert.match(heroCss,/\.sd-code-hero \.sdh-cta:active\{transform:translateY\(1px\);box-shadow:/);
 assert.match(heroCss,/html\.dark \.sd-code-hero \.sdh-cta:active\{box-shadow:/);
 assert.match(heroCss,/\.sd-code-hero \.sdh-cta\{position:relative;isolation:isolate/);
 assert.match(heroCss,/min-height:50px;[^}]+radial-gradient\(ellipse at 24% 7%/);
 assert.match(heroCss,/@keyframes sdh-cta-border-pulse\{0%,100%\{opacity:\.28\}50%\{opacity:\.78\}/);
});


test('Cart removal, one-row shoe sizes, and compact catalog cards retain their labels and layout',()=>{
 const render=html.slice(html.indexOf('function renderCart('),html.indexOf('function openCart('));
 assert.ok(render.includes('class="remove-item tap-target"'));
 assert.ok(render.includes('aria-label="Xóa sản phẩm">Xóa</button>'));
 assert.ok(html.includes('.cart-row{grid-template-columns:68px minmax(0,1fr) max-content'));
 assert.ok(html.includes('.cart-row{grid-template-columns:60px minmax(0,1fr) max-content'));
 assert.ok(html.includes('.cart-row{grid-template-columns:58px minmax(0,1fr) max-content;gap:8px;padding:8px'));
  assert.ok(html.includes('.cart-drawer .cart-row{\n background:linear-gradient(145deg,rgba(255,255,255,.34)'));
  assert.ok(html.includes('min-height:54px;'), 'bottom navigation remains slim with 44px controls');
 assert.ok(html.includes('.remove-item{font-size:10px;min-width:42px;min-height:30px;padding:5px 8px}'));
 assert.ok(html.includes("kind==='shoe'?' sd-product-option-choices--shoe'"));
 assert.ok(html.includes('grid-template-columns:repeat(7,minmax(0,1fr))'));
 const start=html.indexOf('function productCard('),end=html.indexOf('/* Bidirectional blur reveal',start);
 const card=html.slice(start,end);
 assert.ok(!card.includes('product-category'));
 assert.ok(/product-card-bottom[\s\S]*quick-add/.test(card));
 const featuredStart=html.indexOf('function featuredProductCard('),featuredEnd=html.indexOf('/*',featuredStart);
 const featured=html.slice(featuredStart,featuredEnd);
 assert.ok(!featured.includes('product-category'));
 assert.ok(/product-card-bottom[\s\S]*quick-add/.test(featured));
 assert.ok(html.includes('.product-card .product-card-bottom{display:flex;align-items:center;flex-direction:row'));
 assert.ok(html.includes('.product-card .product-card-footer{padding:0 13px 12px'));
});