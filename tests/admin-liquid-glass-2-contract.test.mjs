import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const storefront=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const checks=[
  ['official brand spelling','<h1>SinDarealest</h1>'],
  ['working header menu control','id="adminMenuToggle"'],
  ['header menu uses existing mobile menu','aria-controls="mobileMorePanel"'],
  ['shared menu toggle action','data-action="toggle-more"'],
  ['header menu is hidden on login shell','body:has(#loginView:not(.hidden)) #adminMenuToggle{display:none!important}'],
  ['glass shell tokens','--glass-shell-shadow:'],
  ['Storefront shared face token','--glass-face:var(--sd-3d-face);'],
  ['Storefront shared edge token','--glass-edge:var(--sd-3d-rim);'],
  ['Storefront shared panel shadow','--glass-shell-shadow:var(--sd-glass-panel-shadow);'],
  ['Storefront translucent shell token','--sd-glass-shell-strong:radial-gradient(ellipse 120% 140% at 25% -40%'],
  ['inner glass highlight token','--glass-inner-highlight:'],
  ['optical edge without opaque face','mask-composite:exclude'],
  ['inner surface inset','inset 0 1px 0 var(--glass-inner-highlight)'],
  ['pressed state','.btn:not(:disabled):active'],
  ['Storefront touch press state','data-sd-glass-press="true"'],
  ['release spring transition','--glass-release-duration:'],
  ['selected tab treatment','.mobiletabs .nav.active'],
  ['visible keyboard focus','.btn:focus-visible'],
  ['disabled controls','button:disabled'],
  ['reduced motion','@media(prefers-reduced-motion:reduce)'],
  ['five mobile navigation cells','grid-template-columns:repeat(5,minmax(0,1fr))'],
];
for(const [name,needle] of checks)assert.ok(html.includes(needle),`Missing Liquid Glass 2 contract: ${name}`);
for(const token of ['--sd-3d-ink','--sd-3d-shadow','--sd-3d-depressed','--sd-3d-selected','--sd-3d-rim','--sd-3d-face','--sd-glass-shell-strong','--sd-glass-panel-shadow','--sd-glass-input-shadow','--sd-glass-input-edge','--sd-glass-selected','--sd-control-rim','--sd-3d-ease']) {
  const values=source=>Array.from(source.matchAll(new RegExp(`${token}:([^;]+);`,'g')),match=>match[1]);
  const storefrontValues=values(storefront),adminValues=values(html);
  assert.ok(storefrontValues.length,`Storefront must define ${token}`);
  const adminTunedTokens=new Set(['--sd-3d-ink','--sd-3d-rim','--sd-3d-face','--sd-glass-shell-strong','--sd-glass-panel-shadow']);
  if(adminTunedTokens.has(token)) {
    assert.equal(adminValues.length,storefrontValues.length,`Admin light/dark definitions for ${token} must remain paired`);
    assert.ok(adminValues.some((value,index)=>value!==storefrontValues[index]),`Admin reference tuning for ${token} must be deliberate`);
  } else assert.deepEqual(adminValues.slice(0,storefrontValues.length),storefrontValues,`Admin must stay synchronized with Storefront ${token} values`);
}
assert.ok(packageJson.scripts.test.includes('tests/admin-liquid-glass-2-contract.test.mjs'),
  'Liquid Glass 2 contract must run in the standard test suite');
