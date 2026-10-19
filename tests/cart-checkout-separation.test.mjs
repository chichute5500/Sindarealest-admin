import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
assert.match(html, /function formatVnd\(/, 'Visible prices must use Vietnamese currency formatting.');
assert.match(html, /entries\.every\(\(\{p\}\)=>hasPublicPrice\(p\.price\)\)/, 'Subtotal must stay unconfirmed if any cart item has no known price.');
assert.match(html, /Chờ xác nhận giá/, 'Unknown prices must never be fabricated.');
assert.match(html, /Giá sẽ được xác nhận/, 'An item without a confirmed public price must be clearly identified.');
assert.match(html, /function openCheckout\(/, 'The checkout drawer must have a dedicated open action.');
assert.match(html, /function closeCheckout\(/, 'The checkout drawer must have a dedicated close action.');
assert.match(html, /\$\('#cartCheckout'\)\.addEventListener\('click',openCheckout\)/, 'The cart action must open checkout.');
assert.match(html, /\$\('#checkoutBack'\)\.addEventListener\('click',\(\)=>\{closeCheckout\(\);openCart\(\)\}\)/, 'Back action must return to the cart.');
assert.match(html, /\$\('#checkoutBackdrop'\)\.addEventListener\('click',closeCheckout\)/, 'Backdrop interaction must close checkout.');
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
assert.match(html, /function showToast\(msg,link=null\)\{const t=\$\('#toast'\);const panelOpen=\['#cartDrawer','#checkoutDrawer','#accountDrawer','#productOverlay'\]/, 'Toast display must be suppressed while a blocking panel is open.');
assert.match(html, /function openCart\(\)\{dismissToast\(\)/, 'Opening the cart must clear a previously displayed toast.');
assert.match(html, /function openCheckout\(\)\{\s*dismissToast\(\)/, 'Opening checkout must clear a previously displayed toast.');
assert.match(html, /\$\('#cartCheckout'\)\.addEventListener\('click',openCheckout\)/, 'Checkout must be reachable from the cart CTA.');

console.log('PASS: cart/checkout separation, unconfirmed prices, modal controls, address fields, order API wiring, and toast collision prevention.');
