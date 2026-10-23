import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Gallery transitions must not fade the currently rendered photo before the next
// source has loaded and decoded; this guards the blank/white flash reported on mobile.
const detailStart = html.indexOf('function changeDetailImage(');
const detailEnd = html.indexOf('function openDetail(', detailStart);
assert.ok(detailStart >= 0 && detailEnd > detailStart, 'Detail gallery transition handler must exist.');
const detailTransition = html.slice(detailStart, detailEnd);
assert.match(detailTransition, /const preload=new Image\(\);preload\.decoding='async'/);
assert.match(detailTransition, /preload\.decode\(\)/);
assert.match(detailTransition, /const beginTransition=\(\)=>\{[\s\S]*?img\.classList\.add\(direction==='right'\?'sd-slide-out-right':'sd-slide-out-left'\)/);
assert.match(detailTransition, /preload\.onload=\(\)=>\{[\s\S]*?Promise\.resolve\(decoded\)\.catch\(\(\)=>\{\}\)\.then\(beginTransition\)/);
assert.match(detailTransition, /preload\.onerror=beginTransition/);
assert.ok(detailTransition.indexOf('const beginTransition=()=>') < detailTransition.indexOf('preload.onload='),
  'The outgoing animation callback must be defined before it is wired to the load/decode completion callbacks.');
assert.match(detailTransition, /if\(transitionId!==detailTransitionId\)return/);

assert.equal((html.match(/id="sdFullscreenImage"/g) || []).length, 1);
assert.equal((html.match(/id="sdFullscreenImageNext"/g) || []).length, 1);
assert.match(html, /function setFullscreenPhoto\(/);
assert.match(html, /incoming\.onload=finishLoad;incoming\.onerror=failLoad;incoming\.src=next/);
assert.match(html, /@keyframes sdFullscreenOutLeft\{[\s\S]*?to\{opacity:\.22/);
assert.match(html, /@keyframes sdFullscreenInRight\{from\{opacity:\.18/);

assert.equal((html.match(/id="mobileCartCount"/g) || []).length, 1);
assert.match(html, /id="mobileCartCount"[^>]*aria-hidden="true" hidden/);
assert.match(html, /function updateCartCount\(\)[^\n]*mobileCount\.hidden=n<1/);
assert.match(html, /function updateCartCount\(\)[^\n]*mobileButton\.setAttribute\('aria-label'/);
assert.match(html, /#mobileCartCount\[hidden\]\{display:none!important\}/);
assert.doesNotMatch(html, /body\.welcome-active #mobileBottomNav\{display:none!important/);
assert.doesNotMatch(html, /body:has\(#welcomeSplash\) #mobileBottomNav\{display:none!important/);
assert.match(html, /\.welcome-splash\.is-leaving\{opacity:0;visibility:hidden/);


// Both cart controls must react together to every successful add, using a gentle 1-second icon shake.
assert.match(html, /function confirmCartTargets\(\)[\s\S]*?\$\('#cartOpen'\),\$\('#mobileCartNav'\)[\s\S]*?targets\.forEach\(target=>\{void target\.offsetWidth;target\.classList\.add\('sd-cart-bump'\)\}\)/);
assert.match(html, /#cartOpen\.sd-cart-bump svg,#mobileCartNav\.sd-cart-bump svg\{animation:sdCartIconShake 1s/);
assert.match(html, /function addToCartFromControl\(id,button\)[\s\S]*?confirmCartTargets\(\)[\s\S]*?flyProductImageToCart\(sourceImage,id\)/);
assert.doesNotMatch(html, /confirmHeaderCartAdd/);

// Cart and account are true toggles on both the desktop cart and mobile controls.
assert.match(html, /function toggleStorefrontModal\(type\)[\s\S]*?activeStorefrontModal\(\)===type[\s\S]*?requestStorefrontModalClose\(type/);
assert.match(html, /\$\('#cartOpen'\)\.addEventListener\('click',\(\)=>toggleStorefrontModal\('cart'\)\)/);
assert.match(html, /tab\.dataset\.mobileTab==='cart'\)\{tab\.addEventListener\('click',\(\)=>\{activate\('cart'\);toggleStorefrontModal\('cart'\)\}\)\}/);
assert.match(html, /tab\.dataset\.mobileTab==='account'\)\{tab\.addEventListener\('click',\(\)=>\{activate\('account'\);toggleStorefrontModal\('account'\)\}\)\}/);

// Modal switches replace old cart/account entries; only cart -> checkout intentionally pushes a nested entry.
// Popstate skips stale cart/account entries instead of reopening them after the user presses Back.
assert.match(html, /currentType==='cart'&&type==='checkout'[\s\S]*?history\.pushState/);
assert.match(html, /history\.replaceState\(\{\.\.\.current,\[SD_MODAL_HISTORY_KEY\]:type\},'',location\.href\)/);
assert.match(html, /const intentionalCheckoutBack=currentModal==='checkout'&&targetModal==='cart'[\s\S]*?targetModal==='cart'\|\|targetModal==='account'[\s\S]*?history\.back\(\);return/);

console.log('PASS: gallery changes preload/decode before outgoing animation; fullscreen retains layered images; synchronized 1-second cart animation, modal toggles/history, mobile cart badge synchronizes and welcome fade reveals the bar.');
