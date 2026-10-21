import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fromRow } from '../functions/_lib.js';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const once = (id) => assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id + ' must exist exactly once.');

const cartStart = html.indexOf('<div class="cart-drawer" id="cartDrawer"');
const checkoutStart = html.indexOf('<aside class="checkout-drawer glass" id="checkoutDrawer"');
const toastStart = html.indexOf('<div class="toast" id="toast"', cartStart);
assert.ok(cartStart >= 0 && checkoutStart > cartStart && toastStart > checkoutStart, 'Cart and checkout drawers must have a stable markup order.');
const cart = html.slice(cartStart, checkoutStart);
const checkout = html.slice(checkoutStart, toastStart);

assert.ok(!cart.includes('id="checkoutForm"'), 'The product cart must not contain the checkout form.');
assert.ok(!cart.includes('name="fullName"') && !cart.includes('name="streetAddress"'), 'Buyer identity and address fields belong in the separate checkout step.');
assert.ok(checkout.includes('id="checkoutForm" class="checkout-form"'), 'The existing order form must be preserved inside the checkout drawer.');
assert.match(checkout, /role="dialog" aria-modal="true"/, 'Checkout drawer must expose modal dialog semantics.');
assert.match(checkout, /id="checkoutBack"/, 'Checkout needs a way back to the cart.');
assert.match(checkout, /id="checkoutClose"/, 'Checkout needs an explicit close control.');
assert.match(html, /id="checkoutBackdrop"/, 'Checkout must have its own backdrop.');
assert.match(html, /id="cartSubtotal"/, 'Cart must expose a subtotal summary.');
assert.match(html, /id="cartTitle"/, 'Cart must display a dynamic item count.');
assert.match(html, /id="cartCheckout"/, 'Cart must expose a dedicated continue-to-order action.');
assert.match(html, /function hasPublicPrice\(/, 'Price display must be guarded by a shared real-value validator.');
assert.match(html, /function hasConfirmedPublicPrice\(product\)\{return !!product&&product\.sourcePriceConfirmed===true&&hasPublicPrice\(product\.price\)\}/, 'Public price must require explicit price confirmation, not merely a numeric field.');
assert.match(html, /function customerPriceLabel\(product\)\{return hasConfirmedPublicPrice\(product\)\?formatVnd\(product\.price\):''\}/, 'Customer price labels must stay blank for hidden, missing or unconfirmed prices.');
assert.match(html, /function formatVnd\(/, 'Visible prices must use Vietnamese currency formatting.');
assert.match(html, /class="detail-price" id="detailPrice" hidden/, 'Product detail must contain a price field that starts hidden.');
assert.match(html, /\$\('#detailPrice'\)\.hidden=!detailPrice/, 'Product detail price visibility must follow the confirmed/public-price result.');
assert.match(html, /function productCard\([^\n]+product-price/, 'Catalog cards must render a price when customerPriceLabel returns a confirmed public price.');
assert.match(html, /function featuredProductCard\([^\n]+product-price/, 'Featured cards must render only confirmed public prices.');

const helpers = html.match(/function hasPublicPrice\(value\)\{[^\n]+\}\nfunction hasConfirmedPublicPrice\(product\)\{[^\n]+\}\nfunction customerPriceLabel\(product\)\{[^\n]+\}\nfunction formatVnd\(value\)\{[^\n]+\}/)?.[0];
assert.ok(helpers, 'the complete safe price-helper group must exist for behavior-level regression tests');
const priceSandbox = { Intl };
vm.runInNewContext(helpers + '\nthis.priceTools = { hasPublicPrice, hasConfirmedPublicPrice, customerPriceLabel, formatVnd };', priceSandbox);
const priceTools = priceSandbox.priceTools;
assert.ok(priceTools.customerPriceLabel({ price: 1234567, sourcePriceConfirmed: true }).includes('1.234.567'),
  'a confirmed, public numeric price should be formatted in Vietnamese currency');
assert.equal(priceTools.customerPriceLabel({ price: 1234567, sourcePriceConfirmed: false }), '',
  'a historical/source-derived price must stay hidden until a business user confirms it');
assert.equal(priceTools.customerPriceLabel({ price: null, sourcePriceConfirmed: true }), '',
  'a public visibility setting that masks price as null must hide it in the storefront');
assert.equal(priceTools.customerPriceLabel({ price: -1, sourcePriceConfirmed: true }), '',
  'negative prices must never render to customers');
assert.equal(priceTools.customerPriceLabel({ price: '   ', sourcePriceConfirmed: true }), '',
  'whitespace-only prices must not be treated as zero');
assert.equal(priceTools.customerPriceLabel({ price: 1.5, sourcePriceConfirmed: true }), '',
  'fractional amounts are invalid for whole-VND product prices');
assert.equal(priceTools.customerPriceLabel({ price: 0, sourcePriceConfirmed: true }), '0₫',
  'a confirmed zero is distinct from a missing price');

assert.match(html, /entries\.every\(\(\{p\}\)=>hasConfirmedPublicPrice\(p\)\)/, 'Subtotal must stay unconfirmed unless every item price is both public and explicitly confirmed.');
assert.match(html, /Chờ xác nhận giá/, 'Unknown prices must never be fabricated.');
assert.match(html, /Giá sẽ được xác nhận/, 'An item without a confirmed public price must be clearly identified.');
assert.match(html, /function openCheckout\(/, 'The checkout drawer must have a dedicated open action.');
assert.match(html, /function closeCheckout\(/, 'The checkout drawer must have a dedicated close action.');
assert.match(html, /id="cartDrawer"[^>]*aria-hidden="true" inert/, 'A closed cart drawer must be removed from keyboard interaction.');
assert.match(html, /id="checkoutDrawer"[^>]*aria-hidden="true" tabindex="-1" inert/, 'A closed checkout drawer must be hidden from keyboard interaction.');
assert.match(html, /panel\.removeAttribute\('inert'\);panel\.classList\.add\('open'\)/, 'Opening checkout must expose it to keyboard and assistive technology.');
assert.match(html, /panel\.setAttribute\('inert',''\)/, 'Closing checkout must remove the hidden drawer from keyboard navigation.');
assert.match(html, /function trapCheckoutTab\(event\)/, 'Checkout must trap keyboard Tab navigation within the modal.');
assert.match(html, /if\(event\.shiftKey&&\(document\.activeElement===first\|\|!panel\.contains\(document\.activeElement\)\)\)/, 'Shift+Tab from the first checkout control must wrap to the last control.');
assert.match(html, /else if\(!event\.shiftKey&&\(document\.activeElement===last\|\|!panel\.contains\(document\.activeElement\)\)\)/, 'Tab from the last checkout control must wrap to the first control.');
assert.match(html, /const target=checkoutReturnFocus;checkoutReturnFocus=null/, 'Checkout must remember and restore focus to the opening control.');
assert.ok(html.includes("$('#checkoutBack').addEventListener('click',()=>requestStorefrontModalClose('checkout',()=>{closeCheckout(false);openCart();setTimeout(()=>$('#cartCheckout')?.focus({preventScroll:true}),0)}))"), 'The back-to-cart action must close through browser history, with a safe fallback that restores the cart and focus.');
assert.match(html, /\$\('#cartCheckout'\)\.addEventListener\('click',openCheckout\)/, 'The cart action must open checkout.');
assert.match(html, /currentModal==='checkout'&&targetModal==='cart'\)setTimeout\(\(\)=>\$\('#cartCheckout'\)\?\.focus\(\{preventScroll:true\}\),0\)/, 'Back navigation from checkout to cart must restore focus to the continue-order action.');
assert.ok(html.includes("$('#checkoutBackdrop').addEventListener('click',()=>requestStorefrontModalClose('checkout',closeCheckout))"), 'Backdrop interaction must close checkout through its browser-history state.');
assert.match(html, /e\.key!=='Escape'/, 'Escape-key handling should be present for modal drawers.');
assert.match(html, /fetch\('\/api\/orders',\{method:'POST'/, 'The real existing order API submission must be preserved.');
assert.match(html, /id="checkoutProvince"/, 'Province selection must be preserved.');
assert.match(html, /id="checkoutWard"/, 'Ward selection must be preserved.');
assert.match(html, /id="checkoutStreet"/, 'Detailed delivery address must be preserved.');
assert.match(html, /data-qty="-1"/, 'Quantity decrement must remain available.');
assert.match(html, /data-qty="1"/, 'Quantity increment must remain available.');
assert.match(html, /data-remove=/, 'Removing an item must remain available.');
assert.match(html, /\.checkout-drawer \.checkout-form\{[^}]*overflow-y:auto[^}]*align-content:start;grid-auto-rows:max-content/, 'The checkout grid must scroll without stretching auto rows to the full drawer height.');
assert.match(html, /\.checkout-drawer #checkoutSubmit\{[^}]*max-height:52px;height:auto/, 'The order submit action must remain a compact pill instead of stretching vertically.');
assert.match(html, /env\(safe-area-inset-top\)/, 'Drawer layout must respect the device top safe area.');
assert.match(html, /env\(safe-area-inset-bottom\)/, 'Drawer layout must respect the device bottom safe area.');
assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\.checkout-backdrop,\.checkout-drawer\{transition:none!important\}\}/, 'Checkout drawer must honor reduced-motion preferences.');

assert.match(html, /\.cart-drawer\{width:min\(460px,100%\);background:var\(--glass\);/, 'The cart drawer must retain the page texture through a translucent glass surface.');
assert.match(html, /\.checkout-drawer\{position:fixed;z-index:186;[^}]*background:var\(--glass\);/, 'The checkout drawer must retain the page texture through a translucent glass surface.');
assert.match(html, /function dismissToast\(\)/, 'Drawers must be able to dismiss a toast before it overlaps their action area.');
assert.match(html, /function showToast\(msg,link=null\)\{const t=\$\('#toast'\);const panelOpen=\['#cartDrawer','#checkoutDrawer','#accountDrawer'\]/, 'Toast display must be suppressed while blocking cart, checkout, or account panels are open, but a successful add can announce itself above the product detail overlay.');
assert.doesNotMatch(html.match(/function showToast\(msg,link=null\)[^\n]*/)?.[0] || '', /#productOverlay/, 'The product detail overlay must not suppress a truthful add-to-cart success toast.');
assert.match(html, /function openCart\(\)\{dismissToast\(\)/, 'Opening the cart must clear a previously displayed toast.');
assert.match(html, /function openCheckout\(\)\{\s*dismissToast\(\)/, 'Opening checkout must clear a previously displayed toast.');
assert.match(html, /\$\('#cartCheckout'\)\.addEventListener\('click',openCheckout\)/, 'Checkout must be reachable from the cart CTA.');

const accountStart = html.indexOf('<aside class="account-drawer glass" id="accountDrawer"');
const accountEnd = html.indexOf('</aside>', accountStart);
assert.ok(accountStart >= 0 && accountEnd > accountStart, 'Account drawer must exist.');
const accountMarkup = html.slice(accountStart, accountEnd);
assert.match(accountMarkup, /role="dialog" aria-modal="true" aria-label="Tài khoản" aria-hidden="true" tabindex="-1" inert/, 'Account drawer must be an accessible hidden modal before opening.');
assert.match(html, /function openAccount\(\)\{dismissToast\(\);accountReturnFocus=document\.activeElement[\s\S]*?panel\.removeAttribute\('inert'\)[\s\S]*?panel\.setAttribute\('aria-hidden','false'\)/, 'Opening account must reveal it to assistive technology and remove inert.');
assert.match(html, /function closeAccount\(restoreFocus=true\)[\s\S]*?panel\.setAttribute\('aria-hidden','true'\);panel\.setAttribute\('inert',''\)/, 'Closing account must hide it and remove its descendants from keyboard navigation.');
assert.match(html, /function trapAccountTab\(event\)/, 'Account must trap keyboard navigation while modal.');
assert.match(html, /if\(\$\('#accountDrawer'\)\.classList\.contains\('open'\)\)\{trapAccountTab\(e\);return\}/, 'The global keyboard handler must enforce the account focus trap.');
assert.match(html, /const target=accountReturnFocus;accountReturnFocus=null/, 'Account must remember its invoker for focus restoration.');



// Regression contract for the public API serializer. These synthetic rows are
// in-memory only and never touch D1, fixture JSON, or order endpoints.
const priceRow = {
  id: 'in-memory-price-contract',
  slug: 'in-memory-price-contract',
  sku: 'INTERNAL-TEST',
  sku_verified: 0,
  title: 'In-memory price contract fixture',
  category: 'sneakers',
  category_label: 'Sneaker',
  description: '',
  price: 1234567,
  source_price_confirmed: 0,
  stock: 1,
  published: 1,
  images_json: '[]',
  sort_order: 0,
  updated_at: null,
};
assert.equal(fromRow(priceRow, { publicView: true, showPrices: false }).price, null,
  'the public API must null the amount when public price visibility is disabled');
assert.equal(fromRow(priceRow, { publicView: true, showPrices: true }).price, null,
  'the public API must not leak an unconfirmed amount even when visibility is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: true }).price, 1234567,
  'a confirmed whole-VND amount may be public when the toggle is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: false }).price, null,
  'the public toggle must hide even an otherwise confirmed amount');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: -1 }, { publicView: true, showPrices: true }).price, null,
  'negative DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 1.5 }, { publicView: true, showPrices: true }).price, null,
  'fractional DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: '' }, { publicView: true, showPrices: true }).price, null,
  'empty DB amounts must not be coerced to zero');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 0 }, { publicView: true, showPrices: true }).price, 0,
  'explicitly confirmed zero is preserved as a valid value');
assert.equal(fromRow(priceRow, { publicView: false, showPrices: false }).price, 1234567,
  'admin/internal serialization retains stored price data irrespective of public toggle');

console.log('PASS: separate cart/checkout, public price API gating, safe price formatting, address mock, toast handling and accessible cart/checkout/account behavior.');


const populatedCartRules = html.match(/\.cart-drawer:has\(\.cart-row\)\{([^}]+)\}/)?.[1];
assert.ok(populatedCartRules, 'A populated mobile cart needs its own responsive layout rule.');
assert.match(populatedCartRules, /height:auto!important/,
  'A short populated mobile cart should fit its content instead of reserving a mostly empty viewport-sized panel.');
assert.match(populatedCartRules, /max-height:calc\(100dvh - 96px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)!important/,
  'A populated mobile cart must remain bounded by viewport and safe-area limits when it contains many items.');
assert.match(populatedCartRules, /bottom:auto!important/,
  'The content-sized populated cart must anchor from its top edge without stretching to the viewport bottom.');
const populatedCartListRules = html.match(/\.cart-drawer:has\(\.cart-row\) \.cart-list\{([^}]+)\}/)?.[1];
assert.ok(populatedCartListRules, 'A populated mobile cart needs an independently scrollable item list.');
assert.match(populatedCartListRules, /flex:1 1 auto!important/,
  'The cart item list must expand so the summary sits toward the bottom of the full sheet.');
assert.doesNotMatch(populatedCartListRules, /max-height:40dvh/,
  'The populated cart item list must not be capped to a small fraction of the screen.');
assert.match(html, /\.cart-drawer:has\(\.cart-row\) \.cart-bottom\{margin-top:auto\}/,
  'The cart subtotal and actions must be anchored below the expandable item list.');
