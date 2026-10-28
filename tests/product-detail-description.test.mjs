import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const count=needle=>html.split(needle).length-1;

assert.equal(count('id="detailDescription"'),1,'Product description must have one target');
assert.equal(count('id="detailDescriptionHeading"'),1,'Description heading must have one target');
assert.match(html,/<section class="detail-description-panel" aria-labelledby="detailDescriptionHeading"><h3 id="detailDescriptionHeading">Mô tả sản phẩm<\/h3><p class="detail-desc" id="detailDescription"><\/p><\/section>/,
 'Product description must have a semantic, labelled panel');
const overlay=html.match(/<div class="overlay" id="productOverlay"[\s\S]*?<div class="sd-fullscreen-viewer"/)?.[0]||'';
assert.ok(overlay.indexOf('id="detailBuyNow"')<overlay.indexOf('class="detail-description-panel"'),
 'Buying actions stay before the product description');
assert.ok(overlay.indexOf('class="detail-description-panel"')<overlay.indexOf('class="promise-tags"'),
 'Description stays ahead of support badges');
assert.match(html,/\$\('#detailDescription'\)\.textContent=typeof p\.description==='string'&&p\.description\.trim\(\)\?p\.description\.trim\(\)/,
 'Admin description must be placed as text, never injected as HTML');
assert.match(html,/Mô tả chi tiết đang được cập nhật/,
 'Products without a description should show a neutral, truthful fallback');
assert.doesNotMatch(html,/\$\('#detailDescription'\)\.innerHTML/,
 'Descriptions must not execute untrusted markup');
assert.match(html,/#productOverlay \.detail-description-panel\{[^}]*background:var\(--glass\)/,
 'Description panel must reuse storefront Liquid Glass material');
assert.match(html,/#productOverlay \.detail-description-panel \.detail-desc\{[^}]*white-space:pre-line;overflow-wrap:anywhere/,
 'Multiline AI descriptions and long words must remain readable');
assert.match(html, /@media\(max-width:760px\)\{\s*#productOverlay \.detail-description-panel\{/,
 'Mobile description panel must have a scoped responsive layout');
assert.match(html, /#productOverlay \.detail-description-panel h3\{[^}]*color:var\(--ink\)/,
 'Description heading must follow current light/dark theme contrast');
assert.equal(count('id="detailAdd"'),1);
assert.equal(count('id="detailBuyNow"'),1);
assert.ok(html.includes('function renderProductOptions(p)'),
 'Existing approved shoe/belt/phone variants must be preserved');

console.log('PASS: Storefront product detail shows one accessible Liquid Glass description panel, safe Admin binding, multiline and mobile/dark styling, preserving purchase and variant flows.');
