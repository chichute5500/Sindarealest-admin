import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sanitizeText, sanitizeUrl } from './sanitize-audit-value.mjs';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const requested = process.env.PREVIEW_URL || 'https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/';
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
let accessHeaders;
try {
  accessHeaders = buildCloudflareAccessHeaders();
} catch (error) {
  console.error(error.message || 'Invalid Cloudflare Access service-token configuration.');
  process.exit(2);
}
const outputDir = path.join(process.cwd(), 'artifacts', 'liquid-glass-preview', 'live-preview');
const firstPaintVideoDir = path.join(outputDir, 'first-paint-videos');
// Required responsive matrix: small mobile, common mobile, tablet, and desktop.
const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
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
  firstPaintChecks: [],
  firstPaintTimelines: [],
  videoCaptures: [],
  viewportAudits: [],
  themeChecks: [],
  routeChecks: [],
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
  failedRequests: [],
  blockedExternalRequests: [],
  allowedExternalReadRequests: [],
  readOnlyViolations: [],
  hardFailures: [],
  contentChecks: [],
  heroImageChecks: [],
  sectionChecks: [],
  commerceStateChecks: [],
  productDetailChecks: [],
  iconStateChecks: [],
  brokenImages: [],
  accessServiceTokenConfigured: Object.keys(accessHeaders).length > 0,
  sourceCommit: process.env.SOURCE_SHA || null,
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

