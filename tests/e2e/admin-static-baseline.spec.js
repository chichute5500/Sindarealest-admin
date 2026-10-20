import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// UI fixture tests must let Playwright routes own all /api/admin/* traffic; the real app's service worker is not under test here.
test.use({ serviceWorkers: 'block' });

const localAdminUrl = process.env.LOCAL_ADMIN_URL || 'http://127.0.0.1:4173/admin/';
const sourceSha = process.env.GITHUB_SHA || 'local-unpinned';
const outputDir = join(process.cwd(), 'artifacts', 'admin-preview-evidence', sourceSha.slice(0, 12));
const screenshotDir = join(outputDir, 'screenshots');
const viewportMatrix = [
  { width: 320, height: 640 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
];

test('captures the real ADMIN source login across mobile, tablet, desktop and both themes', async ({ page }) => {
  mkdirSync(screenshotDir, { recursive: true });

  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  const safePath = value => {
    try {
      const url = new URL(value);
      return url.origin + url.pathname;
    } catch {
      return '[unparseable URL]';
    }
  };
  const metadata = {
    test: 'local-static-admin-baseline',
    sourceCommit: sourceSha,
    capturedAt: new Date().toISOString(),
    route: safePath(localAdminUrl).replace(/^https?:\/\/[^/]+/, '') || '/',
    screenshots: [],
    viewportMatrix,
    metrics: [],
    pageErrors,
    consoleErrors,
    failedRequests,
    httpErrors,
    completed: false,
    failure: null
  };

  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Expected: the intentionally stubbed session endpoint returns 401 on this unauthenticated baseline.
    if (text === 'Failed to load resource: the server responded with a status of 401 (Unauthorized)') return;
    consoleErrors.push(text.slice(0, 300));
  });
  page.on('requestfailed', request => {
    const url = safePath(request.url());
    if (!url.endsWith('/api/admin/session')) {
      failedRequests.push({ url, error: (request.failure()?.errorText || 'failed').slice(0, 180) });
    }
  });
  page.on('response', response => {
    const url = safePath(response.url());
    if (response.status() >= 400 && !url.endsWith('/api/admin/session')) {
      httpErrors.push({ url, status: response.status() });
    }
  });

  try {
    // Use the real source HTML/CSS without a live backend or business data.
    // Only the unauthenticated session check is stubbed; no business API is mocked.
    await page.route('**/api/admin/session', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Chưa đăng nhập' })
    }));

    await page.setViewportSize(viewportMatrix[3]);
    const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    expect(response?.status(), 'Local static ADMIN page should load').toBe(200);
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.getByLabel('Mật khẩu quản trị')).toBeVisible();
    await expect(page.locator('#showPassword')).toHaveAttribute('aria-pressed', 'false');

    // Exercise the real visibility toggle without submitting credentials or calling login.
    await page.locator('#showPassword').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await expect(page.locator('#showPassword')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#showPassword').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#showPassword')).toHaveAttribute('aria-pressed', 'false');

    await expect(page.locator('#appView')).toBeHidden();
    await expect(page.locator('.topbar > .brand')).toBeHidden();
    await expect(page.locator('#notificationToggle')).toBeHidden();
    await expect(page.locator('#adminThemeToggle')).toBeVisible();
  await expect(page.locator('#backdrop')).toBeHidden();

    for (const viewport of viewportMatrix) {
      await page.setViewportSize(viewport);
      for (const theme of ['light', 'dark']) {
        const currentTheme = await page.locator('html').getAttribute('data-admin-theme');
        if (currentTheme !== theme) await page.locator('#adminThemeToggle').click();
        await expect(page.locator('html')).toHaveAttribute('data-admin-theme', theme);
        // Let the real 250ms theme transition settle before capturing a stable screenshot.
        await page.waitForTimeout(350);
        await expect(page.locator('#loginView')).toBeVisible();

        const metrics = await page.evaluate(() => {
          const fitsViewport = element => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 &&
              rect.left >= -1 && rect.right <= window.innerWidth + 1;
          };
          return {
            title: document.title,
            lang: document.documentElement.lang,
            theme: document.documentElement.dataset.adminTheme || null,
            backgroundToken: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            loginCardFitsViewport: fitsViewport(document.querySelector('#loginView .logincard')),
            passwordFieldFitsViewport: fitsViewport(document.querySelector('#password')),
            passwordToggleFitsViewport: fitsViewport(document.querySelector('#showPassword')),
            submitButtonFitsViewport: fitsViewport(document.querySelector('#loginForm button[type="submit"]'))
          };
        });
        metadata.metrics.push(metrics);

        expect(metrics.loginCardFitsViewport, `Login card fits within ${viewport.width}px viewport`).toBe(true);
        expect(metrics.passwordFieldFitsViewport, `Password field fits within ${viewport.width}px viewport`).toBe(true);
        expect(metrics.passwordToggleFitsViewport, `Password visibility toggle fits within ${viewport.width}px viewport`).toBe(true);
        expect(metrics.submitButtonFitsViewport, `Login submit button fits within ${viewport.width}px viewport`).toBe(true);

        const filename = `admin-login__${viewport.width}x${viewport.height}__${theme}.png`;
        await page.screenshot({ path: join(screenshotDir, filename), fullPage: true });
        metadata.screenshots.push(filename);

        expect(metrics.lang, 'ADMIN should declare Vietnamese').toBe('vi');
        expect(metrics.backgroundToken, `Theme token matches ${theme} mode`).toBe(theme === 'dark' ? '#09131d' : '#eaf3fb');
        expect(metrics.horizontalOverflow, `No horizontal overflow at ${viewport.width}px in ${theme} mode`).toBe(false);
      }
    }

    expect(pageErrors, 'ADMIN source should not throw browser runtime errors').toEqual([]);
    metadata.completed = true;
  } catch (error) {
    metadata.failure = String(error?.message || error).slice(0, 1200);
    throw error;
  } finally {
    // Preserve partial diagnostics even when a viewport assertion or screenshot fails.
    metadata.capturedAt = new Date().toISOString();
    metadata.pageErrors = pageErrors;
    metadata.consoleErrors = consoleErrors;
    metadata.failedRequests = failedRequests;
    metadata.httpErrors = httpErrors;
    writeFileSync(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  }
});


