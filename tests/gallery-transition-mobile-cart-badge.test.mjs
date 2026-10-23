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
assert.ok(detailTransition.indexOf('preload.onload=') < detailTransition.indexOf("img.classList.add(direction==='right'?'sd-slide-out-right':'sd-slide-out-left')"),
  'The outgoing animation must begin only after the next photo has loaded/decoded.');
assert.match(detailTransition, /if\(transitionId!==detailTransitionId\)return/);

assert.equal((html.match(/id="sdFullscreenImage"/g) || []).length, 1);
assert.equal((html.match(/id="sdFullscreenImageNext"/g) || []).length, 1);
assert.match(html, /function setFullscreenPhoto\(/);
assert.match(html, /incoming\.onload=finishLoad;incoming\.onerror=failLoad;incoming\.src=next/);
assert.match(html, /@keyframes sdFullscreenOutLeft\{[^}]*to\{opacity:\.22/);
assert.match(html, /@keyframes sdFullscreenInRight\{from\{opacity:\.18/);

assert.equal((html.match(/id="mobileCartCount"/g) || []).length, 1);
assert.match(html, /id="mobileCartCount"[^>]*aria-hidden="true" hidden/);
assert.match(html, /function updateCartCount\(\)[^\n]*mobileCount\.hidden=n<1/);
assert.match(html, /function updateCartCount\(\)[^\n]*mobileButton\.setAttribute\('aria-label'/);
assert.match(html, /#mobileCartCount\[hidden\]\{display:none!important\}/);
assert.doesNotMatch(html, /body\.welcome-active #mobileBottomNav\{display:none!important/);
assert.doesNotMatch(html, /body:has\(#welcomeSplash\) #mobileBottomNav\{display:none!important/);
assert.match(html, /\.welcome-splash\.is-leaving\{opacity:0;visibility:hidden/);

console.log('PASS: gallery changes preload/decode before outgoing animation; fullscreen retains layered images; mobile cart badge synchronizes and welcome fade reveals the bar.');
