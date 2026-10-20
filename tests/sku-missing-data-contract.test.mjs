import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const fixture = JSON.parse(readFileSync(new URL('../data/legacy-products.json', import.meta.url), 'utf8'));

assert.match(html, /function visibleSku\(p\)\{[^}]*String\(p\.sku\|\|''\)\.trim\(\)/,
  'SKU display must normalize absent values to an empty string');
assert.match(html, /visibleSku\(p\)\|\|'Chưa được cung cấp'/,
  'product cards must show a truthful missing-SKU fallback');
assert.match(html, /mã SKU chưa được cung cấp/,
  'Zalo consultation must remain usable without an invented SKU');
assert.match(html, /function preferred\(category\)\{return products\.find\(p=>p\.category===category\)\}/,
  'featured-product selection must not depend on unverified SKU codes');
assert.doesNotMatch(html, /const fallbacks=\['SD001','SD064','SD167','SD138'\]/,
  'unverified legacy SKU values must not be used as featured-product selectors');

assert.ok(Array.isArray(fixture), 'legacy product fixture must remain an array');
for (const [index, product] of fixture.entries()) {
  assert.ok(product && typeof product === 'object', `product fixture entry ${index} must be an object`);
  if (product.sku == null || String(product.sku).trim() === '') continue;
  assert.notEqual(product.skuVerified, false,
    `product fixture entry ${index} must not contain a SKU explicitly marked unverified`);
}

console.log('PASS: missing/unverified SKU values do not generate fake featured selectors; customer UI and Zalo copy retain safe fallbacks.');
