import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const outDir = path.join(root, 'artifacts', 'liquid-glass-preview');
const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const origin = new URL(baseUrl).origin;
const themes = ['light', 'dark'];
const viewports = [
  { name: 'mobile-320', width: 320, height: 720 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const audit = {
  baseUrl,
  fixture: 'data/legacy-products.json; read-only; unknown prices/stock remain unmodified',
  productFixtureCount: 0,
  screenshots: [],
  responsive: [],
  layoutMetrics: [],
  interactions: [],
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
  failedRequests: [],
  externalRequestsBlocked: [],
  writeRequestsBlocked: [],
  mockedRequests: [],
  startedAt: new Date().toISOString(),
};
const hardFailures = [];
const ensureDir = (dir) => fs.mkdir(dir, { recursive: true });
const exists = async (file) => { try { await fs.access(file); return true; } catch { return false; } };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

async function capture(page, filename, fullPage = false) {
  await page.screenshot({ path: path.join(outDir, filename), fullPage, animations: 'disabled', type: 'jpeg', quality: 86 });
  audit.screenshots.push({ filename, fullPage });
}
async function captureElement(page, selector, filename) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  await element.screenshot({ path: path.join(outDir, filename), animations: 'disabled', type: 'jpeg', quality: 88 });
  audit.screenshots.push({ filename, fullPage: false, element: selector });
}
async function auditArrowPressInPlace(page, selector, theme, surface, audit) {
  const arrow = page.locator(selector).first();
  await arrow.waitFor({ state: 'visible' });
  await arrow.scrollIntoViewIfNeeded();
  const box = await arrow.boundingBox();
  if (!box) {
    return { selector, theme, surface, pass: false, reason: 'arrow has no visible bounding box' };
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const metrics = async () => arrow.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const transform = style.transform === 'none'
      ? new DOMMatrixReadOnly('matrix(1,0,0,1,0,0)')
      : new DOMMatrixReadOnly(style.transform);
    return {
      active: el.matches(':active'),
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      scaleX: Math.hypot(transform.a, transform.b),
      scaleY: Math.hypot(transform.c, transform.d),
      transform: style.transform,
      rippleOverlayOpacity: getComputedStyle(el, '::before').opacity,
    };
  });
  await page.mouse.move(x, y);
  await page.waitForTimeout(360);
  const rest = await metrics();
  await page.mouse.down();
  await page.waitForTimeout(125);
  const pressed = await metrics();
  await capture(page, `${surface}-arrow-pressed-mobile-${theme}.jpg`);
  await page.mouse.up();
  await page.mouse.move(Math.max(1, x - box.width - 20), Math.max(1, y - box.height - 20));
  await page.waitForTimeout(360);
  const released = await metrics();
  const centerShiftPx = Math.abs(pressed.centerY - rest.centerY);
  const passed = pressed.active
    && centerShiftPx <= 1
    && pressed.scaleX >= 0.95 && pressed.scaleX <= 0.99
    && pressed.scaleY >= 0.95 && pressed.scaleY <= 0.99
    && pressed.rippleOverlayOpacity === '0'
    && released.scaleX >= 0.985 && released.scaleX <= 1.015
    && released.scaleY >= 0.985 && released.scaleY <= 1.015;
  return {
    selector, theme, surface, pass: passed, centerShiftPx,
    rest, pressed, released,
    criteria: 'hold pointer: active state, <=1px vertical-center shift, scale .95-.99, no active pseudo overlay, scale resets near 1 after release',
  };
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    await Promise.all(Array.from(document.images, (img) => new Promise((resolve) => {
      if (img.complete) return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
      const timer = setTimeout(finish, 7000);
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
    })));
  });
  await page.waitForTimeout(200);
}
async function prepareFullPage(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    const step = Math.max(260, Math.floor(window.innerHeight * 0.68));
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 65));
    }
    window.scrollTo(0, 0);
  });
  await settle(page);
  await page.waitForTimeout(300);
}

async function auditPriceRenderingInMemory(browser, theme, sourceProducts, baseUrl, origin, audit, hardFailures) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  let scenario = 'confirmed';
  let scenarioProducts = [];
  let attemptedOrderPosts = 0;
  await context.addInitScript((mode) => {
    try { localStorage.setItem('sd-theme-mode', mode); } catch {}
  }, theme);
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === 'provinces.open-api.vn') {
      if (!['GET', 'HEAD'].includes(req.method())) {
        audit.writeRequestsBlocked.push({ theme, method: req.method(), url: req.url(), priceAuditFixture: true });
        return route.abort();
      }
      if (url.pathname === '/api/v2/p/') {
        return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify([{ code: 99, name: 'Tỉnh kiểm thử' }]) });
      }
      if (url.pathname === '/api/v2/p/99') {
        return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ wards: [{ code: 99001, name: 'Phường kiểm thử' }] }) });
      }
      return route.abort();
    }
    if (url.origin !== origin) {
      audit.externalRequestsBlocked.push({ theme, method: req.method(), url: req.url(), priceAuditFixture: true });
      return route.abort();
    }
    if (url.pathname === '/api/settings' && ['GET', 'HEAD'].includes(req.method())) {
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: '{}' });
    }
    if (url.pathname === '/api/products' && ['GET', 'HEAD'].includes(req.method())) {
      audit.mockedRequests.push({ theme, method: req.method(), url: req.url(), fixtureOnly: true, scenario: 'in-memory-price-' + scenario });
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(scenarioProducts) });
    }
    if (url.pathname === '/api/orders' && req.method() === 'POST') {
      attemptedOrderPosts++;
      return route.fulfill({ status: 409, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ error: 'Read-only price audit: order POST blocked.' }) });
    }
    if (!['GET', 'HEAD'].includes(req.method())) {
      audit.writeRequestsBlocked.push({ theme, method: req.method(), url: req.url(), priceAuditFixture: true });
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('console', (message) => {
    if (message.type() === 'error') audit.consoleErrors.push({ theme, message: message.text(), url: message.location()?.url || '', priceAuditFixture: true });
  });
  page.on('pageerror', (error) => audit.pageErrors.push({ theme, message: error.message, priceAuditFixture: true }));
  page.on('response', (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === origin) {
      audit.httpErrors.push({ theme, status: response.status(), url: response.url(), priceAuditFixture: true });
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin) && !String(request.failure()?.errorText || '').includes('ERR_ABORTED')) {
      audit.failedRequests.push({ theme, url: request.url(), failure: request.failure()?.errorText || 'unknown', priceAuditFixture: true });
    }
  });

  let visited = false;
  async function visit(nextScenario) {
    scenario = nextScenario;
    scenarioProducts = sourceProducts.map((product) => {
      if (nextScenario === 'confirmed') return { ...product, price: 1234567, sourcePriceConfirmed: true };
      if (nextScenario === 'unconfirmed') return { ...product, price: 1234567, sourcePriceConfirmed: false };
      return { ...product, price: null, sourcePriceConfirmed: true };
    });
    if (visited) {
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
    }
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) throw new Error('Price-audit preview page failed to load: ' + theme);
    visited = true;
    await page.locator('#catalogGrid .product-card').first().waitFor({ state: 'visible' });
    await page.evaluate(() => window.__sdDismissWelcome?.());
    await page.waitForFunction(() => !document.querySelector('#welcomeSplash'), null, { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(80);
    return page.evaluate(() => ({
      catalogPriceCount: Array.from(document.querySelectorAll('#catalogGrid .product-price')).filter((node) => node.getClientRects().length && node.textContent.trim()).length,
      featuredPriceCount: Array.from(document.querySelectorAll('#featuredGrid .product-price')).filter((node) => node.getClientRects().length && node.textContent.trim()).length,
      expectedLabel: new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(1234567) + '₫',
    }));
  }

  try {
    const confirmedCatalog = await visit('confirmed');
    await page.locator('#catalogGrid .product-open').first().click();
    const confirmedDetail = await page.locator('#detailPrice').evaluate((node) => ({ visible: !node.hidden && node.getClientRects().length > 0, text: node.textContent.trim() }));
    await page.locator('#detailClose').click();
    await page.locator('#catalogGrid .quick-add').first().click();
    await page.locator('#mobileCartNav').click();
    await page.waitForFunction(() => document.querySelector('#cartDrawer')?.classList.contains('open'));
    const confirmedCart = await page.evaluate(() => ({
      subtotal: document.querySelector('#cartSubtotal')?.textContent.trim() || '',
      rowPrice: document.querySelector('#cartList .cart-row-price')?.textContent.trim() || '',
    }));
    await page.locator('#cartCheckout').click();
    await page.waitForFunction(() => document.querySelector('#checkoutDrawer')?.classList.contains('open'));
    const confirmedCheckoutShowsAmount = await page.locator('#checkoutDrawer').innerText().then((value) => value.includes('1.234.567'));
    const confirmedPass = confirmedCatalog.catalogPriceCount > 0
      && confirmedCatalog.featuredPriceCount > 0
      && confirmedDetail.visible && confirmedDetail.text === confirmedCatalog.expectedLabel
      && confirmedCart.subtotal === confirmedCatalog.expectedLabel
      && confirmedCart.rowPrice === confirmedCatalog.expectedLabel
      && !confirmedCheckoutShowsAmount && attemptedOrderPosts === 0;
    audit.interactions.push({ theme, check: 'confirmed-price-renders-catalog-featured-detail-cart', pass: confirmedPass, result: {
      catalogPriceCount: confirmedCatalog.catalogPriceCount, featuredPriceCount: confirmedCatalog.featuredPriceCount,
      detail: confirmedDetail, cart: confirmedCart, checkoutShowsAmount: confirmedCheckoutShowsAmount,
      orderPosts: attemptedOrderPosts, fixtureOnly: true,
    }});
    if (!confirmedPass) hardFailures.push('Confirmed price rendering failed in catalogue/featured/detail/cart: ' + theme);

    const hiddenScenarios = [
      { key: 'unconfirmed', check: 'unconfirmed-price-stays-hidden-through-catalog-featured-detail-cart-checkout' },
      { key: 'null-hidden', check: 'null-price-stays-hidden-through-catalog-featured-detail-cart-checkout' },
    ];
    for (const testCase of hiddenScenarios) {
      const catalog = await visit(testCase.key);
      await page.locator('#catalogGrid .product-open').first().click();
      const detail = await page.locator('#detailPrice').evaluate((node) => ({ hidden: node.hidden, text: node.textContent.trim() }));
      await page.locator('#detailClose').click();
      await page.locator('#catalogGrid .quick-add').first().click();
      await page.locator('#mobileCartNav').click();
      await page.waitForFunction(() => document.querySelector('#cartDrawer')?.classList.contains('open'));
      const cart = await page.evaluate(() => ({
        subtotal: document.querySelector('#cartSubtotal')?.textContent.trim() || '',
        rowPrice: document.querySelector('#cartList .cart-row-price')?.textContent.trim() || '',
      }));
      await page.locator('#cartCheckout').click();
      await page.waitForFunction(() => document.querySelector('#checkoutDrawer')?.classList.contains('open'));
      const checkoutShowsAmount = await page.locator('#checkoutDrawer').innerText().then((value) => value.includes('1.234.567'));
      const pass = catalog.catalogPriceCount === 0 && catalog.featuredPriceCount === 0
        && detail.hidden && detail.text === ''
        && cart.subtotal === 'Chờ xác nhận giá' && cart.rowPrice === 'Giá sẽ được xác nhận'
        && !checkoutShowsAmount && attemptedOrderPosts === 0;
      audit.interactions.push({ theme, check: testCase.check, pass, result: {
        catalogPriceCount: catalog.catalogPriceCount, featuredPriceCount: catalog.featuredPriceCount,
        detail, cart, checkoutShowsAmount, orderPosts: attemptedOrderPosts, fixtureOnly: true,
      }});
      if (!pass) hardFailures.push('Unconfirmed/null price leaked or was counted in cart/checkout: ' + testCase.key + ' ' + theme);
    }
  } finally {
    await context.close();
  }
}

