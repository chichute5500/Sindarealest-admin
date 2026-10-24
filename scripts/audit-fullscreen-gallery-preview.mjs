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
async function activateAndVerifyCounter(page, activate, delta, label) {
  const beforeText = String(await page.locator('#sdFullscreenCount').textContent() || '').trim();
  const beforeMatch = beforeText.match(/(\d+)\s*\/\s*(\d+)/);
  if (!beforeMatch) throw new Error(label + ': could not parse the current photo counter: ' + beforeText);
  const beforeIndex = Number(beforeMatch[1]);
  const total = Number(beforeMatch[2]);
  const expectedIndex = ((beforeIndex - 1 + delta + total) % total) + 1;
  const expectedText = String(expectedIndex).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  await activate();
  await page.waitForFunction((expected) => {
    const node = document.querySelector('#sdFullscreenCount');
    return String(node?.textContent || '').trim() === expected.text;
  }, { text: expectedText }, { timeout: 3000 });
  const afterText = String(await page.locator('#sdFullscreenCount').textContent() || '').trim();
  return { before: beforeText, after: afterText, expected: expectedText, delta, total };
}
async function inspectFadeOpacity(page, label) {
  const measured = await page.evaluate(() => {
    const imageNodes = [
      document.querySelector('#sdFullscreenImage'),
      document.querySelector('#sdFullscreenImageNext')
    ].filter(Boolean);
    const incoming = imageNodes.find((image) => image.classList.contains('sd-fade-in'));
    const outgoing = incoming ? imageNodes.find((image) => image !== incoming) : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitions = incoming ? incoming.getAnimations().filter((transition) =>
      String(transition.transitionProperty || '') === 'opacity' && transition.playState === 'running') : [];
    const activeClasses = imageNodes.map((image) => ({
      id: image.id,
      classes: ['is-active','sd-fade-in','sd-fade-out','sd-no-transition'].filter((name) => image.classList.contains(name)),
      opacity: Number(getComputedStyle(image).opacity),
      zIndex: getComputedStyle(image).zIndex
    }));
    if (!incoming || !outgoing || !transitions.length) {
      return { found: false, reducedMotion, transitionCount: transitions.length, durationsMs: [], frames: [], activeClasses };
    }
    const durationsMs = transitions.map((transition) => Number(transition.effect && transition.effect.getTiming().duration));
    transitions.forEach((transition) => transition.pause());
    const progress = [0, 0.25, 0.5, 0.75, 0.99];
    const frames = [];
    for (const amount of progress) {
      transitions.forEach((transition) => {
        const duration = Number(transition.effect && transition.effect.getTiming().duration);
        transition.currentTime = Number.isFinite(duration) ? Math.max(0, Math.min(duration * amount, duration - 0.01)) : 0;
      });
      void document.body.offsetWidth;
      frames.push({
        progress: amount,
        incomingOpacity: Number(getComputedStyle(incoming).opacity),
        outgoingOpacity: Number(getComputedStyle(outgoing).opacity),
        incomingActive: incoming.classList.contains('is-active'),
        outgoingActive: outgoing.classList.contains('is-active'),
        incomingAboveOutgoing: Number(getComputedStyle(incoming).zIndex) > Number(getComputedStyle(outgoing).zIndex)
      });
    }
    const duration = durationsMs[0];
    transitions.forEach((transition) => {
      transition.currentTime = Number.isFinite(duration) ? Math.max(0, duration * 0.5) : 0;
      transition.pause();
    });
    return {
      found: true,
      reducedMotion,
      transitionCount: transitions.length,
      transitionProperty: transitions.map((transition) => String(transition.transitionProperty || '')),
      durationsMs,
      incomingId: incoming.id,
      outgoingId: outgoing.id,
      activeClasses,
      frames
    };
  });
  if (!measured.found) throw new Error(label + ': incoming CSS opacity transition was not running; reduced motion=' + measured.reducedMotion + ', transitions=' + measured.transitionCount + '.');

  const outgoingValues = measured.frames.map((frame) => frame.outgoingOpacity);
  const incomingValues = measured.frames.map((frame) => frame.incomingOpacity);
  const minimumOutgoingOpacity = Math.min.apply(null, outgoingValues);
  const maximumOutgoingOpacity = Math.max.apply(null, outgoingValues);
  const incomingStartsHidden = incomingValues[0] <= 0.08;
  const incomingEndsVisible = incomingValues[incomingValues.length - 1] >= 0.90;
  const incomingMonotonic = incomingValues.every((opacity, i) => i === 0 || opacity + 0.025 >= incomingValues[i - 1]);
  const issues = [];
  if (measured.reducedMotion) issues.push('Unexpected prefers-reduced-motion=reduce in a no-preference audit context.');
  if (measured.transitionCount !== 1) issues.push('Expected one incoming opacity transition; found ' + measured.transitionCount + '.');
  if (measured.transitionProperty.some((property) => property !== 'opacity')) issues.push('Unexpected non-opacity transition: ' + measured.transitionProperty.join(', ') + '.');
  if (measured.durationsMs.some((duration) => !Number.isFinite(duration) || duration < 240 || duration > 260)) {
    issues.push('Expected a 250ms opacity transition; found ' + measured.durationsMs.join(', ') + 'ms.');
  }
  if (minimumOutgoingOpacity < 0.985 || maximumOutgoingOpacity > 1.015) {
    issues.push('Outgoing photo was not held fully opaque during the fade: ' + outgoingValues.join(', ') + '.');
  }
  if (!incomingStartsHidden || !incomingEndsVisible || !incomingMonotonic) {
    issues.push('Incoming opacity did not progress monotonically from hidden to visible: ' + incomingValues.join(', ') + '.');
  }
  if (measured.frames.some((frame) => !frame.incomingActive || !frame.outgoingActive || !frame.incomingAboveOutgoing)) {
    issues.push('Both decoded layers must remain active during the crossfade, with incoming above outgoing.');
  }

  const result = {
    label,
    samplingMode: 'paused CSS opacity transition sampled at 0/25/50/75/99 percent; midpoint screenshot captured',
    reducedMotion: measured.reducedMotion,
    transitionProperty: measured.transitionProperty,
    transitionDurationsMs: measured.durationsMs,
    incomingImageId: measured.incomingId,
    outgoingImageId: measured.outgoingId,
    activeLayerClasses: measured.activeClasses,
    frameSamples: measured.frames.length,
    minimumOutgoingOpacity: Number(minimumOutgoingOpacity.toFixed(3)),
    maximumOutgoingOpacity: Number(maximumOutgoingOpacity.toFixed(3)),
    incomingOpacityAt0Percent: Number(incomingValues[0].toFixed(3)),
    incomingOpacityAt99Percent: Number(incomingValues[incomingValues.length - 1].toFixed(3)),
    measuredOpacityFrames: measured.frames,
    status: issues.length ? 'FAIL' : 'PASS',
    issues
  };
  report.transitions.push(result);

  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const screenshot = 'gallery-transition-mid-' + safeLabel + '.png';
  await page.locator('#sdFullscreenViewer').screenshot({ path: path.join(outputDir, screenshot) });
  report.screenshots.push({ file: screenshot, selector: '#sdFullscreenViewer', label, phase: '50-percent-opacity-transition', status: 'CAPTURED_GALLERY_TRANSITION_ONLY' });

  await page.evaluate(() => {
    const imageNodes = [
      document.querySelector('#sdFullscreenImage'),
      document.querySelector('#sdFullscreenImageNext')
    ].filter(Boolean);
    imageNodes.flatMap((image) => image.getAnimations().filter((transition) =>
      String(transition.transitionProperty || '') === 'opacity' && transition.playState === 'paused'))
      .forEach((transition) => {
        const duration = Number(transition.effect && transition.effect.getTiming().duration);
        transition.currentTime = Number.isFinite(duration) ? Math.max(0, duration - 0.01) : 0;
        transition.play();
      });
  });

  assert.equal(issues.length, 0, label + ': ' + issues.join(' '));
  return result;
}

