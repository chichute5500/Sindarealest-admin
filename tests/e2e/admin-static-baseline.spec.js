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
          const logo = document.querySelector('#loginView .brand-logo');
          const topbarLogo = document.querySelector('.topbar > .brand .brand-logo');
          const fitsViewport = element => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 &&
              rect.left >= -1 && rect.right <= window.innerWidth + 1;
          };
          return {
            title: document.title,
            lang: document.documentElement.lang,
            brandImagePath: new URL(logo?.getAttribute('src')||'',document.baseURI).pathname,
            brandImageFilter: logo?getComputedStyle(logo).filter:null,
            topbarImageFilter: topbarLogo?getComputedStyle(topbarLogo).filter:null,
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

        expect(metrics.brandImagePath, 'Official SD emblem path must not be substituted').toBe('/images/brand-emblem.png');
        expect(metrics.brandImageFilter, 'Login brand mark must preserve original gold in '+theme+' at '+viewport.width+'px').toBe('none');
        expect(metrics.topbarImageFilter, 'Header brand mark must preserve original color even when hidden at login').toBe('none');
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
  // This single fixture covers every Admin module plus responsive screenshots.
  // Do not skip checks under slow CI CPU; retain all visual and functional assertions.
  test.setTimeout(900_000);
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
  const fixtureProducts = [
    { ...fixtureProduct, fulfillmentType: 'unclassified' },
    {
      id: 'UI-ONLY-PRODUCT-BELT', slug: 'ui-only-belt', title: 'Thắt lưng thử nghiệm giao diện',
      sku: 'UI-FIXTURE-002', skuVerified: false, category: 'belts', categoryLabel: 'Thắt lưng',
      description: 'Fixture tổng hợp; không phải sản phẩm thật.', price: null, stock: null,
      published: false, fulfillmentType: 'in_stock', images: []
    },
    {
      id: 'UI-ONLY-PRODUCT-STRAP', slug: 'ui-only-strap', title: 'Dây đồng hồ thử nghiệm giao diện',
      sku: 'UI-FIXTURE-003', skuVerified: false, category: 'watch-straps', categoryLabel: 'Dây đồng hồ',
      description: 'Fixture tổng hợp; không phải sản phẩm thật.', price: null, stock: null,
      published: true, fulfillmentType: 'made_to_order', images: []
    }
  ];
  const fixtureApi = {
    '/api/admin/session': { authenticated: true, fixtureOnly: true },
    '/api/admin/products': { products: fixtureProducts },
    '/api/admin/settings': {
      showPrices: true,
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
    '/api/admin/payment-qr': {
      active: false,
      activeImageUrl: '',
      pending: false,
      pendingImageUrl: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      instructions: '',
      draftSaved: false
    },
    '/api/admin/orders': {
      orders: [{
        id: 'UI-ONLY-ORDER',
        order_number: 'UI-ONLY-ORDER',
        created_at: 'DỮ LIỆU TEST',
        full_name: 'Khách thử nghiệm giao diện',
        phone: '—', email: '', address: '',
        items: [{ id: 'UI-ONLY-ITEM', title: 'Sản phẩm thử nghiệm giao diện', quantity: 1, sku: 'UI-FIXTURE-001', skuVerified: false, unitPrice: null }],
        total: null, status: 'pending_confirmation', payment_status: 'unpaid', price_confirmation_required: true
      }, {
        id: 'UI-ONLY-ORDER-2', order_number: 'UI-ONLY-ORDER-2', created_at: 'DỮ LIỆU TEST',
        full_name: 'Khách UI Fixture 2', phone: '0000000002', email: '', address: '',
        items: [{ id: 'UI-ONLY-ITEM-2', title: 'Sản phẩm UI fixture 2', quantity: 1, sku: 'UI-FIXTURE-002', skuVerified: false, unitPrice: 3200000, fulfillmentType: 'in_stock' }],
        total: 3200000, status: 'processing', payment_status: 'unpaid', price_confirmation_required: false
      }, {
        id: 'UI-ONLY-ORDER-3', order_number: 'UI-ONLY-ORDER-3', created_at: 'DỮ LIỆU TEST',
        full_name: 'Khách UI Fixture 3', phone: '0000000003', email: '', address: '',
        items: [{ id: 'UI-ONLY-ITEM-3', title: 'Sản phẩm UI fixture 3', quantity: 1, sku: 'UI-FIXTURE-003', skuVerified: false, unitPrice: 7800000, fulfillmentType: 'made_to_order' }],
        total: 7800000, received_amount: 7800000, status: 'completed', payment_status: 'paid',
        payment_terms_confirmed_at: '2026-10-21T00:00:00.000Z', price_confirmation_required: false
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
      }, {
        id: 'UI-ONLY-CUSTOMER-2',
        fullName: 'Khách UI Fixture 2',
        phone: '0000000002',
        email: 'fixture-two@example.test',
        address: 'ĐỊA CHỈ TEST',
        orderCount: 2,
        lastOrderAt: '2026-10-20',
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
      warranties: [{
        warrantyCode: 'UI-ONLY-WARRANTY',
        orderNumber: 'UI-ONLY-ORDER',
        sku: 'UI-FIXTURE-001',
        skuVerified: false,
        title: 'Sản phẩm thử nghiệm giao diện',
        policyName: 'Chính sách thử nghiệm giao diện',
        startsAt: '2026-01-01',
        endsAt: '2027-01-01',
        durationMonths: 12,
        status: 'active'
      }]
    },
    '/api/admin/audit-logs': {
      logs: [{
        created_at: '2026-10-21 10:24:00',
        action: 'product_updated',
        entity_type: 'product',
        entity_id: 'UI-ONLY-PRODUCT',
        actor: 'UI fixture',
        details_json: JSON.stringify({ title: fixtureProduct.title, sku: fixtureProduct.sku })
      }, {
        created_at: '2026-10-20 09:17:00',
        action: 'order_created',
        entity_type: 'order',
        entity_id: 'UI-ONLY-ORDER-2',
        actor: 'admin',
        details_json: JSON.stringify({ orderNumber: 'UI-ONLY-ORDER-2' })
      }, {
        created_at: '2026-10-19 08:56:00',
        action: 'customer_updated',
        entity_type: 'customer',
        entity_id: 'UI-ONLY-CUSTOMER-2',
        actor: 'admin',
        details_json: JSON.stringify({ customerName: 'Khách UI fixture 2' })
      }, {
        created_at: '2026-10-18 08:32:00',
        action: 'product_created',
        entity_type: 'product',
        entity_id: 'UI-ONLY-PRODUCT-2',
        actor: 'admin',
        details_json: JSON.stringify({ title: 'Sản phẩm UI fixture 2', sku: 'UI-FIXTURE-002' })
      }, {
        created_at: '2026-10-17 07:45:00',
        action: 'order_updated',
        entity_type: 'order',
        entity_id: 'UI-ONLY-ORDER-3',
        actor: 'admin',
        details_json: JSON.stringify({ orderNumber: 'UI-ONLY-ORDER-3' })
      }]
    }
  };

  const screenshots = [];
  const metrics = [];
  const visibleClosingTagIssues = [];
  const pageErrors = [];
  const consoleErrors = [];
  const attemptedWrites = [];
  const unexpectedApiPaths = [];
  const fixtureApiRequests = [];
  const optionalEndpointFailures = new Set();
  const fixtureApiErrors = [];
  const narrowMobile = { width: 320, height: 640 };
  const compactMobile = { width: 360, height: 800 };
  const mobile = { width: 390, height: 844 };
  const desktop = { width: 1280, height: 800 };
  // Audit every fixture module at narrow widths, not only the product/warranty specials.
  const variants = [
    { viewport: mobile, theme: 'light' },
    { viewport: mobile, theme: 'dark' },
    { viewport: desktop, theme: 'light' },
    { viewport: desktop, theme: 'dark' }
  ];
  const viewLabels = {
    dashboard: 'Thao tác nhanh',
    products: 'Tìm tên, SKU hoặc danh mục',
    orders: 'Mã đơn / thời gian',
    customers: 'Số đơn',
    warranties: 'Mã bảo hành đã phát hành',
    settings: 'Cài đặt watermark',
    backup: 'Sao lưu & khôi phục',
    activity: 'Nhật ký hoạt động'
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
    if (optionalEndpointFailures.has(pathname)) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'UI-only simulated unavailable endpoint.' }) });
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
    // Capture first, then inspect the exact rendered state after screenshot's
    // animation suppression/render flush; this catches delayed UI artifacts.
    await page.screenshot({ path: filePath, animations: 'disabled' });
    await page.waitForTimeout(100);
    const measurement = await page.evaluate((screenName) => {
      const rawClosingTagNodes = [];
      const rawClosingTagPseudoContent = [];
      // Search the full document tree, not only body text. Range geometry tells us
      // whether the exact token is actually painted; parent boxes alone can miss
      // text that overflows a zero-sized/positioned wrapper.
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const value = node.nodeValue || '';
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,template,noscript')) continue;
        let index = value.indexOf('</div>');
        while (index >= 0) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 6);
          const paintedRects = [...range.getClientRects()].filter(rect =>
            rect.width > 0 && rect.height > 0 &&
            rect.right > 0 && rect.left < window.innerWidth &&
            rect.bottom > 0 && rect.top < window.innerHeight
          );
          let visible = true;
          for (let element = parent; element; element = element.parentElement) {
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
              visible = false;
              break;
            }
          }
          if (visible && paintedRects.length) {
            const rect = paintedRects[0];
            rawClosingTagNodes.push({
              token: '</div>',
              text: value.trim().slice(0, 120),
              tag: parent.tagName,
              id: parent.id || null,
              className: typeof parent.className === 'string' ? parent.className.slice(0, 120) : null,
              outerHTML: parent.outerHTML.slice(0, 320),
              x: Math.round(rect.x),
              y: Math.round(rect.y)
            });
          }
          index = value.indexOf('</div>', index + 6);
        }
      }

      // CSS-generated content is not represented by SHOW_TEXT nodes. Include
      // html/body themselves as a stray artifact may be painted by a root pseudo-element.
      const allElements = [document.documentElement, document.body, ...document.querySelectorAll('body *')];
      for (const element of allElements) {
        if (!element) continue;
        let visible = true;
        for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
            visible = false;
            break;
          }
        }
        if (!visible) continue;
        const rect = element.getBoundingClientRect();
        for (const pseudo of ['::before', '::after', '::marker']) {
          const content = getComputedStyle(element, pseudo).content || '';
          if (content.includes('</div>') && content !== 'none' && content !== 'normal') {
            rawClosingTagPseudoContent.push({
              pseudo,
              content: content.slice(0, 120),
              tag: element.tagName,
              id: element.id || null,
              className: typeof element.className === 'string' ? element.className.slice(0, 120) : null,
              x: Math.round(rect.x),
              y: Math.round(rect.y)
            });
          }
        }
      }
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        tableScrollStates: [...document.querySelectorAll('.tablewrap')].map(element => ({
          className: typeof element.className === 'string' ? element.className : '',
          scrollLeft: Math.round(element.scrollLeft),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth
        })),
        visibleTextContainsClosingTag: (document.body.innerText || '').includes('</div>'),
        bodyTextClosingTagContext: (() => {
          const bodyText = document.body.innerText || '';
          const index = bodyText.indexOf('</div>');
          return index < 0 ? null : bodyText.slice(Math.max(0, index - 80), Math.min(bodyText.length, index + 100));
        })(),
        theme: document.documentElement.dataset.adminTheme || null,
        lang: document.documentElement.lang,
        rawClosingTagNodes: rawClosingTagNodes.slice(0, 10),
        rawClosingTagPseudoContent: rawClosingTagPseudoContent.slice(0, 10),
        hitTestDiagnostics: (() => {
          // Target the exact blank area where the screenshot showed a stray </div>
          // while DOM text and pseudo-element scans were unexpectedly empty.
          if (screenName !== 'customers' || window.innerWidth !== 390 ||
              document.documentElement.dataset.adminTheme !== 'light') return [];
          const findings = [];
          for (let y = 620; y <= 700; y += 4) {
            for (let x = 0; x <= 84; x += 4) {
              const range = document.caretRangeFromPoint?.(x, y);
              const node = range?.startContainer?.nodeType === Node.TEXT_NODE
                ? range.startContainer : null;
              const text = node?.nodeValue || '';
              const element = document.elementFromPoint(x, y);
              const pseudo = element ? ['::before', '::after', '::marker']
                .map(name => ({ name, content: getComputedStyle(element, name).content || '' }))
                .filter(item => item.content.toLowerCase().includes('div') || item.content.includes('<'))
                : [];
              if (text.includes('</div>') || text.includes('/div>') || text.includes('<div') || pseudo.length) {
                findings.push({
                  x, y, offset: range?.startOffset ?? null,
                  nodeText: text.slice(0, 180),
                  nodeTag: node?.parentElement?.tagName || null,
                  nodeId: node?.parentElement?.id || null,
                  nodeClass: typeof node?.parentElement?.className === 'string' ? node.parentElement.className.slice(0, 140) : null,
                  nodeOuterHTML: node?.parentElement?.outerHTML?.slice(0, 500) || null,
                  hitTag: element?.tagName || null,
                  hitId: element?.id || null,
                  hitClass: typeof element?.className === 'string' ? element.className.slice(0, 140) : null,
                  hitOuterHTML: element?.outerHTML?.slice(0, 500) || null,
                  pseudo
                });
              }
            }
          }
          return findings.slice(0, 40);
        })()
      };
    }, name);
    const hasSuspiciousHitTest = measurement.hitTestDiagnostics.some(item =>
      (item.nodeText || '').includes('</div>') ||
      (item.nodeText || '').includes('/div>') ||
      item.pseudo.some(p => (p.content || '').includes('</div>') || (p.content || '').includes('/div>'))
    );
    if (measurement.rawClosingTagNodes.length || measurement.rawClosingTagPseudoContent.length || hasSuspiciousHitTest) {
      visibleClosingTagIssues.push({
        screen: name,
        viewport: variant.viewport,
        theme: variant.theme,
        textNodes: measurement.rawClosingTagNodes,
        pseudoElements: measurement.rawClosingTagPseudoContent,
        hitTestDiagnostics: measurement.hitTestDiagnostics
      });
    }
    metrics.push({ screen: name, ...variant, ...measurement, ...extra });
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    expect(measurement.horizontalOverflow, name + ' should not overflow horizontally at ' + variant.viewport.width + 'px').toBe(false);
    screenshots.push({ file: filename, screen: name, ...variant, ...extra });
  };

  const captureView = async (name, view, prepare, fullPageAtMobileLight = false, scrollSelector = null) => {
    await navigateTo(view);
    for (const variant of variants) {
      await page.setViewportSize(variant.viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await chooseTheme(variant.theme);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (prepare) await prepare(variant);
      // Interaction checks can scroll an overflow table to expose right-hand actions.
      // Normalize the scroll container before saving the baseline screenshot so its
      // leftmost columns are always visible in the artifact.
      await page.evaluate(() => {
        document.querySelectorAll('.tablewrap').forEach(element => { element.scrollLeft = 0; });
        window.scrollTo(0, 0);
      });
      if (scrollSelector) await page.locator(scrollSelector).scrollIntoViewIfNeeded();
      if (name === 'warranties') {
        await expect(page.locator('#toast'),
          'Screen 9 baseline screenshot must not retain the success toast from the preceding retry test')
          .not.toHaveClass(/show/);
      }
      await saveScreenshot(name, variant);
      if (name === 'orders' && variant.viewport.width > 680) {
        const orderMetric = metrics[metrics.length - 1];
        expect(orderMetric.tableScrollStates.every(state => state.scrollLeft === 0),
          'Desktop order screenshot must start from the left edge of each table wrapper: ' +
          JSON.stringify(orderMetric.tableScrollStates)).toBe(true);
      }
      if (fullPageAtMobileLight && variant.theme === 'light' && variant.viewport.width === mobile.width) {
        const filename = name + '__' + variant.viewport.width + 'x' + variant.viewport.height + '__light__full.png';
        await page.screenshot({ path: join(screenshotDir, filename), fullPage: true, animations: 'disabled' });
        screenshots.push({ file: filename, screen: name, ...variant, fullPage: true });
      }
      if (name === 'notifications') {
        const panel = page.locator('#notificationPanel');
        if (await panel.isVisible()) await page.locator('#notificationToggle').click();
      }
      if (name === 'mobile-more-menu') {
        const menu = page.locator('#mobileMorePanel');
        if (await menu.isVisible()) await page.locator('#mobileMoreTrigger').click();
      }
      if (name === 'order-detail' && await page.locator('.order-detail-page').isVisible()) {
        const orderId = await page.locator('.order-detail-page').getAttribute('data-order-detail-id');
        await page.locator('[data-action="back-to-orders"]:visible').first().click();
        await expect(page.locator('#main .pagehead h2')).toHaveText('Đơn hàng');
        await expect(page.locator('[data-order-row="' + orderId + '"]')).toBeVisible();
      }
    }
  };

  const openEditor = async variant => {
    await page.setViewportSize(variant.viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await chooseTheme(variant.theme);
    await page.locator('[data-product-row]:visible .prodname').first().click();
    await expect(page.locator('#backdrop')).toBeVisible();
    expect(pageErrors, 'Opening Product Editor must not throw a browser JavaScript error').toEqual([]);
    await expect(page.locator('#backdrop')).toHaveAttribute('aria-hidden', 'false');
    // The editor must meet the fixed mobile nav without exposing the product list
    // through a gap (and must not cover the nav). Test both light/dark and all
    // narrow viewports used by the existing baseline, not just a screenshot.
    if (variant.viewport.width <= 680) {
      const seam = await page.evaluate(() => {
        const overlay = document.querySelector('#backdrop').getBoundingClientRect();
        const nav = document.querySelector('.mobiletabs').getBoundingClientRect();
        return { overlayBottom:overlay.bottom, navTop:nav.top, viewportHeight:innerHeight };
      });
      expect(Math.abs(seam.overlayBottom-seam.navTop),
        'Modal and mobile navigation must share a seamless boundary: '+JSON.stringify(seam))
        .toBeLessThanOrEqual(2);
    }
    await expect(page.locator('#editorTitle')).toContainText('Chỉnh sửa sản phẩm');
    // Reference screen 4 uses a back affordance, not an X close icon, before returning to the product list.
    await expect(page.locator('#editorClose')).toHaveAttribute('aria-label', 'Quay lại danh sách sản phẩm');
    await expect(page.locator('#editorClose svg path').first()).toHaveAttribute('d', 'M15 18 9 12 15 6');
    // Reference Screens 4/5 use compact visible CTA labels while keeping their full accessible names.
    await expect(page.locator('#deleteProduct')).toHaveText('Xóa');
    await expect(page.locator('#saveProduct')).toHaveText('Lưu');
    await expect(page.locator('#deleteProduct')).toHaveAttribute('aria-label', 'Xóa sản phẩm');
    await expect(page.locator('#saveProduct')).toHaveAttribute('aria-label', 'Lưu sản phẩm');
    await expect(page.locator('#pTitle')).toBeFocused();
    const assertProductTabsFit = async viewportWidth => {
      const layout = await page.locator('#productEditorTabs .editor-tab').evaluateAll(tabs =>
        tabs.map(tab => ({
          label: tab.textContent?.trim(),
          whiteSpace: getComputedStyle(tab).whiteSpace,
          fontSize: getComputedStyle(tab).fontSize,
          clientWidth: tab.clientWidth,
          scrollWidth: tab.scrollWidth
        }))
      );
      expect(layout.every(tab => tab.whiteSpace === 'nowrap' && tab.scrollWidth <= tab.clientWidth + 1),
        'Product tab labels must remain on one line at ' + viewportWidth + 'px: ' + JSON.stringify(layout)).toBe(true);
    };
    await assertProductTabsFit(variant.viewport.width);

    // The current editor deliberately omits SKU, stock and visibility controls.
    const editorLayout = await page.evaluate(() => {
      const selectors = ['#pTitle', '#pCategory', '#pFulfillmentToggle', '#pDescription', '#generateDescription', '#pPrice'];
      const fields = Object.fromEntries(selectors.map(selector => {
        const element = document.querySelector(selector), rect = element?.getBoundingClientRect();
        return [selector, rect ? {left:rect.left,right:rect.right,width:rect.width,height:rect.height} : null];
      }));
      return {fields, documentWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth};
    });
    for (const selector of ['#pTitle', '#pCategory', '#pFulfillmentToggle', '#pDescription', '#generateDescription', '#pPrice']) {
      expect(editorLayout.fields[selector], selector + ' should render in the editor: ' + JSON.stringify(editorLayout)).not.toBeNull();
      expect(editorLayout.fields[selector].left, selector + ' must stay within the viewport').toBeGreaterThanOrEqual(-1);
      expect(editorLayout.fields[selector].right, selector + ' must stay within the viewport').toBeLessThanOrEqual(variant.viewport.width + 1);
    }
    for (const removedField of ['#pSku', '#pSkuVerified', '#pStock', '#pPublished'])
      await expect(page.locator(removedField)).toHaveCount(0);
    expect(editorLayout.documentWidth, 'Product editor must not overflow its viewport: ' + JSON.stringify(editorLayout))
      .toBeLessThanOrEqual(variant.viewport.width);

    // Reference-aligned editor grouping: core fields, images, then extra settings.
    await expect(page.locator('#productEditorTabs')).toHaveAttribute('role', 'tablist');
    await expect(page.locator('#productTabDetails')).toHaveText('Thông tin cơ bản');
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#productPanelDetails #pTitle')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pCategory')).toBeVisible();
    const categoryInput = page.locator('#pCategory');
    await expect(categoryInput).toHaveAttribute('aria-controls', 'productCategoryGrid');
    await expect(categoryInput).toHaveAttribute('inputmode', 'none');
    await expect(page.locator('#productPanelDetails #pDescription')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pPrice')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pPrice')).toHaveAttribute('placeholder', 'Chưa có giá');
    await expect(page.locator('#productPanelDetails #pPrice')).toHaveAttribute('title', 'Để trống nếu chưa có giá');
    for (const removedField of ['#pSku', '#pSkuVerified', '#pStock', '#pPublished'])
      await expect(page.locator(removedField)).toHaveCount(0);

    await page.locator('#productCategoryToggle').click();
    await expect(page.locator('#productCategoryGrid')).toBeVisible();
    await expect(page.locator('#productCategoryGrid [data-category-pick]')).toHaveCount(15);
    await page.locator('#productCategoryGrid [data-category-pick]').first().click();
    await expect(page.locator('#productCategoryGrid')).toBeHidden();

    const fulfillmentToggle = page.locator('#pFulfillmentToggle');
    await expect(fulfillmentToggle).toHaveAttribute('data-fulfillment', 'made_to_order');
    await fulfillmentToggle.click();
    await expect(fulfillmentToggle).toHaveAttribute('data-fulfillment', 'in_stock');
    await expect(fulfillmentToggle).toContainText('Hàng có sẵn');
    await fulfillmentToggle.click();
    await expect(fulfillmentToggle).toHaveAttribute('data-fulfillment', 'made_to_order');
    await expect(page.locator('#backdrop .editor').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);

    await page.locator('#productTabGallery').click();
    await expect(page.locator('#productTabGallery')).toHaveText('Hình ảnh');
    await expect(page.locator('#editorTitle')).toHaveText('Hình ảnh sản phẩm');
    await expect(page.locator('#productTabGallery')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#imageGrid')).toBeVisible();
    await expect(page.locator('#chooseImages')).toBeVisible();
    if (variant.viewport.width > 680) {
      const galleryLayout = await page.evaluate(() => {
        const rect = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const bounds = element.getBoundingClientRect();
          return { top: bounds.top, bottom: bounds.bottom };
        };
        return { tabs:rect('#productEditorTabs'), heading:rect('#productPanelGallery > .sectionlabel'), upload:rect('.gallery-add-row') };
      });
      expect(galleryLayout.heading?.top, 'Desktop gallery heading should be visible below the editor tabs: ' + JSON.stringify(galleryLayout)).not.toBeNull();
      expect(galleryLayout.heading.top, 'Gallery heading must not be obscured by tabs: ' + JSON.stringify(galleryLayout)).toBeGreaterThanOrEqual(galleryLayout.tabs.bottom - 1);
      expect(galleryLayout.upload?.top, 'Image controls should follow the gallery heading: ' + JSON.stringify(galleryLayout)).toBeGreaterThan(galleryLayout.heading.bottom - 1);
    }
    await expect(page.locator('#productPanelGallery #pTitle')).toHaveCount(0);
    await expect(page.locator('#pPrice')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#productTabDetails')).toBeFocused();
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#productTabGallery')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#productTabDetails')).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.locator('#productTabGallery')).toBeFocused();
    await page.locator('#productTabDetails').click();

    // Keyboard focus is trapped in the product dialog and wraps at both ends.
    await page.locator('#editorClose').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#saveProduct')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#editorClose')).toBeFocused();
    await page.locator('#pTitle').focus();
    await page.locator('#backdrop .editorcontent').evaluate(el => { el.scrollTop = 0; });
  };

  try {
    await page.setViewportSize(mobile);
    await page.emulateMedia({ colorScheme: 'light' });
    const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    expect(response?.status(), 'Local source ADMIN should load for fixture-only visual review').toBe(200);
    await expect(page.locator('#appView')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#main .statgrid')).toBeVisible();
    await expect(page.locator('#main .statgrid .stat')).toHaveCount(4);
    await expect(page.locator('#main .dashboard-shortcuts .dashboard-shortcut')).toHaveCount(4);
    await expect(page.locator('#main .dashboard-shortcuts [data-action="add"]')).toContainText('Thêm sản phẩm');
    await expect(page.locator('#main .dashboard-shortcuts [data-view="orders"]')).toContainText('Đơn hàng');
    await expect(page.locator('#main .dashboard-shortcuts [data-view="customers"]')).toContainText('Khách hàng');
    await expect(page.locator('#main .dashboard-shortcuts [data-action="backup"]')).toContainText('Sao lưu');
    await expect(page.locator('.dashboard-revenue')).toBeVisible();
    await expect(page.locator('#main .dashboard-revenue')).toContainText('Chưa thể hiển thị biểu đồ doanh thu');
    await expect(page.locator('#main .dashboard-revenue')).toContainText('Không dùng số đơn gần nhất hoặc dữ liệu chưa xác minh');
    await expect(page.locator('#main .dashboard-activity-table')).toBeVisible();
    await expect(page.locator('#main .dashboard-activity-table td[data-label="Thời điểm"]').first()).toBeVisible();
    await expect(page.locator('#main .dashboard-activity-table').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);

    await captureView('dashboard', 'dashboard', null, true);
    // Capture the dashboard at the reference phone's usable app height without
    // multiplying that slower viewport across every route in the QA matrix.
    const referenceDashboardVariant = { viewport: { width: 430, height: 720 }, theme: 'light' };
    await page.setViewportSize(referenceDashboardVariant.viewport);
    await chooseTheme(referenceDashboardVariant.theme);
    await page.evaluate(() => window.scrollTo(0, 0));
    await saveScreenshot('dashboard-reference-viewport', referenceDashboardVariant);
    const referenceDashboardGeometry = await page.evaluate(() => {
      const revenue = document.querySelector('#main .dashboard-revenue')?.getBoundingClientRect();
      const navigation = document.querySelector('.mobiletabs')?.getBoundingClientRect();
      return {
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        revenueBottom: revenue ? Math.round(revenue.bottom) : null,
        navigationTop: navigation ? Math.round(navigation.top) : null
      };
    });
    expect(referenceDashboardGeometry.revenueBottom,
      'Reference-height dashboard should show the revenue panel above the fixed mobile navigation: ' + JSON.stringify(referenceDashboardGeometry))
      .toBeLessThanOrEqual(referenceDashboardGeometry.navigationTop - 8);
    await captureView('products', 'products', null, true);

    // Screen #3 reference matrix: exercise the actual ADMIN product renderer at required
    // phone, tablet, and desktop widths in both themes. Data remains synthetic and writes stay blocked.
    console.info('[ADMIN_STATIC_STAGE] dashboard reference viewport and geometry passed');
    const productReferenceViewports = [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 }
    ];
    for (const productViewport of productReferenceViewports) {
      for (const productTheme of ['light', 'dark']) {
        await page.setViewportSize(productViewport);
        await chooseTheme(productTheme);
        await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          document.querySelectorAll('#main .tablewrap').forEach(element => { element.scrollLeft = 0; });
        });

        await expect(page.locator('#main .pagehead')).toBeVisible();
        await expect(page.locator('#searchBox')).toBeVisible();
        await expect(page.locator('#categoryBox')).toBeVisible();
        await expect(page.locator('#fulfillmentBox')).toBeVisible();
        await expect(page.locator('#productPublishFilters')).toBeVisible();
        await expect(page.locator('#main .product-table tbody tr')).toHaveCount(3);
        await expect(page.locator('#main .product-table')).toContainText('Chưa nhập');
        await expect(page.locator('#main .product-table')).not.toContainText('Tồn kho');
        await expect(page.locator('#main .product-table')).not.toContainText('Chưa kiểm kê');

        const productMatrixLayout = await page.evaluate(() => {
          const rect = element => {
            const box = element.getBoundingClientRect();
            return {
              left: Math.round(box.left * 100) / 100,
              right: Math.round(box.right * 100) / 100,
              top: Math.round(box.top * 100) / 100,
              bottom: Math.round(box.bottom * 100) / 100,
              width: Math.round(box.width * 100) / 100,
              height: Math.round(box.height * 100) / 100
            };
          };
          const main = document.querySelector('#main');
          const wrapper = document.querySelector('#main .product-table')?.closest('.tablewrap');
          const table = document.querySelector('#main .product-table');
          const rows = [...document.querySelectorAll('#main .product-table tbody tr')];
          const controls = ['#main .pagehead', '#searchBox', '#categoryBox', '#fulfillmentBox', '#productPublishFilters']
            .map(selector => {
              const element = document.querySelector(selector);
              if (!element) return { selector, exists: false };
              const bounds = rect(element);
              const style = getComputedStyle(element);
              return {
                selector,
                exists: true,
                visible: style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0,
                bounds,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                accessibleName: element.getAttribute('aria-label') ||
                  (element.id ? document.querySelector('label[for="' + element.id + '"]')?.innerText?.trim() : null)
              };
            });
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            theme: document.documentElement.dataset.adminTheme || null,
            main: rect(main),
            mainClientWidth: main.clientWidth,
            mainScrollWidth: main.scrollWidth,
            wrapper: rect(wrapper),
            wrapperClientWidth: wrapper.clientWidth,
            wrapperScrollWidth: wrapper.scrollWidth,
            table: rect(table),
            tableClientWidth: table.clientWidth,
            tableScrollWidth: table.scrollWidth,
            controls,
            rows: rows.map(row => {
              const bounds = rect(row);
              return {
                bounds,
                clientWidth: row.clientWidth,
                scrollWidth: row.scrollWidth,
                thumbnail: (() => {
                  const element = row.querySelector('.thumb');
                  return {
                    tagName: element?.tagName || null,
                    role: element?.getAttribute('role') || null,
                    accessibleName: element?.getAttribute('aria-label') || null,
                    source: element?.getAttribute('src') || null
                  };
                })(),
                title: row.querySelector('.prodname')?.textContent?.trim() || null,
                titleAttribute: row.querySelector('.prodname')?.getAttribute('title') || null,
                priceText: row.querySelector('.product-mobile-inline-metric:first-child')?.innerText?.trim() || null,
                hasEditButton: Boolean(row.querySelector('button[data-action="edit"]')),
                hasInventoryDisplay: /tồn kho|chưa kiểm kê|hết hàng/i.test(row.innerText),
                cells: [...row.querySelectorAll('td')].map(cell => ({
                  text: (cell.innerText || '').trim().slice(0, 90),
                  bounds: rect(cell),
                  clientWidth: cell.clientWidth,
                  scrollWidth: cell.scrollWidth
                }))
              };
            })
          };
        });

        expect(productMatrixLayout.documentWidth,
          'Screen #3 must not widen the document at ' + productViewport.width + 'px (' + productTheme + '): ' + JSON.stringify(productMatrixLayout))
          .toBeLessThanOrEqual(productViewport.width);
        expect(productMatrixLayout.bodyWidth,
          'Screen #3 must not widen the body at ' + productViewport.width + 'px (' + productTheme + '): ' + JSON.stringify(productMatrixLayout))
          .toBeLessThanOrEqual(productViewport.width);
        expect(productMatrixLayout.mainScrollWidth,
          'Screen #3 main content must stay within its layout column: ' + JSON.stringify(productMatrixLayout))
          .toBeLessThanOrEqual(productMatrixLayout.mainClientWidth + 1);
        expect(productMatrixLayout.controls.every(control =>
          control.exists && control.visible &&
          control.bounds.left >= -1 && control.bounds.right <= productViewport.width + 1),
          'Screen #3 heading/search/filter controls must be visible and within viewport: ' + JSON.stringify(productMatrixLayout.controls))
          .toBe(true);
        expect(productMatrixLayout.controls.filter(control =>
          ['#searchBox', '#categoryBox', '#fulfillmentBox', '#productPublishFilters'].includes(control.selector))
          .every(control => Boolean(control.accessibleName?.trim())),
          'Screen #3 search and filter controls must expose accessible names: ' + JSON.stringify(productMatrixLayout.controls))
          .toBe(true);
        expect(productMatrixLayout.rows, 'Screen #3 renders three explicit synthetic products').toHaveLength(3);
        expect(productMatrixLayout.rows.every(row =>
          row.bounds.left >= productMatrixLayout.wrapper.left - 1 &&
          row.bounds.right <= productMatrixLayout.wrapper.left + productMatrixLayout.wrapperScrollWidth + 1 &&
          Boolean(row.titleAttribute) &&
          !row.hasEditButton &&
          !row.hasInventoryDisplay),
          'Each product row must fit the table wrapper without a separate edit button or inventory display: ' + JSON.stringify(productMatrixLayout.rows))
          .toBe(true);
        expect(productMatrixLayout.rows.every(row =>
          row.thumbnail.tagName === 'SPAN' &&
          row.thumbnail.role === 'img' &&
          row.thumbnail.accessibleName === 'Chưa có ảnh sản phẩm' &&
          row.thumbnail.source === null),
          'A missing product image must show an explicitly labelled placeholder, never a generic texture presented as product photography')
          .toBe(true);
        expect(productMatrixLayout.rows.every(row => row.priceText?.includes('Chưa nhập')),
          'Fixtures must keep unconfirmed prices truthful instead of inventing business data')
          .toBe(true);
        if (productViewport.width <= 680) {
          expect(productMatrixLayout.wrapperScrollWidth,
            'Narrow product-list wrapper/cards must not create horizontal clipping: ' + JSON.stringify(productMatrixLayout))
            .toBeLessThanOrEqual(productMatrixLayout.wrapperClientWidth + 1);
          expect(productMatrixLayout.tableScrollWidth,
            'Narrow product-list table/cards must fit their wrapper: ' + JSON.stringify(productMatrixLayout))
            .toBeLessThanOrEqual(productMatrixLayout.tableClientWidth + 1);
          expect(productMatrixLayout.rows.every(row =>
            row.scrollWidth <= row.clientWidth + 1 &&
            row.cells.every(cell => cell.scrollWidth <= cell.clientWidth + 1)),
            'Narrow product cards and cells must wrap instead of clipping: ' + JSON.stringify(productMatrixLayout.rows))
            .toBe(true);
        }

        await saveScreenshot('products-reference-matrix', {
          viewport: productViewport,
          theme: productTheme
        }, {
          fixtureOnly: true,
          screenFamily: 3,
          referenceViewportMatrix: true,
          noHorizontalOverflow: true,
          noInventedPriceOrStock: true,
          fixtureProductCount: 3
        });
      }
    }

    console.info('[ADMIN_STATIC_STAGE] product reference matrix passed');
    // Compact mobile cards show price and publication status; inventory stays in product details.
    await page.setViewportSize(mobile);
    await chooseTheme('light');
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileProductRows = page.locator('#main .product-table tbody tr');
    await expect(mobileProductRows).toHaveCount(3);
    await expect(page.locator('#main .product-table .product-thumb-placeholder[role="img"][aria-label="Chưa có ảnh sản phẩm"]')).toHaveCount(3);
    await expect(page.locator('#main .product-table img.thumb')).toHaveCount(0);
    const mobileCardLayout = await mobileProductRows.first().evaluate(row => {
      const rect = selector => {
        const box = row.querySelector(selector).getBoundingClientRect();
        return { top: box.top, right: box.right, bottom: box.bottom, height: box.height, width: box.width };
      };
      return {
        rowHeight: row.getBoundingClientRect().height,
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        identity: rect('.rowprod'),
        price: rect('.product-mobile-inline-metric:first-child'),
        visibleMetrics: getComputedStyle(row.querySelector('.product-mobile-inline-meta')).display,
        priceText: row.querySelector('.product-mobile-inline-metric:first-child').innerText,
        productTitle: row.querySelector('.prodname').getAttribute('title'),
        hasEditButton: Boolean(row.querySelector('button[data-action="edit"]')),
        hasInventoryDisplay: /tồn kho|chưa kiểm kê|hết hàng/i.test(row.innerText),
      };
    });
    expect(mobileCardLayout.visibleMetrics, 'Inline product price must be visible on mobile').toBe('grid');
    expect(mobileCardLayout.priceText).toContain('Chưa nhập');
    expect(mobileCardLayout.hasInventoryDisplay).toBe(false);
    expect(mobileCardLayout.hasEditButton).toBe(false);
    expect(mobileCardLayout.productTitle).toBe('Sản phẩm thử nghiệm giao diện');
    expect(mobileCardLayout.rowHeight, 'Mobile product card should keep title, status, facts and actions in a compact reference-led row').toBeLessThan(115);
    expect(mobileCardLayout.pageWidth, 'Mobile product list must not overflow horizontally').toBeLessThanOrEqual(mobileCardLayout.viewportWidth + 1);
    await saveScreenshot('products-compact-mobile-check', { viewport: mobile, theme: 'light' });

    // Product list search includes category labels and announces result counts.
    const productNames = page.locator('#main .product-table .prodname');
    await expect(productNames).toHaveCount(3);
    const fulfillmentChips = page.locator('#main .product-table .product-fulfillment-chip');
    await expect(fulfillmentChips).toHaveCount(3);
    await expect(page.locator('[data-fulfillment-type="unclassified"]')).toHaveText('Chưa phân loại');
    await expect(page.locator('[data-fulfillment-type="in_stock"]')).toHaveText('Hàng có sẵn');
    await expect(page.locator('[data-fulfillment-type="made_to_order"]')).toHaveText('Hàng đặt riêng');
    await expect(page.locator('#productResultSummary')).toContainText('Có 3 sản phẩm phù hợp');
    await expect(page.locator('#productPublishFilters')).toHaveAttribute('aria-label', 'Lọc trạng thái hiển thị và xóa bộ lọc');
    await expect(page.locator('#clearFilter')).toHaveAttribute('aria-label', 'Xóa tất cả bộ lọc');
    await expect(page.locator('[data-published-filter="all"]')).toContainText('Tất cả (3)');
    await expect(page.locator('[data-published-filter="published"]')).toContainText('Đang hiển thị (2)');
    await expect(page.locator('[data-published-filter="hidden"]')).toContainText('Đã ẩn (1)');
    await expect(page.locator('[data-published-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-published-filter="hidden"]').click();
    await expect(productNames).toHaveCount(1);
    await expect(productNames).toHaveText('Thắt lưng thử nghiệm giao diện');
    await expect(page.locator('[data-published-filter="hidden"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-published-filter="published"]').click();
    await expect(productNames).toHaveCount(2);
    await expect(page.locator('[data-published-filter="published"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-published-filter="all"]').click();
    await expect(productNames).toHaveCount(3);
    await page.getByLabel('Tìm tên, SKU hoặc danh mục').fill('THẮT LƯNG');
    await expect(productNames).toHaveCount(1);
    await expect(productNames).toHaveText('Thắt lưng thử nghiệm giao diện');
    await expect(page.locator('#productResultSummary')).toContainText('Có 1 sản phẩm phù hợp');
    await page.locator('#searchBox').fill('khong-co-san-pham-nay');
    await expect(page.locator('#main .product-empty-state')).toContainText('Thử từ khóa khác hoặc xóa tất cả bộ lọc.');
    await page.locator('#clearFilterEmpty').click();
    await expect(page.locator('#searchBox')).toHaveValue('');
    await expect(page.locator('#categoryBox')).toHaveValue('all');
    await expect(page.locator('#fulfillmentBox')).toHaveValue('all');
    await expect(productNames).toHaveCount(3);
    await page.locator('#categoryBox').selectOption('wallets');
    await expect(productNames).toHaveCount(1);
    await expect(productNames).toHaveText('Sản phẩm thử nghiệm giao diện');
    await expect(page.locator('#productResultSummary')).toContainText('Có 1 sản phẩm phù hợp');
    await page.locator('#categoryBox').selectOption('belts');
    await expect(productNames).toHaveCount(1);
    await expect(productNames).toHaveText('Thắt lưng thử nghiệm giao diện');
    await page.locator('#clearFilter').click();
    await expect(page.locator('#categoryBox')).toHaveValue('all');
    await expect(productNames).toHaveCount(3);

    // Narrow-width responsive audit for the real product-list UI, using read-only UI-ONLY fixtures.
    // Keep product prices truthful; inventory is deliberately omitted from the list UI.
    for (const narrowViewport of [{ width: 320, height: 640 }, { width: 360, height: 800 }]) {
      for (const narrowTheme of ['light', 'dark']) {
        await page.setViewportSize(narrowViewport);
        await chooseTheme(narrowTheme);
        await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        await expect(page.locator('#main .pagehead')).toBeVisible();
        await expect(page.locator('#searchBox')).toBeVisible();
        await expect(page.locator('#categoryBox')).toBeVisible();
        await expect(page.locator('#fulfillmentBox')).toBeVisible();
        await expect(page.locator('#productPublishFilters')).toBeVisible();
        await expect(page.locator('#main .product-table tbody tr')).toHaveCount(3);
        await expect(page.locator('#main .product-table')).toContainText('Chưa nhập');
        await expect(page.locator('#main .product-table')).not.toContainText('Tồn kho');
        await expect(page.locator('#main .product-table')).not.toContainText('Chưa kiểm kê');
        const productListLayout = await page.evaluate(() => {
          const rect = element => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
          };
          const main = document.querySelector('#main');
          const wrap = document.querySelector('#main .product-table')?.closest('.tablewrap');
          const table = document.querySelector('#main .product-table');
          const rows = [...document.querySelectorAll('#main .product-table tbody tr')];
          const filters = [...document.querySelectorAll('#productPublishFilters [data-published-filter]')];
          const controls = ['#searchBox', '#categoryBox', '#fulfillmentBox', '#productPublishFilters']
            .map(selector => {
              const element = document.querySelector(selector);
              return {
                selector,
                rect: rect(element),
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth
              };
            });
          return {
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            main: { rect: rect(main), clientWidth: main.clientWidth, scrollWidth: main.scrollWidth },
            wrapper: wrap && { rect: rect(wrap), clientWidth: wrap.clientWidth, scrollWidth: wrap.scrollWidth },
            table: table && { rect: rect(table), clientWidth: table.clientWidth, scrollWidth: table.scrollWidth },
            controls,
            filters: filters.map(element => ({
              text: (element.innerText || '').trim(),
              rect: rect(element),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth
            })),
            rows: rows.map(row => ({
              rect: rect(row),
              clientWidth: row.clientWidth,
              scrollWidth: row.scrollWidth,
              cells: [...row.querySelectorAll('td')].map(cell => ({
                text: (cell.innerText || '').trim().slice(0, 90),
                rect: rect(cell),
                clientWidth: cell.clientWidth,
                scrollWidth: cell.scrollWidth
              })),
              productTitle: row.querySelector('.prodname')?.textContent?.trim(),
              sku: (() => {
                const element = row.querySelector('.sku');
                const style = getComputedStyle(element);
                return {
                  text: element.textContent?.trim(),
                  whiteSpace: style.whiteSpace,
                  overflow: style.overflow,
                  textOverflow: style.textOverflow,
                  overflowWrap: style.overflowWrap,
                  lineClamp: style.webkitLineClamp,
                  height: element.getBoundingClientRect().height
                };
              })(),
              hasEditButton: Boolean(row.querySelector('button[data-action="edit"]')),
              hasInventoryDisplay: /tồn kho|chưa kiểm kê|hết hàng/i.test(row.innerText)
            }))
          };
        });
        expect(productListLayout.documentWidth,
          'Product list must not overflow the document at this width: ' + JSON.stringify(productListLayout))
          .toBeLessThanOrEqual(narrowViewport.width);
        expect(productListLayout.bodyWidth,
          'Product list must not overflow the body at this width: ' + JSON.stringify(productListLayout))
          .toBeLessThanOrEqual(narrowViewport.width);
        expect(productListLayout.main.scrollWidth,
          'Product list main area must not overflow horizontally: ' + JSON.stringify(productListLayout))
          .toBeLessThanOrEqual(productListLayout.main.clientWidth + 1);
        expect(productListLayout.wrapper.scrollWidth,
          'Product table wrapper must not have hidden horizontal overflow: ' + JSON.stringify(productListLayout))
          .toBeLessThanOrEqual(productListLayout.wrapper.clientWidth + 1);
        expect(productListLayout.table.scrollWidth,
          'Product table/cards must fit the table wrapper: ' + JSON.stringify(productListLayout))
          .toBeLessThanOrEqual(productListLayout.table.clientWidth + 1);
        for (const control of productListLayout.controls) {
          expect(control.rect.left, control.selector + ' should stay inside viewport').toBeGreaterThanOrEqual(-1);
          expect(control.rect.right, control.selector + ' should stay inside viewport')
            .toBeLessThanOrEqual(narrowViewport.width + 1);
          expect(control.scrollWidth, control.selector + ' content should not clip').toBeLessThanOrEqual(control.clientWidth + 1);
        }
        for (const filter of productListLayout.filters) {
          expect(filter.rect.left, 'Published-state filter should stay inside viewport: ' + JSON.stringify(filter))
            .toBeGreaterThanOrEqual(-1);
          expect(filter.rect.right, 'Published-state filter should stay inside viewport: ' + JSON.stringify(filter))
            .toBeLessThanOrEqual(narrowViewport.width + 1);
          expect(filter.scrollWidth, 'Published-state label should not clip: ' + JSON.stringify(filter))
            .toBeLessThanOrEqual(filter.clientWidth + 1);
        }
        for (const row of productListLayout.rows) {
          expect(row.rect.left, 'Product card should stay inside table wrapper').toBeGreaterThanOrEqual(productListLayout.wrapper.rect.left - 1);
          expect(row.rect.right, 'Product card should stay inside table wrapper')
            .toBeLessThanOrEqual(productListLayout.wrapper.rect.right + 1);
          expect(row.scrollWidth, 'Product card should not clip its content: ' + JSON.stringify(row))
            .toBeLessThanOrEqual(row.clientWidth + 1);
          expect(row.productTitle, 'Existing product titles must remain available to assistive technology').toBeTruthy();
          if (narrowViewport.width <= 360) {
            expect(row.sku.text, 'SKU/category hint should retain a meaningful SKU label and value').toMatch(/SKU (?:chưa xác minh|thương mại):\s*\S+/i);
            expect(row.sku.whiteSpace, 'Narrow-phone SKU hint should wrap instead of being forced to one line').toBe('normal');
            expect(row.sku.overflowWrap, 'Narrow-phone SKU hint may break long segments without horizontal overflow').toBe('anywhere');
            expect(row.sku.lineClamp, 'Narrow-phone SKU hint should wrap to at most two lines').toBe('2');
            expect(row.sku.height, 'Wrapped SKU hint should remain visible').toBeGreaterThan(0);
          }
          expect(row.hasEditButton, 'Product rows should not show a separate edit button').toBe(false);
          expect(row.hasInventoryDisplay, 'Product rows should not show inventory').toBe(false);
          for (const cell of row.cells) {
            expect(cell.rect.right, 'Product field should remain inside viewport: ' + JSON.stringify(cell))
              .toBeLessThanOrEqual(narrowViewport.width + 1);
            expect(cell.scrollWidth, 'Product field should wrap rather than clip: ' + JSON.stringify(cell))
              .toBeLessThanOrEqual(cell.clientWidth + 1);
          }
        }
        await saveScreenshot('products-responsive', { viewport: narrowViewport, theme: narrowTheme }, {
          fixtureOnly: true, responsiveProductListAudit: true, noHorizontalOverflow: true,
          noInventedPriceOrStock: true, fixtureProductCount: 3
        });
      }
    }
    await page.setViewportSize(mobile);
    await chooseTheme('light');
    await page.locator('#main').evaluate(element => { element.scrollTop = 0; });

    await page.locator('#fulfillmentBox').selectOption('made_to_order');
    await expect(productNames).toHaveCount(1);
    await expect(productNames).toHaveText('Dây đồng hồ thử nghiệm giao diện');
    await page.locator('#categoryBox').selectOption('wallets');
    await expect(page.locator('#main .product-empty-state')).toBeVisible();
    await page.locator('#clearFilterEmpty').click();
    await expect(productNames).toHaveCount(3);

    // Product editor and image gallery are true source components. Only their input data is fixture-only.
    for (const variant of variants) {
      await openEditor(variant);
      for (const removedField of ['#pSku', '#pSkuVerified', '#pStock', '#pPublished'])
        await expect(page.locator(removedField), removedField + ' must remain absent from the editor').toHaveCount(0);
      await expect(page.locator('#pFulfillmentToggle')).toBeVisible();
      await expect(page.locator('#pPrice')).toBeVisible();
      if (variant.viewport.width <= 680) {
        const surface = await page.locator('#backdrop>.editor').evaluate(el => {
          const rect = el.getBoundingClientRect();
          const probe = document.createElement('div');
          probe.style.background = 'var(--bg)';
          document.body.append(probe);
          const expectedBackground = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return {
            left: Math.round(rect.left), top: Math.round(rect.top),
            width: Math.round(rect.width), height: Math.round(rect.height),
            radius: getComputedStyle(el).borderRadius,
            shadow: getComputedStyle(el).boxShadow,
            background: getComputedStyle(el).backgroundColor,
            expectedBackground
          };
        });
        expect(surface.left, 'Mobile product editor should align with the viewport edge').toBe(0);
        expect(surface.top, 'Mobile editor should start below the shared app header').toBeGreaterThanOrEqual(60);
        expect(surface.top, 'Mobile editor must not cover the shared app header').toBeGreaterThanOrEqual(
          await page.locator('.topbar').evaluate(el => Math.round(el.getBoundingClientRect().bottom))
        );
        expect(surface.width, 'Mobile product editor should fill the viewport width').toBe(variant.viewport.width);
        expect(surface.height, 'Mobile product editor should fit the space above the mobile navigation').toBeLessThan(variant.viewport.height);
        expect(await page.locator('.topbar').isVisible(), 'Shared app header should remain visible while editing').toBe(true);
        expect(await page.locator('.mobiletabs').isVisible(), 'Mobile navigation should remain visible while editing').toBe(true);
        expect(surface.radius, 'Mobile product editor should not retain a floating-card radius').toBe('0px');
        expect(surface.shadow, 'Mobile product editor should not cast a desktop drawer shadow').toBe('none');
        expect(surface.background, 'Mobile product editor should use an opaque theme surface').toBe(surface.expectedBackground);
        const editorBottom = await page.locator('#backdrop>.editor').evaluate(el => Math.round(el.getBoundingClientRect().bottom));
        const mobileNavTop = await page.locator('.mobiletabs').evaluate(el => Math.round(el.getBoundingClientRect().top));
        expect(editorBottom, 'Mobile editor must stop before the fixed bottom navigation').toBeLessThanOrEqual(mobileNavTop);
      }
      await saveScreenshot('product-editor', variant, { dialog: true });
      if (variant.viewport.width === mobile.width && variant.theme === 'light') {
        // Empty required field, then submit from another tab: validation must reveal the correct panel and block every API write.
        await page.locator('#pTitle').fill('');
        await page.locator('#productTabGallery').click();
        await page.locator('#saveProduct').click();
        await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('#pTitle')).toBeFocused();
        await expect(page.locator('#saveError')).toContainText('Vui lòng nhập tên sản phẩm.');
        expect(attemptedWrites, 'Missing required product identity must never reach the API').toEqual([]);

        // Whitespace-only values look filled to the browser's required attribute but must not be saved.
        await page.locator('#pTitle').fill('   ');
        await page.locator('#productTabGallery').click();
        await page.locator('#saveProduct').click();
        await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('#pTitle')).toBeFocused();
        await expect(page.locator('#saveError')).toContainText('Vui lòng nhập tên sản phẩm.');
        expect(attemptedWrites, 'Whitespace-only product title must never reach the API').toEqual([]);

        await page.locator('#pTitle').fill('Sản phẩm thử nghiệm giao diện');
        await page.locator('#pCategory').fill('   ');
        await page.locator('#productTabGallery').click();
        await page.locator('#saveProduct').click();
        await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('#pCategory')).toBeFocused();
        await expect(page.locator('#saveError')).toContainText('Vui lòng chọn hoặc nhập danh mục.');
        expect(attemptedWrites, 'Whitespace-only category must never reach the API').toEqual([]);
        await page.locator('#editorCancel').click();
        await expect(page.locator('#backdrop')).toBeHidden();
        await openEditor(variant);
      }
      // Reproduce a real tab-switch scenario: the previous panel was scrolled, then Gallery is opened.
      await page.locator('#backdrop .editorcontent').evaluate(el => { el.scrollTop = Math.min(300, el.scrollHeight); });
      await page.locator('#productTabGallery').click();
      const galleryTabSwitchGeometry = await page.evaluate(() => {
        const content = document.querySelector('#backdrop .editorcontent');
        const tabs = document.querySelector('#productEditorTabs');
        const heading = document.querySelector('#productPanelGallery > .sectionlabel');
        if (!content || !tabs || !heading) throw new Error('Product gallery tab-switch geometry is incomplete');
        return {
          scrollTop: content.scrollTop,
          tabsBottom: tabs.getBoundingClientRect().bottom,
          galleryHeadingTop: heading.getBoundingClientRect().top
        };
      });
      expect(galleryTabSwitchGeometry.scrollTop,
        'Switching to Gallery must reset the shared editor scroll position').toBe(0);
      expect(galleryTabSwitchGeometry.galleryHeadingTop,
        'Gallery heading must remain below the sticky tabs after switching from a scrolled panel: ' +
        JSON.stringify(galleryTabSwitchGeometry)).toBeGreaterThanOrEqual(galleryTabSwitchGeometry.tabsBottom - 1);
      await expect(page.locator('#chooseImages')).toBeVisible();
      await page.locator('#backdrop .editorcontent').evaluate(el => { el.scrollTop = el.scrollHeight; });
      // Exercise local object-URL thumbnails with synthetic images only; do not save the product.
      const makeGallerySvg = (background, stroke, path) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="12" fill="${background}"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
      await page.locator('#imageInput').setInputFiles([
        { name: 'ui-fixture-front.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#eaf3fb', '#5c91b9', 'M24 112L64 50l26 33 18-20 28 49') },
        { name: 'ui-fixture-side.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#09131d', '#8ebce0', 'M48 90l21-28 17 20 12-13 17 29') },
        { name: 'ui-fixture-rear.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#dcecf8', '#3f7296', 'M28 42h104v76H28zM43 57h74v46H43z') },
        { name: 'ui-fixture-detail.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#132b3c', '#b9dbf0', 'M32 42c16-18 32 18 48 0s32 18 48 0M32 80c16-18 32 18 48 0s32 18 48 0M32 118c16-18 32 18 48 0s32 18 48 0') },
        { name: 'ui-fixture-sole.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#eaf3fb', '#5c91b9', 'M56 24c-8 28-20 42-18 72 2 26 18 38 42 38s40-12 42-38c2-30-10-44-18-72M60 54h40M52 76h56M50 98h60M62 120h36') },
        { name: 'ui-fixture-hardware.svg', mimeType: 'image/svg+xml', buffer: makeGallerySvg('#0e1e2b', '#a8cde8', 'M42 42h76v76H42zM58 58h44v44H58zM70 24v18M90 118v18M24 70h18M118 90h18') }
      ]);
      await expect(page.locator('#imageGrid .imageitem')).toHaveCount(6);
      await expect(page.locator('#imageGrid .image-cover-slot .imageitem-cover')).toBeVisible();
      await expect(page.locator('#imageGrid .image-rail')).toBeVisible();
      await expect(page.locator('#imageGrid .image-rail')).toHaveAttribute('aria-label', 'Dải ảnh thu nhỏ, vuốt ngang để xem thêm');
      await expect.poll(async () => page.locator('#imageGrid img').evaluateAll(images =>
        images.length === 6 && images.every(image => image.complete && image.naturalWidth > 0)
      ), { timeout: 5000 }).toBe(true);
      await expect(page.locator('#imageGrid [data-gallery] svg[aria-hidden="true"]')).toHaveCount(18);
      const galleryA11y = await page.locator('#imageGrid .imageitem').evaluateAll(items =>
        items.map(item => ({
          groupLabel: item.getAttribute('aria-label'),
          imageAlt: item.querySelector('img')?.getAttribute('alt'),
          controls: [...item.querySelectorAll('button[data-gallery]')].map(button => ({
            action: button.getAttribute('data-gallery'),
            label: button.getAttribute('aria-label'),
            iconHidden: button.querySelector('svg')?.getAttribute('aria-hidden')
          }))
        }))
      );
      expect(galleryA11y, 'Every fixture gallery item should have a named group and descriptive image alt').toHaveLength(6);
      expect(galleryA11y.every(item => Boolean(item.groupLabel?.trim()) && Boolean(item.imageAlt?.trim())),
        'Gallery group names and image alt text must not be empty: ' + JSON.stringify(galleryA11y)).toBe(true);
      expect(galleryA11y.every(item => item.controls.length === 3 && item.controls.every(control =>
        Boolean(control.label?.trim()) && control.iconHidden === 'true')),
        'Every gallery control needs an accessible name and decorative icons must be hidden: ' + JSON.stringify(galleryA11y)).toBe(true);
      await expect(page.locator('#chooseImages')).toBeVisible();
      await expect(page.locator('#galleryStatus')).toHaveAttribute('role', 'status');
      await expect(page.locator('#galleryStatus')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('#imageGrid .imageitem-cover img')).toHaveAttribute('alt', 'Ảnh đại diện sản phẩm');
      await expect(page.locator('#imageGrid .image-rail .imageitem img').first()).toHaveAttribute('alt', 'Ảnh sản phẩm 2');
      await expect(page.locator('#imageGrid .imageitem-cover')).toHaveAttribute('aria-label', 'Ảnh đại diện sản phẩm');
      await expect(page.locator('#imageGrid [data-gallery="up"][data-index="0"]')).toBeDisabled();
      await expect(page.locator('#imageGrid [data-gallery="down"][data-index="5"]')).toBeDisabled();
      if (variant.viewport.width === mobile.width && variant.theme === 'light') {
        const originalFirstSrc = await page.locator('#imageGrid img').nth(0).getAttribute('src');
        const originalSecondSrc = await page.locator('#imageGrid img').nth(1).getAttribute('src');
        // Activate a gallery control from the keyboard, not only by pointer.
        await page.locator('#imageGrid [data-gallery="up"][data-index="1"]').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#imageGrid img').nth(0)).toHaveAttribute('src', originalSecondSrc);
        await expect(page.locator('#imageGrid img').nth(1)).toHaveAttribute('src', originalFirstSrc);
        await expect(page.locator('#galleryStatus')).toContainText('Đã chuyển ảnh lên vị trí ảnh đại diện');
        await expect(page.locator('#imageGrid [data-gallery="down"][data-index="0"]')).toBeFocused();
        await expect(page.locator('#imageGrid .imageitem-cover img')).toHaveAttribute('alt', 'Ảnh đại diện sản phẩm');
      }
      if (variant.viewport.width <= 480) {
        // Assert the rail while all five thumbnails still exist. After deleting
        // one image, only four thumbnails remain beside the cover and may fit.
        const railMetrics = await page.locator('#imageGrid .image-rail').evaluate(el => ({
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflowX: getComputedStyle(el).overflowX
        }));
        expect(railMetrics.overflowX, 'Mobile thumbnails should scroll horizontally rather than widen the page').toBe('auto');
        const railReachability = await page.locator('#imageGrid .image-rail').evaluate(el => {
          const items = [...el.querySelectorAll('.imageitem')];
          if (!items.length) throw new Error('Thumbnail rail has no images');
          const railRect = el.getBoundingClientRect();
          const canScroll = el.scrollWidth > el.clientWidth + 1;
          if (canScroll) el.scrollLeft = el.scrollWidth;
          const lastRect = items[items.length - 1].getBoundingClientRect();
          return {
            canScroll,
            scrollLeft: el.scrollLeft,
            lastItemReachable: lastRect.left >= railRect.left - 1 && lastRect.right <= railRect.right + 1,
            allItemsFit: items.every(item => {
              const rect = item.getBoundingClientRect();
              return rect.left >= railRect.left - 1 && rect.right <= railRect.right + 1;
            })
          };
        });
        if (variant.viewport.width <= 320) {
          expect(railReachability.canScroll,
            'At 320px the thumbnail rail must overflow so the remaining thumbnails can be reached by scrolling').toBe(true);
          expect(railReachability.scrollLeft,
            'At 320px the thumbnail rail must actually scroll').toBeGreaterThan(0);
          expect(railReachability.lastItemReachable,
            'At 320px the last thumbnail must be reachable after scrolling').toBe(true);
        } else if (railReachability.canScroll) {
          expect(railReachability.scrollLeft,
            'If the mobile thumbnail rail overflows, it must scroll').toBeGreaterThan(0);
          expect(railReachability.lastItemReachable,
            'If the mobile thumbnail rail overflows, the last thumbnail must be reachable').toBe(true);
        } else {
          expect(railReachability.allItemsFit,
            'When the mobile thumbnail rail does not overflow, every thumbnail must remain visible').toBe(true);
        }
        await page.locator('#imageGrid .image-rail').evaluate(el => { el.scrollLeft = 0; });

        // Reproduce tab round-trip after the Gallery panel contains a full, scrollable set of images.
        await page.locator('#backdrop .editorcontent').evaluate(el => { el.scrollTop = Math.min(300, el.scrollHeight); });
        await page.locator('#productTabDetails').click();
        await page.locator('#productTabGallery').click();
        const populatedGalleryTabGeometry = await page.evaluate(() => {
          const content = document.querySelector('#backdrop .editorcontent');
          const tabs = document.querySelector('#productEditorTabs');
          const heading = document.querySelector('#productPanelGallery > .sectionlabel');
          if (!content || !tabs || !heading) throw new Error('Populated Gallery tab-roundtrip geometry is incomplete');
          return {
            scrollTop: content.scrollTop,
            tabsBottom: tabs.getBoundingClientRect().bottom,
            galleryHeadingTop: heading.getBoundingClientRect().top,
            galleryImageCount: document.querySelectorAll('#imageGrid .imageitem').length
          };
        });
        expect(populatedGalleryTabGeometry.galleryImageCount,
          'Tab-roundtrip regression must use the populated gallery fixture').toBe(6);
        expect(populatedGalleryTabGeometry.scrollTop,
          'Returning to Gallery after scrolling the prior panel must reset the shared editor scroll position: ' +
          JSON.stringify(populatedGalleryTabGeometry)).toBe(0);
        expect(populatedGalleryTabGeometry.galleryHeadingTop,
          'Gallery heading must remain below sticky tabs after switching back: ' +
          JSON.stringify(populatedGalleryTabGeometry)).toBeGreaterThanOrEqual(populatedGalleryTabGeometry.tabsBottom - 1);

        // The reference includes narrow phones at 320px and 360px, not only 390px.
        // Capture actual gallery renders and assert that the page/dialog stay in bounds
        // while the thumbnail rail alone owns horizontal scrolling.
        for (const narrowViewport of [{ width: 320, height: 640 }, { width: 360, height: 800 }]) {
          await page.setViewportSize(narrowViewport);
          await expect(page.locator('#imageGrid .image-rail')).toBeVisible();
          const narrowLayout = await page.evaluate(() => {
            const dialog = document.querySelector('#backdrop>.editor');
            const grid = document.querySelector('#imageGrid');
            const rail = document.querySelector('#imageGrid .image-rail');
            if (!dialog || !grid || !rail) throw new Error('Responsive gallery geometry is incomplete');
            const rect = element => {
              const box = element.getBoundingClientRect();
              return { left: box.left, right: box.right, width: box.width };
            };
            return {
              viewportWidth: window.innerWidth,
              pageWidth: document.documentElement.scrollWidth,
              dialog: rect(dialog),
              grid: rect(grid),
              rail: rect(rail),
              railOverflowX: getComputedStyle(rail).overflowX,
              railClientWidth: rail.clientWidth,
              railScrollWidth: rail.scrollWidth
            };
          });
          expect(narrowLayout.pageWidth,
            'At ' + narrowViewport.width + 'px the document must not overflow horizontally: ' + JSON.stringify(narrowLayout))
            .toBeLessThanOrEqual(narrowViewport.width);
          expect(narrowLayout.dialog.left, 'Mobile editor should remain inside the left viewport edge').toBeGreaterThanOrEqual(-1);
          expect(narrowLayout.dialog.right, 'Mobile editor should remain inside the right viewport edge').toBeLessThanOrEqual(narrowViewport.width + 1);
          expect(narrowLayout.grid.left, 'Gallery grid should not escape the editor left edge').toBeGreaterThanOrEqual(narrowLayout.dialog.left - 1);
          expect(narrowLayout.grid.right, 'Gallery grid should not escape the editor right edge').toBeLessThanOrEqual(narrowLayout.dialog.right + 1);
          expect(narrowLayout.rail.right, 'Thumbnail rail container should stay inside the gallery grid').toBeLessThanOrEqual(narrowLayout.grid.right + 1);
          expect(narrowLayout.railOverflowX, 'Only the thumbnail rail should scroll horizontally').toBe('auto');
          // At 320px the five thumbnail cells overflow and must scroll to expose the final item.
          // At 360px the same compact cells can fit entirely; don't require artificial overflow.
          const thumbnailReachability = await page.locator('#imageGrid .image-rail').evaluate(el => {
            const items = [...el.querySelectorAll('.imageitem')];
            if (!items.length) throw new Error('Thumbnail rail has no images');
            const railRect = el.getBoundingClientRect();
            const canScroll = el.scrollWidth > el.clientWidth + 1;
            if (canScroll) el.scrollLeft = el.scrollWidth;
            const lastRect = items[items.length - 1].getBoundingClientRect();
            return {
              canScroll,
              scrollLeft: el.scrollLeft,
              lastItemReachable: lastRect.left >= railRect.left - 1 && lastRect.right <= railRect.right + 1,
              allItemsFit: items.every(item => {
                const rect = item.getBoundingClientRect();
                return rect.left >= railRect.left - 1 && rect.right <= railRect.right + 1;
              })
            };
          });
          if (thumbnailReachability.canScroll) {
            expect(thumbnailReachability.scrollLeft,
              'Overflowing thumbnail rail should scroll horizontally').toBeGreaterThan(0);
            expect(thumbnailReachability.lastItemReachable,
              'The last thumbnail must be reachable after scrolling the rail').toBe(true);
          } else {
            expect(thumbnailReachability.allItemsFit,
              'When the thumbnail strip fits, every thumbnail must be visible inside the rail').toBe(true);
          }
          await page.locator('#imageGrid .image-rail').evaluate(el => { el.scrollLeft = 0; });
          if (narrowViewport.width <= 360) {
            const footerActions = await page.evaluate(() => ['#deleteProduct', '#editorCancel', '#saveProduct'].map(selector => {
              const element = document.querySelector(selector);
              if (!element) throw new Error('Missing gallery footer action ' + selector);
              const rect = element.getBoundingClientRect();
              return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, visible: rect.width > 0 && rect.height > 0 };
            }));
            for (const action of footerActions) {
              expect(action.visible, action.selector + ' must remain visible on narrow phones').toBe(true);
              expect(action.left, action.selector + ' must stay inside the viewport').toBeGreaterThanOrEqual(-1);
              expect(action.right, action.selector + ' must stay inside the viewport').toBeLessThanOrEqual(narrowViewport.width + 1);
            }
            expect(Math.max(...footerActions.map(action => action.top)) - Math.min(...footerActions.map(action => action.top)),
              'Delete, cancel and save actions must remain on one row at 320px').toBeLessThanOrEqual(3);
          }
          await saveScreenshot('product-gallery-responsive', { viewport: narrowViewport, theme: variant.theme }, {
            dialog: true, fixtureImages: 6, horizontalThumbnailRail: true, responsiveViewportAudit: true
          });
        }
        await page.setViewportSize(variant.viewport);
      }
      if (variant.viewport.width <= 480) {
        await page.locator('#imageGrid [data-gallery="remove"][data-index="2"]').click();
        await expect(page.locator('#imageGrid .imageitem')).toHaveCount(5);
        await expect(page.locator('#galleryStatus')).toContainText('Đã xóa ảnh 3. Còn 5 ảnh.');
        await expect(page.locator('#imageGrid [data-gallery="remove"][data-index="2"]')).toBeFocused();
        await expect(page.locator('#imageGrid [data-gallery="down"][data-index="4"]')).toBeDisabled();
        expect(attemptedWrites, 'Gallery reorder/delete must remain local until the explicit product save action').toEqual([]);
      }
      if (variant.viewport.width === 390 && variant.viewport.height === 844 && variant.theme === 'light') {
        const uploadVisibility = await page.evaluate(() => {
          const dialog = document.querySelector('#backdrop>.editor');
          const footer = document.querySelector('#backdrop .editorfooter');
          const dropZone = document.querySelector('.gallery-add-row');
          if (!dialog || !footer || !dropZone) throw new Error('Gallery upload controls are missing');
          const drop = dropZone.getBoundingClientRect();
          const foot = footer.getBoundingClientRect();
          return { dropTop: drop.top, dropBottom: drop.bottom, footerTop: foot.top, viewportHeight: innerHeight };
        });
        expect(uploadVisibility.dropTop,
          'At the reference 390x844 mobile viewport, the image-upload area should begin above the sticky action bar: ' + JSON.stringify(uploadVisibility))
          .toBeLessThan(uploadVisibility.footerTop);
        expect(uploadVisibility.dropBottom,
          'At the reference 390x844 mobile viewport, the complete image-upload area should remain above the sticky action bar: ' + JSON.stringify(uploadVisibility))
          .toBeLessThanOrEqual(uploadVisibility.footerTop);
      }
      if (variant.theme === 'dark') {
        const chromeColors = await page.evaluate(() => {
          const header = document.querySelector('.editorhead');
          const footer = document.querySelector('.editorfooter');
          if (!header || !footer) throw new Error('Editor header/footer should exist for dark-theme contrast audit');
          const headerStyle = getComputedStyle(header);
          const footerStyle = getComputedStyle(footer);
          return {
            headerBg: headerStyle.backgroundColor,
            footerBg: footerStyle.backgroundColor,
            headerColor: headerStyle.color,
            footerColor: footerStyle.color
          };
        });
        expect(chromeColors.headerBg, 'Dark editor header should use the navy glass surface').toContain('17, 34, 49');
        expect(chromeColors.footerBg, 'Dark editor footer should use the navy glass surface').toContain('17, 34, 49');
        expect(chromeColors.headerColor, 'Dark editor header text should use the light theme token').toBe('rgb(234, 243, 251)');
        expect(chromeColors.footerColor, 'Dark editor footer text should use the light theme token').toBe('rgb(234, 243, 251)');
      }
      await page.locator('#imageGrid').scrollIntoViewIfNeeded();
      // The scrollable content must clear the sticky actions: the last image cannot be hidden behind the save bar.
      await page.locator('#backdrop .editor').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const galleryLayout = await page.evaluate(() => {
        const dialog = document.querySelector('#backdrop>.editor');
        const footer = document.querySelector('#backdrop .editorfooter');
        const lastImage = document.querySelector('#imageGrid .image-rail .imageitem:last-child');
        if (!dialog || !footer || !lastImage) throw new Error('Product gallery dialog geometry is incomplete');
        const dialogRect = dialog.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const imageRect = lastImage.getBoundingClientRect();
        return {
          dialogBottom: dialogRect.bottom,
          footerBottom: footerRect.bottom,
          footerTop: footerRect.top,
          lastImageBottom: imageRect.bottom
        };
      });
      expect(Math.abs(galleryLayout.dialogBottom - galleryLayout.footerBottom),
        'Product editor actions must reach the bottom edge of the dialog (allowing sub-pixel browser rounding)').toBeLessThanOrEqual(2);
      expect(galleryLayout.lastImageBottom,
        'Last gallery image should scroll fully above the sticky action bar').toBeLessThanOrEqual(galleryLayout.footerTop + 1);
      await saveScreenshot('product-gallery', variant, { dialog: true, fixtureImages: 6, horizontalThumbnailRail: true });
      await page.locator('#editorClose').click();
      await expect(page.locator('#backdrop')).toBeHidden();
      await expect(page.locator('#backdrop')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('[data-product-row]:visible').first()).toBeFocused();

      if (variant.theme === 'light') {
        await openEditor(variant);
        await page.keyboard.press('Escape');
        await expect(page.locator('#backdrop')).toBeHidden();
        await expect(page.locator('#backdrop')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.locator('[data-product-row]:visible').first()).toBeFocused();
      }
    }

    console.info('[ADMIN_STATIC_STAGE] product list and editor interaction checks passed');
    await captureView('orders', 'orders', async variant => {
      const row=page.locator('[data-order-row="UI-ONLY-ORDER"]'),cards=page.locator('[data-order-open]');
      await expect(row).toBeVisible();await expect(cards).toHaveCount(3);
      for(const selector of ['#orderSearchBox','#orderStatusFilter','#orderPaymentFilter'])await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator('#orderResultSummary')).toHaveText('Hiển thị 3 / 3 đơn hàng');
      await expect(page.locator('.order-management-details')).toHaveCount(0);
      await page.locator('#orderSearchBox').fill('Khách UI Fixture 2');await expect(cards).toHaveCount(1);
      await page.locator('#orderSearchBox').fill('khong-co-don-hang-nay');await expect(cards).toHaveCount(0);
      await page.locator('#clearOrderFilters').click();
      await page.locator('#orderStatusFilter').selectOption('completed');await expect(cards).toHaveCount(1);
      await page.locator('#orderStatusFilter').selectOption('all');
      await page.locator('#orderPaymentFilter').selectOption('paid');await expect(cards).toHaveCount(1);
      await page.locator('#clearOrderFilters').click();await expect(cards).toHaveCount(3);
      const dims=await row.evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,v:innerWidth}));
      expect(dims.w).toBeLessThanOrEqual(dims.v);expect(dims.h).toBeLessThan(300);
      await page.evaluate(()=>window.scrollTo(0,0));
    }, true);
    await captureView('order-detail', 'orders', async variant => {
      const orderRow=page.locator('[data-order-row="UI-ONLY-ORDER"]');
      await expect(orderRow).toBeVisible();await orderRow.click();
      await expect(page.locator('#main .pagehead h2')).toHaveText('Xử lý đơn hàng');
      await expect(page.locator('.order-detail-page')).toHaveAttribute('data-order-detail-id','UI-ONLY-ORDER');
      for(const selector of ['.sd-order-overview','.sd-order-items','.sd-order-payment'])await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator('#sdOrderAdvanced')).not.toHaveAttribute('open','');
      await expect(page.locator('[data-action="record-refund"]')).toBeDisabled();
      const detailUrl=new URL(page.url());expect(detailUrl.searchParams.get('view')).toBe('order-detail');
      expect(detailUrl.searchParams.get('orderId')).toBe('UI-ONLY-ORDER');
      await page.goBack();await expect(page.locator('#main .pagehead h2')).toHaveText('Đơn hàng');
      await orderRow.focus();await page.keyboard.press('Enter');await expect(page.locator('.order-detail-page')).toBeVisible();
    }, true);
    // Paid fixture must still refuse an over-limit refund without a server write.
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-view="orders"]:visible').first().click();
    const paidFixtureRow=page.locator('[data-order-row="UI-ONLY-ORDER-3"]');
    await expect(paidFixtureRow).toBeVisible();await paidFixtureRow.click();
    await expect(page.locator('.order-detail-page')).toHaveAttribute('data-order-detail-id','UI-ONLY-ORDER-3');
    await page.locator('#sdOrderAdvanced > summary').click();
    await page.locator('.sd-order-subdetails').first().locator('summary').click();
    const paidRefundEntry=page.locator('#orderDetailContent [data-refund-entry="UI-ONLY-ORDER-3"]');
    const refundButton=paidRefundEntry.locator('[data-action="record-refund"]');
    await expect(refundButton).toBeEnabled();
    await expect(paidRefundEntry.locator('[data-refund-amount]')).toHaveAttribute('max','7800000');
    const writesBeforeInvalidRefund=attemptedWrites.length;
    await paidRefundEntry.locator('[data-refund-amount]').fill('7800001');
    await paidRefundEntry.locator('[data-refund-reference]').fill('REFUND-UI-001');
    await refundButton.click();
    await expect(page.locator('#toast')).toContainText('không vượt số tiền thực nhận thuần còn lại');
    expect(attemptedWrites.length).toBe(writesBeforeInvalidRefund);
    await page.locator('[data-action="back-to-orders"]:visible').first().click();
    await expect(page.locator('#main .pagehead h2')).toHaveText('Đơn hàng');
    await captureView('customers', 'customers', async variant => {
      // Reference screen #8: synthetic, client-side search only; mutation endpoints remain blocked.
      await expect(page.getByLabel('Tìm tên, số điện thoại, email hoặc địa chỉ')).toBeVisible();
      const customerViewportWidth = page.viewportSize()?.width ?? 0;
      const customerDocumentMetrics = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth
      }));
      expect(customerDocumentMetrics.document, 'Customers screen should not cause document-level horizontal overflow').toBeLessThanOrEqual(customerDocumentMetrics.viewport);
      const firstCustomerCellDisplay = await page.locator('.customer-table tbody tr').first().locator('td').first().evaluate(element => getComputedStyle(element).display);
      if (customerViewportWidth <= 680) {
        expect(firstCustomerCellDisplay, 'Customer rows should use mobile card layout at <=680px').toBe('block');
      } else {
        expect(firstCustomerCellDisplay, 'Customer rows should retain table layout above 680px').toBe('table-cell');
      }
      await expect(page.locator('#customerSearchStatus')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('#customerSearchStatus')).toContainText('hồ sơ đã tải');
      await expect(page.locator('.customer-table tbody tr')).toHaveCount(2);
      await expect(page.locator('.customer-avatar')).toHaveCount(2);
      await expect(page.locator('.customer-avatar').nth(0)).toHaveText('KD');
      await expect(page.locator('.customer-avatar').nth(1)).toHaveText('K2');
      await expect(page.locator('.customer-avatar').nth(0)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('.customer-avatar').nth(1)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('#customerSearchStatus')).toContainText('Hiển thị 2 / 2');
      await expect(page.locator('.customer-mobile-summary')).toHaveCount(2);
      if (customerViewportWidth <= 680) {
        const mobileSummary = page.locator('.customer-mobile-summary').first();
        await expect(mobileSummary).toBeVisible();
        await expect(page.locator('.customer-desktop-identity').first()).toBeHidden();
        const contactCellDisplay = await page.locator('.customer-table tbody tr').first().locator('td').nth(1)
          .evaluate(element => getComputedStyle(element).display);
        expect(contactCellDisplay, 'Mobile customer cards should collapse secondary table columns').toBe('none');
        const summaryHeight = await mobileSummary.evaluate(element => element.getBoundingClientRect().height);
        expect(summaryHeight, 'Customer mobile summary should remain compact without opening contact details').toBeLessThanOrEqual(138);
        const details = mobileSummary.locator('.customer-mobile-details');
        await expect(details.locator('.customer-mobile-extra')).toBeHidden();
        await details.locator('summary').click();
        await expect(details.locator('.customer-mobile-extra')).toBeVisible();
        await expect(details.locator('.customer-mobile-extra')).toContainText('Email');
        await expect(details.locator('.customer-mobile-extra')).toContainText('Địa chỉ');
        await details.locator('summary').click();
        await expect(details.locator('.customer-mobile-extra')).toBeHidden();
      } else {
        await expect(page.locator('.customer-mobile-summary').first()).toBeHidden();
        await expect(page.locator('.customer-desktop-identity').first()).toBeVisible();
      }

      await page.locator('#customerSearch').fill('Khách UI Fixture 2');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách UI Fixture 2');
      await expect(page.locator('.customer-table tbody')).not.toContainText('Khách thử nghiệm giao diện');
      await page.locator('#customerSearch').fill('0000000002');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách UI Fixture 2');
      await page.locator('#customerSearch').fill('fixture-two@example.test');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách UI Fixture 2');
      await page.locator('#customerSearch').fill('ĐỊA CHỈ TEST');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách UI Fixture 2');
      await page.locator('#customerSearch').fill('no-match-ui-query');
      await expect(page.locator('.customer-table tbody')).toContainText('Không tìm thấy khách hàng phù hợp.');
      await expect(page.locator('#customerSearchStatus')).toContainText('Hiển thị 0 / 2');

      await page.locator('#customerSearch').fill('');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách thử nghiệm giao diện');
      await expect(page.locator('.customer-table tbody')).toContainText('Khách UI Fixture 2');
      await expect(page.locator('#customerSearchStatus')).toContainText('Hiển thị 2 / 2');
      await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator('#main .pagehead')).toBeInViewport();

      // Capture the customer list at narrower Android widths as well as 390px.
      // Customer data stays synthetic; no avatar/photo is invented and no API write is allowed.
      if (variant.viewport.width === 390 && variant.theme === 'light') {
        const originalViewport = variant.viewport;
        for (const narrowViewport of [{ width: 320, height: 640 }, { width: 360, height: 800 }]) {
          for (const narrowTheme of ['light', 'dark']) {
            await page.setViewportSize(narrowViewport);
            await chooseTheme(narrowTheme);
            await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
            await page.evaluate(() => {
              window.scrollTo(0, 0);
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            });
            await expect(page.locator('#main .pagehead')).toBeVisible();
            await expect(page.locator('.customer-table tbody tr')).toHaveCount(2);
            const customerLayout = await page.evaluate(() => {
              const main = document.querySelector('#main');
              const table = document.querySelector('#main .customer-table');
              if (!main || !table) throw new Error('Customer list layout is missing');
              const rect = element => {
                const box = element.getBoundingClientRect();
                return { left: box.left, right: box.right, width: box.width };
              };
              return {
                viewportWidth: window.innerWidth,
                documentScrollWidth: document.documentElement.scrollWidth,
                bodyScrollWidth: document.body.scrollWidth,
                mainClientWidth: main.clientWidth,
                mainScrollWidth: main.scrollWidth,
                tableClientWidth: table.clientWidth,
                tableScrollWidth: table.scrollWidth,
                main: rect(main),
                table: rect(table),
                rows: [...table.querySelectorAll('tbody tr')].map(row => ({
                  ...rect(row),
                  clientWidth: row.clientWidth,
                  scrollWidth: row.scrollWidth,
                  cells: [...row.querySelectorAll('td')].map(cell => ({
                    text: (cell.innerText || '').trim().slice(0, 80),
                    clientWidth: cell.clientWidth,
                    scrollWidth: cell.scrollWidth,
                    clientHeight: cell.clientHeight,
                    scrollHeight: cell.scrollHeight,
                    left: cell.getBoundingClientRect().left,
                    right: cell.getBoundingClientRect().right
                  }))
                }))
              };
            });
            expect(customerLayout.documentScrollWidth,
              'Customer screen must not create document-level horizontal overflow: ' + JSON.stringify(customerLayout))
              .toBeLessThanOrEqual(narrowViewport.width);
            expect(customerLayout.bodyScrollWidth,
              'Customer screen must not overflow the body horizontally: ' + JSON.stringify(customerLayout))
              .toBeLessThanOrEqual(narrowViewport.width);
            expect(customerLayout.mainScrollWidth,
              'Customer content area must not overflow horizontally: ' + JSON.stringify(customerLayout))
              .toBeLessThanOrEqual(customerLayout.mainClientWidth + 1);
            expect(customerLayout.tableScrollWidth,
              'Mobile customer table/cards must fit the available width: ' + JSON.stringify(customerLayout))
              .toBeLessThanOrEqual(customerLayout.tableClientWidth + 1);
            expect(customerLayout.table.left).toBeGreaterThanOrEqual(customerLayout.main.left - 1);
            expect(customerLayout.table.right).toBeLessThanOrEqual(customerLayout.main.right + 1);
            for (const row of customerLayout.rows) {
              expect(row.left, 'Customer card should stay inside its table bounds').toBeGreaterThanOrEqual(customerLayout.table.left - 1);
              expect(row.right, 'Customer card should stay inside its table bounds').toBeLessThanOrEqual(customerLayout.table.right + 1);
              expect(row.scrollWidth, 'Customer card should not clip long contact text: ' + JSON.stringify(row)).toBeLessThanOrEqual(row.clientWidth + 1);
              for (const cell of row.cells) {
                expect(cell.scrollWidth, 'Customer field should wrap within its cell: ' + JSON.stringify(cell)).toBeLessThanOrEqual(cell.clientWidth + 1);
                expect(cell.right, 'Customer field should remain inside viewport').toBeLessThanOrEqual(narrowViewport.width + 1);
              }
            }
            await saveScreenshot('customers-responsive', { viewport: narrowViewport, theme: narrowTheme }, {
              fixtureCustomers: 2, noHorizontalOverflow: true, noFabricatedAvatars: true, responsiveCustomerAudit: true
            });
          }
        }
        await page.setViewportSize(originalViewport);
        await chooseTheme(variant.theme);
        await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
      }
    }, true);
    // Regression: endpoint failures must not appear as real empty lists.
    // Temporary routes simulate read-only 503s; retries fall back to in-memory GET fixtures only.
    const optionalFailureHandler = async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (optionalEndpointFailures.has(pathname) && route.request().method() === 'GET') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'UI-only simulated unavailable endpoint.' }) });
        return;
      }
      await route.fallback();
    };
    optionalEndpointFailures.add('/api/admin/customers');
    optionalEndpointFailures.add('/api/admin/warranties');
    await page.route('**/api/admin/customers', optionalFailureHandler);
    await page.route('**/api/admin/warranties', optionalFailureHandler);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#appView')).toBeVisible();
    await expect(page.locator('#main')).toContainText('Không thể tải danh sách khách hàng từ máy chủ.');
    await expect(page.locator('[data-action="retry-customers"]')).toBeVisible();
    await navigateTo('warranties');
    await expect(page.locator('#main')).toContainText('Không thể tải dữ liệu bảo hành và hỗ trợ từ máy chủ.');
    await expect(page.locator('[data-action="retry-warranties"]')).toBeVisible();
    // setView() calls loadData(). Keep each endpoint failing until its screen is
    // rendered with the explicit error/retry state; disable only that endpoint
    // immediately before clicking Retry so the retry itself can recover.
    await navigateTo('customers');
    optionalEndpointFailures.delete('/api/admin/customers');
    await page.locator('[data-action="retry-customers"]').click();
    await expect(page.locator('.customer-table tbody')).toContainText('Khách thử nghiệm giao diện');
    await expect(page.locator('#customerSearchStatus')).toContainText('Hiển thị 2 / 2');
    await navigateTo('warranties');
    optionalEndpointFailures.delete('/api/admin/warranties');
    await page.locator('[data-action="retry-warranties"]').click();
    await expect(page.locator('.issued-warranty-table tbody')).toContainText('UI-ONLY-WARRANTY');
    await expect(page.locator('.claim-table tbody')).toContainText('UI-ONLY-CLAIM');
    await page.unroute('**/api/admin/customers', optionalFailureHandler);
    await page.unroute('**/api/admin/warranties', optionalFailureHandler);
    await captureView('warranties', 'warranties', async variant => {
      // Screen #9: synthetic, read-only warranty list/filter and accessible issue disclosure.
      await expect(page.locator('.warranty-toolbar')).toBeVisible();
      if (variant.viewport.width <= 820) {
        const toast = page.locator('#toast');
        const previousState = await toast.evaluate(element => ({
          shown: element.classList.contains('show'),
          transition: element.style.transition
        }));
        await toast.evaluate(element => {
          element.style.transition = 'none';
          element.classList.add('show');
        });
        const toastLayout = await page.evaluate(() => {
          const toastElement = document.querySelector('#toast');
          const navElement = document.querySelector('.mobiletabs');
          if (!toastElement || !navElement) return null;
          return {
            toastBottom: Math.round(toastElement.getBoundingClientRect().bottom),
            navTop: Math.round(navElement.getBoundingClientRect().top)
          };
        });
        expect(toastLayout, 'Mobile toast and bottom navigation must both exist').not.toBeNull();
        expect(toastLayout.toastBottom,
          'Mobile toast must remain at least 8px above fixed bottom navigation: ' + JSON.stringify(toastLayout))
          .toBeLessThanOrEqual(toastLayout.navTop - 8);
        await toast.evaluate((element, state) => {
          element.style.transition = state.transition;
          // Keep baseline screenshots deterministic even if a prior retry toast was already visible.
          element.classList.remove('show');
        }, previousState);
      }
      await expect(page.getByLabel('Tìm mã bảo hành, mã đơn, SKU hoặc sản phẩm')).toBeVisible();
      await expect(page.locator('[data-warranty-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-warranty-filter="all"]')).toContainText('Tất cả (1)');
      await expect(page.locator('[data-warranty-filter="active"]')).toContainText('Đang xử lý (1)');
      if (variant.viewport.width >= 375 && variant.viewport.width <= 680) {
        const filterLayout = await page.locator('.warranty-toolbar .warranty-filter-button').evaluateAll(nodes =>
          nodes.map(node => ({
            label: node.textContent?.trim(),
            top: Math.round(node.getBoundingClientRect().top),
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth
          }))
        );
        expect(Math.max(...filterLayout.map(item => item.top)) - Math.min(...filterLayout.map(item => item.top)),
          'Warranty status filters should stay in one row on common-width mobile screens: ' + JSON.stringify(filterLayout)).toBeLessThanOrEqual(1);
        expect(filterLayout.every(item => item.scrollWidth <= item.clientWidth + 1),
          'Warranty filter labels should not clip on common-width mobile screens: ' + JSON.stringify(filterLayout)).toBe(true);
      }
      await expect(page.locator('.issued-warranty-table tbody')).toContainText('UI-ONLY-WARRANTY');
      const orderNumber = page.locator('.issued-warranty-table .warranty-order-number');
      await expect(orderNumber).toHaveText('UI-ONLY-ORDER');
      const orderNumberFits = await orderNumber.evaluate(element => element.scrollWidth <= element.clientWidth);
      expect(orderNumberFits, 'Warranty order number should remain legible without horizontal clipping').toBe(true);
      const orderNumberHeight = await orderNumber.evaluate(element => element.getBoundingClientRect().height);
      expect(orderNumberHeight, 'Warranty order number should remain on one line').toBeLessThan(22);
      if (variant.viewport.width <= 680) {
        await expect(page.locator('.issued-warranty-table tbody tr td:nth-child(2)')).toHaveCSS('display', 'block');
      }
      await expect(page.locator('.claim-table tbody')).toContainText('UI-ONLY-CLAIM');

      // Search only filters local synthetic records; no API mutation is requested.
      await page.locator('#warrantySearch').fill('UI-ONLY-WARRANTY');
      await expect(page.locator('.issued-warranty-table tbody')).toContainText('UI-ONLY-WARRANTY');
      await expect(page.locator('[data-claim-status="UI-ONLY-CLAIM"]')).toBeHidden();
      await expect(page.locator('#warrantyFilterStatus')).toContainText('Hiển thị 1 mã bảo hành và 0 yêu cầu phù hợp.');
      await expect(page.locator('#warrantyFilterStatus')).toHaveAttribute('aria-live', 'polite');
      await page.locator('#warrantySearch').fill('no-match-ui-query');
      await expect(page.locator('.issued-warranty-table tbody')).toContainText('Chưa có mã bảo hành phù hợp.');
      await expect(page.locator('.claim-table tbody')).toContainText('Chưa có yêu cầu hỗ trợ phù hợp.');
      await expect(page.locator('#warrantyFilterStatus')).toContainText('Hiển thị 0 mã bảo hành và 0 yêu cầu phù hợp.');
      await page.locator('#warrantySearch').fill('');
      await page.locator('[data-warranty-filter="closed"]').click();
      await expect(page.locator('[data-warranty-filter="closed"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-claim-status="UI-ONLY-CLAIM"]')).toBeHidden();
      await page.locator('[data-warranty-filter="all"]').click();
      await expect(page.locator('[data-claim-status="UI-ONLY-CLAIM"]')).toBeVisible();

      const disclosure = page.locator('#warrantyIssueDisclosure');
      await expect(disclosure).toHaveJSProperty('open', false);
      await disclosure.locator('summary').click();
      await expect(page.locator('#warrantyIssueForm')).toBeVisible();
      await expect(page.getByLabel('Mã đơn hàng *')).toBeVisible();
      await expect(page.getByLabel('Mã sản phẩm trong đơn (SKU nếu đã xác minh) *')).toBeVisible();
      await expect(page.getByLabel('Tên chính sách đã xác nhận *')).toBeVisible();
      await expect(page.getByLabel('Thời hạn (tháng) *')).toHaveAttribute('min', '1');
      await expect(page.locator('#wMonths')).toHaveAttribute('max', '120');
      await expect(page.locator('#wMonths')).toHaveValue('');
      await expect(page.getByLabel('Ngày bắt đầu *')).toHaveAttribute('type', 'date');
      await expect(page.locator('#issueWarrantyBtn')).toContainText('Phát hành mã bảo hành');
      await expect(page.locator('#warrantyIssueMessage')).toHaveAttribute('aria-live', 'polite');
      await disclosure.locator('summary').click();
      await expect(disclosure).toHaveJSProperty('open', false);

      // The interaction above scrolls the summary into view. Reset both possible
      // scroll containers so the screenshot records the intended list-first viewport.
      await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
      await page.evaluate(() => window.scrollTo(0, 0));
      const headingBox = await page.locator('#main .pagehead').boundingBox();
      expect(headingBox?.y, 'Warranty screenshot should show the page heading near the top').toBeGreaterThanOrEqual(0);
      expect(headingBox?.y, 'Warranty screenshot should show the page heading near the top').toBeLessThan(300);

      // Narrow Android regression: test the actual warranty screen at 320px and 360px
      // in both themes. Read-only fixture data only; do not submit the issue form.
      if (variant.viewport.width === 390 && variant.theme === 'light') {
        for (const narrowViewport of [{ width: 320, height: 640 }, { width: 360, height: 800 }]) {
          for (const narrowTheme of ['light', 'dark']) {
            await page.setViewportSize(narrowViewport);
            await chooseTheme(narrowTheme);
            await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
            await page.evaluate(() => {
              window.scrollTo(0, 0);
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            });
            await page.locator('#warrantySearch').fill('');
            await page.locator('[data-warranty-filter="all"]').click();
            await expect(page.locator('.warranty-toolbar')).toBeVisible();
            await expect(page.locator('#main .pagehead')).toBeVisible();
            await expect(page.locator('.issued-warranty-table tbody')).toContainText('UI-ONLY-WARRANTY');
            await expect(page.locator('.claim-table tbody')).toContainText('UI-ONLY-CLAIM');
            const warrantyLayout = await page.evaluate(() => {
              const $ = selector => document.querySelector(selector);
              const rect = element => {
                const box = element.getBoundingClientRect();
                return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
              };
              const main = $('#main');
              const toolbar = $('.warranty-toolbar');
              const filters = [...document.querySelectorAll('.warranty-toolbar .warranty-filter-button')];
              const tables = ['.issued-warranty-table', '.claim-table'].map(selector => {
                const table = $(selector);
                return {
                  selector,
                  rect: rect(table),
                  clientWidth: table.clientWidth,
                  scrollWidth: table.scrollWidth,
                  rows: [...table.querySelectorAll('tbody tr')].map(row => ({
                    rect: rect(row),
                    clientWidth: row.clientWidth,
                    scrollWidth: row.scrollWidth,
                    cells: [...row.querySelectorAll('td')].map(cell => ({
                      text: (cell.innerText || '').trim().slice(0, 80),
                      rect: rect(cell),
                      clientWidth: cell.clientWidth,
                      scrollWidth: cell.scrollWidth
                    }))
                  }))
                };
              });
              return {
                viewportWidth: window.innerWidth,
                documentScrollWidth: document.documentElement.scrollWidth,
                bodyScrollWidth: document.body.scrollWidth,
                main: { rect: rect(main), clientWidth: main.clientWidth, scrollWidth: main.scrollWidth },
                toolbar: { rect: rect(toolbar), clientWidth: toolbar.clientWidth, scrollWidth: toolbar.scrollWidth },
                filters: filters.map(filter => ({
                  text: (filter.innerText || '').trim(),
                  rect: rect(filter),
                  clientWidth: filter.clientWidth,
                  scrollWidth: filter.scrollWidth
                })),
                tables,
                orderNumber: $('.issued-warranty-table .warranty-order-number')
                  ? { text: $('.issued-warranty-table .warranty-order-number').textContent.trim(),
                      clientWidth: $('.issued-warranty-table .warranty-order-number').clientWidth,
                      scrollWidth: $('.issued-warranty-table .warranty-order-number').scrollWidth,
                      rect: rect($('.issued-warranty-table .warranty-order-number')) }
                  : null
              };
            });
            expect(warrantyLayout.documentScrollWidth,
              'Warranty screen must not overflow the document horizontally: ' + JSON.stringify(warrantyLayout))
              .toBeLessThanOrEqual(narrowViewport.width);
            expect(warrantyLayout.bodyScrollWidth,
              'Warranty screen must not overflow the body horizontally: ' + JSON.stringify(warrantyLayout))
              .toBeLessThanOrEqual(narrowViewport.width);
            expect(warrantyLayout.main.scrollWidth,
              'Warranty content area must not overflow horizontally: ' + JSON.stringify(warrantyLayout))
              .toBeLessThanOrEqual(warrantyLayout.main.clientWidth + 1);
            expect(warrantyLayout.toolbar.scrollWidth,
              'Warranty filter toolbar must stay within its own content box: ' + JSON.stringify(warrantyLayout))
              .toBeLessThanOrEqual(warrantyLayout.toolbar.clientWidth + 1);
            expect(warrantyLayout.filters.length).toBeGreaterThanOrEqual(3);
            for (const filter of warrantyLayout.filters) {
              expect(filter.rect.left, 'Warranty filter button should remain inside viewport: ' + JSON.stringify(filter))
                .toBeGreaterThanOrEqual(-1);
              expect(filter.rect.right, 'Warranty filter button should remain inside viewport: ' + JSON.stringify(filter))
                .toBeLessThanOrEqual(narrowViewport.width + 1);
              expect(filter.scrollWidth, 'Warranty filter label should not be clipped: ' + JSON.stringify(filter))
                .toBeLessThanOrEqual(filter.clientWidth + 1);
            }
            for (const table of warrantyLayout.tables) {
              expect(table.scrollWidth,
                table.selector + ' should not create an unreported horizontal scrollbar: ' + JSON.stringify(table))
                .toBeLessThanOrEqual(table.clientWidth + 1);
              for (const row of table.rows) {
                expect(row.rect.left, table.selector + ' row should stay within viewport').toBeGreaterThanOrEqual(-1);
                expect(row.rect.right, table.selector + ' row should stay within viewport')
                  .toBeLessThanOrEqual(narrowViewport.width + 1);
                expect(row.scrollWidth,
                  table.selector + ' row should not clip warranty/order identifiers: ' + JSON.stringify(row))
                  .toBeLessThanOrEqual(row.clientWidth + 1);
                for (const cell of row.cells) {
                  expect(cell.rect.right, 'Warranty cell should stay inside the viewport: ' + JSON.stringify(cell))
                    .toBeLessThanOrEqual(narrowViewport.width + 1);
                  expect(cell.scrollWidth, 'Warranty cell text should wrap without clipping: ' + JSON.stringify(cell))
                    .toBeLessThanOrEqual(cell.clientWidth + 1);
                }
              }
            }
            if (warrantyLayout.orderNumber) {
              expect(warrantyLayout.orderNumber.scrollWidth,
                'Warranty order number should remain legible at narrow widths: ' + JSON.stringify(warrantyLayout.orderNumber))
                .toBeLessThanOrEqual(warrantyLayout.orderNumber.clientWidth + 1);
            }
            await saveScreenshot('warranties-responsive', { viewport: narrowViewport, theme: narrowTheme }, {
              fixtureOnly: true, noHorizontalOverflow: true, responsiveWarrantyAudit: true,
              filterButtonsWithinViewport: true, noFormSubmission: true
            });
          }
        }
        await page.setViewportSize(variant.viewport);
        await chooseTheme(variant.theme);
        await page.locator('#main').evaluate(element => { element.scrollTop = 0; });
      }
    }, true);
    await captureView('settings', 'settings', async variant => {
      // Screen 10 should reproduce the approved public-price-enabled state and keep its
      // three primary controls visible before the mobile navigation at the reference viewport.
      await expect(page.locator('#showPrices')).toBeChecked();
      await expect(page.getByRole('heading', { name: 'Hiển thị giá sản phẩm công khai' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Lớp phủ chào mừng (Welcome Overlay)' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cài đặt watermark' })).toBeVisible();

      if (variant.viewport.width === 390 && variant.viewport.height === 844 && variant.theme === 'light') {
        const priceStatus = page.locator('.website-settings > section:first-child .switchrow .tiny.muted');
        await expect(priceStatus, 'Reference Screen 10 shows the public-price toggle without an extra status line').toBeHidden();
        await expect(page.locator('#welcomeSettingsForm .field:has(#welcomeLine2)'),
          'Reference Screen 10 shows one welcome-title field on mobile, followed by the welcome copy').toBeHidden();
        const welcomeCopyHeight = await page.locator('#welcomeCopy').evaluate(element => element.getBoundingClientRect().height);
        expect(welcomeCopyHeight,
          'Reference Screen 10 welcome copy should use a compact two-line field at 390x844: ' + welcomeCopyHeight)
          .toBeLessThanOrEqual(56);
        const mobileNavTop = await page.locator('.mobiletabs').evaluate(element => element.getBoundingClientRect().top);
        for (const selector of ['#watermarkSettingsForm > .switchrow', '#watermarkLogoUrl', '#watermarkPosition', '#watermarkSize', '#watermarkOpacity']) {
          const bounds = await page.locator(selector).boundingBox();
          expect(bounds, 'Reference Screen 10 control should render: ' + selector).not.toBeNull();
          expect(bounds.y + bounds.height,
            'Reference Screen 10 control must remain above fixed mobile navigation: ' + selector)
            .toBeLessThanOrEqual(mobileNavTop + 1);
        }
      }
    }, true);
    await captureView('settings-qr-unsaved-guard', 'settings', async variant => {
      // Previous viewport iteration leaves the guard message in the live DOM;
      // navigate away and back so each viewport starts from a freshly rendered form.
      await navigateTo('products');
      await navigateTo('settings');
      await expect(page.locator('#paymentQrBankName')).toBeVisible();
      await expect(page.locator('#paymentQrAccountNumber')).toBeVisible();
      await expect(page.locator('#paymentQrAccountName')).toBeVisible();
      await expect(page.locator('#paymentQrInstructions')).toBeVisible();
      await expect(page.getByLabel('Tôi đã tự quét kiểm tra ảnh, xác nhận đúng tài khoản nhận và QR không chứa số tiền cố định.')).toBeVisible();
      await expect(page.locator('#activatePaymentQr')).toBeVisible();
      await expect(page.locator('#deactivatePaymentQr')).toBeDisabled();
      await expect(page.locator('#paymentQrMessage')).toBeEmpty();

      // Exercise the real client-side safety guard only: change one bank field,
      // confirm the explicit scan checkbox, then verify activation is refused
      // before any confirmation dialog or non-GET API request is attempted.
      await page.locator('#paymentQrBankName').fill('Fixture bank changed');
      await page.locator('#paymentQrVerified').check();
      await page.locator('#activatePaymentQr').click();
      await expect(page.locator('#paymentQrMessage')).toContainText(
        'Thông tin ngân hàng đã thay đổi. Hãy lưu thông tin nháp trước khi kích hoạt QR.'
      );
      await expect(page.locator('#activatePaymentQr')).toBeEnabled();

      // Local-only file-picker regression: selecting a fixture must not upload it automatically,
      // and the explicit upload action must refuse to send a request when no file is selected.
      await navigateTo('products');
      await navigateTo('settings');
      const qrFile = page.locator('#paymentQrFile');
      const qrFileName = page.locator('#paymentQrFileName');
      const uploadQr = page.locator('#uploadPaymentQr');
      await expect(page.getByText('Chọn ảnh QR ngân hàng')).toBeVisible();
      await expect(qrFile).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
      await expect(qrFileName).toHaveText('Chưa chọn tệp QR.');
      const writesBeforeQrPicker = attemptedWrites.length;
      const qrUploadRequestsBefore = fixtureApiRequests.filter(request =>
        request.path === '/api/admin/payment-qr-upload' && request.method !== 'GET'
      ).length;
      const tinyPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lqkAAAAASUVORK5CYII=',
        'base64'
      );
      await qrFile.setInputFiles({
        name: 'ui-only-qr-fixture.png',
        mimeType: 'image/png',
        buffer: tinyPng
      });
      await expect(qrFileName).toHaveText('ui-only-qr-fixture.png');
      await expect(page.locator('#paymentQrMessage')).toBeEmpty();
      expect(attemptedWrites.length, 'Choosing an image must not automatically upload the QR').toBe(writesBeforeQrPicker);
      expect(fixtureApiRequests.filter(request =>
        request.path === '/api/admin/payment-qr-upload' && request.method !== 'GET'
      )).toHaveLength(qrUploadRequestsBefore);

      await qrFile.setInputFiles([]);
      await expect(qrFileName).toHaveText('Chưa chọn tệp QR.');
      await uploadQr.click();
      await expect(page.locator('#paymentQrMessage')).toHaveText('Chọn ảnh QR PNG/JPEG/WebP trước.');
      expect(attemptedWrites.length, 'Upload without a selected file must be rejected locally').toBe(writesBeforeQrPicker);
      expect(fixtureApiRequests.filter(request =>
        request.path === '/api/admin/payment-qr-upload' && request.method !== 'GET'
      )).toHaveLength(qrUploadRequestsBefore);
      await navigateTo('products');
      await navigateTo('settings');
      await expect(qrFileName).toHaveText('Chưa chọn tệp QR.');
      await expect(page.locator('#paymentQrMessage')).toBeEmpty();
    }, true);
    await captureView('backup-restore', 'backup', async () => {
      const section = page.locator('#main .setting').filter({ hasText: 'Sao lưu & khôi phục' });
      await expect(section).toBeVisible();
      await expect(section.locator('#backupBtn')).toContainText('Tải bản sao lưu JSON');
      await expect(section.locator('#restoreFile')).toHaveAttribute('accept', 'application/json,.json');
      await expect(section).toContainText('có bước xác nhận trước khi thực hiện');
      const historyPanel = page.locator('#main .backup-history');
      await expect(historyPanel, 'Backup/Restore reference includes a recent-files panel').toBeVisible();
      await expect(historyPanel).toContainText('Tệp sao lưu gần đây');
      await expect(historyPanel).toContainText('API hiện tại chưa cung cấp dữ liệu này');
      const backupLayout = await section.evaluate(element => {
        const panel = element.getBoundingClientRect();
        const actions = element.querySelector('.backup-actions').getBoundingClientRect();
        const controls = [...element.querySelectorAll('.backup-actions > .btn')].map(node => {
          const box = node.getBoundingClientRect();
          return { width: box.width, right: box.right, left: box.left, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
        });
        const note = element.querySelector('.backup-note');
        const noteBox = note.getBoundingClientRect();
        return {
          panelWidth: panel.width,
          panelRight: panel.right,
          actionsWidth: actions.width,
          controls,
          noteWidth: noteBox.width,
          noteScrollWidth: note.scrollWidth,
          noteClientWidth: note.clientWidth
        };
      });
      expect(backupLayout.panelRight, 'Backup panel should not extend beyond the viewport').toBeLessThanOrEqual((page.viewportSize()?.width ?? 390) + 1);
      expect(backupLayout.controls.every(control => control.width > 0 && control.scrollWidth <= control.clientWidth + 1),
        'Backup/restore actions should remain visible without clipped text: ' + JSON.stringify(backupLayout)).toBe(true);
      expect(backupLayout.noteScrollWidth, 'Backup safety note should not overflow its own content box').toBeLessThanOrEqual(backupLayout.noteClientWidth + 1);
      expect(await section.locator('#restoreFile').isVisible(), 'The JSON file input must remain visually hidden behind its label').toBe(false);
    }, false);
    await captureView('mobile-more-menu', 'dashboard', async variant => {
      if (variant.viewport.width > 680) return;
      const trigger = page.locator('#mobileMoreTrigger');
      const menu = page.locator('#mobileMorePanel');
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(trigger).toHaveAttribute('aria-controls', 'mobileMorePanel');
      await expect(menu.locator('[role="menuitem"][data-view="warranties"]')).toContainText('Bảo hành / hỗ trợ');
      await expect(menu.locator('[role="menuitem"][data-view="settings"]')).toContainText('Cài đặt website');
      await expect(menu.locator('[role="menuitem"][data-view="backup"]')).toContainText('Sao lưu / Khôi phục');
      const layout = await menu.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width, viewportWidth: document.documentElement.clientWidth, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      });
      expect(layout.left, 'Mobile More menu should not extend beyond the left viewport edge: ' + JSON.stringify(layout)).toBeGreaterThanOrEqual(-1);
      expect(layout.right, 'Mobile More menu should not extend beyond the right viewport edge: ' + JSON.stringify(layout)).toBeLessThanOrEqual(variant.viewport.width + 1);
      expect(layout.scrollWidth, 'Mobile More menu should not clip its contents').toBeLessThanOrEqual(layout.clientWidth + 1);
      await page.keyboard.press('Escape');
      await expect(menu, 'Escape should close the mobile More menu').toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger, 'Closing More menu should restore focus to the trigger').toBeFocused();
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await menu.locator('[role="menuitem"][data-view="settings"]').click();
      await expect(menu).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger, 'Choosing a More menu item should return focus to the visible trigger').toBeFocused();
      await expect(page.locator('#main .pagehead h2')).toContainText('Cài đặt website');
      await page.locator('[data-view="dashboard"]:visible').first().click();
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    await captureView('dashboard-activity', 'dashboard', async () => {
      await page.locator('#main .panel').last().scrollIntoViewIfNeeded();
    });
    await captureView('activity-log', 'activity', async variant => {
      // Official screen #12: test the dedicated audit-log route, not only the dashboard's recent-activity preview.
      await expect(page.locator('#main .pagehead h2')).toHaveText('Nhật ký hoạt động');
      await expect(page.locator('.activity-log-category-filters')).toBeVisible();
      await expect(page.locator('#activityActorFilter')).toBeVisible();
      await expect(page.locator('#activityDateFrom')).toBeVisible();
      await expect(page.locator('#activityDateTo')).toBeVisible();
      const mobileViewportWidth = page.viewportSize()?.width ?? 0;
      if (mobileViewportWidth <= 680) {
        const mobileFilterHeights = await page.evaluate(() => ({
          categoryChip: document.querySelector('.activity-category-chip')?.getBoundingClientRect().height ?? 0,
          actorControl: document.querySelector('#activityActorFilter')?.getBoundingClientRect().height ?? 0,
          dateControl: document.querySelector('#activityDateFrom')?.getBoundingClientRect().height ?? 0,
          advancedToggle: document.querySelector('#activityAdvancedToggle')?.getBoundingClientRect().height ?? 0
        }));
        expect(mobileFilterHeights.categoryChip, 'Mobile activity category chips should be compact').toBeLessThanOrEqual(32);
        expect(mobileFilterHeights.actorControl, 'Mobile actor filter should fit the compact control height').toBeLessThanOrEqual(36);
        expect(mobileFilterHeights.dateControl, 'Mobile date filters should fit the compact control height').toBeLessThanOrEqual(36);
        expect(mobileFilterHeights.advancedToggle, 'Mobile advanced-search toggle should be compact').toBeLessThanOrEqual(34);
        const firstActivityCardHeight = await page.locator('.activity-log-card').first().evaluate(el => el.getBoundingClientRect().height);
        expect(firstActivityCardHeight, 'Mobile activity cards should stay compact enough to show more audit events').toBeLessThanOrEqual(60);
        if (mobileViewportWidth <= 320 && (page.viewportSize()?.height ?? 0) <= 640) {
          const firstRecordVisibility = await page.evaluate(() => {
            const card = document.querySelector('.activity-log-card');
            const nav = document.querySelector('.mobiletabs');
            if (!card || !nav) return null;
            return {
              cardBottom: Math.round(card.getBoundingClientRect().bottom),
              navigationTop: Math.round(nav.getBoundingClientRect().top)
            };
          });
          expect(firstRecordVisibility, '320×640 Screen 12 must render an activity record and the mobile navigation').not.toBeNull();
          expect(firstRecordVisibility.cardBottom,
            'The first Screen 12 activity record must fit above the fixed mobile navigation at 320×640')
            .toBeLessThanOrEqual(firstRecordVisibility.navigationTop);
        }
      }
      await expect(page.locator('#refreshActivityLogs')).toBeVisible();
      await expect(page.locator('.activity-log-table tbody')).toContainText('product_updated');

      // Screen 12 reference exposes activity and notification views as tabs inside the same screen.
      await page.evaluate(() => localStorage.removeItem('sd-admin-last-seen'));
      const activityTab = page.locator('[data-activity-tab="log"]');
      const notificationsTab = page.locator('[data-activity-tab="notifications"]');
      await expect(activityTab).toHaveAttribute('aria-pressed', 'true');
      await expect(notificationsTab).toBeVisible();
      await notificationsTab.click();
      await expect(notificationsTab).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#activityNotificationList')).toContainText('Đã sửa sản phẩm');
      await expect(page.locator('#activityNotificationsUnread')).toHaveText('5');
      await page.locator('#activityMarkNotificationsRead').click();
      const activityReadAt = await page.evaluate(() => localStorage.getItem('sd-admin-last-seen'));
      expect(Number.isFinite(Date.parse(activityReadAt || '')), 'Screen 12 notification tab must persist the local read timestamp').toBe(true);
      await expect(page.locator('#activityNotificationsUnread')).toBeHidden();
      await activityTab.click();
      await expect(activityTab).toHaveAttribute('aria-pressed', 'true');

      const width = page.viewportSize()?.width ?? 0;
      const advancedToggle = page.locator('#activityAdvancedToggle');
      if (width <= 680) {
        await expect(advancedToggle).toBeVisible();
        if (await advancedToggle.getAttribute('aria-expanded') === 'true') await advancedToggle.click();
        await expect(page.locator('#activityLogSearch')).toBeHidden();
      } else {
        await expect(page.locator('#activityLogSearch')).toBeVisible();
      }
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(documentWidth, 'Activity log must not cause document-level horizontal overflow').toBeLessThanOrEqual(width);
      await expect(page.locator('.activity-log-category-filters')).toBeVisible();
      await expect(page.locator('#activityActorFilter')).toBeVisible();
      await expect(page.locator('#activityDateFrom')).toBeVisible();
      await expect(page.locator('#activityDateTo')).toBeVisible();
      const productEntityFilter = page.locator('[data-activity-entity-filter="product"]');
      const orderEntityFilter = page.locator('[data-activity-entity-filter="order"]');
      await orderEntityFilter.click();
      await expect(orderEntityFilter).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(2);
      await expect(page.locator('.activity-log-cards')).toContainText('UI-ONLY-ORDER-2');
      await expect(page.locator('.activity-log-cards')).toContainText('UI-ONLY-ORDER-3');
      await productEntityFilter.click();
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(2);
      await expect(page.locator('.activity-log-cards')).toContainText(fixtureProduct.title);
      await expect(page.locator('.activity-log-cards')).toContainText('Sản phẩm UI fixture 2');
      await page.locator('[data-activity-entity-filter="customer"]').click();
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(1);
      await page.locator('[data-activity-entity-filter="all"]').click();
      await page.locator('#activityActorFilter').selectOption('admin');
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(4);
      await page.locator('#activityActorFilter').selectOption('all');
      await page.locator('#activityDateFrom').fill('2026-10-22');
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(0);
      await page.locator('#activityDateFrom').fill('');
      await expect(page.locator('.activity-log-cards .activity-log-card')).toHaveCount(5);
      if (width <= 680) {
        await expect(page.locator('.activity-log-table-wrap')).toBeHidden();
        await expect(page.locator('.activity-log-cards')).toBeVisible();
        await expect(page.locator('.activity-log-card-avatar').first()).toHaveAttribute('aria-hidden', 'true');
        const cardLayout = await page.locator('.activity-log-card').first().evaluate(element => {
          const box=element.getBoundingClientRect();
          return { left:box.left, right:box.right, width:box.width, scrollWidth:element.scrollWidth, clientWidth:element.clientWidth };
        });
        expect(cardLayout.left, 'Mobile activity cards should stay within the viewport').toBeGreaterThanOrEqual(-1);
        expect(cardLayout.right, 'Mobile activity cards should not cross the viewport edge').toBeLessThanOrEqual(width+1);
        expect(cardLayout.scrollWidth, 'Mobile activity cards must not have internal horizontal overflow').toBeLessThanOrEqual(cardLayout.clientWidth+1);
      } else {
        await expect(page.locator('.activity-log-table-wrap')).toBeVisible();
      }

      if (width <= 680) {
        await advancedToggle.click();
        await expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
        const searchWidth = await page.locator('#activityLogSearch').evaluate(el => el.getBoundingClientRect().width);
        expect(searchWidth, 'Expanded activity-log search must have a usable full-width row on mobile').toBeGreaterThanOrEqual(width * 0.65);
      }
      await expect(page.locator('#activityLogSearch')).toBeVisible();
      await page.locator('#activityLogSearch').fill('UI-ONLY-PRODUCT');
      await expect(page.locator('.activity-log-table tbody')).toContainText('UI-ONLY-PRODUCT');
      await page.locator('#activityLogSearch').fill('no-match-ui-query');
      await expect(page.locator('.activity-log-table tbody')).toContainText('Không có bản ghi phù hợp với bộ lọc.');
      await page.locator('#clearActivityFilters').click();
      await expect(page.locator('.activity-log-table tbody')).toContainText('product_updated');
      await page.locator('#activityActionFilter').selectOption('product_updated');
      await expect(page.locator('.activity-log-table tbody')).toContainText('product_updated');
      await page.locator('#activityActionFilter').selectOption('all');
      const refreshActivityButton = page.locator('#refreshActivityLogs');
      await refreshActivityButton.click();
      // Wait for the async refresh to finish before screenshot capture; the old
      // row may already exist while the button is still in its loading state.
      await expect(refreshActivityButton).toBeEnabled();
      await expect(refreshActivityButton).toHaveText('Làm mới');
      await expect(page.locator('.activity-log-table tbody')).toContainText('product_updated');
      await expect(page.locator('.activity-log-push-settings')).toBeVisible();
      await expect(page.locator('#activityLogEnablePush')).toHaveText('Bật thông báo đẩy');
      if (width <= 680) {
        await advancedToggle.click();
        await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#activityLogSearch')).toBeHidden();
      }

      // Leave the screenshot in the reference's unread-notification state.
      // The behavior assertion above verifies mark-read; reset the fixture state after that check.
      await page.evaluate(() => localStorage.removeItem('sd-admin-last-seen'));
      await notificationsTab.click();
      await expect(page.locator('#activityNotificationsUnread')).toHaveText('5');
      await activityTab.click();
      await expect(activityTab).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#activityNotificationsUnread')).toHaveText('5');
    });
    await captureView('notifications', 'dashboard', async variant => {
      const toggle = page.locator('#notificationToggle');
      const panel = page.locator('#notificationPanel');
      // Make unread-state coverage deterministic for every viewport/theme capture.
      await page.evaluate(() => localStorage.removeItem('sd-admin-last-seen'));
      await toggle.click();
      await expect(panel).toBeVisible();
      const unreadCount = page.locator('#notificationCount');
      await expect(unreadCount, 'A recent fixture audit event should appear as unread').toBeVisible();
      await expect(unreadCount).toHaveText('5');
      await page.locator('#markNotificationsRead').click();
      await expect(unreadCount, 'Marking notifications read should clear the unread badge').toBeHidden();
      const lastSeen = await page.evaluate(() => localStorage.getItem('sd-admin-last-seen'));
      expect(Number.isFinite(Date.parse(lastSeen || '')), 'Mark-read action should persist a valid local last-seen timestamp').toBe(true);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveAttribute('aria-controls', 'notificationPanel');
      await expect(page.locator('#markNotificationsRead')).toBeVisible();
      const notificationLayout = await panel.evaluate(element => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          width: box.width,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          listScrollWidth: document.querySelector('#notificationList').scrollWidth,
          listClientWidth: document.querySelector('#notificationList').clientWidth
        };
      });
      expect(notificationLayout.left, 'Notification panel should remain inside the viewport: ' + JSON.stringify(notificationLayout)).toBeGreaterThanOrEqual(-1);
      expect(notificationLayout.right, 'Notification panel should remain inside the viewport: ' + JSON.stringify(notificationLayout)).toBeLessThanOrEqual(variant.viewport.width + 1);
      expect(notificationLayout.scrollWidth, 'Notification panel should not clip its own content').toBeLessThanOrEqual(notificationLayout.clientWidth + 1);
      expect(notificationLayout.listScrollWidth, 'Notification text should wrap without horizontal overflow').toBeLessThanOrEqual(notificationLayout.listClientWidth + 1);
      await page.keyboard.press('Escape');
      await expect(panel, 'Escape should close the notification panel').toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle, 'Closing notifications should restore focus to the toggle').toBeFocused();
      await toggle.click();
      await expect(panel).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    // Scroll-to-end geometry audit: fixed mobile navigation must not cover the final content.
    // Use the real source screens with synthetic read-only fixtures; no business writes are allowed.
    const bottomNavigationScrollAudit = [];
    for (const screen of ['products', 'orders', 'customers', 'warranties', 'settings']) {
      await navigateTo(screen);
      for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        for (const theme of ['light', 'dark']) {
          await chooseTheme(theme);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(50);
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(50);
          const geometry = await page.evaluate(() => {
            const main = document.querySelector('#main');
            const nav = document.querySelector('.mobiletabs');
            const mainRect = main?.getBoundingClientRect();
            const navRect = nav?.getBoundingClientRect();
            return {
              screen: main?.querySelector('.pagehead h2')?.textContent?.trim() || null,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              theme: document.documentElement.dataset.adminTheme || null,
              documentWidth: document.documentElement.scrollWidth,
              documentHeight: document.documentElement.scrollHeight,
              scrollY: window.scrollY,
              atDocumentEnd: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
              mainBottom: mainRect ? Math.round(mainRect.bottom) : null,
              navTop: navRect ? Math.round(navRect.top) : null,
              contentGapAboveNav: mainRect && navRect ? Math.round(navRect.top - mainRect.bottom) : null,
              navVisible: Boolean(navRect && navRect.width > 0 && navRect.height > 0)
            };
          });
          expect(geometry.documentWidth,
            'Bottom-navigation scroll audit must not overflow horizontally: ' + JSON.stringify(geometry))
            .toBeLessThanOrEqual(viewport.width);
          expect(geometry.atDocumentEnd,
            'Scroll-to-end must reach the end of the document: ' + JSON.stringify(geometry)).toBe(true);
          expect(geometry.navVisible,
            'Fixed mobile navigation must remain visible at scroll end: ' + JSON.stringify(geometry)).toBe(true);
          expect(geometry.contentGapAboveNav,
            'Final content box must end above the fixed mobile navigation: ' + JSON.stringify(geometry))
            .toBeGreaterThanOrEqual(8);
          bottomNavigationScrollAudit.push(geometry);
        }
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    // Screen 7 is a separate route rather than a primary navigation view; include it
    // explicitly so its long payment/timeline content is checked against the fixed mobile tabs.
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
      for (const theme of ['light', 'dark']) {
        await navigateTo('orders');
        await page.setViewportSize(viewport);
        await chooseTheme(theme);
        await page.locator('[data-order-row="UI-ONLY-ORDER"]').click();
        await expect(page.locator('.order-detail-page')).toBeVisible();
        await page.waitForTimeout(50);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(50);
        const geometry = await page.evaluate(() => {
          const main = document.querySelector('#main');
          const nav = document.querySelector('.mobiletabs');
          const mainRect = main?.getBoundingClientRect();
          const navRect = nav?.getBoundingClientRect();
          return {
            screen: main?.querySelector('.pagehead h2')?.textContent?.trim() || null,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            theme: document.documentElement.dataset.adminTheme || null,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
            scrollY: window.scrollY,
            atDocumentEnd: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
            mainBottom: mainRect ? Math.round(mainRect.bottom) : null,
            navTop: navRect ? Math.round(navRect.top) : null,
            contentGapAboveNav: mainRect && navRect ? Math.round(navRect.top - mainRect.bottom) : null,
            navVisible: Boolean(navRect && navRect.width > 0 && navRect.height > 0)
          };
        });
        expect(geometry.documentWidth, 'Order detail must not overflow horizontally: ' + JSON.stringify(geometry))
          .toBeLessThanOrEqual(viewport.width);
        expect(geometry.atDocumentEnd, 'Order detail must scroll to its final content: ' + JSON.stringify(geometry)).toBe(true);
        expect(geometry.navVisible, 'Fixed mobile navigation must remain visible on order detail: ' + JSON.stringify(geometry)).toBe(true);
        expect(geometry.contentGapAboveNav, 'Order-detail content must end above fixed mobile navigation: ' + JSON.stringify(geometry))
          .toBeGreaterThanOrEqual(8);
        bottomNavigationScrollAudit.push({...geometry, auditRoute:'order-detail'});
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    visualAudit.bottomNavigationScrollAudit = bottomNavigationScrollAudit;
    expect(bottomNavigationScrollAudit,
      'Every mobile screen/theme/viewport combination, including order detail, must be checked at document scroll end')
      .toHaveLength(24);

    expect(pageErrors, 'Fixture visual renders should not throw browser runtime exceptions').toEqual([]);
    expect(attemptedWrites, 'The local fixture should block all mutating API calls').toEqual([]);
    expect(unexpectedApiPaths, 'Every Admin API request should use an explicit synthetic fixture').toEqual([]);
    // Finish capturing every screen before failing so CI retains complete screenshots and DOM evidence.
    visualAudit.visibleClosingTagIssues = visibleClosingTagIssues;
    expect(visibleClosingTagIssues, 'No ADMIN screen should paint a raw HTML closing tag').toEqual([]);
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

test('respects the reduced-motion preference across interactive ADMIN layers', async ({ page }) => {
  // Read-only audit: session and GET APIs use synthetic data; every mutation is rejected.
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const blockedWrites = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      blockedWrites.push({ method: request.method(), path: pathname });
      await route.fulfill({
        status: 405,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Reduced-motion UI test blocks all writes.' })
      });
      return;
    }

    const fixtures = {
      '/api/admin/session': { authenticated: true, fixtureOnly: true },
      '/api/admin/products': { products: [] },
      '/api/admin/settings': {
        showPrices: false,
        welcomeEnabled: false,
        watermarkEnabled: false
      },
      '/api/admin/payment-qr': {
        active: false, activeImageUrl: '', pending: false, pendingImageUrl: '',
        bankName: '', accountNumber: '', accountName: '', instructions: ''
      },
      '/api/admin/orders': { orders: [] },
      '/api/admin/customers': { customers: [] },
      '/api/admin/warranties': { claims: [], warranties: [] },
      '/api/admin/audit-logs': { logs: [] }
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(Object.hasOwn(fixtures, pathname) ? fixtures[pathname] : {})
    });
  });

  const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  expect(response?.status(), 'ADMIN source should load for reduced-motion CSS verification').toBe(200);
  await expect(page.locator('#appView')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#main .dashboard-revenue')).toBeVisible();

  const motionStyles = await page.evaluate(() => {
    const selectors = [
      ['topbar', '.topbar'],
      ['panel', '.dashboard-revenue'],
      ['editor', '#backdrop .editor'],
      ['dashboardShortcut', '.dashboard-shortcut'],
      ['control', '#loginView .control']
    ];
    const seconds = value => value.split(',').map(part => {
      const time = part.trim();
      const amount = Number.parseFloat(time);
      return time.endsWith('ms') ? amount / 1000 : amount;
    });
    return Object.fromEntries(selectors.map(([name, selector]) => {
      const element = document.querySelector(selector);
      if (!element) return [name, { missing: true }];
      const style = getComputedStyle(element);
      return [name, {
        transitionDurations: seconds(style.transitionDuration),
        animationDurations: seconds(style.animationDuration),
        scrollBehavior: style.scrollBehavior
      }];
    }));
  });

  for (const [name, style] of Object.entries(motionStyles)) {
    expect(style.missing, name + ' should exist in the ADMIN source DOM').not.toBe(true);
    expect(
      style.transitionDurations.every(seconds => Number.isFinite(seconds) && seconds <= 0.001),
      name + ' transitions should be effectively disabled when reduced motion is requested'
    ).toBe(true);
    expect(
      style.animationDurations.every(seconds => Number.isFinite(seconds) && seconds <= 0.001),
      name + ' animations should be effectively disabled when reduced motion is requested'
    ).toBe(true);
    expect(style.scrollBehavior, name + ' should not use smooth scrolling for reduced motion').toBe('auto');
  }
  expect(blockedWrites, 'The reduced-motion audit must not issue API mutations').toEqual([]);
});
