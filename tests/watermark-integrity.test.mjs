import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWatermarkSettings, validateWatermarkSettingUpdates } from '../functions/_lib/watermark-settings.js';
import { existsSync } from 'node:fs';
import { onRequestGet as publicSettingsGet } from '../functions/api/settings.js';
import { onRequestGet as publicMediaGet } from '../functions/media/[key].js';

const defaults = normalizeWatermarkSettings({});
assert.deepEqual(defaults, {
  watermarkEnabled: true,
  watermarkLogoUrl: '/watermark.webp',
  watermarkPosition: 'bottom-right',
  watermarkSize: 16,
  watermarkOpacity: 68,
}, 'Missing settings must use stable public defaults');

assert.equal(
  normalizeWatermarkSettings({ watermark_logo: '/media/wm-01234567-89ab-cdef-0123-456789abcdef.webp' }).watermarkLogoUrl,
  '/watermark.webp',
  'Saved alternate logo settings must not replace the existing SinDarealest logo',
);
assert.match(
  validateWatermarkSettingUpdates({ watermarkLogoUrl: '/media/wm-01234567-89ab-cdef-0123-456789abcdef.webp' }).error,
  /giữ nguyên/i,
  'Admin settings API must reject watermark-logo replacements',
);
assert.deepEqual(validateWatermarkSettingUpdates({
  watermarkEnabled: false,
  watermarkPosition: 'top-left',
  watermarkSize: 28,
  watermarkOpacity: 75,
}).updates, [
  ['watermark_enabled', '0'],
  ['watermark_position', 'top-left'],
  ['watermark_size', '28'],
  ['watermark_opacity', '75'],
]);
assert.match(validateWatermarkSettingUpdates({ watermarkPosition: 'outside' }).error, /vị trí/i);
assert.match(validateWatermarkSettingUpdates({ watermarkSize: 99 }).error, /6 đến 35/i);
assert.match(validateWatermarkSettingUpdates({ watermarkOpacity: 0 }).error, /10 đến 100/i);
assert.match(validateWatermarkSettingUpdates({ watermarkEnabled: 'yes' }).error, /bật hoặc tắt/i);

const mockDB = {
  prepare() {
    return { bind() { return this; }, async first() { return null; } };
  },
};
const settingsResponse = await publicSettingsGet({ env: { DB: mockDB } });
assert.equal(settingsResponse.status, 200);
const publicSettings = await settingsResponse.json();
assert.equal(publicSettings.watermarkEnabled, true);
assert.equal(publicSettings.watermarkLogoUrl, '/watermark.webp');
assert.equal(publicSettings.watermarkPosition, 'bottom-right');
assert.equal(publicSettings.watermarkSize, 16);
assert.equal(publicSettings.watermarkOpacity, 68);

