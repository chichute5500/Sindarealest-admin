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
assert.match(html, /const mobile=window\.matchMedia\('\(max-width:760px\)'\)\.matches/);
assert.match(html, /const FULLSCREEN_MOBILE_FADE_MS=460/);
assert.match(html, /sd-mobile-fade-out/);
assert.match(html, /sd-mobile-fade-in/);
assert.match(html, /mobileFade\?FULLSCREEN_MOBILE_FADE_MS:FULLSCREEN_SLIDE_MS\+20/);
assert.match(html, /@keyframes sdFullscreenMobileFadeOut\{from\{opacity:1\}to\{opacity:0\}\}/);
assert.match(html, /@keyframes sdFullscreenMobileFadeIn\{from\{opacity:0\}to\{opacity:1\}\}/);

const fullscreenMobileSwap = html.slice(html.indexOf('function setFullscreenPhoto('), html.indexOf('function renderFullscreenThumbs(', html.indexOf('function setFullscreenPhoto(')));
assert.match(fullscreenMobileSwap, /if\(instant\|\|!active\.complete\|\|!active\.naturalWidth\)\{[\s\S]*?incoming\.classList\.add\('is-active'\);active\.classList\.remove\('is-active'\)/,
  'Mobile swaps must activate the already-decoded incoming layer before deactivating the current layer, preventing an intermediate frame with no active photo.');

assert.match(html, /incoming\.onload=finishLoad;incoming\.onerror=failLoad;incoming\.src=next/);
assert.match(html, /let decoded;[\s\S]*?try\{decoded=typeof incoming\.decode==='function'\?incoming\.decode\(\):Promise\.resolve\(\)\}[\s\S]*?catch\{decoded=Promise\.reject\(\)\}/, 'Decode failures must be handled without revealing an unconfirmed image.');
assert.match(html, /Promise\.resolve\(decoded\)\.then\(revealDecodedImage,rejectDecodedImage\)/);
assert.match(html, /const rejectDecodedImage=\(\)=>\{[\s\S]*?incoming\.classList\.remove\('is-active'\)[\s\S]*?active\.classList\.add\('is-active'\)/);
assert.match(html, /@keyframes sdFullscreenOutLeft\{[\s\S]*?to\{opacity:1;transform:translateX\(-18%\)/);
assert.match(html, /@keyframes sdFullscreenInRight\{from\{opacity:1;transform:translateX\(18%\)/);
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


// Execute the actual fullscreen transition function with deterministic load/decode timing.
const fullscreenRuntimeStart = html.indexOf('const FULLSCREEN_SLIDE_MS=300;');
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
      naturalHeight: initialSrc ? 240 : 0, alt: '', onload: null, onerror: null,
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
      const item = [...timers.entries()].find(([, timer]) => timer.delay >= 300);
      assert.ok(item, 'A timed image transition should remain pending until the fade completes.');
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
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  assert.equal(gallery.images[0].classList.contains('sd-mobile-fade-out'), true);
  assert.equal(gallery.images[1].classList.contains('sd-mobile-fade-in'), true);
  assert.equal([...gallery.timers.values()].some(timer => timer.delay === 460), true,
    'Mobile photo changes must use the slower 460ms fade after decode, not an immediate layer swap.');
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
  assertExactlyOneActivePhoto(gallery.images, gallery.images[0]);
  gallery.finishAnimation();
  assertExactlyOneActivePhoto(gallery.images, gallery.images[1]);
  assert.equal(gallery.images[1].getAttribute('src'), 'newer.jpg',
    'A stale decode must never replace the latest requested next/previous photo.');
}
console.log('PASS: fullscreen runtime preserves the current frame, rejects failed decodes, and ignores stale competing transitions.');
