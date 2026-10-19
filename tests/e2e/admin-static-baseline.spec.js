import { test, expect } from '@playwright/test';

const localAdminUrl = process.env.LOCAL_ADMIN_URL || 'http://127.0.0.1:4173/admin/';

test('captures real local ADMIN login baselines in mobile light/dark and desktop', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));

  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(localAdminUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  expect(response?.status(), 'Local static ADMIN page should load').toBe(200);
  await expect(page.locator('#loginView')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await expect(page.locator('#appView')).toBeHidden();

  const lightMetrics = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    theme: document.documentElement.dataset.adminTheme || null,
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  }));
  await page.screenshot({ path: testInfo.outputPath('admin-login__390x844__light.png'), fullPage: true });

  const themeButton = page.locator('#adminThemeToggle');
  await expect(themeButton).toBeVisible();
  await themeButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'dark');
  const darkMetrics = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    theme: document.documentElement.dataset.adminTheme || null,
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  }));
  await page.screenshot({ path: testInfo.outputPath('admin-login__390x844__dark.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('admin-login__1440x900__dark.png'), fullPage: true });
  const desktopMetrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  }));

  const metadata = {
    test: 'local-static-admin-baseline',
    sourceCommit: process.env.GITHUB_SHA || null,
    capturedAt: new Date().toISOString(),
    route: new URL(localAdminUrl).pathname,
    screenshots: [
      'admin-login__390x844__light.png',
      'admin-login__390x844__dark.png',
      'admin-login__1440x900__dark.png'
    ],
    metrics: { light: lightMetrics, dark: darkMetrics, desktop: desktopMetrics },
    pageErrors
  };
  await testInfo.attach('admin-baseline-metadata.json', {
    body: Buffer.from(JSON.stringify(metadata, null, 2)),
    contentType: 'application/json'
  });

  expect(lightMetrics.lang).toBe('vi');
  expect(lightMetrics.horizontalOverflow, 'Light mobile login should not overflow horizontally').toBe(false);
  expect(darkMetrics.horizontalOverflow, 'Dark mobile login should not overflow horizontally').toBe(false);
  expect(desktopMetrics.horizontalOverflow, 'Desktop login should not overflow horizontally').toBe(false);
  expect(pageErrors, 'The ADMIN login page should not throw browser runtime errors').toEqual([]);
});
