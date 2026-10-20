import { test, expect } from '@playwright/test';

const adminUrl = process.env.ADMIN_TEST_URL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;
const accessClientId = process.env.CF_ACCESS_CLIENT_ID?.trim();
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();

function validatedTarget() {
  if (!adminUrl) throw new Error('Missing GitHub Actions secret ADMIN_TEST_URL.');

  let target;
  try {
    target = new URL(adminUrl);
  } catch {
    throw new Error('ADMIN_TEST_URL must be a valid HTTPS Preview URL.');
  }

  // Only a non-production Cloudflare Pages preview alias is allowed. Never
  // send the Access service token to the production hostname or another site.
  const allowedHost = /^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i;
  const allowedPaths = new Set(['/admin', '/admin/', '/admin/index.html']);
  if (target.protocol !== 'https:'
      || !allowedHost.test(target.hostname)
      || target.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || target.username || target.password || target.search || target.hash
      || !allowedPaths.has(target.pathname)) {
    throw new Error(
      'Refused ADMIN_TEST_URL: only HTTPS /admin, /admin/ or /admin/index.html on a non-production *.sindarealest2.pages.dev Preview alias is allowed.'
    );
  }

  if (Boolean(accessClientId) !== Boolean(accessClientSecret)) {
    throw new Error('Cloudflare Access service authentication requires both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET; secret values are never logged.');
  }

  return target;
}

async function openAdminPreview(page) {
  const target = validatedTarget();

  // Cloudflare Access service credentials are attached only to requests for
  // this exact Preview origin. They are never sent to redirects or third-party
  // resources. If Access is not enabled, the headers are simply omitted.
  if (accessClientId && accessClientSecret) {
    await page.route('**/*', async route => {
      let requestUrl;
      try {
        requestUrl = new URL(route.request().url());
      } catch {
        await route.continue();
        return;
      }

      if (requestUrl.origin !== target.origin) {
        await route.continue();
        return;
      }

      const headers = {
        ...route.request().headers(),
        'cf-access-client-id': accessClientId,
        'cf-access-client-secret': accessClientSecret,
      };
      await route.continue({ headers });
    });
  }

  return page.goto(target.href, { waitUntil: 'domcontentloaded' });
}

async function loginDomDiagnostics(page, response) {
  const finalUrl = new URL(page.url());
  const counts = await Promise.all([
    page.locator('#loginView').count(),
    page.locator('#loginForm').count(),
    page.locator('#password').count(),
    page.locator('#appView').count(),
  ]);
  const title = (await page.title()).replace(/[\\r\\n\\t]/g, ' ').slice(0, 120);
  const possibleAccessGate = /cloudflareaccess|cdn-cgi\\/access/i.test(
    finalUrl.hostname + finalUrl.pathname
  ) || /cloudflare access/i.test(title);

  return [
    'Expected admin login DOM was not found on the Preview page.',
    `HTTP response: ${response?.status() ?? 'no response'}`,
    `Final location (query string removed): ${finalUrl.origin}${finalUrl.pathname}`,
    `Page title: ${title || '(empty)'}`,
    `DOM presence: #loginView=${counts[0] > 0}, #loginForm=${counts[1] > 0}, #password=${counts[2] > 0}, #appView=${counts[3] > 0}`,
    `Cloudflare Access interstitial detected: ${possibleAccessGate}`,
  ].join('\\n');
}

test.describe('SinDarealest2 Admin Preview', () => {
  test('opens the admin login page without exposing protected content', async ({ page }) => {
    const response = await openAdminPreview(page);
    if (await page.locator('#loginView').count() === 0) {
      throw new Error(await loginDomDiagnostics(page, response));
    }

    await expect(page.locator('#loginView')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#appView')).toBeHidden();
  });

  test('logs in once and verifies the admin dashboard', async ({ page }) => {
    if (!adminPassword) throw new Error('Missing GitHub Actions secret ADMIN_TEST_PASSWORD.');

    const serverErrors = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        // Keep diagnostics to status and path only; do not log query strings.
        let path = '(invalid URL)';
        try { path = new URL(response.url()).pathname; } catch {}
        serverErrors.push(`${response.status()} ${path}`);
      }
    });

    const response = await openAdminPreview(page);
    if (await page.locator('#loginForm').count() === 0) {
      throw new Error(await loginDomDiagnostics(page, response));
    }

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
      ].filter(Boolean).join('\\n');
      throw new Error(`Admin Preview login/dashboard check failed.${safeDetails ? `\\n${safeDetails}` : ''}\\n${error.message}`);
    }
  });
});
