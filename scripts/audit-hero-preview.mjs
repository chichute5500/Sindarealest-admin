import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const expectedBranch = 'fix/liquid-glass-audit-2026-10-19';
const expectedAssetPath = '/images/hero-upload/tb_image_share_1792519964514%20(1).png';
const requestedUrl = process.env.PREVIEW_URL || 'https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/';
const expectedSha = String(process.env.GITHUB_SHA || '').trim();
const branch = String(process.env.GITHUB_REF_NAME || '').trim();
const outputDir = path.resolve('artifacts/hero-preview-audit');

function requirePreviewUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:'
      || url.hostname !== 'fix-liquid-glass-audit-2026.sindarealest2.pages.dev'
      || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Refused: Hero audit is restricted to the approved non-production Preview alias.');
  }
  return url;
}
function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return url.origin === preview.origin ? url.pathname : url.origin + url.pathname;
  } catch {
    return '[unparseable-url]';
  }
}
function intersect(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return { width, height, area: width * height };
}

const preview = requirePreviewUrl(requestedUrl);
if (branch !== expectedBranch || !/^[a-f0-9]{40}$/i.test(expectedSha)) {
  throw new Error('Refused: expected the exact authorized fix branch and a full source SHA.');
}
await fs.mkdir(outputDir, { recursive: true });
const accessHeaders = buildCloudflareAccessHeaders();
const audit = {
  auditType: 'hero-only-preview-browser-audit',
  sourceSha: expectedSha,
  branch,
  previewUrl: preview.origin,
  assetPath: expectedAssetPath,
  requiredViewports: [
    { name: 'mobile-360', width: 360, height: 800 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'phone-desktop-mode-980', width: 980, height: 800, hasTouch: true },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'desktop-1365', width: 1365, height: 768 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ],
  themes: ['light', 'dark'],
  results: [],
  consoleErrors: [],
  pageErrors: [],
  sameOriginHttpErrors: [],
  sameOriginFailedRequests: [],
  blockedExternalRequests: [],
  readOnlyViolations: [],
  expectedBlockedExternalWarnings: [],
  capturedAt: new Date().toISOString(),
};
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of audit.requiredViewports) {
    for (const theme of audit.themes) {
      const label = viewport.name + '-' + theme;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: Boolean(viewport.hasTouch),
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const imageResponses = [];
      const blockedForContext = [];
      await context.addInitScript((selectedTheme) => {
        try { localStorage.setItem('sd-theme-mode', selectedTheme); } catch {}
      }, theme);

      await page.route('**/*', async (route) => {
        const request = route.request();
        let url;
        try { url = new URL(request.url()); } catch {
          audit.readOnlyViolations.push({ context: label, url: '[unparseable-url]', method: request.method() });
          await route.abort('blockedbyclient');
          return;
        }
        if (url.origin === preview.origin) {
          if (!['GET', 'HEAD'].includes(request.method().toUpperCase())) {
            audit.readOnlyViolations.push({ context: label, url: safeUrl(request.url()), method: request.method() });
            await route.abort('blockedbyclient');
            return;
          }
          await route.continue({ headers: { ...request.headers(), ...accessHeaders } });
          return;
        }
        if (isApprovedPreviewExternalRead(request.url(), request.method())) {
          await route.continue();
          return;
        }
        const blocked = { context: label, origin: url.origin, path: url.pathname, method: request.method() };
        audit.blockedExternalRequests.push(blocked);
        blockedForContext.push(blocked);
        await route.abort('blockedbyclient');
      });

      page.on('response', (response) => {
        let url;
        try { url = new URL(response.url()); } catch { return; }
        if (url.origin === preview.origin && response.status() >= 400) {
          audit.sameOriginHttpErrors.push({
            context: label, status: response.status(), url: safeUrl(response.url()),
          });
        }
        if (url.origin === preview.origin && url.pathname === expectedAssetPath) {
          imageResponses.push({ status: response.status(), path: url.pathname });
        }
      });
      page.on('requestfailed', (request) => {
        let url;
        try { url = new URL(request.url()); } catch { return; }
        if (url.origin === preview.origin) {
          audit.sameOriginFailedRequests.push({
            context: label, url: safeUrl(request.url()), failure: request.failure()?.errorText || 'unknown',
          });
        }
      });
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text().slice(0, 500);
        if (/cloudflareinsights|ERR_BLOCKED_BY_CLIENT/i.test(text)) {
          audit.expectedBlockedExternalWarnings.push({ context: label, message: text });
        } else {
          audit.consoleErrors.push({ context: label, message: text, url: safeUrl(message.location()?.url || preview.origin) });
        }
      });
      page.on('pageerror', (error) => {
        audit.pageErrors.push({ context: label, message: String(error.message || error).slice(0, 500) });
      });

      let result = { context: label, viewport, theme, pass: false, failures: [] };
      try {
        const response = await page.goto(preview.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
        result.documentStatus = response?.status() ?? null;
        if (!response || !response.ok()) throw new Error('Preview document did not return HTTP 2xx.');
        await page.waitForFunction((assetPath) => {
          const image = document.querySelector('#heroProductImage');
          return Boolean(image && !image.hidden
            && (image.getAttribute('src') || '').endsWith(assetPath)
            && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
        }, expectedAssetPath, { timeout: 25000 });
        await page.locator('#heroProductImage').evaluate((image) => image.decode());
        await page.waitForFunction(() => {
          const splash = document.querySelector('#welcomeSplash');
          if (!splash) return true;
          const style = getComputedStyle(splash);
          return splash.hidden || style.display === 'none' || style.visibility === 'hidden'
            || Number.parseFloat(style.opacity || '1') < 0.01;
        }, null, { timeout: 12000 });
        await page.evaluate((selectedTheme) => {
          const root = document.documentElement;
          root.dataset.themeMode = selectedTheme;
          root.classList.toggle('dark', selectedTheme === 'dark');
          root.classList.remove('theme-transitioning');
          const meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.content = selectedTheme === 'dark' ? '#061522' : '#eaf3fb';
        }, theme);
        await page.waitForTimeout(300);

        result.metrics = await page.evaluate((args) => {
          const image = document.querySelector('#heroProductImage');
          const frame = document.querySelector('#home .hero-visual');
          const copy = document.querySelector('#home .hero-copy');
          const hero = document.querySelector('#home.hero');
          const rect = (element) => {
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          if (!image || !frame || !copy || !hero) return { structurePresent: false };
          const imageRect = rect(image);
          const copyRect = rect(copy);
          const frameRect = rect(frame);
          const imageStyle = getComputedStyle(image);
          const contactNode=frame.querySelector('.hero-visual-glow');
          const contactStyle=contactNode?getComputedStyle(contactNode):null;
          const contactShadow=contactNode?{
            display:contactStyle.display,background:contactStyle.backgroundImage,
            zIndex:contactStyle.zIndex,rect:rect(contactNode)
          }:null;
          const topStyle = getComputedStyle(frame,'::before');
          const frontStyle = getComputedStyle(frame,'::after');
          const pedestal={oval:{content:topStyle.content,filter:topStyle.filter,background:topStyle.backgroundImage,
            left:Number.parseFloat(topStyle.left),top:Number.parseFloat(topStyle.top),width:Number.parseFloat(topStyle.width),height:Number.parseFloat(topStyle.height)},
            face:{content:frontStyle.content,top:Number.parseFloat(frontStyle.top),width:Number.parseFloat(frontStyle.width),height:Number.parseFloat(frontStyle.height),clipPath:frontStyle.clipPath,borderRadius:frontStyle.borderRadius,maskImage:frontStyle.maskImage}};
          const imageVisible = !image.hidden && imageStyle.display !== 'none'
            && imageStyle.visibility !== 'hidden' && Number.parseFloat(imageStyle.opacity || '1') > 0
            && imageRect.width > 1 && imageRect.height > 1;
          let alphaBounds = null;
          let alphaStats = null;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
            let transparentPixels = 0, semitransparentPixels = 0, opaquePixels = 0;
            for (let index = 3, pixel = 0; index < pixels.length; index += 4, pixel++) {
              const alpha = pixels[index];
              if (alpha === 0) transparentPixels++; else if (alpha === 255) opaquePixels++; else semitransparentPixels++;
              if (alpha > 16) {
                const x = pixel % canvas.width, y = Math.floor(pixel / canvas.width);
                if (x < minX) minX=x; if (x > maxX) maxX=x; if (y < minY) minY=y; if (y > maxY) maxY=y;
              }
            }
            const totalPixels = canvas.width * canvas.height;
            if (maxX >= minX && maxY >= minY) {
              alphaBounds = {left:minX/canvas.width,right:(maxX+1)/canvas.width,top:minY/canvas.height,bottom:(maxY+1)/canvas.height};
            }
            alphaStats = {
              width:canvas.width,height:canvas.height,
              transparentPixels,transparentRatio:transparentPixels/totalPixels,
              semitransparentPixels,opaquePixels,opaqueRatio:opaquePixels/totalPixels,
              visibleBounds:maxX>=minX&&maxY>=minY?{left:minX,top:minY,right:maxX,bottom:maxY}:null,
              corners:{topLeft:pixels[3],topRight:pixels[(canvas.width-1)*4+3],
                bottomLeft:pixels[((canvas.height-1)*canvas.width)*4+3],
                bottomRight:pixels[(totalPixels-1)*4+3]},
            };
          } catch (error) {
            alphaBounds = { error: String(error.message || error).slice(0, 200) };
          }
          let visibleProductRect = null;
          let copyOverlap = null;
          if (alphaBounds && !alphaBounds.error) {
            // object-fit:contain may letterbox the bitmap inside a wider CSS box. Map PNG alpha
            // coordinates to the actual rendered bitmap, not the entire img element's bounding box.
            const scale = Math.min(imageRect.width / image.naturalWidth, imageRect.height / image.naturalHeight);
            const bitmapRect = {
              left: imageRect.left + (imageRect.width - image.naturalWidth * scale) / 2,
              top: imageRect.top + (imageRect.height - image.naturalHeight * scale) / 2,
              width: image.naturalWidth * scale,
              height: image.naturalHeight * scale,
            };
            visibleProductRect = {
              left: bitmapRect.left + alphaBounds.left * bitmapRect.width,
              right: bitmapRect.left + alphaBounds.right * bitmapRect.width,
              top: bitmapRect.top + alphaBounds.top * bitmapRect.height,
              bottom: bitmapRect.top + alphaBounds.bottom * bitmapRect.height,
            };
            visibleProductRect.width = visibleProductRect.right - visibleProductRect.left;
            visibleProductRect.height = visibleProductRect.bottom - visibleProductRect.top;
            // The .hero-copy container includes wide empty layout space. Measure painted text line fragments
            // and the CTA hit target separately, so harmless container whitespace is not misreported as overlap.
            const paintedCopyRects = [];
            const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
            let textNode;
            while ((textNode = walker.nextNode())) {
              if (!String(textNode.nodeValue || '').trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(textNode);
              for (const r of range.getClientRects()) {
                if (r.width > 0.5 && r.height > 0.5) {
                  paintedCopyRects.push({ left:r.left, right:r.right, top:r.top, bottom:r.bottom, kind:'text-line' });
                }
              }
            }
            for (const control of copy.querySelectorAll('.hero-actions a,.hero-actions button,.hero-actions [role="button"]')) {
              const r = control.getBoundingClientRect();
              const style = getComputedStyle(control);
              if (style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0.5 && r.height > 0.5) {
                paintedCopyRects.push({ left:r.left, right:r.right, top:r.top, bottom:r.bottom, kind:'action-control' });
              }
            }
            const intersections = paintedCopyRects.map((r) => {
              const width = Math.max(0, Math.min(visibleProductRect.right, r.right) - Math.max(visibleProductRect.left, r.left));
              const height = Math.max(0, Math.min(visibleProductRect.bottom, r.bottom) - Math.max(visibleProductRect.top, r.top));
              return { kind:r.kind, width, height, area:width*height };
            }).filter((item) => item.area > 0.01);
            copyOverlap = {
              area: intersections.reduce((sum, item) => sum + item.area, 0),
              intersectingFragments: intersections.length,
              maxFragmentArea: intersections.reduce((max, item) => Math.max(max, item.area), 0),
              copyFragmentCount: paintedCopyRects.length,
            };
          }
          const rootDark = document.documentElement.classList.contains('dark');
          return {
            source: image.getAttribute('src') || '',
            currentSrcPath: (() => { try { return new URL(image.currentSrc).pathname; } catch { return ''; } })(),
            status: image.dataset.productImageStatus || '',
            hidden: image.hidden,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            imageVisible,
            frameVisible: getComputedStyle(frame).display !== 'none' && frameRect.width > 1 && frameRect.height > 1,
            objectFit: imageStyle.objectFit,
            objectPosition: imageStyle.objectPosition,
            filter: imageStyle.filter,
            imageRect, frameRect, copyRect, heroRect:rect(hero), visibleProductRect, alphaBounds, alphaStats, copyOverlap, pedestal, contactShadow,
            compactTouchDesktop: {
              matches: matchMedia('(pointer: coarse) and (min-width:761px)').matches,
              desktopLinksDisplay: getComputedStyle(document.querySelector('.navlinks')).display,
              menuButtonDisplay: getComputedStyle(document.querySelector('#menuToggle')).display,
              productColumns: getComputedStyle(document.querySelector('.featured-grid')).gridTemplateColumns,
            },
            productWithinHorizontalViewport: !visibleProductRect || (visibleProductRect.left >= -1 && visibleProductRect.right <= window.innerWidth + 1),
            expectedThemeApplied: rootDark === (args.theme === 'dark'),
            viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth },
            noHorizontalPageOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
          };
        }, { theme });

        const m = result.metrics;
        // Preserve a Hero-only PNG even when a visual assertion fails, so the failure is inspectable.
        try {
          const filename = label + '-hero.png';
          await page.locator('#home').screenshot({
            path: path.join(outputDir, filename), type: 'png', animations: 'disabled', timeout: 30000,
          });
          result.screenshot = filename;
          if (viewport.hasTouch) {
            await page.screenshot({
              path:path.join(outputDir,label+'-full-page.png'),fullPage:true,animations:'disabled',timeout:30000,
            });
          }
        } catch (error) {
          result.failures.push('Hero screenshot capture failed: ' + String(error.message || error).slice(0, 400));
        }
        const fail = (message) => result.failures.push(message);
        if (!m.source.endsWith(expectedAssetPath) || m.currentSrcPath !== expectedAssetPath) fail('Wrong Hero PNG source.');
        if (m.status !== 'owner-presentation-image-active') fail('Hero presentation-image status is not active.');
        if (m.hidden || !m.complete || m.naturalWidth < 1 || m.naturalHeight < 1) fail('Hero PNG is hidden, undecoded, or has zero natural dimensions.');
        if (!m.imageVisible || !m.frameVisible) fail('Hero image or frame is not visible.');
        if (m.objectFit !== 'contain') fail('Hero image object-fit is not contain.');
        if (m.viewport.width <= 390 && m.visibleProductRect && m.visibleProductRect.width < (m.viewport.width <= 360 ? 150 : 165)) fail('Mobile Hero product is too small compared with the reference image.');
        if(m.viewport.width<=390){
          const pl=m.pedestal;
          if(!pl||pl.oval.content==='none'||pl.oval.filter!=='none'||pl.oval.background==='none'||!Number.isFinite(pl.oval.top)||!Number.isFinite(pl.face.top))
            fail('Marble pedestal is suppressed by stale glow rules.');
          else if(pl.oval.top/m.frameRect.height<.65||pl.oval.top/m.frameRect.height>.90
            ||pl.face.top<=pl.oval.top||pl.face.top-pl.oval.top-pl.oval.height>10
            ||pl.oval.width<m.heroRect.width*.50||pl.oval.width>m.heroRect.width*.68)
            fail('Marble top/front are detached or incorrectly scaled.');
        }
        if (m.viewport.width <= 390) {
          const st=m.pedestal;
          if (!st || st.face.clipPath !== 'none' || !String(st.face.borderRadius).includes('22%')
              || !String(st.face.maskImage).includes('linear-gradient') || !Number.isFinite(st.face.height) || st.face.height < 33 || st.face.height > 42
              || st.face.top < st.oval.top + st.oval.height - 11
              || st.face.top > st.oval.top + st.oval.height + 4) {
            fail('Mobile marble shelf must join the raised shoe support surface and extend down naturally.');
          }
        }
        if (m.viewport.width <= 390) {
          const imageTopOffset=m.imageRect.top-m.frameRect.top;
          if (imageTopOffset < -45 || imageTopOffset > -38) fail('Mobile shoes float too far above the calibrated marble contact position.');
        }
        if (m.viewport.width <= 390) {
          const c=m.contactShadow;
          if (!c || c.display==='none' || c.zIndex!=='1' || !c.background.includes('radial-gradient')
              || !c.rect || c.rect.width < 180 || c.rect.height < 20) {
            fail('Mobile shoe contact shadow is missing, hidden or not layered between marble and PNG.');
          }
          if (!m.filter.includes('rgba(14, 30, 42, 0.1) 0px 5px 5px') || !m.filter.includes('rgba(8, 19, 29, 0.16) 0px 2px 2px') || m.filter.includes('0px 12px 16px')) {
            fail('Mobile shoes still use the old airy drop-shadow instead of restrained ground shadow.');
          }
        }
        if (m.viewport.width <= 390) {
          if (!m.heroRect || m.heroRect.height > 245 || m.heroRect.height < 195) fail('Mobile Hero no longer matches the short reference-height composition.');
          if (!m.visibleProductRect || m.visibleProductRect.top >= m.copyRect.bottom - 50) fail('Mobile Hero shoes fell below the copy instead of floating beside it.');
          if (m.visibleProductRect && m.visibleProductRect.bottom > m.heroRect.bottom + 2) fail('Visible shoes are clipped past the Hero frame.');
          if (m.visibleProductRect && (m.visibleProductRect.left < m.viewport.width*.43 || m.visibleProductRect.left > m.viewport.width*.63)) fail('Mobile Hero shoes do not start in the right-hand image column.');
        }
        if (viewport.hasTouch) {
          const compact=m.compactTouchDesktop;
          if(!compact.matches || compact.desktopLinksDisplay!=='none' || compact.menuButtonDisplay==='none')
            fail('Touch desktop mode must show the compact hamburger header rather than miniature full desktop links.');
          const colSizes=(compact.productColumns||'').split(' ').filter(Boolean);
          if(colSizes.length!==2)
            fail('Touch desktop mode must expose two usable product columns, not four tiny cards.');
        }
        if (m.viewport.width >= 761 && m.viewport.width <= 1000 && (!m.visibleProductRect || m.visibleProductRect.width < 280 || m.visibleProductRect.width > 400)) fail('Tablet/touch desktop Hero product must have a realistic, bounded size.');
        if (m.viewport.width >= 761 && m.viewport.width <= 1000) {
          const p=m.pedestal?.oval;
          if (!p||!Number.isFinite(p.left)||!Number.isFinite(p.width)) fail('Tablet marble pedestal geometry unavailable.');
          else {
            const left=m.frameRect.left+p.left-p.width/2;
            if (left < -1 || left + p.width > m.viewport.width + 1) fail('Tablet marble pedestal extends outside the viewport.');
          }
        }
        if (m.viewport.width >= 761) {
          const maxHeight=m.viewport.width>=1001?485:575;
          if(!m.heroRect || m.heroRect.height>maxHeight || m.heroRect.height<(m.viewport.width>=1001?400:430)) fail('Desktop/tablet Hero is oversized or collapsed.');
          if(!m.pedestal || m.pedestal.face.clipPath!=='none' || !String(m.pedestal.face.maskImage).includes('linear-gradient'))
            fail('Desktop/tablet Hero uses a detached polygon platform instead of the shared curved stone shelf.');
          if(!m.contactShadow || m.contactShadow.display==='none'||!m.contactShadow.background.includes('radial-gradient'))
            fail('Desktop/tablet Hero lacks the shared dual shoe-contact shadow.');
          if(m.visibleProductRect && m.heroRect && (m.visibleProductRect.top<m.heroRect.top-5 || m.visibleProductRect.bottom>m.heroRect.bottom+5))
            fail('Desktop/tablet shoe pixels extend outside the bounded Hero.');
        }
        if (m.viewport.width >= 1001) {
          const ratio = m.imageRect.height > 0 ? m.imageRect.width / m.imageRect.height : 0;
          if (ratio < 0.70 || ratio > 0.80) fail('Desktop Hero PNG is being squeezed by a mismatched CSS box ratio.');
          const minimumProductWidth = m.viewport.width >= 1400 ? 340 : 315;
          const maximumProductWidth = m.viewport.width >= 1400 ? 390 : 370;
          if (!m.visibleProductRect || m.visibleProductRect.width < minimumProductWidth || m.visibleProductRect.width > maximumProductWidth)
            fail('Desktop Hero product must be scaled realistically (not cropped by header or exaggerated).');
          const ovalTop=m.frameRect.top + m.pedestal.oval.top;
          const shoeToOval=m.visibleProductRect?.bottom - ovalTop;
          if(!Number.isFinite(shoeToOval) || shoeToOval < -3 || shoeToOval > 46)
            fail('Compact desktop shoe soles must touch the downsized marble plane, not hover or sink through it.');
          if (m.heroRect.height > 470) fail('Owner-marked desktop Hero boundary must stay above 470px.');

        }
        if (!String(m.filter).includes('drop-shadow')) fail('Hero image is missing the restrained drop shadow.');
        if (!m.expectedThemeApplied) fail('Requested light/dark theme was not applied.');
        if (!m.productWithinHorizontalViewport) fail('Visible shoe pixels extend beyond the viewport horizontally.');
        if (m.copyOverlap && m.copyOverlap.area > 1) fail('Visible shoe pixels overlap Hero copy.');
        if (!m.alphaBounds || m.alphaBounds.error) fail('Could not inspect the PNG alpha silhouette in-browser.');
        if (!m.alphaStats || m.alphaStats.transparentRatio < 0.2) fail('Hero PNG lacks substantial transparent background.');
        if (!m.alphaStats || m.alphaStats.opaqueRatio < 0.1) fail('Hero PNG lacks substantial opaque shoe pixels.');
        if (!m.alphaStats || m.alphaStats.semitransparentPixels < 1) fail('Hero PNG lacks anti-aliased alpha edges.');
        if (m.alphaStats && Object.values(m.alphaStats.corners).some(alpha => alpha !== 0)) fail('Hero PNG corners are not transparent; source may contain a rectangular background.');
        if (m.alphaStats && (!m.alphaStats.visibleBounds || m.alphaStats.visibleBounds.left <= 0 || m.alphaStats.visibleBounds.top <= 0 || m.alphaStats.visibleBounds.right >= m.alphaStats.width - 1 || m.alphaStats.visibleBounds.bottom >= m.alphaStats.height - 1)) fail('Visible shoe pixels touch the source PNG border and may be clipped.');
        if (!m.noHorizontalPageOverflow) fail('Hero layout creates horizontal page overflow.');
        if (!imageResponses.some((entry) => entry.status === 200)) fail('The Hero PNG did not return HTTP 200.');
        if (audit.readOnlyViolations.some((entry) => entry.context === label)) fail('A write/non-GET request was attempted and blocked.');
        if (audit.sameOriginHttpErrors.some((entry) => entry.context === label && entry.url === expectedAssetPath)) fail('The Hero PNG response returned an HTTP error.');
        result.imageResponse = imageResponses;
      } catch (error) {
        result.failures.push(String(error.message || error).slice(0, 700));
      }
      result.pass = result.failures.length === 0;
      result.blockedExternalRequestCount = blockedForContext.length;
      audit.results.push(result);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
audit.hardFailures = [
  ...audit.results.filter((item) => !item.pass).map((item) => item.context + ': ' + item.failures.join('; ')),
  ...audit.pageErrors.map((item) => item.context + ': page error: ' + item.message),
  ...audit.consoleErrors.map((item) => item.context + ': console error: ' + item.message),
  ...audit.sameOriginHttpErrors.filter((item) => item.url === '/' || item.url === expectedAssetPath)
    .map((item) => item.context + ': HTTP ' + item.status + ' ' + item.url),
  ...audit.sameOriginFailedRequests.filter((item) => item.url === '/' || item.url === expectedAssetPath)
    .map((item) => item.context + ': failed request ' + item.url + ' (' + item.failure + ')'),
  ...audit.readOnlyViolations.map((item) => item.context + ': blocked non-read request ' + item.method + ' ' + item.url),
];
audit.passed = audit.results.length === audit.requiredViewports.length * audit.themes.length
  && audit.results.every((item) => item.pass)
  && audit.hardFailures.length === 0;
audit.completedAt = new Date().toISOString();
await fs.writeFile(path.join(outputDir, 'hero-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({
  passed: audit.passed,
  sourceSha: audit.sourceSha,
  previewUrl: audit.previewUrl,
  contexts: audit.results.map((item) => ({
    context: item.context, pass: item.pass, failures: item.failures,
    naturalWidth: item.metrics?.naturalWidth, naturalHeight: item.metrics?.naturalHeight,
    alphaStats: item.metrics?.alphaStats, objectFit: item.metrics?.objectFit, filter: item.metrics?.filter,
    copyOverlap: item.metrics?.copyOverlap, screenshot: item.screenshot,
  })),
  consoleErrors: audit.consoleErrors.length,
  pageErrors: audit.pageErrors.length,
  relevantHttpErrors: audit.hardFailures.filter((item) => /HTTP /.test(item)).length,
  sameOriginFailedRequests: audit.sameOriginFailedRequests.length,
  blockedExternalRequests: audit.blockedExternalRequests.length,
  readOnlyViolations: audit.readOnlyViolations.length,
  report: 'artifacts/hero-preview-audit/hero-audit.json',
}));
if (!audit.passed) process.exitCode = 1;
