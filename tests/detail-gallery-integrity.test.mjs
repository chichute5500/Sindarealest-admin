import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

function count(text) {
  return html.split(text).length - 1;
}

assert.equal(count('id="detailZoom"'), 1, 'The detail viewer must expose exactly one full-image control.');
assert.equal(count('id="sdFullscreenViewer"'), 1, 'There must be exactly one full-screen viewer.');
assert.equal(count('id="sdFullscreenImage"'), 1, 'There must be exactly one full-screen image.');
assert.match(html, /id="detailZoom" aria-label="Xem toàn ảnh ở chế độ toàn màn hình"/);
assert.match(html, /function sizeFullscreenFrame\(\)/);
assert.match(html, /function setFullscreenPhoto\(/);
assert.match(html, /function renderFullscreenThumbs\(/);
assert.match(html, /function openFullscreenImage\(\)/);
assert.match(html, /function closeFullscreenImage\(\)/);
assert.match(html, /#\(['"]detailZoom['"]\)\.addEventListener\(['"]click['"],openFullscreenImage\)/);
assert.match(html, /#\(['"]detailMainImage['"]\)\.addEventListener\(['"]click['"]/);
assert.match(html, /#\(['"]sdFullscreenImage['"]\)\.addEventListener\(['"]pointerup['"]/);
assert.match(html, /#\(['"]sdFullscreenPrev['"]\)\.addEventListener\(['"]click['"]/);
assert.match(html, /#\(['"]sdFullscreenNext['"]\)\.addEventListener\(['"]click['"]/);
assert.match(html, /#\(['"]sdFullscreenThumbs['"]\)\.addEventListener\(['"]click['"]/);
assert.match(html, /id="detailPrev" aria-label="Ảnh sản phẩm trước"><svg/);
assert.match(html, /id="detailNext" aria-label="Ảnh sản phẩm tiếp theo"><svg/);
assert.match(html, /id="sdFullscreenPrev" aria-label="Ảnh trước"><svg/);
assert.match(html, /id="sdFullscreenNext" aria-label="Ảnh tiếp theo"><svg/);
assert.match(html, /sdGalleryOutLeft/);
assert.match(html, /sdGalleryInRight/);
assert.match(html, /@media\(max-width:760px\)/);
assert.match(html, /@media\(max-width:390px\)/);
assert.match(html, /stage:document\.querySelector\('#sdFullscreenFrame'\)/);
assert.doesNotMatch(html, /id="sdFullscreenWatermark"/, 'Fullscreen watermark must use the live settings helper.');
assert.match(html, /$('#sdFullscreenViewer').classList.contains\('open'\)/, 'Autoplay should pause while full-screen controls are open.');

console.log('Detail gallery regression tests passed.');
