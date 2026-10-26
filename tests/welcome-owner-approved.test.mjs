import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Owner PASS on 2026-10-25, source of truth: PR #113 / 4df440bc.
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const performance=html.match(/<style id="sd-welcome-desktop-mobile-performance-2026-10-25">([\s\S]*?)<\/style>/)?.[1];
assert.ok(performance,'Approved desktop/mobile Welcome CSS must be present before body');
assert.ok(html.indexOf('id="sd-welcome-desktop-mobile-performance-2026-10-25"')<html.indexOf('</head>'));
const base=html.match(/\.welcome-content\{display:flex;[^\n]*\}/)?.[0]||'';
assert.ok(base.includes('background:transparent'),'First paint must be transparent, not a white glass card');
assert.ok(base.includes('border:0;')&&base.includes('backdrop-filter:none;')&&base.includes('box-shadow:none;'));
assert.ok(!base.includes('background:var(--welcome-panel)'));
assert.ok(performance.includes('html:has(body.welcome-active){overflow:hidden!important'));
assert.ok(performance.includes('body.welcome-active{height:100dvh!important'));
assert.ok(performance.includes('height:100dvh!important;max-height:100dvh!important'));
assert.ok(performance.includes('animation:sdWelcomeLite .36s ease-out both!important'));
assert.ok(performance.includes('@media(min-width:761px)'));
assert.ok(performance.includes('@media(max-width:760px)'));
assert.ok(performance.includes('#welcomeSplash .welcome-texture{filter:none!important;transform:none!important;transition:none!important}'));
assert.ok(performance.includes('#welcomeSplash .welcome-content>*{animation:none!important;filter:none!important}'));
assert.ok(html.includes('window.setTimeout(dismiss,reduced?220:1450);'),'Opening lifecycle must match approved quick Welcome');
assert.ok(html.includes('    },360);\n  }\n  window.__sdDismissWelcome'),'Closing overlay must match approved 360ms dismissal');
assert.match(html,/\.welcome-texture--dark\{[^\n]*filter:none\}/);
assert.match(html,/\.welcome-texture--light\{[^\n]*filter:none\}/);
assert.ok(html.includes('<section class="sd-code-hero wrap" id="home"'),'Owner-approved separate HERO must remain');
assert.ok(html.includes('<link rel="stylesheet" href="/code-hero.css?v=20261026-1">'),'HERO stylesheet remains untouched');
assert.ok(!html.includes('<picture class="hero-reference-art"'),'Never bring back bitmap HERO');
console.log('PASS: Owner-approved Welcome from PR #113 isolated into fix branch; code-only HERO protected.');

// Guard the approved fade against uncovering a still-locked or unfinished page.
assert.match(html,/if\(!window\.__sdStorefrontReady\|\|document\.readyState==='loading'\)/);
assert.match(html,/document\.body\.classList\.remove\('welcome-active'\);\n    void document\.body\.offsetHeight;\n    s\.classList\.add\('is-leaving'\)/);
assert.match(html,/init\(\)\.then\(finishStorefrontStartup,finishStorefrontStartup\)/);

// During the approved 360ms exit, text must clear before the backdrop fades.
assert.match(performance,/#welcomeSplash\.is-leaving \.welcome-content\{[\s\S]*?opacity:0!important;/);
assert.match(performance,/#welcomeSplash\.is-leaving\{\n  transition:opacity \.20s ease \.10s,visibility 0s linear \.30s!important/);

// Cold-cache first-paint guard: wait for the correct Noto Serif/Sans glyphs.
assert.match(html,/rel="preload" href="\/fonts\/NotoSerif-Regular\.ttf"/);
assert.match(html,/rel="preload" href="\/fonts\/NotoSans-Regular\.ttf"/);
assert.match(performance,/html\.js-enabled:not\(\.sd-welcome-font-ready\) #welcomeSplash \.welcome-title/);
assert.match(html,/document\.fonts\.load\('400 30px "SD Serif"'/);
assert.match(html,/classList\.add\('sd-welcome-font-ready'\)/);
