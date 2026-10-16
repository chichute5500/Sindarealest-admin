import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const cssAndMarkup = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');

// The initial paint must use the chosen theme and start loading both croc textures
// before a visitor taps the theme control for the first time.
assert.match(html, /<link rel="preload" as="image" href="images\/theme-croc-dark\.webp"/,
  'Dark crocodile texture must be preloaded.');
assert.match(html, /<link rel="preload" as="image" href="images\/theme-croc-albino\.webp"/,
  'Light crocodile texture must be preloaded.');
assert.match(html, /meta\[name="theme-color"\][\s\S]{0,100}root\.classList\.contains\('dark'\)\?'#050505':'#efe8dc'/,
  'Browser chrome color must be aligned with the initial theme before first paint.');

// There must be one duration token and one authoritative cross-fade clock.
// The previous 1.15s / 250ms / 280ms / 340ms overrides were competing.
assert.equal((cssAndMarkup.match(/--sd-theme-duration:360ms/g) || []).length, 1,
  'Theme duration must have one source of truth.');
assert.equal((cssAndMarkup.match(/html,body\{transition:background-color var\(--sd-theme-duration\) ease,color var\(--sd-theme-duration\) ease\}/g) || []).length, 1,
  'Root surfaces must use the unified theme duration.');
assert.equal((cssAndMarkup.match(/\.theme-bg\{transition:opacity var\(--sd-theme-duration\) cubic-bezier\(\.22,\.61,\.36,1\)\}/g) || []).length, 1,
  'Theme textures must crossfade through opacity only, on the shared clock.');
assert.equal((cssAndMarkup.match(/body:after\{transition:background var\(--sd-theme-duration\) ease\}/g) || []).length, 1,
  'The theme overlay must use the shared clock.');
assert.doesNotMatch(cssAndMarkup, /transition:background-color 1\.15s cubic-bezier\(\.22,\.61,\.36,1\)[^}]*!important/,
  'Legacy long-duration theme transition must be removed.');
assert.doesNotMatch(cssAndMarkup, /html\.theme-transitioning \.glass,html\.theme-transitioning \.glass-soft[^}]*\.25s ease/,
  'Legacy 250ms transition override must be removed.');
assert.doesNotMatch(cssAndMarkup, /\.theme-bg\{[^}]*transition:[^}]*filter/,
  'Texture filters must not animate separately and cause a visual pulse.');
assert.doesNotMatch(cssAndMarkup, /html\.dark \.theme-bg--dark\{[^}]*filter:/,
  'Dark mode must not switch a texture filter halfway through its crossfade.');

// All descendants synchronize their existing transitions instead of replacing
// animation properties, and the reduced-motion rule must override this at the end.
assert.match(cssAndMarkup, /html\.theme-transitioning body \*,\s*html\.theme-transitioning body \*::before,\s*html\.theme-transitioning body \*::after\{\s*transition-duration:var\(--sd-theme-duration\)!important;\s*transition-timing-function:cubic-bezier\(\.22,\.61,\.36,1\)!important;\s*transition-delay:0s!important;/,
  'Theme-dependent children and pseudo-elements must use the same timed transition.');
const unifiedIndex = cssAndMarkup.indexOf('/* Theme transitions — one clock and one compositor path');
assert.ok(unifiedIndex >= 0, 'The centralized transition system must be present.');
const reducedIndex = cssAndMarkup.indexOf('@media(prefers-reduced-motion:reduce)', unifiedIndex);
assert.ok(reducedIndex > unifiedIndex, 'Reduced-motion override must follow the centralized transition block.');
assert.match(cssAndMarkup.slice(reducedIndex), /transition:none!important/,
  'Users requesting reduced motion must not receive the animated theme crossfade.');

// Runtime must preserve rapid repeated taps, account for reduced motion, and
// delay the mobile browser chrome color update until the crossfade has settled.
const applyStart = html.indexOf('function applyThemeMode(mode,animate=true)');
const applyEnd = html.indexOf('function toggleTheme()', applyStart);
assert.ok(applyStart >= 0 && applyEnd > applyStart, 'Theme switching function must be identifiable.');
const apply = html.slice(applyStart, applyEnd);
assert.match(apply, /clearTimeout\(window\.__sdThemeTimer\)/,
  'A rapid repeat switch must cancel the previous transition timer.');
assert.match(apply, /prefers-reduced-motion: reduce/,
  'Runtime must respect reduced-motion preferences.');
assert.match(apply, /setTimeout\(\(\)=>\{root\.classList\.remove\('theme-transitioning'\);syncThemeMeta\(\)\},440\)/,
  'Theme class and browser chrome color must settle together after the crossfade.');
assert.doesNotMatch(apply, /root\.classList\.toggle\('dark',[\s\S]*?syncThemeMeta\(\);setThemeIcon\(\)/,
  'Browser chrome must not change color in the same frame as the theme switch.');

console.log('PASS: theme transition uses preloaded textures, one 360ms opacity crossfade, synchronized surfaces, and reduced-motion-safe runtime timing.');
