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
  ['optical glass surface','var(--glass-face) padding-box,var(--glass-edge) border-box'],
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
  const adminTunedTokens=new Set(['--sd-3d-rim','--sd-3d-face','--sd-glass-panel-shadow']);
  if(adminTunedTokens.has(token)) {
    assert.equal(adminValues.length,storefrontValues.length,`Admin light/dark definitions for ${token} must remain paired`);
    assert.ok(adminValues.some((value,index)=>value!==storefrontValues[index]),`Admin reference tuning for ${token} must be deliberate`);
  } else assert.deepEqual(adminValues.slice(0,storefrontValues.length),storefrontValues,`Admin must stay synchronized with Storefront ${token} values`);
}
assert.ok(packageJson.scripts.test.includes('tests/admin-liquid-glass-2-contract.test.mjs'),
  'Liquid Glass 2 contract must run in the standard test suite');
assert.ok(!html.includes('SD_ADMIN_FAKE_PRICES'),'Design cannot fabricate live dashboard statistics');
assert.doesNotMatch(html,/#main \.mobilecards tbody tr,#main \.customer-mobile-summary/, 'customer mobile cards should use the outer row shell once');
assert.match(html,/\.mobiletabs\{[\s\S]{0,400}?height:56px;min-height:56px/, 'Admin mobile navigation should keep the slim target dock height');
assert.match(html,/\.mobiletabs \.nav\.active\{[\s\S]{0,350}?0 5px 12px rgba\(49,121,187,\.15\)/, 'selected Admin tab should remain visibly raised');
assert.match(html,/@media\(max-width:820px\) and \(max-height:700px\)\{[\s\S]{0,900}?#main \.dashboard-revenue-empty\{min-height:64px/, 'short phone dashboard should compact enough to clear the fixed navigation');
console.log('PASS: Admin Liquid Glass 2 preserves live UI semantics and defines a unified optical glass interaction contract.');