assert.ok(html.includes('--sd-3d-ink:var(--sd-admin-ink);'), 'Common chrome must use the same measured Admin navy as component text');
assert.ok(!html.includes('SD_ADMIN_FAKE_PRICES'),'Design cannot fabricate live dashboard statistics');
assert.doesNotMatch(html,/#main \.mobilecards tbody tr,#main \.customer-mobile-summary/, 'customer mobile cards should use the outer row shell once');
assert.ok(html.includes('--sd-dock-height:61px;--sd-dock-bottom:18px'), 'Dock dimensions must follow the measured reference');
assert.ok(html.includes('var(--sd-dock-height) + var(--sd-dock-bottom) + 20px + env(safe-area-inset-bottom)'), 'Content must clear the entire dock footprint and safe area');
assert.doesNotMatch(html,/\.mobiletabs[^{}]*\{[^{}]*white-space:normal/, 'Dock labels must not wrap');
assert.doesNotMatch(html,/\.mobiletabs[^{}]*\{[^{}]*(?:height|padding|background|font-size):[^;}]*!important/, 'Dock geometry and material must not be locked by old important rules');
const repeatedSurfaceOwner = html.match(/\/\* Repeated\/nested surfaces share one glass shell without another blur layer per item\. \*\/\s*([^{}]+)\{([^{}]*)\}/);
assert.ok(repeatedSurfaceOwner, 'Repeated surfaces must have one shared glass owner');
assert.match(repeatedSurfaceOwner[2], /background:var\(--sd-admin-surface-face,var\(--sd-admin-face\)\)/,
  'Repeated surfaces must use the shared theme-aware glass face');
assert.match(repeatedSurfaceOwner[2], /box-shadow:var\(--sd-admin-shadow\)/,
  'Repeated surfaces must use the shared contact shadow');
for (const surface of ['#main .mobilecards tbody tr', '.activity-log-card', '#main .sd-order-card', '.product-results-summary', '#main:has(#searchBox) .product-publish-filter-row', '.dashboard-activity-table tbody tr']) {
  assert.ok(repeatedSurfaceOwner[1].includes(surface), `Missing shared inset material owner for ${surface}`);
}
assert.match(html, /\.activity-log-card,#main \.sd-order-card,\.order-detail-item,[^{}]*\{--sd-admin-surface-face:var\(--sd-admin-inset-face\);--sd-admin-shadow:var\(--sd-admin-inset-shadow\);--sd-admin-rim:var\(--sd-admin-inset-rim\)\}/,
  'Repeated rows must use the shared inset glass variant');
assert.match(html, /\.order-detail-page-actions\{[^}]*--sd-admin-surface-face:var\(--sd-admin-sheet-face\)/,
  'Order detail actions must use the shared sheet material');
assert.match(html, /#main \.order-table \.order-management-summary\{--sd-admin-surface-face:var\(--sd-admin-inset-face\);--sd-admin-shadow:var\(--sd-admin-input-shadow\)\}/,
  'Order management summary must use the shared inset material tokens');
assert.equal((repeatedSurfaceOwner[1].match(/#main \.order-table \.order-management-summary/g) || []).length, 1,
  'Order management summary must have exactly one authoritative repeated-surface material owner');
assert.doesNotMatch(html, /#main \.activity-log-card-avatar\{background:rgba\(/,
  'Mobile activity avatars must not override the shared light/dark glass face');
assert.doesNotMatch(html, /#main:has\(#searchBox\) \.product-publish-filter-row \.warranty-filter-button\[aria-pressed="true"\]\{/,
  'Product filter selection must use the common interactive glass state rule');
assert.match(html, /#main \.toolbar,#main \.order-toolbar\{--sd-admin-surface-face:var\(--sd-admin-inset-face\);--sd-admin-shadow:var\(--sd-admin-inset-shadow\);--sd-admin-rim:var\(--sd-admin-inset-rim\)\}/,
  'Product and order filter shells must share the inset material without per-row blur');
assert.doesNotMatch(html, /:root\[data-admin-theme="dark"\] \.panel,/,
  'Legacy dark panel material must not override the shared light/dark owner');
assert.match(html, /\.editor,.notification-panel,.mobile-more-panel,.admin-glass-dialog,.logincard,.product-category-grid,.product-quick-editor,.toast\{--sd-admin-surface-face:var\(--sd-admin-sheet-face\)\}/,
  'Quick editor and Other sheet surfaces must use the theme-aware sheet token');
assert.match(html, /\.slider:before\{[^}]*background:var\(--sd-admin-icon-face\)[^}]*box-shadow:var\(--sd-admin-control-shadow\)/,
  'Settings switches must use the raised shared glass thumb');
assert.match(html, /\.switch input:checked\+\.slider\{background:var\(--sd-admin-success-face\)/,
  'Settings switches must show a theme-aware selected glass state');
assert.match(html, /#main \.product-visibility-toggle\[aria-checked="true"\] \.product-visibility-track\{background:var\(--sd-admin-success-face\)/,
  'Product visibility switch must use the shared semantic glass state');
assert.match(html, /body:has\(#appView:not\(\.hidden\)\) \.topbar #notificationToggle\[aria-expanded="true"\]\{box-shadow:var\(--sd-admin-control-shadow\),var\(--sd-admin-selected-shadow\)\}/,
  'Expanded notification state must survive the app-wide header material owner');
const sharedLayer2 = html.match(/\/\* Shared Layer 2 surface owner[^*]*\*\/\s*([^{}]+)\{([^{}]*)\}/);
assert.ok(sharedLayer2, 'Shared Layer 2 surface owner must exist');
assert.doesNotMatch(sharedLayer2[2], /mobile-more-item/, 'More sheet children must not stack a second blur over the sheet');
assert.match(sharedLayer2[1], /product-quick-editor/, 'Inline product editor must use the common glass surface owner');
assert.doesNotMatch(sharedLayer2[1], /\.shortcut/, 'Dashboard shortcuts must avoid a nested blur over their parent panel');
assert.match(html, /\.shortcut,\.mobile-more-item\{--sd-admin-surface-face:var\(--sd-admin-tile-face\);--sd-admin-shadow:var\(--sd-admin-tile-shadow\);--sd-admin-rim:var\(--sd-admin-tile-rim\)\}/,
  'Dashboard quick actions and More menu items must share the raised tile material');
assert.match(html, /\.product-visibility-row,\.mobilecards tbody tr,#main \.sd-admin-qr-intent,[^{}]*\{[^{}]*--sd-admin-surface-face:var\(--sd-admin-inset-face\)/,
  'Product and customer mobile cards must use the nested glass face');
assert.doesNotMatch(html, /#main \.product-table tbody tr\{[^}]*background:var\(--sd-admin-face\)/,
  'Product cards must not be overridden by the old raised face after the shared inset owner');
assert.match(html, /body:has\(#appView:not\(\.hidden\)\) \.topbar \.topright #logout\{background:var\(--sd-admin-danger-face\)\}/,
  'Logout must retain its semantic danger glass face at header-owner specificity');
assert.match(html, /#main \.product-table tbody tr\[data-product-row\]:hover\{box-shadow:var\(--sd-admin-hover-shadow\)\}/,
  'Product row hover must deepen the shared glass contact shadow instead of flattening its face');
assert.match(html, /product-table tbody tr\[data-product-row\]:active\{background:var\(--sd-admin-pressed-face\);box-shadow:var\(--sd-admin-pressed-shadow\)\}/,
  'Product row press must use the shared pressed glass face and shadow');
assert.doesNotMatch(html, /product-table tbody tr\[data-product-row\]:(?:hover|active)\{[^}]*background:rgba\(/,
  'Product row states must not replace the glass material with a flat rgba fill');
assert.match(html, /#productPanelDetails \.product-fulfillment-toggle\[data-fulfillment="in_stock"\]\{[^}]*background:var\(--sd-admin-success-face\)/,
  'Add/Edit product fulfillment state must use the shared semantic glass face');
assert.doesNotMatch(html, /product-fulfillment-toggle(?:\[data-fulfillment="in_stock"\])?\{[^}]*background:rgba\(/,
  'Add/Edit product fulfillment controls must not use a raw flat color fill');
assert.doesNotMatch(html, /\.dashboard-activity-table tbody tr\{[^}]*background:var\(--paper\)/,
  'Dashboard activity cards must use the shared nested surface instead of paper');
assert.doesNotMatch(html, /\.switch input:checked\+\.slider\{background:#5c91b9\}/,
  'Settings switch selection must not retain the legacy hardcoded blue face');
assert.match(html, /#main:has\(#searchBox\) #searchBox\{[^}]*box-shadow:var\(--sd-admin-input-shadow\)/,
  'Product search must use the shared recessed input shadow');
assert.doesNotMatch(html, /#main:has\(#searchBox\) #searchBox\{[^}]*box-shadow:0 2px 8px rgba\(/,
  'Product search must not override the shared input shadow with a raw value');
assert.match(html, /#main \.product-table \.product-fulfillment-chip\.product-quick-trigger\{[^}]*background:var\(--sd-admin-status-face\)/,
  'Fulfillment quick triggers must retain the shared status-glass face');
assert.match(html, /#main \.product-table \.product-fulfillment-chip\[data-fulfillment-type="unclassified"\]\{[^}]*background:var\(--sd-admin-neutral-face\)/,
  'Unclassified fulfillment must use the shared neutral-glass face');
assert.doesNotMatch(html, /product-fulfillment-chip\.product-quick-trigger\{[^}]*border:1px dashed rgba\(/,
  'Fulfillment quick-trigger edges must use a theme-aware glass edge token');

console.log('PASS: Admin Liquid Glass 2 preserves live UI semantics and defines a unified optical glass interaction contract.');
