One-time isolated Preview QA for branch fix/storefront-mobile-critical-requests-20261104.
Requires exact candidate SHA; only read-only browser/lighthouse tests after verified Preview deployment.
No Production writes.
Validated marker using file presence (shallow checkout compatible).
Runner now uses npm install (repository intentionally has no lockfile).
QA v2: Browser PerformanceObserver records real LCP; expected Preview noindex is not Production SEO regression.
QA v3: valid candidate Performance >=90 is accepted when Production Lighthouse baseline is NO_LCP.
2026-11-05: validate deferred Home catalog images plus no-JS fallback; pinned candidate only.
