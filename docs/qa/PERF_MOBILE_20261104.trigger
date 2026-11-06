One-time isolated Preview QA for branch fix/storefront-mobile-critical-requests-20261104.
Requires exact candidate SHA; only read-only browser/lighthouse tests after verified Preview deployment.
No Production writes.
Validated marker using file presence (shallow checkout compatible).
Runner now uses npm install (repository intentionally has no lockfile).
QA v2: Browser PerformanceObserver records real LCP; expected Preview noindex is not Production SEO regression.
QA v3: valid candidate Performance >=90 is accepted when Production Lighthouse baseline is NO_LCP.
2026-11-05: validate deferred Home catalog images plus no-JS fallback; pinned candidate only.
2026-11-05 candidate: independent preloaded Serif readiness for Welcome LCP; keep intro visual/timing unchanged.
2026-11-05 candidate: low-priority native lazy loading for below-fold featured product photos; cold mobile Lighthouse regression gate.

2026-11-05: one SHA-pinned browser/Lighthouse run for true first-visit LCP, deferred featured images, and no-JS fallbacks.
2026-11-05: verify observed DevTools-throttled Lighthouse mobile/desktop; simulated NO_LCP was not evidence of page regression. Validate cold-visit native LCP by both formats.

2026-11-05: verify actual Welcome font fetch priority and 4 repeated DevTools-throttled mobile runs. NO_LCP substring detection; require >=2 valid scores >=90 before release.

2026-11-05: cold-font LCP root-cause candidate. Preserve original 1050ms minimum Welcome timing; defer auto-close until Serif/fallback heading had two paints plus 400ms on slow devices. Browser QA intercepts/delays Serif font by 1700ms. Do not merge without Lighthouse >=90 repeatable and baseline comparisons.

2026-11-05: reduce cold mobile bytes: fullscreen-only 118KB brand image now hydrates on opening gallery. Add browser GET guard and detail contract. Run against precise SHA, retain Draft until mobile Lighthouse stable PASS.

2026-11-05: SHA-bound push-driven Preview QA after correcting the gallery image tests and Welcome timing test. Strict branch+marker event gate; never deploy Production or touch real D1/R2.

2026-11-05: evaluate first-visit mobile LCP with Lighthouse 13.6.0 (Node 22), modern headless and independent CDP 4x-CPU/1.6Mbps native LCP. Distinguish NO_LCP trace artifact from real blank pages; keep all raw attempts and 2-valid-score >=90 gate. Fix slow-font scenario guard bug. Exact experimental SHA only; no Production release.

2026-11-05: regression data from Lighthouse 13: 4/4 valid mobile runs, scores 89/78/78/78; LCP ~5.6-5.7s in 3 runs. Critical Hero H1 requires NotoSerif Bold; font previously began ~1.53s, ended ~4.88s. Candidate preloads the exact original Bold font with high priority without visual/layout changes. Recheck 4 cold mobile Lighthouse runs and native throttled Chromium before PASS.

2026-11-05: cancel outdated SHA-pinned Lighthouse checks to stop older candidates holding the shared Preview concurrency slot. Re-evaluate Hero Serif Bold preload with modern Lighthouse and 4 cold mobile readings on the latest commit. Keep PR Draft unless quality criteria pass.

2026-11-05: candidate for explicit one-shot QA. Hero NotoSerif-Bold preload (same approved font), 3 below-fold mosaic photos deferred with noscript fallback. Validated source tests; verify mobile scroll-load behavior, 4 valid Lighthouse 13 readings and Desktop. Marker push only, no PR sync CI noise, no Production writes.

2026-11-05: first-paint Noto Serif true outlines proof. Build tiny critical Regular/Bold WOFF2 from original TTF for Welcome/Hero; full Noto font fallback retained for custom text. Production build already runs build-font-assets.py; Preview requires generated files. Browser compare exact glyph metrics; QA cold slow font and scroll deferred imagery. Require >=2 mobile Lighthouse 13 valid >=90, no regression, source and browser PASS. Isolated Preview only, no main writes.

