import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';
import { sanitizeText, sanitizeUrl } from './sanitize-audit-value.mjs';

const EXPECTED_BRANCH = 'fix/liquid-glass-audit-2026-10-19';
const previewRaw = String(process.env.PREVIEW_URL || '');
const branch = String(process.env.GITHUB_REF_NAME || '');
const headSha = String(process.env.GITHUB_SHA || '').toLowerCase();
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const apiToken = String(process.env.CLOUDFLARE_PAGES_READ_TOKEN || '').trim();
const outputDir = path.join(process.cwd(), 'artifacts', 'fullscreen-gallery-preview');
const reportPath = path.join(outputDir, 'gallery-audit.json');
const report = {
  sourceKind: 'cloudflare-pages-preview-gallery-only-read-only',
  auditScope: 'fullscreen-product-gallery-only',
  startedAtUtc: new Date().toISOString(),
  branch,
  workflowHeadSha: headSha || null,
  publicSourceSha: null,
  previewUrl: null,
  deployedPreviewSha: null,
  deploymentVerified: false,
  readOnly: true,
  heroCaptured: false,
  lockedSectionsCaptured: false,
  status: 'IN_PROGRESS',
  targetProducts: [],
  transitions: [],
  screenshots: [],
  pageErrors: [],
  consoleErrors: [],
  sameOriginHttpErrors: [],
  readOnlyViolations: [],
  blockedExternalRequests: [],
  accessServiceTokenConfigured: false
};
let browser;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function validatePreview(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:'
      || !/^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i.test(url.hostname)
      || url.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || url.username || url.password || url.search || url.hash
      || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Refused: only a non-Production HTTPS Pages alias at root is allowed.');
  }
  return url;
}
async function writeReport() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}
async function verifyDeployedPreview(url, publicSha, currentHead) {
  const proofPath = path.join(process.cwd(), 'artifacts', 'liquid-glass-preview', 'deployment-verification.json');
  const proof = JSON.parse(await fs.readFile(proofPath, 'utf8'));
  assert.equal(proof.passed, true, 'Read-only Cloudflare deployment verification must pass before browser testing.');
  assert.equal(proof.status, 'VERIFIED_PREVIEW_DEPLOYMENT');
  assert.equal(proof.projectName, 'sindarealest2');
  assert.equal(proof.requestedPreviewUrl, url.origin);
  assert.equal(proof.deployment.environment, 'preview');
  assert.equal(proof.deployment.branch, EXPECTED_BRANCH);
  assert.equal(String(proof.deployment.commitHash || '').toLowerCase(), currentHead,
    'The live Preview deployment SHA must exactly equal this browser-audit workflow commit.');
  const aliasMatch = (proof.deployment.aliases || []).some((alias) => {
    try { return new URL(alias).origin === url.origin; } catch { return false; }
  });
  let deploymentUrlMatch = false;
  try { deploymentUrlMatch = new URL(proof.deployment.url || '').origin === url.origin; } catch {}
  assert.ok(aliasMatch || deploymentUrlMatch, 'Preview alias must match the verified deployment record.');
  execFileSync('git', ['merge-base', '--is-ancestor', publicSha, currentHead], { stdio: 'ignore' });
  git(['diff', '--quiet', publicSha, currentHead, '--', 'public']);
  return proof;
}
async function tap(locator, mobile) {
  if (mobile) await locator.tap({ timeout: 10000 });
  else await locator.click({ timeout: 10000 });
}
async function measureTransition(page, activate, label) {
  await page.evaluate(() => {
    const state = window.__sdGalleryGeometry = {
      startedAt: performance.now(), frames: [], sawAnimation: false, quietFrames: 0,
      finished: false, timedOut: false
    };
    function tick() {
      if (state.finished) return;
      const one = document.querySelector('#sdFullscreenImage');
      const two = document.querySelector('#sdFullscreenImageNext');
      const frame = document.querySelector('#sdFullscreenFrame');
      const viewer = document.querySelector('#sdFullscreenViewer');
      if (viewer && viewer.classList.contains('open') && one && two && frame) {
        const animOne = getComputedStyle(one).animationName || 'none';
        const animTwo = getComputedStyle(two).animationName || 'none';
        if (animOne.indexOf('sdFullscreen') === 0 || animTwo.indexOf('sdFullscreen') === 0) {
          state.sawAnimation = true;
          state.quietFrames = 0;
          const a = one.getBoundingClientRect();
          const b = two.getBoundingClientRect();
          const f = frame.getBoundingClientRect();
          const innerLeft = f.left + frame.clientLeft;
          const innerRight = innerLeft + frame.clientWidth;
          const left = a.left <= b.left ? a : b;
          const right = a.left <= b.left ? b : a;
          const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const gap = Math.max(0, right.left - left.right);
          const cover = Math.max(0,
            Math.min(innerRight, Math.max(a.right, b.right)) -
            Math.max(innerLeft, Math.min(a.left, b.left)));
          state.frames.push({
            t: Number((performance.now() - state.startedAt).toFixed(2)),
            overlapPx: Number(overlap.toFixed(3)),
            gapPx: Number(gap.toFixed(3)),
            frameWidth: frame.clientWidth,
            coveredWidth: Number(cover.toFixed(3)),
            oneAnimation: animOne,
            twoAnimation: animTwo
          });
        } else if (state.sawAnimation && ++state.quietFrames >= 4) {
          state.finished = true;
          return;
        }
      }
      if (performance.now() - state.startedAt > 12000) {
        state.finished = true;
        state.timedOut = !state.sawAnimation;
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  await activate();
  await page.waitForFunction(() => window.__sdGalleryGeometry && window.__sdGalleryGeometry.finished, null, { timeout: 15000 });
  const sample = await page.evaluate(() => window.__sdGalleryGeometry);
  assert.equal(sample.timedOut, false, label + ': no CSS slide animation was observed.');
  assert.ok(sample.frames.length >= 6, label + ': insufficient frame-by-frame samples.');
  const maxOverlap = Math.max.apply(null, sample.frames.map((x) => x.overlapPx));
  const maxGap = Math.max.apply(null, sample.frames.map((x) => x.gapPx));
  const minCoverage = Math.min.apply(null, sample.frames.map((x) => x.coveredWidth / Math.max(1, x.frameWidth)));
  assert.ok(maxOverlap <= 1.5, label + ': two image boxes overlapped by ' + maxOverlap + ' CSS px.');
  assert.ok(maxGap <= 1.5, label + ': image boxes left a gap of ' + maxGap + ' CSS px.');
  assert.ok(minCoverage >= 0.985, label + ': image layers covered only ' + (minCoverage * 100).toFixed(2) + '% of the viewer frame.');
  await page.waitForFunction(() => {
    const viewer = document.querySelector('#sdFullscreenViewer');
    const images = Array.from(document.querySelectorAll('#sdFullscreenImage, #sdFullscreenImageNext'));
    return viewer && viewer.classList.contains('open')
      && images.filter((image) => image.classList.contains('is-active')).length === 1
      && images.every((image) => !image.classList.contains('sd-slide-out-left')
        && !image.classList.contains('sd-slide-out-right')
        && !image.classList.contains('sd-slide-in-left')
        && !image.classList.contains('sd-slide-in-right'))
      && images.some((image) => image.classList.contains('is-active') && image.complete && image.naturalWidth > 0);
  }, null, { timeout: 8000 });
  const result = {
    label,
    frameSamples: sample.frames.length,
    maxOverlapPx: Number(maxOverlap.toFixed(3)),
    maxGapPx: Number(maxGap.toFixed(3)),
    minFrameCoveragePercent: Number((minCoverage * 100).toFixed(2)),
    status: 'PASS'
  };
  report.transitions.push(result);
  return result;
}
async function runViewport(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const origin = new URL(report.previewUrl).origin;
  const auth = buildCloudflareAccessHeaders(process.env);
  assert.ok(auth['cf-access-client-id'] && auth['cf-access-client-secret'],
    'Both Preview Access service-token secrets are required for live browser audit.');
  report.accessServiceTokenConfigured = true;

  page.on('pageerror', (error) => report.pageErrors.push({
    viewport: viewport.name, message: sanitizeText(error.message)
  }));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    let sourceOrigin = origin;
    try { sourceOrigin = new URL(message.location().url || page.url()).origin; } catch {}
    if (sourceOrigin === origin) report.consoleErrors.push({
      viewport: viewport.name,
      message: sanitizeText(message.text()),
      url: sanitizeUrl(message.location().url || page.url())
    });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    try {
      if (new URL(response.url()).origin === origin) report.sameOriginHttpErrors.push({
        viewport: viewport.name,
        status: response.status(),
        method: response.request().method(),
        url: sanitizeUrl(response.url())
      });
    } catch {}
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    let url;
    try { url = new URL(request.url()); } catch { return route.abort(); }
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (url.origin === origin) {
      if (!['GET', 'HEAD'].includes(request.method().toUpperCase())) {
        report.readOnlyViolations.push({ viewport: viewport.name, method: request.method(), url: sanitizeUrl(request.url()) });
        return route.abort();
      }
      return route.continue({ headers: Object.assign({}, request.headers(), auth) });
    }
    if (isApprovedPreviewExternalRead(request.url(), request.method())) return route.continue();
    report.blockedExternalRequests.push({
      viewport: viewport.name,
      method: request.method(),
      host: url.hostname,
      path: sanitizeUrl(url.origin + url.pathname),
      resourceType: request.resourceType()
    });
    return route.abort();
  });

  try {
    const response = await page.goto(report.previewUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert.equal(response && response.status(), 200, 'Authenticated Preview homepage must return HTTP 200.');
    await page.waitForSelector('#catalogGrid [data-open-product]', { state: 'attached', timeout: 45000 });
    await page.waitForTimeout(2800);
    const ids = await page.locator('#catalogGrid [data-open-product]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-open-product')).filter(Boolean).slice(0, 24));
    let selected = null;
    for (const id of ids) {
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(String(id))) continue;
      const card = page.locator('#catalogGrid [data-open-product="' + id + '"]').first();
      await card.scrollIntoViewIfNeeded();
      await tap(card, viewport.mobile);
      await page.waitForFunction(() => document.querySelector('#productOverlay')?.classList.contains('open'), null, { timeout: 8000 });
      const count = await page.locator('#detailThumbs .detail-thumb').count();
      if (count >= 2) {
        selected = { id: String(id), photoCount: count };
        break;
      }
      await page.locator('#detailClose').click();
      await page.waitForFunction(() => !document.querySelector('#productOverlay')?.classList.contains('open'), null, { timeout: 8000 });
    }
    assert.ok(selected, 'No real Preview catalog product with multiple gallery photos was found among the first 24 product cards.');
    report.targetProducts.push({ viewport: viewport.name, id: selected.id, photoCount: selected.photoCount });

    await page.locator('#detailZoom').click();
    await page.waitForFunction(() => {
      const viewer = document.querySelector('#sdFullscreenViewer');
      const active = document.querySelector('#sdFullscreenImage.is-active, #sdFullscreenImageNext.is-active');
      return viewer && viewer.classList.contains('open') && active && active.complete && active.naturalWidth > 0;
    }, null, { timeout: 15000 });

    const next = page.locator('#sdFullscreenNext');
    const prev = page.locator('#sdFullscreenPrev');
    await measureTransition(page, () => tap(next, viewport.mobile), viewport.name + ' slow next');
    await measureTransition(page, () => tap(prev, viewport.mobile), viewport.name + ' slow previous');

    await page.evaluate(() => {
      const state = window.__sdGalleryRapid = {
        startedAt: performance.now(), frames: [], sawAnimation: false, quietFrames: 0, finished: false, timedOut: false
      };
      function tick() {
        if (state.finished) return;
        const one = document.querySelector('#sdFullscreenImage');
        const two = document.querySelector('#sdFullscreenImageNext');
        const frame = document.querySelector('#sdFullscreenFrame');
        const viewer = document.querySelector('#sdFullscreenViewer');
        if (viewer && viewer.classList.contains('open') && one && two && frame) {
          const an = getComputedStyle(one).animationName || 'none';
          const bn = getComputedStyle(two).animationName || 'none';
          if (an.indexOf('sdFullscreen') === 0 || bn.indexOf('sdFullscreen') === 0) {
            state.sawAnimation = true; state.quietFrames = 0;
            const a = one.getBoundingClientRect(), b = two.getBoundingClientRect(), f = frame.getBoundingClientRect();
            const left = a.left <= b.left ? a : b, right = a.left <= b.left ? b : a;
            const innerLeft = f.left + frame.clientLeft, innerRight = innerLeft + frame.clientWidth;
            state.frames.push({
              overlapPx: Number(Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left)).toFixed(3)),
              gapPx: Number(Math.max(0,right.left-left.right).toFixed(3)),
              frameWidth: frame.clientWidth,
              coveredWidth: Number(Math.max(0,Math.min(innerRight,Math.max(a.right,b.right))-Math.max(innerLeft,Math.min(a.left,b.left))).toFixed(3))
            });
          } else if (state.sawAnimation && ++state.quietFrames >= 4) { state.finished = true; return; }
        }
        if (performance.now() - state.startedAt > 12000) { state.finished = true; state.timedOut = !state.sawAnimation; return; }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    await tap(next, viewport.mobile);
    await tap(next, viewport.mobile);
    await tap(prev, viewport.mobile);
    await page.waitForFunction(() => window.__sdGalleryRapid && window.__sdGalleryRapid.finished, null, { timeout: 15000 });
    const rapid = await page.evaluate(() => window.__sdGalleryRapid);
    assert.equal(rapid.timedOut, false, viewport.name + ' rapid next-next-previous: no transition was measured.');
    assert.ok(rapid.frames.length >= 6, viewport.name + ' rapid taps: insufficient frame samples.');
    const rapidOverlap = Math.max.apply(null, rapid.frames.map((x) => x.overlapPx));
    const rapidGap = Math.max.apply(null, rapid.frames.map((x) => x.gapPx));
    const rapidCoverage = Math.min.apply(null, rapid.frames.map((x) => x.coveredWidth / Math.max(1, x.frameWidth)));
    assert.ok(rapidOverlap <= 1.5, viewport.name + ' rapid taps: overlap ' + rapidOverlap + ' CSS px.');
    assert.ok(rapidGap <= 1.5, viewport.name + ' rapid taps: gap ' + rapidGap + ' CSS px.');
    assert.ok(rapidCoverage >= 0.985, viewport.name + ' rapid taps: coverage below 98.5%.');
    report.transitions.push({
      label: viewport.name + ' rapid next-next-previous',
      frameSamples: rapid.frames.length,
      maxOverlapPx: Number(rapidOverlap.toFixed(3)),
      maxGapPx: Number(rapidGap.toFixed(3)),
      minFrameCoveragePercent: Number((rapidCoverage * 100).toFixed(2)),
      status: 'PASS'
    });
    await page.waitForFunction(() => {
      const viewer = document.querySelector('#sdFullscreenViewer');
      const images = Array.from(document.querySelectorAll('#sdFullscreenImage, #sdFullscreenImageNext'));
      return viewer && viewer.classList.contains('open')
        && images.filter((image) => image.classList.contains('is-active')).length === 1
        && images.every((image) => !image.classList.contains('sd-slide-out-left')
          && !image.classList.contains('sd-slide-out-right')
          && !image.classList.contains('sd-slide-in-left')
          && !image.classList.contains('sd-slide-in-right'))
        && images.some((image) => image.classList.contains('is-active') && image.complete && image.naturalWidth > 0);
    }, null, { timeout: 8000 });
    const settled = await page.evaluate(() => ({
      activeCount: document.querySelectorAll('#sdFullscreenImage.is-active, #sdFullscreenImageNext.is-active').length,
      badActiveCount: Array.from(document.querySelectorAll('#sdFullscreenImage.is-active, #sdFullscreenImageNext.is-active'))
        .filter((image) => !image.complete || image.naturalWidth === 0).length,
      counter: document.querySelector('#sdFullscreenCount')?.textContent || ''
    }));
    assert.equal(settled.activeCount, 1, viewport.name + ': exactly one photo must remain active.');
    assert.equal(settled.badActiveCount, 0, viewport.name + ': active photo must be decoded.');

    const screenshot = 'gallery-' + viewport.name + '.png';
    await page.locator('#sdFullscreenViewer').screenshot({ path: path.join(outputDir, screenshot), animations: 'disabled' });
    report.screenshots.push({ file: screenshot, selector: '#sdFullscreenViewer', viewport: viewport.name, status: 'CAPTURED_GALLERY_ONLY' });
  } finally {
    await context.close();
  }
}
async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const previewUrl = validatePreview(previewRaw);
  assert.equal(branch, EXPECTED_BRANCH, 'Browser audit is restricted to the authorized fix branch.');
  assert.match(headSha, /^[a-f0-9]{40}$/);
  assert.ok(/^[a-f0-9]{32}$/i.test(accountId), 'Cloudflare account ID is required.');
  assert.ok(apiToken, 'Read-only Cloudflare Pages metadata token is required.');
  assert.equal(git(['rev-parse', 'HEAD']).toLowerCase(), headSha, 'Checkout must equal workflow commit SHA.');

  const publicSha = git(['log', '-1', '--format=%H', '--', 'public/index.html']).toLowerCase();
  assert.match(publicSha, /^[a-f0-9]{40}$/);
  execFileSync('git', ['merge-base', '--is-ancestor', publicSha, headSha], { stdio: 'ignore' });
  git(['diff', '--quiet', publicSha, headSha, '--', 'public']);
  report.publicSourceSha = publicSha;
  report.previewUrl = previewUrl.origin;
  const deployment = await verifyDeployedPreview(previewUrl, publicSha, headSha);
  report.deployedPreviewSha = deployment.deployment.commitHash;
  report.deploymentVerified = true;
  assert.equal(report.deployedPreviewSha, headSha,
    'The deployment SHA must equal the tested workflow commit, whose public tree was checked against the last source commit.');
  await writeReport();

  browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: 'mobile-360', width: 360, height: 800, mobile: true },
    { name: 'mobile-390', width: 390, height: 844, mobile: true },
    { name: 'desktop-1440', width: 1440, height: 900, mobile: false }
  ];
  for (const viewport of viewports) await runViewport(viewport);
  assert.equal(report.pageErrors.length, 0, 'Unexpected JavaScript page errors were observed during gallery audit.');
  assert.equal(report.readOnlyViolations.length, 0, 'No non-GET/HEAD requests may be attempted.');
  assert.equal(report.screenshots.length, viewports.length);
  assert.equal(report.transitions.length, viewports.length * 3);
  report.status = 'PASS';
  report.passed = true;
}
main().catch((error) => {
  report.passed = false;
  report.status = 'FAIL';
  report.error = sanitizeText(error && error.message ? error.message : 'Gallery browser audit failed.');
  console.error('Fullscreen gallery Preview audit failed: ' + report.error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  report.finishedAtUtc ||= new Date().toISOString();
  await writeReport().catch(() => {});
  if (process.env.GITHUB_STEP_SUMMARY) {
    const max = (key) => report.transitions.length ? Math.max.apply(null, report.transitions.map((item) => item[key])) : 'not measured';
    const lines = [
      '## Fullscreen gallery isolated Preview browser audit',
      '',
      '- Status: **' + report.status + '**',
      '- Scope: fullscreen product gallery only; Hero and locked sections were not captured.',
      '- Workflow SHA: ' + (report.workflowHeadSha || 'unknown'),
      '- Public/deployed SHA: ' + (report.deployedPreviewSha || report.publicSourceSha || 'unverified'),
      '- Gallery-only screenshots: ' + report.screenshots.length,
      '- Transition measurements: ' + report.transitions.length,
      '- Maximum image-layer overlap: ' + max('maxOverlapPx') + ' CSS px',
      '- Maximum image-layer gap: ' + max('maxGapPx') + ' CSS px',
      '- Page errors: ' + report.pageErrors.length,
      '- Blocked same-origin write attempts: ' + report.readOnlyViolations.length,
      '',
      'Screenshots and sanitized JSON evidence are attached as the workflow artifact.',
      ''
    ];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n')).catch(() => {});
  }
});
