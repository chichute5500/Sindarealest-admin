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

  const captureView = async (name, view, prepare, fullPageAtMobileLight = false) => {
    await navigateTo(view);
    for (const variant of variants) {
      await page.setViewportSize(variant.viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await chooseTheme(variant.theme);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (prepare) await prepare(variant);
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

    // Required identity stays visible while the supplementary/pricing/gallery groups change.
    await expect(page.locator('#productEditorTabs')).toHaveAttribute('role', 'tablist');
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pTitle')).toBeVisible();
    await expect(page.locator('#pCategory')).toBeVisible();
    await expect(page.locator('#pSku')).toBeVisible();
    await expect(page.locator('#pPrice')).toBeHidden();
    await page.locator('#productTabPricing').click();
    await expect(page.locator('#productTabPricing')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pTitle')).toBeVisible();
    await expect(page.locator('#pPrice')).toBeVisible();
    await expect(page.locator('#imageDropZone')).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#productTabGallery')).toBeFocused();
    await expect(page.locator('#productTabGallery')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#imageDropZone')).toBeVisible();
    await expect(page.locator('#pPrice')).toBeHidden();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#productTabPricing')).toBeFocused();
    await expect(page.locator('#productTabPricing')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.locator('#productTabDetails')).toBeFocused();
    await expect(page.locator('#productTabDetails')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.locator('#productTabGallery')).toBeFocused();
    await expect(page.locator('#productTabGallery')).toHaveAttribute('aria-selected', 'true');
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

    // Product editor and image gallery are true source components. Only their input data is fixture-only.
    for (const variant of variants) {
      await openEditor(variant);
      await saveScreenshot('product-editor', variant, { dialog: true });
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
      if (variant.viewport.width <= 480) {
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

    await captureView('orders', 'orders', async () => {
      const row = page.locator('[data-order-row="UI-ONLY-ORDER"]');
      await expect(row).toBeVisible();
      await expect(row).toContainText('Chờ xác nhận giá');
      await expect(row).toContainText('Chưa hoàn tất thanh toán');
      await expect(row.locator('[data-action="create-payment-request"]')).toBeDisabled();
      await expect(row.locator('[data-action="record-payment"]')).toBeDisabled();
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
    await captureView('customers', 'customers', null, true);
    await captureView('warranties', 'warranties', async () => {
      // Synthetic, read-only coverage for warranty screen #10. Do not issue a warranty,
      // change a claim, or submit any non-GET request from this fixture.
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

      const status = page.locator('[data-claim-status="UI-ONLY-CLAIM"]');
      const note = page.locator('[data-claim-note="UI-ONLY-CLAIM"]');
      await expect(status).toBeVisible();
      await expect(status).toHaveAttribute('aria-label', 'Trạng thái yêu cầu bảo hành UI-ONLY-CLAIM');
      await expect(note).toBeVisible();
      await expect(note).toHaveAttribute('aria-label', 'Ghi chú quản trị cho yêu cầu bảo hành UI-ONLY-CLAIM');
      await expect(page.getByRole('button', { name: 'Lưu yêu cầu bảo hành UI-ONLY-CLAIM' })).toBeVisible();
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
    }, true);
    await captureView('backup-restore', 'settings', async () => {
      const section = page.locator('#main .setting').filter({ hasText: 'Sao lưu & khôi phục' });
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      await expect(section.locator('#backupBtn')).toContainText('Tải bản sao lưu JSON');
      await expect(section.locator('#restoreFile')).toHaveAttribute('accept', 'application/json,.json');
      await expect(section).toContainText('có bước xác nhận trước khi thực hiện');
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
