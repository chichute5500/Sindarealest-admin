import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Owner PASS on 2026-10-25, source of truth: PR #113 / 4df440bc.
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
// Owner requested a lighter Welcome on 2026-11-01; retain first-paint/keyboard protections.
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
assert.ok(html.includes('},reduced?100:1050);'),'Welcome keeps its original ~1s automatic close deadline');
assert.ok(html.includes('if(!autoDismissElapsed||!titlePaintedAt||closed)return;'),
 'Slow devices must keep Welcome until the title had a paint opportunity');
assert.ok(html.includes('titlePaintedAt+400-performance.now()'),
 'When the font arrives late, allow time for an observable LCP before closing');
assert.ok(html.includes('window.requestAnimationFrame(function(){'),
 'Welcome title paint guard must wait for animation frames');
assert.match(html,/window\.setTimeout\(function\(\)\{\s*if\(!titlePaintedAt&&!closed\)\{\s*revealWelcomeCopy\(true\)/,
 'Hung fonts need a readable fallback instead of blocking Welcome forever');
assert.match(html, /class="welcome-logo-frame"/, 'Welcome uses a static 3D halo around the brand logo');
assert.match(performance, /#welcomeSplash \.welcome-logo-frame\{/, 'Welcome material belongs to existing authoritative stylesheet');
assert.doesNotMatch(html, /A MARK OF DISTINCTION · SINCE YOUR FIRST IMPRESSION/, 'Avoid redundant Welcome copy');
assert.ok(html.includes('      },360);') && html.includes('window.__sdDismissWelcome=dismiss;'),
 'Closing overlay must still use its approved 360ms dismissal');
assert.match(html,/\.welcome-texture--dark\{[^\n]*filter:none\}/);
assert.match(html,/\.welcome-texture--light\{[^\n]*filter:none\}/);
assert.ok(html.includes('<section class="sd-code-hero wrap" id="home"'),'Owner-approved separate HERO must remain');
assert.ok(html.includes('<link rel="stylesheet" href="/code-hero.css?v=20261026-2">'),'Owner-requested HERO copy update keeps the separate versioned stylesheet');
assert.ok(!html.includes('<picture class="hero-reference-art"'),'Never bring back bitmap HERO');
console.log('PASS: Owner-approved Welcome from PR #113 isolated into fix branch; code-only HERO protected.');

// Guard the approved fade against uncovering a still-locked or unfinished page.
assert.match(html,/if\(document\.readyState==='loading'\)/,
 'Welcome must wait for document parse, not products API hydration');
assert.match(html,/document\.addEventListener\('DOMContentLoaded',dismiss,\{once:true\}\)/);
assert.doesNotMatch(html,/window\.__sdStorefrontReady=true;\s*dismiss\(\);\s*\},2400\)/,
 'No 2.4-second network fallback delay when public SSR is already available');
assert.match(html,/document\.body\.classList\.remove\('welcome-active'\);/);
assert.match(html,/window\.requestAnimationFrame\(beginFade\)/,
 'Paint-separated exit must preserve the locked-page release before fading');
assert.match(html,/init\(\)\.then\(finishStorefrontStartup,finishStorefrontStartup\)/);

// During the approved 360ms exit, text must clear before the backdrop fades.
assert.match(performance,/#welcomeSplash\.is-leaving \.welcome-content\{[\s\S]*?opacity:0!important;/);
assert.match(performance,/#welcomeSplash\.is-leaving\{\n  transition:opacity \.20s ease \.10s,visibility 0s linear \.30s!important/);

// Cold-cache first-paint guard: wait for the correct Noto Serif/Sans glyphs.
assert.match(html,/rel="preload" href="\/fonts\/NotoSerif-Regular\.woff2" as="font" type="font\/woff2"/);
assert.match(html,/rel="preload" href="\/fonts\/NotoSans-Regular\.woff2" as="font" type="font\/woff2"/);
assert.match(performance,/html\.js-enabled:not\(\.sd-welcome-font-ready\):not\(\.sd-welcome-font-fallback\) #welcomeSplash \.welcome-title/);
assert.match(html,/document\.fonts\.load\('400 30px "SD Serif"'/);
assert.match(html,/classList\.add\(fallback\?'sd-welcome-font-fallback':'sd-welcome-font-ready'\)/);

// Only allow first-paint text after successful Noto font readiness.
assert.doesNotMatch(html,/window\.setTimeout\(revealWelcomeCopy,1200\)/);
assert.match(html,/document\.fonts\.check\('400 30px "SD Serif"'/);
assert.match(html,/classList\.add\(fallback\?'sd-welcome-font-fallback':'sd-welcome-font-ready'\)/);

/* LCP optimization: the approved Welcome title uses the real Serif font,
 * but must not wait for the separate Sans font needed by secondary copy. */
assert.match(performance,/html\.js-enabled\.sd-welcome-serif-ready:not\(\.sd-welcome-font-ready\):not\(\.sd-welcome-font-fallback\) #welcomeSplash \.welcome-title\{\s*visibility:visible!important;/);
assert.match(html,/var serifReady=document\.fonts\.load\('400 30px "SD Serif"'/);
assert.match(html,/if\(valid\)\{\s*document\.documentElement\.classList\.add\('sd-welcome-serif-ready'\);\s*noteWelcomeTitlePaint\(\)/);
assert.match(html,/Promise\.all\(\[serifReady,sansReady\]\)/);
assert.match(html,/autoDismissElapsed=true;\s*maybeTimedDismiss\(\);\s*\},reduced\?100:1050\)/,
 'On fast devices, approved dismissal still starts after 1050ms');

/* LCP regression: font needed by the Welcome heading must outrank the
 * auxiliary body font without swapping away from Owner-approved typography. */
assert.match(html, /rel="preload" href="\/fonts\/NotoSerif-Regular\.woff2" as="font" type="font\/woff2" crossorigin fetchpriority="high"/);
assert.match(html, /rel="preload" href="\/fonts\/NotoSans-Regular\.woff2" as="font" type="font\/woff2" crossorigin fetchpriority="low"/);
// Lighthouse 13: Hero H1 consumes Serif Bold, which previously began loading at
// ~1.5s and completed ~4.9s. Prioritize Welcome Serif Regular before Bold;
// keep the same exact Hero font face and defer only its network priority.
assert.match(html,/rel="preload" href="\/fonts\/NotoSerif-Bold\.woff2" as="font" type="font\/woff2" crossorigin fetchpriority="low"/);
assert.match(html,/rel="preload" href="\/code-hero\.css\?v=20261026-2" as="style" fetchpriority="high"/);
assert.ok(html.indexOf('rel="preload" href="/code-hero.css') < html.indexOf('<style>'),
  'Preload Hero CSS before the long approved inline CSS, while retaining its original stylesheet cascade');

/* Cold mobile: the original Noto face is still used if ready within ~950ms.
 * If it is slower, the existing system fallback receives two paint frames
 * before Welcome exits; the approved original visual timing remains ~1s. */
assert.match(html,/if\(!titlePaintedAt&&!closed\)\{\s*revealWelcomeCopy\(true\);\s*noteWelcomeTitlePaint\(\);\s*\}\s*\},950\)/);
assert.ok(!html.includes('},2600);'),'Do not let the welcome font watchdog hold a throttled mobile for 2.6s');

/* Without JavaScript the splash timer cannot run; public server-rendered
 * products and their native navigation must never be blocked by Welcome. */
assert.match(html,/html:not\(\.js-enabled\):has\(body\.welcome-active\)\{overflow:auto!important/);
assert.match(html,/html:not\(\.js-enabled\) body\.welcome-active\{height:auto!important;min-height:100vh!important;overflow-x:hidden!important;overflow-y:auto!important/);
assert.match(html,/html:not\(\.js-enabled\) #welcomeSplash\{display:none!important\}/);

// The Welcome exit must not synchronously force a full-page reflow.
// Keep the same approved 360ms fade after a browser paint opportunity.
const welcomeExit=html.slice(html.indexOf('  function dismiss(){'),html.indexOf('  window.__sdDismissWelcome=dismiss;'));
assert.ok(welcomeExit.includes("document.body.classList.remove('welcome-active');"));
assert.ok(!welcomeExit.includes('void document.body.offsetHeight'),
 'Welcome closing may not force a synchronous layout flush');
assert.ok(welcomeExit.includes('window.requestAnimationFrame(beginFade)') && welcomeExit.includes('s.classList.add(\'is-leaving\')'),
 'Welcome must use a painted frame before the original leave transition');
assert.ok(welcomeExit.includes('},360);'),
 'Welcome must retain its approved 360ms exit fade');
