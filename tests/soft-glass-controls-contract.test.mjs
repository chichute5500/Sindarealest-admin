import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
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
 assert.match(html,/--sd-3d-face:radial-gradient/);
 assert.match(html,/--sd-3d-surface:var\(--sd-3d-face\) padding-box/);
 assert.match(html,/--sd-3d-surface-search:var\(--sd-3d-face\)/);
 assert.match(html,/--sd-3d-rim:radial-gradient\(ellipse 78% 95% at 0% 1%/);
 assert.match(html,/radial-gradient\(ellipse 55% 113% at 100% 40%/);
 assert.match(html,/radial-gradient\(ellipse 100% 47% at 60% 105%/);
 assert.match(html,/--sd-3d-shadow:0 1px 2px/);
 assert.match(html,/--sd-3d-depressed:0 1px 2px/);
 assert.match(html,/--sd-3d-tray-shadow:/);
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
 assert.match(rim,/padding:1\.4px;background:var\(--sd-3d-rim\)/);
 assert.match(rim,/-webkit-mask-composite:xor/);
 assert.match(rim,/mask-composite:exclude/);
 assert.doesNotMatch(rim,/box-shadow:/);
 assert.match(rim,/transition:opacity 250ms/);
 assert.match(rim,/transition-duration:105ms/);
 assert.doesNotMatch(html,/#products \.filter-pill\[data-sd-glass-press="true"\]::after\{\s*box-shadow:/);
 assert.match(html,/#products \.search-field,#products \.filter-pill\{/);
 assert.match(html,/background:var\(--sd-3d-face\)/);
});