const uploadSource = readFileSync(new URL('../functions/api/admin/upload.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('const privateKey = `private-originals/${id}.${originalType}`'), 'Every original must use a private-only prefix so it cannot collide with flat public WebP keys');

const inaccessibleOriginal = await publicMediaGet({
  params: { key: 'private-originals/01234567-89ab-cdef-0123-456789abcdef.webp' },
  env: { IMAGES: { get() { throw new Error('Private originals must never reach R2.get through /media/[key]'); } } },
});
assert.equal(inaccessibleOriginal.status, 404, 'WebP originals under the private prefix must not be retrievable through the public media route');

const publicPage = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const protectionScriptStart = publicPage.indexOf('<script id="sd-protection-script">');
const protectionScriptEnd = publicPage.indexOf('</script>', protectionScriptStart);
const protectionScript = publicPage.slice(protectionScriptStart, protectionScriptEnd);
assert.ok(protectionScript.includes("document.querySelector('.detail-image-stage')"), 'Watermark must be scoped to the large detail viewer');
assert.ok(!protectionScript.includes("document.querySelectorAll('.product-photo"), 'Watermark must not be overlaid on product-list cards');
assert.ok(!protectionScript.includes('.detail-thumb'), 'Watermark must not be overlaid on detail thumbnails');
assert.ok(protectionScript.includes("window.__sdUpdateDetailWatermark"), 'Detail watermark settings must be applied dynamically');
assert.ok(publicPage.includes('id="sdFullscreenViewer"'), 'Product detail must provide a separate full-screen image viewer');
assert.ok(publicPage.includes('id="detailZoom"'), 'Product detail must expose an explicit control to open the full-size view');
assert.ok(publicPage.includes('id="sdFullscreenPrev"') && publicPage.includes('id="sdFullscreenNext"'), 'Full-screen view must allow browsing all product images');
assert.ok(publicPage.includes('id="sdFullscreenWatermark"'), 'The full-screen view must retain the existing SinDarealest watermark overlay');
assert.ok(publicPage.includes("function openFullscreenImage()"), 'Tapping the detailed product image must open the full-screen viewer');
assert.ok(protectionScript.includes("fullMark=document.getElementById('sdFullscreenWatermark')"), 'Full-screen watermark must use the same admin settings for position, size, and opacity');
assert.ok(publicPage.includes('.sd-fullscreen-image{display:block;width:100%;height:100%;max-width:none;max-height:none;object-fit:fill;object-position:center'), 'The full-screen image must fill an aspect-ratio-matched frame without cropping or distortion');
assert.ok(publicPage.includes('id="sdFullscreenFrame"'), 'Full-screen image and overlay watermark must share an aspect-ratio-matched photo frame');
assert.ok(publicPage.includes('function sizeFullscreenFrame()'), 'Full-screen frame must size itself using the loaded image dimensions');
assert.ok(publicPage.includes('window.__sdUpdateDetailWatermark?.()'), 'Fullscreen must sync watermark settings through the supported global hook');
assert.ok(publicPage.includes('background:rgba(35,30,23,.28)!important;backdrop-filter:blur(8px) saturate(1.12)!important'), 'Fullscreen viewer must use a 28% translucent glass layer with reduced blur');
assert.ok(publicPage.includes('id="sdFullscreenThumbs"'), 'Fullscreen viewer must include a thumbnail strip for direct image selection');
assert.ok(publicPage.includes("data-full-thumb"), 'Fullscreen thumbnails must be wired to gallery navigation');
assert.ok(publicPage.includes('clearGalleryTransitionClasses(main)'), 'Closing fullscreen must clear stale blur and slide states from the detail image');
assert.ok(publicPage.includes('bottom:calc(91px + env(safe-area-inset-bottom))'), 'Fullscreen image counter must sit in a dedicated footer area above thumbnails');
assert.ok(publicPage.includes('width:max-content;min-width:0;max-width:calc(100% - 24px)'), 'Fullscreen counter must use content width instead of stretching across the image');
assert.ok(publicPage.includes('calc(132px + env(safe-area-inset-bottom))'), 'Fullscreen image stage must reserve space for counter and thumbnail tray');
assert.equal((publicPage.match(/\.detail-image-count\{/g)||[]).length, 1, 'Only one detail counter rule may remain, to prevent conflicting left/right widths');
assert.ok(publicPage.includes('width:max-content;min-width:0;max-width:calc(100% - 18px)'), 'Detail counter must remain compact around its text');
assert.ok(publicPage.includes('background:rgba(35,30,23,.28)!important;backdrop-filter:blur(8px) saturate(1.12)!important'), 'The glass backdrop must remain at about 25–30% opacity');
assert.ok(publicPage.includes('aria-label="Ảnh sản phẩm trước"><svg'), 'Detail previous icon must use a centered SVG glyph');
assert.ok(publicPage.includes('aria-label="Ảnh sản phẩm tiếp theo"><svg'), 'Detail next icon must use a centered SVG glyph');
assert.ok(publicPage.includes('title="Xem toàn ảnh"><svg'), 'Zoom icon must use a crisp SVG glyph');
assert.ok(publicPage.includes('.detail-image-count{\n position:absolute;left:50%;right:auto;bottom:9px'), 'The detail image counter must be compact and centered away from a lower-right burned-in logo');
const galleryStart = publicPage.indexOf('function changeDetailImage(index,resetTimer=true');
const galleryEnd = publicPage.indexOf('function openDetail(', galleryStart);
const gallerySource = publicPage.slice(galleryStart, galleryEnd);
assert.ok(gallerySource.includes("thumbs=$$('.detail-thumb')"), 'Gallery navigation must select every thumbnail using querySelectorAll');
assert.ok(!gallerySource.includes("thumbs=$('.detail-thumb')"), 'Gallery navigation must not treat one thumbnail as an array');
assert.ok(gallerySource.includes('img.onload=finish;img.onerror=finish;img.src=next'), 'Image transition handlers must be registered before changing the src');
const fullscreenCloseStart = publicPage.indexOf('function closeFullscreenImage()');
const fullscreenCloseEnd = publicPage.indexOf('function changeDetailImage(', fullscreenCloseStart);
const fullscreenCloseSource = publicPage.slice(fullscreenCloseStart, fullscreenCloseEnd);
assert.ok(fullscreenCloseSource.includes('clearTimeout(fullscreenSwapTimer)') && fullscreenCloseSource.includes('clearGalleryTransitionClasses(main)') && fullscreenCloseSource.includes('clearGalleryTransitionClasses(full)'), 'Closing fullscreen must cancel pending swaps and clear stale fade/slide classes on both images');
assert.ok(fullscreenCloseSource.includes("main.getAttribute('src')!==selected"), 'Closing fullscreen must sync the in-page image to the selected fullscreen image');
const fullscreenPhotoStart = publicPage.indexOf('function setFullscreenPhoto(');
const fullscreenPhotoEnd = publicPage.indexOf('function renderFullscreenThumbs(', fullscreenPhotoStart);
const fullscreenPhotoSource = publicPage.slice(fullscreenPhotoStart, fullscreenPhotoEnd);
assert.ok(fullscreenPhotoSource.includes('img.onload=null;img.onerror=null;') && fullscreenPhotoSource.includes('fullscreenTransitionId'), 'Superseded fullscreen image requests must not run stale handlers');
assert.ok(protectionScript.includes('function imageNeedsOverlay(src)'), 'Watermark code must distinguish clean uploaded images from legacy product assets');
assert.ok(protectionScript.includes('fullMark.hidden=!fullShouldOverlay'), 'The full-screen view must hide the extra overlay on legacy assets that already contain a watermark');

const adminPage = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(adminPage.includes('watermarkSettingsForm'), 'Admin must expose watermark controls');
assert.ok(adminPage.includes('watermarkPosition') && adminPage.includes('watermarkSize') && adminPage.includes('watermarkOpacity'), 'Admin must expose position, size, and opacity settings');
assert.ok(adminPage.includes('src="/watermark.webp"'), 'Admin must preview the existing watermark logo asset');
assert.ok(adminPage.includes('Giữ nguyên logo SinDarealest hiện tại'), 'Admin must state that the logo remains unchanged');
assert.ok(!adminPage.includes('watermarkLogoFile'), 'Admin must not expose a logo replacement input');
assert.ok(!adminPage.includes('/api/admin/watermark-logo'), 'Admin must not call a logo replacement endpoint');
assert.equal(existsSync(new URL('../functions/api/admin/watermark-logo.js', import.meta.url)), false, 'Logo replacement API must not exist');
assert.ok(!adminPage.includes('watermarkApplied'), 'Admin uploads must not require an image to be pre-watermarked');
assert.ok(!adminPage.includes('ctx.drawImage(markBitmap'), 'Admin must not bake the watermark into each product image');

assert.ok(uploadSource.includes('context.env.ORIGINALS.put'), 'Raw source uploads must use a separate private R2 bucket binding');
assert.ok(uploadSource.includes('context.env.IMAGES.put'), 'Only optimized WebP derivatives may be stored in the public image bucket');
assert.ok(uploadSource.includes('context.env.ORIGINALS.delete'), 'Failed derivative upload must remove the newly stored private original');
assert.ok(uploadSource.includes('visibility: "private-original"'), 'Private original storage must be tagged as private');
assert.ok(uploadSource.includes('Kho ảnh gốc chưa được cấu hình'), 'Uploads must fail closed when the private original bucket is not bound');
assert.ok(uploadSource.includes('visibility: "public-optimized-derivative"'), 'Public derivative storage must be distinct from the original');
assert.ok(!uploadSource.includes('watermarkApplied'), 'The upload API must accept unwatermarked derivative images');

const mediaSource = readFileSync(new URL('../functions/media/[key].js', import.meta.url), 'utf8');
assert.ok(mediaSource.includes('^[A-Za-z0-9-]{30,40}\\.webp$'), 'Public media routing must accept only flat WebP keys, not private-originals/ paths');

assert.ok(publicPage.includes('.sd-fullscreen-image.is-changing{opacity:.38;filter:blur(2px);transform:scale(.985)}'), 'Fullscreen image must fade and soften during image changes');
assert.ok(publicPage.includes('#detailMainImage.is-changing{opacity:.45;filter:blur(2px);transform:scale(.99)}'), 'Detail image must have a subtle blur/fade transition');
assert.ok(publicPage.includes('transform:scale(.88) translateY(1px)'), 'Gallery controls must provide a tactile pressed-in response');
assert.ok(publicPage.includes('--sd-glass-blur:20px'), 'Storefront glass system must define a shared blur token');
assert.ok(publicPage.includes('.product-card{\n background:var(--glass)!important;') && publicPage.includes('.product-card .product-info{\n background:var(--glass)!important;') && publicPage.includes('.detail-modal .detail-copy{\n background:var(--glass)!important;') && publicPage.includes('--glass:rgba(255,255,255,.40)'), 'Product cards and product information panes must use the same translucent glass token as the Order With Confidence steps in light and dark modes');
assert.ok(publicPage.includes('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5'), 'Featured product arrows must use aligned SVG icons instead of text glyphs');

console.log('PASS: watermark validation, admin controls, detail-only overlay, and private original upload guard.');
