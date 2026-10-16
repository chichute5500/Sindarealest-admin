import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const start = html.indexOf('<section class="section wrap" id="order"');
assert.notEqual(start, -1, 'The order assurance section must exist.');
const end = html.indexOf('</section>', start);
assert.notEqual(end, -1, 'The order assurance section must close.');
const section = html.slice(start, end + '</section>'.length);
const gridMatch = section.match(/<div class="order-steps"[^>]*>([\s\S]*?)\n    <\/div>\s*<\/section>/);
assert.ok(gridMatch, 'All order tiles must be contained by one shared grid.');
const grid = gridMatch[1];

assert.equal((grid.match(/<article class="order-step\b/g) || []).length, 6,
  'Five ordering steps and the Zalo contact tile must be the same six-card grid.');
assert.match(grid, /<article class="order-step order-zalo glass"[^>]*>[\s\S]*?href="https:\/\/zalo\.me\/0827049192"[^>]*>Nhắn tin tư vấn ↗<\/a>[\s\S]*?<\/article>/,
  'The sixth tile must retain the working Zalo contact link.');
assert.doesNotMatch(section, /order-note/,
  'The former full-width order-note must not remain as a separate layout element.');

const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const rules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim().replace(/\/\*[\s\S]*?\*\//g, '').trim(),
  body,
}));
const orphaned = rules.filter(({ selector }) =>
  /order-steps|order-step|order-number|order-icon|order-note/.test(selector)
  && !selector.startsWith('#order')
  && !selector.startsWith('@media')
);
assert.deepEqual(orphaned.map(x => x.selector), [],
  'All order tile styles must be scoped to #order instead of accumulating global overrides.');
assert.equal(rules.filter(x => x.selector === '#order .order-steps' && /display:grid/.test(x.body)).length, 1,
  'One base grid rule must control the order tile layout.');
assert.equal(rules.filter(x => x.selector === '#order .order-step' && /position:relative/.test(x.body)).length, 1,
  'One base card rule must control all six tiles.');
assert.match(styles, /@media\(max-width:760px\)\{\s*#order \.order-steps\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  'Mobile must use two equal columns so the sixth Zalo tile matches the other cards.');
assert.doesNotMatch(styles, /\.order-step:last-child\s*\{|\.order-step:nth-child\(4\)/,
  'No legacy last-card stretching or child-position layout hacks may remain.');

console.log('PASS: the five ordering steps and Zalo are six compact, consistent tiles with one scoped responsive layout.');
