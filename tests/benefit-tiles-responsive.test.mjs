import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/ui/storefront.css', import.meta.url), 'utf8');
assert.ok(html.includes('href="/ui/storefront.css?v=20261017-2"'), 'Storefront must load the versioned single-source stylesheet.');
assert.doesNotMatch(html, /<style\b|sd-benefit-responsive-fix|sd-order-uniform-tiles|sd-unified-arrow-glass-final/,
  'The storefront must not keep embedded experimental/patch stylesheets.');

const stripStart = html.indexOf('<div class="service-strip glass">');
assert.notEqual(stripStart, -1, 'The six-tile benefit strip must exist.');
const stripEnd = html.indexOf('</div>\n  </section>', stripStart);
assert.notEqual(stripEnd, -1, 'The benefit strip must close before the next section.');
const markup = html.slice(stripStart, stripEnd);
assert.equal((markup.match(/class="service tap-target"/g) || []).length, 6, 'All six benefit tiles must remain.');
assert.equal((markup.match(/class="service-copy"/g) || []).length, 6, 'Each benefit tile must have a single shared glass surface.');
assert.equal((markup.match(/class="service-icon"/g) || []).length, 6, 'Each benefit tile must have one icon.');
assert.equal((markup.match(/class="service-text"/g) || []).length, 6, 'Each benefit tile must have one shrink-safe text wrapper.');
assert.equal((markup.match(/class="service-copy"><span class="service-icon">[\s\S]*?<span class="service-text">/g) || []).length, 6,
  'Each icon and caption must share one surface.');
assert.match(markup, /href="https:\/\/zalo\.me\/0827049192"/, 'The Zalo tile must keep the confirmed destination.');
assert.match(markup, /<strong>Tư vấn\/đặt hàng qua Zalo<\/strong><small>Trao đổi trực tiếp qua Zalo<\/small>/,
  'The Zalo tile must keep the confirmed, accurate label.');

const cssRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,body])=>({selector:selector.trim(),body}));
for (const selector of ['.service-strip','.service','.service-copy','.service-icon','.service-text','.service-text strong','.service-text small']) {
  assert.equal(cssRules.filter(rule=>rule.selector===selector).length,1, 'Expected one authoritative base rule for '+selector+'.');
}
const baseSurface = cssRules.find(rule=>rule.selector==='.service-copy').body.replace(/\s+/g,'');
assert.match(baseSurface,/background:linear-gradient\(135deg,rgba\(250,251,252,\.94\),rgba\(224,228,232,\.86\)\)/,
  'Benefit glass must keep the strong neutral gradient for legible text.');
assert.match(baseSurface,/border:1px solid rgba\(255,255,255,\.82\)/,'Benefit glass must have a high-contrast border.');
assert.match(baseSurface,/backdrop-filter:blur\(18px\)/,'Benefit glass must retain its frosted blur.');
assert.match(baseSurface,/color:#262626/,'Benefit text must stay readable in both themes.');
assert.match(baseSurface,/box-shadow:0 7px 18px rgba\(0,0,0,\.16\),inset 0 1px 0 rgba\(255,255,255,\.92\)/,
  'Benefit glass must have a single layered elevation treatment.');
assert.match(css,/\.service-strip\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)/,
  'Desktop must show six evenly sized benefit tiles.');
assert.match(css,/@media\(max-width:1100px\)\{[\s\S]*?\.service-strip\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
  'Tablet widths must use three columns.');
assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.service-strip\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  'Phones must use two columns without forcing six tiny cards on one row.');
assert.match(css,/@media\(max-width:390px\)\{[\s\S]*?\.service-text strong\{font-size:9\.1px\}/,
  'Narrow phones need their own text sizing adjustment.');
assert.doesNotMatch(css,/\.service-copy::before|--service-copy-bg|\.service-strip[^{}]*html\.dark/,
  'Benefit surface must not be re-layered with competing test overrides.');

console.log('PASS: unified six-tile Liquid Glass surface, responsive layouts, and confirmed Zalo CTA.');
