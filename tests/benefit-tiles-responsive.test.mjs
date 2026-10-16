import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const marker = '<style id="sd-benefit-responsive-fix">';
const start = html.lastIndexOf(marker);
assert.notEqual(start, -1, 'The final responsive benefit stylesheet must exist.');
const end = html.indexOf('</style>', start);
assert.notEqual(end, -1, 'The responsive stylesheet must close correctly.');
const css = html.slice(start + marker.length, end);
const stripStart = html.indexOf('<div class="service-strip glass">');
const stripEnd = html.indexOf('</div>\n  </section>', stripStart);
assert.notEqual(stripStart, -1, 'The benefit strip must exist.');
assert.notEqual(stripEnd, -1, 'The benefit strip must close within its section.');
const markup = html.slice(stripStart, stripEnd);

assert.equal((markup.match(/class="service-copy"/g) || []).length, 6,
  'All six production benefit captions must use the styled text wrapper.');
assert.equal((markup.match(/class="service tap-target"/g) || []).length, 6,
  'The page must retain all six clickable benefit tiles.');
assert.ok(start > html.indexOf('id="sd-protection-script"'),
  'The responsive fix must load after the legacy page styles and protection scripts.');

assert.match(css, /\.service-strip\{[\s\S]*?grid-template-columns:repeat\(6,minmax\(0,1fr\)\)[\s\S]*?grid-auto-rows:1fr/,
  'Desktop must use six equal columns and rows.');
assert.match(css, /@media\(max-width:1050px\) and \(min-width:761px\)\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[\s\S]*?aspect-ratio:3\.5 \/ 1/,
  'Tablet widths must use three columns and a tablet-safe tile ratio.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[\s\S]*?aspect-ratio:2\.4 \/ 1/,
  'Mobile widths must use two equal columns and a text-safe tile ratio.');
assert.match(css, /@media\(max-width:390px\)\{[\s\S]*?\.service-strip \.service-copy strong\{font-size:8\.2px\}/,
  'Narrow phones must have dedicated text and icon sizing.');

assert.match(css, /--service-copy-bg:rgba\(255,252,246,\.78\)/,
  'Light theme must use a translucent light-glass caption surface.');
assert.match(css, /html\.dark \.service-strip\{[\s\S]*?--service-copy-bg:rgba\(9,9,9,\.58\)[\s\S]*?--service-copy-ink:#f5f1e9/,
  'Dark theme must use a contrasting dark-glass surface and light text.');
assert.match(css, /\.service-strip \.service-copy::before\{[\s\S]*?background:var\(--service-copy-gradient\)/,
  'The glass highlight must be an overlay rather than competing with the surface background.');
assert.match(css, /\.service-strip \.service-copy\{[\s\S]*?min-width:0[\s\S]*?overflow:hidden/,
  'Caption flex children must be allowed to shrink without overflowing.');
assert.match(css, /\.service-strip \.service:not\(:last-child\)::after\{display:none\}/,
  'Legacy divider rules must not add uneven lines between tiles.');

console.log('PASS: six benefit tiles have one final responsive rule set for desktop, tablet, mobile, narrow phones, and both themes.');
