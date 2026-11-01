SinDarealest — ONE SHOT read-only audit-after QA candidate, 01 Nov 2026.
The pushed marker is the only permitted automatic trigger for this expensive QA.
Verify audit-source-revision.txt equals GITHUB_SHA before screenshots/Lighthouse.
Scope: / and /sanpham, responsive Light/Dark, LCP, CLS, TBT, fonts and images.
Source changes: defer /api/v2/p/ until opening checkout, release first Welcome
when DOM shell completes (do not wait for /api/products).
No user/customer writes. No Production deploy. No Main merge.

2026-11-01: compare mobile catalog LCP against c50b baseline 10.607s after priority change, same Preview and device conditions.

2026-11-01: verified source check PASS run 41295836780; dispatch image priority candidate with fixed test, Lighthouse GET only.

2026-11-01 GET-only Lighthouse experimental first-row SSR <head> image preload candidate 3cbf7f7. CI 41297037913 PASS. Before/after check against c50b/dd216f baselines, no production writes, may revert if regresses.

2026-11-01 candidate 93d9057d3b7e: SSR catalog images 3-8 defer to viewport observer with no-JS <noscript> fallback. Source full CI run 41298892694 PASS; local-only mocked Playwright run 41298892608 PASS. ONE bounded GET-only full QA incl JS-off SSR, desktop/mobile Lighthouse and LCP source comparison. Never Main / Production.

2026-11-01 single-candidate a82ec23e9166: reserve mobile catalog categoryFilters min-height:50px in existing CSS, no overlay or Owner-PASS design change. Source CI 41300008978 PASS and mocked checkout 41300008986 PASS; run bounded, exact SHA GET-only read-only CLS/Lighthouse + visual screenshots, compare prior d491e3ef.

2026-11-01 Final Owner PASS integration candidate: safely merged Main Admin + PR159 Storefront at 455602c6ad8f4804d047f1c3f490f730c67db46d. One SHA-pinned isolated Preview and read-only browser QA; do not deploy Production from these workflows.
