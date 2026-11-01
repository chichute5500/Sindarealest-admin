import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const start = html.indexOf('<section class="section wrap" id="order"');
assert.notEqual(start, -1, 'The order assurance section must exist.');
const next = html.indexOf('<section class="section wrap" id="featured">', start);
assert.notEqual(next, -1, 'The order assurance section must finish before the featured-products section.');
const section = html.slice(start, next);
const gridMatch = section.match(/<div class="order-steps"[^>]*>([\s\S]*?)\n    <\/div>/);
assert.ok(gridMatch, 'The four process steps must be inside one shared grid.');
const grid = gridMatch[1];

assert.equal((grid.match(/<article class="order-step\b/g) || []).length, 4,
  'The process must contain exactly four steps, not six cards.');
assert.match(section, /aria-label="Quy trình đặt hàng gồm bốn bước"/,
  'The process must have an accessible name.');
for (const label of ['Chọn sản phẩm', 'Xác nhận đơn hàng', 'Đặt cọc & chế tác', 'Nhận hàng & hậu mãi']) {
  assert.ok(grid.includes(label), 'Missing process step: ' + label + '.');
}
assert.match(grid, /Đặt cọc <strong>30%<\/strong>/,
  'The deposit information must remain visible.');
assert.match(grid, /5–20 ngày/,
  'The estimated production time must remain visible.');
assert.doesNotMatch(grid, /order-zalo-cta|zalo\.me\//,
  'Zalo must not be represented as a fifth process step.');

assert.match(section, /class="order-assurance-footer glass"/,
  'A compact commitment and contact footer must follow the four-step grid.');
assert.match(section, /Cam kết hậu mãi[\s\S]*?Bảo hành 1 năm[\s\S]*?Bảo dưỡng trọn đời[\s\S]*?Hoàn thiện thủ công/,
  'The compact footer must retain the supplied brand commitments.');
assert.match(section, /href="https:\/\/zalo\.me\/0827049192"[^>]*aria-label="Tư vấn hoặc đặt hàng qua Zalo"/,
  'The standalone Zalo CTA must use the confirmed contact URL and accessible label.');
assert.match(section, /Tư vấn \/ đặt hàng qua Zalo/,
  'The CTA must use the agreed consultation/order wording.');
const orderStyles = html.match(/<style id="sd-order-uniform-tiles">([\s\S]*?)<\/style>/)?.[1] || '';
assert.match(orderStyles, /#order \.order-zalo-cta\{[^}]*background:#0068ff;border-color:#0068ff;color:#fff/,
  'The Zalo CTA must keep an opaque Zalo-blue surface in both light and dark themes.');
assert.match(orderStyles, /#order \.order-step h3\{[^}]*font:600 15\.5px/,
  'Desktop order-step headings must remain comfortably readable.');
assert.match(orderStyles, /#order \.order-step p\{[^}]*font-size:10\.5px/,
  'Desktop order-step body text must be larger than the previous tiny 9.5px setting.');
assert.match(orderStyles, /@media\(max-width:760px\)[\s\S]*?#order \.order-step p\{font-size:10\.5px/,
  'Mobile order-step body text must remain readable.');
assert.match(orderStyles, /@media\(max-width:1050px\) and \(min-width:761px\)\{[\s\S]*?#order \.order-step h3\{font-size:14\.5px\}/,
  'Tablet order-step headings must not regress to tiny text.');

assert.match(orderStyles, /#order \.order-zalo-cta:hover\{background:#0068ff;border-color:#0068ff/,
  'The Zalo CTA must not turn translucent or lose its brand surface on hover.');


const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]);
const styles = styleBlocks.join('\n');
const scopedBlock = html.match(/<style id="sd-order-uniform-tiles">([\s\S]*?)<\/style>/)?.[1] || '';
assert.ok(scopedBlock, 'The authoritative order-process stylesheet must exist.');
assert.ok(html.indexOf('id="sd-order-uniform-tiles"') > html.indexOf('id="sd-benefit-responsive-fix"'),
  'Order-process styles must load after the existing responsive benefit styles.');

const rules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim().replace(/\/\*[\s\S]*?\*\//g, '').trim(),
  body,
}));
const orphaned = rules.flatMap(({ selector }) =>
  [...selector.matchAll(/\.order-(steps|step|number|icon|note)\b/g)]
    .filter(match => !selector.slice(0, match.index).trimEnd().endsWith('#order'))
    .map(() => selector)
);
assert.deepEqual(orphaned, [],
  'Every order-process selector, including shared material groups, must remain scoped under #order.');

assert.equal(rules.filter(x => x.selector === '#order .order-steps' && /display:grid/.test(x.body)).length, 1,
  'Exactly one base rule must define the process grid.');
assert.equal(rules.filter(x => x.selector === '#order .order-step' && /display:flex/.test(x.body)).length, 1,
  'Exactly one base rule must define each process card.');
assert.match(scopedBlock, /#order \.order-steps\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
  'Desktop must show four compact, equal-width steps in one row.');
assert.match(scopedBlock, /@media\(max-width:760px\)\{[\s\S]*?#order \.order-steps\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:7px\}/,
  'Mobile must show two equal columns instead of stacking four tall cards.');
assert.match(scopedBlock, /@media\(max-width:760px\)\{\s*#order \.section-note\{display:none\}/,
  'The explanatory note must not consume extra vertical space on mobile.');
assert.match(scopedBlock, /@media\(max-width:390px\)/,
  'Very narrow phones must receive a dedicated spacing adjustment.');
assert.doesNotMatch(styles, /\.order-step:last-child\s*\{|\.order-step:nth-child\(4\)/,
  'No positional rule may stretch or resize a particular step.');
assert.doesNotMatch(styles, /,\s*\}/,
  'Stylesheets must not retain a dangling-comma CSS syntax issue.');

assert.match(section, /class="order-cta order-cta--compact"/, 'Homepage order assurance must use one compact pill CTA rather than a tall split card.');
assert.match(section, /class="order-cta-label" id="order-title">Đặt hàng an tâm<\/span>/, 'The compact order CTA must carry the accessible section label.');
assert.match(section, /id="orderDetailsToggle"[^>]*aria-expanded="false"[^>]*aria-controls="orderDetailsPanel"/, 'The compact CTA must keep an accessible expanded/collapsed state.');
assert.match(html, /#order \.order-cta--compact #orderDetailsToggle\{[^}]*border-radius:999px/, 'The order CTA must use a pill shape.');
assert.match(html, /function dismissToast\(\)/, 'Drawer transitions must be able to clear the global toast.');

console.log('PASS: compact order pill, four-step process, scoped styles, responsive grid, commitments, and standalone Zalo CTA.');
