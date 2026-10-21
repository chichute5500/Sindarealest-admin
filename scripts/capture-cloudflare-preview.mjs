import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sanitizeText, sanitizeUrl } from './sanitize-audit-value.mjs';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const requested = process.env.PREVIEW_URL || 'https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/';
const allowedHost = /^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i;
let previewUrl;
try {
  previewUrl = new URL(requested);
  if (previewUrl.protocol !== 'https:' || !allowedHost.test(previewUrl.hostname)
      || previewUrl.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || previewUrl.username || previewUrl.password || previewUrl.search || previewUrl.hash
      || (previewUrl.pathname !== '/' && previewUrl.pathname !== '')) {
    throw new Error('Refused URL: use an HTTPS non-production alias under sindarealest2.pages.dev with no credentials, query, fragment, or custom path.');
  }
  previewUrl.pathname = '/';
} catch (error) {
  console.error(error.message || String(error));
  process.exit(2);
}
const origin = previewUrl.origin;
let accessHeaders;
try {
  accessHeaders = buildCloudflareAccessHeaders();
} catch (error) {
  console.error(error.message || 'Invalid Cloudflare Access service-token configuration.');
  process.exit(2);
}
const outputDir = path.join(process.cwd(), 'artifacts', 'liquid-glass-preview', 'live-preview');
// Required responsive matrix: small mobile, common mobile, tablet, and desktop.
const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const audit = {
  sourceKind: 'cloudflare-pages-preview-live-read-only',
  previewUrl: previewUrl.href,
  startedAtUtc: new Date().toISOString(),
  captureCompleted: false,
  accessBlocked: false,
  accessBlockReason: null,
  passed: false,
  screenshots: [],
  viewportAudits: [],
  themeChecks: [],
  routeChecks: [],
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
  failedRequests: [],
  blockedExternalRequests: [],
  allowedExternalReadRequests: [],
  readOnlyViolations: [],
  hardFailures: [],
  contentChecks: [],
  heroImageChecks: [],
  sectionChecks: [],
  commerceStateChecks: [],
  productDetailChecks: [],
  brokenImages: [],
  accessServiceTokenConfigured: Object.keys(accessHeaders).length > 0,
  sourceCommit: process.env.SOURCE_SHA || null,
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

function accessGate(url, status, title, body) {
  const u = new URL(url);
  return status === 401 || status === 403 || u.pathname.startsWith('/cdn-cgi/access/login')
    || /login_required|cloudflare access|sign in to continue|access denied/i.test((title || '') + '\n' + (body || ''));
}
async function makePage(browser, viewport, theme, label) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  await context.addInitScript((mode) => {
    try { localStorage.setItem('sd-theme-mode', mode); } catch {}
  }, theme);
  await context.route('**/*', async (route) => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch { return route.abort(); }
    if (u.origin !== origin) {
      // One narrowly scoped public dependency is permitted for a realistic checkout/address
      // audit: GET-only province/ward lookups. This branch runs before same-origin Access
      // service-token injection below, so Cloudflare credentials never leave the Preview.
      if (isApprovedPreviewExternalRead(req.url(), req.method())) {
        audit.allowedExternalReadRequests.push({
          context: label,
          method: req.method(),
          url: sanitizeUrl(req.url()),
          note: 'Explicit public administrative-division GET allowlist; no Preview Access headers forwarded.',
        });
        return route.continue();
      }
      // All other cross-origin requests are blocked. Access login redirects are classified
      // separately so the audit cannot mistake a gated Preview for a healthy storefront.
      if (req.isNavigationRequest() && u.hostname.toLowerCase().endsWith('.cloudflareaccess.com')) {
        audit.accessBlocked = true;
        audit.accessBlockReason = 'The Preview redirected to a Cloudflare Access sign-in host; the external navigation was blocked and no credentials were entered.';
        audit.hardFailures.push('Cloudflare Access sign-in redirect detected at ' + sanitizeUrl(req.url()));
      }
      audit.blockedExternalRequests.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), type: req.resourceType() });
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(req.method().toUpperCase())) {
      audit.readOnlyViolations.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), note: 'Blocked before reaching the Preview.' });
      return route.abort();
    }
    // Send service-token headers only to the validated Preview origin. Cross-origin
    // destinations are aborted above before these credentials can be attached.
    if (Object.keys(accessHeaders).length > 0) {
      return route.continue({ headers: { ...req.headers(), ...accessHeaders } });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const sourceUrl = msg.location()?.url || page.url();
    try { if (new URL(sourceUrl).origin !== origin) return; } catch { return; }
    audit.consoleErrors.push({ context: label, message: sanitizeText(msg.text()), url: sanitizeUrl(sourceUrl) });
  });
  page.on('pageerror', (error) => {
    try { if (new URL(page.url()).origin !== origin) return; } catch { return; }
    audit.pageErrors.push({ context: label, message: sanitizeText(error.message) });
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) audit.httpErrors.push({ context: label, status: res.status(), method: res.request().method(), url: sanitizeUrl(res.url()) });
  });
  page.on('requestfailed', (req) => {
    let u; try { u = new URL(req.url()); } catch { return; }
    if (u.origin === origin && ['GET', 'HEAD'].includes(req.method().toUpperCase()) && !String(req.failure()?.errorText || '').includes('ERR_ABORTED')) {
      audit.failedRequests.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), reason: sanitizeText(req.failure()?.errorText || 'unknown') });
    }
  });
  return { context, page };
}
async function navigate(page, url) {
  let response = null;
  try { response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
  catch (error) { audit.hardFailures.push(sanitizeText('Navigation failed for ' + url + ': ' + String(error.message || error))); }
  if (!response) return { response: null, blocked: audit.accessBlocked, status: null, title: '', url: page.url(), bodyText: '' };
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => ({ title: document.title || '', url: location.href, bodyText: (document.body?.innerText || '').slice(0, 12000) }))
    .catch(() => ({ title: '', url: page.url(), bodyText: '' }));
  const blocked = accessGate(info.url, response.status(), info.title, info.bodyText);
  if (blocked) {
    audit.accessBlocked = true;
    audit.accessBlockReason = 'Cloudflare Access or login_required detected; no screenshot can be saved as a baseline.';
    audit.hardFailures.push('Access gate detected at ' + sanitizeUrl(info.url));
  }
  return { response, blocked, status: response.status(), ...info, url: sanitizeUrl(info.url) };
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    const step = Math.max(260, Math.floor(window.innerHeight * 0.65));
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 55));
    }
    window.scrollTo(0, 0);
    await Promise.all(Array.from(document.images, (img) => new Promise((resolve) => {
      if (img.complete) return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
      const timer = setTimeout(finish, 4500);
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
    })));
  });
  await page.waitForTimeout(160);
}
async function capture(page, filename, fullPage, meta) {
  await page.screenshot({ path: path.join(outputDir, filename), type: 'png', fullPage, animations: 'disabled', timeout: 30000 });
  audit.screenshots.push({ filename, fullPage, ...meta });
}
async function captureLocator(page, selector, filename, meta) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    const visible = count > 0 && await locator.isVisible().catch(() => false);
    if (!visible) {
      if (attempt === 0) {
        await page.waitForTimeout(180);
        continue;
      }
      audit.sectionChecks.push({ selector, filename, status: 'MISSING', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      audit.hardFailures.push('Required screenshot target is missing or hidden: ' + selector + ' (' + filename + ')');
      return false;
    }
    try {
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await locator.screenshot({ path: path.join(outputDir, filename), type: 'png', animations: 'disabled', timeout: 30000 });
      audit.sectionChecks.push({ selector, filename, status: 'CAPTURED', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      audit.screenshots.push({ filename, fullPage: false, elementSelector: selector, ...meta });
      return true;
    } catch (error) {
      lastError = error;
      const transient = /not attached to the DOM|not visible|detached|element is not stable/i.test(String(error?.message || error));
      if (attempt === 0 && transient) {
        await page.waitForTimeout(220);
        continue;
      }
      audit.sectionChecks.push({ selector, filename, status: 'FAILED', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      throw error;
    }
  }
  throw lastError || new Error('Could not capture ' + selector + '.');
}
function screenshotStem(prefix, viewport, theme) {
  return prefix + '-' + viewport.name.split('-')[0] + '-' + theme + '-' + viewport.width + 'x' + viewport.height;
}
function captureMeta(viewport, theme, route = '/') {
  return {
    route, theme, viewport: viewport.name, viewportWidth: viewport.width, viewportHeight: viewport.height,
    captureSource: 'cloudflare-pages-preview-live-read-only',
  };
}
async function waitForStorefront(page, label) {
  await page.waitForFunction(() => !!document.querySelector('#home')
    && !!document.querySelector('.service-strip')
    && document.querySelectorAll('#catalogGrid .product-card').length > 0,
  null, { timeout: 18000 });
  const state = await page.evaluate(() => ({
    title: document.title || '',
    serviceCount: document.querySelectorAll('.service-strip .service').length,
    catalogProductCount: document.querySelectorAll('#catalogGrid .product-card').length,
    hasHero: Boolean(document.querySelector('#home .hero-visual img')),
    hasFooter: Boolean(document.querySelector('#siteFooter')),
    path: location.pathname,
  }));
  const status = state.serviceCount === 6 && state.hasHero && state.hasFooter && Boolean(state.title.trim()) ? 'PASS' : 'FAIL';
  audit.contentChecks.push({ context: label, ...state, status });
  if (status !== 'PASS') throw new Error('Storefront content check failed at ' + label + ': six-tile grid, hero, footer or document title is missing.');
}
async function dismissWelcomeSplash(page) {
  await page.evaluate(() => window.__sdDismissWelcome?.()).catch(() => {});
  await page.waitForFunction(() => {
    const splash = document.querySelector('#welcomeSplash');
    return !splash || splash.classList.contains('is-leaving');
  }, null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(950);
}
async function auditHeroImage(page, label) {
  const result = await page.evaluate(() => {
    const imageElement = document.querySelector('#heroProductImage');
    const source = imageElement?.getAttribute('src') || '';
    const path = source.split('?')[0];
    const loaded = Boolean(imageElement && imageElement.complete && imageElement.naturalWidth > 0);
    const status = imageElement?.dataset.productImageStatus || '';
    return {
      expectedImage: '/images/hero-sd-gl052.png',
      actualImage: path,
      status,
      loaded,
      hidden: Boolean(imageElement?.hidden),
      usesOwnerSuppliedImage: Boolean(imageElement)
        && path === '/images/hero-sd-gl052.png'
        && status === 'owner-supplied'
        && loaded
        && !imageElement.hidden,
    };
  });
  const pass = result.usesOwnerSuppliedImage === true;
  audit.heroImageChecks.push({ context: label, status: pass ? 'PASS' : 'FAIL', pass, result });
  if (!pass) {
    audit.hardFailures.push('Owner-uploaded hero image did not load from /images/hero-sd-gl052.png at ' + label + '.');
  }
}

async function auditImageElements(page, label) {
  const broken = await page.evaluate(() => Array.from(document.images).filter((img) => {
    const src = img.currentSrc || img.getAttribute('src') || '';
    return Boolean(src) && img.complete && img.naturalWidth === 0;
  }).map((img) => ({
    src: (() => { try { return new URL(img.currentSrc || img.src, location.href).pathname; } catch { return ''; } })(),
    alt: String(img.alt || '').slice(0, 160),
  }))).catch(() => []);
  if (broken.length) {
    audit.brokenImages.push({ context: label, count: broken.length, images: broken });
    audit.hardFailures.push('Broken image elements detected at ' + label + ': ' + broken.length);
  }
}
const sectionTargets = [
  { key: 'hero', selector: '#home' },
  { key: 'benefits', selector: '.service-strip' },
  { key: 'order', selector: '#order' },
  { key: 'featured', selector: '#featured' },
  { key: 'collections', selector: '#collections' },
  { key: 'products', selector: '#products' },
  { key: 'contact', selector: '#contact' },
  { key: 'footer', selector: '#siteFooter' },
];
async function captureKeySections(page, viewport, theme) {
  const meta = captureMeta(viewport, theme, '/');
  for (const section of sectionTargets) {
    const filename = screenshotStem('section-' + section.key, viewport, theme) + '.png';
    await captureLocator(page, section.selector, filename, {
      ...meta, captureType: 'section', sectionKey: section.key, state: 'default',
    });
  }
}
async function captureMenuOpen(page, viewport, theme) {
  const button = page.locator('#menuToggle');
  if (!await button.isVisible().catch(() => false)) {
    audit.sectionChecks.push({ selector: '#menuToggle', status: 'NOT APPLICABLE', route: '/', theme, viewport: viewport.name, note: 'Mobile menu button is not visible at this viewport.' });
    return;
  }
  await button.click();
  await page.waitForFunction(() => document.querySelector('#mobileNav')?.classList.contains('open'), null, { timeout: 5000 });
  await capture(page, screenshotStem('state-menu-open', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'menu-open',
  });
  // The open drawer overlays the toggle, so a second pointer click is intercepted.
  // Use the storefront's supported Escape handler to close it without bypassing hit-testing.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#mobileNav')?.classList.contains('open'), null, { timeout: 5000 });
}
async function captureAccountDrawer(page, viewport, theme) {
  const button = page.locator('#mobileAccountNav');
  if (!await button.isVisible().catch(() => false)) {
    audit.hardFailures.push('Account navigation is not visible at the required mobile viewport.');
    audit.commerceStateChecks.push({ state: 'account-menu-open', status: 'FAIL', viewport: viewport.name, theme });
    return;
  }
  await button.click();
  await page.waitForFunction(() => document.querySelector('#accountDrawer')?.classList.contains('open'), null, { timeout: 5000 });
  await captureLocator(page, '#accountDrawer', screenshotStem('state-account-menu', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'account-menu-open',
  });
  await capture(page, screenshotStem('state-account-menu-viewport', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'account-menu-open',
  });
  audit.commerceStateChecks.push({ state: 'account-menu-open', status: 'PASS', viewport: viewport.name, theme });
  await page.locator('#accountClose').click();
  await page.waitForFunction(() => !document.querySelector('#accountDrawer')?.classList.contains('open'), null, { timeout: 5000 });
}

async function captureOrderExpanded(page, viewport, theme) {
  const button = page.locator('#orderDetailsToggle');
  const panel = page.locator('#orderDetailsPanel');
  if (!(await button.count()) || !(await panel.count())) {
    audit.hardFailures.push('Order assurance controls are missing; expanded-state screenshot cannot be captured.');
    return;
  }
  await button.scrollIntoViewIfNeeded();
  if (await panel.isHidden().catch(() => true)) await button.click();
  await page.waitForFunction(() => {
    const element = document.querySelector('#orderDetailsPanel');
    return Boolean(element && !element.hidden);
  }, null, { timeout: 5000 });
  await captureLocator(page, '#order', screenshotStem('state-order-expanded', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'order-details-expanded', sectionKey: 'order',
  });
}
async function waitForProductDetail(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('#productOverlay.open')
    && document.querySelector('#detailTitle')?.textContent.trim()
    && document.querySelector('#detailMainImage')), null, { timeout: 18000 });
  await dismissWelcomeSplash(page);
  await page.waitForFunction(() => {
    const img = document.querySelector('#detailMainImage');
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }, null, { timeout: 10000 }).catch(() => {});
}
async function captureGalleryCartCheckoutStates(page, viewport, theme, label, route) {
  // UI-only probe in an isolated browser session: add one item locally and open
  // checkout for a screenshot. No order is submitted and all network writes are blocked.
  if (viewport.name !== 'mobile-390') return;
  const stateCapture = async (selector, filename, state) => {
    await captureLocator(page, selector, filename, {
      ...captureMeta(viewport, theme, route), captureType: 'state', state,
    });
  };
  try {
    const zoom = page.locator('#detailZoom');
    if (!await zoom.isVisible().catch(() => false)) throw new Error('Full-screen product gallery control is not visible.');
    await zoom.click();
    await page.waitForFunction(() => {
      const viewer = document.querySelector('#sdFullscreenViewer');
      // The gallery uses two buffered image layers and can load the first photo into
      // #sdFullscreenImageNext. Accept either loaded layer instead of assuming layer 1.
      const images = Array.from(document.querySelectorAll('#sdFullscreenViewer .sd-fullscreen-image'));
      return Boolean(viewer?.classList.contains('open')
        && images.some(image => image.complete && image.naturalWidth > 0));
    }, null, { timeout: 12000 });
    await stateCapture('#sdFullscreenViewer', screenshotStem('state-fullscreen-gallery', viewport, theme) + '.png', 'fullscreen-gallery');
    audit.commerceStateChecks.push({ state: 'fullscreen-gallery', status: 'PASS', viewport: viewport.name, theme, route });
    await page.locator('#sdFullscreenClose').click();
    await page.waitForFunction(() => !document.querySelector('#sdFullscreenViewer')?.classList.contains('open'), null, { timeout: 5000 });

    const addButton = page.locator('#detailAdd');
    if (!await addButton.isVisible().catch(() => false)) throw new Error('Add-to-cart control is not visible.');
    await addButton.click();
    await page.waitForFunction(() => {
      const text = document.querySelector('#cartCount')?.textContent || '0';
      return Number.parseInt(text, 10) > 0 || text.trim() === '99+';
    }, null, { timeout: 5000 });

    // The product-detail modal intentionally covers the bottom navigation.
    // Close the detail UI before clicking the cart tab; otherwise Playwright's
    // pointer click is correctly intercepted by the still-open dialog.
    await page.locator('#detailClose').click();
    await page.waitForFunction(() => !document.querySelector('#productOverlay')?.classList.contains('open'), null, { timeout: 5000 });

    const cartNav = page.locator('#mobileCartNav');
    if (!await cartNav.isVisible().catch(() => false)) throw new Error('Mobile cart tab is not visible after adding the isolated test item.');
    await cartNav.click();
    await page.waitForFunction(() => document.querySelector('#cartDrawer')?.classList.contains('open'), null, { timeout: 5000 });
    await page.waitForFunction(() => Boolean(document.querySelector('#cartList .cart-row')), null, { timeout: 5000 });
    await stateCapture('#cartDrawer', screenshotStem('state-cart-with-item', viewport, theme) + '.png', 'cart-with-item');
    await capture(page, screenshotStem('state-cart-with-item-viewport', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'cart-with-item', route,
    });
    audit.commerceStateChecks.push({ state: 'cart-with-item', status: 'PASS', viewport: viewport.name, theme, route });

    const checkout = page.locator('#cartCheckout');
    if (await checkout.isDisabled()) throw new Error('Checkout remains disabled after adding the item.');
    await checkout.click();
    await page.waitForFunction(() => document.querySelector('#checkoutDrawer')?.classList.contains('open'), null, { timeout: 5000 });
    await stateCapture('#checkoutDrawer', screenshotStem('state-checkout-form', viewport, theme) + '.png', 'checkout-form-open');
    await capture(page, screenshotStem('state-checkout-form-viewport', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'checkout-form-open', route,
    });
    audit.commerceStateChecks.push({ state: 'checkout-form-open', status: 'PASS', viewport: viewport.name, theme, route, submitted: false });
    await page.locator('#checkoutClose').click();
    await page.waitForFunction(() => !document.querySelector('#checkoutDrawer')?.classList.contains('open'), null, { timeout: 5000 });
  } catch (error) {
    audit.commerceStateChecks.push({
      state: 'gallery-cart-checkout', status: 'FAIL', viewport: viewport.name, theme, route,
      note: sanitizeText(String(error?.message || error).slice(0, 200)),
    });
    audit.hardFailures.push('Full-screen gallery/cart/checkout capture failed at ' + label + ': ' + sanitizeText(error?.message || error));
    await page.locator('#sdFullscreenClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#checkoutClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#cartClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#detailClose').click({ timeout: 800 }).catch(() => {});
  }
}

async function captureProductDetailFlow(page, viewport, theme, label) {
  let cardButton = page.locator('#catalogGrid [data-open-product]').first();
  if (await cardButton.count().catch(() => 0) === 0) cardButton = page.locator('#featuredGrid [data-open-product]').first();
  if (await cardButton.count().catch(() => 0) === 0) {
    audit.productDetailChecks.push({ context: label, status: 'NOT TESTED', reason: 'No live product card rendered.' });
    audit.hardFailures.push('No live product card is available for the detail route check at ' + label + '.');
    return;
  }
  await cardButton.scrollIntoViewIfNeeded();
  await cardButton.click({ timeout: 15000 });
  await waitForProductDetail(page);
  const clicked = await page.evaluate(() => ({
    path: location.pathname,
    title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    imageCount: document.querySelectorAll('#detailThumbs .detail-thumb').length,
  }));
  const currentRouteMatches = /^\/sanpham\/[^/]+\/[^/]+\/?$/i.test(clicked.path) && Boolean(clicked.title);
  if (!currentRouteMatches) {
    audit.routeChecks.push({
      kind: 'product-card-navigation', path: clicked.path, status: 'FAIL', result: 'FAIL',
      productTitleMatches: Boolean(clicked.title), detailModalOpen: true, context: label,
      expectedPattern: '/sanpham/{category-slug}/{product-key}',
    });
    audit.productDetailChecks.push({ context: label, status: 'FAIL', clickedPath: clicked.path, productTitlePresent: Boolean(clicked.title) });
    audit.hardFailures.push('Clicking a live product did not produce an expected current detail route (' + label + ').');
    return;
  }
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-from-grid', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, clicked.path), captureType: 'product-detail', state: 'opened-from-product-grid', productTitle: clicked.title,
  });
  audit.routeChecks.push({
    kind: 'product-card-navigation', path: clicked.path, status: 'PASS', productTitleMatches: true,
    detailModalOpen: true, context: label, note: 'Path derived from an actual rendered Preview product card; no sample SKU assumed.',
  });
  await captureGalleryCartCheckoutStates(page, viewport, theme, label, clicked.path);

  const directResponse = await navigate(page, new URL(clicked.path, origin).href);
  if (directResponse.blocked || !directResponse.response) {
    audit.productDetailChecks.push({ context: label, status: 'BLOCKED', path: clicked.path, directOpenPassed: false, reloadPassed: false });
    return;
  }
  if (directResponse.status < 200 || directResponse.status >= 400) {
    audit.productDetailChecks.push({ context: label, status: 'FAIL', path: clicked.path, directStatus: directResponse.status, directOpenPassed: false, reloadPassed: false });
    audit.hardFailures.push('Product detail direct navigation returned an unsuccessful status at ' + label + '.');
    return;
  }
  await waitForStorefront(page, label + '-direct-open');
  await waitForProductDetail(page);
  const directState = await page.evaluate(() => ({
    path: location.pathname, title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    modalOpen: Boolean(document.querySelector('#productOverlay.open')),
  }));
  const directOpenPassed = directState.path === clicked.path && directState.title === clicked.title && directState.modalOpen;
  audit.routeChecks.push({
    kind: 'product-detail-direct-open', path: clicked.path, status: directResponse.status, finalPath: directState.path,
    productTitleMatches: directState.title === clicked.title, detailModalOpen: directState.modalOpen,
    result: directOpenPassed ? 'PASS' : 'FAIL', context: label,
  });
  if (!directOpenPassed) audit.hardFailures.push('Direct open did not resolve to the same real product: ' + clicked.path + ' (' + label + ').');
  await settle(page);
  await capture(page, screenshotStem('product-detail-direct-open', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, directState.path), captureType: 'product-detail-direct-open', state: 'direct-open', productTitle: clicked.title,
  });
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-modal-direct-open', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, directState.path), captureType: 'product-detail-modal', state: 'direct-open', productTitle: clicked.title,
  });

  let galleryNextPassed = null;
  const next = page.locator('#detailNext');
  const galleryImageCount = await page.locator('#detailThumbs .detail-thumb').count().catch(() => 0);
  // Some site styles can override the browser's [hidden] presentation. Trust the
  // actual rendered gallery data, not visibility of the arrow alone.
  if (galleryImageCount > 1 && await next.isVisible().catch(() => false)) {
    const before = await page.locator('#detailImageCount').textContent().catch(() => '');
    await next.click();
    await page.waitForFunction(previous => {
      const counter = document.querySelector('#detailImageCount')?.textContent || '';
      const current = Number.parseInt(counter.split('/')[0], 10);
      const previousIndex = Number.parseInt(String(previous || '').split('/')[0], 10);
      return Number.isFinite(current) && Number.isFinite(previousIndex) && current !== previousIndex;
    }, before, { timeout: 5000 });
    await captureLocator(page, '#productOverlay', screenshotStem('product-gallery-next', viewport, theme) + '.png', {
      ...captureMeta(viewport, theme, directState.path), captureType: 'product-gallery', state: 'next-image', productTitle: clicked.title,
    });
    galleryNextPassed = true;
  } else {
    audit.sectionChecks.push({ selector: '#detailNext', status: 'NOT APPLICABLE', route: clicked.path, theme, viewport: viewport.name, note: 'Selected live product exposes one image or no visible next control.' });
  }

  const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  const reloadStatus = typeof reloadResponse?.status === 'function' ? reloadResponse.status() : null;
  await waitForStorefront(page, label + '-reload');
  await waitForProductDetail(page);
  const reloadState = await page.evaluate(() => ({
    path: location.pathname, title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    modalOpen: Boolean(document.querySelector('#productOverlay.open')),
  }));
  const reloadPassed = Boolean(reloadStatus !== null && reloadStatus >= 200 && reloadStatus < 400
    && reloadState.path === clicked.path && reloadState.title === clicked.title && reloadState.modalOpen);
  audit.routeChecks.push({
    kind: 'product-detail-reload', path: clicked.path, status: reloadStatus, finalPath: reloadState.path,
    productTitleMatches: reloadState.title === clicked.title, detailModalOpen: reloadState.modalOpen,
    result: reloadPassed ? 'PASS' : 'FAIL', context: label,
  });
  if (!reloadPassed) audit.hardFailures.push('Reload did not preserve the same real product detail: ' + clicked.path + ' (' + label + ').');
  await settle(page);
  await capture(page, screenshotStem('product-detail-reload', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, reloadState.path), captureType: 'product-detail-reload', state: 'reloaded-direct-route', productTitle: clicked.title,
  });
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-modal-after-reload', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, reloadState.path), captureType: 'product-detail-modal', state: 'after-reload', productTitle: clicked.title,
  });
  const passed = directOpenPassed && reloadPassed;
  audit.productDetailChecks.push({
    context: label, status: passed ? 'PASS' : 'FAIL', path: clicked.path, directOpenPassed, reloadPassed,
    productTitleMatches: true, galleryNext: galleryNextPassed === null ? 'NOT APPLICABLE' : 'PASS',
  });
}
async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  for (const item of await fs.readdir(outputDir, { withFileTypes: true })) {
    if (item.isFile() && /\.(png|json|html)$/i.test(item.name)) await fs.unlink(path.join(outputDir, item.name));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      for (const viewport of viewports) {
        if (audit.accessBlocked) break;
        const label = viewport.name + '-' + theme;
        const { context, page } = await makePage(browser, viewport, theme, label);
        try {
          const result = await navigate(page, previewUrl.href);
          if (result.blocked) break;
          if (!result.response) continue;
          if (result.status < 200 || result.status >= 300) throw new Error('Homepage returned HTTP ' + result.status + '.');
          await waitForStorefront(page, label);
          const metrics = await page.evaluate(() => ({
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            title: document.title,
            rootDark: document.documentElement.classList.contains('dark'),
            savedThemeMode: (() => { try { return localStorage.getItem('sd-theme-mode'); } catch { return null; } })(),
          }));
          audit.viewportAudits.push({ theme, viewport: viewport.name, width: viewport.width, height: viewport.height, status: result.status, ...metrics });
          audit.themeChecks.push({
            context: label, requestedTheme: theme, savedThemeMode: metrics.savedThemeMode, rootDark: metrics.rootDark,
            themeMatches: theme === 'dark' ? metrics.rootDark : !metrics.rootDark,
          });
          if (viewport.name === 'mobile-390') {
            const splash = page.locator('#welcomeSplash');
            if (await splash.count().catch(() => 0) && await splash.isVisible().catch(() => false)) {
              try {
                await captureLocator(page, '#welcomeSplash', screenshotStem('state-welcome-splash', viewport, theme) + '.png', {
                  ...captureMeta(viewport, theme), captureType: 'welcome-splash', state: 'welcome-overlay',
                });
              } catch (error) {
                // The welcome overlay is intentionally transient. A CSS exit
                // transition may detach it between visibility check and capture;
                // record the optional miss and continue the required storefront audit.
                audit.sectionChecks.push({
                  selector: '#welcomeSplash', status: 'OPTIONAL_TRANSIENT_SKIPPED',
                  route: new URL(page.url()).pathname, theme, viewport: viewport.name,
                  note: sanitizeText(String(error?.message || error).slice(0, 180)),
                });
              }
            }
          }
          await dismissWelcomeSplash(page);
          await settle(page);
          if (viewport.name === 'mobile-390' && theme === 'light') {
            await auditHeroImage(page, label);
          }
          await auditImageElements(page, label);
          await capture(page, screenshotStem('home', viewport, theme) + '-viewport.png', false, {
            ...captureMeta(viewport, theme), captureType: 'viewport', state: 'default-home',
          });
          if (['mobile-390', 'desktop-1440'].includes(viewport.name)) {
            await capture(page, screenshotStem('home', viewport, theme) + '-full-page.png', true, {
              ...captureMeta(viewport, theme), captureType: 'full-page', state: 'default-home',
            });
            await captureKeySections(page, viewport, theme);
            if (viewport.name === 'mobile-390') {
              await captureMenuOpen(page, viewport, theme);
              await captureAccountDrawer(page, viewport, theme);
            }
            await captureOrderExpanded(page, viewport, theme);
            await captureProductDetailFlow(page, viewport, theme, label);
          }
        } catch (error) {
          audit.hardFailures.push(sanitizeText('Capture failed for ' + label + ': ' + String(error.message || error)));
        } finally {
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }

  audit.responsiveOverflowCount = audit.viewportAudits.filter(item => item.horizontalOverflow).length;
  audit.captureCompleted = !audit.accessBlocked && audit.viewportAudits.length === viewports.length * 2
    && audit.screenshots.some(item => item.captureType === 'viewport');
  const sectionScreenshotCounts = Object.fromEntries(sectionTargets.map(section => [
    section.key, audit.screenshots.filter(shot => shot.captureType === 'section' && shot.sectionKey === section.key).length,
  ]));
  const requiredSectionScreenshotsComplete = sectionTargets.every(section => sectionScreenshotCounts[section.key] === 4);
  const requiredViewportThemePairs = viewports.length * 2;
  const completedViewportThemePairs = audit.viewportAudits.length;
  const productDetailContextsComplete = audit.productDetailChecks.length === 4
    && audit.productDetailChecks.every(check => check.status === 'PASS' && check.directOpenPassed && check.reloadPassed);
  const homeFullPageCount = audit.screenshots.filter(shot => shot.captureType === 'full-page').length;
  const menuOpenCount = audit.screenshots.filter(shot => shot.state === 'menu-open').length;
  const orderExpandedCount = audit.screenshots.filter(shot => shot.state === 'order-details-expanded').length;
  const accountMenuCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'account-menu-open').length;
  const fullscreenGalleryCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'fullscreen-gallery').length;
  const cartWithItemCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'cart-with-item').length;
  const checkoutFormCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'checkout-form-open').length;
  const commerceStatesComplete = accountMenuCount === 2 && fullscreenGalleryCount === 2 && cartWithItemCount === 2 && checkoutFormCount === 2
    && audit.commerceStateChecks.filter(check => check.status === 'PASS').length >= 8;
  audit.coverage = {
    requiredViewportThemePairs, completedViewportThemePairs,
    homeViewportScreenshots: audit.screenshots.filter(shot => shot.captureType === 'viewport' && shot.state === 'default-home').length,
    homeFullPageCount, requiredSectionKeys: sectionTargets.map(section => section.key),
    sectionScreenshotCounts, requiredSectionScreenshotsComplete, menuOpenCount, orderExpandedCount,
    accountMenuCount, fullscreenGalleryCount, cartWithItemCount, checkoutFormCount, commerceStatesComplete,
    productDetailContextsComplete, totalScreenshotCount: audit.screenshots.length,
  };
  audit.passed = audit.captureCompleted
    && completedViewportThemePairs === requiredViewportThemePairs
    && audit.themeChecks.length === requiredViewportThemePairs && audit.themeChecks.every(check => check.themeMatches)
    && audit.responsiveOverflowCount === 0
    && audit.contentChecks.length >= requiredViewportThemePairs && audit.contentChecks.every(check => check.status === 'PASS')
    && homeFullPageCount === 4 && requiredSectionScreenshotsComplete && menuOpenCount === 2 && orderExpandedCount === 4
    && commerceStatesComplete && productDetailContextsComplete && audit.brokenImages.length === 0
    && audit.pageErrors.length === 0 && audit.consoleErrors.length === 0 && audit.httpErrors.length === 0
    && audit.failedRequests.length === 0 && audit.readOnlyViolations.length === 0 && audit.hardFailures.length === 0;
  audit.finishedAtUtc = new Date().toISOString();
  audit.summary = {
    screenshotCount: audit.screenshots.length, viewportCount: audit.viewportAudits.length, routeCheckCount: audit.routeChecks.length,
    responsiveOverflowCount: audit.responsiveOverflowCount, consoleErrorCount: audit.consoleErrors.length,
    pageErrorCount: audit.pageErrors.length, httpErrorCount: audit.httpErrors.length, failedRequestCount: audit.failedRequests.length,
    brokenImageContextCount: audit.brokenImages.length, sectionTargetCheckCount: audit.sectionChecks.length,
    productDetailContextCount: audit.productDetailChecks.length, commerceStateCheckCount: audit.commerceStateChecks.length,
    blockedExternalRequestCount: audit.blockedExternalRequests.length,
    allowedExternalReadRequestCount: audit.allowedExternalReadRequests.length,
    readOnlyViolationCount: audit.readOnlyViolations.length, hardFailureCount: audit.hardFailures.length,
    requiredSectionScreenshotsComplete, productDetailContextsComplete,
  };
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8');
  const imageCards = audit.screenshots.map(shot => '<figure><figcaption>' + esc(shot.filename) + ' · ' + esc(shot.route || '/') + ' · ' + esc(shot.theme || '') + '</figcaption><a href="' + esc(shot.filename) + '"><img loading="lazy" src="' + esc(shot.filename) + '" alt="' + esc(shot.filename) + '"></a></figure>').join('\n');
  const references = '<section><h2>Original mobile design references</h2><p>The references are multi-screen collages intended for visual review, not a pixel-perfect comparison of unlike layouts.</p><div class="shots"><figure><figcaption>Light reference</figcaption><img src="../reference-images/file_0000000017088207af45f5e6dd90cfa4.png" alt="Light reference"></figure><figure><figcaption>Dark reference</figcaption><img src="../reference-images/file_00000000fcb48207a23aeda23caa5eeb.png" alt="Dark reference"></figure></div></section>';
  const reportHtml = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SinDarealest live Preview capture</title><style>body{font:14px/1.55 system-ui,sans-serif;color:#142a3c;background:#eef6fc;margin:0;padding:18px}main{max-width:1500px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;padding:12px;border-radius:10px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}figure{margin:0;padding:10px;border:1px solid #c5d9e8;border-radius:12px;background:#fff;min-width:0}figure img{width:100%;height:auto;display:block;border-radius:8px}figcaption{overflow-wrap:anywhere;font-size:12px;margin-bottom:6px}</style><main><h1>SinDarealest2 — direct Cloudflare Pages Preview capture</h1><p>Source: ' + esc(audit.previewUrl) + ' · captured: ' + esc(audit.captureCompleted) + ' · audit pass: ' + esc(audit.passed) + '</p><h2>Coverage</h2><pre>' + esc(JSON.stringify(audit.coverage || {}, null, 2)) + '</pre><h2>Route checks</h2><pre>' + esc(JSON.stringify(audit.routeChecks, null, 2)) + '</pre><h2>Content checks</h2><pre>' + esc(JSON.stringify(audit.contentChecks, null, 2)) + '</pre>' + references + '<h2>Captured Preview screens</h2><section class="shots">' + imageCards + '</section><h2>Full diagnostics</h2><pre>' + esc(JSON.stringify(audit, null, 2)) + '</pre></main></html>';
  await fs.writeFile(path.join(outputDir, 'report.html'), reportHtml, 'utf8');
  console.log(JSON.stringify({ previewUrl: audit.previewUrl, sourceCommit: audit.sourceCommit, accessServiceTokenConfigured: audit.accessServiceTokenConfigured, captureCompleted: audit.captureCompleted, accessBlocked: audit.accessBlocked, passed: audit.passed, coverage: audit.coverage, summary: audit.summary }, null, 2));
  if (!audit.captureCompleted || audit.accessBlocked || !audit.passed) process.exitCode = 1;
}
main().catch(async (error) => {
  audit.hardFailures.push(sanitizeText(error.stack || error));
  audit.finishedAtUtc = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8').catch(() => {});
  console.error(error.stack || error);
  process.exitCode = 1;
});
