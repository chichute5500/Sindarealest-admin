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
