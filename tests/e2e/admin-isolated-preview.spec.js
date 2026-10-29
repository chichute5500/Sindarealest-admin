import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const adminUrl = process.env.ADMIN_TEST_URL || 'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/';
const approvedAdminPreviewHosts = new Set([
  'feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev',
  'admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev'
]);
const adminPassword = process.env.ADMIN_TEST_PASSWORD;
const accessClientId = process.env.CF_ACCESS_CLIENT_ID;
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
const commitKey = (process.env.GITHUB_SHA || 'local').slice(0, 12);
const evidenceDir = join(process.cwd(), 'artifacts', 'admin-preview-evidence', commitKey);

function safeUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[unparseable URL]';
  }
}

function redact(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
    .replace(/(?:\+?84|0)\d[\d\s().-]{7,}\d/g, '[phone redacted]')
    .replace(/\b\d{7,}\b/g, '[number redacted]')
    .slice(0, 700);
}

async function readPageDiagnostics(page, label, response) {
  const details = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang || null,
    readyState: document.readyState,
    hasLoginView: Boolean(document.querySelector('#loginView')),
    hasLoginForm: Boolean(document.querySelector('#loginForm')),
    hasPassword: Boolean(document.querySelector('#password')),
    hasAppView: Boolean(document.querySelector('#appView')),
    forms: [...document.forms].slice(0, 8).map(form => ({
      id: form.id || null,
      role: form.getAttribute('role'),
      actionPath: (() => {
        try { return new URL(form.action, location.href).pathname; }
        catch { return null; }
      })()
    })),
    headingText: [...document.querySelectorAll('h1,h2')].slice(0, 6).map(el => el.innerText.trim()).filter(Boolean),
    bodyText: document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 900) || '',
    documentUrl: `${location.origin}${location.pathname}`,
    contentType: document.contentType
  })).catch(error => ({ evaluationError: String(error) }));

  return {
    label,
    pageUrl: safeUrl(page.url()),
    navigationStatus: response?.status() ?? null,
    navigationStatusText: response?.statusText() ?? null,
    ...details,
    bodyText: redact(details.bodyText),
    headingText: (details.headingText || []).map(redact)
  };
}

function isCloudflareAccessGate(page, details) {
  let hostname = '';
  try { hostname = new URL(page.url()).hostname.toLowerCase(); } catch {}
  return (details.title || '').toLowerCase().includes('cloudflare access')
    || hostname.endsWith('.cloudflareaccess.com')
    || (details.documentUrl || '').includes('/cdn-cgi/access/login/');
}

async function openLoginPage(page, testInfo) {
  if (!adminUrl) throw new Error('ADMIN_TEST_URL is not configured for the isolated Admin Preview.');
  // Log only the origin/path (safeUrl removes query and hash) so we can verify the Preview target without exposing tokens.
  let previewTargetLabel = 'invalid-url';
  try {
    const previewTargetUrl = new URL(adminUrl);
    if (
      previewTargetUrl.protocol !== 'https:' ||
      !approvedAdminPreviewHosts.has(previewTargetUrl.hostname) ||
      previewTargetUrl.pathname !== '/admin/'
    ) {
      throw new Error('unsafe Preview target');
    }
    previewTargetLabel = `host=${previewTargetUrl.hostname} path=${previewTargetUrl.pathname}`;
  } catch {
    throw new Error('Refusing to run ADMIN Preview tests outside the dedicated isolated Pages project.');
  }
  // Log only the non-secret hostname/path: GitHub otherwise masks the whole URL secret as ***.
  console.info(`[ADMIN_PREVIEW_TARGET] ${previewTargetLabel}`);
  // Optional Cloudflare Access service-token headers; values are never logged or attached.
  if (accessClientId && accessClientSecret) {
    await page.setExtraHTTPHeaders({
      'CF-Access-Client-Id': accessClientId,
      'CF-Access-Client-Secret': accessClientSecret
    });
  }
  let response;
  try {
    response = await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    const details = await readPageDiagnostics(page, 'navigation-error', response).catch(() => ({}));
    console.error(`[ADMIN_PREVIEW_DIAGNOSTICS] ${JSON.stringify(details)}`);
    throw new Error(`Could not open ADMIN_TEST_URL (${safeUrl(adminUrl)}): ${error.message}`);
  }

  // Cloudflare Access is a separate authentication boundary. Do not submit the
  // ADMIN password to it, automate email-code verification, or try to bypass it.
  const initial = await readPageDiagnostics(page, 'initial-page', response);
  if (isCloudflareAccessGate(page, initial)) {
    const blocked = {
      status: 'BLOCKED_CLOUDFLARE_ACCESS',
      message: 'Preview is protected by Cloudflare Access. ADMIN smoke tests require an authorized test route or an explicitly configured Access service token.',
      page: initial
    };
    console.warn(`[ADMIN_PREVIEW_BLOCKED] ${JSON.stringify(blocked)}`);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'preview-diagnostics.json'), JSON.stringify(blocked, null, 2));
    await testInfo.attach('admin-preview-blocked-cloudflare-access.json', {
      body: Buffer.from(JSON.stringify(blocked, null, 2)),
      contentType: 'application/json'
    });
    testInfo.annotations.push({
      type: 'blocked',
      description: 'Cloudflare Access stopped the browser before the ADMIN login page. Authentication was not bypassed.'
    });
    return { type: 'blocked', details: blocked };
  }

  try {
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 6_000 });
    await expect(page.locator('#loginForm')).toBeVisible();
    return { type: 'admin', response, details: initial };
  } catch (error) {
    const details = await readPageDiagnostics(page, 'expected-login-markup-missing', response);
    console.error(`[ADMIN_PREVIEW_DIAGNOSTICS] ${JSON.stringify(details)}`);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'preview-diagnostics.json'), JSON.stringify(details, null, 2));
    await testInfo.attach('admin-preview-diagnostics.json', {
      body: Buffer.from(JSON.stringify(details, null, 2)),
      contentType: 'application/json'
    });
    throw new Error(
      `Preview opened at ${safeUrl(page.url())}, but the expected ADMIN login markup was missing. ` +
      `See [ADMIN_PREVIEW_DIAGNOSTICS] in the job log and attached diagnostics. ${error.message}`
    );
  }
}