test('captures read-only Admin module UI states using explicit local fixtures', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(screenshotDir, { recursive: true });

  const fixtureProduct = {
    id: 'UI-ONLY-PRODUCT',
    slug: 'ui-only-product',
    title: 'Sản phẩm thử nghiệm giao diện',
    sku: 'UI-FIXTURE-001',
    skuVerified: false,
    category: 'wallets',
    categoryLabel: 'Ví da',
    description: 'Dữ liệu tổng hợp chỉ dùng kiểm tra bố cục; không phải sản phẩm thật.',
    price: null,
    stock: null,
    published: true,
    images: []
  };
  const fixtureApi = {
    '/api/admin/session': { authenticated: true, fixtureOnly: true },
    '/api/admin/products': { products: [fixtureProduct] },
    '/api/admin/settings': {
      showPrices: false,
      welcomeEnabled: true,
      welcomeTitleLine1: 'Tiêu đề thử nghiệm',
      welcomeTitleLine2: 'Chỉ phục vụ kiểm tra',
      welcomeText: 'Nội dung giả lập chỉ cho bài kiểm tra giao diện.',
      watermarkEnabled: true,
      watermarkLogoUrl: '/watermark.webp',
      watermarkPosition: 'bottom-right',
      watermarkSize: 16,
      watermarkOpacity: 68
    },
    '/api/admin/orders': {
      orders: [{
        id: 'UI-ONLY-ORDER',
        order_number: 'UI-ONLY-ORDER',
        created_at: 'DỮ LIỆU TEST',
        full_name: 'Khách thử nghiệm giao diện',
        phone: '—',
        email: '',
        address: '',
        items: [{
          id: 'UI-ONLY-ITEM',
          title: 'Sản phẩm thử nghiệm giao diện',
          quantity: 1,
          sku: 'UI-FIXTURE-001',
          skuVerified: false,
          unitPrice: null
        }],
        total: null,
        status: 'pending_confirmation',
        payment_status: 'unpaid',
        price_confirmation_required: true
      }]
    },
    '/api/admin/customers': {
      customers: [{
        id: 'UI-ONLY-CUSTOMER',
        fullName: 'Khách thử nghiệm giao diện',
        phone: '—',
        email: '—',
        address: '—',
        orderCount: 0,
        lastOrderAt: null,
        createdAt: 'DỮ LIỆU TEST'
      }]
    },
    '/api/admin/warranties': {
      claims: [{
        id: 'UI-ONLY-CLAIM',
        createdAt: 'DỮ LIỆU TEST',
        orderNumber: 'UI-ONLY-ORDER',
        warrantyCode: '',
        sku: 'UI-FIXTURE-001',
        skuVerified: false,
        title: 'Sản phẩm thử nghiệm giao diện',
        fullName: 'Khách thử nghiệm giao diện',
        phone: '—',
        message: 'Yêu cầu mẫu chỉ để kiểm tra bố cục giao diện.',
        status: 'received',
        adminNote: ''
      }],
      warranties: []
    },
    '/api/admin/audit-logs': {
      logs: [{
        created_at: '2026-10-21 00:00:00',
        action: 'product_updated',
        entity_type: 'product',
        entity_id: 'UI-ONLY-PRODUCT',
        actor: 'UI fixture',
        details_json: JSON.stringify({
          title: fixtureProduct.title,
          sku: fixtureProduct.sku
        })
      }]
    }
  };

  const screenshots = [];
  const metrics = [];
  const pageErrors = [];
  const consoleErrors = [];
  const attemptedWrites = [];
  const unexpectedApiPaths = [];
  const fixtureApiRequests = [];
  const fixtureApiErrors = [];
  const mobile = { width: 390, height: 844 };
  const desktop = { width: 1280, height: 800 };
  const variants = [
    { viewport: mobile, theme: 'light' },
    { viewport: mobile, theme: 'dark' },
    { viewport: desktop, theme: 'light' }
  ];
  const viewLabels = {
    dashboard: 'Thao tác nhanh',
    products: 'Tìm sản phẩm',
    orders: 'Mã đơn / thời gian',
    customers: 'Số đơn',
    warranties: 'Mã bảo hành đã phát hành',
    settings: 'Watermark ảnh sản phẩm'
  };
  const visualAudit = {
    test: 'local-static-admin-ui-fixture-visuals',
    sourceCommit: sourceSha,
    capturedAt: new Date().toISOString(),
    fixtureOnly: true,
    auth: 'Local session API is stubbed to enter appView for layout screenshots only; no live authentication is tested.',
    data: 'All returned API objects are synthetic fixture data with explicit UI-ONLY IDs, no real PII, no real price/stock/warranty facts.',
    writePolicy: 'Every non-GET API request is blocked and recorded; no backend, D1, R2 or production data is read or mutated.',
    viewportMatrix: variants,
    screenshots,
    metrics,
    pageErrors,
    consoleErrors,
    attemptedWrites,
    unexpectedApiPaths,
    completed: false,
    failure: null
  };

  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });

  await page.addInitScript(() => {
    try {
      localStorage.removeItem('sd-theme-mode');
      localStorage.removeItem('sd-admin-last-seen');
    } catch {}
  });
  await page.route('**/api/admin/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    fixtureApiRequests.push({ method: request.method(), path: pathname });
    if (request.method() !== 'GET') {
      attemptedWrites.push({ method: request.method(), path: pathname });
      await route.fulfill({
        status: 405,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Read-only UI fixture blocked this request.' })
      });
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(fixtureApi, pathname)) {
      unexpectedApiPaths.push(pathname);
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No fixture configured for this path.' })
      });
      return;
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureApi[pathname])
      });
    } catch (error) {
      fixtureApiErrors.push({ path: pathname, error: String(error?.message || error).slice(0, 180) });
      throw error;
    }
  });

  const chooseTheme = async theme => {
    const current = await page.locator('html').getAttribute('data-admin-theme');
    if (current !== theme) await page.locator('#adminThemeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', theme);
  };

  const navigateTo = async view => {
    let button = page.locator('[data-view="' + view + '"]:visible').first();
    if (await button.count() === 0) {
      const more = page.locator('[data-action="toggle-more"]:visible').first();
      await expect(more).toBeVisible();
      const menu = page.locator('#mobileMorePanel');
      if (await menu.isHidden()) await more.click();
      button = page.locator('[data-view="' + view + '"]:visible').first();
    }
    await expect(button, 'A real visible navigation control should exist for ' + view).toBeVisible();
    await button.click();
    await expect(page.locator('#main')).toContainText(viewLabels[view]);
  };

  const saveScreenshot = async (name, variant, extra = {}) => {
    const filename = name + '__' + variant.viewport.width + 'x' + variant.viewport.height + '__' + variant.theme + '.png';
    const filePath = join(screenshotDir, filename);
    const measurement = await page.evaluate(() => {
      const rawClosingTagNodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const value = walker.currentNode.nodeValue || '';
        if (!value.includes('</div>')) continue;
        const parent = walker.currentNode.parentElement;
        const rect = parent?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0 && getComputedStyle(parent).visibility !== 'hidden' && getComputedStyle(parent).display !== 'none') {
          rawClosingTagNodes.push({
            text: value.trim().slice(0, 120),
            tag: parent.tagName,
            id: parent.id || null,
            className: typeof parent.className === 'string' ? parent.className.slice(0, 120) : null,
            outerHTML: parent.outerHTML.slice(0, 320),
            x: Math.round(rect.x),
            y: Math.round(rect.y)
          });
        }
      }
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        theme: document.documentElement.dataset.adminTheme || null,
        lang: document.documentElement.lang,
        rawClosingTagNodes: rawClosingTagNodes.slice(0, 10)
      };
    });
    expect(measurement.rawClosingTagNodes, name + ' must not display raw closing-tag text').toEqual([]);
    metrics.push({ screen: name, ...variant, ...measurement, ...extra });
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    expect(measurement.horizontalOverflow, name + ' should not overflow horizontally at ' + variant.viewport.width + 'px').toBe(false);
    await page.screenshot({ path: filePath, animations: 'disabled' });
    screenshots.push({ file: filename, screen: name, ...variant, ...extra });
  };

  const captureView = async (name, view, prepare, fullPageAtMobileLight = false) => {
    await navigateTo(view);
    for (const variant of variants) {
      await page.setViewportSize(variant.viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await chooseTheme(variant.theme);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (prepare) await prepare();
      await saveScreenshot(name, variant);
      if (fullPageAtMobileLight && variant.theme === 'light' && variant.viewport.width === mobile.width) {
        const filename = name + '__' + variant.viewport.width + 'x' + variant.viewport.height + '__light__full.png';
        await page.screenshot({ path: join(screenshotDir, filename), fullPage: true, animations: 'disabled' });
        screenshots.push({ file: filename, screen: name, ...variant, fullPage: true });
      }
      if (name === 'notifications') {
        const panel = page.locator('#notificationPanel');
        if (await panel.isVisible()) await page.locator('#notificationToggle').click();
      }
    }
  };

  const openEditor = async variant => {
    await page.setViewportSize(variant.viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await chooseTheme(variant.theme);
    await page.locator('[data-action="edit"]:visible').first().click();
    await expect(page.locator('#backdrop')).toBeVisible();
    await expect(page.locator('#editorTitle')).toContainText('Chỉnh sửa sản phẩm');
    await page.locator('.editorcontent').evaluate(el => { el.scrollTop = 0; });
  };

  try {
    await page.setViewportSize(mobile);
    await page.emulateMedia({ colorScheme: 'light' });
    const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    expect(response?.status(), 'Local source ADMIN should load for fixture-only visual review').toBe(200);
    await expect(page.locator('#appView')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#main .statgrid')).toBeVisible();

    await captureView('dashboard', 'dashboard', null, true);
    await captureView('products', 'products', null, true);

    // Product editor and image gallery are true source components. Only their input data is fixture-only.
    for (const variant of variants) {
      await openEditor(variant);
      await saveScreenshot('product-editor', variant, { dialog: true });
      await page.locator('.editorcontent').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.locator('#imageGrid').scrollIntoViewIfNeeded();
      await saveScreenshot('product-gallery', variant, { dialog: true, fixtureImages: 0 });
      await page.locator('#editorClose').click();
    }

    await captureView('orders', 'orders', null, true);
    await captureView('order-row-details', 'orders', async () => {
      await page.locator('#main .order-table tbody tr').first().scrollIntoViewIfNeeded();
    });
    await captureView('customers', 'customers', null, true);
    await captureView('warranties', 'warranties', null, true);
    await captureView('settings', 'settings', null, true);
    await captureView('backup-restore', 'settings', async () => {
      await page.locator('#main .setting').filter({ hasText: 'Sao lưu & khôi phục' }).scrollIntoViewIfNeeded();
    });
    await captureView('dashboard-activity', 'dashboard', async () => {
      await page.locator('#main .panel').last().scrollIntoViewIfNeeded();
    });
    await captureView('notifications', 'dashboard', async () => {
      await page.locator('#notificationToggle').click();
      await expect(page.locator('#notificationPanel')).toBeVisible();
    });

    expect(pageErrors, 'Fixture visual renders should not throw browser runtime exceptions').toEqual([]);
    expect(attemptedWrites, 'The local fixture should block all mutating API calls').toEqual([]);
    expect(unexpectedApiPaths, 'Every Admin API request should use an explicit synthetic fixture').toEqual([]);
    visualAudit.completed = true;
  } catch (error) {
    visualAudit.failure = String(error?.message || error).slice(0, 1200);
    visualAudit.failureContext = {
      appViewVisible: await page.locator('#appView').isVisible().catch(() => false),
      loginViewVisible: await page.locator('#loginView').isVisible().catch(() => false),
      connectionStatus: await page.locator('#conn').innerText().catch(() => null),
      fixtureApiRequests: fixtureApiRequests.slice(-30),
      fixtureApiErrors: fixtureApiErrors.slice(-10),
      unexpectedApiPaths: unexpectedApiPaths.slice(-20)
    };
    throw error;
  } finally {
    visualAudit.capturedAt = new Date().toISOString();
    visualAudit.pageErrors = pageErrors;
    visualAudit.consoleErrors = consoleErrors;
    visualAudit.attemptedWrites = attemptedWrites;
    visualAudit.unexpectedApiPaths = unexpectedApiPaths;
    visualAudit.fixtureApiRequests = fixtureApiRequests;
    visualAudit.fixtureApiErrors = fixtureApiErrors;
    const metadataPath = join(outputDir, 'metadata.json');
    let existing = {};
    try {
      if (existsSync(metadataPath)) existing = JSON.parse(readFileSync(metadataPath, 'utf8'));
    } catch {}
    existing.uiFixtureVisualAudit = visualAudit;
    writeFileSync(metadataPath, JSON.stringify(existing, null, 2) + '\n');
  }
});
