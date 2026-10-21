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

const modalHistoryStart = html.indexOf("const SD_MODAL_HISTORY_KEY='__sdStorefrontModal';");
const modalHistoryEnd = html.indexOf('function openFullscreenImage()', modalHistoryStart);
assert.ok(modalHistoryStart >= 0 && modalHistoryEnd > modalHistoryStart,
  'Storefront modal history helpers must exist before the gallery opener.');
const modalHistory = html.slice(modalHistoryStart, modalHistoryEnd);
assert.match(modalHistory,
  /function pushStorefrontModalHistory\(type\)[\s\S]*?history\.pushState\(\{\.\.\.current,\[SD_MODAL_HISTORY_KEY\]:type\},'',location\.href\)/,
  'Opening a storefront modal must create a history entry without changing the URL.');
assert.match(modalHistory, /function requestStorefrontModalClose\(type,fallback\)[\s\S]*?history\.back\(\)/,
  'Closing a modal must consume its history entry when present.');
assert.match(modalHistory,
  /function activeStorefrontModal\(\)[\s\S]*?return 'gallery'[\s\S]*?return 'checkout'[\s\S]*?return 'cart'[\s\S]*?return 'account'/,
  'History navigation must identify gallery, checkout, cart and account states.');
for (const opener of [
  /function openCart\(\)[\s\S]*?!restoringStorefrontModalHistory\)pushStorefrontModalHistory\('cart'\)/,
  /function openCheckout\(\)[\s\S]*?!restoringStorefrontModalHistory\)pushStorefrontModalHistory\('checkout'\)/,
  /function openAccount\(\)[\s\S]*?!restoringStorefrontModalHistory\)pushStorefrontModalHistory\('account'\)/,
  /function openFullscreenImage\(\)[\s\S]*?!restoringStorefrontModalHistory\)pushStorefrontModalHistory\('gallery'\)/
]) assert.match(html, opener, 'Each relevant modal opener must add a browser history state.');
assert.match(html,
  /window\.addEventListener\('popstate',event=>\{const currentModal=activeStorefrontModal\(\),targetModal=storefrontModalHistoryType\(event\.state\)/,
  'Back/Forward navigation must resolve modal state before product routing.');
assert.match(modalHistory, /function closeStorefrontModal\(type,restoreFocus=true\)[\s\S]*?closeAccount\(restoreFocus\)/,
  'Closing Account and Checkout from browser history must restore focus when appropriate.');
assert.ok(html.includes("closeStorefrontModal(currentModal,targetModal!=='cart')"),
  'Checkout-to-cart Back navigation must defer focus restoration until the cart is reopened.');
for (const closeBinding of [
  "$('#cartClose').addEventListener('click',()=>requestStorefrontModalClose('cart',closeCart))",
  "$('#checkoutClose').addEventListener('click',()=>requestStorefrontModalClose('checkout',closeCheckout))",
  "$('#accountClose')?.addEventListener('click',()=>requestStorefrontModalClose('account',closeAccount))",
  "$('#sdFullscreenClose').addEventListener('click',()=>requestStorefrontModalClose('gallery',closeFullscreenImage))"
]) assert.ok(html.includes(closeBinding), 'Modal close controls must use the history-aware close path.');
assert.match(html,
  /if\(e\.key==='Escape'\)\{e\.preventDefault\(\);e\.stopPropagation\(\);requestStorefrontModalClose\('gallery',closeFullscreenImage\)\}/,
  'Escape must close fullscreen gallery through the history-aware path.');

console.log('PASS: mobile navigation and browser Back/Forward dismiss account, cart, checkout and gallery states.');
