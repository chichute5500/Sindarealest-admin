import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// Accessibility and mobile-safety contracts for the real storefront markup/CSS.
// These assertions complement the Playwright preview; they do not claim an
// independent WCAG audit or replace testing on physical devices.
assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i,
  'the storefront must respect users who request reduced motion');
assert.match(html, /function setupArtSlideshow\(\)[\s\S]*?const reduceMotion=!!\(window\.matchMedia&&window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)[\s\S]*?if\(reduceMotion\)[\s\S]*?return\}show\(Math\.floor\(Math\.random\(\)\*pool\.length\)\);artTimer=setInterval/i,
  'the editorial carousel must use a stable initial image and disable auto-advance for reduced-motion users while preserving manual controls');
assert.match(html, /button:focus-visible,a:focus-visible,input:focus-visible/,
  'keyboard users must receive a visible focus indicator');
assert.match(html, /env\(safe-area-inset-top\)/,
  'top overlays/navigation must account for device safe areas');
assert.match(html, /env\(safe-area-inset-bottom\)/,
  'bottom navigation and drawers must account for device safe areas');
assert.match(html, /role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/,
  'modal/drawer UI must expose dialog semantics');
assert.match(html, /aria-live="polite"/,
  'dynamic cart/account/status content must expose polite live regions');
assert.match(html, /min-height:\s*44px/,
  'interactive mobile controls must provide at least a 44px minimum target height');
assert.match(html, /addEventListener\(['"]keydown['"]/,
  'keyboard dismissal/navigation handling must be registered');
assert.match(html, /key\s*===?\s*['"]Escape['"]|keyCode\s*===\s*27/,
  'Escape key must be handled for dismissible overlays');

assert.match(html, /<div class="overlay" id="productOverlay" role="dialog" aria-modal="true" aria-labelledby="detailTitle" aria-hidden="true" tabindex="-1" inert><div class="detail-modal">/,
  'the product detail overlay must be the single modal dialog container');
console.log('PASS: storefront accessibility contracts cover reduced motion, keyboard focus, safe areas, dialog semantics, live regions and mobile target sizing.');
