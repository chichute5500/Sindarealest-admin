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

assert.equal((grid.match(/<div class="order-step(?:\\s|")/g) || []).length, 4,
  'The process must contain exactly four steps, not six cards.');
assert.equal((grid.match(/<div class="order-step glass" role="listitem"/g) || []).length, 4,
  'Each step must use listitem on a generic container.');
assert.doesNotMatch(grid, /<article\b[^>]*role="listitem"/,
  'Do not override native article semantics with listitem roles.');
assert.match(section, /aria-label="Quy trình đặt hàng gồm bốn bước"/,
  'The process must have an accessible name.');
for (const label of ['Chọn sản phẩm', 'Xác nhận đơn hàng', 'Đặt cọc & chế tác', 'Nhận hàng & hậu mãi']) {
  assert.ok(grid.includes(label), 'Missing process step: ' + label + '.');
}
assert.match(grid, /Hàng có sẵn cọc <strong>100\.000đ<\/strong>/,
  'Fixed 100k in-stock deposit must remain visible.');
assert.match(grid, /hàng đặt riêng cọc <strong>30%<\/strong>/,
  'Made-to-order 30% deposit must remain visible.');
assert.match(grid, /5–20 ngày/,
  'The estimated production time must remain visible.');
assert.match(grid, /bảo hành <strong>6–12 tháng<\/strong>/, 'Order overview must not promise a fixed year of coverage.');
assert.doesNotMatch(grid, /bảo hành <strong>1 năm<\/strong>/);
assert.doesNotMatch(grid, /order-zalo-cta|zalo\.me\//,
  'Zalo must not be represented as a fifth process step.');

assert.match(section, /class="order-assurance-footer glass"/,
  'A compact commitment and contact footer must follow the four-step grid.');
assert.match(section, /Cam kết hậu mãi[\s\S]*?Bảo hành 6–12 tháng[\s\S]*?Bảo dưỡng trọn đời[\s\S]*?Hoàn thiện thủ công/,
  'The compact footer must retain the supplied brand commitments.');
assert.match(section, /href="https:\/\/zalo\.me\/0827049192"[^>]*aria-label="Tư vấn hoặc đặt hàng qua Zalo"/,
  'The standalone Zalo CTA must use the confirmed contact URL and accessible label.');
assert.match(section, /Tư vấn \/ đặt hàng qua Zalo/,
  'The CTA must use the agreed consultation/order wording.');
const detailStart = html.indexOf('<div class="detail-aftercare">');
const detailEnd = html.indexOf('id="detailZalo"',detailStart);
assert.ok(detailStart > 0 && detailEnd > detailStart, 'quality panel exists');
const productPledges=html.slice(detailStart,detailEnd);
assert.equal((productPledges.match(/class="sd-detail-pledge"/g)||[]).length,2,'two quality cards in product detail');
assert.match(productPledges,/Da cá sấu thật 100%/);
assert.match(productPledges,/đền bù gấp 10 lần giá trị sản phẩm/);
assert.match(productPledges,/id="detailWarrantyTerm"/);
assert.match(productPledges,/Không áp dụng với hư hỏng do va đập/);
assert.doesNotMatch(productPledges,/class="promise-tags"|id="detailDescription"/,'redundant product detail elements removed');
assert.ok(html.includes('Number(p.price)<=3_000_000?6:12'),'frontend uses 3m threshold');
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

assert.match(section, /class="order-cta order-cta--compact"/, 'Homepage order assurance retains its compact heading layout.');
assert.match(section, /<h2 class="pill-btn primary order-guide-heading" id="order-title">[\s\S]*?class="order-cta-label">Đặt hàng an tâm<\/span>[\s\S]*?<\/h2>/, 'Order reassurance heading is static and accessible.');
assert.match(section, /id="orderDetailsPanel" class="order-details-panel">/, 'Four process steps are always rendered, not hidden until click.');
assert.doesNotMatch(section, /id="orderDetailsToggle"|aria-expanded="false"|class="order-details-panel" hidden/, 'Do not reintroduce click-to-expand.');
assert.doesNotMatch(html, /ensureOrderGuideOpen|orderDetailsToggle/, 'No old toggle handlers or CSS.');
assert.match(html, /#order \.order-cta--compact \.order-guide-heading\{[^}]*border-radius:999px/, 'Approved compact pill remains visual, not interactive.');
assert.match(html, /function dismissToast\(\)/, 'Drawer transitions must be able to clear the global toast.');

console.log('PASS: always-visible order assurance, four-step grid, scoped styles, commitments, Zalo CTA.');
