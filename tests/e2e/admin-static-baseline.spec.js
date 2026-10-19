import { test, expect } from '@playwright/test';

const localAdminUrl = process.env.LOCAL_ADMIN_URL || 'http://127.0.0.1:4173/admin/';
const viewports = [
  { width: 320, height: 640, label: '320x640' },
  { width: 360, height: 800, label: '360x800' },
  { width: 375, height: 812, label: '375x812' },
  { width: 390, height: 844, label: '390x844' },
  { width: 412, height: 915, label: '412x915' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1280, height: 800, label: '1280x800' },
  { width: 1440, height: 900, label: '1440x900' }
];

test('captures the real source ADMIN login in the requested viewport/theme matrix', async ({ page }, testInfo) => {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const httpErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });
  page.on('requestfailed', request => {
    failedRequests.push({
      method: request.method(),
      path: (() => { try { return new URL(request.url()).pathname; } catch { return '[invalid URL]'; } })(),
      error: (request.failure()?.errorText || 'request failed').slice(0, 180)
    });
  });
  page.on('response', response => {
    if (response.status() >= 400 && response.status() !== 401) {
      httpErrors.push({
        status: response.status(),
        path: (() => { try { return new URL(response.url()).pathname; } catch { return '[invalid URL]'; } })()
      });
    }
  });

  // The source-only server has no Worker APIs. Fulfill the read-only session
  // check as unauthenticated and a tiny service worker so the login UI is tested
  // without connecting to or mutating any backend or live data.
  await page.route('**/api/admin/session', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Unauthenticated test fixture' })
  }));
  await page.route('**/admin-sw.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));"
  }));
  await page.addInitScript(() => {
    try { localStorage.setItem('sd-theme-mode', 'light'); } catch {}
  });

  const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  expect(response?.status(), 'Local static ADMIN source should load').toBe(200);
  await expect(page.locator('#loginView')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await expect(page.locator('#appView')).toBeHidden();

  const matrix = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Capture light mode before toggling. Keep only the known source HTML and
    // CSS under test; never write data or call write APIs.
    await page.evaluate(() => {
      document.documentElement.dataset.adminTheme = 'light';
      try { localStorage.setItem('sd-theme-mode', 'light'); } catch {}
    });
    const light = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      theme: document.documentElement.dataset.adminTheme || null,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    await page.screenshot({
      path: testInfo.outputPath(`admin-login__${viewport.label}__light.png`),
      fullPage: true,
      animations: 'disabled'
    });

    await page.locator('#adminThemeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'dark');
    const dark = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      theme: document.documentElement.dataset.adminTheme || null,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    }));
    await page.screenshot({
      path: testInfo.outputPath(`admin-login__${viewport.label}__dark.png`),
      fullPage: true,
      animations: 'disabled'
    });

    matrix.push({ viewport: `${viewport.width}x${viewport.height}`, light, dark });
    await page.locator('#adminThemeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'light');
  }

  const metadata = {
    test: 'local-static-admin-baseline',
    sourceCommit: process.env.GITHUB_SHA || null,
    capturedAt: new Date().toISOString(),
    route: new URL(localAdminUrl).pathname,
    screenshotCount: viewports.length * 2,
    screenshots: viewports.flatMap(viewport => [
      `admin-login__${viewport.label}__light.png`,
      `admin-login__${viewport.label}__dark.png`
    ]),
    matrix,
    pageErrors,
    consoleErrors: consoleErrors.slice(0, 30),
    failedRequests: failedRequests.slice(0, 30),
    httpErrors: httpErrors.slice(0, 30)
  };
  await testInfo.attach('admin-baseline-metadata.json', {
    body: Buffer.from(JSON.stringify(metadata, null, 2)),
    contentType: 'application/json'
  });

  expect(matrix.every(row => row.light.lang === 'vi' && row.dark.lang === 'vi'),
    'Every viewport must retain Vietnamese document language').toBe(true);
  expect(matrix.every(row => !row.light.horizontalOverflow),
    'Light mode must not overflow horizontally across the viewport matrix').toBe(true);
  expect(matrix.every(row => !row.dark.horizontalOverflow),
    'Dark mode must not overflow horizontally across the viewport matrix').toBe(true);
  expect(pageErrors, 'The ADMIN login page should not throw browser runtime errors').toEqual([]);
  expect(failedRequests, 'The source-only login should not issue failed network requests').toEqual([]);
  expect(httpErrors, 'The source-only login should not have unexpected HTTP errors').toEqual([]);
});