function accessGate(url, status, title, body) {
  const u = new URL(url);
  return status === 401 || status === 403 || u.pathname.startsWith('/cdn-cgi/access/login')
    || /login_required|cloudflare access|sign in to continue|access denied/i.test((title || '') + '\n' + (body || ''));
}
async function makePage(browser, viewport, theme, label, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block',
    ...(options.recordVideo ? { recordVideo: { dir: firstPaintVideoDir, size: { width: viewport.width, height: viewport.height } } } : {}),
  });
  await context.addInitScript((mode) => {
    try { localStorage.setItem('sd-theme-mode', mode); } catch {}
    const timeline = window.__sdWelcomeFirstPaintTimeline = [];
    let lastFingerprint = '';
    const inspect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return { present: false, visible: false };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const onScreen = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
        && rect.left < innerWidth && rect.top < innerHeight;
      const visible = style.display !== 'none' && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0.01 && onScreen;
      return {
        present: true, visible, display: style.display, visibility: style.visibility,
        opacity: style.opacity, zIndex: style.zIndex, position: style.position,
        transform: style.transform, className: typeof element.className === 'string' ? element.className : '',
        ariaHidden: element.getAttribute('aria-hidden'), inert: element.hasAttribute('inert'),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    };
    const sample = (stage) => {
      const body = document.body;
      const nodes = {
        splash: inspect('#welcomeSplash'),
        bottomNav: inspect('#mobileBottomNav'),
        account: inspect('#accountDrawer'),
        cart: inspect('#cartDrawer'),
        checkout: inspect('#checkoutDrawer'),
        checkoutBackdrop: inspect('#checkoutBackdrop'),
      };
      const welcomeActive = Boolean(body?.classList.contains('welcome-active'));
      const welcomeOwnsScreen = welcomeActive || nodes.splash.visible;
      const visibleChrome = nodes.bottomNav.visible || nodes.account.visible || nodes.cart.visible
        || nodes.checkout.visible || nodes.checkoutBackdrop.visible;
      const record = {
        stage, atMs: Number(performance.now().toFixed(2)), readyState: document.readyState,
        bodyClassName: body?.className || '', welcomeActive, welcomeOwnsScreen,
        splashVisible: nodes.splash.visible, nodes,
        // On the homepage startup probe, visible storefront chrome before the splash node exists is also a flash violation.
        violation: visibleChrome && (welcomeOwnsScreen || !nodes.splash.visible),
      };
      const fingerprint = JSON.stringify({
        readyState: record.readyState, bodyClassName: record.bodyClassName, welcomeActive,
        nodes: Object.fromEntries(Object.entries(nodes).map(([key, value]) => [key, {
          present: value.present, visible: value.visible, display: value.display,
          visibility: value.visibility, opacity: value.opacity, transform: value.transform,
          className: value.className, ariaHidden: value.ariaHidden, inert: value.inert,
        }])),
      });
      if (stage !== 'mutation' || fingerprint !== lastFingerprint) {
        if (timeline.length < 240) timeline.push(record);
      }
      lastFingerprint = fingerprint;
      return record;
    };
    window.__sdReadWelcomeFirstPaintState = sample;
    sample('init-script');
    const observer = new MutationObserver(() => sample('mutation'));
    observer.observe(document, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'inert'],
    });
    [0, 16, 50, 100, 200, 300, 450].forEach((offset) => setTimeout(() => sample('timer-' + offset), offset));
    document.addEventListener('DOMContentLoaded', () => sample('DOMContentLoaded'), { once: true });
    window.addEventListener('pageshow', () => sample('pageshow'), { once: true });
    const frameStartMs = performance.now();
    let frame = 0;
    const sampleFrame = () => {
      sample('raf-' + frame);
      frame += 1;
      // Keep sampling through the whole 0–450ms startup window using RAF, not only six
      // frames. App code may delay/cancel page timers; frame timestamps remain evidence,
      // and the matcher still enforces target tolerances and unique samples.
      if (performance.now() - frameStartMs < 460 && frame < 40) requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
  }, theme);
  await context.route('**/*', async (route) => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch { return route.abort(); }
    if (u.origin !== origin) {
      // One narrowly scoped public dependency is permitted for a realistic checkout/address
      // audit: GET-only province/ward lookups. This branch runs before same-origin Access
      // service-token injection below, so Cloudflare credentials never leave the Preview.
      if (isApprovedPreviewExternalRead(req.url(), req.method())) {
        audit.allowedExternalReadRequests.push({
          context: label,
          method: req.method(),
          url: sanitizeUrl(req.url()),
          note: 'Explicit public administrative-division GET allowlist; no Preview Access headers forwarded.',
        });
        return route.continue();
      }
      // All other cross-origin requests are blocked. Access login redirects are classified
      // separately so the audit cannot mistake a gated Preview for a healthy storefront.
      if (req.isNavigationRequest() && u.hostname.toLowerCase().endsWith('.cloudflareaccess.com')) {
        audit.accessBlocked = true;
        audit.accessBlockReason = 'The Preview redirected to a Cloudflare Access sign-in host; the external navigation was blocked and no credentials were entered.';
        audit.hardFailures.push('Cloudflare Access sign-in redirect detected at ' + sanitizeUrl(req.url()));
      }
      audit.blockedExternalRequests.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), type: req.resourceType() });
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(req.method().toUpperCase())) {
      audit.readOnlyViolations.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), note: 'Blocked before reaching the Preview.' });
      return route.abort();
    }
    // Send service-token headers only to the validated Preview origin. Cross-origin
    // destinations are aborted above before these credentials can be attached.
    if (Object.keys(accessHeaders).length > 0) {
      return route.continue({ headers: { ...req.headers(), ...accessHeaders } });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.__sdAuditLabel = label;
  page.setDefaultTimeout(12000);
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const sourceUrl = msg.location()?.url || page.url();
    try { if (new URL(sourceUrl).origin !== origin) return; } catch { return; }
    audit.consoleErrors.push({ context: label, message: sanitizeText(msg.text()), url: sanitizeUrl(sourceUrl) });
  });
  page.on('pageerror', (error) => {
    try { if (new URL(page.url()).origin !== origin) return; } catch { return; }
    audit.pageErrors.push({ context: label, message: sanitizeText(error.message) });
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) audit.httpErrors.push({ context: label, status: res.status(), method: res.request().method(), url: sanitizeUrl(res.url()) });
  });
  page.on('requestfailed', (req) => {
    let u; try { u = new URL(req.url()); } catch { return; }
    if (u.origin === origin && ['GET', 'HEAD'].includes(req.method().toUpperCase()) && !String(req.failure()?.errorText || '').includes('ERR_ABORTED')) {
      audit.failedRequests.push({ context: label, method: req.method(), url: sanitizeUrl(req.url()), reason: sanitizeText(req.failure()?.errorText || 'unknown') });
    }
  });
  return { context, page };
}
async function captureFirstPaintFrames(page, label) {
  const size = page.viewportSize() || {};
  const viewport = viewports.find(item => item.width === size.width && item.height === size.height);
  if (!viewport) return;
  const theme = label.endsWith('-dark') ? 'dark' : 'light';
  // One still frame is retained for human review. The video-only probe below is the
  // authoritative time-resolved evidence; repeated screenshot calls here used to block
  // the Playwright loop long enough for the splash timer to expire.
  const filename = 'first-paint-' + viewport.name + '-' + theme + '-000ms.png';
  const screenshotRequestElapsedMs = Number((await page.evaluate(() => performance.now()).catch(() => 0)).toFixed(2));
  const screenshotStartedAt = Date.now();
  await page.screenshot({ path: path.join(outputDir, filename), type: 'png', fullPage: false, animations: 'disabled', timeout: 30000 });
  const screenshotCallDurationMs = Date.now() - screenshotStartedAt;
  audit.screenshots.push({
    filename, fullPage: false, ...captureMeta(viewport, theme),
    captureType: 'first-paint-frame', state: 'welcome-first-paint',
    requestedOffsetMs: 0, screenshotRequestElapsedMs, screenshotCallDurationMs,
    timingNote: 'Still image captured once; consult the dedicated startup video and init-script timeline for exact early-frame timing.',
  });
  const firstPaintEvidence = audit.firstPaintChecks.some(check =>
    check.viewport === viewport.name && check.theme === theme && check.sample?.splashVisible === true
    && check.sampleOffsetMs >= 0 && check.sampleOffsetMs <= 350);
  if (firstPaintEvidence) {
    audit.sectionChecks.push({
      selector: '#welcomeSplash', filename, status: 'CAPTURED',
      route: new URL(page.url()).pathname, theme, viewport: viewport.name,
      evidence: 'full-viewport first-frame plus dedicated startup video and init-script DOM timeline',
    });
  } else {
    audit.sectionChecks.push({ selector: '#welcomeSplash', filename, status: 'MISSING', route: new URL(page.url()).pathname, theme, viewport: viewport.name });
    audit.hardFailures.push('Welcome splash was not visible in early DOM/video evidence: ' + label);
  }
}
async function captureWelcomeStartupVideo(browser, viewport, theme) {
  const label = 'startup-probe-' + viewport.name + '-' + theme;
  let context = null;
  let page = null;
  let video = null;
  let response = null;
  let probe = null;
  let videoFilename = 'first-paint-videos/welcome-startup-' + viewport.name + '-' + theme + '.webm';
  try {
    ({ context, page } = await makePage(browser, viewport, theme, label, { recordVideo: true }));
    video = page.video();
    response = await page.goto(previewUrl.href, { waitUntil: 'commit', timeout: 45000 });
    if (!response) throw new Error('Navigation returned no main-document response.');
    if (response.status() < 200 || response.status() >= 300) {
      const body = await page.locator('body').innerText().catch(() => '');
      if (accessGate(page.url(), response.status(), await page.title().catch(() => ''), body)) {
        audit.accessBlocked = true;
        audit.accessBlockReason = 'Cloudflare Access gate detected in dedicated first-paint video capture.';
      }
      throw new Error('Homepage returned HTTP ' + response.status() + '.');
    }
    // Let the browser—not screenshot RPCs—record the first 800ms, including the reduced-motion
    // splash lifetime and its transition to the storefront.
    await page.waitForTimeout(850);
    const timeline = await page.evaluate(() => window.__sdWelcomeFirstPaintTimeline || []);
    const initSample = timeline.find(item => item.stage === 'init-script');
    const originMs = Number(initSample?.atMs ?? timeline[0]?.atMs ?? 0);
    const samples = timeline.map(item => ({
      ...item,
      sampleOffsetMs: Number((item.atMs - originMs).toFixed(2)),
    })).filter(item => item.sampleOffsetMs >= 0 && item.sampleOffsetMs <= 450);
    const first350Samples = samples.filter(item => item.sampleOffsetMs <= 350);
    probe = {
      context: label, viewport: viewport.name, theme, mainDocumentStatus: response.status(),
      startedAt: timeline[0]?.atMs ?? null, samples,
      welcomeVisibleWithin350msOfInstrumentation: first350Samples.some(item => item.splashVisible === true),
      visibleChromeViolations: first350Samples.filter(item => item.violation === true).map(item => ({
        stage: item.stage, sampleOffsetMs: item.sampleOffsetMs, nodes: item.nodes,
      })),
    };
    audit.firstPaintTimelines.push(probe);
    if (!probe.welcomeVisibleWithin350msOfInstrumentation) {
      audit.hardFailures.push('Welcome splash was not visible in the startup video / DOM timeline for ' + label + '.');
    }
    if (probe.visibleChromeViolations.length) {
      audit.hardFailures.push('Welcome first-paint layering violation in browser timeline for ' + label
        + ' (' + probe.visibleChromeViolations.length + ' samples).');
    }
    const usedSamples = new Set();
    const usedSampleOffsets = new Set();
    for (const requestedOffsetMs of [0, 50, 100, 200, 300]) {
      // Browser startup work can delay timers and animation frames. Match the closest
      // actual sample on either side of the requested offset, without reusing a sample.
      const toleranceMs = requestedOffsetMs === 0 ? 45 : 125;
      const matching = samples
        .filter(item => Math.abs(item.sampleOffsetMs - requestedOffsetMs) <= toleranceMs
          && !usedSampleOffsets.has(item.sampleOffsetMs))
        .sort((a, b) => {
          if (requestedOffsetMs === 0 && a.splashVisible !== b.splashVisible) return a.splashVisible ? -1 : 1;
          return Math.abs(a.sampleOffsetMs - requestedOffsetMs) - Math.abs(b.sampleOffsetMs - requestedOffsetMs);
        });
      const sample = matching[0] || null;
      if (sample) usedSampleOffsets.add(sample.sampleOffsetMs);
      const check = {
        context: label, viewport: viewport.name, theme, requestedOffsetMs,
        sampleOffsetMs: sample?.sampleOffsetMs ?? null,
        offsetDeltaMs: sample ? Number((sample.sampleOffsetMs - requestedOffsetMs).toFixed(2)) : null,
        toleranceMs,
        status: sample ? 'CAPTURED' : 'FAILED',
        sample: sample || null,
        evidenceSource: 'startup-video init-script timeline',
      };
      audit.firstPaintChecks.push(check);
      if (!sample) {
        audit.hardFailures.push('First-paint DOM timeline missed +' + requestedOffsetMs + 'ms (within ' + toleranceMs + 'ms tolerance) for ' + label + '.');
      }
    }
    return probe;
  } catch (error) {
    const message = sanitizeText(String(error?.message || error));
    audit.hardFailures.push('Dedicated welcome startup video failed for ' + label + ': ' + message);
    audit.videoCaptures.push({
      context: label, viewport: viewport.name, theme, filename: videoFilename,
      status: 'FAILED', error: message,
    });
    return null;
  } finally {
    if (context) await context.close().catch(() => {});
    if (video) {
      try {
        const originalPath = await video.path();
        const destinationPath = path.join(outputDir, videoFilename);
        await fs.copyFile(originalPath, destinationPath);
        await fs.rm(originalPath, { force: true }).catch(() => {});
        const existing = audit.videoCaptures.find(item => item.context === label);
        const entry = {
          context: label, viewport: viewport.name, theme, filename: videoFilename,
          status: 'CAPTURED', mainDocumentStatus: response?.status() ?? null,
          welcomeVisibleWithin350msOfInstrumentation: probe?.welcomeVisibleWithin350msOfInstrumentation === true,
          earlyDomSampleCount: probe?.samples?.length ?? 0,
          visibleChromeViolationCount: probe?.visibleChromeViolations?.length ?? 0,
          recordingDurationMs: 850,
        };
        if (existing) Object.assign(existing, entry);
        else audit.videoCaptures.push(entry);
      } catch (error) {
        const message = sanitizeText(String(error?.message || error));
        audit.hardFailures.push('Could not finalize welcome startup video for ' + label + ': ' + message);
        const existing = audit.videoCaptures.find(item => item.context === label);
        const entry = { context: label, viewport: viewport.name, theme, filename: videoFilename, status: 'FAILED', error: message };
        if (existing) Object.assign(existing, entry);
        else audit.videoCaptures.push(entry);
      }
    } else if (!audit.videoCaptures.some(item => item.context === label)) {
      audit.videoCaptures.push({
        context: label, viewport: viewport.name, theme, filename: videoFilename,
        status: 'FAILED', error: 'Playwright did not expose a video recording for this context.',
      });
    }
  }
}
async function navigate(page, url) {
  let response = null;
  const viewportSize = page.viewportSize();
  const isHomeFirstPaintContext = new URL(url).pathname === '/'
    && [360, 390].includes(viewportSize?.width);
  try {
    response = await page.goto(url, { waitUntil: isHomeFirstPaintContext ? 'commit' : 'domcontentloaded', timeout: 45000 });
  } catch (error) {
    audit.hardFailures.push(sanitizeText('Navigation failed for ' + url + ': ' + String(error.message || error)));
  }
  if (!response) return { response: null, blocked: audit.accessBlocked, status: null, title: '', url: page.url(), bodyText: '' };
  if (isHomeFirstPaintContext) {
    try {
      await captureFirstPaintFrames(page, page.__sdAuditLabel || (viewportSize.width === 360 ? 'mobile-360-light' : 'mobile-390-light'));
    } catch (error) {
      audit.hardFailures.push(sanitizeText('First-paint viewport capture failed: ' + String(error.message || error)));
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(error => {
      audit.hardFailures.push(sanitizeText('DOMContentLoaded did not complete for first-paint capture: ' + String(error.message || error)));
    });
  } else {
    await page.waitForTimeout(400);
  }
  const info = await page.evaluate(() => ({ title: document.title || '', url: location.href, bodyText: (document.body?.innerText || '').slice(0, 12000) }))
    .catch(() => ({ title: '', url: page.url(), bodyText: '' }));
  const blocked = accessGate(info.url, response.status(), info.title, info.bodyText);
  if (blocked) {
    audit.accessBlocked = true;
    audit.accessBlockReason = 'Cloudflare Access or login_required detected; no screenshot can be saved as a baseline.';
    audit.hardFailures.push('Access gate detected at ' + sanitizeUrl(info.url));
  }
  return { response, blocked, status: response.status(), ...info, url: sanitizeUrl(info.url) };
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
async function captureLocator(page, selector, filename, meta) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    const visible = count > 0 && await locator.isVisible().catch(() => false);
    if (!visible) {
      if (attempt === 0) {
        await page.waitForTimeout(180);
        continue;
      }
      audit.sectionChecks.push({ selector, filename, status: 'MISSING', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      audit.hardFailures.push('Required screenshot target is missing or hidden: ' + selector + ' (' + filename + ')');
      return false;
    }
    try {
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await locator.screenshot({ path: path.join(outputDir, filename), type: 'png', animations: 'disabled', timeout: 30000 });
      audit.sectionChecks.push({ selector, filename, status: 'CAPTURED', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      audit.screenshots.push({ filename, fullPage: false, elementSelector: selector, ...meta });
      return true;
    } catch (error) {
      lastError = error;
      const transient = /not attached to the DOM|not visible|detached|element is not stable/i.test(String(error?.message || error));
      if (attempt === 0 && transient) {
        await page.waitForTimeout(220);
        continue;
      }
      audit.sectionChecks.push({ selector, filename, status: 'FAILED', route: new URL(page.url()).pathname, theme: meta.theme, viewport: meta.viewport });
      throw error;
    }
  }
  throw lastError || new Error('Could not capture ' + selector + '.');
}
function screenshotStem(prefix, viewport, theme) {
  return prefix + '-' + viewport.name.split('-')[0] + '-' + theme + '-' + viewport.width + 'x' + viewport.height;
}
function captureMeta(viewport, theme, route = '/') {
  return {
    route, theme, viewport: viewport.name, viewportWidth: viewport.width, viewportHeight: viewport.height,
    captureSource: 'cloudflare-pages-preview-live-read-only',
  };
}
async function waitForStorefront(page, label) {
  await page.waitForFunction(() => !!document.querySelector('#home')
    && !!document.querySelector('.service-strip')
    && document.querySelectorAll('#catalogGrid .product-card').length > 0,
  null, { timeout: 18000 });
  const state = await page.evaluate(() => ({
    title: document.title || '',
    serviceCount: document.querySelectorAll('.service-strip .service').length,
    catalogProductCount: document.querySelectorAll('#catalogGrid .product-card').length,
    hasHero: Boolean(document.querySelector('#home .hero-visual img')),
    hasFooter: Boolean(document.querySelector('#siteFooter')),
    path: location.pathname,
  }));
  const status = state.serviceCount === 6 && state.hasHero && state.hasFooter && Boolean(state.title.trim()) ? 'PASS' : 'FAIL';
  audit.contentChecks.push({ context: label, ...state, status });
  if (status !== 'PASS') throw new Error('Storefront content check failed at ' + label + ': six-tile grid, hero, footer or document title is missing.');
}
async function dismissWelcomeSplash(page) {
  await page.evaluate(() => window.__sdDismissWelcome?.()).catch(() => {});
  await page.waitForFunction(() => {
    const splash = document.querySelector('#welcomeSplash');
    return !splash || splash.classList.contains('is-leaving');
  }, null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(950);
}
async function auditHeroImage(page, label) {
  const result = await page.evaluate(async () => {
    const imageElement = document.querySelector('#heroProductImage');
    const frame = document.querySelector('#home .hero-visual');
    const source = imageElement?.getAttribute('src') || '';
    const path = source.split(/[?#]/, 1)[0].replace(/^\.\//, '');
    const loaded = Boolean(imageElement && imageElement.complete && imageElement.naturalWidth > 0);
    const status = imageElement?.dataset.productImageStatus || '';
    const hidden = Boolean(imageElement?.hidden);
    const frameStyle = frame ? getComputedStyle(frame) : null;
    const frameCollapsed = !frame || frameStyle.display === 'none' || frame.getBoundingClientRect().width < 1 || frame.getBoundingClientRect().height < 1;
    const presentationAssetLoaded = path.endsWith('/images/hero-sd-gl052.png')
      && loaded && !hidden && status === 'hero-presentation-asset' && !frameCollapsed;
    return {
      actualImage: path,
      status,
      loaded,
      hidden,
      frameCollapsed,
      presentationAssetLoaded,
    };
  });
  const pass = result.presentationAssetLoaded === true;
  const status = pass ? 'PASS_HERO_PRESENTATION_ASSET' : 'FAIL';
  audit.heroImageChecks.push({ context: label, status, pass, result });
  if (!pass) {
    audit.hardFailures.push('The dedicated hero presentation asset must be visible and loaded at ' + label + '.');
  }
}
async function auditImageElements(page, label) {
  const broken = await page.evaluate(() => Array.from(document.images).filter((img) => {
    const src = img.currentSrc || img.getAttribute('src') || '';
    return Boolean(src) && img.complete && img.naturalWidth === 0;
  }).map((img) => ({
    src: (() => { try { return new URL(img.currentSrc || img.src, location.href).pathname; } catch { return ''; } })(),
    alt: String(img.alt || '').slice(0, 160),
  }))).catch(() => []);
  if (broken.length) {
    audit.brokenImages.push({ context: label, count: broken.length, images: broken });
    audit.hardFailures.push('Broken image elements detected at ' + label + ': ' + broken.length);
  }
}
const sectionTargets = [
  { key: 'hero', selector: '#home' },
  { key: 'benefits', selector: '.service-strip' },
  { key: 'order', selector: '#order' },
  { key: 'featured', selector: '#featured' },
  { key: 'collections', selector: '#collections' },
  { key: 'products', selector: '#products' },
  { key: 'contact', selector: '#contact' },
  { key: 'footer', selector: '#siteFooter' },
];
async function captureKeySections(page, viewport, theme) {
  const meta = captureMeta(viewport, theme, '/');
  for (const section of sectionTargets) {
    const filename = screenshotStem('section-' + section.key, viewport, theme) + '.png';
    await captureLocator(page, section.selector, filename, {
      ...meta, captureType: 'section', sectionKey: section.key, state: 'default',
    });
  }
}
async function captureMenuOpen(page, viewport, theme) {
  const button = page.locator('#menuToggle');
  if (!await button.isVisible().catch(() => false)) {
    audit.sectionChecks.push({ selector: '#menuToggle', status: 'NOT APPLICABLE', route: '/', theme, viewport: viewport.name, note: 'Mobile menu button is not visible at this viewport.' });
    return;
  }
  await button.click();
  await page.waitForFunction(() => document.querySelector('#mobileNav')?.classList.contains('open'), null, { timeout: 5000 });
  await capture(page, screenshotStem('state-menu-open', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'menu-open',
  });
  // The open drawer overlays the toggle, so a second pointer click is intercepted.
  // Use the storefront's supported Escape handler to close it without bypassing hit-testing.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#mobileNav')?.classList.contains('open'), null, { timeout: 5000 });
}
async function captureAccountDrawer(page, viewport, theme) {
  const button = page.locator('#mobileAccountNav');
  if (!await button.isVisible().catch(() => false)) {
    audit.hardFailures.push('Account navigation is not visible at the required mobile viewport.');
    audit.commerceStateChecks.push({ state: 'account-menu-open', status: 'FAIL', viewport: viewport.name, theme });
    return;
  }
  await button.click();
  await page.waitForFunction(() => document.querySelector('#accountDrawer')?.classList.contains('open'), null, { timeout: 5000 });
  await captureLocator(page, '#accountDrawer', screenshotStem('state-account-menu', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'account-menu-open',
  });
  await capture(page, screenshotStem('state-account-menu-viewport', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'account-menu-open',
  });
  audit.commerceStateChecks.push({ state: 'account-menu-open', status: 'PASS', viewport: viewport.name, theme });
  await page.locator('#accountClose').click();
  await page.waitForFunction(() => !document.querySelector('#accountDrawer')?.classList.contains('open'), null, { timeout: 5000 });
}

async function captureOrderExpanded(page, viewport, theme) {
  const button = page.locator('#orderDetailsToggle');
  const panel = page.locator('#orderDetailsPanel');
  if (!(await button.count()) || !(await panel.count())) {
    audit.hardFailures.push('Order assurance controls are missing; expanded-state screenshot cannot be captured.');
    return;
  }
  await button.scrollIntoViewIfNeeded();
  if (await panel.isHidden().catch(() => true)) await button.click();
  await page.waitForFunction(() => {
    const element = document.querySelector('#orderDetailsPanel');
    return Boolean(element && !element.hidden);
  }, null, { timeout: 5000 });
  await captureLocator(page, '#order', screenshotStem('state-order-expanded', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme), captureType: 'state', state: 'order-details-expanded', sectionKey: 'order',
  });
}
async function waitForProductDetail(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('#productOverlay.open')
    && document.querySelector('#detailTitle')?.textContent.trim()
    && document.querySelector('#detailMainImage')), null, { timeout: 18000 });
  await dismissWelcomeSplash(page);
  await page.waitForFunction(() => {
    const img = document.querySelector('#detailMainImage');
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }, null, { timeout: 10000 }).catch(() => {});
}
async function captureGalleryCartCheckoutStates(page, viewport, theme, label, route) {
  // UI-only probe in an isolated browser session: add one item locally and open
  // checkout for a screenshot. No order is submitted and all network writes are blocked.
  if (viewport.name !== 'mobile-390') return;
  const stateCapture = async (selector, filename, state) => {
    await captureLocator(page, selector, filename, {
      ...captureMeta(viewport, theme, route), captureType: 'state', state,
    });
  };
  try {
    const zoom = page.locator('#detailZoom');
    if (!await zoom.isVisible().catch(() => false)) throw new Error('Full-screen product gallery control is not visible.');
    await zoom.click();
    await page.waitForFunction(() => {
      const viewer = document.querySelector('#sdFullscreenViewer');
      // The gallery uses two buffered image layers and can load the first photo into
      // #sdFullscreenImageNext. Accept either loaded layer instead of assuming layer 1.
      const images = Array.from(document.querySelectorAll('#sdFullscreenViewer .sd-fullscreen-image'));
      return Boolean(viewer?.classList.contains('open')
        && images.some(image => image.complete && image.naturalWidth > 0));
    }, null, { timeout: 12000 });
    await stateCapture('#sdFullscreenViewer', screenshotStem('state-fullscreen-gallery', viewport, theme) + '.png', 'fullscreen-gallery');
    audit.commerceStateChecks.push({ state: 'fullscreen-gallery', status: 'PASS', viewport: viewport.name, theme, route });
    await page.locator('#sdFullscreenClose').click();
    await page.waitForFunction(() => !document.querySelector('#sdFullscreenViewer')?.classList.contains('open'), null, { timeout: 5000 });

    const addButton = page.locator('#detailAdd');
    if (!await addButton.isVisible().catch(() => false)) throw new Error('Add-to-cart control is not visible.');
    await addButton.click();
    await page.waitForFunction(() => {
      const text = document.querySelector('#cartCount')?.textContent || '0';
      return Number.parseInt(text, 10) > 0 || text.trim() === '99+';
    }, null, { timeout: 5000 });

    // The product-detail modal intentionally covers the bottom navigation.
    // Close the detail UI before clicking the cart tab; otherwise Playwright's
    // pointer click is correctly intercepted by the still-open dialog.
    await page.locator('#detailClose').click();
    await page.waitForFunction(() => !document.querySelector('#productOverlay')?.classList.contains('open'), null, { timeout: 5000 });

    const cartNav = page.locator('#mobileCartNav');
    if (!await cartNav.isVisible().catch(() => false)) throw new Error('Mobile cart tab is not visible after adding the isolated test item.');
    await cartNav.click();
    await page.waitForFunction(() => document.querySelector('#cartDrawer')?.classList.contains('open'), null, { timeout: 5000 });
    await page.waitForFunction(() => Boolean(document.querySelector('#cartList .cart-row')), null, { timeout: 5000 });
    await stateCapture('#cartDrawer', screenshotStem('state-cart-with-item', viewport, theme) + '.png', 'cart-with-item');
    await capture(page, screenshotStem('state-cart-with-item-viewport', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'cart-with-item', route,
    });
    audit.commerceStateChecks.push({ state: 'cart-with-item', status: 'PASS', viewport: viewport.name, theme, route });

    const checkout = page.locator('#cartCheckout');
    if (await checkout.isDisabled()) throw new Error('Checkout remains disabled after adding the item.');
    await checkout.click();
    await page.waitForFunction(() => document.querySelector('#checkoutDrawer')?.classList.contains('open'), null, { timeout: 5000 });
    await stateCapture('#checkoutDrawer', screenshotStem('state-checkout-form', viewport, theme) + '.png', 'checkout-form-open');
    await capture(page, screenshotStem('state-checkout-form-viewport', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme), captureType: 'state-viewport', state: 'checkout-form-open', route,
    });
    audit.commerceStateChecks.push({ state: 'checkout-form-open', status: 'PASS', viewport: viewport.name, theme, route, submitted: false });
    await page.locator('#checkoutClose').click();
    await page.waitForFunction(() => !document.querySelector('#checkoutDrawer')?.classList.contains('open'), null, { timeout: 5000 });
  } catch (error) {
    audit.commerceStateChecks.push({
      state: 'gallery-cart-checkout', status: 'FAIL', viewport: viewport.name, theme, route,
      note: sanitizeText(String(error?.message || error).slice(0, 200)),
    });
    audit.hardFailures.push('Full-screen gallery/cart/checkout capture failed at ' + label + ': ' + sanitizeText(error?.message || error));
    await page.locator('#sdFullscreenClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#checkoutClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#cartClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#detailClose').click({ timeout: 800 }).catch(() => {});
  }
}

async function captureIconFeedback(page, viewport, theme, label, route) {
  const button = page.locator('#detailFavorite');
  if (!await button.isVisible().catch(() => false)) {
    audit.iconStateChecks.push({ context: label, status: 'FAIL', reason: 'Favorite control is not visible.' });
    audit.hardFailures.push('Favorite icon state test could not find a visible control: ' + label);
    return;
  }
  const original = await button.evaluate((node) => ({
    id: document.querySelector('#detailAdd')?.dataset.add || '',
    imageSrc: document.querySelector('#detailMainImage')?.currentSrc || document.querySelector('#detailMainImage')?.src || '',
    imageRect: (() => { const r = document.querySelector('#detailMainImage')?.getBoundingClientRect(); return r ? { x:r.x,y:r.y,width:r.width,height:r.height } : null; })(),
    pressed: node.getAttribute('aria-pressed'),
    toastVisible: Boolean(document.querySelector('#toast.show')),
  }));
  const box = await button.boundingBox();
  if (!box || !original.id) {
    audit.iconStateChecks.push({ context: label, status: 'FAIL', reason: 'Favorite control bounds or product identity missing.' });
    audit.hardFailures.push('Favorite icon state test lacks a real product target: ' + label);
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(35);
  const pressed = await button.evaluate((node) => {
    const pseudo = getComputedStyle(node, '::before');
    const icon = node.querySelector('svg');
    const transform = getComputedStyle(node).transform;
    const scale = transform === 'none' ? 1 : Number.parseFloat(transform.slice(transform.indexOf('(') + 1).split(',')[0]);
    return {
      active: node.matches(':active'),
      overlayOpacity: Number.parseFloat(pseudo.opacity || '0'),
      overlayTransform: pseudo.transform,
      insetShadow: pseudo.boxShadow,
      controlScale: scale,
      iconColor: icon ? getComputedStyle(icon).color : '',
    };
  });
  await capture(page, screenshotStem('icon-favorite-pressed', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, route), captureType: 'icon-interaction', state: 'favorite-pressed', productTitle: original.id,
  });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#detailFavorite')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
  const selected = await button.evaluate((node, key) => {
    const path = node.querySelector('svg path');
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem('sd-favorites') || '[]'); } catch {}
    return {
      pressed: node.getAttribute('aria-pressed'),
      ariaLabel: node.getAttribute('aria-label'),
      buttonColor: getComputedStyle(node).color,
      fill: path ? getComputedStyle(path).fill : '',
      stored: Array.isArray(stored) && stored.map(String).includes(String(key)),
      toastVisible: Boolean(document.querySelector('#toast.show')),
    };
  }, original.id);
  await capture(page, screenshotStem('icon-favorite-selected', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, route), captureType: 'icon-interaction', state: 'favorite-selected', productTitle: original.id,
  });
  await button.click();
  await page.waitForFunction(() => document.querySelector('#detailFavorite')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
  const restored = await button.evaluate((node, key) => {
    const path = node.querySelector('svg path');
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem('sd-favorites') || '[]'); } catch {}
    return {
      pressed: node.getAttribute('aria-pressed'),
      buttonColor: getComputedStyle(node).color,
      fill: path ? getComputedStyle(path).fill : '',
      stored: Array.isArray(stored) && stored.map(String).includes(String(key)),
      toastVisible: Boolean(document.querySelector('#toast.show')),
    };
  }, original.id);
  await capture(page, screenshotStem('icon-favorite-restored', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, route), captureType: 'icon-interaction', state: 'favorite-unselected', productTitle: original.id,
  });
  const expectedRestoredColor = theme === 'dark' ? 'rgb(234, 243, 251)' : 'rgb(20, 42, 60)';
  const pass = original.pressed === 'false' && pressed.active
    && pressed.overlayOpacity >= 0.99 && pressed.controlScale <= 0.971 && pressed.controlScale >= 0.969
    && pressed.iconColor === 'rgb(92, 145, 185)'
    && pressed.insetShadow.includes('20, 42, 60')
    && selected.pressed === 'true' && selected.stored
    && selected.buttonColor === 'rgb(229, 72, 77)' && selected.fill === 'rgb(229, 72, 77)'
    && !selected.toastVisible
    && restored.pressed === 'false' && !restored.stored
    && restored.buttonColor === expectedRestoredColor && !restored.toastVisible
    && !original.toastVisible;
  audit.iconStateChecks.push({ context: label, status: pass ? 'PASS' : 'FAIL', route, result: { original, pressed, selected, restored } });
  if (!pass) audit.hardFailures.push('Live icon press/favorite state mismatch at ' + label + '.');
}

