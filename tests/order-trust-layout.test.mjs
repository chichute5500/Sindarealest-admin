import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const start = html.indexOf('<section class="section wrap" id="order"');
assert.notEqual(start, -1, 'The order assurance section must exist.');
const end = html.indexOf('</section>', start);
assert.notEqual(end, -1, 'The order assurance section must close.');
const section = html.slice(start, end + '</section>'.length);
const gridMatch = section.match(/<div class="order-steps"[^>]*>([\s\S]*?)\n    <\/div>\s*<\/section>/);
assert.ok(gridMatch, 'All order assurance tiles must be inside one shared grid.');
const grid = gridMatch[1];

assert.equal((grid.match(/<article class="order-step\b/g) || []).length, 6,
  'The five ordering steps and Zalo contact must be six equal-grid cards.');
assert.match(grid, /<article class="order-step order-zalo glass"[^>]*>[\s\S]*?href="https:\/\/zalo\.me\/0827049192"[^>]*>Nhắn tin tư vấn ↗<\/a>[\s\S]*?<\/article>/,
  'The sixth card must preserve the working Zalo link.');
assert.doesNotMatch(section, /order-note/,
  'The former separate full-width Zalo note must not remain.');

const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]);
const styles = styleBlocks.join('\n');
const scopedBlock = html.match(/<style id="sd-order-uniform-tiles">([\s\S]*?)<\/style>/)?.[1] || '';
assert.ok(scopedBlock, 'The authoritative order-tile stylesheet must exist.');
assert.ok(html.indexOf('id="sd-order-uniform-tiles"') > html.indexOf('id="sd-benefit-responsive-fix"'),
  'Order-tile rules must load after the existing stylesheet blocks.');

const rules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim().replace(/\/\*[\s\S]*?\*\//g, '').trim(),
  body,
}));
const orphaned = rules.filter(({ selector }) =>
  /order-(steps|step|number|icon|note)\b/.test(selector)
  && !selector.startsWith('#order')
  && !selector.startsWith('@media')
);
assert.deepEqual(orphaned.map(x => x.selector), [],
  'Only the #order scope may style order tiles; old global selectors must be removed.');

assert.equal(rules.filter(x => x.selector === '#order .order-steps' && /display:grid/.test(x.body)).length, 1,
  'Exactly one base rule must define the order grid.');
assert.equal(rules.filter(x => x.selector === '#order .order-step' && /position:relative/.test(x.body)).length, 1,
  'Exactly one base rule must define each order card.');
assert.match(scopedBlock, /#order \.order-steps\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-auto-rows:1fr/,
  'Desktop must use equal-width columns and equal-height rows.');
assert.match(scopedBlock, /@media\(max-width:760px\)\{\s*#order \.order-steps\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-auto-rows:1fr;gap:8px;align-items:stretch\}/,
  'Mobile must use two equal columns and equal-height rows.');
assert.match(scopedBlock, /@media\(max-width:390px\)\{\s*#order \.order-steps\{gap:6px\}/,
  'Narrow phones must have tighter spacing without changing the equal-card layout.');
assert.doesNotMatch(styles, /\.order-step:last-child\s*\{|\.order-step:nth-child\(4\)/,
  'No positional rules may stretch or resize only selected order cards.');
assert.doesNotMatch(styles, /,\s*\}/,
  'Stylesheets must not retain the dangling-comma CSS parse error.');

console.log('PASS: six compact order tiles share a single scoped layout on desktop, tablet, mobile, and narrow phones.');
