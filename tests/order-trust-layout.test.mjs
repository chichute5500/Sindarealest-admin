import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/ui/storefront.css', import.meta.url), 'utf8');
assert.ok(html.includes('href="/ui/storefront.css?v=20261017-2"'), 'Storefront must use its versioned standalone stylesheet.');
assert.doesNotMatch(html,/<style\b|sd-order-uniform-tiles|sd-benefit-responsive-fix/,
  'The HTML must not contain legacy patch stylesheets.');

const start = html.indexOf('<section class="section wrap" id="order"');
assert.notEqual(start,-1,'The order assurance section must exist.');
const next = html.indexOf('<section class="section wrap" id="featured">',start);
assert.notEqual(next,-1,'The order assurance section must finish before featured products.');
const section=html.slice(start,next);
const gridMatch=section.match(/<div class="order-steps"[^>]*>([\s\S]*?)\n    <\/div>/);
assert.ok(gridMatch,'The four process steps must be in one grid.');
const grid=gridMatch[1];
assert.equal((grid.match(/<article class="order-step\b/g)||[]).length,4,'The order process must contain four and only four steps.');
assert.match(section,/aria-label="Quy trình đặt hàng gồm bốn bước"/);
for(const label of ['Chọn sản phẩm','Xác nhận đơn hàng','Đặt cọc & chế tác','Nhận hàng & hậu mãi']) {
  assert.ok(grid.includes(label),'Missing order step: '+label);
}
assert.match(grid,/Đặt cọc <strong>30%<\/strong>/,'The deposit must remain visible.');
assert.match(grid,/5–20 ngày/,'The expected production period must remain visible.');
assert.doesNotMatch(grid,/order-zalo-cta|zalo\.me\//,'Zalo must not become a fifth process step.');
assert.match(section,/class="order-assurance-footer glass"/,'The compact assurance footer must follow the four steps.');
assert.match(section,/Cam kết hậu mãi[\s\S]*?Bảo hành 1 năm[\s\S]*?Bảo dưỡng trọn đời[\s\S]*?Hoàn thiện thủ công/,
  'The established brand commitments must remain.');
assert.match(section,/href="https:\/\/zalo\.me\/0827049192"[^>]*aria-label="Tư vấn hoặc đặt hàng qua Zalo"/,
  'The separate Zalo CTA must preserve its destination and accessible label.');
assert.match(section,/Tư vấn\/đặt hàng qua Zalo/,'The CTA must preserve the agreed wording.');

const orderGrid=css.match(/#order \.order-steps\{([^}]*)\}/)?.[1]||'';
const orderStep=css.match(/#order \.order-step\{([^}]*)\}/)?.[1]||'';
const heading=css.match(/#order \.order-step h3\{([^}]*)\}/)?.[1]||'';
const paragraph=css.match(/#order \.order-step p\{([^}]*)\}/)?.[1]||'';
const cta=css.match(/#order \.order-zalo-cta\{([^}]*)\}/)?.[1]||'';
assert.ok(orderGrid.includes('display:grid')&&orderGrid.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),
  'Desktop must show four equal-width steps in one row.');
assert.ok(orderStep.includes('display:flex'),'Each order step must be a layout card.');
assert.match(heading,/font:400 14\.5px/,'Desktop heading size must remain readable.');
assert.match(paragraph,/font-size:10\.5px/,'Step descriptions must remain readable.');
assert.match(cta,/background:#0068ff/);
assert.match(cta,/color:#fff/,'Zalo CTA must keep white text on its solid blue surface.');
assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?#order \.order-steps\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  'Mobile layout must use two columns.');
assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?#order \.order-assurance-footer\{align-items:flex-start;flex-direction:column/,
  'The mobile assurance footer must stack without horizontal overflow.');
assert.match(css,/@media\(max-width:1050px\)\{[\s\S]*?#order \.order-step h3\{font-size:13\.5px\}/,
  'Tablet headings must use the tablet size.');
assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?#order \.order-step p\{font-size:10\.5px\}/,
  'Mobile description text must remain readable.');

const ruleList=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,body])=>({selector:selector.trim(),body}));
const baseGridRules=ruleList.filter(rule=>rule.selector==='#order .order-steps'&&/display:grid/.test(rule.body));
assert.equal(baseGridRules.length,1,'Exactly one base rule must define the order grid.');
const globalOrderSelectors=ruleList.filter(({selector})=>/\.order-(steps|step|number|icon|commitment|assurance-footer|zalo-cta)\b/.test(selector)
  && !selector.startsWith('#order') && !selector.startsWith('@media'));
assert.deepEqual(globalOrderSelectors.map(x=>x.selector),[],'Order styling must be scoped to #order.');
assert.doesNotMatch(css,/\.order-step:last-child\s*\{|\.order-step:nth-child\(4\)/,'No positional override may resize one step.');
assert.doesNotMatch(css,/,\\s*}/,'Stylesheet must not contain a dangling comma in a declaration.');
console.log('PASS: four order steps, responsive layout, after-sales commitments, and separate Zalo CTA.');