async function captureProductDetailFlow(page, viewport, theme, label) {
  let cardButton = page.locator('#catalogGrid [data-open-product]').first();
  if (await cardButton.count().catch(() => 0) === 0) cardButton = page.locator('#featuredGrid [data-open-product]').first();
  if (await cardButton.count().catch(() => 0) === 0) {
    audit.productDetailChecks.push({ context: label, status: 'NOT TESTED', reason: 'No live product card rendered.' });
    audit.hardFailures.push('No live product card is available for the detail route check at ' + label + '.');
    return;
  }
  await cardButton.scrollIntoViewIfNeeded();
  await cardButton.click({ timeout: 15000 });
  await waitForProductDetail(page);
  const clicked = await page.evaluate(() => ({
    path: location.pathname,
    title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    imageCount: document.querySelectorAll('#detailThumbs .detail-thumb').length,
  }));
  const currentRouteMatches = /^\/sanpham\/[^/]+\/[^/]+\/?$/i.test(clicked.path) && Boolean(clicked.title);
  if (!currentRouteMatches) {
    audit.routeChecks.push({
      kind: 'product-card-navigation', path: clicked.path, status: 'FAIL', result: 'FAIL',
      productTitleMatches: Boolean(clicked.title), detailModalOpen: true, context: label,
      expectedPattern: '/sanpham/{category-slug}/{product-key}',
    });
    audit.productDetailChecks.push({ context: label, status: 'FAIL', clickedPath: clicked.path, productTitlePresent: Boolean(clicked.title) });
    audit.hardFailures.push('Clicking a live product did not produce an expected current detail route (' + label + ').');
    return;
  }
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-from-grid', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, clicked.path), captureType: 'product-detail', state: 'opened-from-product-grid', productTitle: clicked.title,
  });
  audit.routeChecks.push({
    kind: 'product-card-navigation', path: clicked.path, status: 'PASS', productTitleMatches: true,
    detailModalOpen: true, context: label, note: 'Path derived from an actual rendered Preview product card; no sample SKU assumed.',
  });
  await captureGalleryCartCheckoutStates(page, viewport, theme, label, clicked.path);

  const directResponse = await navigate(page, new URL(clicked.path, origin).href);
  if (directResponse.blocked || !directResponse.response) {
    audit.productDetailChecks.push({ context: label, status: 'BLOCKED', path: clicked.path, directOpenPassed: false, reloadPassed: false });
    return;
  }
  if (directResponse.status < 200 || directResponse.status >= 400) {
    audit.productDetailChecks.push({ context: label, status: 'FAIL', path: clicked.path, directStatus: directResponse.status, directOpenPassed: false, reloadPassed: false });
    audit.hardFailures.push('Product detail direct navigation returned an unsuccessful status at ' + label + '.');
    return;
  }
  await waitForStorefront(page, label + '-direct-open');
  await waitForProductDetail(page);
  const directState = await page.evaluate(() => ({
    path: location.pathname, title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    modalOpen: Boolean(document.querySelector('#productOverlay.open')),
  }));
  const directOpenPassed = directState.path === clicked.path && directState.title === clicked.title && directState.modalOpen;
  audit.routeChecks.push({
    kind: 'product-detail-direct-open', path: clicked.path, status: directResponse.status, finalPath: directState.path,
    productTitleMatches: directState.title === clicked.title, detailModalOpen: directState.modalOpen,
    result: directOpenPassed ? 'PASS' : 'FAIL', context: label,
  });
  if (!directOpenPassed) audit.hardFailures.push('Direct open did not resolve to the same real product: ' + clicked.path + ' (' + label + ').');
  await settle(page);
  await capture(page, screenshotStem('product-detail-direct-open', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, directState.path), captureType: 'product-detail-direct-open', state: 'direct-open', productTitle: clicked.title,
  });
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-modal-direct-open', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, directState.path), captureType: 'product-detail-modal', state: 'direct-open', productTitle: clicked.title,
  });

  await captureIconFeedback(page, viewport, theme, label, directState.path);

  let galleryNextPassed = null;
  const next = page.locator('#detailNext');
  const galleryImageCount = await page.locator('#detailThumbs .detail-thumb').count().catch(() => 0);
  // Some site styles can override the browser's [hidden] presentation. Trust the
  // actual rendered gallery data, not visibility of the arrow alone.
  if (galleryImageCount > 1 && await next.isVisible().catch(() => false)) {
    const before = await page.locator('#detailImageCount').textContent().catch(() => '');
    await next.click();
    await page.waitForFunction(previous => {
      const counter = document.querySelector('#detailImageCount')?.textContent || '';
      const current = Number.parseInt(counter.split('/')[0], 10);
      const previousIndex = Number.parseInt(String(previous || '').split('/')[0], 10);
      return Number.isFinite(current) && Number.isFinite(previousIndex) && current !== previousIndex;
    }, before, { timeout: 5000 });
    await captureLocator(page, '#productOverlay', screenshotStem('product-gallery-next', viewport, theme) + '.png', {
      ...captureMeta(viewport, theme, directState.path), captureType: 'product-gallery', state: 'next-image', productTitle: clicked.title,
    });
    galleryNextPassed = true;
  } else {
    audit.sectionChecks.push({ selector: '#detailNext', status: 'NOT APPLICABLE', route: clicked.path, theme, viewport: viewport.name, note: 'Selected live product exposes one image or no visible next control.' });
  }

  const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  const reloadStatus = typeof reloadResponse?.status === 'function' ? reloadResponse.status() : null;
  await waitForStorefront(page, label + '-reload');
  await waitForProductDetail(page);
  const reloadState = await page.evaluate(() => ({
    path: location.pathname, title: (document.querySelector('#detailTitle')?.textContent || '').trim(),
    modalOpen: Boolean(document.querySelector('#productOverlay.open')),
  }));
  const reloadPassed = Boolean(reloadStatus !== null && reloadStatus >= 200 && reloadStatus < 400
    && reloadState.path === clicked.path && reloadState.title === clicked.title && reloadState.modalOpen);
  audit.routeChecks.push({
    kind: 'product-detail-reload', path: clicked.path, status: reloadStatus, finalPath: reloadState.path,
    productTitleMatches: reloadState.title === clicked.title, detailModalOpen: reloadState.modalOpen,
    result: reloadPassed ? 'PASS' : 'FAIL', context: label,
  });
  if (!reloadPassed) audit.hardFailures.push('Reload did not preserve the same real product detail: ' + clicked.path + ' (' + label + ').');
  await settle(page);
  await capture(page, screenshotStem('product-detail-reload', viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, reloadState.path), captureType: 'product-detail-reload', state: 'reloaded-direct-route', productTitle: clicked.title,
  });
  await captureLocator(page, '#productOverlay', screenshotStem('product-detail-modal-after-reload', viewport, theme) + '.png', {
    ...captureMeta(viewport, theme, reloadState.path), captureType: 'product-detail-modal', state: 'after-reload', productTitle: clicked.title,
  });
  const passed = directOpenPassed && reloadPassed;
  audit.productDetailChecks.push({
    context: label, status: passed ? 'PASS' : 'FAIL', path: clicked.path, directOpenPassed, reloadPassed,
    productTitleMatches: true, galleryNext: galleryNextPassed === null ? 'NOT APPLICABLE' : 'PASS',
  });
}
async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(firstPaintVideoDir, { recursive: true, force: true });
  await fs.mkdir(firstPaintVideoDir, { recursive: true });
  for (const item of await fs.readdir(outputDir, { withFileTypes: true })) {
    if (item.isFile() && /\.(png|json|html|webm)$/i.test(item.name)) await fs.unlink(path.join(outputDir, item.name));
  }
  const browser = await chromium.launch({ headless: true });
  try {
    // Dedicated short recordings are independent of the longer section/drawer screenshot run.
    // They show the first paint even if a still-screenshot call waits for layout/fonts.
    for (const theme of ['light', 'dark']) {
      for (const viewport of viewports.filter(item => item.width === 360 || item.width === 390)) {
        if (audit.accessBlocked) break;
        await captureWelcomeStartupVideo(browser, viewport, theme);
      }
    }
    for (const theme of ['light', 'dark']) {
      for (const viewport of viewports) {
        if (audit.accessBlocked) break;
        const label = viewport.name + '-' + theme;
        const { context, page } = await makePage(browser, viewport, theme, label);
        try {
          const result = await navigate(page, previewUrl.href);
          if (result.blocked) break;
          if (!result.response) continue;
          if (result.status < 200 || result.status >= 300) throw new Error('Homepage returned HTTP ' + result.status + '.');
          // The full-viewport +700ms startup video / DOM timeline is the authoritative welcome evidence; do not retry a delayed element screenshot.
          await waitForStorefront(page, label);
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
          await dismissWelcomeSplash(page);
          await settle(page);
          // Validate the owner-supplied Hero presentation asset in every required viewport/theme, not only mobile Light.
          await auditHeroImage(page, label);
          await auditImageElements(page, label);
          await capture(page, screenshotStem('home', viewport, theme) + '-viewport.png', false, {
            ...captureMeta(viewport, theme), captureType: 'viewport', state: 'default-home',
          });
          if (['mobile-390', 'desktop-1440'].includes(viewport.name)) {
            await capture(page, screenshotStem('home', viewport, theme) + '-full-page.png', true, {
              ...captureMeta(viewport, theme), captureType: 'full-page', state: 'default-home',
            });
            await captureKeySections(page, viewport, theme);
            if (viewport.name === 'mobile-390') {
              await captureMenuOpen(page, viewport, theme);
              await captureAccountDrawer(page, viewport, theme);
            }
            await captureOrderExpanded(page, viewport, theme);
            await captureProductDetailFlow(page, viewport, theme, label);
          }
        } catch (error) {
          audit.hardFailures.push(sanitizeText('Capture failed for ' + label + ': ' + String(error.message || error)));
        } finally {
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }

  audit.responsiveOverflowCount = audit.viewportAudits.filter(item => item.horizontalOverflow).length;
  audit.captureCompleted = !audit.accessBlocked && audit.viewportAudits.length === viewports.length * 2
    && audit.screenshots.some(item => item.captureType === 'viewport');
  const sectionScreenshotCounts = Object.fromEntries(sectionTargets.map(section => [
    section.key, audit.screenshots.filter(shot => shot.captureType === 'section' && shot.sectionKey === section.key).length,
  ]));
  const requiredSectionScreenshotsComplete = sectionTargets.every(section => sectionScreenshotCounts[section.key] === 4);
  const requiredViewportThemePairs = viewports.length * 2;
  const completedViewportThemePairs = audit.viewportAudits.length;
  const productDetailContextsComplete = audit.productDetailChecks.length === 4
    && audit.productDetailChecks.every(check => check.status === 'PASS' && check.directOpenPassed && check.reloadPassed);
  const firstPaintContextCount = viewports.filter(viewport => [360, 390].includes(viewport.width)).length * 2;
  const requiredFirstPaintFrameCount = firstPaintContextCount * 5;
  const firstPaintFrameCounts = Object.fromEntries(viewports.filter(viewport => [360, 390].includes(viewport.width)).flatMap(viewport =>
    ['light', 'dark'].map(theme => [viewport.name + '-' + theme,
      audit.firstPaintChecks.filter(check => check.viewport === viewport.name && check.theme === theme && check.status === 'CAPTURED').length])));
  const firstPaintCoverageComplete = audit.firstPaintChecks.length === requiredFirstPaintFrameCount
    && Object.values(firstPaintFrameCounts).every(count => count === 5);
  const firstPaintVideoCoverageComplete = audit.videoCaptures.length === firstPaintContextCount
    && audit.videoCaptures.every(video => video.status === 'CAPTURED' && video.welcomeVisibleWithin350msOfInstrumentation === true);
  const firstPaintViolationCount = audit.firstPaintTimelines.reduce((total, timeline) =>
    total + (timeline.visibleChromeViolations?.length || 0), 0);
  const homeFullPageCount = audit.screenshots.filter(shot => shot.captureType === 'full-page').length;
  const menuOpenCount = audit.screenshots.filter(shot => shot.state === 'menu-open').length;
  const orderExpandedCount = audit.screenshots.filter(shot => shot.state === 'order-details-expanded').length;
  const accountMenuCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'account-menu-open').length;
  const fullscreenGalleryCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'fullscreen-gallery').length;
  const cartWithItemCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'cart-with-item').length;
  const checkoutFormCount = audit.screenshots.filter(shot => shot.captureType === 'state' && shot.state === 'checkout-form-open').length;
  const commerceStatesComplete = accountMenuCount === 2 && fullscreenGalleryCount === 2 && cartWithItemCount === 2 && checkoutFormCount === 2
    && audit.commerceStateChecks.filter(check => check.status === 'PASS').length >= 8;
  audit.coverage = {
    requiredViewportThemePairs, completedViewportThemePairs,
    homeViewportScreenshots: audit.screenshots.filter(shot => shot.captureType === 'viewport' && shot.state === 'default-home').length,
    homeFullPageCount, requiredSectionKeys: sectionTargets.map(section => section.key),
    sectionScreenshotCounts, requiredSectionScreenshotsComplete, menuOpenCount, orderExpandedCount,
    accountMenuCount, fullscreenGalleryCount, cartWithItemCount, checkoutFormCount, commerceStatesComplete,
    productDetailContextsComplete, totalScreenshotCount: audit.screenshots.length,
    firstPaintContextCount, requiredFirstPaintFrameCount, firstPaintFrameCounts,
    firstPaintCoverageComplete, firstPaintVideoCoverageComplete, firstPaintVideoCount: audit.videoCaptures.length,
    firstPaintViolationCount,
    iconStateCheckCount: audit.iconStateChecks.length,
    iconStateChecksComplete: audit.iconStateChecks.length === 4 && audit.iconStateChecks.every(check => check.status === 'PASS'),
  };
  audit.passed = audit.captureCompleted
    && completedViewportThemePairs === requiredViewportThemePairs
    && audit.themeChecks.length === requiredViewportThemePairs && audit.themeChecks.every(check => check.themeMatches)
    && audit.responsiveOverflowCount === 0
    && audit.contentChecks.length >= requiredViewportThemePairs && audit.contentChecks.every(check => check.status === 'PASS')
    && homeFullPageCount === 4 && requiredSectionScreenshotsComplete && menuOpenCount === 2 && orderExpandedCount === 4
    && commerceStatesComplete && productDetailContextsComplete && audit.brokenImages.length === 0
    && audit.pageErrors.length === 0 && audit.consoleErrors.length === 0 && audit.httpErrors.length === 0
    && audit.failedRequests.length === 0 && audit.readOnlyViolations.length === 0
    && firstPaintCoverageComplete && firstPaintVideoCoverageComplete
    && firstPaintViolationCount === 0
    && audit.iconStateChecks.length === 4 && audit.iconStateChecks.every(check => check.status === 'PASS')
    && audit.hardFailures.length === 0;
  audit.finishedAtUtc = new Date().toISOString();
  audit.summary = {
    screenshotCount: audit.screenshots.length, viewportCount: audit.viewportAudits.length, routeCheckCount: audit.routeChecks.length,
    responsiveOverflowCount: audit.responsiveOverflowCount, consoleErrorCount: audit.consoleErrors.length,
    pageErrorCount: audit.pageErrors.length, httpErrorCount: audit.httpErrors.length, failedRequestCount: audit.failedRequests.length,
    brokenImageContextCount: audit.brokenImages.length, sectionTargetCheckCount: audit.sectionChecks.length,
    productDetailContextCount: audit.productDetailChecks.length, commerceStateCheckCount: audit.commerceStateChecks.length,
    iconStateCheckCount: audit.iconStateChecks.length,
    firstPaintFrameCount: audit.firstPaintChecks.length, firstPaintViolationCount, firstPaintCoverageComplete,
    firstPaintVideoCount: audit.videoCaptures.length, firstPaintVideoCoverageComplete,
    blockedExternalRequestCount: audit.blockedExternalRequests.length,
    allowedExternalReadRequestCount: audit.allowedExternalReadRequests.length,
    readOnlyViolationCount: audit.readOnlyViolations.length, hardFailureCount: audit.hardFailures.length,
    requiredSectionScreenshotsComplete, productDetailContextsComplete,
  };
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8');
  const imageCards = audit.screenshots.map(shot => '<figure><figcaption>' + esc(shot.filename) + ' · ' + esc(shot.route || '/') + ' · ' + esc(shot.theme || '') + '</figcaption><a href="' + esc(shot.filename) + '"><img loading="lazy" src="' + esc(shot.filename) + '" alt="' + esc(shot.filename) + '"></a></figure>').join('\n');
  const references = '<section><h2>Original mobile design references</h2><p>The references are multi-screen collages intended for visual review, not a pixel-perfect comparison of unlike layouts.</p><div class="shots"><figure><figcaption>Light reference</figcaption><img src="../reference-images/file_0000000017088207af45f5e6dd90cfa4.png" alt="Light reference"></figure><figure><figcaption>Dark reference</figcaption><img src="../reference-images/file_00000000fcb48207a23aeda23caa5eeb.png" alt="Dark reference"></figure></div></section>';
  const videoCards = audit.videoCaptures.map(video => '<figure><figcaption>' + esc(video.filename) + ' · ' + esc(video.viewport) + ' · ' + esc(video.theme) + ' · ' + esc(video.status) + '</figcaption><video controls playsinline preload="metadata" src="' + esc(video.filename) + '" style="width:100%;height:auto;display:block"></video></figure>').join('\\n');
  const reportHtml = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SinDarealest live Preview capture</title><style>body{font:14px/1.55 system-ui,sans-serif;color:#142a3c;background:#eef6fc;margin:0;padding:18px}main{max-width:1500px;margin:auto}h1,h2{font-family:Georgia,serif;font-weight:400}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;padding:12px;border-radius:10px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}figure{margin:0;padding:10px;border:1px solid #c5d9e8;border-radius:12px;background:#fff;min-width:0}figure img{width:100%;height:auto;display:block;border-radius:8px}figcaption{overflow-wrap:anywhere;font-size:12px;margin-bottom:6px}</style><main><h1>SinDarealest2 — direct Cloudflare Pages Preview capture</h1><p>Source: ' + esc(audit.previewUrl) + ' · captured: ' + esc(audit.captureCompleted) + ' · audit pass: ' + esc(audit.passed) + '</p><h2>Coverage</h2><pre>' + esc(JSON.stringify(audit.coverage || {}, null, 2)) + '</pre><h2>Route checks</h2><pre>' + esc(JSON.stringify(audit.routeChecks, null, 2)) + '</pre><h2>Content checks</h2><pre>' + esc(JSON.stringify(audit.contentChecks, null, 2)) + '</pre>' + references + '<h2>Captured Preview screens</h2><section class="shots">' + imageCards + '</section><h2>First-paint startup videos</h2><section class="shots">' + videoCards + '</section><h2>Full diagnostics</h2><pre>' + esc(JSON.stringify(audit, null, 2)) + '</pre></main></html>';
  await fs.writeFile(path.join(outputDir, 'report.html'), reportHtml, 'utf8');
  console.log(JSON.stringify({ previewUrl: audit.previewUrl, sourceCommit: audit.sourceCommit, accessServiceTokenConfigured: audit.accessServiceTokenConfigured, captureCompleted: audit.captureCompleted, accessBlocked: audit.accessBlocked, passed: audit.passed, coverage: audit.coverage, summary: audit.summary }, null, 2));
  if (!audit.captureCompleted || audit.accessBlocked || !audit.passed) process.exitCode = 1;
}
main().catch(async (error) => {
  audit.hardFailures.push(sanitizeText(error.stack || error));
  audit.finishedAtUtc = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {});
  await fs.writeFile(path.join(outputDir, 'visual-audit.json'), JSON.stringify(audit, null, 2) + '\n', 'utf8').catch(() => {});
  console.error(error.stack || error);
  process.exitCode = 1;
});
