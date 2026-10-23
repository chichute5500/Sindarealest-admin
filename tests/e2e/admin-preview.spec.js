import { test, expect } from '@playwright/test';

// Keep Admin smoke tests pinned to the dedicated Admin Pages project.
// Do not use ADMIN_TEST_URL: it can point at the storefront/fix Preview.
const adminUrl = 'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/';
const adminPassword = process.env.ADMIN_TEST_PASSWORD;

test.describe('SinDarealest Admin isolated Preview', () => {
  test('opens the Admin login page without exposing protected content', async ({ page }) => {
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#loginView')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#appView')).toBeHidden();
  });

  test('logs in once and verifies the Admin dashboard', async ({ page }) => {
    if (!adminPassword) throw new Error('Missing GitHub Actions secret ADMIN_TEST_PASSWORD.');

    const serverErrors = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });

    await page.goto(adminUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loginForm')).toBeVisible();
    await page.locator('#password').fill(adminPassword);
    await page.locator('#loginForm button[type="submit"]').click();

    try {
      await expect(page.locator('#appView')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#logout')).toBeVisible();
    } catch (error) {
      const loginError = await page.locator('#loginError').textContent().catch(() => '');
      const safeDetails = [
        loginError ? `Admin login message: ${loginError.trim()}` : '',
        serverErrors.length ? `HTTP 5xx responses: ${serverErrors.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      throw new Error(`Admin Preview login/dashboard check failed.${safeDetails ? `\n${safeDetails}` : ''}\n${error.message}`);
    }
  });
});
