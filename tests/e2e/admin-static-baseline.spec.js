import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.pathname !== '/api/admin/session') {
      failedRequests.push({ url: url.origin + url.pathname, error: (request.failure()?.errorText || 'failed').slice(0, 180) });
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.status() >= 400 && url.pathname !== '/api/admin/session') {
      httpErrors.push({ url: url.origin + url.pathname, status: response.status() });
    }
  });

  // Keep this a genuine local source-page test without a live backend or
  // business data: only the session check is stubbed to return unauthenticated.
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
  await expect(page.locator('#appView')).toBeHidden();
  await expect(page.locator('#adminThemeToggle')).toBeVisible();

  const metadata = {
    test: 'local-static-admin-baseline',
    sourceCommit: sourceSha,
    capturedAt: new Date().toISOString(),
    route: new URL(localAdminUrl).pathname,
    screenshots: [],
    viewportMatrix,
    metrics: [],
    pageErrors,
    consoleErrors,
    failedRequests,
    httpErrors
  };

  for (const viewport of viewportMatrix) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      const expectedTheme = theme;
      const currentTheme = await page.locator('html').getAttribute('data-admin-theme');
      if (currentTheme !== expectedTheme) {
        await page.locator('#adminThemeToggle').click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-admin-theme', expectedTheme);
      await expect(page.locator('#loginView')).toBeVisible();

      const metrics = await page.evaluate(() => ({
        title: document.title,
        lang: document.documentElement.lang,
        theme: document.documentElement.dataset.adminTheme || null,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      }));
      metadata.metrics.push(metrics);

      const filename = `admin-login__${viewport.width}x${viewport.height}__${theme}.png`;
      await page.screenshot({ path: join(screenshotDir, filename), fullPage: true });
      metadata.screenshots.push(filename);

      expect(metrics.lang, 'ADMIN should declare Vietnamese').toBe('vi');
      expect(metrics.horizontalOverflow, `No horizontal overflow at ${viewport.width}px in ${theme} mode`).toBe(false);
    }
  }

  metadata.pageErrors = pageErrors;
  metadata.consoleErrors = consoleErrors;
  metadata.failedRequests = failedRequests;
  metadata.httpErrors = httpErrors;
  writeFileSync(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');

  expect(pageErrors, 'ADMIN source should not throw browser runtime errors').toEqual([]);
});
