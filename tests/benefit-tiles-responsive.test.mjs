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
const stripEnd = html.indexOf('</div>\n  </section>', stripStart);
assert.notEqual(stripStart, -1, 'The six-tile strip must exist.');
assert.notEqual(stripEnd, -1, 'The benefit strip must close in its section.');
const markup = html.slice(stripStart, stripEnd);
assert.equal((markup.match(/class="service tap-target"/g) || []).length, 6,
  'All six benefit tiles must remain.');
assert.equal((markup.match(/class="service-copy"/g) || []).length, 6,
  'Each tile must have one shared glass surface.');
assert.equal((markup.match(/class="service-icon"/g) || []).length, 6,
  'Every icon must sit inside the shared glass surface.');
assert.equal((markup.match(/class="service-text"/g) || []).length, 6,
  'All captions must have a shrink-safe text wrapper.');
assert.equal((markup.match(/class="service-copy"><span class="service-icon">[\s\S]*?<span class="service-text">/g) || []).length, 6,
  'Icon and caption must share one surface.');
assert.match(markup, /href="https:\/\/zalo\.me\/0827049192"/,
  'The Zalo tile must keep its confirmed destination.');
assert.match(markup, /<strong>Tư Vấn 24\/7<\/strong><small>Hỗ trợ tận tâm<\/small>/,
  'The Zalo tile copy must remain unchanged.');

const ctaGradient = 'linear-gradient(135deg,rgba(255,255,255,.30),rgba(189,145,63,.20))';
assert.ok(html.includes('.pill-btn.primary{background:' + ctaGradient + ';border-color:rgba(220,184,114,.57)}'),
  'The reference Zalo CTA gradient and border must exist.');
assert.match(html, /\.pill-btn\{[^}]*border-radius:999px/,
  'The reference Zalo CTA uses a pill-shaped radius.');
assert.ok(css.includes('background:linear-gradient(135deg,rgba(250,251,252,.94),rgba(224,228,232,.86))'),
  'The tile surface must use a stronger neutral glass gradient, not a yellow-tinted gradient.');
assert.ok(css.includes('box-shadow:0 7px 18px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.92),inset 0 -1px 0 rgba(34,40,46,.12)'),
  'The tile surface must have elevated, multi-layer depth.');
assert.ok(css.includes('border:1px solid rgba(255,255,255,.82)'),
  'The neutral tile border must remain fixed between light and dark modes.');

const stripRule = css.match(/\.service-strip\{([^}]*)\}/)?.[1] || '';
assert.ok(stripRule.includes('background:rgba(255,255,255,.40)'),
  'The outer region must use one fixed glass background in both themes.');
assert.doesNotMatch(stripRule, /var\(--panel\)|var\(--card-glass\)|html\.dark/,
  'The outer background must not use a theme-switching surface token.');
assert.match(stripRule, /backdrop-filter:blur\(24px\) saturate\(145%\)/,
  'The outer region must match the site glass blur treatment.');
assert.match(css, /\.service-strip \.service-copy\{[\s\S]*?border-radius:999px/,
  'Each inner text surface must use the same pill-like rounding as the Zalo CTA.');
assert.match(css, /\.service-strip \.service-copy\{[\s\S]*?background:linear-gradient\(135deg,rgba\(250,251,252,\.94\),rgba\(224,228,232,\.86\)\)/,
  'The neutral inner glass background must remain fixed across theme switches.');
assert.match(css, /\.service-strip \.service-copy\{[\s\S]*?backdrop-filter:blur\(18px\);-webkit-backdrop-filter:blur\(18px\)/,
  'The shared surface must keep its frosted glass treatment.');
assert.match(css, /\.service-strip \.service-icon\{[\s\S]*?background:transparent;box-shadow:none/,
  'Icons must not introduce a second background panel.');
assert.doesNotMatch(css, /\.service-strip \.service-copy::before|--service-copy-bg|html\.dark/,
  'Avoid competing overlays and theme-specific inner surface colors.');
assert.doesNotMatch(css, /aspect-ratio:(?:2\.75|3\.5|2\.4|2\.25)\s*\/\s*1/,
  'The old fixed card ratios must not create excess blank space or clip larger captions.');
assert.match(css, /\.service-strip \.service\{[^}]*aspect-ratio:auto/,
  'Tile height must follow content rather than a fixed ratio.');

assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)/,
  'Desktop must use six equal columns.');
assert.match(css, /@media\(max-width:1050px\) and \(min-width:761px\)\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)/,
  'Tablet widths must use three columns.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)/,
  'Mobile widths must use two columns.');
assert.match(css, /\.service-strip \.service-text strong\{[^}]*font-size:12px/,
  'Desktop title text must be enlarged by 20% from 10px.');
assert.match(css, /\.service-strip \.service-text small\{[^}]*font-size:10\.2px/,
  'Desktop caption text must be enlarged by 20% from 8.5px.');
assert.match(css, /\.service-strip \.service-copy\{[\s\S]*?color:#262626/,
  'The tile text color must stay dark and readable in both themes.');
assert.match(css, /\.service-strip \.service-text small\{[^}]*color:#53575a/,
  'The description text must use a fixed neutral color, not the theme's warm muted color.');
assert.doesNotMatch(css, /\.service-strip \.service-copy\{[^}]*color:var\(--ink\)/,
  'The inner tile text must not inherit a theme-dependent ink color.');
assert.doesNotMatch(css, /\.service-strip \.service-text small\{[^}]*color:var\(--muted\)/,
  'The inner tile description must not inherit a theme-dependent muted color.');
assert.match(css, /@media\(max-width:1050px\) and \(min-width:761px\)\{[\s\S]*?\.service-strip \.service-text strong\{font-size:12\.24px\}[\s\S]*?\.service-strip \.service-text small\{font-size:10\.44px\}/,
  'Tablet text must retain the 20% size increase.');
assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.service-strip \.service-text strong\{font-size:11\.4px[\s\S]*?\.service-strip \.service-text small\{font-size:9\.84px/,
  'Mobile text must retain the 20% size increase.');
assert.match(css, /@media\(max-width:390px\)\{[\s\S]*?\.service-strip \.service-text strong\{font-size:10\.92px\}[\s\S]*?\.service-strip \.service-text small\{font-size:9\.48px\}/,
  'Narrow-phone text must retain the 20% size increase.');

const copyRules = [...css.matchAll(/\.service-strip\s+\.service-copy\{([^}]*)\}/g)]
  .map(match => match[1].replace(/\s+/g, ''));
assert.equal(copyRules.filter(rule => /(?:^|;)background:/.test(rule)).length, 1,
  'The CTA-matched surface background must have one authoritative declaration.');
assert.equal(copyRules.filter(rule => /(?:^|;)border:/.test(rule)).length, 1,
  'The CTA-matched surface border must have one authoritative declaration.');
assert.equal(copyRules.filter(rule => /(?:^|;)-webkit-backdrop-filter:/.test(rule)).length, 1,
  'The CTA-matched glass blur must have one authoritative declaration.');
const tileGradient = 'linear-gradient(135deg,rgba(250,251,252,.94),rgba(224,228,232,.86))';
assert.ok(copyRules.some(rule => rule.includes('background:' + tileGradient) && rule.includes('backdrop-filter:blur(18px)')),
  'Responsive overrides may adjust dimensions, but not replace the neutral shared surface treatment.');

console.log('PASS: stable two-layer Liquid Glass, compact content-sized tiles, 20% larger text, and no legacy cascade.');
