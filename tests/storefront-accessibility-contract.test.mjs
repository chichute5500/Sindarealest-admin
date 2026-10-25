import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Accessibility and mobile-safety contracts for the real storefront markup/CSS.
// These assertions complement the Playwright preview; they do not claim an
// independent WCAG audit or replace testing on physical devices.

// Welcome is a modal dialog, so keyboard focus must stay inside it until it
// is dismissed, and focus must be handed back to a useful page control.
assert.ok(html.includes('id="welcomeSplash" role="dialog" aria-modal="true" aria-label="Chào mừng đến với SinDarealest" tabindex="-1"'),
  'the welcome dialog must have modal semantics and a programmatic focus fallback');
const welcomeScriptStart = html.indexOf("<script>\n(function(){\n  var s=document.getElementById('welcomeSplash');");
const welcomeScriptEnd = html.indexOf('</script>', welcomeScriptStart);
assert.ok(welcomeScriptStart >= 0 && welcomeScriptEnd > welcomeScriptStart,
  'the welcome dialog must have a dedicated focus-management script');
const welcomeScript = html.slice(welcomeScriptStart + '<script>'.length, welcomeScriptEnd);
const welcomeFocusCalls = [];
const welcomeTimers = [];
const welcomeListeners = { keydown: [], focusin: [] };
const welcome = {
  isConnected: true,
  parentNode: { removeChild(node) { node.isConnected = false; node.parentNode = null; } },
  attributes: {},
  classList: { added: [], add(name) { this.added.push(name); } },
  contains(node) { return node === this || node === skipIntro || !!node?.insideWelcome; },
  querySelectorAll() { return [skipIntro]; },
  setAttribute(name, value) { this.attributes[name] = value; },
  focus(options) { welcomeFocusCalls.push({ target: 'dialog', options }); doc.activeElement = this; }
};
const skipIntro = {
  disabled: false,
  closest() { return null; },
  getClientRects() { return [1]; },
  focus(options) { welcomeFocusCalls.push({ target: 'skip', options }); doc.activeElement = this; },
  addEventListener(type, handler) { this.clickHandler = type === 'click' ? handler : this.clickHandler; }
};
const welcomeBrand = {
  focus(options) { welcomeFocusCalls.push({ target: 'brand', options }); doc.activeElement = this; }
};
const doc = {
  activeElement: null,
  body: { classList: { removed: [], remove(name) { this.removed.push(name); } } },
  getElementById(id) { return id === 'welcomeSplash' ? welcome : id === 'skipIntro' ? skipIntro : null; },
  querySelector(selector) { return selector === '.brand' ? welcomeBrand : null; },
  addEventListener(type, handler, capture) { if (welcomeListeners[type]) welcomeListeners[type].push({ handler, capture }); },
  removeEventListener(type, handler, capture) {
    if (welcomeListeners[type]) welcomeListeners[type] = welcomeListeners[type].filter(item => item.handler !== handler || item.capture !== capture);
  }
};
const welcomeWindow = { setTimeout(fn, delay) { welcomeTimers.push({ fn, delay }); return welcomeTimers.length; }, matchMedia() { return { matches: false }; } };
vm.runInNewContext(welcomeScript, {
  document: doc,
  window: welcomeWindow,
  fetch: () => Promise.resolve({ ok: false }),
  getComputedStyle: () => ({ visibility: 'visible' }),
  Array
}, { timeout: 1000 });
assert.equal(doc.activeElement, skipIntro, 'opening the welcome dialog must initially focus its primary action');
assert.equal(welcomeListeners.keydown.length, 1, 'the modal must register a capturing keyboard handler');
assert.equal(welcomeListeners.focusin.length, 1, 'the modal must guard against programmatic focus escaping behind it');
let tabPrevented = false, tabStopped = false;
welcomeListeners.keydown[0].handler({
  key: 'Tab', shiftKey: false,
  preventDefault() { tabPrevented = true; },
  stopImmediatePropagation() { tabStopped = true; }
});
assert.equal(tabPrevented, true, 'Tab on the last focusable item must wrap within the modal');
assert.equal(tabStopped, true, 'the wrapped Tab event must not reach unrelated page handlers');
assert.equal(doc.activeElement, skipIntro, 'Tab wrapping must return focus to the first/last welcome control');
const outsideControl = { insideWelcome: false };
doc.activeElement = outsideControl;
welcomeListeners.focusin[0].handler({ target: outsideControl });
assert.equal(doc.activeElement, skipIntro, 'programmatic focus must not escape to the page behind the modal');
let escapePrevented = false, escapeStopped = false;
welcomeListeners.keydown[0].handler({
  key: 'Escape',
  preventDefault() { escapePrevented = true; },
  stopImmediatePropagation() { escapeStopped = true; }
});
assert.equal(escapePrevented, true, 'Escape must be consumed by the welcome dialog');
assert.equal(escapeStopped, true, 'Escape dismissal must not leak to unrelated overlay handlers');
assert.ok(welcome.classList.added.includes('is-leaving'), 'Escape must dismiss the welcome dialog');
assert.equal(welcome.attributes['aria-hidden'], 'true', 'a dismissing dialog must immediately leave the accessibility tree');
assert.equal(welcome.attributes.inert, '', 'a dismissing dialog must become inert during its exit transition');
assert.equal(doc.activeElement, welcomeBrand, 'dismissal must move focus to the storefront brand/navigation');
assert.equal(welcomeListeners.keydown.length, 0, 'the keyboard trap must be removed after dismissal starts');
assert.equal(welcomeListeners.focusin.length, 0, 'the focus guard must be removed after dismissal starts');
const removalTimer = welcomeTimers.find(timer => timer.delay === 360);
assert.ok(removalTimer, 'welcome removal must follow the reduced-cost 360ms exit transition');
removalTimer.fn();
assert.equal(welcome.isConnected, false, 'the dialog must be removed after its exit transition');
assert.deepEqual(doc.body.classList.removed, ['welcome-active'], 'the welcome active state must be cleaned up');

assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i,
  'the storefront must respect users who request reduced motion');
assert.match(html, /function setupArtSlideshow\(\)[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?startAutoAdvance\(\)/i,
  'the editorial carousel must preserve reduced-motion handling and manage autoplay through one explicit timer helper');
assert.ok(html.includes('id="artPause" aria-label="Tạm dừng tự động chuyển ảnh" aria-pressed="false"'),
  'the collections slideshow must expose an accessible pause/resume control');
assert.ok(html.includes("$('#artPause').addEventListener('click',()=>setPaused(!paused))"),
  'the pause/resume control must own the autoplay state transition');
assert.match(html, /button:focus-visible,a:focus-visible,input:focus-visible/,
  'keyboard users must receive a visible focus indicator');
assert.match(html, /env\(safe-area-inset-top\)/,
  'top overlays/navigation must account for device safe areas');
assert.match(html, /env\(safe-area-inset-bottom\)/,
  'bottom navigation and drawers must account for device safe areas');
assert.match(html, /role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/,
  'modal/drawer UI must expose dialog semantics');
assert.match(html, /aria-live="polite"/,
  'dynamic cart/account/status content must expose polite live regions');
assert.match(html, /<div class="catalog-grid" id="catalogGrid"><\/div>/,
  'catalog result cards must not be the only live region announcing every card to assistive technology');
assert.match(html, /<div class="page-summary" id="pageSummary" role="status" aria-live="polite" aria-atomic="true"><\/div>/,
  'catalog search and category updates must announce a concise result summary to screen readers');
assert.match(html, /min-height:\s*44px/,
  'interactive mobile controls must provide at least a 44px minimum target height');
assert.match(html, /addEventListener\(['"]keydown['"]/,
  'keyboard dismissal/navigation handling must be registered');
assert.match(html, /key\s*===?\s*['"]Escape['"]|keyCode\s*===\s*27/,
  'Escape key must be handled for dismissible overlays');
assert.ok(html.includes('id="menuToggle" aria-label="Mở menu" aria-controls="mobileNav" aria-expanded="false"'),
  'the mobile menu toggle must explicitly identify the controlled navigation');
assert.ok(html.includes("if(e.key==='Escape'&&$('#mobileNav').classList.contains('open')){setMobileMenu(false);$('#menuToggle').focus({preventScroll:true})}"),
  'Escape must close the mobile menu and return keyboard focus to its toggle');
assert.ok(html.includes("function trapMobileMenuTab(event){trapTabWithin($('#mobileNav'),event)}"),
  'Tab focus must be kept inside the open mobile navigation drawer');
assert.ok(html.includes("if($('#mobileNav').classList.contains('open')){trapMobileMenuTab(e);return}"),
  'The global key handler must route Tab through the mobile navigation drawer focus trap');
assert.ok(html.includes("function trapCartTab(event){trapTabWithin($('#cartDrawer'),event)}"),
  'Tab focus must be kept inside the active cart dialog');
assert.ok(html.includes("if($('#cartDrawer').classList.contains('open')){trapCartTab(e);return}"),
  'The global key handler must route Tab through the open cart dialog focus trap');

assert.match(html, /<div class="overlay" id="productOverlay" role="dialog" aria-modal="true" aria-labelledby="detailTitle" aria-hidden="true" tabindex="-1" inert><div class="detail-modal">/,
  'the product detail overlay must be the single modal dialog container');
assert.ok(html.includes("function trapProductTab(event){trapTabWithin($('#productOverlay'),event)}"),
  'the product detail dialog must keep keyboard focus inside its modal while tabbing');
assert.ok(html.includes("if($('#productOverlay').classList.contains('open')){trapProductTab(e);return}"),
  'Tab events must invoke the product detail dialog focus trap when the modal is open');
assert.ok(html.includes("document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#productOverlay').classList.contains('open')){closeDetail()}else if($('#productOverlay').classList.contains('open')&&e.key==='ArrowRight')"),
  'Escape must dismiss only an open product detail dialog, preserving focus management for unrelated dialogs and the mobile navigation');
assert.ok(!html.includes("if(e.key==='Escape'){closeDetail();closeCart();$('#mobileNav').classList.remove('open')}"),
  'The legacy global Escape handler must not close inactive dialogs or override the mobile menu focus return');
// Account-to-contact navigation must replace its modal history entry. Otherwise
// the fragment entry can inherit the stale account state and browser Back reopens
// the drawer; focus restoration to the drawer trigger can also override anchor scroll.
const contactStart = html.indexOf('function navigateAccountContact(event){');
const contactEnd = html.indexOf('\nfunction trapTabWithin', contactStart);
assert.ok(contactStart >= 0 && contactEnd > contactStart,
  'account contact navigation must have a dedicated history-safe transition');
const contactHelper = html.slice(contactStart, contactEnd);
const contactEffects = [];
const contactHistory = {
  state: { __sdStorefrontModal: 'account', retained: 'state' },
  replacement: null,
  replaceState(state, _title, url) { this.state = state; this.replacement = { state, url }; },
};
const contactHeading = {
  attrs: {},
  focused: null,
  setAttribute(name, value) { this.attrs[name] = value; },
  focus(options) { this.focused = options; },
};
const contactTarget = {
  scrolled: null,
  scrollIntoView(options) { this.scrolled = options; },
};
let contactDefaultPrevented = false;
const contactEvent = { preventDefault() { contactDefaultPrevented = true; } };
vm.runInNewContext(contactHelper + '\nnavigateAccountContact(contactEvent);', {
  SD_MODAL_HISTORY_KEY: '__sdStorefrontModal',
  contactEvent,
  history: contactHistory,
  closeAccount(restoreFocus) { contactEffects.push({ type: 'closeAccount', restoreFocus }); },
  setActiveNav(id) { contactEffects.push({ type: 'activeNav', id }); },
  $: selector => selector === '#contact' ? contactTarget : selector === '#footer-contact-title' ? contactHeading : null,
  matchMedia: () => ({ matches: false }),
});
assert.equal(contactDefaultPrevented, true, 'the handler must control navigation instead of creating a duplicate fragment entry');
assert.equal(contactHistory.replacement.url, '#contact', 'the account modal entry must be replaced with the contact anchor');
assert.equal(contactHistory.state.__sdStorefrontModal, null, 'the stale account marker must be removed before subsequent Back navigation');
assert.equal(contactHistory.state.retained, 'state', 'unrelated history state must be preserved');
assert.deepEqual(contactEffects[0], { type: 'closeAccount', restoreFocus: false },
  'account-to-contact navigation must not restore focus to the hidden account trigger');
assert.deepEqual(contactEffects[1], { type: 'activeNav', id: 'contact' },
  'the contact destination must be reflected in primary navigation state');
assert.equal(contactTarget.scrolled.behavior, 'smooth', 'the contact section must use smooth scrolling unless reduced motion is requested');
assert.equal(contactTarget.scrolled.block, 'start', 'the contact section must align at the start of the viewport');
assert.equal(contactHeading.attrs.tabindex, '-1', 'the destination heading must become programmatically focusable');
assert.equal(contactHeading.focused.preventScroll, true, 'focus must move to the destination heading without overriding its scroll position');
assert.ok(html.includes("$('#accountContactAction')?.addEventListener('click',navigateAccountContact)"),
  'the account contact link must use the history-safe navigation handler');


 // Opening the warranty claim form dynamically must move keyboard focus into
 // the newly revealed form; scrolling alone leaves focus on the old selector.
const warrantyHandlerStart = html.indexOf('function showWarrantyRecords(records){');
const warrantyHandlerEnd = html.indexOf('\nasync function optimizeWarrantyPhoto(file){', warrantyHandlerStart);
assert.ok(warrantyHandlerStart >= 0 && warrantyHandlerEnd > warrantyHandlerStart,
  'warranty records must have a dedicated claim-selection transition');
const warrantyHandler = html.slice(warrantyHandlerStart, warrantyHandlerEnd);
const claimSelect = {
  focused: null,
  focus(options) { this.focused = options; }
};
const claimStatus = { textContent: '' };
const claimCode = { value: '' };
const claimCodeLabel = { textContent: '' };
const claimResults = { hidden: true };
const claimForm = {
  hidden: true,
  scrolled: null,
  scrollIntoView(options) { this.scrolled = options; }
};
const claimSelectionButton = {
  dataset: { claimWarranty: 'test-token', claimLabel: 'SDW-***' },
  clickHandler: null,
  addEventListener(type, handler) { if (type === 'click') this.clickHandler = handler; }
};
const warrantyRecords = {
  innerHTML: '',
  querySelectorAll(selector) {
    assert.equal(selector, '[data-claim-warranty]');
    return [claimSelectionButton];
  }
};
const warrantyNodes = {
  '#warrantyRecords': warrantyRecords,
  '#warrantyResults': claimResults,
  '#warrantyClaimForm': claimForm,
  '#claimWarrantyCode': claimCode,
  '#claimWarrantyCodeLabel': claimCodeLabel,
  '#warrantyClaimMessage': claimStatus,
  '#claimIssueType': claimSelect
};
const warrantyDollar = selector => warrantyNodes[selector] || null;
vm.runInNewContext(warrantyHandler + "\nshowWarrantyRecords([{eligible:true,claimToken:'test-token',maskedWarrantyCode:'SDW-***',title:'Sample item'}]);", {
  $: warrantyDollar,
  escapeHtml: value => String(value ?? ''),
  imgPath: value => value
}, { timeout: 1000 });
assert.equal(typeof claimSelectionButton.clickHandler, 'function',
  'eligible warranty entries must expose the claim-selection action');
claimSelectionButton.clickHandler();
assert.equal(claimForm.hidden, false, 'selecting a warranty entry must reveal the claim form');
assert.equal(claimCode.value, 'test-token', 'the selected claim token must be carried into the form');
assert.equal(claimSelect.focused?.preventScroll, true,
  'focus must move into the first required claim field without overriding the scroll transition');
assert.equal(claimForm.scrolled?.block, 'nearest',
  'the revealed claim form must still scroll into view');
assert.match(claimStatus.textContent, /Đã chọn mã bảo hành/,
  'the claim selection status must be announced in the live region');

console.log('PASS: storefront accessibility contracts cover reduced motion, keyboard focus, safe areas, dialog semantics, live regions and mobile target sizing.');


// Legacy favorite keys may be SKUs from an older storefront version. Resolve
// them to the canonical product key and deduplicate before updating the UI.
const extractFavoriteFunction = (name) => {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'favorite helper must exist: ' + name);
  const end = html.indexOf('\nfunction ', start + 1);
  assert.ok(end > start, 'favorite helper boundary must exist: ' + name);
  return html.slice(start, end);
};
const favoriteHelpers = ['favoriteKey', 'findProductByKey', 'isFavorite', 'normalizeFavorites']
  .map(extractFavoriteFunction).join('\n');
const favoriteProducts = [{ id: 'product-1', slug: 'shoe-1', sku: 'SD-001' }];
const favoriteStorageWrites = [];
let favoriteControlRefreshes = 0;
let favoriteListRefreshes = 0;
const favoriteContext = {
  products: favoriteProducts,
  favorites: ['SD-001', 'product-1', 'sd-001', 'deleted-product'],
  FAVORITES_STORAGE_KEY: 'sd-favorites',
  localStorage: {
    setItem(key, value) { favoriteStorageWrites.push({ key, value }); }
  },
  updateFavoriteControls() { favoriteControlRefreshes += 1; },
  renderFavoriteList() { favoriteListRefreshes += 1; }
};
vm.runInNewContext(favoriteHelpers + '\nnormalizeFavorites();', favoriteContext, { timeout: 1000 });
assert.deepEqual(Array.from(favoriteContext.favorites), ['product-1'],
  'legacy SKU keys and canonical ID keys for the same product must become one canonical favorite');
assert.deepEqual(favoriteStorageWrites, [{ key: 'sd-favorites', value: '["product-1"]' }],
  'the migrated and deduplicated favorites must persist on the device');
assert.equal(vm.runInNewContext('isFavorite(favoriteKey(products[0]))', favoriteContext), true,
  'the saved-heart state must agree with the normalized product key');
assert.equal(favoriteControlRefreshes, 1, 'favorite counters must refresh once after normalization');
assert.equal(favoriteListRefreshes, 1, 'the favorites list must refresh once after normalization');


// The collections slideshow automatically changes imagery every three seconds.
// Verify that a visitor can stop/resume it, while reduced-motion keeps autoplay off.
const artPauseSetupStart = html.indexOf('function setupArtSlideshow(){');
const artPauseSetupEnd = html.indexOf('\nfunction ', artPauseSetupStart + 1);
assert.ok(artPauseSetupStart >= 0 && artPauseSetupEnd > artPauseSetupStart,
  'the collection slideshow setup must be independently testable');
const artPauseSetup = html.slice(artPauseSetupStart, artPauseSetupEnd);
function makeArtPauseHarness(reducedMotion = false) {
  const listeners = {};
  const makeElement = (initial = {}) => ({
    attributes: {}, listeners: {}, style: {}, disabled: false, title: '',
    innerHTML: '', textContent: '', ...initial,
    getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  });
  const elements = {
    '#artSlide': makeElement({ attributes: { src: 'images/current.webp' } }),
    '#artSlideCount': makeElement(),
    '#artPrev': makeElement(),
    '#artNext': makeElement(),
    '#artPause': makeElement()
  };
  const intervals = [], clearedIntervals = [];
  class FakeImage {
    set src(value) { this._src = value; }
    get src() { return this._src || ''; }
  }
  const context = {
    products: [{ category: 'sneakers' }, { category: 'sneakers' }],
    uniqueImages: () => ['images/a.webp', 'images/b.webp'],
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    document: { hidden: false },
    Image: FakeImage,
    artIndex: 0, artTimer: null,
    $(selector) { return elements[selector] || null; },
    setInterval(fn, ms) { const id = { fn, ms, sequence: intervals.length + 1 }; intervals.push(id); return id; },
    clearInterval(id) { clearedIntervals.push(id); },
    clearTimeout() {}, setTimeout() { return 1; }
  };
  vm.runInNewContext(artPauseSetup, context, { timeout: 1000 });
  context.setupArtSlideshow();
  return { context, elements, intervals, clearedIntervals };
}
const artAuto = makeArtPauseHarness(false);
const artPause = artAuto.elements['#artPause'];
assert.equal(artAuto.intervals.length, 1, 'normal motion must start one autoplay interval');
assert.equal(artAuto.intervals[0].ms, 3000, 'the existing three-second cadence must be preserved');
assert.equal(artPause.attributes['aria-pressed'], 'false', 'autoplay begins with the pause toggle unpressed');
assert.equal(artPause.attributes['aria-label'], 'Tạm dừng tự động chuyển ảnh');
artPause.listeners.click();
assert.equal(artAuto.clearedIntervals.length, 1, 'pausing must clear the active interval');
assert.equal(artAuto.context.artTimer, null, 'pausing must release the active timer handle');
assert.equal(artPause.attributes['aria-pressed'], 'true', 'paused state must be exposed to assistive technology');
assert.equal(artPause.attributes['aria-label'], 'Tiếp tục tự động chuyển ảnh', 'the accessible name must announce the available resume action');
artPause.listeners.click();
assert.equal(artAuto.intervals.length, 2, 'resuming must start a fresh interval rather than duplicate a live timer');
assert.equal(artAuto.context.artTimer, artAuto.intervals[1]);
assert.equal(artPause.attributes['aria-pressed'], 'false');
const reducedArt = makeArtPauseHarness(true);
assert.equal(typeof artAuto.elements['#artPrev'].listeners.click, 'function',
  'previous navigation must remain available with the pause control');
const missingPause = makeArtPauseHarness(false);
delete missingPause.elements['#artPause'];

const missingPauseContext = {
  products: [{ category: 'sneakers' }],
  uniqueImages: () => ['images/a.webp'],
  window: { matchMedia: () => ({ matches: false }) },
  document: { hidden: false }, Image: class { set src(value) { this._src = value; } },
  artIndex: 0, artTimer: null, $: selector => missingPause.elements[selector] || null,
  setInterval() { throw new Error('slideshow must not start when a required control is absent'); },
  clearInterval() {}, clearTimeout() {}, setTimeout() { return 1; }
};
assert.doesNotThrow(() => vm.runInNewContext(artPauseSetup + String.fromCharCode(10) + 'setupArtSlideshow();', missingPauseContext, { timeout: 1000 }),
  'slideshow setup must safely abort if any required control is missing');
assert.equal(missingPauseContext.artTimer, null, 'missing pause control must not leave an unreachable autoplay interval');

assert.equal(reducedArt.intervals.length, 0, 'reduced-motion must continue to disable autoplay');
assert.equal(reducedArt.elements['#artPause'].disabled, true, 'reduced-motion users must not be offered an autoplay-resume action');
assert.match(reducedArt.elements['#artPause'].attributes['aria-label'], /tắt theo cài đặt giảm chuyển động/);
assert.equal(typeof reducedArt.elements['#artNext'].listeners.click, 'function', 'manual next control must remain available with reduced motion enabled');
 
// The featured-product image carousel is separate from the Collections slideshow.
// It auto-advances every three seconds, so it must have its own persistent pause control.
assert.match(html, /id="featuredAutoplayToggle" aria-label="Tạm dừng tự động chuyển ảnh" aria-pressed="false"/,
  'the featured carousel must expose a visible, named pause control in its section header');
assert.ok(html.includes("$('#featuredAutoplayToggle')?.addEventListener('click',()=>setFeaturedAutoplayPaused(!featuredAutoplayPaused))"),
  'the featured pause control must be wired to the persistent autoplay state');
assert.ok(html.includes("if(!pauseButton||reduceMotion||featuredAutoplayPaused)return;"),
  'featured autoplay must not start without its pause control or when paused/reduced-motion is active');
const featuredAutoStart = html.indexOf('let featuredPausedUntil=0, featuredAutoplayPaused=false;');
const featuredAutoEnd = html.indexOf("let selectedCategory='all';", featuredAutoStart);
assert.ok(featuredAutoStart >= 0 && featuredAutoEnd > featuredAutoStart,
  'featured autoplay state and pause/resume helpers must be isolated for regression testing');
const featuredAutoCode = html.slice(featuredAutoStart, featuredAutoEnd);
function makeFeaturedAutoHarness(reducedMotion = false, withPauseButton = true) {
  const elements = {};
  const button = {
    attributes: {}, listeners: {}, disabled: false, title: '', innerHTML: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const section = { getBoundingClientRect: () => ({ top: 0, bottom: 100 }) };
  elements['#featured'] = section;
  if (withPauseButton) elements['#featuredAutoplayToggle'] = button;
  const intervals = [], cleared = [];
  const card = {};
  const context = {
    featuredTimer: null,
    window: { innerHeight: 800, matchMedia: () => ({ matches: reducedMotion }) },
    document: { hidden: false },
    $: selector => elements[selector] || null,
    '$$': selector => selector === '[data-featured-card]' ? [card] : [],
    changeFeaturedImage: () => { card.moves = (card.moves || 0) + 1; },
    setInterval(fn, ms) { const timer = { fn, ms }; intervals.push(timer); return timer; },
    clearInterval(timer) { cleared.push(timer); }
  };
  vm.runInNewContext(featuredAutoCode, context, { timeout: 1000 });
  context.setupFeaturedAutoplay();
  return { context, elements, button, intervals, cleared, card };
}
const featuredAuto = makeFeaturedAutoHarness();
assert.equal(featuredAuto.intervals.length, 1, 'featured autoplay must start one interval when motion is allowed');
assert.equal(featuredAuto.intervals[0].ms, 3000, 'featured carousel must retain its existing three-second cadence');
assert.equal(featuredAuto.button.attributes['aria-pressed'], 'false');
assert.equal(featuredAuto.button.attributes['aria-label'], 'Tạm dừng tự động chuyển ảnh');
featuredAuto.context.setFeaturedAutoplayPaused(true);
assert.equal(featuredAuto.cleared.length, 1, 'pausing featured autoplay must clear the active interval');
assert.equal(featuredAuto.context.featuredTimer, null);
assert.equal(featuredAuto.button.attributes['aria-pressed'], 'true');
assert.equal(featuredAuto.button.attributes['aria-label'], 'Tiếp tục tự động chuyển ảnh');
featuredAuto.context.setFeaturedAutoplayPaused(false);
assert.equal(featuredAuto.intervals.length, 2, 'resuming must create one fresh interval');
assert.equal(featuredAuto.context.featuredTimer, featuredAuto.intervals[1]);
featuredAuto.intervals[1].fn();
assert.equal(featuredAuto.card.moves, 1, 'the resumed carousel interval must continue advancing visible cards');
const reducedFeatured = makeFeaturedAutoHarness(true);
assert.equal(reducedFeatured.intervals.length, 0, 'reduced-motion must keep featured autoplay disabled');
assert.equal(reducedFeatured.button.disabled, true);
assert.match(reducedFeatured.button.attributes['aria-label'], /tắt theo cài đặt giảm chuyển động/);
const missingFeaturedPause = makeFeaturedAutoHarness(false, false);
assert.equal(missingFeaturedPause.intervals.length, 0, 'featured autoplay must fail closed when its pause control is missing');



// The cart consultation path must not claim a product list was copied when
// both clipboard mechanisms fail; the Zalo-blocked fallback must stay truthful.
const consultCartStart = html.indexOf('async function consultCart(){');
const consultCartEnd = html.indexOf(String.fromCharCode(10) + 'function setupArtSlideshow', consultCartStart);
assert.ok(consultCartStart >= 0 && consultCartEnd > consultCartStart,
  'cart consultation must have an isolated handler for behavioral regression tests');
const consultCartContract = html.slice(consultCartStart, consultCartEnd);
async function runCartConsultHarness(copySucceeded) {
  const toastMessages = [];
  let copiedMessage = null;
  let scheduled = null;
  const context = {
    cart: { 'product-1': 2, 'product-2': 1 },
    products: [{ id: 'product-1', slug: 'product-1', sku: 'SD-001', title: 'Giày thử' }, { id: 'product-2', slug: 'product-2', sku: 'SD-002', title: 'Giày thử 2' }],
    visibleSku: product => product.sku,
    async copyText(value) { copiedMessage = value; return copySucceeded; },
    showToast(message, url) { toastMessages.push({ message, url }); },
    ZALO: 'https://zalo.me/test',
    setTimeout(callback, delay) { scheduled = { callback, delay }; return 1; },
    window: { open() { return null; } }
  };
  await vm.runInNewContext(consultCartContract + String.fromCharCode(10) + 'consultCart();', context, { timeout: 1000 });
  return { toastMessages, copiedMessage, scheduled };
}
const cartConsultCopyFailed = await runCartConsultHarness(false);
assert.equal(cartConsultCopyFailed.copiedMessage, 'SD-001 × 2\nSD-002 × 1',
  'consultation must copy the visible SKU and quantity for the cart');
assert.match(cartConsultCopyFailed.toastMessages[0].message, /Không thể tự sao chép/,
  'a failed clipboard operation must never be presented as a successful copy');
assert.equal(cartConsultCopyFailed.toastMessages[0].url, 'https://zalo.me/test',
  'the user must still get the Zalo destination when manual sending is needed');
assert.equal(cartConsultCopyFailed.scheduled.delay, 1000,
  'Zalo opening remains delayed to preserve the existing handoff behavior');
cartConsultCopyFailed.scheduled.callback();
assert.match(cartConsultCopyFailed.toastMessages.at(-1).message, /Hãy dán hoặc gửi danh sách sản phẩm thủ công/,
  'if the Zalo popup is blocked after copy failure, the fallback must direct the user to send manually');
assert.doesNotMatch(cartConsultCopyFailed.toastMessages.map(item => item.message).join(' '), /đã sao chép|đã được sao chép/i,
  'the failed-copy path must not make any false copy-success claim');
const cartConsultCopySucceeded = await runCartConsultHarness(true);
assert.match(cartConsultCopySucceeded.toastMessages[0].message, /Đã sao chép danh sách sản phẩm/,
  'successful clipboard writes must retain positive confirmation');
cartConsultCopySucceeded.scheduled.callback();
assert.match(cartConsultCopySucceeded.toastMessages.at(-1).message, /Danh sách sản phẩm đã được sao chép/,
  'the blocked-Zalo fallback may confirm a copy only when copying actually succeeded');

console.log('PASS: collection slideshow autoplay can be paused/resumed and remains off under prefers-reduced-motion.');


// Shared icon rendering contract: keep line-art sizing and press color consistent
// across unlocked storefront icon contexts without touching locked catalog filters or #order.
assert.ok(html.includes('id="sd-unified-icon-system"'), 'the storefront must include the shared Liquid Glass icon system');
assert.ok(html.includes('--sd-icon-stroke:1.7'), 'the shared icon system must define a consistent SVG stroke baseline');
assert.ok(html.includes('--sd-icon-press-color:#5c91b9'), 'icon press feedback must use the approved Liquid Glass accent');
assert.ok(html.includes('@media(prefers-reduced-motion:reduce)'), 'icon transitions must respect reduced motion');
assert.ok(!html.includes('#products .catalog-tools svg{') && !html.includes('.catalog-tools svg{width:18px;height:18px'), 'the icon standardization must not override the owner-locked catalog filter controls');


// Shared icon Liquid Glass shell contract; owner-locked catalog filters and #order remain excluded.
assert.ok(html.includes('--sd-icon-glass-bg:rgba(194,222,242,.14)'), 'shared dark-theme glass surface token must exist');
assert.ok(html.includes('backdrop-filter:blur(18px) saturate(165%)'), 'icon-only controls must share translucent blur/saturation');
assert.ok(html.includes('inset 0 1px 0 var(--sd-icon-glass-highlight)'), 'shared icon shells must include a specular highlight');
assert.ok(html.includes('.slide-controls button:active') && html.includes('.detail-gallery-arrow:active'), 'icon controls must share a pressed glass state');
assert.ok(html.includes('focus-visible') && html.includes('prefers-reduced-motion:reduce'), 'shared icon controls must retain keyboard focus and reduced-motion support');
assert.ok(!html.includes('#products .catalog-tools svg{') && !html.includes('.catalog-tools svg{width:18px;height:18px'), 'owner-locked catalog filter controls must not be overridden');


// Verify the final-cascade glass contract comes AFTER all legacy opaque !important rules.
// This guards against regression to the prior appearance where the base shared layer was overridden.
const finalGlassStart = html.indexOf('<style id="sd-unified-icon-system-final">');
const legacyOpaqueGlass = html.lastIndexOf('background:rgba(249,253,255,.96)!important');
assert.ok(finalGlassStart > legacyOpaqueGlass, 'final Liquid Glass contract must outrank later legacy opaque icon-button rules');
assert.ok(html.includes('backdrop-filter:blur(22px) saturate(180%) !important'), 'final icon shells must apply translucent backdrop blur and saturation');
assert.ok(html.includes('radial-gradient(125% 115% at 12% 0%'), 'final icon shell must contain a visible specular highlight');
assert.ok(html.includes('linear-gradient(145deg,rgba(255,255,255,.57) 0%,rgba(226,242,253,.38) 46%,rgba(151,194,223,.24) 100%) !important'), 'light icon shells must use a translucent pearl/ice glass surface');
assert.ok(html.includes('html.dark .detail-gallery-arrow:hover'), 'dark mode must have an equivalent shared glass hover state');
const finalGlassCss = html.slice(finalGlassStart, html.indexOf('</style>', finalGlassStart));
assert.ok(!finalGlassCss.includes('#products .filter-pill') && !finalGlassCss.includes('#order .order-cta'), 'final glass system must not override the owner-locked catalog filters or order section');


// Extend parity coverage to every unlocked icon-button family without changing nav/tab geometry.
const finalIconStart = html.indexOf('<style id="sd-unified-icon-system-final">');
const finalIconStyle = html.slice(finalIconStart, html.indexOf('</style>', finalIconStart));
assert.ok(finalIconStyle.includes('.mini-add:hover') && finalIconStyle.includes('.page-btn.page-arrow:hover:not(:disabled)'), 'product-card add and pagination-arrow buttons must use the common glass shell');
assert.ok(finalIconStyle.includes('.account-action>span.account-action-icon svg') && finalIconStyle.includes('#mobileBottomNav .mobile-tab svg'), 'account and mobile navigation SVG sizing must follow the shared optical baseline');
assert.ok(!finalIconStyle.includes('#mobileBottomNav .mobile-tab{') && !finalIconStyle.includes('.service-strip .service-icon{'), 'do not replace mobile tab geometry or benefit-tile shells with generic button shells');


// Native share can be present yet reject for reasons other than user cancellation.
// In that case the fullscreen share control must still try clipboard fallback.
const fullscreenShareStart = html.indexOf("$('#sdFullscreenShare').addEventListener('click',async()=>{");
const fullscreenShareEnd = html.indexOf(String.fromCharCode(10) + '});', fullscreenShareStart);
assert.ok(fullscreenShareStart >= 0 && fullscreenShareEnd > fullscreenShareStart,
  'fullscreen share must have a dedicated handler for rejection-path regression tests');
const fullscreenShareHandler = html.slice(fullscreenShareStart, fullscreenShareEnd + 4);
async function runFullscreenShareHarness(shareOutcome, copySucceeded) {
  let handler = null;
  const copyCalls = [];
  const shareCalls = [];
  const messages = [];
  const context = {
    currentProduct: { title: 'Sản phẩm thử' },
    navigator: {
      async share(payload) {
        shareCalls.push(payload);
        if (shareOutcome === 'success') return;
        throw Object.assign(new Error('share failed for test'), { name: shareOutcome });
      }
    },
    window: { location: { href: 'https://example.test/sanpham/danh-muc/sku-001' } },
    async copyText(value) { copyCalls.push(value); return copySucceeded; },
    showToast(message) { messages.push(message); },
    $: selector => selector === '#sdFullscreenShare'
      ? { addEventListener(type, callback) { assert.equal(type, 'click'); handler = callback; } }
      : null
  };
  vm.runInNewContext(fullscreenShareHandler, context, { timeout: 1000 });
  assert.equal(typeof handler, 'function', 'share click handler must be registered');
  await handler();
  return { copyCalls, shareCalls, messages };
}
const nativeShareRejects = await runFullscreenShareHarness('NotAllowedError', true);
assert.equal(nativeShareRejects.shareCalls.length, 1, 'native sharing should be attempted first');
assert.deepEqual(nativeShareRejects.copyCalls, ['https://example.test/sanpham/danh-muc/sku-001'],
  'native share rejection must fall back to copying the product URL');
assert.match(nativeShareRejects.messages[0], /Đã sao chép liên kết sản phẩm/,
  'successful copy fallback must confirm the copied URL truthfully');
const nativeShareAndCopyFail = await runFullscreenShareHarness('NotAllowedError', false);
assert.equal(nativeShareAndCopyFail.copyCalls.length, 1, 'clipboard fallback must still be attempted when it will fail');
assert.match(nativeShareAndCopyFail.messages[0], /Không thể chia sẻ hoặc sao chép/,
  'a failed share and failed copy must not claim success');
assert.doesNotMatch(nativeShareAndCopyFail.messages.join(' '), /Đã sao chép/i,
  'failed share/copy must never say the URL was copied');
const nativeShareCancelled = await runFullscreenShareHarness('AbortError', true);
assert.equal(nativeShareCancelled.copyCalls.length, 0,
  'explicit user cancellation must not unexpectedly copy the URL');
assert.equal(nativeShareCancelled.messages.length, 0,
  'explicit share cancellation must remain quiet');
const nativeShareSuccess = await runFullscreenShareHarness('success', true);
assert.equal(nativeShareSuccess.copyCalls.length, 0,
  'a successful native share must not also trigger clipboard fallback');
assert.equal(nativeShareSuccess.messages.length, 0,
  'a successful native share needs no extra toast');


// Repeat-on-entry regression with threshold hysteresis and no full-card GPU blur.
{
  const start = html.indexOf('function unbindReveal(root){');
  const end = html.indexOf('\nfunction preferredGallery(', start);
  assert.ok(start > 0 && end > start, 'reveal controller is present');
  const controller = html.slice(start, end);
  const classes = () => {
    const items = new Set();
    return {
      add(k) { items.add(k); },
      remove(k) { items.delete(k); },
      contains(k) { return items.has(k); }
    };
  };
  function target() {
    return { isConnected: true, bound: false, classList: classes(),
      setAttribute(name) { if(name === 'data-reveal-bound') this.bound = true; } };
  }
  function root(items) { return { querySelectorAll(q) {
    if (q === '[data-reveal]:not([data-reveal-bound])') return items.filter(x => !x.bound);
    if (q === '[data-reveal-bound]') return items.filter(x => x.bound);
    throw Error(q);
  } }; }
  let callback, settings; const observed = new Set();
  class FakeObserver {
    constructor(fn, options) { callback = fn; settings = options; }
    observe(el) { observed.add(el); }
    unobserve(el) { observed.delete(el); }
  }
  const ctx = { window: { IntersectionObserver: FakeObserver }, IntersectionObserver: FakeObserver };
  vm.runInNewContext(controller + '\n;globalThis.harness = {bindReveal,unbindReveal};', ctx, {timeout:1000});
  const {bindReveal,unbindReveal} = ctx.harness;
  assert.equal(JSON.stringify(Array.from(settings.threshold)), JSON.stringify([0,.08]),
    'entry threshold must avoid edge flicker while preserving scroll replays');
  const el=target();bindReveal(root([el]));
  assert.equal(observed.has(el),true,'element observed initially');
  const ping=(intersect,ratio)=>callback([{target:el,isIntersecting:intersect,intersectionRatio:ratio}]);
  ping(true,.03);
  assert.equal(el.classList.contains('is-visible'),false,'do not trigger on tiny edge overlap');
  ping(true,.20);
  assert.equal(el.classList.contains('is-visible'),true,'scroll down reveals');
  ping(true,.01);
  assert.equal(el.classList.contains('is-visible'),true,'still partially visible stays shown');
  ping(false,0);
  assert.equal(el.classList.contains('is-visible'),false,'fully exited resets immediately');
  ping(true,.12);
  assert.equal(el.classList.contains('is-visible'),true,'scroll up replays');
  ping(false,0);ping(true,.3);
  assert.equal(el.classList.contains('is-visible'),true,'repeated scroll replays');
  assert.equal(observed.has(el),true,'enter/exit does not drop observer');
  const fresh=target();bindReveal(root([fresh]));
  assert.equal(observed.has(fresh),true,'dynamic cards observed');
  unbindReveal(root([fresh,el]));
  assert.equal(observed.size,0,'detached catalog cards release observer');
  const stale=target();bindReveal(root([stale]));stale.isConnected=false;
  callback([{target:stale,isIntersecting:false,intersectionRatio:0}]);
  assert.equal(observed.has(stale),false,'disconnected card gets unobserved');
  const noIO={window:{}};
  vm.runInNewContext(controller + '\n;globalThis.harness = {bindReveal};',noIO,{timeout:1000});
  const fallback=target();noIO.harness.bindReveal(root([fallback]));
  assert.equal(fallback.classList.contains('is-visible'),true,'no IO fallback shows content');
  const cssStart=html.indexOf('/* Lightweight bidirectional reveal.');
  const cssEnd=html.indexOf('html.theme-transitioning',cssStart);
  assert.ok(cssStart>0 && cssEnd>cssStart,'lightweight reveal CSS exists');
  const css=html.slice(cssStart,cssEnd);
  assert.ok(css.includes('filter:none;') && !/filter:blur\(/.test(css),
    'reveal must not blur entire glass/photographic card layers');
  assert.ok(css.includes('transition:none;') && css.includes('opacity .38s'),
    'exit must reset without animation; entering uses a short transition');
  assert.ok(css.includes('will-change:auto;') && !css.includes('translate3d'),
    'do not pin compositor layers or 3D transform each product card');
  assert.ok(css.includes(':is(.section-head,.order-cta)[data-reveal]'),
    'only small editorial copy slides; photo cards remain stationary');
  assert.ok(html.includes('html.js-enabled [data-reveal]{opacity:1;transform:none;filter:none}'),
    'prefers-reduced-motion CSS must reveal content without motion');
  assert.ok(html.includes("function renderCatalog(){unbindReveal($('#catalogGrid'))") &&
    html.includes("function renderFeatured(){unbindReveal($('#featuredGrid'))"),
    'render loops must clean up old observers to avoid retained layers');
}