await ensureDir(outDir);
const rawProducts = JSON.parse(await fs.readFile(path.join(root, 'data', 'legacy-products.json'), 'utf8'));
const products = [];
for (const product of rawProducts) {
  if (!Array.isArray(product.images)) continue;
  const images = [];
  for (const image of product.images) {
    const rel = String(image).replace(/^\.\//, '');
    const resolved = path.resolve(publicRoot, rel);
    if (resolved.startsWith(publicRoot + path.sep) && await exists(resolved)) images.push(image);
  }
  if (images.length) products.push({ ...product, images });
}
if (products.length < 8) throw new Error('Visual preview stopped: insufficient local repository product images.');
audit.productFixtureCount = products.length;

const browser = await chromium.launch({ headless: true });
try {
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      colorScheme: theme,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await context.addInitScript((mode) => {
      try { localStorage.setItem('sd-theme-mode', mode); } catch {}
    }, theme);
    // Keep only the intro auto-dismiss timer alive long enough to capture the genuine splash.
    // The script still dismisses it manually immediately after the screenshot below.
    await context.addInitScript(() => {
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => {
        const source = typeof callback === 'function' ? String(callback) : '';
        const isWelcomeAutoDismiss = source.includes("s.classList.add('is-leaving')")
          && (delay === 500 || delay === 2500);
        return nativeSetTimeout(callback, isWelcomeAutoDismiss ? 10000 : delay, ...args);
      };
    });

    // Block every external request and every non-read request.
    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin !== origin) {
        audit.externalRequestsBlocked.push({ method: req.method(), url: req.url() });
        return route.abort();
      }
      if (!['GET', 'HEAD'].includes(req.method())) {
        audit.writeRequestsBlocked.push({ method: req.method(), url: req.url() });
        return route.abort();
      }
      return route.continue();
    });
    // This test-only API response is served from source data and is never written anywhere.
    await context.route('**/api/settings', (route) => route.fulfill({
      status: 200, contentType: 'application/json; charset=utf-8', body: '{}',
    }));
    // Offline-only fixture: keep address inputs usable in screenshots without calling the live administrative API.
    await context.route('https://provinces.open-api.vn/api/v2/p/', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify([{ code: 99, name: 'Tỉnh kiểm thử' }]),
    }));
    await context.route(/https:\/\/provinces\.open-api\.vn\/api\/v2\/p\/99\?depth=2$/, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ wards: [{ code: 99001, name: 'Phường kiểm thử' }] }),
    }));
    await context.route('**/api/products', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(products),
    }));
    // Mock only order POSTs for the end-to-end UI test; this fixture is fulfilled in memory and never reaches the local server or D1.
    await context.route('**/api/orders', async (route) => {
      if (route.request().method() !== 'POST') return route.abort();
      audit.mockedRequests.push({ theme, method: 'POST', url: route.request().url(), fixtureOnly: true });
      return route.fulfill({
        status: 201,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          ok: true,
          orderNumber: 'SD-TEST-' + theme.toUpperCase(),
          status: 'pending_confirmation',
          priceConfirmationRequired: true,
          total: null,
          message: 'Đã tiếp nhận yêu cầu kiểm thử.',
        }),
      });
    });
    // Warranty lookup success-empty and HTTP error states are mocked in memory only.
    await context.route('**/api/warranty-lookup', async (route) => {
      if (route.request().method() !== 'POST') return route.abort();
      let payload = {};
      try { payload = JSON.parse(route.request().postData() || '{}'); } catch {}
      const isErrorScenario = payload.lookup === 'SIMULATE-ERROR';
      audit.mockedRequests.push({
        theme,
        method: 'POST',
        url: route.request().url(),
        fixtureOnly: true,
        scenario: isErrorScenario ? 'warranty-error-state' : 'warranty-no-match-state',
      });
      return route.fulfill({
        status: isErrorScenario ? 503 : 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(isErrorScenario
          ? { error: 'Dịch vụ tra cứu kiểm thử tạm thời không khả dụng.' }
          : { warranties: [] }),
      });
    });

    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const message = m.text();
      const location = m.location?.() || {};
      const expectedWarrantyFixture503 = /Failed to load resource: the server responded with a status of 503/i.test(message)
        && audit.mockedRequests.some(request => request.theme === theme
          && request.fixtureOnly === true
          && request.scenario === 'warranty-error-state')
        && String(location.url || '').includes('/api/warranty-lookup');
      if (expectedWarrantyFixture503) {
        audit.expectedMockErrors = audit.expectedMockErrors || [];
        audit.expectedMockErrors.push({ theme, url: location.url, message, fixtureOnly: true });
        return;
      }
      audit.consoleErrors.push({ theme, message, url: location.url || '' });
    });
    page.on('pageerror', (e) => audit.pageErrors.push({ theme, message: e.message }));
    page.on('response', (res) => {
      const expectedWarrantyFixtureError = res.url().includes('/api/warranty-lookup')
        && res.status() === 503;
      if (res.status() >= 400 && new URL(res.url()).origin === origin && !expectedWarrantyFixtureError) {
        audit.httpErrors.push({ theme, status: res.status(), url: res.url() });
      }
    });
    page.on('requestfailed', (req) => {
      if (req.url().startsWith(origin) && !String(req.failure()?.errorText || '').includes('ERR_ABORTED')) {
        audit.failedRequests.push({ theme, url: req.url(), failure: req.failure()?.errorText || 'unknown' });
      }
    });

    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) throw new Error('Local storefront failed to load: ' + theme);

    // Audit and capture the real intro before the page's 2.5s auto-dismiss.
    await page.setViewportSize({ width: 390, height: 844 });
    const splash = page.locator('#welcomeSplash');
    await splash.waitFor({ state: 'visible' });
    const logoLoaded = await page.waitForFunction(() => {
      const logo = document.querySelector('#welcomeSplash .welcome-logo');
      return !!logo && logo.complete && logo.naturalWidth > 0;
    }, null, { timeout: 1800 }).then(() => true).catch(() => false);
    const splashState = await page.evaluate(() => {
      const node = document.querySelector('#welcomeSplash');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const lightTexture = node.querySelector('.welcome-texture--light');
      const darkTexture = node.querySelector('.welcome-texture--dark');
      return {
        role: node.getAttribute('role'),
        modal: node.getAttribute('aria-modal'),
        label: node.getAttribute('aria-label'),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        visible: getComputedStyle(node).visibility === 'visible',
        opacity: Number(getComputedStyle(node).opacity),
        leaving: node.classList.contains('is-leaving'),
        title: node.querySelector('#welcomeTitleLine1')?.textContent || '',
        hasSkip: !!node.querySelector('#skipIntro'),
        lightTextureOpacity: lightTexture ? getComputedStyle(lightTexture).opacity : null,
        darkTextureOpacity: darkTexture ? getComputedStyle(darkTexture).opacity : null,
      };
    });
    const splashPass = !!splashState
      && splashState.role === 'dialog'
      && splashState.modal === 'true'
      && !!splashState.label
      && splashState.width >= splashState.viewportWidth - 1
      && splashState.height >= splashState.viewportHeight - 1
      && splashState.visible
      && splashState.opacity >= 0.95
      && !splashState.leaving
      && !!splashState.title.trim()
      && splashState.hasSkip
      && logoLoaded;
    audit.interactions.push({ theme, check: 'welcome-splash-fullscreen-brand-and-dismiss-control', pass: splashPass, result: { ...splashState, logoLoaded } });
    if (!splashPass) hardFailures.push('Welcome splash missing accessible full-screen bounds, brand logo, title or skip control: ' + theme);
    await capture(page, 'welcome-splash-' + theme + '.jpg');
    await page.evaluate(() => window.__sdDismissWelcome?.());
    await page.waitForFunction(() => !document.querySelector('#welcomeSplash'), null, { timeout: 2000 }).catch(() => {});
    await page.locator('#catalogGrid .product-card').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(3600);
    await settle(page);
    const startup = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      mode: document.documentElement.dataset.themeMode || 'auto',
      cards: document.querySelectorAll('#catalogGrid .product-card').length,
      heroImage: (() => {
        const img = document.querySelector('#heroProductImage');
        return {
          present: !!img,
          loaded: !!img && img.complete && img.naturalWidth > 0,
          source: img?.getAttribute('src') || '',
          hidden: !!img?.hidden,
          sku: img?.dataset.productSku || '',
          status: img?.dataset.productImageStatus || '',
        };
      })(),
      mobileNav: (() => { const nav = document.querySelector('#mobileBottomNav'); return { present: !!nav, visible: !!nav && getComputedStyle(nav).display !== 'none', tabs: nav?.querySelectorAll('[data-mobile-tab]').length || 0 }; })(),
      title: document.title,
    }));
    // Owner-requested pause: hidden Hero and collapsed frame are the expected state.
    const heroImagePass = startup.heroImage.present
      && startup.heroImage.hidden
      && startup.heroImage.source === ''
      && startup.heroImage.status === 'temporarily-disabled-owner-request';
    audit.interactions.push({
      theme,
      check: 'hero-image-temporarily-hidden-owner-request',
      pass: heroImagePass,
      result: { ...startup.heroImage, expectedState: 'hidden-no-src-owner-request' },
    });
    if (!heroImagePass) hardFailures.push('Hero must remain temporarily hidden without a source during the owner-requested pause: ' + theme);
    audit.interactions.push({ theme, check: 'mobile-bottom-navigation-visible-with-four-tabs', pass: startup.mobileNav.present && startup.mobileNav.visible && startup.mobileNav.tabs === 4 });
    if (!startup.mobileNav.present || !startup.mobileNav.visible || startup.mobileNav.tabs !== 4) hardFailures.push('Mobile bottom navigation missing or incomplete: ' + theme);

    // Real 235-product fixture remains read-only; unknown source prices should stay absent.
    const priceVisibility = await page.evaluate(() => {
      const visiblePriceNodes = Array.from(document.querySelectorAll('#catalogGrid .product-price, #featuredGrid .product-price'))
        .filter(node => node.getClientRects().length && node.textContent.trim());
      const detailPrice = document.querySelector('#detailPrice');
      return {
        catalogPriceCount: visiblePriceNodes.length,
        detailPriceInitiallyHidden: !detailPrice || detailPrice.hidden,
        fixtureHasNoUnverifiedVisiblePrices: visiblePriceNodes.length === 0
      };
    });
    const priceVisibilityPass = priceVisibility.fixtureHasNoUnverifiedVisiblePrices && priceVisibility.detailPriceInitiallyHidden;
    audit.interactions.push({ theme, check: 'unverified-real-fixture-prices-stay-hidden', pass: priceVisibilityPass, result: priceVisibility });
    if (!priceVisibilityPass) hardFailures.push('Unverified real-fixture price became visible in storefront: ' + theme);

    // Positive/negative rendering paths use a separate context with intercepted in-memory prices.
    // It never captures images and never sends an order; POST attempts are explicitly blocked.
    await auditPriceRenderingInMemory(browser, theme, products, baseUrl, origin, audit, hardFailures);

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(80);
      const metric = await page.evaluate(() => {
        const w = innerWidth;
        const offenders = Array.from(document.querySelectorAll('body *')).filter((el) => {
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return false;
          if (s.position === 'fixed' && r.width >= w - 2) return false;
          return r.left < -2 || r.right > w + 2;
        }).slice(0, 8).map((el) => ({
          tag: el.tagName.toLowerCase(), id: el.id || '',
          className: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right),
        }));
        return {
          viewportWidth: w,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > w + 1 || document.body.scrollWidth > w + 1,
          offenders,
        };
      });
      audit.responsive.push({ theme, viewport: vp.name, ...metric });
      if (vp.name === 'mobile-390') {
        const visualMetrics = await page.evaluate(() => {
          const box = (selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
          };
          const service = document.querySelector('.service-strip .service');
          const sr = service?.getBoundingClientRect();
          return {
            hero: box('#home.hero'),
            heroCopy: box('#home .hero-copy'),
            heroImage: box('#home .hero-visual'),
            commitmentStrip: box('.service-strip'),
            firstCommitment: sr ? { top: Math.round(sr.top), height: Math.round(sr.height) } : null,
            orderCta: box('#orderDetailsToggle'),
            featuredHeading: box('#featured .section-head'),
            artMosaic: box('#collections .mosaic-compact'),
            artMainCard: box('#collections .mosaic-card.art-main'),
            artHeroImageLoaded: (() => { const img = document.querySelector('#artSlide'); return !!img && img.complete && img.naturalWidth > 0; })(),
            artHeroCopyHidden: (() => {
              const title = document.querySelector('#collections .art-main .mosaic-title');
              const sub = document.querySelector('#collections .art-main .mosaic-sub');
              return !!title && !!sub && getComputedStyle(title).display === 'none' && getComputedStyle(sub).display === 'none';
            })(),
            artHeroCtaVisible: (() => {
              const link = document.querySelector('#collections .art-main .text-link');
              const r = link?.getBoundingClientRect();
              return !!link && !!r && r.width > 0 && r.height > 0 && getComputedStyle(link).display !== 'none';
            })(),
            artHeroControlCount: document.querySelectorAll('#collections .art-main .slide-controls button').length,
            artSmallCards: Array.from(document.querySelectorAll('#collections .mosaic-card.small')).map((el) => {
              const r = el.getBoundingClientRect();
              return { width: Math.round(r.width), height: Math.round(r.height) };
            }),
            viewportWidth: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
          };
        });
        audit.layoutMetrics.push({ theme, viewport: vp.name, ...visualMetrics });
        const artMosaicOk = !!visualMetrics.artMosaic && visualMetrics.artMosaic.height >= 300
          && !!visualMetrics.artMainCard && visualMetrics.artMainCard.height >= 180
          && visualMetrics.artSmallCards.length === 2
          && visualMetrics.artSmallCards.every((card) => card.width >= 100 && card.height >= 100);
        audit.interactions.push({ theme, check: 'mobile-editorial-mosaic-has-visible-grid-rows', pass: artMosaicOk, result: {
          mosaicHeight: visualMetrics.artMosaic?.height ?? null,
          mainCardHeight: visualMetrics.artMainCard?.height ?? null,
          smallCards: visualMetrics.artSmallCards,
        } });
        if (!artMosaicOk) hardFailures.push('The Art mobile mosaic collapsed or has undersized cards: ' + theme);
        const artHeroPass = visualMetrics.artHeroImageLoaded
          && visualMetrics.artHeroCopyHidden
          && visualMetrics.artHeroCtaVisible
          && visualMetrics.artHeroControlCount === 2;
        audit.interactions.push({ theme, check: 'mobile-art-hero-image-emphasis-with-working-controls-and-cta', pass: artHeroPass, result: {
          imageLoaded: visualMetrics.artHeroImageLoaded,
          copyHidden: visualMetrics.artHeroCopyHidden,
          ctaVisible: visualMetrics.artHeroCtaVisible,
          controlCount: visualMetrics.artHeroControlCount,
        } });
        if (!artHeroPass) hardFailures.push('The Art mobile hero lost its image, CTA or navigation controls: ' + theme);
      }
    }

    // Capture every requested viewport in both themes, not only the representative three.
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await capture(page, vp.name + '-' + theme + '-viewport.jpg');
    }
    for (const vp of [
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'desktop-1366', width: 1366, height: 768 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await prepareFullPage(page);
      await capture(page, vp.name + '-' + theme + '-full.jpg', true);
    }

    // The contact footer is a key reference area; capture it at readable mobile scale rather than only in a long-page thumbnail.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const root = document.documentElement;
      root.dataset.previewPreviousScrollBehavior = root.style.scrollBehavior || '';
      root.style.scrollBehavior = 'auto';
      const contact = document.querySelector('#contact');
      if (contact) window.scrollTo(0, window.scrollY + contact.getBoundingClientRect().top);
    });
    await settle(page);
    const contactScreen = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#contact .contact-link')];
      const visibleRows = rows.filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      });
      const address = rows.find((el) => el.textContent.includes('Địa chỉ'));
      const contactGrid = document.querySelector('#contact .contact-grid');
      const warranty = document.querySelector('footer .warranty-help');
      const warrantyForm = document.querySelector('footer #warrantyLookupForm');
      return {
        rowCount: rows.length,
        visibleRowCount: visibleRows.length,
        contactColumnCount: contactGrid ? getComputedStyle(contactGrid).gridTemplateColumns.trim().split(/\\s+/).length : 0,
        fullAddressVisible: !!address && address.textContent.includes('Hẻm 48 Võ Trường Toàn, Đà Lạt, Lâm Đồng, Việt Nam'),
        zaloActionPresent: !!document.querySelector('#contact a[href="https://zalo.me/0827049192"]'),
        phoneActionPresent: !!document.querySelector('#contact a[href="tel:+84827049192"]'),
        contactTitleVisible: !!document.querySelector('#footer-contact-title') && document.querySelector('#footer-contact-title').getBoundingClientRect().height > 0,
        warrantySeparatedFromContact: !!warranty && !document.querySelector('#contact').contains(warranty),
        warrantyFormPreserved: !!warrantyForm && !!warrantyForm.querySelector('#warrantyLookupSubmit'),
      };
    });
    const contactPass = contactScreen.rowCount === 6
      && contactScreen.visibleRowCount === 6
      && contactScreen.contactColumnCount === 1
      && contactScreen.fullAddressVisible
      && contactScreen.zaloActionPresent
      && contactScreen.phoneActionPresent
      && contactScreen.contactTitleVisible
      && contactScreen.warrantySeparatedFromContact
      && contactScreen.warrantyFormPreserved;
    audit.interactions.push({ theme, check: 'mobile-contact-single-column-with-separate-warranty-support', pass: contactPass, result: contactScreen });
    if (!contactPass) hardFailures.push('Mobile contact layout or separate warranty support failed: ' + theme);
    await capture(page, 'footer-contact-mobile-' + theme + '.jpg');
    await captureElement(page, '.warranty-help', 'warranty-support-mobile-' + theme + '.jpg');

    // Exercise a legitimate no-match result without inventing a warranty record.
    await page.locator('#warrantyLookupForm').scrollIntoViewIfNeeded();
    await page.locator('#warrantyLookupValue').fill('NO-MATCH-TEST');
    await page.locator('#warrantyLookupSubmit').click();
    await page.waitForFunction(() => document.querySelector('#warrantyMessage')?.textContent.includes('Đã tra cứu xong'));
    const warrantyEmptyState = await page.evaluate(() => ({
      message: document.querySelector('#warrantyMessage')?.textContent || '',
      resultVisible: document.querySelector('#warrantyResults')?.hidden === false,
      noRecordMessage: document.querySelector('#warrantyRecords')?.textContent.includes('Không tìm thấy bản ghi bảo hành phù hợp.') || false,
      claimFormHidden: document.querySelector('#warrantyClaimForm')?.hidden === true,
      submitEnabled: !document.querySelector('#warrantyLookupSubmit')?.disabled,
    }));
    const warrantyEmptyPass = warrantyEmptyState.message.includes('Đã tra cứu xong')
      && warrantyEmptyState.resultVisible && warrantyEmptyState.noRecordMessage
      && warrantyEmptyState.claimFormHidden && warrantyEmptyState.submitEnabled;
    audit.interactions.push({ theme, check: 'warranty-no-match-empty-state-and-reenabled-submit', pass: warrantyEmptyPass, result: warrantyEmptyState });
    if (!warrantyEmptyPass) hardFailures.push('Warranty no-match state or submit reset failed: ' + theme);

    // Simulate a transient API error and confirm it is surfaced to the user without leaving loading disabled.
    await page.locator('#warrantyLookupValue').fill('SIMULATE-ERROR');
    await page.locator('#warrantyLookupSubmit').click();
    await page.waitForFunction(() => document.querySelector('#warrantyMessage')?.textContent.includes('Dịch vụ tra cứu kiểm thử tạm thời không khả dụng.'));
    const warrantyErrorState = await page.evaluate(() => ({
      message: document.querySelector('#warrantyMessage')?.textContent || '',
      submitEnabled: !document.querySelector('#warrantyLookupSubmit')?.disabled,
      submitLabel: document.querySelector('#warrantyLookupSubmit')?.textContent?.trim() || '',
    }));
    const warrantyErrorPass = warrantyErrorState.message.includes('Dịch vụ tra cứu kiểm thử tạm thời không khả dụng.')
      && warrantyErrorState.submitEnabled && warrantyErrorState.submitLabel === 'Tra cứu bảo hành';
    audit.interactions.push({ theme, check: 'warranty-transient-error-feedback-and-reenabled-submit', pass: warrantyErrorPass, result: warrantyErrorState });
    if (!warrantyErrorPass) hardFailures.push('Warranty transient error feedback or submit reset failed: ' + theme);

    await page.evaluate(() => {
      const root = document.documentElement;
      const previous = root.dataset.previewPreviousScrollBehavior || '';
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      root.style.scrollBehavior = previous;
      delete root.dataset.previewPreviousScrollBehavior;
    });

    // Capture the two most important reference sections at mobile viewport size.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((selector) => {
      document.documentElement.style.scrollBehavior = 'auto';
      const element = document.querySelector(selector);
      if (element) window.scrollTo(0, Math.max(0, window.scrollY + element.getBoundingClientRect().top - 92));
    }, '#products');
    await settle(page);
    const productGridScreen = await page.evaluate(() => {
      const grid = document.querySelector('#catalogGrid');
      const cards = [...document.querySelectorAll('#catalogGrid .product-card')];
      const first = cards[0]?.getBoundingClientRect();
      const second = cards[1]?.getBoundingClientRect();
      const title = cards[0]?.querySelector('.product-title');
      const info = cards[0]?.querySelector('.product-info');
      const quickAdd = cards[0]?.querySelector('.quick-add');
      return {
        gridVisible: !!grid && grid.getBoundingClientRect().height > 0,
        productCount: cards.length,
        firstRowHasTwoColumns: !!first && !!second && Math.abs(first.top - second.top) <= 4 && second.left > first.left,
        firstCardWidth: first ? Math.round(first.width) : 0,
        secondCardWidth: second ? Math.round(second.width) : 0,
        titleFontSize: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
        infoHeight: info ? Math.round(info.getBoundingClientRect().height) : 0,
        quickAddSize: quickAdd ? Math.round(quickAdd.getBoundingClientRect().width) : 0,
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    const productGridPass = productGridScreen.gridVisible
      && productGridScreen.productCount >= 4
      && productGridScreen.firstRowHasTwoColumns
      && productGridScreen.firstCardWidth >= 100
      && productGridScreen.secondCardWidth >= 100
      && productGridScreen.documentWidth <= productGridScreen.viewportWidth + 1;
    audit.interactions.push({ theme, check: 'mobile-product-grid-two-column-layout', pass: productGridPass, result: productGridScreen });
    if (!productGridPass) hardFailures.push('Mobile product grid was not a visible two-column layout: ' + theme);
    const productDensityPass = productGridScreen.titleFontSize > 0
      && productGridScreen.titleFontSize <= 13
      && productGridScreen.infoHeight <= 130
      && productGridScreen.quickAddSize >= 26;
    audit.interactions.push({ theme, check: 'mobile-product-card-compact-density-and-touch-target', pass: productDensityPass, result: productGridScreen });
    if (!productDensityPass) hardFailures.push('Mobile product card density or quick-add target failed: ' + theme);
    await capture(page, 'products-grid-mobile-' + theme + '.jpg');

    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) window.scrollTo(0, Math.max(0, window.scrollY + element.getBoundingClientRect().top - 92));
    }, '#collections');
    await settle(page);
    await capture(page, 'art-section-mobile-' + theme + '.jpg');
    await captureElement(page, '#contact', 'contact-section-element-mobile-' + theme + '.jpg');
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);

    // Theme toggle writes only browser localStorage; no settings endpoint is called.
    await page.locator('#mobileAccountNav').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'visible' });
    const before = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#accountThemeAction').click();
    const after = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#accountThemeAction').click();
    const restored = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#accountClose').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'hidden' });
    const togglePass = before !== after && before === restored;
    audit.interactions.push({ theme, check: 'manual-theme-toggle-round-trip', pass: togglePass });
    if (!togglePass) hardFailures.push('Theme toggle failed: ' + theme);

    // Choose an existing catalog item with a real multi-image gallery instead of testing a single-image item.
    const galleryOpen = page.locator('#catalogGrid .product-card[data-product="sneakers-new-sneaker-contrast"] .product-open');
    await galleryOpen.waitFor({ state: 'visible' });
    await galleryOpen.click();
    const detail = page.locator('#productOverlay.open');
    await detail.waitFor({ state: 'visible' });
    await settle(page);
    const galleryState = await page.evaluate(() => ({
      dialogSemantics: document.querySelector('#productOverlay')?.getAttribute('role') === 'dialog'
        && document.querySelector('#productOverlay')?.getAttribute('aria-modal') === 'true'
        && document.querySelector('#productOverlay')?.getAttribute('aria-hidden') === 'false'
        && !document.querySelector('#productOverlay')?.hasAttribute('inert'),
      focusOnClose: document.activeElement?.id === 'detailClose',
      sku: document.querySelector('#detailSku')?.textContent || '',
      url: location.pathname,
      thumbnailCount: document.querySelectorAll('#detailThumbs .detail-thumb').length,
    }));
    const detailArrowPress = await auditArrowPressInPlace(page, '#detailNext', theme, 'detail-gallery', audit);
    audit.interactions.push({ theme, check: 'detail-gallery-arrow-press-stays-centered-no-ripple', ...detailArrowPress });
    if (!detailArrowPress.pass) hardFailures.push('Detail gallery arrow moved vertically, lost pressed scale, or showed an overlay: ' + theme);
    const detailSourceBeforeArrow = await page.locator('#detailMainImage').getAttribute('src');
    await page.locator('#detailNext').click();
    await page.waitForFunction((before) => document.querySelector('#detailMainImage')?.getAttribute('src') !== before, detailSourceBeforeArrow);
    const detailSourceAfterNext = await page.locator('#detailMainImage').getAttribute('src');
    await page.locator('#detailPrev').click();
    await page.waitForFunction((before) => document.querySelector('#detailMainImage')?.getAttribute('src') === before, detailSourceBeforeArrow);
    const detailArrowNavigationPass = Boolean(detailSourceBeforeArrow)
      && Boolean(detailSourceAfterNext)
      && detailSourceAfterNext !== detailSourceBeforeArrow
      && await page.locator('#detailMainImage').getAttribute('src') === detailSourceBeforeArrow;
    audit.interactions.push({ theme, check: 'detail-gallery-next-then-previous-restores-image', pass: detailArrowNavigationPass,
      result: { before: detailSourceBeforeArrow, afterNext: detailSourceAfterNext, afterPrevious: await page.locator('#detailMainImage').getAttribute('src') } });
    if (!detailArrowNavigationPass) hardFailures.push('Detail gallery previous/next arrows did not restore the original image: ' + theme);
    const expectedRoute = galleryState.url === '/sanpham/sneaker/sneakers-new-sneaker-contrast';
    const galleryBasePass = galleryState.dialogSemantics && galleryState.focusOnClose
      && galleryState.sku.includes('Chưa được cung cấp')
      && expectedRoute && galleryState.thumbnailCount >= 2;
    audit.interactions.push({ theme, check: 'open-multi-image-detail-and-route', pass: galleryBasePass, result: galleryState });
    if (!galleryBasePass) hardFailures.push('Multi-image detail route/dialog did not open correctly: ' + theme);

    // Verify the actual customer-facing Zalo message for a fixture with no verified SKU.
    await page.evaluate(() => {
      window.__sdOriginalOpen = window.open.bind(window);
      window.__sdConsultCopiedText = '';
      window.__sdConsultOpenedUrl = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (value) => { window.__sdConsultCopiedText = String(value); } },
      });
      window.open = (url) => {
        window.__sdConsultOpenedUrl = String(url || '');
        return { closed: false, opener: null };
      };
    });
    await page.locator('#detailZalo').click();
    await page.waitForFunction(() => window.__sdConsultCopiedText.length > 0);
    await page.waitForFunction(() => window.__sdConsultOpenedUrl === 'https://zalo.me/0827049192', null, { timeout: 3000 });
    const zaloConsultState = await page.evaluate(() => ({
      message: window.__sdConsultCopiedText,
      openedUrl: window.__sdConsultOpenedUrl,
      title: document.querySelector('#detailTitle')?.textContent || '',
    }));
    const zaloMessagePass = zaloConsultState.message.startsWith('Chào SinDarealest, tôi muốn tư vấn/đặt hàng sản phẩm ')
      && zaloConsultState.message.includes(zaloConsultState.title)
      && zaloConsultState.message.includes('mã SKU chưa được cung cấp')
      && !/\b(null|undefined|SD\d{3})\b/i.test(zaloConsultState.message)
      && zaloConsultState.openedUrl === 'https://zalo.me/0827049192';
    audit.interactions.push({ theme, check: 'zalo-message-uses-product-title-without-unverified-sku', pass: zaloMessagePass, result: zaloConsultState });
    if (!zaloMessagePass) hardFailures.push('Zalo consultation message disclosed a fabricated SKU or omitted the product title: ' + theme);
    await page.evaluate(() => {
      if (window.__sdOriginalOpen) window.open = window.__sdOriginalOpen;
      delete window.__sdOriginalOpen;
      delete window.__sdConsultCopiedText;
      delete window.__sdConsultOpenedUrl;
      try { delete navigator.clipboard; } catch {}
    });
    const firstThumbSrc = await page.locator('#detailThumbs .detail-thumb').first().locator('img').getAttribute('src');
    const secondThumbSrc = await page.locator('#detailThumbs .detail-thumb').nth(1).locator('img').getAttribute('src');
    await page.locator('#detailThumbs .detail-thumb').nth(1).click();
    await page.waitForFunction((expected) => document.querySelector('#detailMainImage')?.getAttribute('src') === expected, secondThumbSrc);
    const secondImageSelected = await page.locator('#detailMainImage').getAttribute('src') === secondThumbSrc
      && await page.locator('#detailThumbs .detail-thumb').nth(1).getAttribute('class').then(v => v.includes('active'));
    audit.interactions.push({ theme, check: 'product-thumbnail-changes-main-image', pass: secondImageSelected, result: { firstThumbSrc, secondThumbSrc, active: secondImageSelected } });
    if (!secondImageSelected) hardFailures.push('Selecting a gallery thumbnail did not change the main image: ' + theme);
    await page.locator('#detailThumbs .detail-thumb').first().click();
    await page.waitForFunction((expected) => document.querySelector('#detailMainImage')?.getAttribute('src') === expected, firstThumbSrc);
    await page.locator('#detailZoom').click();
    await page.locator('#sdFullscreenViewer.open').waitFor({ state: 'visible' });
    await settle(page);
    const fullscreenState = await page.evaluate(() => ({
      dialogSemantics: document.querySelector('#sdFullscreenViewer')?.getAttribute('role') === 'dialog'
        && document.querySelector('#sdFullscreenViewer')?.getAttribute('aria-modal') === 'true'
        && document.querySelector('#sdFullscreenViewer')?.getAttribute('aria-hidden') === 'false'
        && !document.querySelector('#sdFullscreenViewer')?.hasAttribute('inert'),
      focusOnClose: document.activeElement?.id === 'sdFullscreenClose',
    }));
    const fullscreenArrowPress = await auditArrowPressInPlace(page, '#sdFullscreenNext', theme, 'fullscreen-gallery', audit);
    audit.interactions.push({ theme, check: 'fullscreen-gallery-arrow-press-stays-centered-no-ripple', ...fullscreenArrowPress });
    if (!fullscreenArrowPress.pass) hardFailures.push('Fullscreen gallery arrow moved vertically, lost pressed scale, or showed an overlay: ' + theme);
    const fullscreenCountBeforeArrow = (await page.locator('#sdFullscreenCount').textContent() || '').trim();
    await page.locator('#sdFullscreenNext').click();
    await page.waitForFunction((before) => (document.querySelector('#sdFullscreenCount')?.textContent || '').trim() !== before, fullscreenCountBeforeArrow);
    const fullscreenCountAfterNext = (await page.locator('#sdFullscreenCount').textContent() || '').trim();
    await page.locator('#sdFullscreenPrev').click();
    await page.waitForFunction((before) => (document.querySelector('#sdFullscreenCount')?.textContent || '').trim() === before, fullscreenCountBeforeArrow);
    const fullscreenArrowNavigationPass = Boolean(fullscreenCountBeforeArrow)
      && fullscreenCountAfterNext !== fullscreenCountBeforeArrow
      && (await page.locator('#sdFullscreenCount').textContent() || '').trim() === fullscreenCountBeforeArrow;
    audit.interactions.push({ theme, check: 'fullscreen-gallery-next-then-previous-restores-image', pass: fullscreenArrowNavigationPass,
      result: { before: fullscreenCountBeforeArrow, afterNext: fullscreenCountAfterNext, afterPrevious: (await page.locator('#sdFullscreenCount').textContent() || '').trim() } });
    if (!fullscreenArrowNavigationPass) hardFailures.push('Fullscreen gallery previous/next arrows did not restore the original image: ' + theme);
    const fullscreenPass = fullscreenState.dialogSemantics && fullscreenState.focusOnClose;
    audit.interactions.push({ theme, check: 'fullscreen-gallery-dialog-and-focus', pass: fullscreenPass, result: fullscreenState });
    if (!fullscreenPass) hardFailures.push('Fullscreen product gallery dialog state failed: ' + theme);
    await capture(page, 'fullscreen-detail-mobile-' + theme + '.jpg');
    await page.keyboard.press('Escape');
    await page.locator('#sdFullscreenViewer.open').waitFor({ state: 'hidden' });
    const fullscreenClosedAndDetailRemains = await page.locator('#productOverlay.open').count() === 1
      && await page.locator('#sdFullscreenViewer').evaluate(el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true');
    audit.interactions.push({ theme, check: 'escape-closes-fullscreen-only', pass: fullscreenClosedAndDetailRemains });
    if (!fullscreenClosedAndDetailRemains) hardFailures.push('Escape did not close only the fullscreen viewer: ' + theme);
    await capture(page, 'detail-mobile-' + theme + '.jpg');
    await page.keyboard.press('Escape');
    await page.locator('#productOverlay.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => location.pathname === '/');
    const detailClosedAndInert = await page.locator('#productOverlay').evaluate(el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true');
    audit.interactions.push({ theme, check: 'escape-closes-detail-and-restores-route', pass: detailClosedAndInert });
    if (!detailClosedAndInert) hardFailures.push('Product detail did not close or restore route: ' + theme);

    // Verify browser Back closes an open product overlay and restores the catalog URL.
    // The marker entry makes this deterministic even when Playwright starts at a fresh origin.
    await page.evaluate(() => history.pushState({ auditBackMarker: true }, '', '/'));
    await page.locator('#catalogGrid .product-card .product-open').first().click();
    await page.locator('#productOverlay.open').waitFor({ state: 'visible' });
    const routeBeforeBack = await page.evaluate(() => location.pathname);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('#productOverlay')?.classList.contains('open'));
    await page.waitForFunction(() => location.pathname === '/');
    const backNavigationState = await page.evaluate(() => ({
      pathname: location.pathname,
      overlayClosed: !document.querySelector('#productOverlay')?.classList.contains('open'),
      overlayInert: document.querySelector('#productOverlay')?.hasAttribute('inert') === true,
      overlayHidden: document.querySelector('#productOverlay')?.getAttribute('aria-hidden') === 'true',
    }));
    const backNavigationPass = routeBeforeBack.startsWith('/sanpham/')
      && backNavigationState.pathname === '/'
      && backNavigationState.overlayClosed
      && backNavigationState.overlayInert
      && backNavigationState.overlayHidden;
    audit.interactions.push({ theme, check: 'browser-back-closes-product-overlay-and-restores-catalog', pass: backNavigationPass, result: { routeBeforeBack, ...backNavigationState } });
    if (!backNavigationPass) hardFailures.push('Browser Back did not close product detail and restore catalog route: ' + theme);

    await page.locator('#catalogGrid .mini-add').first().click();
    await page.locator('#catalogGrid .mini-add').nth(1).click();
    await page.locator('#cartOpen').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#cartClose').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'hidden' });
    await page.locator('#mobileCartNav').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'visible' });
    await settle(page);
    const cartRowCount = await page.locator('#cartList .cart-row').count();
    const cartHasMultipleProducts = cartRowCount === 2;
    audit.interactions.push({ theme, check: 'cart-renders-two-distinct-product-rows', pass: cartHasMultipleProducts, result: { rowCount: cartRowCount } });
    if (!cartHasMultipleProducts) hardFailures.push('Cart did not render both selected product rows: ' + theme);
    const cartSkuLabels = (await page.locator('#cartList .cart-row-copy small').allTextContents())
      .map(value => value.trim()).filter(value => value.startsWith('Mã SKU'));
    const cartSkuPass = cartSkuLabels.length === 2
      && cartSkuLabels.every(value => value.includes('Chưa được cung cấp') && !/\b(null|undefined|SD\d{3})\b/i.test(value));
    audit.interactions.push({ theme, check: 'cart-hides-unverified-sku-values', pass: cartSkuPass, result: { labels: cartSkuLabels } });
    if (!cartSkuPass) hardFailures.push('Cart displayed a missing, null, undefined or unverified legacy SKU: ' + theme);
    await capture(page, 'cart-mobile-' + theme + '.jpg');
    audit.interactions.push({ theme, check: 'add-to-cart-and-open-cart', pass: true });
    audit.interactions.push({ theme, check: 'mobile-bottom-cart-navigation-opens-cart', pass: true });

    await page.locator('#cartCheckout').click();
    await page.locator('#checkoutDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#checkoutForm').waitFor({ state: 'visible' });
    await settle(page);
    const checkoutStructure = await page.evaluate(() => ({
      checkoutFormInsideCheckout: !!document.querySelector('#checkoutDrawer #checkoutForm'),
      checkoutFormInsideCart: !!document.querySelector('#cartDrawer #checkoutForm'),
      checkoutVisibleAndAccessible: document.querySelector('#checkoutDrawer')?.getAttribute('aria-hidden') === 'false' && !document.querySelector('#checkoutDrawer')?.hasAttribute('inert'),
      cartInertWhileCheckoutOpen: document.querySelector('#cartDrawer')?.hasAttribute('inert') === true,
      cartHiddenWhileCheckoutOpen: document.querySelector('#cartDrawer')?.getAttribute('aria-hidden') === 'true' && !document.querySelector('#cartDrawer')?.classList.contains('open'),
      closeButtonPresent: !!document.querySelector('#checkoutClose'),
      backButtonPresent: !!document.querySelector('#checkoutBack'),
      submitButtonPresent: !!document.querySelector('#checkoutSubmit'),
      provinceEnabled: !!document.querySelector('#checkoutProvince') && !document.querySelector('#checkoutProvince').disabled,
      addressMessage: document.querySelector('#checkoutAddressMessage')?.textContent || '',
      submitButtonHeight: document.querySelector('#checkoutSubmit')?.getBoundingClientRect().height || 0,
      formValidityBlocksEmptySubmission: !!document.querySelector('#checkoutForm') && !document.querySelector('#checkoutForm').checkValidity(),
    }));
    const checkoutPass = checkoutStructure.checkoutFormInsideCheckout
      && !checkoutStructure.checkoutFormInsideCart
      && checkoutStructure.checkoutVisibleAndAccessible
      && checkoutStructure.cartInertWhileCheckoutOpen
      && checkoutStructure.cartHiddenWhileCheckoutOpen
      && checkoutStructure.closeButtonPresent
      && checkoutStructure.backButtonPresent
      && checkoutStructure.submitButtonPresent
      && checkoutStructure.provinceEnabled
      && !checkoutStructure.addressMessage
      && checkoutStructure.submitButtonHeight >= 40
      && checkoutStructure.submitButtonHeight <= 56
      && checkoutStructure.formValidityBlocksEmptySubmission;
    audit.interactions.push({ theme, check: 'cart-checkout-form-separated-and-validates', pass: checkoutPass, result: checkoutStructure });
    if (!checkoutPass) hardFailures.push('Cart/checkout layout, address mock or validation failed: ' + theme);
    await capture(page, 'checkout-mobile-' + theme + '.jpg');

    await page.locator('#checkoutProvince').selectOption('Tỉnh kiểm thử');
    await page.waitForFunction(() => {
      const ward = document.querySelector('#checkoutWard');
      return !!ward && !ward.disabled && Array.from(ward.options).some((option) => option.textContent.includes('Phường kiểm thử'));
    });
    const wardFixtureLoaded = await page.locator('#checkoutWard option').filter({ hasText: 'Phường kiểm thử' }).count() === 1;
    audit.interactions.push({ theme, check: 'checkout-address-ward-options-load-from-offline-fixture', pass: wardFixtureLoaded });
    if (!wardFixtureLoaded) hardFailures.push('Checkout test-only ward fixture did not load: ' + theme);
    await page.locator('#checkoutProvince').selectOption('');

    // Compute actual first/last focusable controls, then verify reverse and forward wrapping.
    const focusOrder = await page.locator('#checkoutDrawer').evaluate((panel) => {
      const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      return [...panel.querySelectorAll(selector)]
        .filter(el => !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
        .map(el => ({ id: el.id || '', name: el.getAttribute('name') || '', tag: el.tagName }));
    });
    const firstFocus = focusOrder[0];
    const lastFocus = focusOrder[focusOrder.length - 1];
    let shiftTabWrapped = false, tabWrapped = false, focusBeforeReverse = '';
    if (firstFocus && lastFocus) {
      await page.locator('#checkoutDrawer').evaluate((panel) => {
        const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const items = [...panel.querySelectorAll(selector)].filter(el => !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        items[0]?.focus({ preventScroll: true });
      });
      await page.waitForTimeout(40);
      focusBeforeReverse = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name') || document.activeElement?.tagName || '');
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(30);
      shiftTabWrapped = await page.evaluate((expected) => {
        const el = document.activeElement;
        return !!el && (el.id === expected.id || (!expected.id && el.getAttribute('name') === expected.name));
      }, lastFocus);
      await page.locator('#checkoutDrawer').evaluate((panel) => {
        const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const items = [...panel.querySelectorAll(selector)].filter(el => !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        items[items.length - 1]?.focus({ preventScroll: true });
      });
      await page.waitForTimeout(30);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(30);
      tabWrapped = await page.evaluate((expected) => {
        const el = document.activeElement;
        return !!el && (el.id === expected.id || (!expected.id && el.getAttribute('name') === expected.name));
      }, firstFocus);
    }
    audit.interactions.push({ theme, check: 'checkout-keyboard-focus-trap', pass: shiftTabWrapped && tabWrapped, result: { firstFocus, lastFocus, focusBeforeReverse, shiftTabWrapped, tabWrapped } });
    if (!shiftTabWrapped || !tabWrapped) hardFailures.push('Checkout keyboard focus trap failed: ' + theme);

    await page.locator('#checkoutBack').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.activeElement?.id === 'cartCheckout');
    const focusRestored = await page.evaluate(() => document.activeElement?.id === 'cartCheckout');
    audit.interactions.push({ theme, check: 'checkout-back-restores-focus-to-cart-action', pass: focusRestored });
    if (!focusRestored) hardFailures.push('Checkout did not restore focus to the cart action: ' + theme);
    await page.locator('#cartClose').click();

    await page.locator('#orderDetailsToggle').click();
    await page.locator('#orderDetailsPanel:not([hidden])').waitFor({ state: 'visible' });
    await settle(page);
    await capture(page, 'order-process-mobile-' + theme + '.jpg');
    audit.interactions.push({ theme, check: 'expand-order-process', pass: true });
    await page.locator('#orderDetailsToggle').click();
    await page.locator('#mobileAccountNav').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'visible' });
    const accountFocusReached = await page.waitForFunction(
      () => document.activeElement?.id === 'accountClose',
      null,
      { timeout: 900 },
    ).then(() => true).catch(() => false);
    const accountFocusBeforeSettle = await page.evaluate(() => document.activeElement?.id || '');
    await settle(page);
    const accountStructure = await page.evaluate(() => ({
      accessibleDialog: document.querySelector('#accountDrawer')?.getAttribute('role') === 'dialog'
        && document.querySelector('#accountDrawer')?.getAttribute('aria-modal') === 'true'
        && document.querySelector('#accountDrawer')?.getAttribute('aria-hidden') === 'false',
      drawerNotInertWhenOpen: !document.querySelector('#accountDrawer')?.hasAttribute('inert'),
      initialFocusOnCloseButton: document.activeElement?.id === 'accountClose',
      addressPanelHiddenUntilSelected: !!document.querySelector('#accountAddressView')?.hidden
        && getComputedStyle(document.querySelector('#accountAddressView')).display === 'none',
      favoritesPanelHiddenUntilSelected: !!document.querySelector('#accountFavoritesView')?.hidden
        && getComputedStyle(document.querySelector('#accountFavoritesView')).display === 'none',
      ordersPanelHiddenUntilSelected: !!document.querySelector('#accountOrdersView')?.hidden
        && getComputedStyle(document.querySelector('#accountOrdersView')).display === 'none',
      activeElementAfterSettle: document.activeElement?.id || '',
    }));
    const accountStructurePass = accountStructure.accessibleDialog && accountStructure.drawerNotInertWhenOpen
      && accountFocusReached && accountStructure.initialFocusOnCloseButton
      && accountStructure.addressPanelHiddenUntilSelected && accountStructure.favoritesPanelHiddenUntilSelected
      && accountStructure.ordersPanelHiddenUntilSelected;
    audit.interactions.push({ theme, check: 'account-dialog-semantics-and-initial-focus', pass: accountStructurePass, result: { ...accountStructure, accountFocusReached, accountFocusBeforeSettle } });
    if (!accountStructurePass) hardFailures.push('Account drawer accessibility/hidden-panel state failed: ' + theme);
    await capture(page, 'account-mobile-' + theme + '.jpg');

    const accountFocusEndpoints = await page.evaluate(() => {
      const panel = document.querySelector('#accountDrawer');
      const items = [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      return { first: items[0]?.id || '', last: items[items.length - 1]?.id || '', count: items.length };
    });
    // Restore the known first target after screenshot capture so the reverse-wrap assertion starts from a deterministic state.
    await page.locator('#accountClose').focus();
    await page.keyboard.press('Shift+Tab');
    const accountShiftTabWrapped = await page.evaluate(expected => document.activeElement?.id === expected, accountFocusEndpoints.last);
    await page.keyboard.press('Tab');
    const accountTabWrapped = await page.evaluate(expected => document.activeElement?.id === expected, accountFocusEndpoints.first);
    audit.interactions.push({ theme, check: 'account-keyboard-focus-trap', pass: accountShiftTabWrapped && accountTabWrapped, result: { ...accountFocusEndpoints, accountShiftTabWrapped, accountTabWrapped } });
    if (!accountShiftTabWrapped || !accountTabWrapped) hardFailures.push('Account keyboard focus trap failed: ' + theme);

    await page.locator('#accountClose').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'mobileAccountNav');
    const accountFocusRestored = await page.evaluate(() => document.activeElement?.id === 'mobileAccountNav');
    const accountHiddenInert = await page.locator('#accountDrawer').evaluate(el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true');
    audit.interactions.push({ theme, check: 'account-close-restores-focus-and-hides-drawer', pass: accountFocusRestored && accountHiddenInert, result: { accountFocusRestored, accountHiddenInert } });
    if (!accountFocusRestored || !accountHiddenInert) hardFailures.push('Account drawer did not restore focus/close accessibly: ' + theme);

    // Exercise local favorites end-to-end without any customer account or backend writes.
    await page.locator('#catalogGrid .product-card .product-open').first().click();
    await page.locator('#productOverlay.open').waitFor({ state: 'visible' });
    const favoriteProductTitle = (await page.locator('#detailTitle').textContent() || '').trim();
    await page.locator('#detailFavorite').click();
    await page.waitForFunction(() => {
      try { const ids = JSON.parse(localStorage.getItem('sd-favorites') || '[]'); return Array.isArray(ids) && ids.length === 1; } catch { return false; }
    });
    const favoriteSavedState = await page.evaluate(() => {
      const ids = JSON.parse(localStorage.getItem('sd-favorites') || '[]');
      return {
        count: ids.length,
        key: ids[0] || '',
        pressed: document.querySelector('#detailFavorite')?.getAttribute('aria-pressed') === 'true',
      };
    });
    const favoriteSavePass = favoriteSavedState.count === 1 && !!favoriteSavedState.key && favoriteSavedState.pressed;
    audit.interactions.push({ theme, check: 'favorite-heart-persists-product-locally', pass: favoriteSavePass, result: favoriteSavedState });
    if (!favoriteSavePass) hardFailures.push('Favorite heart did not persist a selected product locally: ' + theme);
    await page.keyboard.press('Escape');
    await page.locator('#productOverlay.open').waitFor({ state: 'hidden' });
    await page.locator('#mobileAccountNav').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#accountFavoritesAction').click();
    await page.locator('#accountFavoritesView:not([hidden])').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const image = document.querySelector('#accountFavoritesList img');
      return !!image && image.complete && image.naturalWidth > 0;
    });
    const favoriteThumbnailPass = await page.locator('#accountFavoritesList img').evaluate(img => img.complete && img.naturalWidth > 0);
    audit.interactions.push({ theme, check: 'favorite-thumbnail-loads-a-real-product-image', pass: favoriteThumbnailPass });
    if (!favoriteThumbnailPass) hardFailures.push('Favorite list product thumbnail did not load: ' + theme);
    await capture(page, 'account-favorites-mobile-' + theme + '.jpg');
    const favoritesListState = await page.evaluate(() => ({
      count: document.querySelectorAll('#accountFavoritesList [data-favorite-open]').length,
      title: document.querySelector('#accountFavoritesList .favorite-product-copy strong')?.textContent?.trim() || '',
      total: document.querySelector('#accountFavoriteCount')?.textContent || '',
    }));
    const favoritesListPass = favoritesListState.count === 1
      && favoritesListState.title === favoriteProductTitle
      && favoritesListState.total === '1';
    audit.interactions.push({ theme, check: 'account-favorites-view-renders-saved-product', pass: favoritesListPass, result: favoritesListState });
    if (!favoritesListPass) hardFailures.push('Account favorites view did not render its locally saved product: ' + theme);
    await page.locator('#accountFavoritesList [data-favorite-open]').first().click();
    await page.locator('#productOverlay.open').waitFor({ state: 'visible' });
    const reopenedFavoriteTitle = (await page.locator('#detailTitle').textContent() || '').trim();
    const favoritesOpenPass = reopenedFavoriteTitle === favoriteProductTitle;
    audit.interactions.push({ theme, check: 'favorite-row-reopens-correct-product', pass: favoritesOpenPass, result: { expected: favoriteProductTitle, actual: reopenedFavoriteTitle } });
    if (!favoritesOpenPass) hardFailures.push('Selecting a favorite did not open the same product: ' + theme);
    await page.locator('#detailFavorite').click();
    await page.waitForFunction(() => {
      try { const ids = JSON.parse(localStorage.getItem('sd-favorites') || '[]'); return Array.isArray(ids) && ids.length === 0; } catch { return false; }
    });
    const favoriteRemovePass = await page.locator('#detailFavorite').getAttribute('aria-pressed') === 'false'
      && await page.evaluate(() => JSON.parse(localStorage.getItem('sd-favorites') || '[]').length === 0);
    audit.interactions.push({ theme, check: 'favorite-heart-removes-saved-product', pass: favoriteRemovePass });
    if (!favoriteRemovePass) hardFailures.push('Favorite heart did not remove the selected product: ' + theme);
    await page.keyboard.press('Escape');
    await page.locator('#productOverlay.open').waitFor({ state: 'hidden' });
    await page.locator('#mobileAccountNav').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#accountFavoritesAction').click();
    await page.locator('#accountFavoritesView:not([hidden])').waitFor({ state: 'visible' });
    const emptyFavoritesPass = await page.locator('#accountFavoritesList .favorites-empty').count() === 1
      && await page.locator('#accountFavoriteCount').textContent().then(v => v.trim() === '0');
    audit.interactions.push({ theme, check: 'favorites-empty-state-after-removal', pass: emptyFavoritesPass });
    if (!emptyFavoritesPass) hardFailures.push('Favorites empty state did not return after removing the last product: ' + theme);
    // Verify the editable shipping address book stores data only after explicit submit and can prefill checkout.
    await page.locator('#accountFavoritesBack').click();
    await page.locator('#accountAddressAction').click();
    await page.locator('#accountAddressView:not([hidden])').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const province = document.querySelector('#accountAddressProvince');
      return !!province && !province.disabled && Array.from(province.options).some(option => option.textContent.includes('Tỉnh kiểm thử'));
    });
    await capture(page, 'account-address-mobile-' + theme + '.jpg');
    await page.locator('#accountAddressFullName').fill('Nguyen Address Test');
    await page.locator('#accountAddressPhone').fill('0912345678');
    await page.locator('#accountAddressEmail').fill('address@example.com');
    await page.locator('#accountAddressProvince').selectOption('Tỉnh kiểm thử');
    await page.waitForFunction(() => {
      const ward = document.querySelector('#accountAddressWard');
      return !!ward && !ward.disabled && Array.from(ward.options).some(option => option.textContent.includes('Phường kiểm thử'));
    });
    await page.locator('#accountAddressWard').selectOption({ label: 'Phường kiểm thử' });
    await page.locator('#accountAddressStreet').fill('15 Đường Thử nghiệm');
    await page.locator('#accountAddressSave').click();
    await page.waitForFunction(() => {
      try { const a = JSON.parse(localStorage.getItem('sd-shipping-address') || 'null'); return !!a && a.fullName === 'Nguyen Address Test'; } catch { return false; }
    });
    const savedAddressState = await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('sd-shipping-address') || 'null');
      return {
        name: a?.fullName || '',
        phone: a?.phone || '',
        email: a?.email || '',
        province: a?.province || '',
        ward: a?.ward || '',
        streetAddress: a?.streetAddress || '',
        privacyNotice: document.querySelector('#accountAddressPrivacy')?.textContent?.includes('chỉ nằm trong bộ nhớ trình duyệt trên thiết bị hiện tại') || false,
      };
    });
    const savedAddressPass = savedAddressState.name === 'Nguyen Address Test'
      && savedAddressState.phone === '0912345678'
      && savedAddressState.email === 'address@example.com'
      && savedAddressState.province === 'Tỉnh kiểm thử'
      && savedAddressState.ward === 'Phường kiểm thử'
      && savedAddressState.streetAddress === '15 Đường Thử nghiệm'
      && savedAddressState.privacyNotice;
    audit.interactions.push({ theme, check: 'shipping-address-saves-locally-with-clear-privacy-notice', pass: savedAddressPass, result: savedAddressState });
    if (!savedAddressPass) hardFailures.push('Shipping address local save/privacy disclosure failed: ' + theme);
    await page.locator('#accountClose').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'hidden' });

    // The test-only /api/orders response is mocked above; verify we record only the accepted request summary, never checkout PII.
    await page.locator('#mobileCartNav').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#cartCheckout').click();
    await page.locator('#checkoutDrawer.open').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#checkoutForm input[name="fullName"]')?.value === 'Nguyen Address Test'
      && document.querySelector('#checkoutForm input[name="phone"]')?.value === '0912345678'
      && document.querySelector('#checkoutProvince')?.value === 'Tỉnh kiểm thử'
      && document.querySelector('#checkoutWard')?.value === 'Phường kiểm thử'
      && document.querySelector('#checkoutStreet')?.value === '15 Đường Thử nghiệm');
    const checkoutPrefillState = await page.evaluate(() => ({
      name: document.querySelector('#checkoutForm input[name="fullName"]')?.value || '',
      phone: document.querySelector('#checkoutForm input[name="phone"]')?.value || '',
      province: document.querySelector('#checkoutProvince')?.value || '',
      ward: document.querySelector('#checkoutWard')?.value || '',
      streetAddress: document.querySelector('#checkoutStreet')?.value || '',
    }));
    const checkoutPrefillPass = checkoutPrefillState.name === 'Nguyen Address Test'
      && checkoutPrefillState.phone === '0912345678'
      && checkoutPrefillState.province === 'Tỉnh kiểm thử'
      && checkoutPrefillState.ward === 'Phường kiểm thử'
      && checkoutPrefillState.streetAddress === '15 Đường Thử nghiệm';
    audit.interactions.push({ theme, check: 'saved-address-prefills-editable-checkout', pass: checkoutPrefillPass, result: checkoutPrefillState });
    if (!checkoutPrefillPass) hardFailures.push('Saved address did not prefill editable checkout fields: ' + theme);
    await page.locator('#checkoutForm input[name="fullName"]').fill('Nguyen Test');
    await page.locator('#checkoutForm input[name="phone"]').fill('0900000000');
    await page.locator('#checkoutForm input[name="email"]').fill('test@example.com');
    await page.locator('#checkoutProvince').selectOption('Tỉnh kiểm thử');
    await page.waitForFunction(() => {
      const ward = document.querySelector('#checkoutWard');
      return !!ward && !ward.disabled && Array.from(ward.options).some(option => option.textContent.includes('Phường kiểm thử'));
    });
    await page.locator('#checkoutWard').selectOption({ label: 'Phường kiểm thử' });
    await page.locator('#checkoutStreet').fill('12 Đường Kiểm thử');
    await page.locator('#checkoutSubmit').click();
    await page.waitForFunction((expected) => {
      try {
        const rows = JSON.parse(localStorage.getItem('sd-local-order-history') || '[]');
        return Array.isArray(rows) && rows.length === 1 && rows[0].orderNumber === expected;
      } catch { return false; }
    }, 'SD-TEST-' + theme.toUpperCase());
    const localOrderRecord = await page.evaluate(() => {
      const record = JSON.parse(localStorage.getItem('sd-local-order-history') || '[]')[0];
      return {
        orderNumber: record?.orderNumber || '',
        status: record?.status || '',
        items: record?.items?.length || 0,
        storesCustomerName: !!record && ('fullName' in record),
        storesPhone: !!record && ('phone' in record),
        storesEmail: !!record && ('email' in record),
        storesAddress: !!record && ('address' in record),
      };
    });
    const localOrderSavePass = localOrderRecord.orderNumber === 'SD-TEST-' + theme.toUpperCase()
      && localOrderRecord.status === 'pending_confirmation'
      && localOrderRecord.items === 2
      && !localOrderRecord.storesCustomerName
      && !localOrderRecord.storesPhone
      && !localOrderRecord.storesEmail
      && !localOrderRecord.storesAddress;
    audit.interactions.push({ theme, check: 'accepted-order-request-saved-locally-without-pii', pass: localOrderSavePass, result: localOrderRecord });
    if (!localOrderSavePass) hardFailures.push('Order history did not store the accepted request safely: ' + theme);
    const paymentPendingState = await page.evaluate(() => {
      const panel = document.querySelector('#paymentInstructions');
      return {
        visible: !!panel && !panel.hidden,
        heading: panel?.querySelector('h3')?.textContent.trim() || '',
        text: panel?.textContent || '',
        qrCount: panel?.querySelectorAll('img').length || 0,
      };
    });
    const paymentPendingPass = paymentPendingState.visible
      && paymentPendingState.heading === 'Chờ cửa hàng xác nhận'
      && paymentPendingState.text.includes('Vui lòng chưa chuyển tiền')
      && paymentPendingState.qrCount === 0
      && !paymentPendingState.text.includes('Số tiền cần chuyển');
    audit.interactions.push({ theme, check: 'pending-order-does-not-show-qr-or-request-transfer', pass: paymentPendingPass, result: paymentPendingState });
    if (!paymentPendingPass) hardFailures.push('Pending order exposed QR/payment request before server confirmation: ' + theme);
    await page.locator('#checkoutClose').click();
    await page.locator('#checkoutDrawer.open').waitFor({ state: 'hidden' });
    await page.locator('#mobileAccountNav').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'visible' });
    await page.locator('#accountOrdersAction').click();
    await page.locator('#accountOrdersView:not([hidden])').waitFor({ state: 'visible' });
    await capture(page, 'account-orders-mobile-' + theme + '.jpg');
    const orderHistoryUi = await page.evaluate(() => ({
      count: document.querySelectorAll('#accountOrdersList .local-order-card').length,
      orderNumber: document.querySelector('#accountOrdersList .local-order-head strong')?.textContent?.trim() || '',
      counter: document.querySelector('#accountOrderCount')?.textContent?.trim() || '',
      localNotice: document.querySelector('#accountOrdersView .orders-local-note')?.textContent?.includes('không phải lịch sử tài khoản đồng bộ') || false,
    }));
    const orderHistoryUiPass = orderHistoryUi.count === 1
      && orderHistoryUi.orderNumber === 'SD-TEST-' + theme.toUpperCase()
      && orderHistoryUi.counter === '1'
      && orderHistoryUi.localNotice;
    audit.interactions.push({ theme, check: 'account-orders-view-shows-accepted-local-request-and-disclosure', pass: orderHistoryUiPass, result: orderHistoryUi });
    if (!orderHistoryUiPass) hardFailures.push('Account order history UI did not show the received request safely: ' + theme);
    await page.locator('#accountClose').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'hidden' });
    await context.close();
  }

  // Verify OS theme auto-mode on startup and while the simulated system preference changes.
  const autoContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await autoContext.addInitScript(() => {
    try { localStorage.removeItem('sd-theme-mode'); } catch {}
  });
  await autoContext.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) {
      audit.externalRequestsBlocked.push({ theme: 'system-auto', method: req.method(), url: req.url() });
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(req.method())) {
      audit.writeRequestsBlocked.push({ theme: 'system-auto', method: req.method(), url: req.url() });
      return route.abort();
    }
    return route.continue();
  });
  await autoContext.route('**/api/settings', (route) => route.fulfill({
    status: 200, contentType: 'application/json; charset=utf-8', body: '{}',
  }));
  await autoContext.route('**/api/products', (route) => route.fulfill({
    status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(products),
  }));
  // Keep the address API fully offline in the extra auto-theme context, just as in Light/Dark contexts.
  await autoContext.route('https://provinces.open-api.vn/api/v2/p/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify([{ code: 99, name: 'Tỉnh kiểm thử' }]),
  }));
  await autoContext.route(/https:\/\/provinces\.open-api\.vn\/api\/v2\/p\/99\?depth=2$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ wards: [{ code: 99001, name: 'Phường kiểm thử' }] }),
  }));
  const autoPage = await autoContext.newPage();
  autoPage.setDefaultTimeout(10000);
  autoPage.on('console', (m) => { if (m.type() === 'error') audit.consoleErrors.push({ theme: 'system-auto', message: m.text() }); });
  autoPage.on('pageerror', (e) => audit.pageErrors.push({ theme: 'system-auto', message: e.message }));
  autoPage.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) {
      audit.httpErrors.push({ theme: 'system-auto', status: res.status(), url: res.url() });
    }
  });
  autoPage.on('requestfailed', (req) => {
    if (req.url().startsWith(origin) && !String(req.failure()?.errorText || '').includes('ERR_ABORTED')) {
      audit.failedRequests.push({ theme: 'system-auto', url: req.url(), failure: req.failure()?.errorText || 'unknown' });
    }
  });
  const autoResponse = await autoPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  if (!autoResponse || !autoResponse.ok()) throw new Error('Local storefront failed in system-auto theme test.');
  await autoPage.locator('#catalogGrid .product-card').first().waitFor({ state: 'visible' });
  const autoInitial = await autoPage.evaluate(() => ({
    mode: document.documentElement.dataset.themeMode || '',
    dark: document.documentElement.classList.contains('dark'),
  }));
  const autoLightPass = autoInitial.mode === 'auto' && !autoInitial.dark;
  audit.interactions.push({ theme: 'system-light', check: 'auto-theme-starts-from-light-os-preference', pass: autoLightPass, result: autoInitial });
  if (!autoLightPass) hardFailures.push('Automatic theme did not start in light mode under a light system preference.');

  await autoPage.emulateMedia({ colorScheme: 'dark' });
  await autoPage.waitForFunction(() =>
    document.documentElement.dataset.themeMode === 'auto' && document.documentElement.classList.contains('dark')
  );
  const autoDark = await autoPage.evaluate(() => ({
    mode: document.documentElement.dataset.themeMode || '',
    dark: document.documentElement.classList.contains('dark'),
  }));
  const autoDarkPass = autoDark.mode === 'auto' && autoDark.dark;
  audit.interactions.push({ theme: 'system-dark', check: 'auto-theme-follows-live-dark-os-change', pass: autoDarkPass, result: autoDark });
  if (!autoDarkPass) hardFailures.push('Automatic theme did not follow a live switch to dark system preference.');

  await autoPage.emulateMedia({ colorScheme: 'light' });
  await autoPage.waitForFunction(() =>
    document.documentElement.dataset.themeMode === 'auto' && !document.documentElement.classList.contains('dark')
  );
  const autoLightAgain = await autoPage.evaluate(() => ({
    mode: document.documentElement.dataset.themeMode || '',
    dark: document.documentElement.classList.contains('dark'),
  }));
  const autoLightAgainPass = autoLightAgain.mode === 'auto' && !autoLightAgain.dark;
  audit.interactions.push({ theme: 'system-light-return', check: 'auto-theme-follows-live-light-os-change', pass: autoLightAgainPass, result: autoLightAgain });
  if (!autoLightAgainPass) hardFailures.push('Automatic theme did not follow a live switch back to light system preference.');
  await autoContext.close();
} finally {
  await browser.close();
}

