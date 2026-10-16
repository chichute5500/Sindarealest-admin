import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// All six benefit captions must use one component and must not inherit a second
// glass layer whose background can conflict with the theme-specific surface.
assert.equal((html.match(/class="service-copy"/g) || []).length, 6,
  'All six benefit captions must use the shared service-copy component.');
assert.equal((html.match(/class="service-copy glass-soft"/g) || []).length, 0,
  'Benefit captions must not combine service-copy with the conflicting glass-soft background.');

assert.match(html, /:root\{[^}]*--service-copy-bg:rgba\(255,252,246,\.76\)/,
  'Light mode must give the text panel enough translucency for readable text.');
assert.match(html, /html\.dark\{[^}]*--service-copy-bg:rgba\(255,255,255,\.38\)/,
  'Dark mode must use translucent glass, not an opaque black fill.');

const ruleMatches = [...html.matchAll(/\.service-strip \.service-copy\{([^}]*)\}/g)];
const surfaceRules = ruleMatches.filter(([, declarations]) => /background:var\(--service-copy-bg\)/.test(declarations));
assert.equal(surfaceRules.length, 1,
  'There must be one authoritative background declaration; responsive rules may adjust layout only.');
assert.doesNotMatch(surfaceRules[0][1], /background\s*:\s*rgba\(/,
  'The shared component must not hard-code a theme-specific background.');
assert.equal((html.match(/html\.dark\s+\.service-strip\s+\.service-copy\s*\{/g) || []).length, 0,
  'A duplicate dark-mode selector must not override the shared glass surface.');

// Validate the authoritative panel rule (the one owning the background token), not
// whichever duplicate selector happens to appear first in document order.
const surfaceRule = surfaceRules[0]?.[1] || '';
assert.match(surfaceRule, /display:flex;[^}]*flex-direction:column;[^}]*min-height:50px/,
  'The authoritative text panel must grow from its content rather than squeezing a two-line caption into a fixed row.');
assert.match(surfaceRule, /background:var\\(--service-copy-bg\\)/,
  'The one authoritative panel rule must continue to use the theme token.');
assert.match(html, /\.service-strip \.service-copy::before\{[^}]*background:var\(--service-copy-gradient\)/,
  'The subtle left-to-right glass highlight must be rendered as a separate overlay.');
assert.match(html, /--service-copy-gradient:linear-gradient\(90deg,[^}]*rgba\(218,184,112,\.13\) 100%\)/,
  'The shared gradient must move horizontally and finish in an extremely subtle warm gold.');
assert.match(html, /\.service-strip \.service-copy small\{[^}]*font-size:9px;[^}]*line-height:1\.35;[^}]*white-space:normal;[^}]*opacity:1/,
  'The supporting caption must be clearly visible, wrap naturally, and not be hidden by opacity.');
assert.match(html, /@media\\(max-width:760px\\)[\\s\\S]*?\\.service-strip \\.service-copy\\{min-height:52px;[^}]*\\}[^}]*\\.service-strip \\.service-copy strong\\{font-size:9px\\}[^}]*\\.service-strip \\.service-copy small\\{font-size:8\\.7px;line-height:1\\.35\\}/,
  'Mobile captions need a little more room and readable sizing.');

// Verify the compact layout has one explicit, content-safe ratio per breakpoint,
// and equal grid tracks so no one of the six tiles becomes taller than its peers.
assert.equal((html.match(/aspect-ratio:2\\.75 \\/ 1/g) || []).length, 1,
  'Desktop benefit tiles must have one consistent compact aspect ratio.');
assert.equal((html.match(/aspect-ratio:2\\.4 \\/ 1/g) || []).length, 1,
  'Mobile benefit tiles must have one consistent content-safe aspect ratio.');
assert.match(html, /grid-template-columns:repeat\\(6,minmax\\(0,1fr\\)\\);\\s*grid-auto-rows:1fr/,
  'Desktop benefit tiles must use six equal grid columns and equal track sizing.');
assert.match(html, /grid-template-columns:repeat\\(2,minmax\\(0,1fr\\)\\);\\s*grid-auto-rows:1fr/,
  'Mobile benefit tiles must use two equal columns and equal row sizing.');


console.log('PASS: six benefit panels use content-led height, visible subtitles, and a subtle horizontal white-to-gold glass sweep in both themes.');
