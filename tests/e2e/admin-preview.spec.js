import { test, expect } from '@playwright/test';

const adminUrl = process.env.ADMIN_TEST_URL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;

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

async function logPageDiagnostics(page, label, response) {
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

  const safeDetails = {
    label,
    pageUrl: safeUrl(page.url()),
    navigationStatus: response?.status() ?? null,
    navigationStatusText: response?.statusText() ?? null,
    ...details,
    bodyText: redact(details.bodyText),
    headingText: (details.headingText || []).map(redact)
  };
  console.error(`[ADMIN_PREVIEW_DIAGNOSTICS] ${JSON.stringify(safeDetails)}`);
  return safeDetails;
}

async function openLoginPage(page, testInfo) {
  if (!adminUrl) throw new Error('Missing GitHub Actions secret ADMIN_TEST_URL.');
  let response;
  try {
    response = await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    await logPageDiagnostics(page, 'navigation-error', response).catch(() => {});
    throw new Error(`Could not open ADMIN_TEST_URL (${safeUrl(adminUrl)}): ${error.message}`);
  }

  try {
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 6_000 });
    await expect(page.locator('#loginForm')).toBeVisible();
    return response;
  } catch (error) {
    const details = await logPageDiagnostics(page, 'expected-login-markup-missing', response);
    await testInfo.attach('admin-preview-diagnostics.json', {
      body: Buffer.from(JSON.stringify(details, null, 2)),
      contentType: 'application/json'
    });
    throw new Error(
      `Preview opened at ${safeUrl(page.url())}, but the expected ADMIN login markup was missing. ` +
      `See [ADMIN_PREVIEW_DIAGNOSTICS] in the job log and the attached safe diagnostics. ${error.message}`
    );
  }
}

test.describe('SinDarealest2 Admin Preview', () => {
  test('opens the admin login page without exposing protected content', async ({ page }, testInfo) => {
    await openLoginPage(page, testInfo);
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#appView')).toBeHidden();
  });

  test('logs in once and verifies the admin dashboard', async ({ page }, testInfo) => {
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

    await openLoginPage(page, testInfo);
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
});
