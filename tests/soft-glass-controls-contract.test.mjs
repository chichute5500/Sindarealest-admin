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

test('owner soft inset uses a recessed center, curved bevel and restrained contact depth',()=>{
 assert.match(html,/--sd-3d-rim:linear-gradient\(135deg/);
 assert.doesNotMatch(html,/--sd-3d-rim:conic-gradient/);
 assert.match(html,/#products \.search-field::after,#products \.filter-pill::after\{/);
 assert.match(html,/--sd-3d-shadow:0 1px 2px/);
 assert.match(html,/--sd-3d-depressed:0 1px 2px/);
 assert.match(html,/#products \.filter-pill:active::after/);
 assert.match(html,/--sd-3d-tray-shadow:/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
