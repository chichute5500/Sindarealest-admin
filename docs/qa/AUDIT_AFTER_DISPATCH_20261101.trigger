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