test.describe('SinDarealest2 Admin Preview', () => {
  test('opens the admin login page without exposing protected content', async ({ page }, testInfo) => {
    const opened = await openLoginPage(page, testInfo);
    if (opened.type === 'blocked') {
      throw new Error('BLOCKED_CLOUDFLARE_ACCESS: Preview diagnostics were saved, but the remote smoke test cannot reach the ADMIN login page. Use an authorized Access test path; do not bypass Access.');
    }
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#appView')).toBeHidden();
    // Record a safe CSS signature before failing: this distinguishes an old deployment
    // missing the ADMIN override from a selector/state cascade issue in the deployed DOM.
    const loginCssSignature = await page.evaluate(() => {
      const brand = document.querySelector('.topbar > .brand');
      const login = document.querySelector('#loginView');
      const hideSelector = 'body:has(#loginView:not(.hidden)) .topbar>.brand';
      // CSSOM normalizes whitespace around combinators, so compare parsed selectors
      // rather than raw cssText substrings. This avoids misclassifying a valid rule
      // as absent merely because the browser serializes ".topbar > .brand".
      const normalizeSelector = value => String(value || '')
        .replace(/\s*([>+~])\s*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedHideSelector = normalizeSelector(hideSelector);
      // A CSSStyleRule.selectorText may contain a comma-separated selector list.
      // Split only on top-level commas, preserving commas nested inside :is(), :has(),
      // attribute selectors, or quoted values.
      const splitSelectorList = value => {
        const selectors = [];
        let current = '';
        let nesting = 0;
        let quote = '';
        let escaped = false;
        for (const character of String(value || '')) {
          if (escaped) {
            current += character;
            escaped = false;
            continue;
          }
          if (character.charCodeAt(0) === 92) {
            current += character;
            escaped = true;
            continue;
          }
          if (quote) {
            current += character;
            if (character === quote) quote = '';
            continue;
          }
          if (character === '"' || character === "'") {
            quote = character;
            current += character;
            continue;
          }
          if (character === '(' || character === '[') nesting += 1;
          else if ((character === ')' || character === ']') && nesting > 0) nesting -= 1;
          if (character === ',' && nesting === 0) {
            if (current.trim()) selectors.push(current);
            current = '';
            continue;
          }
          current += character;
        }
        if (current.trim()) selectors.push(current);
        return selectors.map(normalizeSelector);
      };
      const stylesheetSources = [...document.styleSheets].map(sheet => {
        let ruleCount = 0;
        const matchingRules = [];
        try {
          const visit = rules => {
            for (const rule of rules) {
              ruleCount += 1;
              if (typeof rule.selectorText === 'string'
                && splitSelectorList(rule.selectorText).includes(normalizedHideSelector)) {
                matchingRules.push({
                  selector: rule.selectorText,
                  matchedSelector: normalizedHideSelector,
                  display: rule.style?.getPropertyValue('display') || null,
                  displayPriority: rule.style?.getPropertyPriority('display') || null
                });
              }
              if (rule.cssRules) visit(rule.cssRules);
            }
          };
          visit(sheet.cssRules);
        } catch {}
        return {
          href: sheet.href ? (() => { try { const u = new URL(sheet.href); return u.origin + u.pathname; } catch { return '[unparseable stylesheet]'; } })() : '[inline stylesheet]',
          ruleCount,
          hasLoginHideRule: matchingRules.length > 0,
          matchingRules
        };
      });
      let hideSelectorMatchesBrand = false;
      let browserSupportsHideSelector = false;
      try {
        hideSelectorMatchesBrand = Boolean(brand && brand.matches(hideSelector));
        browserSupportsHideSelector = CSS.supports('selector(' + hideSelector + ')');
      } catch {}
      return {
        title: document.title,
        lang: document.documentElement.lang || null,
        loginViewClass: login?.className || null,
        topbarBrandDisplay: brand ? getComputedStyle(brand).display : 'missing',
        topbarBrandVisibility: brand ? getComputedStyle(brand).visibility : 'missing',
        topbarBrandOpacity: brand ? getComputedStyle(brand).opacity : 'missing',
        browserSupportsHideSelector,
        hideSelectorMatchesBrand,
        stylesheetSources
      };
    });
    const previewSignature = {
      status: loginCssSignature.topbarBrandDisplay === 'none'
        ? 'PASS_LOGIN_CSS_SIGNATURE'
        : (loginCssSignature.stylesheetSources.some(source => source.hasLoginHideRule)
          ? 'PREVIEW_CSS_CASCADE_MISMATCH'
          : 'PREVIEW_CSS_SIGNATURE_MISMATCH'),
      checkedAt: new Date().toISOString(),
      ...loginCssSignature
    };
    // Persist the actual remote signature for the branch handoff. This contains
    // CSS/DOM diagnostics only; never includes secret values or credentials.
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'preview-diagnostics.json'), JSON.stringify(previewSignature, null, 2));
    console.info(`[ADMIN_PREVIEW_CSS_SIGNATURE] ${JSON.stringify(previewSignature)}`);
    await testInfo.attach('admin-preview-css-signature.json', {
      body: Buffer.from(JSON.stringify(loginCssSignature, null, 2)),
      contentType: 'application/json'
    });
    await expect(page.locator('.topbar > .brand'), 'Login header should be hidden by the ADMIN login-shell CSS signature').toBeHidden();
    await expect(page.locator('#notificationToggle')).toBeHidden();
    await expect(page.locator('#adminThemeToggle')).toBeVisible();
  });

  test('logs in once and verifies the admin dashboard', async ({ page }, testInfo) => {
    const opened = await openLoginPage(page, testInfo);
    if (opened.type === 'blocked') {
      throw new Error('BLOCKED_CLOUDFLARE_ACCESS: Preview diagnostics were saved, but the remote smoke test cannot reach the ADMIN login page. Use an authorized Access test path; do not bypass Access.');
    }
    if (!adminPassword) throw new Error('Missing GitHub Actions secret ADMIN_TEST_PASSWORD.');

    const serverErrors = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        try {
          serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
        } catch {
          serverErrors.push(String(response.status()));
        }
      }
    });

    await page.locator('#password').fill(adminPassword);
    await page.locator('#loginForm button[type="submit"]').click();

    try {
      await expect(page.locator('#appView')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#logout')).toBeVisible();
    } catch (error) {
      const loginError = redact(await page.locator('#loginError').textContent().catch(() => ''));
      const safeDetails = {
        label: 'login-dashboard-failure',
        pageUrl: safeUrl(page.url()),
        loginError,
        serverErrors: serverErrors.slice(0, 20),
        loginViewExists: await page.locator('#loginView').count().then(Boolean).catch(() => false),
        appViewExists: await page.locator('#appView').count().then(Boolean).catch(() => false)
      };
      console.error(`[ADMIN_PREVIEW_DIAGNOSTICS] ${JSON.stringify(safeDetails)}`);
      await testInfo.attach('admin-preview-login-diagnostics.json', {
        body: Buffer.from(JSON.stringify(safeDetails, null, 2)),
        contentType: 'application/json'
      });
      throw new Error(
        `Admin Preview login/dashboard check failed. ${JSON.stringify(safeDetails)}. ${error.message}`
      );
    }
  });

  test('reads the live product catalog without product writes', async ({ page }, testInfo) => {
    // The remote Preview is slower than the local fixture. Use a bounded diagnostic
    // budget and emit safe stage markers so the next run identifies the exact wait.
    test.setTimeout(90_000);
    const stage = (name, details = {}) => console.info(`[ADMIN_CATALOG_STAGE] ${JSON.stringify({ stage: name, at: new Date().toISOString(), ...details })}`);
    stage('start');
    const opened = await openLoginPage(page, testInfo);
    stage('login-page-opened', { type: opened.type });
    if (opened.type === 'blocked') {
      throw new Error('BLOCKED_CLOUDFLARE_ACCESS: cannot test the live catalog without an authorized Preview path.');
    }
    if (!adminPassword) throw new Error('Missing GitHub Actions secret ADMIN_TEST_PASSWORD.');

    const mutationRequests = [];
    page.on('request', request => {
      let url;
      try { url = new URL(request.url()); } catch { return; }
      if (
        url.pathname.startsWith('/api/admin/products') &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method().toUpperCase())
      ) {
        mutationRequests.push({ method: request.method().toUpperCase(), path: url.pathname });
      }
    });

    const catalogResponsePromise = page.waitForResponse(response => {
      try {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/products'
          && response.request().method().toUpperCase() === 'GET';
      } catch {
        return false;
      }
    }, { timeout: 25_000 });

    stage('login-submit');
    await page.locator('#password').fill(adminPassword);
    await page.locator('#loginForm button[type="submit"]').click();
    await expect(page.locator('#appView')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logout')).toBeVisible();
    stage('dashboard-visible');

    const catalogResponse = await catalogResponsePromise;
    stage('catalog-response-received', { status: catalogResponse.status() });
    expect(catalogResponse.status(), 'authenticated GET /api/admin/products should return 200').toBe(200);
    const payload = await catalogResponse.json();
    expect(Array.isArray(payload.products), 'catalog response should contain a products array').toBe(true);

    const products = payload.products;
    stage('catalog-payload-parsed', { productCount: products.length });
    expect(products.length, 'live product catalog should contain more than one UI page').toBeGreaterThan(12);
    expect(products.every(product =>
      product && typeof product.id === 'string' &&
      typeof product.title === 'string' &&
      typeof product.sku === 'string'
    ), 'products should include stable IDs, titles and SKUs').toBe(true);

    const target = products.find(product =>
      product.id && product.sku && product.category &&
      typeof product.published === 'boolean'
    );
    expect(target, 'catalog should include at least one editable product with category and publish state').toBeTruthy();

    const imageProduct = products.find(product =>
      product.id && product.sku &&
      Array.isArray(product.images) &&
      typeof product.images[0] === 'string' &&
      product.images[0].trim()
    ) || null;
    const imageUrls = products.flatMap(product =>
      (Array.isArray(product.images) ? product.images : [])
        .filter(value => typeof value === 'string' && value.trim())
    );
    const imageUrlKinds = {
      absolute: imageUrls.filter(value => /^https?:\/\//i.test(value)).length,
      rooted: imageUrls.filter(value => value.startsWith('/')).length,
      inlineOrBlob: imageUrls.filter(value => /^(?:data:image\/|blob:)/i.test(value)).length,
      relative: imageUrls.filter(value =>
        !/^(?:https?:\/\/|\/|data:image\/|blob:)/i.test(value)
      ).length
    };

    stage('opening-products-view');
    await page.locator('[data-view="products"]').first().click();
    await expect(page.locator('#searchBox')).toBeVisible();
    stage('products-view-visible');
    const rows = page.locator('.tablewrap table tbody tr');
    await expect(rows, 'product list should show 12 items on the first page').toHaveCount(12);
    await expect(page.locator('.pagination .pageactions span')).toContainText('1/');
    await expect(page.locator('#next')).toBeEnabled();
    stage('pagination-first-page-verified');
    await page.locator('#next').click();
    await expect(page.locator('.pagination .pageactions span')).toContainText('2/');
    await expect(rows).toHaveCount(12);
    await page.locator('#prev').click();
    await expect(page.locator('.pagination .pageactions span')).toContainText('1/');

    stage('pagination-verified');
    await page.locator('#searchBox').fill(target.sku);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(target.sku);
    await page.locator('#categoryBox').selectOption(target.category);
    await expect(rows).toHaveCount(1);
    let publicationFilterState = 'NOT_PRESENT_IN_DEPLOYED_UI';
    const publicationFilter = page.locator(
      '[data-published-filter="' + (target.published ? 'published' : 'hidden') + '"]'
    );
    if (await publicationFilter.count()) {
      await publicationFilter.click();
      await expect(rows).toHaveCount(1);
      publicationFilterState = 'PASS';
    }

    stage('search-and-category-filter-verified');
    await page.locator('#categoryBox').selectOption('all');
    await page.locator('#searchBox').fill('');
    await expect(rows).toHaveCount(12);

    let imageState = { checked: false, reason: 'no-product-image-url-in-live-catalog' };
    if (imageProduct) {
      await page.locator('#searchBox').fill(imageProduct.sku);
      await expect(rows).toHaveCount(1);
      const thumbnails = rows.first().locator('img.thumb');
      await expect(thumbnails, 'product with a persisted image URL should render a thumbnail').toHaveCount(1);
      imageState = await thumbnails.evaluateAll(async images => {
        const image = images[0];
        image.loading = 'eager';
        const decode = await Promise.race([
          image.decode().then(() => ({ decoded: true })).catch(() => ({ decoded: false })),
          new Promise(resolve => setTimeout(() => resolve({ decoded: false, timeout: true }), 6_000))
        ]);
        let currentOriginMatches = false;
        try { currentOriginMatches = new URL(image.currentSrc).origin === location.origin; } catch {}
        return {
          checked: true,
          decoded: decode.decoded,
          timedOut: Boolean(decode.timeout),
          naturalWidthPositive: image.naturalWidth > 0,
          currentOriginMatches
        };
      });
    }

    stage('image-check-finished', { checked: imageState.checked, decoded: imageState.decoded ?? null });
    await page.locator('#categoryBox').selectOption('all');
    await page.locator('#searchBox').fill(target.sku);
    await expect(rows).toHaveCount(1);
    stage('opening-product-editor');
    // Product rows open the editor on row activation; no separate edit button is rendered.
    await rows.first().locator('.prodname').click();
    stage('product-editor-click-completed');
    await expect(page.locator('#backdrop')).toBeVisible();
    await expect(page.locator('#pId')).toHaveValue(target.id);
    await expect(page.locator('#pTitle')).toHaveValue(target.title);
    stage('product-editor-verified');

    stage('read-only-admin-routes-start');
    // Exercise only authenticated GET endpoints used by existing Admin modules.
    // Response bodies remain in-page; evidence stores status/schema/counts only, never business values.
    const adminReadOnlyMutations = [];
    page.on('request', request => {
      let url;
      try { url = new URL(request.url()); } catch { return; }
      if (
        url.origin === new URL(adminUrl).origin &&
        url.pathname.startsWith('/api/admin/') &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method().toUpperCase())
      ) {
        adminReadOnlyMutations.push({ method: request.method().toUpperCase(), path: url.pathname });
      }
    });
    const adminReadOnlyRoutes = await page.evaluate(async () => {
      const routes = [
        { path: '/api/admin/session', fields: ['ok', 'authenticated'], fieldTypes: { ok: 'boolean', authenticated: 'boolean' }, expected: { ok: true, authenticated: true } },
        { path: '/api/admin/orders', arrays: ['orders'] },
        { path: '/api/admin/customers', arrays: ['customers'] },
        { path: '/api/admin/warranties', arrays: ['claims', 'warranties'] },
        { path: '/api/admin/audit-logs', arrays: ['logs'] },
        { path: '/api/admin/settings', fields: ['showPrices', 'welcomeEnabled'], fieldTypes: { showPrices: 'boolean', welcomeEnabled: 'boolean' } },
        { path: '/api/admin/payment-qr', fields: ['active', 'bankName', 'accountNumber', 'accountName'], fieldTypes: { active: 'boolean', bankName: 'string', accountNumber: 'string', accountName: 'string' } }
      ];
      const checks = [];
      // Sequential fetches allow the ADMIN session-rotation middleware to settle between requests.
      for (const route of routes) {
        try {
          const response = await fetch(route.path, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
          });
          const contentType = response.headers.get('content-type') || '';
          let payload = null;
          try { payload = await response.json(); } catch {}
          const isObject = Boolean(payload && typeof payload === 'object' && !Array.isArray(payload));
          const arrays = Object.fromEntries((route.arrays || []).map(key => [
            key,
            Array.isArray(payload?.[key]) ? payload[key].length : null
          ]));
          const requiredFieldsPresent = (route.fields || []).every(key =>
            isObject && Object.prototype.hasOwnProperty.call(payload, key)
          );
          const fieldTypesMatch = Object.entries(route.fieldTypes || {}).every(([key, type]) =>
            typeof payload?.[key] === type
          );
          const expectedValuesMatch = Object.entries(route.expected || {}).every(([key, value]) =>
            payload?.[key] === value
          );
          const arraysValid = Object.values(arrays).every(count => count !== null);
          checks.push({
            path: route.path,
            status: response.status,
            jsonObject: isObject && contentType.includes('application/json'),
            responseKeys: isObject ? Object.keys(payload).sort() : [],
            arrayCounts: arrays,
            requiredFieldsPresent,
            fieldTypesMatch,
            expectedValuesMatch,
            arraysValid,
            pass: response.status === 200 && isObject &&
              contentType.includes('application/json') && requiredFieldsPresent &&
              fieldTypesMatch && expectedValuesMatch && arraysValid
          });
        } catch (error) {
          checks.push({
            path: route.path,
            status: null,
            jsonObject: false,
            responseKeys: [],
            arrayCounts: {},
            requiredFieldsPresent: false,
            fieldTypesMatch: false,
            expectedValuesMatch: false,
            arraysValid: false,
            errorType: error?.name || 'Error',
            pass: false
          });
        }
      }
      return checks;
    });
    const adminReadOnlyRouteEvidence = {
      routes: adminReadOnlyRoutes,
      nonReadOnlyRequests: adminReadOnlyMutations,
      scope: 'AUTHENTICATED LIVE PREVIEW; ADMIN GET ROUTES ONLY; RESPONSE VALUES NOT RECORDED'
    };
    await testInfo.attach('admin-live-read-only-routes.json', {
      body: Buffer.from(JSON.stringify(adminReadOnlyRouteEvidence, null, 2)),
      contentType: 'application/json'
    });
    console.info('[ADMIN_READ_ONLY_API_ROUTES] ' + JSON.stringify(adminReadOnlyRouteEvidence));
    expect(adminReadOnlyMutations, 'read-only route audit must not issue mutating ADMIN requests').toEqual([]);
    for (const route of adminReadOnlyRoutes) {
      expect(route.status, `${route.path} should return authenticated HTTP 200`).toBe(200);
      expect(route.pass, `${route.path} should return its expected JSON shape`).toBe(true);
    }

    const safeEvidence = {
      sourceCommit: commitKey,
      catalogCount: products.length,
      productsWithImages: products.filter(product =>
        Array.isArray(product.images) && product.images.some(value => typeof value === 'string' && value.trim())
      ).length,
      totalPersistedImageUrls: imageUrls.length,
      imageUrlKinds,
      imageState,
      firstPageRows: 12,
      paginationVisited: ['1', '2', '1'],
      searchAndCategoryFilter: 'PASS',
      publicationFilter: publicationFilterState,
      detailEditorLoaded: true,
      productMutationRequests: mutationRequests,
      adminReadOnlyRoutes: adminReadOnlyRouteEvidence.routes.map(route => ({ path: route.path, status: route.status, pass: route.pass, arrayCounts: route.arrayCounts, responseKeys: route.responseKeys })),
      adminReadOnlyMutations: adminReadOnlyRouteEvidence.nonReadOnlyRequests,
      scope: 'AUTHENTICATED LIVE PREVIEW; READ-ONLY PRODUCT + ADMIN GET API/UI'
    };
    await testInfo.attach('admin-live-product-read-only-evidence.json', {
      body: Buffer.from(JSON.stringify(safeEvidence, null, 2)),
      contentType: 'application/json'
    });
    console.info('[ADMIN_LIVE_PRODUCT_READ_ONLY] ' + JSON.stringify(safeEvidence));

    expect(mutationRequests, 'read-only catalog QA must not submit product POST/PUT/DELETE requests').toEqual([]);
    if (imageState.checked) {
      expect(imageState.decoded && imageState.naturalWidthPositive,
        'the first persisted product image URL should resolve and decode in the live product list').toBe(true);
    }
  });
});
