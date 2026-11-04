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
