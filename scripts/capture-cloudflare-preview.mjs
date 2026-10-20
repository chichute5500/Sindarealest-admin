import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const requested = process.env.PREVIEW_URL || 'https://3ed49bcc.sindarealest2.pages.dev/';
const allowedHost = /^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i;
let previewUrl;
try {
  previewUrl = new URL(requested);
  if (previewUrl.protocol !== 'https:' || !allowedHost.test(previewUrl.hostname)
      || previewUrl.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || previewUrl.username || previewUrl.password || previewUrl.search || previewUrl.hash
      || (previewUrl.pathname !== '/' && previewUrl.pathname !== '')) {
    throw new Error('Refused URL: use an HTTPS non-production alias under sindarealest2.pages.dev with no credentials, query, fragment, or custom path.');
  }
  previewUrl.pathname = '/';
} catch (error) {
  console.error(error.message || String(error));
  process.exit(2);
}
const origin = previewUrl.origin;
const outputDir = path.join(process.cwd(), 'artifacts', 'liquid-glass-preview', 'live-preview');
const viewports = [
  { name: 'mobile-320', width: 320, height: 720 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const audit = {
  sourceKind: 'cloudflare-pages-preview-live-read-only',
  previewUrl: previewUrl.href,
  startedAtUtc: new Date().toISOString(),
  captureCompleted: false,
  accessBlocked: false,
  accessBlockReason: null,
  passed: false,
  screenshots: [],
  viewportAudits: [],
  themeChecks: [],
  routeChecks: [],
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
  failedRequests: [],
  blockedExternalRequests: [],
  readOnlyViolations: [],
  hardFailures: [],
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

function accessGate(url, status, title, body) {
  const u = new URL(url);
  return status === 401 || status === 403 || u.pathname.startsWith('/cdn-cgi/access/login')
    || /login_required|cloudflare access|sign in to continue|access denied/i.test((title || '') + '\n' + (body || ''));
}
async function makePage(browser, viewport, theme, label) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  await context.addInitScript((mode) => {
    try { localStorage.setItem('sd-theme-mode', mode); } catch {}
  }, theme);
  await context.route('**/*', async (route) => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch { return route.abort(); }
    if (u.origin !== origin) {
      audit.blockedExternalRequests.push({ context: label, method: req.method(), url: req.url(), type: req.resourceType() });
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(req.method().toUpperCase())) {
      audit.readOnlyViolations.push({ context: label, method: req.method(), url: req.url(), note: 'Blocked before reaching the Preview.' });
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('console', (msg) => { if (msg.type() === 'error') audit.consoleErrors.push({ context: label, message: msg.text(), url: msg.location()?.url || '' }); });
  page.on('pageerror', (error) => audit.pageErrors.push({ context: label, message: error.message }));
  page.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) audit.httpErrors.push({ context: label, status: res.status(), method: res.request().method(), url: res.url() });
  });
  page.on('requestfailed', (req) => {
    let u; try { u = new URL(req.url()); } catch { return; }
    if (u.origin === origin && ['GET', 'HEAD'].includes(req.method().toUpperCase()) && !String(req.failure()?.errorText || '').includes('ERR_ABORTED')) {
      audit.failedRequests.push({ context: label, method: req.method(), url: req.url(), reason: req.failure()?.errorText || 'unknown' });
    }
  });
  return { context, page };
}
async function navigate(page, url) {
  let response = null;
  try { response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
  catch (error) { audit.hardFailures.push('Navigation failed for ' + url + ': ' + String(error.message || error)); }
  if (!response) return { response: null, blocked: false, status: null, title: '', url: page.url(), bodyText: '' };
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => ({ title: document.title || '', url: location.href, bodyText: (document.body?.innerText || '').slice(0, 12000) }))
    .catch(() => ({ title: '', url: page.url(), bodyText: '' }));
  const blocked = accessGate(info.url, response.status(), info.title, info.bodyText);
  if (blocked) {
    audit.accessBlocked = true;
    audit.accessBlockReason = 'Cloudflare Access or login_required detected; no screenshot can be saved as a baseline.';
    audit.hardFailures.push('Access gate detected at ' + info.url);
  }
  return { response, blocked, status: response.status(), ...info };
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    const step = Math.max(260, Math.floor(window.innerHeight * 0.65));
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 55));
    }
    window.scrollTo(0, 0);
    await Promise.all(Array.from(document.images, (img) => new Promise((resolve) => {
      if (img.complete) return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
      const timer = setTimeout(finish, 4500);
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
    })));
  });
  await page.waitForTimeout(160);
}
async function capture(page, filename, fullPage, meta) {
  await page.screenshot({ path: path.join(outputDir, filename), type: 'png', fullPage, animations: 'disabled', timeout: 30000 });
  audit.screenshots.push({ filename, fullPage, ...meta });
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  for (const item of await fs.readdir(outputDir, { withFileTypes: true })) {
    if (item.isFile() && /\.(png|json|html)$/i.test(item.name)) await fs.unlink(path.join(outputDir, item.name));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      for (const viewport of viewports) {
        if (audit.accessBlocked) break;
        const label = viewport.name + '-' + theme;
        const { context, page } = await makePage(browser, viewport, theme, label);
        try {
          const result = await navigate(page, previewUrl.href);
          if (result.blocked) break;
          if (!result.response) continue;
          const metrics = await page.evaluate(() => ({
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            title: document.title,
            rootDark: document.documentElement.classList.contains('dark'),
            savedThemeMode: (() => { try { return localStorage.getItem('sd-theme-mode'); } catch { return null; } })(),
          }));
          audit.viewportAudits.push({ theme, viewport: viewport.name, width: viewport.width, height: viewport.height, status: result.status, ...metrics });
          audit.themeChecks.push({
            context: label, requestedTheme: theme, savedThemeMode: metrics.savedThemeMode, rootDark: metrics.rootDark,
            themeMatches: theme === 'dark' ? metrics.rootDark : !metrics.rootDark,
          });
          if (viewport.name === 'mobile-390') {
            const splash = page.locator('#welcomeSplash');
            if (await splash.count().catch(() => 0) && await splash.isVisible().catch(() => false)) {
              const splashName = 'welcome-splash-' + theme + '.png';
              await capture(splash, splashName, false, { route: '/', theme, viewport: viewport.name, viewportWidth: viewport.width, viewportHeight: viewport.height, captureType: 'welcome-splash' });
              await page.evaluate(() => window.__sdDismissWelcome?.()).catch(() => {});
              await page.waitForFunction(() => !document.querySelector('#welcomeSplash') || getComputedStyle(document.querySelector('#welcomeSplash')).display === 'none', null, { timeout: 3000 }).catch(() => {});
            }
          }
          await settle(page);
          await capture(page, viewport.name + '-' + theme + '-viewport.png', false, {
            route: '/', theme, viewport: viewport.name, viewportWidth: viewport.width, viewportHeight: viewport.height, captureType: 'viewport',
          });
          if (viewport.name === 'mobile-390' || viewport.name === 'desktop-1366') {
            await capture(page, viewport.name + '-' + theme + '-full.png', true, {
              route: '/', theme, viewport: viewport.name, viewportWidth: viewport.width, viewportHeight: viewport.height, captureType: 'full-page',
            });
          }
        } catch (error) {
          audit.hardFailures.push('Capture failed for ' + label + ': ' + String(error.message || error));
        } finally {
          await context.close();
        }
      }
    }
    if (!audit.accessBlocked && audit.screenshots.some((shot) => shot.captureType === 'viewport')) {
      const { context, page } = await makePage(browser, { width: 390, height: 844 }, 'light', 'product-route-probes');
      try {
        for (const routePath of ['/san-pham/sd2929', '/sanpham/giaytay/sd2929']) {
          const url = new URL(routePath, origin).href;
          const result = await navigate(page, url);
          audit.routeChecks.push({
            path: routePath, url, status: result.status, finalUrl: result.url || page.url(), title: result.title || '',
            accessBlocked: result.blocked,
            note: routePath.startsWith('/sanpham/') ? 'Probe only; route mapping not presumed valid.' : 'Legacy route probe; no state mutation.',
          });
          if (result.blocked) break;
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }

  audit.responsiveOverflowCount = audit.viewportAudits.filter((item) => item.horizontalOverflow).length;
  audit.captureCompleted = !audit.accessBlocked && audit.screenshots.some((item) => item.captureType === 'viewport');
  audit.passed = audit.captureCompleted && audit.responsiveOverflowCount === 0
    && audit.pageErrors.length === 0 && audit.consoleErrors.length === 0 && audit.httpErrors.length === 0
    && audit.failedRequests.length === 0 && audit.readOnlyViolations.length === 0 && audit.hardFailures.length === 0;
  audit.finishedAtUtc = new Date().toISOString();
  audit.summary = {
    screenshotCount: audit.screenshots.length, viewportCount: audit.viewportAudits.length, routeCheckCount: audit.routeChecks.length,
    responsiveOverflowCount: audit.responsiveOverflowCount, consoleErrorCount: audit.consoleErrors.length,
    pageErrorCount: audit.pageErrors.length, httpErrorCount: audit.httpErrors.length, failedRequestCount: audit.failedRequests.length,
    blockedExternalRequestCount: audit.blockedExternalRequests.length, readOnlyViolationCount: audit.readOnlyViolations.length,
    hardFailureCount: audit.hardFailures.length,
  };
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8');
  const imageCards = audit.screenshots.map((shot) => '<figure><figcaption>' + esc(shot.filename) + '</figcaption><a href="' + esc(shot.filename) + '"><img loading="lazy" src="' + esc(shot.filename) + '" alt="' + esc(shot.filename) + '"></a></figure>').join('\n');
  const references = '<section><h2>Original mobile design references</h2><p>The references are multi-screen collages; this side-by-side board aids manual review but does not claim pixel-perfect comparison between unlike layouts.</p><div class="shots"><figure><figcaption>Light reference</figcaption><img src="../reference-images/file_0000000017088207af45f5e6dd90cfa4.png" alt="Light reference"></figure><figure><figcaption>Dark reference</figcaption><img src="../reference-images/file_00000000fcb48207a23aeda23caa5eeb.png" alt="Dark reference"></figure></div></section>';
  const reportHtml = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SinDarealest live Preview audit</title><style>body{font:14px/1.55 system-ui,sans-serif;color:#142a3c;background:#eef6fc;margin:0;padding:18px}main{max-width:1500px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;padding:12px;border-radius:10px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}figure{margin:0;padding:10px;border:1px solid #c5d9e8;border-radius:12px;background:#fff;min-width:0}figure img{width:100%;height:auto;display:block;border-radius:8px}figcaption{overflow-wrap:anywhere;font-size:12px;margin-bottom:6px}</style><main><h1>SinDarealest2 — direct Cloudflare Pages Preview capture</h1><p>Source: ' + esc(audit.previewUrl) + ' · captured: ' + esc(audit.captureCompleted) + ' · audit pass: ' + esc(audit.passed) + '</p><p>This script does not use legacy product fixtures and does not mock API responses. It blocks non-GET/HEAD same-origin requests before they reach the Preview and blocks all external origins. An Access/login gate prevents stage archiving.</p><h2>Summary</h2><pre>' + esc(JSON.stringify(audit.summary, null, 2)) + '</pre><h2>Route probes</h2><pre>' + esc(JSON.stringify(audit.routeChecks, null, 2)) + '</pre>' + references + '<h2>Captured Preview screens</h2><section class="shots">' + imageCards + '</section><h2>Full diagnostics</h2><pre>' + esc(JSON.stringify(audit, null, 2)) + '</pre></main></html>';
  await fs.writeFile(path.join(outputDir, 'report.html'), reportHtml, 'utf8');
  console.log(JSON.stringify({ previewUrl: audit.previewUrl, captureCompleted: audit.captureCompleted, accessBlocked: audit.accessBlocked, passed: audit.passed, summary: audit.summary }, null, 2));
  if (!audit.captureCompleted || audit.accessBlocked) process.exitCode = 1;
}
main().catch(async (error) => {
  audit.hardFailures.push(String(error.stack || error));
  audit.finishedAtUtc = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8').catch(() => {});
  console.error(error.stack || error);
  process.exitCode = 1;
});
