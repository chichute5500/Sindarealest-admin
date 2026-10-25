import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const marker = '<style id="sd-benefit-responsive-fix">';
assert.equal((html.match(/<style id="sd-benefit-responsive-fix">/g) || []).length, 1,
  'There must be exactly one authoritative benefit-tile stylesheet.');
const start = html.indexOf(marker);
const end = html.indexOf('</style>', start);
assert.notEqual(end, -1, 'The authoritative stylesheet must close correctly.');
const css = html.slice(start + marker.length, end);
const firstStyleStart = html.indexOf('<style>');
const firstStyleEnd = html.indexOf('</style>', firstStyleStart);
const legacyCss = html.slice(firstStyleStart, firstStyleEnd);
assert.doesNotMatch(legacyCss, /\.service(?:-strip|-copy|-icon|-text)?(?=[\s{.:,])/,
  'The legacy base stylesheet must not override benefit tiles.');
assert.ok(start > html.indexOf('id="sd-protection-script"'),
  'The single source of truth must load after earlier page styles.');

const stripStart = html.indexOf('<div class="service-strip glass">');
const stripEnd = html.indexOf('\n    </div>\n  </section>', stripStart);
assert.notEqual(stripStart, -1, 'The six-tile commitment strip must exist.');
assert.notEqual(stripEnd, -1, 'The commitment strip must close in its section.');
const markup = html.slice(stripStart, stripEnd);
assert.equal((markup.match(/class="service tap-target"/g) || []).length, 6,
  'The primary strip must keep the six reference commitments as separate tiles.');
assert.equal((markup.match(/class="service-copy"/g) || []).length, 6,
  'Every commitment must have one shared glass face.');
assert.equal((markup.match(/class="service-icon"/g) || []).length, 6,
  'Each commitment tile must have an icon.');
assert.equal((markup.match(/class="service-text"/g) || []).length, 6,
  'Each commitment must have one shrink-safe text wrapper.');
for (const label of [
  'Bảo hành 1 năm', 'Bảo dưỡng trọn đời', 'Da cá sấu cao cấp',
  'Hoàn thiện thủ công', 'Tỉ mỉ từng chi tiết', 'Đa dạng mẫu mã',
]) {
  assert.ok(markup.includes('<strong>' + label + '</strong>'), 'Missing separate brand commitment: ' + label);
}
assert.doesNotMatch(markup, /Đặt hàng theo yêu cầu|zalo\.me\/|Tư vấn\/đặt hàng qua Zalo/,
  'The additional custom-order promise belongs in the order-assurance area, not the six-tile primary strip.');
const orderStart = html.indexOf('<section class="section wrap" id="order"');
const featuredStart = html.indexOf('<section class="section wrap" id="featured">', orderStart);
assert.ok(orderStart >= 0 && featuredStart > orderStart, 'Order assurance section must remain after the six primary commitments.');
assert.ok(html.slice(orderStart, featuredStart).includes('Đặt hàng theo yêu cầu'), 'The supplemental custom-order promise must remain available in the order-assurance section.');

assert.ok(html.includes('<div class="service-strip glass">'),
  'The commitment strip must inherit the shared order-assurance glass material.');
assert.ok(!/(?:^|;)\s*(?:background|border|backdrop-filter|-webkit-backdrop-filter|box-shadow):/.test(
  css.match(/\.service-strip\{([^}]*)\}/)?.[1] || ''
), 'The outer strip must not redeclare the shared glass surface.');
const sharedGlassRule = html.match(/\.glass\{([^}]*)\}/)?.[1] || '';
const refinementStart = html.indexOf('/* === Reference-aligned Liquid Glass refinement (light/dark) === */');
const refinementEnd = html.indexOf('/* Reference-aligned cart and a separate order-details step. */', refinementStart);
assert.ok(refinementStart >= 0 && refinementEnd > refinementStart,
  'The later shared-glass refinement block must remain identifiable.');
const refinementCss = html.slice(refinementStart, refinementEnd);
assert.doesNotMatch(html, /html\.dark\s+\.service\s*,\s*html\.dark\s+\.order-cta/,
  'Dark-mode shared styling must not add an opaque background to the six transparent tile wrappers.');
assert.doesNotMatch(refinementCss, /\.glass\s*,\s*\.service-strip\b/,
  'The later shared-glass grouping must not separately override the outer commitment strip.');
assert.doesNotMatch(refinementCss, /\.service-strip\{[^}]*\b(?:background|border|backdrop-filter|-webkit-backdrop-filter|box-shadow)\s*:/,
  'The later refinement must not replace the outer strip material; it must inherit the shared glass layer.');
assert.ok(sharedGlassRule.includes('background:var(--glass)') && sharedGlassRule.includes('border:1px solid var(--line)'),
  'The outer section must inherit the shared theme background and border.');
