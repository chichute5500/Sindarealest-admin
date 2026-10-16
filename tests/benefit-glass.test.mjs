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
assert.equal(ruleMatches.length, 1, 'There must be one authoritative service-copy surface rule.');
assert.match(ruleMatches[0][1], /background:var\(--service-copy-bg\)/,
  'The shared surface rule must resolve its background through the theme token.');
assert.doesNotMatch(ruleMatches[0][1], /background\s*:\s*rgba\(/,
  'The shared component must not hard-code a theme-specific background.');
assert.equal((html.match(/html\.dark\s+\.service-strip\s+\.service-copy\s*\{/g) || []).length, 0,
  'A duplicate dark-mode selector must not override the shared glass surface.');

console.log('PASS: six benefit text panels share one theme-aware translucent glass surface; dark mode has no opaque black override.');
