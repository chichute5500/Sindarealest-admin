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
const removalTimer = welcomeTimers.find(timer => timer.delay === 900);
assert.ok(removalTimer, 'dialog removal must follow the existing exit transition');
removalTimer.fn();
assert.equal(welcome.isConnected, false, 'the dialog must be removed after its exit transition');
assert.deepEqual(doc.body.classList.removed, ['welcome-active'], 'the welcome active state must be cleaned up');

assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i,
  'the storefront must respect users who request reduced motion');
assert.match(html, /function setupArtSlideshow\(\)[\s\S]*?const reduceMotion=!!\(window\.matchMedia&&window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)[\s\S]*?if\(reduceMotion\)[\s\S]*?return\}show\(Math\.floor\(Math\.random\(\)\*pool\.length\)\);artTimer=setInterval/i,
  'the editorial carousel must use a stable initial image and disable auto-advance for reduced-motion users while preserving manual controls');
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
