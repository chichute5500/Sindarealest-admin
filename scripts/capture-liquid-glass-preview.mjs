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

    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('console', (m) => { if (m.type() === 'error') audit.consoleErrors.push({ theme, message: m.text() }); });
    page.on('pageerror', (e) => audit.pageErrors.push({ theme, message: e.message }));
    page.on('response', (res) => {
      if (res.status() >= 400 && new URL(res.url()).origin === origin) {
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
    await page.locator('#catalogGrid .product-card').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(3600);
    await settle(page);
    const startup = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      mode: document.documentElement.dataset.themeMode || 'auto',
      cards: document.querySelectorAll('#catalogGrid .product-card').length,
      heroImage: (() => { const img = document.querySelector('#heroProductImage'); return { present: !!img, loaded: !!img && img.complete && img.naturalWidth > 0, source: img?.getAttribute('src') || '' }; })(),
      mobileNav: (() => { const nav = document.querySelector('#mobileBottomNav'); return { present: !!nav, visible: !!nav && getComputedStyle(nav).display !== 'none', tabs: nav?.querySelectorAll('[data-mobile-tab]').length || 0 }; })(),
      title: document.title,
    }));
    audit.interactions.push({ theme, check: 'initial-render', result: startup });
    if (!startup.cards || startup.dark !== (theme === 'dark')) hardFailures.push('Initial render/theme failed: ' + theme);
    audit.interactions.push({ theme, check: 'hero-product-image-loaded-from-catalog', pass: startup.heroImage.present && startup.heroImage.loaded && !!startup.heroImage.source });
    if (!startup.heroImage.present || !startup.heroImage.loaded || !startup.heroImage.source) hardFailures.push('Hero product image failed to load from existing catalog data: ' + theme);
    audit.interactions.push({ theme, check: 'mobile-bottom-navigation-visible-with-four-tabs', pass: startup.mobileNav.present && startup.mobileNav.visible && startup.mobileNav.tabs === 4 });
    if (!startup.mobileNav.present || !startup.mobileNav.visible || startup.mobileNav.tabs !== 4) hardFailures.push('Mobile bottom navigation missing or incomplete: ' + theme);

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
      return {
        rowCount: rows.length,
        visibleRowCount: visibleRows.length,
        fullAddressVisible: !!address && address.textContent.includes('Hẻm 48 Võ Trường Toàn, Đà Lạt, Lâm Đồng, Việt Nam'),
        zaloActionPresent: !!document.querySelector('#contact a[href="https://zalo.me/0827049192"]'),
        phoneActionPresent: !!document.querySelector('#contact a[href="tel:+84827049192"]'),
        contactTitleVisible: !!document.querySelector('#footer-contact-title') && document.querySelector('#footer-contact-title').getBoundingClientRect().height > 0,
      };
    });
    const contactPass = contactScreen.rowCount === 6
      && contactScreen.visibleRowCount === 6
      && contactScreen.fullAddressVisible
      && contactScreen.zaloActionPresent
      && contactScreen.phoneActionPresent
      && contactScreen.contactTitleVisible;
    audit.interactions.push({ theme, check: 'footer-contact-six-rows-address-and-zalo-phone-actions', pass: contactPass, result: contactScreen });
    if (!contactPass) hardFailures.push('Footer contact rows, full address or Zalo/phone actions missing: ' + theme);
    await capture(page, 'footer-contact-mobile-' + theme + '.jpg');
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
      return {
        gridVisible: !!grid && grid.getBoundingClientRect().height > 0,
        productCount: cards.length,
        firstRowHasTwoColumns: !!first && !!second && Math.abs(first.top - second.top) <= 4 && second.left > first.left,
        firstCardWidth: first ? Math.round(first.width) : 0,
        secondCardWidth: second ? Math.round(second.width) : 0,
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
    const expectedRoute = galleryState.url === '/san-pham/SD004';
    const galleryBasePass = galleryState.dialogSemantics && galleryState.focusOnClose && galleryState.sku.includes('SD004') && expectedRoute && galleryState.thumbnailCount >= 2;
    audit.interactions.push({ theme, check: 'open-multi-image-detail-and-route', pass: galleryBasePass, result: galleryState });
    if (!galleryBasePass) hardFailures.push('Multi-image detail route/dialog did not open correctly: ' + theme);
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
    await page.waitForFunction(() => !location.pathname.startsWith('/san-pham/'));
    const detailClosedAndInert = await page.locator('#productOverlay').evaluate(el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true');
    audit.interactions.push({ theme, check: 'escape-closes-detail-and-restores-route', pass: detailClosedAndInert });
    if (!detailClosedAndInert) hardFailures.push('Product detail did not close or restore route: ' + theme);

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
    await page.waitForTimeout(120);
    const accountFocusBeforeSettle = await page.evaluate(() => document.activeElement?.id || '');
    await settle(page);
    const accountStructure = await page.evaluate(() => ({
      accessibleDialog: document.querySelector('#accountDrawer')?.getAttribute('role') === 'dialog'
        && document.querySelector('#accountDrawer')?.getAttribute('aria-modal') === 'true'
        && document.querySelector('#accountDrawer')?.getAttribute('aria-hidden') === 'false',
      drawerNotInertWhenOpen: !document.querySelector('#accountDrawer')?.hasAttribute('inert'),
      initialFocusOnCloseButton: document.activeElement?.id === 'accountClose',
      activeElementAfterSettle: document.activeElement?.id || '',
    }));
    const accountStructurePass = accountStructure.accessibleDialog && accountStructure.drawerNotInertWhenOpen && accountStructure.initialFocusOnCloseButton;
    audit.interactions.push({ theme, check: 'account-dialog-semantics-and-initial-focus', pass: accountStructurePass, result: { ...accountStructure, accountFocusBeforeSettle } });
    if (!accountStructurePass) hardFailures.push('Account drawer accessibility state failed: ' + theme);
    await capture(page, 'account-mobile-' + theme + '.jpg');

    await page.keyboard.press('Shift+Tab');
    const accountShiftTabWrapped = await page.evaluate(() => document.activeElement?.id === 'accountContactAction');
    await page.keyboard.press('Tab');
    const accountTabWrapped = await page.evaluate(() => document.activeElement?.id === 'accountClose');
    audit.interactions.push({ theme, check: 'account-keyboard-focus-trap', pass: accountShiftTabWrapped && accountTabWrapped, result: { accountShiftTabWrapped, accountTabWrapped } });
    if (!accountShiftTabWrapped || !accountTabWrapped) hardFailures.push('Account keyboard focus trap failed: ' + theme);

    await page.locator('#accountClose').click();
    await page.locator('#accountDrawer.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'mobileAccountNav');
    const accountFocusRestored = await page.evaluate(() => document.activeElement?.id === 'mobileAccountNav');
    const accountHiddenInert = await page.locator('#accountDrawer').evaluate(el => el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true');
    audit.interactions.push({ theme, check: 'account-close-restores-focus-and-hides-drawer', pass: accountFocusRestored && accountHiddenInert, result: { accountFocusRestored, accountHiddenInert } });
    if (!accountFocusRestored || !accountHiddenInert) hardFailures.push('Account drawer did not restore focus/close accessibly: ' + theme);
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
  await autoContext.route(/https:\/\/provinces\\.open-api\\.vn\\/api\\/v2\\/p\\/99\\?depth=2$/, (route) => route.fulfill({
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
const report = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SinDarealest Liquid Glass Preview</title><style>body{margin:0;padding:24px;font:15px/1.6 system-ui,sans-serif;background:#eef6fd;color:#142a3c}main{max-width:1400px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}.status{font-weight:700}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:8px;border:1px solid #c8dceb;text-align:left}section{margin:28px 0}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}figure{margin:0;padding:10px;border:1px solid #c8dceb;border-radius:14px;background:#fff}figure img{width:100%;height:auto;display:block;border-radius:8px}figcaption{overflow-wrap:anywhere;font-size:12px;margin-bottom:6px}@media(max-width:480px){body{padding:12px}}</style><main><h1>SinDarealest2 — Liquid Glass Preview</h1><p>Rendered locally from this branch on a static HTTP server. The test uses the repository’s legacy product source as read-only fixture; unknown prices and stock are not invented. External calls and all non-GET requests are blocked. No Cloudflare, D1 or R2 binding is used.</p><p class="status">Automated audit: ' + (audit.passed ? 'PASS' : 'NEEDS REVIEW') + ' — horizontal overflow: ' + audit.responsiveOverflowCount + '; page errors: ' + audit.pageErrors.length + '; console errors: ' + audit.consoleErrors.length + '; same-origin HTTP errors: ' + audit.httpErrors.length + '.</p><h2>Responsive width audit</h2><table><thead><tr><th>Theme</th><th>Viewport</th><th>CSS viewport</th><th>Document scroll width</th><th>Result</th></tr></thead><tbody>' + rows + '</tbody></table><h2>Screenshots</h2><section class="shots">' + imageCards + '</section><h2>Interaction checks</h2><pre>' + escapeHtml(JSON.stringify(audit.interactions, null, 2)) + '</pre><h2>Diagnostics</h2><p>See <a href="visual-audit.json">visual-audit.json</a> for console, failed-request and overflow details. This report makes no subjective 95–100% visual-similarity claim.</p></main></html>';
await fs.writeFile(path.join(outDir, 'report.html'), report, 'utf8');
console.log(JSON.stringify({
  passed: audit.passed, fixtureProducts: audit.productFixtureCount,
  screenshots: audit.screenshots.length, responsiveOverflowCount: audit.responsiveOverflowCount,
  pageErrors: audit.pageErrors.length, httpErrors: audit.httpErrors.length,
  hardFailures, report: path.join(outDir, 'report.html'),
}, null, 2));
if (!audit.passed) process.exitCode = 1;
