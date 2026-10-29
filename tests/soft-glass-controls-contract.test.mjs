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