2026-11-05: FirstPaint font experiment rolled back after repeatable Lighthouse mobile regression (69/73/72/72 despite 13KB generated faces); restore exact a727 font/Welcome implementation. Latest candidate defers offscreen 51KB art slideshow first image with no-JS fallback and scroll activation, retaining existing gallery/SSR optimizations. QA on pinned SHA: source, browser/scroll, Lighthouse >=2 valid mobile runs >=90 and no regressions; Preview only, no Production writes.

2026-11-05: SHA-bound experiment: frontload the exact existing code-hero.css via preload (preserve CSS cascade), prioritize Welcome's original NotoSerif-Regular over below-the-splash NotoSerif-Bold. Do not change font files or visual transitions. Evaluate Preview 4x mobile Lighthouse, slow font, no-JS and desktop. If mobile score repeats below 90 or worsens, revert without merging.

2026-11-05: HTTP Link preload candidate: Home SSR response advertises the existing NotoSerif-Regular font and code-only Hero stylesheet before the 274KB inline-CSS HTML head can be parsed; browser must make at most one request for either resource. Preserve visual assets and existing markup preload/cascade. Compare 4 valid mobile Lighthouse 13 and Browser QA; strict >=90 gate; no main/Production writes.

2026-11-05: HTTP response Link hints regressed mobile performance (69/76/78/77 vs prior 74/83/83/84) and were rolled back without touching main. New isolated candidate caps the existing slow-font Welcome fallback at 950ms after script initialization instead of 2600ms; normal devices use the exact original Noto font, slow visitors get one stable system fallback with no font swap, then original 2-frame+400ms paint guard and approved exit. Verify real browser slow-font, no-JS, 4 valid mobile Lighthouse >=90, desktop, source, Admin, Google and no Production writes.

2026-11-05: [perf-mobile-qa-candidate] Pin test of b8aa5b91 slow-font Welcome 950ms fallback. Isolated Preview only; require 4 valid Lighthouse13 attempts, >=90 each, no first-visit/display regression, source/Admin/Google PASS. Keep Draft if not verified.

2026-11-05: 950ms font fallback candidate cdbaef11: source/Admin/Google/guard PASS but Lighthouse Preview mobile 80/76/76/76, desktop 100; mobile gate FAIL. 4 valid attempts; font serif Bold completes around 3.65s and style/layout costs ~630-710ms. [perf-mobile-qa-candidate] Next pinned experiment keeps all approved visual rules and fonts, but enables content-visibility:auto with reserved intrinsic geometry only for offscreen Home featured, collections and product sections at <=760px; direct catalog and service routes excluded. Browser QA must prove each section becomes usable on scroll, mosaic on approach still loads, no exception or horizontal overflow; compare four valid mobile >=90 before any merge.

2026-11-05: [perf-mobile-qa-candidate] Mobile content-visibility candidate's first run #42011618301 stopped during old slow-font test at 1.2s (before scroll/Lighthouse). Source/Admin/Google/resource checks PASS. Adjusted Playwright to assert fallback title paint before automatic exit rather than requiring a stale fixed 1.2s hold; repeat pinned end-to-end tests unchanged otherwise. No Production/Main changes.

2026-11-05: [perf-mobile-qa-candidate] CPU/TBT root evidence from d5d2e479 #42012337447: exact-SHA browser QA including three on-approach sections PASS, mobile Lighthouse13 77/96/96/97 (LCP 2.2/2.0/2.0/2.0s), desktop 99; first run TBT 910ms with 533ms long task, so strict gate FAIL. New candidate yields a browser paint frame between Home renderFeatured(), renderFilters() and renderCatalog() after /api/products; all hydration remains awaited before ready. No card visual, asset, CSS, SEO, auth, D1/R2 or payment policy changes. Re-evaluate four mobile runs, browser and Admin safely on isolated Preview; no Production or main writes.