async function measureTransition(page, activate, delta, label) {
  const counterProgress = await activateAndVerifyCounter(page, activate, delta, label);
  await page.waitForFunction(() => {
    const transitionClasses = [
      ['sd-slide-out-left', 'sdFullscreenOutLeft'],
      ['sd-slide-out-right', 'sdFullscreenOutRight'],
      ['sd-slide-in-left', 'sdFullscreenInLeft'],
      ['sd-slide-in-right', 'sdFullscreenInRight']
    ];
    const images = [
      document.querySelector('#sdFullscreenImage'),
      document.querySelector('#sdFullscreenImageNext')
    ].filter(Boolean);
    return images.some((image) => transitionClasses.some((item) =>
      image.classList.contains(item[0]) &&
      Array.from(image.getAnimations()).some((animation) =>
        animation.animationName === item[1] && animation.playState === 'running')));
  }, null, { timeout: 8000 });
  const result = await inspectFadeOpacity(page, label);
  result.counterProgress = counterProgress;
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
    let selected = null;
    // Walk ordinary catalog pagination (not category filters) until a real multi-photo product is found.
    for (let catalogPage = 0; catalogPage < 15 && !selected; catalogPage += 1) {
      const ids = await page.locator('#catalogGrid [data-open-product]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-open-product')).filter(Boolean));
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
      if (!selected) {
        const nextPage = page.locator('#pagination button[data-page="next"]');
        if (await nextPage.count() === 0 || await nextPage.isDisabled()) break;
        await nextPage.scrollIntoViewIfNeeded();
        await tap(nextPage, viewport.mobile);
        await page.waitForTimeout(100);
      }
    }
    assert.ok(selected, 'No real Preview catalog product with multiple gallery photos was found after traversing up to 15 ordinary catalog pages.');
    report.targetProducts.push({ viewport: viewport.name, id: selected.id, photoCount: selected.photoCount });

    await page.locator('#detailZoom').click();
    await page.waitForFunction(() => {
      const viewer = document.querySelector('#sdFullscreenViewer');
      const active = document.querySelector('#sdFullscreenImage.is-active, #sdFullscreenImageNext.is-active');
      return viewer && viewer.classList.contains('open') && active && active.complete && active.naturalWidth > 0;
    }, null, { timeout: 15000 });

    const next = page.locator('#sdFullscreenNext');
    const prev = page.locator('#sdFullscreenPrev');
    await measureTransition(page, () => tap(next, viewport.mobile), 1, viewport.name + ' slow next');
    await measureTransition(page, () => tap(prev, viewport.mobile), -1, viewport.name + ' slow previous');

    const rapidCounterSequence = [];
    rapidCounterSequence.push(await activateAndVerifyCounter(page, () => tap(next, viewport.mobile), 1, viewport.name + ' rapid tap 1 next'));
    rapidCounterSequence.push(await activateAndVerifyCounter(page, () => tap(next, viewport.mobile), 1, viewport.name + ' rapid tap 2 next'));
    rapidCounterSequence.push(await activateAndVerifyCounter(page, () => tap(prev, viewport.mobile), -1, viewport.name + ' rapid tap 3 previous'));
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
    const rapid = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('#sdFullscreenImage, #sdFullscreenImageNext'));
      return {
        activeCount: images.filter((image) => image.classList.contains('is-active')).length,
        brokenActiveCount: images.filter((image) => image.classList.contains('is-active') && (!image.complete || image.naturalWidth === 0)).length,
        staleTransitionClasses: images.filter((image) => image.classList.contains('sd-slide-out-left')
          || image.classList.contains('sd-slide-out-right')
          || image.classList.contains('sd-slide-in-left')
          || image.classList.contains('sd-slide-in-right')).length,
        counter: document.querySelector('#sdFullscreenCount')?.textContent || '',
        imageSources: images.map((image) => image.getAttribute('src') || '')
      };
    });
    assert.equal(rapid.activeCount, 1, viewport.name + ': rapid taps must settle on exactly one active image.');
    assert.equal(rapid.brokenActiveCount, 0, viewport.name + ': rapid taps must not expose an undecoded active image.');
    assert.equal(rapid.staleTransitionClasses, 0, viewport.name + ': rapid taps must clear stale transition classes.');
    assert.equal(rapid.counter.trim(), rapidCounterSequence[2].after, viewport.name + ': final counter must match the third verified tap.');
    report.transitions.push({
      label: viewport.name + ' rapid next-next-previous',
      status: 'PASS_STABLE_FINAL_STATE',
      counterSequence: rapidCounterSequence,
      activeImageCount: rapid.activeCount,
      brokenActiveImageCount: rapid.brokenActiveCount,
      staleTransitionClassCount: rapid.staleTransitionClasses,
      counter: rapid.counter,
      finalImageSourceCount: rapid.imageSources.length
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
  assert.equal(report.screenshots.length, viewports.length * 3,
    'Each viewport must capture two in-transition frames and one settled fullscreen frame.');
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
    const numeric = (key) => report.transitions.map((item) => item[key]).filter((value) => Number.isFinite(value));
    const max = (key) => { const values = numeric(key); return values.length ? Math.max.apply(null, values) : 'not measured'; };
    const min = (key) => { const values = numeric(key); return values.length ? Math.min.apply(null, values) : 'not measured'; };
    const lines = [
      '## Fullscreen gallery isolated Preview browser audit',
      '',
      '- Status: **' + report.status + '**',
      '- Scope: fullscreen product gallery only; Hero and locked sections were not captured.',
      '- Workflow SHA: ' + (report.workflowHeadSha || 'unknown'),
      '- Public/deployed SHA: ' + (report.deployedPreviewSha || report.publicSourceSha || 'unverified'),
      '- Gallery-only screenshots, including midpoint transitions: ' + report.screenshots.length,
      '- Transition measurements: ' + report.transitions.length,
      '- Minimum outgoing-image opacity during incoming fade: ' + min('minimumOutgoingOpacity'),
      '- Incoming-image opacity at 99% progress: ' + max('incomingOpacityAt99Percent'),
      '- Page errors: ' + report.pageErrors.length,
      '- Blocked same-origin write attempts: ' + report.readOnlyViolations.length,
      '',
      'Midpoint transition screenshots and sanitized JSON evidence are attached as the workflow artifact.',
      ''
    ];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n')).catch(() => {});
  }
});
