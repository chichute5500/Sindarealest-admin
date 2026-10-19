import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const start = html.indexOf('function setupMobileBottomNav()');
const end = html.indexOf('function syncHeroProductImage()', start);
assert.ok(start >= 0 && end > start, 'Mobile navigation setup must exist and remain isolated.');
const setup = html.slice(start, end);
assert.match(setup, /data-mobile-tab/ , 'All mobile navigation tabs must use the shared active-state contract.');
assert.ok(setup.includes("['products',$('#products')]"), 'Catalog visibility must activate the products tab.');
assert.ok(setup.includes("['home',$('#siteFooter')]"), 'The footer must be treated as part of the home screen, not the account screen.');
assert.ok(!setup.includes("['account',$('#contact')]"), 'Scrolling to contact information must not falsely activate the account tab.');
for (const id of ['home','order','featured','promise','collections','siteFooter']) {
  assert.ok(setup.includes("['home',$('#" + id + "')]"), 'Homepage section must map to the home tab: ' + id);
}
assert.match(setup, /const activate=key=>tabs\.forEach\(tab=>\{const active=tab\.dataset\.mobileTab===key/ , 'Active tabs must be updated via their actual semantic key.');
assert.match(setup, /if\(tab\.dataset\.mobileTab==='cart'\).*openCart\(\)/, 'Cart tab must open the real cart drawer.');
assert.match(setup, /else if\(tab\.dataset\.mobileTab==='account'\).*openAccount\(\)/, 'Account tab must open the real account drawer.');
console.log('PASS: mobile nav active state follows home/catalog content; contact scrolling no longer impersonates the account route.');
