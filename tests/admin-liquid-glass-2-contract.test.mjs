import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const checks=[
  ['official brand spelling','<h1>SinDarealest</h1>'],
  ['working header menu control','id="adminMenuToggle"'],
  ['header menu uses existing mobile menu','aria-controls="mobileMorePanel"'],
  ['shared menu toggle action','data-action="toggle-more"'],
  ['header menu is hidden on login shell','body:has(#loginView:not(.hidden)) #adminMenuToggle{display:none!important}'],
  ['glass shell tokens','--glass-shell-shadow:'],
  ['inner glass highlight token','--glass-inner-highlight:'],
  ['optical glass surface','linear-gradient(148deg,var(--glass-surface-start)'],
  ['inner surface inset','inset 0 1px 0 var(--glass-inner-highlight)'],
  ['pressed state','.btn:not(:disabled):active'],
  ['release spring transition','--glass-release-duration:'],
  ['selected tab treatment','.mobiletabs .nav.active'],
  ['visible keyboard focus','.btn:focus-visible'],
  ['disabled controls','button:disabled'],
  ['reduced motion','@media(prefers-reduced-motion:reduce)'],
  ['five mobile navigation cells','grid-template-columns:repeat(5,minmax(0,1fr))'],
];
for(const [name,needle] of checks)assert.ok(html.includes(needle),`Missing Liquid Glass 2 contract: ${name}`);
assert.ok(packageJson.scripts.test.includes('tests/admin-liquid-glass-2-contract.test.mjs'),
  'Liquid Glass 2 contract must run in the standard test suite');
assert.ok(!html.includes('SD_ADMIN_FAKE_PRICES'),'Design cannot fabricate live dashboard statistics');
console.log('PASS: Admin Liquid Glass 2 preserves live UI semantics and defines a unified optical glass interaction contract.');
