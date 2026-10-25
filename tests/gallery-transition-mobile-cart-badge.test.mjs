import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

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
assert.match(html, /<style id="sd-fullscreen-crossfade-preload-trial-2026-10-24">[\s\S]*transition:opacity 250ms ease-in-out!important/,
  'Fullscreen photos must use the isolated opacity-crossfade trial.');
assert.match(html, /function commitFullscreenFade\(\)/,
  'A new tap must commit an in-progress fade before reusing the previous image layer.');
assert.match(html, /function preloadFullscreenPhotos\(index=detailIndex,all=false\)/);
assert.match(html, /const indices=all\?detailImages\.map\(\(_,photoIndex\)=>photoIndex\)/);
assert.match(html, /preloadFullscreenPhotos\(detailIndex,true\)/,
  'Opening a product album must start preloading every image in that album.');
assert.match(html, /image\.fetchPriority=photoIndex===index\?'high':'low'/);
assert.doesNotMatch(html, /@media\(max-width:760px\)\{\.sd-fullscreen-image\{animation:none!important;transition:none!important;transform:none!important/);

const fullscreenMobileSwap = html.slice(html.indexOf('function setFullscreenPhoto('), html.indexOf('function renderFullscreenThumbs(', html.indexOf('function setFullscreenPhoto(')));
assert.match(fullscreenMobileSwap, /if\(instant\|\|!active\.complete\|\|!active\.naturalWidth\)\{[\s\S]*?setFullscreenLayerState\(incoming,true\);setFullscreenLayerState\(active,false\)/,
  'Initial display or a missing outgoing image must swap only after the incoming image is decoded.');
assert.match(fullscreenMobileSwap, /incoming\.classList\.add\('sd-fade-in'\);\s*void incoming\.offsetWidth;\s*incoming\.classList\.add\('is-active'\)/);
assert.match(fullscreenMobileSwap, /fullscreenFadePendingLayer=fullscreenActiveLayer/);
assert.match(fullscreenMobileSwap, /setTimeout\([\s\S]*?setFullscreenLayerState\(active,false\)/,
  'The outgoing photo must remain opaque below the incoming fade until cleanup.');
assert.match(fullscreenMobileSwap, /commitFullscreenFade\(\);[\s\S]*?fullscreenFadePendingLayer=-1/);

assert.match(html, /incoming\.onload=finishLoad;incoming\.onerror=failLoad;incoming\.src=next/);
assert.match(html, /let decoded;[\s\S]*?try\{decoded=typeof incoming\.decode==='function'\?incoming\.decode\(\):Promise\.resolve\(\)\}[\s\S]*?catch\{decoded=Promise\.reject\(\)\}/, 'Decode failures must be handled without revealing an unconfirmed image.');
assert.match(html, /Promise\.resolve\(decoded\)\.then\(revealDecodedImage,rejectDecodedImage\)/);
// A failed decode must restore the previous layer through the shared layer-state helper.
assert.match(html, /const rejectDecodedImage=\(\)=>\{[\s\S]*?setFullscreenLayerState\(incoming,false\);setFullscreenLayerState\(active,true\)/);
assert.match(html, /#sdFullscreenViewer \.sd-fullscreen-image\{[\s\S]*?transition:opacity 250ms ease-in-out!important/,
  'Fullscreen photos must use opacity-only motion instead of transform/keyframe motion.');
assert.match(html, /#sdFullscreenViewer \.sd-fullscreen-image\.sd-no-transition\{transition:none!important/,
  'Rapid taps and initial activation must normalize layers without replaying a second fade.');
assert.match(html, /@keyframes sdGalleryOutLeft\{[\s\S]*?to\{opacity:1;transform:translateX\(-22%\) scale\(\.985\);filter:blur\(0\)\}\}/);
assert.match(html, /@keyframes sdGalleryInRight\{from\{opacity:1;transform:translateX\(22%\) scale\(\.985\);filter:blur\(0\)\}/);
assert.match(html, /\.sd-fullscreen-frame\{[^}]*background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none/);
assert.match(html, /\.sd-fullscreen-image\{[^}]*backface-visibility:hidden;-webkit-backface-visibility:hidden;will-change:opacity,transform;transform:translate3d\(0,0,0\)/,
  'Fullscreen image layers must stay compositor-ready to avoid mobile opacity-swap flashes.');

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
assert.match(html,/function addToCartFromControl\\(id,button\\)[\\s\\S]*?button\\?\\.closest\\('\\.product-card'\\)[\\s\\S]*?flyProductCardToCart\\(source,id\\)/,
 'Flight starts at whole clicked product tile, not the photo or plus button.');
assert.match(html,/function activeCartFlightTarget\\(\\)[\\s\\S]*?window\\.innerWidth<=760[\\s\\S]*?return targets\\.find\\(visible\\)/,
 'Flight must target mobile bottom cart or visible desktop header cart.');
assert.match(html,/snapshot=sourceElement\\.cloneNode\\(true\\)/,'Cloned tile preserves real image, text and layout.');
assert.match(html,/clone\\.dataset\\.durationMs='1100'/,'Flight is clear and slower than old 720ms.');
assert.match(html,/const scale=1-\\.84\\*eased/,'Entire tile shrinks into destination.');
assert.match(html,/clone\\.style\\.transform='translate3d\\('/,'GPU-efficient single flight animation.');
assert.match(html,/if\\(activeCartFlight\\)\\{activeCartFlight\\.cancel\\(\\);activeCartFlight=null\\}/,
 'Repeated taps cancel old in-flight clones.');
assert.match(html,/if\\(confirm\\)confirmCartTargets\\(\\)/,'Arrival triggers cart visual acknowledgement.');
assert.match(html,/if\\(cartMotionReduced\\(\\)\\|\\|!sourceElement\\|\\|!sourceElement\\.isConnected\\)return false/,
 'Reduced motion bypasses fly animation.');
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


// Execute the actual fullscreen transition function with deterministic load/decode timing.
const fullscreenRuntimeStart = html.indexOf('const FULLSCREEN_FADE_MS=250;');
const fullscreenRuntimeEnd = html.indexOf('function renderFullscreenThumbs(', fullscreenRuntimeStart);
assert.ok(fullscreenRuntimeStart >= 0 && fullscreenRuntimeEnd > fullscreenRuntimeStart,
  'The fullscreen runtime fixture must isolate the current transition implementation.');
const fullscreenRuntimeSource = html.slice(fullscreenRuntimeStart, fullscreenRuntimeEnd);

function deferredDecode() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function mockClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); }
  };
}
function createFullscreenHarness() {
  const decodeQueue = [];
  const timers = new Map();
  let nextTimerId = 1;
  function makeImage(id, initialSrc, active) {
    let source = initialSrc;
    const attributes = new Map();
    if (initialSrc) attributes.set('src', initialSrc);
    return {
      id, complete: Boolean(initialSrc), naturalWidth: initialSrc ? 320 : 0,
      naturalHeight: initialSrc ? 240 : 0, alt: '', onload: null, onerror: null, get offsetWidth() { return 320; },
      classList: mockClassList(active ? ['is-active'] : []),
      get src() { return source; },
      set src(value) {
        if (value !== source) {
          source = value;
          if (value) attributes.set('src', value); else attributes.delete('src');
          this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0;
        }
      },
      getAttribute(name) { return name === 'src' ? (source || null) : (attributes.get(name) ?? null); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      removeAttribute(name) { attributes.delete(name); },
      decode() {
        const pending = deferredDecode();
        decodeQueue.push(pending);
        return pending.promise;
      }
    };
  }
  const images = [makeImage('sdFullscreenImage', 'old.jpg', true), makeImage('sdFullscreenImageNext', '', false)];
  const frame = { style: {} };
  const context = {
    images, frame, decodeQueue, timers,
    window: { matchMedia: () => ({ matches: true }), __sdUpdateDetailWatermark() {} },
    currentProduct: { title: 'Regression product' },
    detailImages: ['old.jpg', 'new.jpg', 'newer.jpg'],
    imgPath: value => value,
    $: selector => selector === '#sdFullscreenFrame' ? frame
      : selector === '#sdFullscreenImage' ? images[0]
      : selector === '#sdFullscreenImageNext' ? images[1] : null,
    sizeFullscreenFrame() {}
  };
  context.nextTimerId = nextTimerId;
  const prelude = [
    "let fullscreenSwapTimer = null;",
    "let fullscreenAnimationTimer = null;",
    "function clearTimeout(timer) { context.timers.delete(timer); }",
    "function setTimeout(callback, delay) { const id = context.nextTimerId++; context.timers.set(id, { callback, delay }); return id; }",
    "let fullscreenTransitionId = 0;",
    "let fullscreenActiveLayer = 0;",
    "let fullscreenFadePendingLayer = -1;",
    "function $(selector) { return context.$(selector); }",
    "function fullscreenImages() { return images; }",
    "function activeFullscreenImage() { return images[fullscreenActiveLayer ? 1 : 0]; }",
    "function sizeFullscreenFrame(image) { return context.sizeFullscreenFrame(image); }",
    "function imgPath(value) { return context.imgPath(value); }",
    "const window = context.window;",
    "const currentProduct = context.currentProduct;",
    "const detailImages = context.detailImages;",
    "const frame = context.frame;",
    "const images = context.images;"
  ].join(String.fromCharCode(10));
  const sandbox = { context };
  runInNewContext(prelude + String.fromCharCode(10) + fullscreenRuntimeSource, sandbox);
  return {
    images, decodeQueue, timers,
    run: (source, instant = false) => sandbox.setFullscreenPhoto(source, 'left', instant),
    finishAnimation: () => {
      const item = [...timers.entries()].find(([, timer]) => timer.delay >= 270);
      assert.ok(item, 'The pending cleanup timer should remain until the incoming image is fully opaque.');
      timers.delete(item[0]);
      item[1].callback();
      context.fullscreenActiveLayer = 1;
    },
    loadIncoming: image => {
      const handler = image.onload;
      assert.equal(typeof handler, 'function', 'Incoming image should wait for its load event.');
      image.complete = true; image.naturalWidth = 320; image.naturalHeight = 240;
      handler();
    }
  };
}
async function flushGalleryMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
function assertExactlyOneActivePhoto(images, expected) {
  assert.equal(images.filter(image => image.classList.contains('is-active')).length, 1,
    'Exactly one fullscreen photo layer must be visible at each settled checkpoint.');
  assert.equal(expected.classList.contains('is-active'), true);
}
{
  const gallery = createFullscreenHarness();
  gallery.run('new.jpg'); gallery.loadIncoming(gallery.images[1]);
  assert.equal(gallery.decodeQueue.length, 1);
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  gallery.decodeQueue[0].resolve(); await flushGalleryMicrotasks();
  assert.equal(gallery.images[0].classList.contains('is-active'), true,
    'The outgoing layer must remain opaque under the incoming fade.');
  assert.equal(gallery.images[1].classList.contains('is-active'), true,
    'The decoded incoming layer must fade above the outgoing layer.');
  assert.equal(gallery.images[1].classList.contains('sd-fade-in'), true);
  assert.equal(gallery.timers.size, 1,
    'After decode, the opacity fade must remain pending before old-layer cleanup.');
  gallery.finishAnimation();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[1]);
  assert.equal(gallery.images[1].getAttribute('src'), 'new.jpg');
}
{
  const gallery = createFullscreenHarness();
  gallery.run('new.jpg'); gallery.loadIncoming(gallery.images[1]);
  gallery.decodeQueue[0].reject(new Error('simulated decode failure')); await flushGalleryMicrotasks();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  assert.equal(gallery.images[1].classList.contains('is-active'), false,
    'Decode rejection must not reveal an image that is not confirmed decoded.');
}
{
  const gallery = createFullscreenHarness();
  gallery.run('new.jpg'); gallery.loadIncoming(gallery.images[1]);
  gallery.run('newer.jpg'); gallery.loadIncoming(gallery.images[1]);
  assert.equal(gallery.decodeQueue.length, 2);
  gallery.decodeQueue[0].resolve(); await flushGalleryMicrotasks();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  gallery.decodeQueue[1].resolve(); await flushGalleryMicrotasks();
  assert.equal(gallery.images[0].classList.contains('is-active'), true,
    'The outgoing photo must remain active during the opacity fade.');
  assert.equal(gallery.images[1].classList.contains('is-active'), true,
    'The latest decoded incoming photo must be active during the opacity fade.');
  assert.equal(gallery.images[1].classList.contains('sd-fade-in'), true);
  gallery.finishAnimation();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[1]);
  assert.equal(gallery.images[1].getAttribute('src'), 'newer.jpg',
    'A stale decode must never replace the latest requested next/previous photo.');
}
{
  const gallery = createFullscreenHarness();
  gallery.run('new.jpg'); gallery.loadIncoming(gallery.images[1]);
  gallery.decodeQueue[0].resolve(); await flushGalleryMicrotasks();
  assert.equal(gallery.images.filter(image => image.classList.contains('is-active')).length, 2,
    'Both decoded layers may be active during crossfade while the old photo remains opaque below.');
  gallery.run('newer.jpg');
  assertExactlyOneActivePhoto(gallery.images, gallery.images[1]);
  assert.equal(gallery.images[1].getAttribute('src'), 'new.jpg',
    'An interrupted fade must commit the latest requested decoded image before reusing the other layer.');
  gallery.loadIncoming(gallery.images[0]);
  gallery.decodeQueue[1].resolve(); await flushGalleryMicrotasks();
  assert.equal(gallery.images[1].classList.contains('is-active'), true);
  assert.equal(gallery.images[0].classList.contains('is-active'), true);
  gallery.finishAnimation();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  assert.equal(gallery.images[0].getAttribute('src'), 'newer.jpg');
}
console.log('PASS: fullscreen fade retains an opaque outgoing photo, ignores failed/stale decodes, commits interrupted fades, and settles on exactly one active image.');