2026-11-05: [perf-mobile-qa-candidate] Re-run exact SHA after updating SSR source regression test for the now intentionally split Home hydration sequence (yieldPaint between renderFeatured/renderFilters/renderCatalog). Previous one-shot #42013666202 correctly stopped on stale regex before Preview deploy; code was not measured. Preserve strict 4 valid Lighthouse mobile runs >=90, browser scroll/Welcome, Admin, Google, and no Production writes.

2026-11-05: [perf-mobile-qa-candidate] Previous split hydration QA #42014217033: all browser/scroll/Welcome + source/Admin/Google PASS, Lighthouse mobile 85/98/98/97 (first-run TBT 490ms, others 80-160ms), desktop 99; strict mobile gate FAIL. New candidate moves shared yieldPaint to init and yields first browser paint after local state restore, before bindEvents and route/API setup. Existing Home featured/filter/catalog frame yields unchanged. Preserve immediate theme and security behavior, UI, mobile navigation, D1/R2; remeasure exact-SHA 4 mobile Lighthouse + browser smoke, no main/Production writes.

2026-11-05: [perf-mobile-qa-candidate] Post-PASS safety regression: Owner-approved Welcome unchanged for JavaScript visits; no-JS SSR catalog must dismiss inert splash and remain scrollable; mobile widths 360 and 430 light/dark must keep deferred Home sections visible and stable on approach. Require source/Admin/Google guard PASS and repeated mobile Lighthouse >=90. Isolated Preview only; no Production/main writes.

2026-11-05: [perf-mobile-qa-candidate] Measurement-isolation test: two exact-SHA runs after expanded Playwright browser QA showed only Lighthouse attempt #1 TBT 880/720ms and the later 3 mobile attempts 90-260ms, all Browser QA PASS. Execute Lighthouse before expanded multi-context Playwright, retain all raw scores and browser assertions and original >=90 each gate. Test no-JS CSS and 360/430px remained unchanged. Preview-only, no Production writes.

2026-11-06: [perf-mobile-qa-candidate] Merge current main warranty/Turnstile fixes into PR169 with no Production writes; isolate remaining first-cold mobile TBT and save Chrome DevTools first-sample trace on exact SHA. Do not lower strict mobile >=90 gate or change Owner-approved UI/SEO; QA isolated Preview only.

2026-11-06: [perf-mobile-qa-candidate] CI-only rerun on pinned ubuntu-24.04 after github ubuntu-latest switched to ubuntu26.04 incompatible with Playwright 1.56.1; preserve first-run DevTools trace, full browser QA and >=90 mobile all-valid gate; main/Production unchanged.

2026-11-06: [perf-mobile-qa-candidate] Reduce first cold-layout task by isolating below-first-viewport Home #orderTracking and #siteFooter (with intrinsic-height fallback). Extend mobile 360/390/430 scroll QA and SSR tests; keep owner-approved visuals/behavior and strict all-valid >=90 Lighthouse gate. Run pinned Preview only. Owner authorized merge to main after full PASS.

2026-11-06: exact candidate retry after restoring required SHA-guard commit subject marker; no code changes.

2026-11-06: [perf-mobile-qa-candidate] Rolled back #orderTracking/#siteFooter content-visibility after regression first Mobile 76 (other 93/93/93). New focused Welcome exit removes forced synchronous body offsetHeight and separates page unlock from the exact approved 360ms fade with two animation frames. Preserve focus, first-visit timing, visual contracts, no Production writes. Require every valid cold Mobile >=90 plus browser scroll/Welcome, source/Admin/Google PASS before main merge.

2026-11-06: [perf-mobile-qa-candidate] Source and complete regression unit tests PASS at 38b7689f after updating the explicit Owner 360ms fade test to the equivalent frame-separated implementation. Pin full Preview browser/Lighthouse QA to this SHA; all valid mobile >=90, no main writes before PASS.

2026-11-06: [perf-mobile-qa-candidate] Exact focus root cause on prior mobile cold trace: skipIntro.focus during HTML parse forced 69ms reflow. Defer only initial focus by one requestAnimationFrame, preserve keyboard trapping and Welcome approved exit. After full browser, source, Admin, Google PASS and all valid mobile >=90, Owner authorizes merge to main; otherwise Draft.

