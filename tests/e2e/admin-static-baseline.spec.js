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
  const visibleClosingTagIssues = [];
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
    products: 'Tìm tên, SKU hoặc danh mục',
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
      if (name === 'order-row-details' && await page.locator('#orderDetailBackdrop').isVisible()) {
        await page.locator('#orderDetailClose').click();
        await expect(page.locator('#orderDetailBackdrop')).toBeHidden();
        await expect(page.locator('#orderDetailBackdrop')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.locator('[data-action="view-order-details"]:visible').first()).toBeFocused();
      }
    }
  };

  const openEditor = async variant => {
    await page.setViewportSize(variant.viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await chooseTheme(variant.theme);
    await page.locator('[data-action="edit"]:visible').first().click();
    await expect(page.locator('#backdrop')).toBeVisible();
    await expect(page.locator('#backdrop')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#editorTitle')).toContainText('Chỉnh sửa sản phẩm');
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
    if (variant.viewport.width === mobile.width && variant.theme === 'light') {
      await page.setViewportSize({ width: 320, height: 640 });
      await assertProductTabsFit(320);
      await expect(page.locator('#backdrop .editor').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);
      await page.setViewportSize(variant.viewport);
    }

    // Reference-aligned editor grouping: core fields, images, then extra settings.
    await expect(page.locator('#productEditorTabs')).toHaveAttribute('role', 'tablist');
    await expect(page.locator('#productTabDetails')).toHaveText('Thông tin cơ bản');
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#productPanelDetails #pTitle')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pCategory')).toBeVisible();
    const categoryInput = page.locator('#pCategory');
    const originalCategory = await categoryInput.inputValue();
    const categoryOptions = page.locator('#categoryOptions option');
    await expect(categoryInput).toHaveAttribute('list', 'categoryOptions');
    await expect(categoryOptions).toHaveCount(8);
    await expect(page.locator('#categoryOptions option[value="Ví da"]')).toHaveCount(1);
    await expect(page.locator('#categoryOptions option[value="Dây đồng hồ"]')).toHaveCount(1);
    // The editor permits a custom category value without submitting or persisting it.
    await categoryInput.fill('Danh mục fixture tuỳ chỉnh');
    await expect(categoryInput).toHaveValue('Danh mục fixture tuỳ chỉnh');
    await categoryInput.fill(originalCategory);
    await expect(categoryInput).toHaveValue(originalCategory);
    await expect(page.locator('#productPanelDetails #pSku')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pDescription')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pPrice')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pStock')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pPrice')).toHaveAttribute('placeholder', 'Chưa có giá');
    await expect(page.locator('#productPanelDetails #pPrice')).toHaveAttribute('title', 'Để trống nếu chưa có giá');
    await expect(page.locator('#productPanelDetails #pStock')).toHaveAttribute('placeholder', 'Chưa kiểm kê');
    await expect(page.locator('#productPanelDetails #pStock')).toHaveAttribute('title', 'Để trống nếu chưa kiểm kê');
    if (variant.viewport.width <= 390) {
      const mobilePriceStockLayout = await page.evaluate(() => {
        const fieldRect = id => {
          const field = document.querySelector('#' + id)?.closest('.field');
          if (!field) return null;
          const rect = field.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            inputFontSize: parseFloat(getComputedStyle(field.querySelector('input')).fontSize)
          };
        };
        const footer = document.querySelector('#backdrop .editorfooter')?.getBoundingClientRect();
        return {
          price: fieldRect('pPrice'),
          stock: fieldRect('pStock'),
          footerTop: footer?.top
        };
      });
      expect(mobilePriceStockLayout.price, 'Mobile product price field must exist').not.toBeNull();
      expect(mobilePriceStockLayout.stock, 'Mobile product stock field must exist').not.toBeNull();
      expect(
        Math.abs(mobilePriceStockLayout.price.top - mobilePriceStockLayout.stock.top),
        'Product price and stock should share one row on mobile: ' + JSON.stringify(mobilePriceStockLayout)
      ).toBeLessThanOrEqual(2);
      expect(mobilePriceStockLayout.price.width, 'Price field must retain usable width').toBeGreaterThan(0);
      expect(mobilePriceStockLayout.stock.width, 'Stock field must retain usable width').toBeGreaterThan(0);
      expect(mobilePriceStockLayout.price.inputFontSize, 'Price placeholder text should use a compact mobile font').toBeLessThanOrEqual(11);
      expect(mobilePriceStockLayout.stock.inputFontSize, 'Stock placeholder text should use a compact mobile font').toBeLessThanOrEqual(11);
      if (variant.viewport.width >= 380 && mobilePriceStockLayout.footerTop !== undefined) {
        expect(
          mobilePriceStockLayout.stock.bottom,
          'At 390x844 the stock field should stay above the fixed editor action footer: ' + JSON.stringify(mobilePriceStockLayout)
        ).toBeLessThan(mobilePriceStockLayout.footerTop - 4);
      }
    }
    await expect(page.locator('#productPanelDetails .product-visibility-row')).toBeVisible();
    await expect(page.locator('#productPanelDetails #pPublished')).toBeChecked();
    await expect(page.locator('#productPanelDetails #pFulfillmentType')).toHaveCount(0);
    await expect(page.locator('#backdrop .editor').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);
    await page.locator('#productTabGallery').click();
    await expect(page.locator('#productTabGallery')).toHaveText('Hình ảnh');
    await expect(page.locator('#productTabGallery')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#imageDropZone')).toBeVisible();
    await expect(page.locator('#productPanelGallery #pTitle')).toHaveCount(0);
    await expect(page.locator('#productPanelGallery #pCategory')).toHaveCount(0);
    await expect(page.locator('#pPrice')).toBeHidden();
    await expect(page.locator('#pPublished')).toBeHidden();
    await expect(page.locator('#pFulfillmentType')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#productTabPricing')).toBeFocused();
    await expect(page.locator('#productTabPricing')).toHaveText('Khác');
    await expect(page.locator('#productTabPricing')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#productPanelPricing #pFulfillmentType')).toBeVisible();
    await expect(page.locator('#productPanelPricing #pPublished')).toHaveCount(0);
    await expect(page.locator('#productPanelPricing .product-visibility-row')).toHaveCount(0);
    await expect(page.locator('#pPublished')).toBeHidden();
    await expect(page.locator('#imageDropZone')).toBeHidden();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#productTabGallery')).toBeFocused();
    await expect(page.locator('#productTabGallery')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.locator('#productTabDetails')).toBeFocused();
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.locator('#productTabPricing')).toBeFocused();
    await expect(page.locator('#productTabPricing')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.locator('#productTabDetails')).toBeFocused();
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#productTabDetails').click();
    await expect(page.locator('#pSku')).toBeVisible();

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
    await captureView('products', 'products', null, true);

    // Compact mobile cards keep all product facts in one card and the price/stock metrics side-by-side.
    await page.setViewportSize(mobile);
    await chooseTheme('light');
    await page.evaluate(() => window.scrollTo(0, 0));
    const mobileProductRows = page.locator('#main .product-table tbody tr');
    await expect(mobileProductRows).toHaveCount(3);
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
        stock: rect('.product-mobile-inline-metric:nth-child(2)'),
        action: rect('.product-mobile-edit'),
        visibleMetrics: getComputedStyle(row.querySelector('.product-mobile-inline-meta')).display,
        priceText: row.querySelector('.product-mobile-inline-metric:first-child').innerText,
        stockText: row.querySelector('.product-mobile-inline-metric:nth-child(2)').innerText,
        productTitle: row.querySelector('.prodname').getAttribute('title'),
        actionAccessibleName: row.querySelector('.product-mobile-edit').getAttribute('aria-label'),
        published: rect('.product-mobile-status')
      };
    });
    expect(mobileCardLayout.visibleMetrics, 'Inline product price/stock must be visible on mobile').toBe('grid');
    expect(Math.abs(mobileCardLayout.price.top - mobileCardLayout.stock.top),
      'Price and stock should share a compact row: ' + JSON.stringify(mobileCardLayout)).toBeLessThanOrEqual(2);
    expect(mobileCardLayout.priceText).toContain('Chưa nhập');
    expect(mobileCardLayout.stockText).toContain('Chưa kiểm kê');
    expect(mobileCardLayout.productTitle).toBe('Sản phẩm thử nghiệm giao diện');
    expect(mobileCardLayout.actionAccessibleName).toContain('Sửa sản phẩm');
    expect(mobileCardLayout.action.bottom, 'Accessible edit action must finish within the card').toBeLessThanOrEqual(mobileCardLayout.rowHeight + mobileCardLayout.identity.top);
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
        expect(surface.top, 'Mobile product editor should start at the top edge').toBe(0);
        expect(surface.width, 'Mobile product editor should fill the viewport width').toBe(variant.viewport.width);
        expect(surface.height, 'Mobile product editor should fill the viewport height').toBe(variant.viewport.height);
        expect(surface.radius, 'Mobile product editor should not retain a floating-card radius').toBe('0px');
        expect(surface.shadow, 'Mobile product editor should not cast a desktop drawer shadow').toBe('none');
        expect(surface.background, 'Mobile product editor should use an opaque theme surface').toBe(surface.expectedBackground);
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
        await page.locator('#productTabPricing').click();
        await page.locator('#saveProduct').click();
        await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('#pCategory')).toBeFocused();
        await expect(page.locator('#saveError')).toContainText('Vui lòng chọn hoặc nhập danh mục.');
        expect(attemptedWrites, 'Whitespace-only category must never reach the API').toEqual([]);
        await page.locator('#editorCancel').click();
        await expect(page.locator('#backdrop')).toBeHidden();
        await openEditor(variant);
      }
      await page.locator('#productTabGallery').click();
      await expect(page.locator('#imageDropZone')).toBeVisible();
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
        expect(railMetrics.scrollWidth, 'Five thumbnails should exceed the visible rail width').toBeGreaterThan(railMetrics.clientWidth + 20);
        const scrolledRail = await page.locator('#imageGrid .image-rail').evaluate(el => {
          el.scrollLeft = el.scrollWidth;
          return el.scrollLeft;
        });
        expect(scrolledRail, 'Thumbnail rail should be horizontally scrollable').toBeGreaterThan(0);
        await page.locator('#imageGrid .image-rail').evaluate(el => { el.scrollLeft = 0; });

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
          expect(narrowLayout.railScrollWidth,
            'At ' + narrowViewport.width + 'px all fixture thumbnails should remain horizontally reachable').toBeGreaterThan(narrowLayout.railClientWidth + 20);
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
      await expect(page.locator('[data-action="edit"]:visible').first()).toBeFocused();

      if (variant.theme === 'light') {
        await openEditor(variant);
        await page.keyboard.press('Escape');
        await expect(page.locator('#backdrop')).toBeHidden();
        await expect(page.locator('#backdrop')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.locator('[data-action="edit"]:visible').first()).toBeFocused();
      }
    }

    await captureView('orders', 'orders', async variant => {
      const row = page.locator('[data-order-row="UI-ONLY-ORDER"]');
      const management = row.locator('details.order-management-details');
      const summary = management.locator('summary.order-management-summary');
      const unitPrice = row.locator('[data-order-item-price]');
      await expect(row).toBeVisible();
      const orderSearch = page.locator('#orderSearchBox');
      const orderRows = page.locator('[data-order-row]');
      await expect(orderSearch, 'Orders list provides a labeled local search field').toBeVisible();
      await expect(page.locator('#orderStatusFilter')).toBeVisible();
      await expect(page.locator('#orderPaymentFilter')).toBeVisible();
      await expect(orderRows).toHaveCount(3);
      if (variant.viewport.width <= 680) {
        const mobileSummary = row.locator('.order-mobile-summary');
        await expect(mobileSummary, 'Mobile order list uses a compact summary without invented thumbnail data').toBeVisible();
        await expect(mobileSummary).toContainText('Khách thử nghiệm giao diện');
        await expect(mobileSummary).toContainText('Sản phẩm thử nghiệm giao diện');
      }
      await expect(page.locator('#orderResultSummary')).toHaveText('Hiển thị 3 / 3 đơn hàng');
      await orderSearch.fill('Khách UI Fixture 2');
      await expect(orderRows).toHaveCount(1);
      await expect(page.locator('[data-order-row="UI-ONLY-ORDER-2"]')).toBeVisible();
      await orderSearch.fill('khong-co-don-hang-nay');
      await expect(orderRows).toHaveCount(0);
      await expect(page.locator('#orderEmptyStateFiltered')).toContainText('Không tìm thấy đơn hàng phù hợp');
      await page.locator('#clearOrderFilters').click();
      await expect(orderRows).toHaveCount(3);
      await page.locator('#orderStatusFilter').selectOption('completed');
      await expect(orderRows).toHaveCount(1);
      await expect(page.locator('[data-order-row="UI-ONLY-ORDER-3"]')).toBeVisible();
      await page.locator('#orderStatusFilter').selectOption('all');
      await expect(orderRows).toHaveCount(3);
      await page.locator('#orderPaymentFilter').selectOption('paid');
      await expect(orderRows).toHaveCount(1);
      await expect(page.locator('[data-order-row="UI-ONLY-ORDER-3"]')).toBeVisible();
      await page.locator('#clearOrderFilters').click();
      await expect(orderRows).toHaveCount(3);
      await expect(page.locator('#orderResultSummary')).toHaveText('Hiển thị 3 / 3 đơn hàng');
      await expect(row).toContainText('Chờ xác nhận giá');
      await expect(row).toContainText('Chưa hoàn tất thanh toán');
      await expect(row.locator('[data-action="create-payment-request"]')).toBeDisabled();
      await expect(row.locator('[data-action="record-payment"]')).toBeDisabled();

      if (variant.viewport.width <= 680) {
        await expect(summary, 'Mobile order operations use a visible disclosure summary').toBeVisible();
        await expect(management, 'Mobile order tools start collapsed to preserve the order-list summary').not.toHaveAttribute('open', '');
        await expect(management.locator('.order-management-content'), 'Closed mobile disclosure hides the management control panel').toBeHidden();
        await expect(unitPrice, 'Per-item price entry is hidden on mobile until the order tools are expanded').toBeHidden();
        const compactOrderCardHeight = await row.evaluate(el => el.getBoundingClientRect().height);
        expect(compactOrderCardHeight, 'Collapsed mobile order card should keep the first-screen summary compact').toBeLessThan(560);
        await summary.click();
        await expect(management).toHaveAttribute('open', '');
        await expect(management.locator('.order-management-content'), 'Opening mobile disclosure reveals management controls').toBeVisible();
        await expect(unitPrice).toBeVisible();
        await expect(row.locator('[data-action="create-payment-request"]')).toBeDisabled();
        await expect(row.locator('[data-action="record-payment"]')).toBeDisabled();
        await summary.click();
        await expect(unitPrice).toBeHidden();
      } else {
        await expect(summary, 'Desktop order management keeps a compact visible disclosure control').toBeVisible();
        await expect(management, 'Desktop order management starts collapsed to avoid an oversized table row').not.toHaveAttribute('open', '');
        await expect(management.locator('.order-management-content'), 'Closed desktop disclosure hides the management control panel').toBeHidden();
        await expect(unitPrice, 'The existing single price input stays visible in the desktop product cell').toBeVisible();
        const compactDesktopOrderCardHeight = await row.evaluate(el => el.getBoundingClientRect().height);
        expect(compactDesktopOrderCardHeight, 'Collapsed desktop order row should not inherit the full payment form height').toBeLessThan(250);
        await summary.click();
        await expect(management).toHaveAttribute('open', '');
        await expect(management.locator('.order-management-content'), 'Opening desktop disclosure reveals management controls').toBeVisible();
        await expect(row.locator('[data-action="save-order"]')).toBeVisible();
        await expect(row.locator('[data-action="create-payment-request"]')).toBeDisabled();
        await summary.click();
        await expect(management).not.toHaveAttribute('open', '');
      }
      // Locator assertions can scroll the page and nested table horizontally; return to the reference's initial list position before taking screenshots.
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.scrollingElement?.scrollTo(0, 0);
        document.querySelectorAll('#main .tablewrap').forEach(wrapper => { wrapper.scrollLeft = 0; });
      });
    }, true);
    await captureView('order-row-details', 'orders', async () => {
      await page.locator('[data-action="view-order-details"]:visible').first().click();
      await expect(page.locator('#orderDetailBackdrop')).toBeVisible();
      await expect(page.locator('#orderDetailBackdrop')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('#orderDetailTitle')).toHaveText('Chi tiết đơn hàng');
      await expect(page.locator('#orderDetailContent')).toContainText('Khách thử nghiệm giao diện');
      await expect(page.locator('#orderDetailContent')).toContainText('Sản phẩm thử nghiệm giao diện');
      await expect(page.locator('#orderDetailClose')).toBeFocused();

      // The details dialog must contain keyboard focus and wrap in both directions.
      await page.keyboard.press('Shift+Tab');
      const orderDialogFocus = await page.locator('#orderDetailBackdrop [role="dialog"]').evaluate(dialog => {
        const selector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(dialog.querySelectorAll(selector)).filter(el =>
          el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[aria-hidden="true"]')
        );
        return { activeIndex: focusable.indexOf(document.activeElement), count: focusable.length };
      });
      expect(orderDialogFocus.count, 'Order dialog should contain keyboard-focusable controls').toBeGreaterThan(0);
      expect(orderDialogFocus.activeIndex, 'Shift+Tab from first control should wrap to last').toBe(orderDialogFocus.count - 1);
      await page.keyboard.press('Tab');
      await expect(page.locator('#orderDetailClose')).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(page.locator('#orderDetailBackdrop')).toBeHidden();
      await expect(page.locator('#orderDetailBackdrop')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('[data-action="view-order-details"]:visible').first()).toBeFocused();
      await page.locator('[data-action="view-order-details"]:visible').first().click();
      await expect(page.locator('#orderDetailBackdrop')).toBeVisible();
      await expect(page.locator('#orderDetailClose')).toBeFocused();
    }, true);
    await captureView('customers', 'customers', async variant => {
      // Reference screen #8: synthetic, client-side search only; mutation endpoints remain blocked.
      await expect(page.getByLabel('Tìm tên, số điện thoại, email hoặc địa chỉ')).toBeVisible();
      await expect(page.locator('#customerSearchStatus')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('.customer-table tbody tr')).toHaveCount(2);
      await expect(page.locator('.customer-avatar')).toHaveCount(2);
      await expect(page.locator('.customer-avatar').nth(0)).toHaveText('KD');
      await expect(page.locator('.customer-avatar').nth(1)).toHaveText('K2');
      await expect(page.locator('.customer-avatar').nth(0)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('.customer-avatar').nth(1)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('#customerSearchStatus')).toContainText('Hiển thị 2 / 2');

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
    await captureView('warranties', 'warranties', async variant => {
      // Screen #10: synthetic, read-only warranty list/filter and accessible issue disclosure.
      await expect(page.locator('.warranty-toolbar')).toBeVisible();
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
    await captureView('settings', 'settings', null, true);
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
    await captureView('backup-restore', 'settings', async () => {
      const section = page.locator('#main .setting').filter({ hasText: 'Sao lưu & khôi phục' });
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      await expect(section.locator('#backupBtn')).toContainText('Tải bản sao lưu JSON');
      await expect(section.locator('#restoreFile')).toHaveAttribute('accept', 'application/json,.json');
      await expect(section).toContainText('có bước xác nhận trước khi thực hiện');
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
    }, false, '.backup-actions');
    await captureView('mobile-more-menu', 'dashboard', async variant => {
      if (variant.viewport.width > 680) return;
      const trigger = page.locator('#mobileMoreTrigger');
      const menu = page.locator('#mobileMorePanel');
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(trigger).toHaveAttribute('aria-controls', 'mobileMorePanel');
      await expect(menu.locator('[role="menuitem"][data-view="warranties"]')).toContainText('Bảo hành / hỗ trợ');
      await expect(menu.locator('[role="menuitem"][data-view="settings"]')).toContainText('Cài đặt & sao lưu');
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
      await expect(page.locator('#main .pagehead h2')).toContainText('Cài đặt & sao lưu');
      await page.locator('[data-view="dashboard"]:visible').first().click();
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    await captureView('dashboard-activity', 'dashboard', async () => {
      await page.locator('#main .panel').last().scrollIntoViewIfNeeded();
    });
    await captureView('notifications', 'dashboard', async variant => {
      const toggle = page.locator('#notificationToggle');
      const panel = page.locator('#notificationPanel');
      await toggle.click();
      await expect(panel).toBeVisible();
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
