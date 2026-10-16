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
assert.ok(publicPage.includes('.detail-image-count{position:absolute;left:50%;right:auto;bottom:12px'), 'The detail image counter must be centered away from a lower-right burned-in logo');
const galleryStart = publicPage.indexOf('function changeDetailImage(index,resetTimer=true)');
const galleryEnd = publicPage.indexOf('function openDetail(', galleryStart);
const gallerySource = publicPage.slice(galleryStart, galleryEnd);
assert.ok(gallerySource.includes("$('.detail-thumb')"), 'Gallery navigation must select all thumbnails before iteration');
assert.ok(!gallerySource.includes("$('.detail-thumb').forEach"), 'Gallery navigation must not call forEach on a single querySelector result');
assert.ok(gallerySource.includes('img.onload=finish;img.onerror=finish;img.src=next'), 'Image transition handlers must be registered before changing the src to prevent a stuck blurred image');
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
console.log('PASS: watermark validation, admin controls, detail-only overlay, and private original upload guard.');
