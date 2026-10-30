import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/mobile-ordering-motion.css', import.meta.url), 'utf8');
const gesture = readFileSync(new URL('../public/mobile-ordering-motion.js', import.meta.url), 'utf8');

assert.match(html, /mobile-ordering-motion\.css\?v=20261031-combined/, 'Mobile ordering CSS must be loaded');
assert.match(html, /mobile-ordering-motion\.js\?v=20261031-combined/, 'Checkout gesture must be loaded');
assert.match(html, /const previousStep=sdCheckoutStep;/, 'Step direction must retain existing state');
assert.match(html, /sdCheckoutDirection=sdCheckoutStep>previousStep/, 'Forward/back transitions must use canonical checkout state');
assert.match(css, /#checkoutDrawer\.checkout-drawer\.open/, 'Only checkout should become the mobile bottom sheet');
assert.match(css, /@media\s*\(max-width:760px\)/, 'Sheet changes must be mobile-only');
assert.match(css, /prefers-reduced-motion:reduce/, 'Motion-reduction preference must be respected');
assert.match(css, /#productOverlay \.sd-product-option-chip\.is-selected/, 'Size chips should retain original controls');
assert.match(gesture, /event\.target\.closest\('button, a, input, select, textarea'\)/, 'Drag must not steal button clicks');
assert.match(gesture, /close\.click\(\)/, 'Dismiss gesture must delegate to existing close handler');
assert.match(html, /fetch\('\/api\/checkout-quote'/, 'Server quote must remain authoritative');
assert.match(html, /sdCheckoutPaymentPayload\(\)/, 'Server payment payload remains untouched');
assert.match(html, /id="sdCheckoutQrWrap"/, 'Original QR actions remain present');
assert.match(html, /id="sdCheckoutSaveQr"/, 'Save QR must remain available');
assert.match(html, /id="sdCheckoutOpenBank"/, 'Existing bank-app sharing must remain');
assert.doesNotMatch(css, /(?:^|[;{])\s*(?:background|color)\s*:\s*#[a-f0-9]{3,8}/im,
  'Motion CSS must not introduce a new color palette');
assert.match(html, /@media\(min-width:761px\)\{[\s\S]*?#checkoutDrawer\.checkout-drawer/, 'Desktop checkout must keep right-side drawer');
assert.doesNotMatch(html, /#checkoutDrawer\.checkout-drawer\{transform:translate3d\(105%,0,0\)\}/, 'Do not override the mobile bottom-sheet transform globally');
assert.match(css, /#checkoutDrawer\.checkout-drawer\.open\s*\{\s*transform:translate3d\(0,var\(--sd-checkout-pull,0px\),0\)/, 'Mobile checkout should open vertically');
console.log('PASS: integrated mobile bottom sheet, desktop drawer, size interaction and original payment contracts.');
