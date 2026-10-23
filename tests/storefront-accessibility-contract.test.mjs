import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Accessibility and mobile-safety contracts for the real storefront markup/CSS.
// These assertions complement the Playwright preview; they do not claim an
// independent WCAG audit or replace testing on physical devices.
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
vm.runInNewContext(contactHelper + '\nnavigateAccountContact({ preventDefault() { contactDefaultPrevented = true; } });', {
  SD_MODAL_HISTORY_KEY: '__sdStorefrontModal',
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

console.log('PASS: storefront accessibility contracts cover reduced motion, keyboard focus, safe areas, dialog semantics, live regions and mobile target sizing.');
