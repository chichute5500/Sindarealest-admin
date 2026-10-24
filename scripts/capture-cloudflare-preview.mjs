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
const expectedNotFoundPath = '/__sd-audit-not-found-20261022';
function isExpectedNotFoundResponse(url, status) {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && parsed.pathname === expectedNotFoundPath && status === 404;
  } catch { return false; }
}
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
  cartAddStateChecks: [],
  flyToCartChecks: [],
  arrowPressChecks: [],
  cartAnimationEdgeChecks: [],
  notFoundChecks: [],
  searchChecks: [],
  zaloChecks: [],
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
    // Navigating to the dedicated unknown-route probe is expected to emit Chromium's
    // generic document-404 console message; do not mask 404s for any other URL.
    if (isExpectedNotFoundResponse(sourceUrl, 404)
        && /Failed to load resource: the server responded with a status of 404/i.test(msg.text())) return;
    audit.consoleErrors.push({ context: label, message: sanitizeText(msg.text()), url: sanitizeUrl(sourceUrl) });
  });
  page.on('pageerror', (error) => {
    try { if (new URL(page.url()).origin !== origin) return; } catch { return; }
    audit.pageErrors.push({ context: label, message: sanitizeText(error.message) });
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin
        && !isExpectedNotFoundResponse(res.url(), res.status())) {
      audit.httpErrors.push({ context: label, status: res.status(), method: res.request().method(), url: sanitizeUrl(res.url()) });
    }
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
async function captureDuringAnimation(page, filename, fullPage, meta) {
  // Do not use animations:'disabled' for a frame whose purpose is to prove motion:
  // Playwright fast-forwards finite transitions and could remove the flying clone before its mid-flight sample.
  await page.screenshot({ path: path.join(outputDir, filename), type: 'png', fullPage, timeout: 30000 });
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
async function captureArrowPressInPlace(page, {
  selector, previousSelector, counterSelector, viewport, theme, context, route, surface,
}) {
  const arrow = page.locator(selector).first();
  const fail = (reason, details = {}) => {
    const check = { context, route, viewport: viewport.name, theme, surface, selector, status: 'FAIL', reason, ...details };
    audit.arrowPressChecks.push(check);
    audit.hardFailures.push('Gallery arrow press/navigation failed for ' + surface + ' at ' + context + '.');
    return check;
  };
  if (!await arrow.isVisible().catch(() => false)) return fail('next-arrow-not-visible');
  await arrow.scrollIntoViewIfNeeded();
  const box = await arrow.boundingBox();
  if (!box) return fail('next-arrow-has-no-bounding-box');
  const markerBefore = (await page.locator(counterSelector).textContent().catch(() => '') || '').trim();
  if (!markerBefore) return fail('gallery-counter-missing');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const metrics = async () => arrow.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const matrix = new DOMMatrixReadOnly(style.transform === 'none'
      ? 'matrix(1, 0, 0, 1, 0, 0)' : style.transform);
    return {
      active: el.matches(':active'),
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      scaleX: Math.hypot(matrix.a, matrix.b),
      scaleY: Math.hypot(matrix.c, matrix.d),
      transform: style.transform,
      rippleOverlayOpacity: getComputedStyle(el, '::before').opacity,
    };
  });
  await page.mouse.move(x, y);
  await page.waitForTimeout(360);
  const rest = await metrics();
  await page.mouse.down();
  await page.waitForTimeout(125);
  const pressed = await metrics();
  const filename = screenshotStem(surface + '-arrow-pressed', viewport, theme) + '.png';
  await captureDuringAnimation(page, filename, false, {
    ...captureMeta(viewport, theme, route),
    captureType: 'interaction', state: surface + '-arrow-held', productSurface: surface,
  });
  await page.mouse.up();
  await page.mouse.move(Math.max(1, x - box.width - 24), Math.max(1, y - box.height - 24));
  const navigationChanged = await page.waitForFunction(({ counterSelector, markerBefore }) => {
    const marker = (document.querySelector(counterSelector)?.textContent || '').trim();
    return Boolean(marker && marker !== markerBefore);
  }, { counterSelector, markerBefore }, { timeout: 5000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(360);
  const released = await metrics();
  let previousRestored = false;
  if (navigationChanged) {
    await page.locator(previousSelector).click({ timeout: 5000 });
    previousRestored = await page.waitForFunction(({ counterSelector, markerBefore }) => {
      return (document.querySelector(counterSelector)?.textContent || '').trim() === markerBefore;
    }, { counterSelector, markerBefore }, { timeout: 5000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(360);
  }
  const centerShiftPx = Math.abs(pressed.centerY - rest.centerY);
  const activeStylePass = pressed.active && centerShiftPx <= 1
    && pressed.scaleX >= 0.95 && pressed.scaleX <= 0.99
    && pressed.scaleY >= 0.95 && pressed.scaleY <= 0.99
    && pressed.rippleOverlayOpacity === '0';
  const releaseStylePass = released.scaleX >= 0.985 && released.scaleX <= 1.015
    && released.scaleY >= 0.985 && released.scaleY <= 1.015;
  const pass = activeStylePass && releaseStylePass && navigationChanged && previousRestored;
  const check = {
    context, route, viewport: viewport.name, theme, surface, selector,
    status: pass ? 'PASS' : 'FAIL',
    centerShiftPx, rest, pressed, released, activeStylePass, releaseStylePass,
    navigationChanged, previousRestored, markerBefore,
    criteria: 'held pointer: <=1px vertical shift, scale .95-.99, no ::before overlay, reset near 1 after release, Next then Previous restores original image',
  };
  audit.arrowPressChecks.push(check);
  if (!pass) audit.hardFailures.push('Gallery arrow press/navigation failed for ' + surface + ' at ' + context + '.');
  return check;
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
  const result = await page.evaluate(() => {
    const imageElement = document.querySelector('#heroProductImage');
    const frame = document.querySelector('#home .hero-visual');
    const source = imageElement?.getAttribute('src') || '';
    const status = imageElement?.dataset.productImageStatus || '';
    const hidden = Boolean(imageElement?.hidden);
    const frameStyle = frame ? getComputedStyle(frame) : null;
    const frameCollapsed = !frame || frameStyle.display === 'none' || frame.getBoundingClientRect().width < 1 || frame.getBoundingClientRect().height < 1;
    const frameVisible = Boolean(frame) && frameStyle.display !== 'none'
      && frame.getBoundingClientRect().width > 1 && frame.getBoundingClientRect().height > 1;
    const ownerPresentationImageActive = Boolean(imageElement) && !hidden
      && source.endsWith('/images/hero-upload/tb_image_share_1792519964514%20(1).png')
      && status === 'owner-presentation-image-active' && imageElement.complete
      && imageElement.naturalWidth > 0 && frameVisible;
    return { actualImage: source, status, hidden, frameCollapsed, frameVisible, ownerPresentationImageActive,
      naturalWidth: imageElement?.naturalWidth || 0, naturalHeight: imageElement?.naturalHeight || 0 };
  });
  const pass = result.ownerPresentationImageActive === true;
  const status = pass ? 'PASS_HERO_PRESENTATION_IMAGE_VISIBLE' : 'FAIL';
  audit.heroImageChecks.push({ context: label, status, pass, result });
  if (!pass) audit.hardFailures.push('Hero must show the decoded owner-provided presentation image inside a visible frame at ' + label + '.');
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
    const fullscreenThumbCount = await page.locator('#sdFullscreenThumbs .sd-fullscreen-thumb').count().catch(() => 0);
    if (fullscreenThumbCount > 1) {
      await captureArrowPressInPlace(page, {
        selector: '#sdFullscreenNext', previousSelector: '#sdFullscreenPrev', counterSelector: '#sdFullscreenCount',
        viewport, theme, context: label, route, surface: 'fullscreen-gallery',
      });
    }
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
  await page.waitForTimeout(165);
  const pressed = await button.evaluate((node) => {
    const style = getComputedStyle(node);
    const icon = node.querySelector('svg');
    const transform = style.transform;
    const scale = transform === 'none' ? 1 : Number.parseFloat(transform.slice(transform.indexOf('(') + 1).split(',')[0]);
    return {
      active: node.matches(':active'),
      backgroundColor: style.backgroundColor,
      insetShadow: style.boxShadow,
      controlScale: scale,
      buttonColor: style.color,
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
  const expectedPressedTint = theme === 'dark' ? '92, 145, 185' : '234, 243, 251';
  const pass = original.pressed === 'false' && pressed.active
    && pressed.controlScale <= 0.971 && pressed.controlScale >= 0.969
    && pressed.backgroundColor.includes(expectedPressedTint)
    && pressed.iconColor === 'rgb(92, 145, 185)'
    && pressed.insetShadow.includes('inset') && pressed.insetShadow.includes('92, 145, 185')
    && selected.pressed === 'true' && selected.stored
    && selected.buttonColor === 'rgb(229, 72, 77)' && selected.fill === 'rgb(229, 72, 77)'
    && !selected.toastVisible
    && restored.pressed === 'false' && !restored.stored
    && restored.buttonColor === expectedRestoredColor && !restored.toastVisible
    && !original.toastVisible;
  audit.iconStateChecks.push({ context: label, status: pass ? 'PASS' : 'FAIL', route, result: { original, pressed, selected, restored } });
  if (!pass) audit.hardFailures.push('Live icon press/favorite state mismatch at ' + label + '.');
}

async function captureAddToCartFeedback(page, viewport, theme, label, route) {
  const addButton = page.locator('#detailAdd');
  const recordFailure = (state, details = {}) => {
    audit.cartAddStateChecks.push({ context: label, route, state, status: 'FAIL', ...details });
    audit.hardFailures.push('Live add-to-cart feedback mismatch (' + state + ') at ' + label + '.');
  };
  if (!await addButton.isVisible().catch(() => false)) {
    recordFailure('detail-add-control-missing');
    return;
  }
  const readCartState = async (productId) => page.evaluate((id) => {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
    const quantities = stored && typeof stored === 'object' ? stored : {};
    const total = Object.values(quantities).reduce((sum, value) => sum + Number(value || 0), 0);
    const toast = document.querySelector('#toast');
    const toastStyle = toast ? getComputedStyle(toast) : null;
    const toastRect = toast?.getBoundingClientRect();
    const nav = document.querySelector('#mobileBottomNav');
    const navStyle = nav ? getComputedStyle(nav) : null;
    const navRect = nav?.getBoundingClientRect();
    const navVisible = Boolean(nav && navStyle?.display !== 'none' && navStyle?.visibility !== 'hidden'
      && Number.parseFloat(navStyle?.opacity || '0') > 0 && navRect && navRect.width > 0 && navRect.height > 0);
    const toastShown = Boolean(toast?.classList.contains('show'));
    const toastOpacity = Number.parseFloat(toastStyle?.opacity || '0');
    const toastOnScreen = Boolean(toastRect && toastRect.width > 0 && toastRect.height > 0
      && toastRect.left >= 0 && toastRect.right <= window.innerWidth
      && toastRect.top >= 0 && toastRect.bottom <= window.innerHeight);
    const toastAboveMobileNav = !navVisible || Boolean(toastRect && navRect && toastRect.bottom <= navRect.top
      && Number.parseInt(toastStyle?.zIndex || '0', 10) > Number.parseInt(navStyle?.zIndex || '0', 10));
    const image = document.querySelector('#detailImageStage');
    const r = image?.getBoundingClientRect();
    const addRect = document.querySelector('#detailAdd')?.getBoundingClientRect();
    const toastClearOfAddButton = !addRect || !toastRect || toastRect.right <= addRect.left
      || toastRect.left >= addRect.right || toastRect.bottom <= addRect.top || toastRect.top >= addRect.bottom;
    return {
      quantity: Number(quantities[id] || 0), total,
      expectedBadge: total > 99 ? '99+' : String(total),
      badge: document.querySelector('#cartCount')?.textContent?.trim() || '0',
      toastVisible: toastShown,
      toastVisuallyVisible: toastShown && toastOpacity >= 0.95 && toastOnScreen && toastAboveMobileNav && toastClearOfAddButton,
      toastClearOfAddButton,
      toastOpacity, toastRect: toastRect ? { x:toastRect.x, y:toastRect.y, width:toastRect.width, height:toastRect.height, bottom:toastRect.bottom } : null,
      addRect: addRect ? { x:addRect.x, y:addRect.y, width:addRect.width, height:addRect.height, top:addRect.top, bottom:addRect.bottom } : null,
      mobileNavRect: navVisible && navRect ? { top:navRect.top, bottom:navRect.bottom, zIndex:navStyle.zIndex } : null,
      toastText: (toast?.textContent || '').trim(),
      imageRect: r ? { x:r.x, y:r.y, width:r.width, height:r.height } : null,
    };
  }, productId);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let alternateGalleryImageTested = false;
  let alternateGalleryImageSource = '';
  if (label === 'mobile-390-light') {
    const secondThumb = page.locator('#detailThumbs [data-thumb="1"]');
    if (await secondThumb.count().catch(() => 0) > 0) {
      alternateGalleryImageSource = await secondThumb.locator('img').evaluate(image => image.currentSrc || image.src);
      await secondThumb.click();
      alternateGalleryImageTested = await page.waitForFunction(expectedSource => {
        const image = document.querySelector('#detailMainImage');
        return Boolean(image && (image.currentSrc || image.src) === expectedSource && image.complete && image.naturalWidth > 0);
      }, alternateGalleryImageSource, { timeout: 5000 }).then(() => true).catch(() => false);
    }
  }
  const before = await page.evaluate(() => {
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
    const productId = document.querySelector('#detailAdd')?.dataset.add || '';
    const title = (document.querySelector('#detailTitle')?.textContent || '').trim();
    const skuText = (document.querySelector('#detailSku')?.textContent || '').replace(/^Mã SKU:\s*/i, '').trim();
    const image = document.querySelector('#detailImageStage');
    const r = image?.getBoundingClientRect();
    return {
      productId, title, skuText,
      imageSrc: document.querySelector('#detailMainImage')?.currentSrc || document.querySelector('#detailMainImage')?.src || '',
      imageReady: Boolean(document.querySelector('#detailMainImage')?.complete && document.querySelector('#detailMainImage')?.naturalWidth > 0),
      galleryImageCount: document.querySelectorAll('#detailThumbs .detail-thumb').length,
      quantity: Number(cart[productId] || 0),
      total: Object.values(cart).reduce((sum, value) => sum + Number(value || 0), 0),
      badge: document.querySelector('#cartCount')?.textContent?.trim() || '0',
      toastVisible: Boolean(document.querySelector('#toast.show')),
      imageRect: r ? { x:r.x, y:r.y, width:r.width, height:r.height } : null,
    };
  });
  if (!before.productId || !before.title || !before.imageRect) {
    recordFailure('detail-add-baseline-missing', { before });
    return;
  }
  const expectedLabel = before.skuText && !/chưa được cung cấp/i.test(before.skuText) ? before.skuText : before.title;
  const rectUnchanged = (a, b) => Boolean(a && b
    && ['x','y','width','height'].every(key => Math.abs(a[key] - b[key]) < 0.5));

  try {
    await page.evaluate(() => document.querySelector('#toast')?.classList.remove('show'));
    await page.evaluate(() => {
      const probe = document.createElement('button');
      probe.type = 'button';
      probe.id = '__invalidAddPreviewProbe';
      probe.dataset.add = '__invalid-preview-product__';
      probe.setAttribute('aria-label', 'Preview invalid-add regression probe');
      probe.style.cssText = 'position:fixed;left:8px;top:8px;width:16px;height:16px;opacity:0.01;z-index:99999;';
      probe.dataset.clickObserved = 'false';
      probe.addEventListener('click', () => { probe.dataset.clickObserved = 'true'; });
      document.querySelector('#productOverlay')?.appendChild(probe);
    });
    await page.locator('#__invalidAddPreviewProbe').click();
    const invalid = await page.evaluate(() => {
      const probe = document.querySelector('#__invalidAddPreviewProbe');
      const clickDispatched = probe?.dataset.clickObserved === 'true';
      probe?.remove();
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
      return {
        clickDispatched,
        quantity: Number(stored[document.querySelector('#detailAdd')?.dataset.add || ''] || 0),
        total: Object.values(stored).reduce((sum, value) => sum + Number(value || 0), 0),
        badge: document.querySelector('#cartCount')?.textContent?.trim() || '0',
        toastVisible: Boolean(document.querySelector('#toast.show')),
      };
    });
    const invalidPass = invalid.clickDispatched === true && invalid.quantity === before.quantity
      && invalid.total === before.total && invalid.badge === before.badge && !invalid.toastVisible;

    await addButton.click();
    await page.waitForFunction(({ id, quantity }) => {
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
      return Number(stored[id] || 0) === quantity;
    }, { id: before.productId, quantity: before.quantity + 1 }, { timeout: 6000 });

    const detailFlyAppeared = await page.waitForFunction(() => Boolean(document.querySelector('.sd-fly-to-cart-clone')), null, { timeout: 1400 }).then(() => true).catch(() => false);
    const detailFlyStart = detailFlyAppeared ? await page.evaluate(() => {
      const node = document.querySelector('.sd-fly-to-cart-clone');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { productId: node.dataset.productId, sourceImage: node.dataset.sourceImage, src: node.currentSrc || node.src,
        targetId: node.dataset.cartTargetId, durationMs: Number(node.dataset.durationMs), position: getComputedStyle(node).position,
        progress: Number(node.dataset.flightProgress || 0), transform: node.style.transform,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
    }) : null;
    if (detailFlyAppeared) {
      await captureDuringAnimation(page, screenshotStem('cart-fly-to-header-active-detail-open', viewport, theme) + '.png', false, {
        ...captureMeta(viewport, theme, route), captureType: 'cart-interaction', state: 'selected-product-image-flying-to-header-cart',
        productTitle: before.title, productId: before.productId,
      });
    }
    await page.waitForTimeout(110);
    const detailFlyMid = await page.evaluate(() => {
      const node = document.querySelector('.sd-fly-to-cart-clone');
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { productId: node.dataset.productId, sourceImage: node.dataset.sourceImage, targetId: node.dataset.cartTargetId,
        durationMs: Number(node.dataset.durationMs), position: getComputedStyle(node).position,
        progress: Number(node.dataset.flightProgress || 0), transform: node.style.transform,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
    });
    const detailFlyFinished = await page.waitForFunction(() => !document.querySelector('.sd-fly-to-cart-clone')
      && document.querySelector('#cartOpen')?.classList.contains('sd-cart-bump'), null, { timeout: 1800 })
      .then(() => true).catch(() => false);

    await page.waitForFunction(labelText => {
      const toast = document.querySelector('#toast');
      if (!toast?.classList.contains('show') || !(toast.textContent || '').includes(labelText)) return false;
      const style = getComputedStyle(toast);
      const rect = toast.getBoundingClientRect();
      const nav = document.querySelector('#mobileBottomNav');
      const navStyle = nav ? getComputedStyle(nav) : null;
      const navRect = nav?.getBoundingClientRect();
      const navVisible = Boolean(nav && navStyle?.display !== 'none' && navStyle?.visibility !== 'hidden'
        && Number.parseFloat(navStyle?.opacity || '0') > 0 && navRect && navRect.width > 0 && navRect.height > 0);
      const visible = Number.parseFloat(style.opacity || '0') >= 0.95 && rect.width > 0 && rect.height > 0
        && rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight;
      const aboveNav = !navVisible || Boolean(navRect && rect.bottom <= navRect.top
        && Number.parseInt(style.zIndex || '0', 10) > Number.parseInt(navStyle?.zIndex || '0', 10));
      return visible && aboveNav;
    }, expectedLabel, { timeout: 6000 });
    const afterOne = await readCartState(before.productId);
    const sameRect = (a, b) => Boolean(a && b && ['x','y','width','height'].every(key => Math.abs(a[key] - b[key]) < 0.5));
    const alternateImagePass = label !== 'mobile-390-light'
      || (alternateGalleryImageTested && before.galleryImageCount > 1 && before.imageSrc === alternateGalleryImageSource);
    const detailFlyPass = Boolean(before.imageReady && before.imageSrc && detailFlyStart
      && detailFlyStart.productId === before.productId
      && detailFlyStart.sourceImage === before.imageSrc && detailFlyStart.src === before.imageSrc
      && detailFlyStart.targetId === 'cartOpen' && detailFlyStart.position === 'fixed'
      && detailFlyStart.durationMs >= 600 && detailFlyStart.durationMs <= 900
      && detailFlyMid && detailFlyMid.productId === before.productId
      && detailFlyMid.sourceImage === before.imageSrc && detailFlyMid.targetId === 'cartOpen'
      && detailFlyMid.position === 'fixed' && detailFlyMid.progress > detailFlyStart.progress
      && detailFlyMid.transform !== detailFlyStart.transform && detailFlyFinished
      && sameRect(before.imageRect, afterOne.imageRect) && alternateImagePass);
    audit.flyToCartChecks.push({
      context: label, entryPoint: 'product-detail-selected-image', route,
      status: detailFlyPass ? 'PASS' : 'FAIL',
      productId: before.productId, sourceImage: before.imageSrc, sourceImageReady: before.imageReady,
      selectedAlternateImageTested: label === 'mobile-390-light' ? alternateGalleryImageTested : 'NOT REQUIRED',
      selectedAlternateImageSource: label === 'mobile-390-light' ? alternateGalleryImageSource : null,
      selectedAlternateImageMatchesFlight: alternateImagePass,
      targetCartId: detailFlyStart?.targetId || null, durationMs: detailFlyStart?.durationMs || null,
      imageCloneObserved: Boolean(detailFlyStart), movementObserved: Boolean(detailFlyMid && detailFlyStart
        && detailFlyMid.progress > detailFlyStart.progress && detailFlyMid.transform !== detailFlyStart.transform),
      cloneRemovedAndCartBumpedAfterSuccess: detailFlyFinished,
      noLayoutShift: sameRect(before.imageRect, afterOne.imageRect),
    });
    if (!detailFlyPass) audit.hardFailures.push('Live fly-to-cart detail/gallery acceptance failed at ' + label + '.');

    const onePass = afterOne.quantity === before.quantity + 1
      && afterOne.total === before.total + 1
      && afterOne.badge === afterOne.expectedBadge
      && afterOne.toastVisible && afterOne.toastVisuallyVisible && afterOne.toastClearOfAddButton && afterOne.toastText.includes(expectedLabel)
      && rectUnchanged(before.imageRect, afterOne.imageRect);
    await capture(page, screenshotStem('cart-add-success-detail-open', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme, route), captureType: 'cart-interaction', state: 'one-successful-add-with-detail-toast',
      productTitle: before.title, productId: before.productId,
    });

    await addButton.click();
    await addButton.click();
    await page.waitForFunction(({ id, quantity }) => {
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
      return Number(stored[id] || 0) === quantity;
    }, { id: before.productId, quantity: before.quantity + 3 }, { timeout: 6000 });
    const afterRapid = await readCartState(before.productId);
    await page.waitForTimeout(80);
    const rapidFlights = await page.evaluate(() => [...document.querySelectorAll('.sd-fly-to-cart-clone')].map(node => ({
      productId: node.dataset.productId, sourceImage: node.dataset.sourceImage, targetId: node.dataset.cartTargetId,
      durationMs: Number(node.dataset.durationMs), progress: Number(node.dataset.flightProgress || 0),
    })));
    const rapidFlightPass = rapidFlights.length === 2 && rapidFlights.every(node => node.productId === before.productId
      && node.sourceImage === before.imageSrc && node.targetId === 'cartOpen' && node.durationMs === 720);
    const rapidPass = afterRapid.quantity === before.quantity + 3
      && afterRapid.total === before.total + 3
      && afterRapid.badge === afterRapid.expectedBadge
      && afterRapid.toastVisible && afterRapid.toastVisuallyVisible && afterRapid.toastClearOfAddButton && afterRapid.toastText.includes(expectedLabel)
      && rectUnchanged(before.imageRect, afterRapid.imageRect) && rapidFlightPass;
    await capture(page, screenshotStem('cart-add-rapid-clicks-detail-open', viewport, theme) + '.png', false, {
      ...captureMeta(viewport, theme, route), captureType: 'cart-interaction', state: 'rapid-two-clicks-exactly-two-adds',
      productTitle: before.title, productId: before.productId,
    });

    await page.waitForFunction(() => !document.querySelector('.sd-fly-to-cart-clone'), null, { timeout: 1800 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('.sd-fly-to-cart-clone'), null, { timeout: 1800 }).catch(() => {});
    if (label === 'mobile-390-light') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reducedBefore = await readCartState(before.productId);
      await addButton.click();
      await page.waitForFunction(({ id, quantity }) => {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
        return Number(stored[id] || 0) === quantity;
      }, { id: before.productId, quantity: reducedBefore.quantity + 1 }, { timeout: 5000 });
      await page.waitForTimeout(50);
      const reducedAfter = await readCartState(before.productId);
      const reducedState = await page.evaluate(() => ({
        clonePresent: Boolean(document.querySelector('.sd-fly-to-cart-clone')),
        bumpPresent: Boolean(document.querySelector('#cartOpen.sd-cart-bump')),
        staticFeedbackPresent: Boolean(document.querySelector('#cartOpen.sd-cart-confirmed')),
      }));
      const reducedPass = reducedAfter.quantity === reducedBefore.quantity + 1
        && reducedAfter.total === reducedBefore.total + 1 && reducedAfter.badge === reducedAfter.expectedBadge
        && reducedAfter.toastVisible && !reducedState.clonePresent && !reducedState.bumpPresent && reducedState.staticFeedbackPresent;
      audit.cartAnimationEdgeChecks.push({ context: label, case: 'prefers-reduced-motion', status: reducedPass ? 'PASS' : 'FAIL',
        addSucceededOnce: reducedAfter.quantity === reducedBefore.quantity + 1, badgeMatches: reducedAfter.badge === reducedAfter.expectedBadge,
        toastVisible: reducedAfter.toastVisible, noFlightClone: !reducedState.clonePresent, noBounce: !reducedState.bumpPresent,
        staticFeedbackPresent: reducedState.staticFeedbackPresent });
      if (!reducedPass) audit.hardFailures.push('Reduced-motion cart feedback failed at ' + label + '.');
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await page.waitForFunction(() => !document.querySelector('.sd-fly-to-cart-clone'), null, { timeout: 1800 }).catch(() => {});
      const imageBeforeFailure = before.imageSrc;
      await page.evaluate(() => { document.querySelector('#detailMainImage')?.removeAttribute('src'); });
      const imageUnavailable = await page.waitForFunction(() => {
        const image = document.querySelector('#detailMainImage');
        return Boolean(image && !image.getAttribute('src') && image.complete && image.naturalWidth === 0);
      }, null, { timeout: 1000 }).then(() => true).catch(() => false);
      const missingBefore = await readCartState(before.productId);
      await addButton.click();
      await page.waitForFunction(({ id, quantity }) => {
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
        return Number(stored[id] || 0) === quantity;
      }, { id: before.productId, quantity: missingBefore.quantity + 1 }, { timeout: 5000 });
      await page.waitForTimeout(50);
      const missingAfter = await readCartState(before.productId);
      const missingState = await page.evaluate(() => ({
        clonePresent: Boolean(document.querySelector('.sd-fly-to-cart-clone')),
        bumpPresent: Boolean(document.querySelector('#cartOpen.sd-cart-bump')),
      }));
      const missingPass = imageUnavailable && missingAfter.quantity === missingBefore.quantity + 1
        && missingAfter.total === missingBefore.total + 1 && missingAfter.badge === missingAfter.expectedBadge
        && missingAfter.toastVisible && !missingState.clonePresent;
      audit.cartAnimationEdgeChecks.push({ context: label, case: 'source-image-unavailable', status: missingPass ? 'PASS' : 'FAIL',
        imageUnavailable, addSucceededOnce: missingAfter.quantity === missingBefore.quantity + 1,
        badgeMatches: missingAfter.badge === missingAfter.expectedBadge, toastVisible: missingAfter.toastVisible,
        noFlightClone: !missingState.clonePresent, cartFeedbackAfterSuccess: missingState.bumpPresent });
      if (!missingPass) audit.hardFailures.push('Unavailable source image blocked or falsified add-to-cart at ' + label + '.');
      await page.evaluate(src => { const image = document.querySelector('#detailMainImage'); if (image && src) image.src = src; }, imageBeforeFailure);
      await page.waitForFunction(() => {
        const image = document.querySelector('#detailMainImage');
        return Boolean(image && image.complete && image.naturalWidth > 0);
      }, null, { timeout: 6000 }).catch(() => {});
    }

    await page.locator('#detailClose').click();
    await page.waitForFunction(() => !document.querySelector('#productOverlay')?.classList.contains('open'), null, { timeout: 5000 });
    const beforeOpenCart = await readCartState(before.productId);
    await page.locator('#cartOpen').click();
    await page.waitForFunction(() => document.querySelector('#cartDrawer')?.classList.contains('open'), null, { timeout: 5000 });
    const afterOpenCart = await readCartState(before.productId);
    const headerCartNoAdd = afterOpenCart.quantity === beforeOpenCart.quantity
      && afterOpenCart.total === beforeOpenCart.total && afterOpenCart.badge === beforeOpenCart.badge;
    await captureLocator(page, '#cartDrawer', screenshotStem('cart-header-open-no-add', viewport, theme) + '.png', {
      ...captureMeta(viewport, theme, route), captureType: 'cart-interaction', state: 'header-cart-open-without-add',
      productTitle: before.title, productId: before.productId,
    });
    await page.locator('#cartClose').click();

    const pass = invalidPass && onePass && rapidPass && headerCartNoAdd;
    const result = {
      context: label, route, status: pass ? 'PASS' : 'FAIL',
      productId: before.productId, productTitle: before.title, expectedToastLabel: expectedLabel,
      invalidAddNoMutation: invalidPass, oneClickExactlyOnce: onePass, rapidClicksExactlyOnce: rapidPass,
      headerCartOpensWithoutAdd: headerCartNoAdd, detailFlyToCartPass: detailFlyPass,
      rapidFlightPass, rapidFlightCount: rapidFlights.length,
      before: { quantity: before.quantity, total: before.total, badge: before.badge },
      afterOne: { quantity: afterOne.quantity, total: afterOne.total, badge: afterOne.badge, toastVisible: afterOne.toastVisible, toastText: afterOne.toastText, noLayoutShift: rectUnchanged(before.imageRect, afterOne.imageRect) },
      afterRapid: { quantity: afterRapid.quantity, total: afterRapid.total, badge: afterRapid.badge, toastVisible: afterRapid.toastVisible, toastText: afterRapid.toastText, noLayoutShift: rectUnchanged(before.imageRect, afterRapid.imageRect) },
    };
    audit.cartAddStateChecks.push(result);
    if (!pass) audit.hardFailures.push('Live add-to-cart acceptance failed at ' + label + '.');
  } catch (error) {
    recordFailure('interaction-probe-exception', { reason: sanitizeText(String(error?.message || error).slice(0, 240)) });
    await page.locator('#cartClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#checkoutClose').click({ timeout: 800 }).catch(() => {});
    await page.locator('#detailClose').click({ timeout: 800 }).catch(() => {});
  }
}


async function captureCardFlyToCartProbe(page, button, viewport, theme, context, entryPoint) {
  if (!await button.count().catch(() => 0)) {
    const result = { context, entryPoint, status: 'FAIL', reason: 'No real add-to-cart control found.' };
    audit.flyToCartChecks.push(result);
    audit.hardFailures.push('Missing add-to-cart entry point: ' + entryPoint + '.');
    return false;
  }
  await button.scrollIntoViewIfNeeded();
  const before = await button.evaluate(node => {
    const featured = node.closest('[data-featured-card]');
    const card = featured || node.closest('.product-card');
    let image = null;
    if (node.id === 'detailAdd') image = document.querySelector('#detailMainImage');
    else if (featured) {
      const track = featured.querySelector('[data-feature-track]');
      image = track?.children[Number(featured.dataset.featureIndex || 0)] || featured.querySelector('.feature-single');
    } else image = card?.querySelector('.product-photo img,.feature-single,.feature-slide');
    const stage = featured?.querySelector('.featured-media') || card?.querySelector('.product-photo') || image;
    const imageRect = image?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
    const total = Object.values(cart).reduce((sum, value) => sum + Number(value || 0), 0);
    return {
      productId: node.dataset.add || '', title: (card?.querySelector('.product-title')?.textContent || '').trim(),
      sourceImage: image?.currentSrc || image?.src || '',
      imageReady: Boolean(image?.complete && image?.naturalWidth > 0),
      imageRect: imageRect ? { x:imageRect.x, y:imageRect.y, width:imageRect.width, height:imageRect.height } : null,
      stageRect: stageRect ? { x:stageRect.x, y:stageRect.y, width:stageRect.width, height:stageRect.height } : null,
      quantity: Number(cart[node.dataset.add || ''] || 0), total,
      badge: document.querySelector('#cartCount')?.textContent?.trim() || '0',
    };
  });
  const fail = (reason, details = {}) => {
    const result = { context, entryPoint, status: 'FAIL', reason, before, ...details };
    audit.flyToCartChecks.push(result);
    audit.hardFailures.push('Cart image source/flight failed for ' + entryPoint + ' at ' + context + '.');
    return false;
  };
  if (!before.productId || !before.sourceImage || !before.imageReady || !before.imageRect || !before.stageRect)
    return fail('source-image-or-product-identity-not-ready');
  await button.click({ timeout: 10000 });
  await page.waitForFunction(({ id, quantity }) => {
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
    return Number(cart[id] || 0) === quantity + 1;
  }, { id: before.productId, quantity: before.quantity }, { timeout: 5000 });
  const appeared = await page.waitForFunction(() => Boolean(document.querySelector('.sd-fly-to-cart-clone')), null, { timeout: 1400 }).then(() => true).catch(() => false);
  const start = appeared ? await page.evaluate(() => {
    const node = document.querySelector('.sd-fly-to-cart-clone');
    if (!node) return null;
    return { productId: node.dataset.productId, sourceImage: node.dataset.sourceImage, src: node.currentSrc || node.src,
      targetId: node.dataset.cartTargetId, durationMs: Number(node.dataset.durationMs), position: getComputedStyle(node).position,
      progress: Number(node.dataset.flightProgress || 0), transform: node.style.transform };
  }) : null;
  if (appeared) await captureDuringAnimation(page, screenshotStem('cart-fly-active-' + entryPoint, viewport, theme) + '.png', false, {
    ...captureMeta(viewport, theme, await page.evaluate(() => location.pathname)), captureType: 'cart-interaction',
    state: 'cart-fly-from-' + entryPoint, productId: before.productId, productTitle: before.title,
  });
  await page.waitForTimeout(90);
  if (entryPoint === 'featured-selected-image') {
    const original = { width: viewport.width, height: viewport.height };
    await page.setViewportSize({ width: original.width + 8, height: original.height });
    await page.waitForTimeout(35);
    await page.setViewportSize(original);
  } else {
    // Disable smooth scrolling only during this live probe so returning to the
    // original scroll offset is synchronous and the geometry assertion is meaningful.
    await page.evaluate(() => {
      const root = document.documentElement, body = document.body;
      window.__sdFlyScrollProbe = {
        top: window.scrollY,
        rootBehavior: root.style.scrollBehavior,
        bodyBehavior: body.style.scrollBehavior,
      };
      root.style.scrollBehavior = 'auto';
      body.style.scrollBehavior = 'auto';
      window.scrollTo(0, window.__sdFlyScrollProbe.top + 14);
    }).catch(() => {});
    await page.waitForTimeout(35);
    await page.evaluate(() => {
      const saved = window.__sdFlyScrollProbe;
      if (!saved) return;
      window.scrollTo(0, saved.top);
      document.documentElement.style.scrollBehavior = saved.rootBehavior;
      document.body.style.scrollBehavior = saved.bodyBehavior;
      delete window.__sdFlyScrollProbe;
    }).catch(() => {});
  }
  const mid = await page.evaluate(() => {
    const node = document.querySelector('.sd-fly-to-cart-clone');
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { productId: node.dataset.productId, sourceImage: node.dataset.sourceImage, targetId: node.dataset.cartTargetId,
      durationMs: Number(node.dataset.durationMs), position: getComputedStyle(node).position,
      progress: Number(node.dataset.flightProgress || 0), transform: node.style.transform,
      rect: { x:rect.x, y:rect.y, width:rect.width, height:rect.height } };
  });
  const finished = await page.waitForFunction(() => !document.querySelector('.sd-fly-to-cart-clone')
    && document.querySelector('#cartOpen')?.classList.contains('sd-cart-bump'), null, { timeout: 1800 }).then(() => true).catch(() => false);
  const after = await page.evaluate(({ id, entryPoint }) => {
    let cart = {};
    try { cart = JSON.parse(localStorage.getItem('sd-cart') || '{}') || {}; } catch {}
    const quantities = cart && typeof cart === 'object' ? cart : {};
    const total = Object.values(quantities).reduce((sum, value) => sum + Number(value || 0), 0);
    const grid = entryPoint === 'featured-selected-image' ? '#featuredGrid' : '#catalogGrid';
    const card = document.querySelector(grid + ' [data-product="' + CSS.escape(id) + '"]');
    const featured = card?.matches('[data-featured-card]');
    const image = featured
      ? (card.querySelector('[data-feature-track]')?.children[Number(card.dataset.featureIndex || 0)] || card.querySelector('.feature-single'))
      : card?.querySelector('.product-photo img,.feature-single,.feature-slide');
    const stage = card?.querySelector('.featured-media,.product-photo');
    const ir=image?.getBoundingClientRect(), sr=stage?.getBoundingClientRect();
    return { quantity:Number(quantities[id]||0), total, badge:document.querySelector('#cartCount')?.textContent?.trim()||'0',
      expectedBadge:total>99?'99+':String(total), toastVisible:Boolean(document.querySelector('#toast.show')),
      imageRect:ir?{x:ir.x,y:ir.y,width:ir.width,height:ir.height}:null,
      stageRect:sr?{x:sr.x,y:sr.y,width:sr.width,height:sr.height}:null };
  }, { id: before.productId, entryPoint });
  const sameRect = (a,b) => Boolean(a&&b&&['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<0.5));
  const sourceMatches = Boolean(start && start.sourceImage === before.sourceImage && start.src === before.sourceImage);
  const moved = Boolean(start && mid && mid.progress > start.progress && mid.transform !== start.transform);
  const pass = sourceMatches && before.imageReady && start.productId === before.productId
    && start.targetId === 'cartOpen' && start.position === 'fixed' && start.durationMs >= 600 && start.durationMs <= 900
    && moved && finished && after.quantity === before.quantity + 1 && after.total === before.total + 1
    && after.badge === after.expectedBadge && after.toastVisible && sameRect(before.stageRect,after.stageRect);
  const result = { context, entryPoint, status: pass ? 'PASS' : 'FAIL', productId: before.productId,
    productTitle: before.title, sourceImage: before.sourceImage, imageReady: before.imageReady,
    sourceMatchesExactDisplayedImage: sourceMatches, durationMs: start?.durationMs||null, targetCartId: start?.targetId||null,
    productIdPreserved: start?.productId===before.productId, movementObserved: moved, cloneRemovedAndCartBumpedAfterSuccess: finished,
    quantityIncreasedOnce: after.quantity===before.quantity+1 && after.total===before.total+1,
    beforeStageRect: before.stageRect, afterStageRect: after.stageRect,
    badgeMatchesActualCart: after.badge===after.expectedBadge, successToastVisible: after.toastVisible,
    noLayoutShift: sameRect(before.stageRect,after.stageRect), start, mid, after };
  audit.flyToCartChecks.push(result);
  if (!pass) audit.hardFailures.push('Cart image source/flight failed for ' + entryPoint + ' at ' + context + '.');
  return pass;
}

async function captureCardFlyToCartSources(page, viewport, theme, context) {
  const productButton = page.locator('#catalogGrid .product-card .mini-add').first();
  await captureCardFlyToCartProbe(page, productButton, viewport, theme, context, 'catalog-product-card');

  const featuredCard = page.locator('#featuredGrid [data-featured-card]').filter({ has: page.locator('[data-feature-track]') }).first();
  if (await featuredCard.count().catch(() => 0) === 0) {
    audit.flyToCartChecks.push({ context, entryPoint: 'featured-selected-image', status: 'FAIL', reason: 'No featured gallery card rendered.' });
    audit.hardFailures.push('No featured gallery is available for the selected-image fly-to-cart test.');
    return;
  }
  const imageCount = Number(await featuredCard.getAttribute('data-feature-count') || 0);
  if (imageCount < 2) {
    audit.flyToCartChecks.push({ context, entryPoint: 'featured-selected-image', status: 'FAIL', reason: 'No real featured product has an alternate image.' });
    audit.hardFailures.push('The public Preview has no multi-image featured product for gallery fly-to-cart acceptance.');
    return;
  }
  const oldIndex = Number(await featuredCard.getAttribute('data-feature-index') || 0);
  await featuredCard.locator('[data-feature-step="1"]').click({ timeout: 10000 });
  const featuredId = await featuredCard.getAttribute('data-product');
  const selectedLoaded = await page.waitForFunction(({ id, oldIndex }) => {
    const card = [...document.querySelectorAll('#featuredGrid [data-featured-card]')].find(node => node.dataset.product === id);
    if (!card || Number(card.dataset.featureIndex || 0) === oldIndex) return false;
    const image = card.querySelector('[data-feature-track]')?.children[Number(card.dataset.featureIndex || 0)];
    return Boolean(image && image.complete && image.naturalWidth > 0);
  }, { id: featuredId, oldIndex }, { timeout: 5000 }).then(() => true).catch(() => false);
  if (!selectedLoaded) {
    audit.flyToCartChecks.push({ context, entryPoint: 'featured-selected-image', status: 'FAIL', reason: 'The actual selected image did not load after the carousel step.' });
    audit.hardFailures.push('Failed to load the real selected featured image for fly-to-cart acceptance.');
    return;
  }
  await captureCardFlyToCartProbe(page, featuredCard.locator('.mini-add[data-add]').first(), viewport, theme, context, 'featured-selected-image');
}

async function captureProductDetailFlow(page, viewport, theme, label) {
  let cardButton = page.locator('#catalogGrid [data-open-product]').first();
  if (viewport.name === 'mobile-390') {
    // Use a genuine rendered multi-image featured product in both themes for the gallery interaction checks.
    // This avoids relying on private JS lexical bindings from a Playwright page.evaluate world.
    const galleryCard = page.locator('#featuredGrid [data-featured-card][data-feature-count]:not([data-feature-count="1"]) [data-open-product]').first();
    if (await galleryCard.count().catch(() => 0) > 0) cardButton = galleryCard;
  }
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
    await captureArrowPressInPlace(page, {
      selector: '#detailNext', previousSelector: '#detailPrev', counterSelector: '#detailImageCount',
      viewport, theme, context: label, route: directState.path, surface: 'detail-gallery',
    });
    const before = await page.locator('#detailImageCount').textContent().catch(() => '');
    await next.click();
    await page.waitForFunction(previous => {
      const counter = document.querySelector('#detailImageCount')?.textContent || '';
      const current = Number.parseInt(counter.split('/')[0], 10);
      const previousIndex = Number.parseInt(String(previous || '').split('/')[0], 10);
      return Number.isFinite(current) && Number.isFinite(previousIndex) && current !== previousIndex;
    }, before, { timeout: 5000 });
    // Exact-SHA live-audit evidence must finish before another branch update.
    // The counter changes before the CSS opacity/transform transition finishes.
    // Wait for the selected image to be decoded and its transition state to settle
    // so the evidence cannot capture a half-crossfaded frame that looks cropped.
    await page.waitForFunction(() => {
      const image = document.querySelector('#detailMainImage');
      const activeThumb = document.querySelector('#detailThumbs .detail-thumb.active img');
      if (!image || !activeThumb) return false;
      const normalize = value => {
        try { return new URL(value, document.baseURI).href; } catch { return ''; }
      };
      const displayedSource = normalize(image.currentSrc || image.src);
      const selectedSource = normalize(activeThumb.currentSrc || activeThumb.src);
      const transitionClasses = [
        'is-changing',
        'sd-slide-out-left',
        'sd-slide-out-right',
        'sd-slide-in-left',
        'sd-slide-in-right',
      ];
      return image.complete && image.naturalWidth > 0
        && displayedSource && displayedSource === selectedSource
        && !transitionClasses.some(className => image.classList.contains(className));
    }, null, { timeout: 10000 });
    await page.waitForTimeout(80);
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

  await captureAddToCartFeedback(page, viewport, theme, label, reloadState.path);
  if (label === 'mobile-390-light') await captureCardFlyToCartSources(page, viewport, theme, label);
  const passed = directOpenPassed && reloadPassed;
  audit.productDetailChecks.push({
    context: label, status: passed ? 'PASS' : 'FAIL', path: clicked.path, directOpenPassed, reloadPassed,
    productTitleMatches: true, galleryNext: galleryNextPassed === null ? 'NOT APPLICABLE' : 'PASS',
  });
}
async function captureSupplementalParityChecks(browser) {
  const viewport = viewports.find(item => item.width === 390 && item.height === 844);
  const theme = 'light';
  const label = 'supplemental-mobile-390-light';
  const { context, page } = await makePage(browser, viewport, theme, label);
  try {
    const missingPath = expectedNotFoundPath;
    let response = null;
    try { response = await page.goto(origin + missingPath, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(220); }
    catch (error) { audit.hardFailures.push(sanitizeText('Direct not-found route navigation failed: ' + String(error.message || error))); }
    const state = await page.evaluate(() => ({
      path: location.pathname,
      hasNotFoundView: Boolean(document.querySelector('#notFoundPage')),
      viewVisible: (() => { const el = document.querySelector('#notFoundPage'); return Boolean(el && !el.hidden && getComputedStyle(el).display !== 'none'); })(),
      heading: (document.querySelector('#notFoundTitle')?.textContent || '').trim(),
      homeHref: document.querySelector('#notFoundPage a[href="/"]')?.getAttribute('href') || null,
    })).catch(() => ({ path: page.url(), hasNotFoundView: false, viewVisible: false, heading: '', homeHref: null }));
    const notFoundPassed = response?.status() === 404 && state.hasNotFoundView && state.viewVisible && state.heading === '404' && state.homeHref === '/';
    audit.notFoundChecks.push({ path: missingPath, httpStatus: response?.status() ?? null, ...state, status: notFoundPassed ? 'PASS' : 'FAIL' });
    audit.routeChecks.push({ kind: 'not-found-route', path: missingPath, status: response?.status() ?? null, finalPath: state.path, result: notFoundPassed ? 'PASS' : 'FAIL', notFoundViewVisible: state.viewVisible });
    if (!notFoundPassed) audit.hardFailures.push('Direct unknown route must return HTTP 404 and render the accessible 404 view.');
    await capture(page, 'not-found-mobile-light-390x844.png', false, { ...captureMeta(viewport, theme, missingPath), captureType: 'not-found', state: 'not-found' });

    // Verify the standalone Pages 404 in Dark mode too, not only its CSS source.
    const dark404State = await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      const title = document.querySelector('#notFoundTitle');
      return {
        darkClass: document.documentElement.classList.contains('dark'),
        backgroundImage: getComputedStyle(document.body).backgroundImage,
        titleColor: title ? getComputedStyle(title).color : '',
        heading: (title?.textContent || '').trim(),
        homeHref: document.querySelector('#notFoundPage a[href="/"]')?.getAttribute('href') || null,
      };
    }).catch(() => ({ darkClass: false, backgroundImage: '', titleColor: '', heading: '', homeHref: null }));
    const dark404Passed = dark404State.darkClass
      && dark404State.backgroundImage.includes('liquid-glass-dark-mobile.svg')
      && dark404State.titleColor === 'rgb(234, 243, 251)'
      && dark404State.heading === '404' && dark404State.homeHref === '/';
    audit.notFoundChecks[0].darkTheme = { ...dark404State, status: dark404Passed ? 'PASS' : 'FAIL' };
    if (!dark404Passed) audit.hardFailures.push('The standalone 404 must render its dark satin background, readable heading, and home link.');
    await capture(page, 'not-found-mobile-dark-390x844.png', false, { ...captureMeta(viewport, 'dark', missingPath), captureType: 'not-found', state: 'not-found' });

    await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForStorefront(page, label); await dismissWelcomeSplash(page); await settle(page);
    const firstTitle = (await page.locator('#catalogGrid .product-title').first().innerText().catch(() => '')).trim();
    const query = firstTitle;
    const originalCount = await page.locator('#catalogGrid .product-card').count();
    const input = page.locator('#catalogSearch');
    try {
      await page.locator('#searchJump').click({ timeout: 8000 });
      await input.fill(query, { timeout: 8000 });
      await page.waitForFunction(q => {
        const titles = [...document.querySelectorAll('#catalogGrid .product-title')].map(el => (el.textContent || '').trim().toLocaleLowerCase('vi'));
        return Boolean(q) && titles.length > 0 && titles.every(title => title.includes(q.toLocaleLowerCase('vi')));
      }, query, { timeout: 8000 });
    } catch (error) { audit.hardFailures.push(sanitizeText('Live catalog search interaction failed: ' + String(error.message || error))); }
    await page.locator('#products').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(220);
    const searchState = await page.evaluate(() => ({
      query: document.querySelector('#catalogSearch')?.value || '',
      visibleResultCount: document.querySelectorAll('#catalogGrid .product-card').length,
      resultTitles: [...document.querySelectorAll('#catalogGrid .product-title')].map(el => (el.textContent || '').trim()),
    })).catch(() => ({ query: '', visibleResultCount: 0, resultTitles: [] }));
    const searchPassed = Boolean(query) && searchState.query === query && searchState.visibleResultCount > 0
      && searchState.visibleResultCount < originalCount
      && searchState.resultTitles.every(title => title.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
    audit.searchChecks.push({ context: label, query, originalCount, ...searchState, status: searchPassed ? 'PASS' : 'FAIL' });
    if (!searchPassed) audit.hardFailures.push('Catalog search did not return matching live Preview products.');
    await capture(page, 'search-results-mobile-light-390x844.png', false, { ...captureMeta(viewport, theme, '/'), captureType: 'interaction', state: 'search-results' });
    await input.fill('');

    const orderToggle = page.locator('#orderDetailsToggle');
    if (await orderToggle.getAttribute('aria-expanded').catch(() => 'false') !== 'true') {
      await orderToggle.click({ timeout: 8000 }).catch(error => audit.hardFailures.push(sanitizeText('Could not expand order details for Zalo verification: ' + String(error.message || error))));
    }
    await page.waitForFunction(() => { const panel = document.querySelector('#orderDetailsPanel'); return Boolean(panel && !panel.hidden); }, null, { timeout: 5000 })
      .catch(error => audit.hardFailures.push(sanitizeText('Order details panel did not expand for Zalo verification: ' + String(error.message || error))));
    await page.locator('#order').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(420);
    const zalo = page.locator('#order .order-zalo-cta').first();
    await zalo.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })).catch(() => {});
    await page.waitForTimeout(320);
    await zalo.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(180);
    const zaloState = await zalo.evaluate(el => ({
      visible: Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden',
      href: el.getAttribute('href'), target: el.getAttribute('target'),
      rel: (el.getAttribute('rel') || '').split(/\s+/).filter(Boolean),
      label: (el.getAttribute('aria-label') || el.textContent || '').trim(),
    })).catch(() => ({ visible: false, href: null, target: null, rel: [], label: '' }));
    const zaloPassed = zaloState.visible && /^https:\/\/zalo\.me\//i.test(zaloState.href || '')
      && zaloState.target === '_blank' && zaloState.rel.includes('noopener') && zaloState.rel.includes('noreferrer');
    audit.zaloChecks.push({ context: label, ...zaloState, externalNavigationClicked: false, status: zaloPassed ? 'PASS' : 'FAIL',
      note: 'Verified the live CTA and safe external-link attributes; did not navigate away from Preview.' });
    if (!zaloPassed) audit.hardFailures.push('Zalo CTA is missing, hidden, or lacks a safe HTTPS target.');
    await captureLocator(page, '#order .order-zalo-cta', 'zalo-cta-mobile-light-390x844.png', { ...captureMeta(viewport, theme, '/'), captureType: 'interaction', state: 'zalo-cta' });
  } finally { await context.close(); }
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
    await captureSupplementalParityChecks(browser);
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
    cartAddStateCheckCount: audit.cartAddStateChecks.length,
    iconStateChecksComplete: audit.iconStateChecks.length === 4 && audit.iconStateChecks.every(check => check.status === 'PASS'),
    cartAddStateCheckCount: audit.cartAddStateChecks.length,
    cartAddStateChecksComplete: audit.cartAddStateChecks.length === 4 && audit.cartAddStateChecks.every(check => check.status === 'PASS'),
    flyToCartCheckCount: audit.flyToCartChecks.length,
arrowPressCheckCount: audit.arrowPressChecks.length,
    arrowPressChecksComplete: audit.arrowPressChecks.length === 4 && audit.arrowPressChecks.every(check => check.status === 'PASS'),
    flyToCartChecksComplete: audit.flyToCartChecks.length === 6 && audit.flyToCartChecks.every(check => check.status === 'PASS'),
    cartAnimationEdgeCheckCount: audit.cartAnimationEdgeChecks.length,
    cartAnimationEdgeChecksComplete: audit.cartAnimationEdgeChecks.length === 2 && audit.cartAnimationEdgeChecks.every(check => check.status === 'PASS'),
    notFoundChecksComplete: audit.notFoundChecks.length === 1 && audit.notFoundChecks.every(check => check.status === 'PASS' && check.darkTheme?.status === 'PASS'),
    searchChecksComplete: audit.searchChecks.length === 1 && audit.searchChecks.every(check => check.status === 'PASS'),
    zaloChecksComplete: audit.zaloChecks.length === 1 && audit.zaloChecks.every(check => check.status === 'PASS'),
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
    && audit.cartAddStateChecks.length === 4 && audit.cartAddStateChecks.every(check => check.status === 'PASS')
    && audit.flyToCartChecks.length === 6 && audit.flyToCartChecks.every(check => check.status === 'PASS')
    && audit.arrowPressChecks.length === 4 && audit.arrowPressChecks.every(check => check.status === 'PASS')
    && audit.cartAnimationEdgeChecks.length === 2 && audit.cartAnimationEdgeChecks.every(check => check.status === 'PASS')
    && audit.coverage.notFoundChecksComplete
    && audit.notFoundChecks.length === 1 && audit.notFoundChecks.every(check => check.status === 'PASS')
    && audit.searchChecks.length === 1 && audit.searchChecks.every(check => check.status === 'PASS')
    && audit.zaloChecks.length === 1 && audit.zaloChecks.every(check => check.status === 'PASS')
    && audit.hardFailures.length === 0;
  audit.finishedAtUtc = new Date().toISOString();
  audit.summary = {
    screenshotCount: audit.screenshots.length, viewportCount: audit.viewportAudits.length, routeCheckCount: audit.routeChecks.length,
    responsiveOverflowCount: audit.responsiveOverflowCount, consoleErrorCount: audit.consoleErrors.length,
    pageErrorCount: audit.pageErrors.length, httpErrorCount: audit.httpErrors.length, failedRequestCount: audit.failedRequests.length,
    brokenImageContextCount: audit.brokenImages.length, sectionTargetCheckCount: audit.sectionChecks.length,
    productDetailContextCount: audit.productDetailChecks.length, commerceStateCheckCount: audit.commerceStateChecks.length,
    iconStateCheckCount: audit.iconStateChecks.length,
    flyToCartCheckCount: audit.flyToCartChecks.length,
    flyToCartChecksComplete: audit.flyToCartChecks.length === 6 && audit.flyToCartChecks.every(check => check.status === 'PASS'),
    cartAnimationEdgeCheckCount: audit.cartAnimationEdgeChecks.length,
    cartAnimationEdgeChecksComplete: audit.cartAnimationEdgeChecks.length === 2 && audit.cartAnimationEdgeChecks.every(check => check.status === 'PASS'),
    notFoundCheckCount: audit.notFoundChecks.length, searchCheckCount: audit.searchChecks.length, zaloCheckCount: audit.zaloChecks.length,
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