audit.finishedAt = new Date().toISOString();
audit.responsiveOverflowCount = audit.responsive.filter((v) => v.horizontalOverflow).length;
audit.hardFailures = hardFailures;
audit.passed = hardFailures.length === 0
  && audit.responsiveOverflowCount === 0
  && audit.pageErrors.length === 0
  && audit.consoleErrors.length === 0
  && audit.httpErrors.length === 0
  && audit.failedRequests.length === 0
  && audit.writeRequestsBlocked.length === 0;
await fs.writeFile(path.join(outDir, 'visual-audit.json'), JSON.stringify(audit, null, 2), 'utf8');

const imageCards = audit.screenshots.map((v) =>
  '<figure><figcaption>' + escapeHtml(v.filename) + '</figcaption><a href="' + escapeHtml(v.filename) + '"><img loading="lazy" src="' + escapeHtml(v.filename) + '" alt="' + escapeHtml(v.filename) + '"></a></figure>'
).join('\n');
const rows = audit.responsive.map((v) =>
  '<tr><td>' + escapeHtml(v.theme) + '</td><td>' + escapeHtml(v.viewport) + '</td><td>' + v.viewportWidth + 'px</td><td>' + v.documentWidth + 'px</td><td>' + (v.horizontalOverflow ? 'OVERFLOW' : 'PASS') + '</td></tr>'
).join('\n');
const report = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SinDarealest Liquid Glass Preview</title><style>body{margin:0;padding:24px;font:15px/1.6 system-ui,sans-serif;background:#eef6fd;color:#142a3c}main{max-width:1400px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}.status{font-weight:700}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:8px;border:1px solid #c8dceb;text-align:left}section{margin:28px 0}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}figure{margin:0;padding:10px;border:1px solid #c8dceb;border-radius:14px;background:#fff}figure img{width:100%;height:auto;display:block;border-radius:8px}figcaption{overflow-wrap:anywhere;font-size:12px;margin-bottom:6px}@media(max-width:480px){body{padding:12px}}</style><main><h1>SinDarealest2 — Liquid Glass Preview</h1><p>Rendered locally from this branch on a static HTTP server. The test uses the repository’s legacy product source as a read-only fixture; unknown prices and stock are not invented. External calls and non-GET requests are blocked, except the explicit <code>/api/orders</code> test request, which is fulfilled by an in-memory Playwright fixture and never reaches the local server or D1. No Cloudflare, D1 or R2 binding is used.</p><p class="status">Automated audit: ' + (audit.passed ? 'PASS' : 'NEEDS REVIEW') + ' — horizontal overflow: ' + audit.responsiveOverflowCount + '; page errors: ' + audit.pageErrors.length + '; console errors: ' + audit.consoleErrors.length + '; same-origin HTTP errors: ' + audit.httpErrors.length + '; offline order fixtures: ' + audit.mockedRequests.length + ' (never sent to backend).</p><h2>Responsive width audit</h2><table><thead><tr><th>Theme</th><th>Viewport</th><th>CSS viewport</th><th>Document scroll width</th><th>Result</th></tr></thead><tbody>' + rows + '</tbody></table><h2>Screenshots</h2><section class="shots">' + imageCards + '</section><h2>Interaction checks</h2><pre>' + escapeHtml(JSON.stringify(audit.interactions, null, 2)) + '</pre><h2>Diagnostics</h2><p>See <a href="visual-audit.json">visual-audit.json</a> for console, failed-request and overflow details. This report makes no subjective 95–100% visual-similarity claim.</p></main></html>';
await fs.writeFile(path.join(outDir, 'report.html'), report, 'utf8');
console.log(JSON.stringify({
  passed: audit.passed, fixtureProducts: audit.productFixtureCount,
  screenshots: audit.screenshots.length, responsiveOverflowCount: audit.responsiveOverflowCount,
  pageErrors: audit.pageErrors.length, httpErrors: audit.httpErrors.length,
  hardFailures, report: path.join(outDir, 'report.html'),
}, null, 2));
if (!audit.passed) process.exitCode = 1;