2026-11-06: [perf-mobile-qa-candidate] Actual first-cold Chrome trace from 9c56c141 shows first-frame skipIntro.focus triggering >200ms full document Layout and ~400ms main-thread RunTask (Mobile 87/92/93/95). New focused fix gates auto-focus to desktop min-width 761px; mobile keyboard Tab trap remains unchanged and Welcome visual/timing/close remains approved. Verify exact SHA source, browser and 4 cold Lighthouse mobile attempts every >=90 before merge to main.


2026-11-06: [perf-mobile-qa-candidate] Defer the optional material-gallery.js request/evaluation until #materialTile approaches the viewport; preserve image gallery behavior and verify cold network plus scroll activation. Tighten Lighthouse gate to exactly 4 valid mobile runs, each >=90; Desktop >=90, source/Admin/Google/resource/browser QA PASS. Preview only; no SEO, main, or Production writes.

2026-11-06: trace-guided perf candidate preserves the storefront's natural document height while Welcome locks the viewport; rerun the pinned cold Mobile four-sample Lighthouse gate on the exact current SHA.
2026-11-06: cold trace confirmed inherited main visibility change as full-document style/layout hotspot; candidate uses non-inherited opacity plus inert pointer events while Welcome covers the page. Rerun all four strict Mobile Lighthouse attempts.

2026-11-06: first-cold trace isolates a 92ms Mobile Welcome destination focus repaint and a nonessential initial lookup Turnstile UI request. Candidate removes Mobile destination autofocus and lazily loads the challenge UI when phone lookup is used, with submit-time fail-closed loading and one-button resume preserved. Rerun four strict Mobile Lighthouse attempts and Browser phone-lookup checks.

2026-11-06: [perf-mobile-qa-candidate] First-cold trace maps post-/api/products normalization continuation to a long task before Home featured rendering. Add a paint yield before below-fold Home hydration; no appearance/data changes. Run exact-SHA four-valid-mobile >=90, Desktop, source, Admin, Google, resource guard, welcome, phone lookup and scroll QA; Preview only, keep main untouched.

2026-11-06: [perf-mobile-qa-candidate] First-cold trace maps initial Welcome paint to a 175ms main-thread task including 69ms full-page Layout while main is visibility-hidden behind the Welcome overlay. Candidate additionally removes the hidden main subtree from layout only while Welcome is active; restore it automatically when the approved Welcome closes. Verify first-visit Welcome/cross-route behavior, full page and mobile scroll at 360/430px, direct catalog/service routes, no-JS, Google/Admin/resource checks, Desktop and strict all-four mobile >=90 on Preview; no main/Production writes.

2026-11-06: source-test correction: escape the regex whitespace token once so the layout contract matches source CSS.

2026-11-06: [perf-mobile-qa-candidate] Rolled back hidden-main display:none experiment after confirmed CLS regression (CLS 0.495 and Mobile 63/73/74/72, Desktop 90). Preserve original visibility-only Welcome behavior; no functional/visual regression reaches merge.

2026-11-06: [perf-mobile-qa-candidate] Scope Welcome Serif/fallback readiness state to #welcomeSplash to avoid document-wide style invalidation seen in first-cold trace; preserve typography, timing, transition and page layout. Run full exact-SHA Preview/browser/Lighthouse and strict all-four mobile >=90 gate; no Production/main writes.

2026-11-06: [perf-mobile-qa-candidate] Retry exact-SHA mobile trace after initial trigger commit lacked the required commit-message marker; no source or threshold change.

2026-11-06: [perf-mobile-qa-candidate] Use string assertions for the scoped font CSS selectors after fixing regex escaping; rerun exact current source.

2026-11-06: [perf-mobile-qa-candidate] Split featured carousel card construction into paint-separated fragments; update slow-font check to observe the scoped Welcome state. Preserve content and visual output; verify strict cold-run mobile gate.

2026-11-06: [perf-mobile-qa-candidate] Keep renderFeatured synchronous in the VM source harness while browser builds one carousel card per RAF; preserve a single fragment replacement and wait for Promise completion in init.
