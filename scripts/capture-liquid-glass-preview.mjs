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
    await context.route('https://provinces.open-api.vn/api/v2/p/', (route) => route.fulfill({
      status: 200, contentType: 'application/json; charset=utf-8', body: '[]',
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
      title: document.title,
    }));
    audit.interactions.push({ theme, check: 'initial-render', result: startup });
    if (!startup.cards || startup.dark !== (theme === 'dark')) hardFailures.push('Initial render/theme failed: ' + theme);
    audit.interactions.push({ theme, check: 'hero-product-image-loaded-from-catalog', pass: startup.heroImage.present && startup.heroImage.loaded && !!startup.heroImage.source });
    if (!startup.heroImage.present || !startup.heroImage.loaded || !startup.heroImage.source) hardFailures.push('Hero product image failed to load from existing catalog data: ' + theme);

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

    // Theme toggle writes only browser localStorage; no settings endpoint is called.
    await page.setViewportSize({ width: 390, height: 844 });
    const before = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#themeToggle').click();
    const after = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#themeToggle').click();
    const restored = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    const togglePass = before !== after && before === restored;
    audit.interactions.push({ theme, check: 'manual-theme-toggle-round-trip', pass: togglePass });
    if (!togglePass) hardFailures.push('Theme toggle failed: ' + theme);

    await page.locator('#catalogGrid .product-open').first().click();
    const detail = page.locator('#productOverlay.open');
    await detail.waitFor({ state: 'visible' });
    await settle(page);
    await capture(page, 'detail-mobile-' + theme + '.jpg');
    audit.interactions.push({ theme, check: 'open-product-detail', pass: true });
    await page.keyboard.press('Escape');
    await page.locator('#productOverlay.open').waitFor({ state: 'hidden' });

    await page.locator('#catalogGrid .mini-add').first().click();
    await page.locator('#cartOpen').click();
    await page.locator('#cartDrawer.open').waitFor({ state: 'visible' });
    await settle(page);
    await capture(page, 'cart-mobile-' + theme + '.jpg');
    audit.interactions.push({ theme, check: 'add-to-cart-and-open-cart', pass: true });
    await context.close();
  }
} finally {
  await browser.close();
}

audit.finishedAt = new Date().toISOString();
audit.responsiveOverflowCount = audit.responsive.filter((v) => v.horizontalOverflow).length;
audit.hardFailures = hardFailures;
audit.passed = hardFailures.length === 0
  && audit.responsiveOverflowCount === 0
  && audit.pageErrors.length === 0
  && audit.httpErrors.length === 0
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
