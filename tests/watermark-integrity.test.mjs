import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWatermarkSettings, validateWatermarkSettingUpdates, isAllowedWatermarkLogo } from '../functions/_lib/watermark-settings.js';
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

assert.equal(isAllowedWatermarkLogo('/watermark.webp'), true);
assert.equal(isAllowedWatermarkLogo('/media/wm-01234567-89ab-cdef-0123-456789abcdef.webp'), true);
assert.equal(isAllowedWatermarkLogo('https://attacker.example/logo.webp'), false);
assert.equal(isAllowedWatermarkLogo('/media/private-originals/source.webp'), false);
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

const inaccessibleOriginal = await publicMediaGet({
  params: { key: 'private-originals/01234567-89ab-cdef-0123-456789abcdef.jpg' },
  env: { IMAGES: { get() { throw new Error('Private originals must never reach R2.get through /media/[key]'); } } },
});
assert.equal(inaccessibleOriginal.status, 404, 'Private original paths must be denied before accessing R2');

const publicPage = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const protectionScriptStart = publicPage.indexOf('<script id="sd-protection-script">');
const protectionScriptEnd = publicPage.indexOf('</script>', protectionScriptStart);
const protectionScript = publicPage.slice(protectionScriptStart, protectionScriptEnd);
assert.ok(protectionScript.includes("document.querySelector('.detail-image-stage')"), 'Watermark must be scoped to the large detail viewer');
assert.ok(!protectionScript.includes("document.querySelectorAll('.product-photo"), 'Watermark must not be overlaid on product-list cards');
assert.ok(!protectionScript.includes('.detail-thumb'), 'Watermark must not be overlaid on detail thumbnails');
assert.ok(protectionScript.includes("window.__sdUpdateDetailWatermark"), 'Detail watermark settings must be applied dynamically');

const adminPage = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(adminPage.includes('watermarkSettingsForm'), 'Admin must expose watermark controls');
assert.ok(adminPage.includes('watermarkPosition') && adminPage.includes('watermarkSize') && adminPage.includes('watermarkOpacity'), 'Admin must expose position, size, and opacity settings');
assert.ok(adminPage.includes('/api/admin/watermark-logo'), 'Admin must support replacing the watermark logo');
assert.ok(!adminPage.includes('watermarkApplied'), 'Admin uploads must not require an image to be pre-watermarked');
assert.ok(!adminPage.includes('ctx.drawImage(markBitmap'), 'Admin must not bake the watermark into each product image');

const uploadSource = readFileSync(new URL('../functions/api/admin/upload.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('private-originals/'), 'Raw source uploads must be stored in a non-public R2 prefix');
assert.ok(uploadSource.includes('visibility: "private-original"'), 'Private original storage must be tagged as private');
assert.ok(uploadSource.includes('visibility: "public-optimized-derivative"'), 'Public derivative storage must be distinct from the original');
assert.ok(!uploadSource.includes('watermarkApplied'), 'The upload API must accept unwatermarked derivative images');

const mediaSource = readFileSync(new URL('../functions/media/[key].js', import.meta.url), 'utf8');
assert.ok(mediaSource.includes('^[A-Za-z0-9-]{30,40}\\.webp$'), 'Public media routing must accept only flat WebP keys, not private-originals/ paths');
const logoUploadSource = readFileSync(new URL('../functions/api/admin/watermark-logo.js', import.meta.url), 'utf8');
assert.ok(logoUploadSource.includes('requireAdmin') && logoUploadSource.includes('watermark_logo'), 'Changing the watermark logo must require admin authentication and save its setting');

console.log('PASS: watermark validation, admin controls, detail-only overlay, and private original upload guard.');