assert.match(sharedGlassRule, /backdrop-filter:blur\(24px\) saturate\(145%\)/,
  'The outer strip must inherit the existing Liquid Glass blur.');
assert.ok(sharedGlassRule.includes('box-shadow:inset 0 1px 0 rgba(255,255,255,.29),0 12px 34px rgba(0,0,0,.055)'),
  'The outer strip must inherit the shared glass elevation.');

assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)/,
  'Desktop must provide six equal columns for the primary commitment tiles.');
assert.match(css, /border-radius:15px/,
  'Commitment faces must be compact rounded cards, not long pills.');
assert.match(css, /background:var\(--benefit-tile-glass\)/,
  'Each commitment must use the theme-specific glass gradient.');
assert.ok(css.includes('box-shadow:var(--benefit-tile-shadow)') && css.includes('box-shadow:var(--benefit-tile-hover-shadow)'),
  'Commitment faces must retain layered elevation and the hover state.');
assert.ok(css.includes('border:1px solid var(--benefit-tile-border)'),
  'Commitment faces must retain a theme-specific visible rim.');
assert.match(css, /backdrop-filter:blur\(22px\) saturate\(160%\);-webkit-backdrop-filter:blur\(22px\) saturate\(160%\)/,
  'Commitment faces must retain the frosted-glass treatment.');
assert.match(css, /\.service-strip \.service-icon\{[^}]*border:1px solid rgba\(122,168,198,\.42\)[^}]*border-radius:50%[^}]*background:rgba\(255,255,255,\.58\)[^}]*box-shadow:/,
  'Reference-aligned benefit icons must have a subtle rounded glass chip inside each tile.');
assert.match(css, /html\.dark \.service-strip \.service-icon\{[^}]*border-color:rgba\(204,231,250,\.38\)[^}]*background:rgba\(130,179,215,\.16\)[^}]*box-shadow:/,
  'Dark mode must use its own restrained translucent icon-chip surface.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.service-strip \.service-icon\{flex-basis:25px;width:25px;height:25px\}[\s\S]*?\.service-strip \.service-icon svg\{width:15px;height:15px\}/,
  'Mobile icon chips and symbols must shrink to protect the 3×2 tile layout.');
assert.match(css, /@media\(max-width:390px\)\{[\s\S]*?\.service-strip \.service-icon\{flex-basis:23px;width:23px;height:23px\}[\s\S]*?\.service-strip \.service-icon svg\{width:14px;height:14px\}/,
  'Very narrow phones must use smaller icon chips and symbols.');
assert.match(css, /\.service-strip \.service-icon\{[^}]*flex:0 0 28px[^}]*width:28px;height:28px/,
  'Desktop benefit icon chips must be large enough to match the approved glass-icon reference.');
assert.match(css, /\.service-strip \.service-icon svg\{display:block;width:17px;height:17px/,
  'Desktop benefit SVG strokes must stay legible at the larger reference-aligned chip scale.');
const lightThemeTokens = html.match(/:root\{([^}]*)\}/)?.[1] || '';
const darkThemeTokens = html.match(/html\.dark\{([^}]*)\}/)?.[1] || '';
assert.match(lightThemeTokens, /--benefit-tile-glass:linear-gradient\(145deg,rgba\(255,255,255,\.88\)/,
  'Light mode must use an ice-blue translucent glass surface.');
assert.match(darkThemeTokens, /--benefit-tile-glass:linear-gradient\(145deg,rgba\(36,66,91,\.96\)/,
  'Dark mode must use high-opacity layered navy glass.');
assert.match(lightThemeTokens, /--benefit-tile-border:rgba\(255,255,255,\.80\)/,
  'Light mode must keep a bright glass rim.');
assert.match(darkThemeTokens, /--benefit-tile-border:rgba\(204,231,250,\.44\)/,
  'Dark mode must keep a clear blue-steel rim.');
assert.match(css, /@media\(max-width:1050px\) and \(min-width:761px\)\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)/,
  'Tablet must use three columns.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)/,
  'Mobile must retain the three-column commitment grid.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.service-strip \.service-text strong\{font-size:9\.4px/,
  'Mobile commitment labels must fit the compact reference tiles.');
assert.doesNotMatch(css, /aspect-ratio:(?:2\.75|3\.5|2\.4|2\.25)\s*\/\s*1/,
  'Fixed wide-card aspect ratios must not force blank space or crop the copy.');

assert.ok(html.includes('.pill-btn.primary{background:linear-gradient(135deg,rgba(255,255,255,.42),rgba(126,177,215,.24));border-color:rgba(116,171,211,.62)}'),
  'Primary actions must keep their cool glass gradient and blue-steel rim.');
console.log('PASS: six primary commitment tiles, retained supplemental promise, cool theme glass, and desktop/tablet/mobile grids.');
