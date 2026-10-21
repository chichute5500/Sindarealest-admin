import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const adminUrl = process.env.ADMIN_TEST_URL;
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
  if (!adminUrl) throw new Error('Missing GitHub Actions secret ADMIN_TEST_URL.');
  // Log only the origin/path (safeUrl removes query and hash) so we can verify the Preview target without exposing tokens.
  console.info(`[ADMIN_PREVIEW_TARGET] ${safeUrl(adminUrl)}`);
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
    if (opened.type === 'blocked') test.skip(true, 'BLOCKED: Cloudflare Access requires a separately authorized test path.');
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
    if (opened.type === 'blocked') test.skip(true, 'BLOCKED: Cloudflare Access requires a separately authorized test path.');
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
});
