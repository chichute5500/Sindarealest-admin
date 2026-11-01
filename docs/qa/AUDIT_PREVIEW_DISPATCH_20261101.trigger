SINDAREALEST PR #159 — ONE-TIME PREVIEW DEPLOY TRIGGER — 2026-11-01
Authorized user requested continued QA after Cloudflare Workers quota reset 07:00 ICT.
Source candidate: fac442ffe3dcda6a1f1c267f14f4d63e767ce438
This marker is referenced solely by the isolated audit-preview.yml workflow.
Do not merge or deploy Production. Do not write D1/R2 data.

Preview verification after mobile refresh drawer flash fix.
Patch commit: afc8ebe9da57939b1ae6649b843ed0df5410267c
Scenario: closed checkout, cart and account must never flash on reload; browser QA already green.

2026-11-01: Refresh mobile CSS first-paint fix validated via full CI.
Candidate code: 73bc8450ca703520b335c017647766d218692c27
Preview-only; do not merge Production.

01 Nov 2026 — next single Preview candidate after CI SUCCESS run 41293860611.
Source code commit: 1ca2944cae92784372522b454ceea52939fd6a59
Browser mock evidence: 41293535518 (11 screenshots, 360/390 Light/Dark).
Only Preview Pages branch fix/audit-2026-10; Production NO.

2026-11-01 additional one-shot local-first candidate: Welcome DOM-ready and lazy provinces, CI 41294763441, mock browser 41294763445. Trigger only isolated Preview and pinned GET-only QA. Never Production.

2026-11-01: image priority candidate: first two SSR+CSR images high; offscreen low, source-only test.

2026-11-01: verified source check PASS run 41295836780; dispatch image priority candidate with fixed test, isolated Cloudflare Preview.

2026-11-01 Preview experimental first-row SSR <head> image preload candidate 3cbf7f7. CI 41297037913 PASS. Before/after check against c50b/dd216f baselines, no production writes, may revert if regresses.

2026-11-01 candidate 93d9057d3b7e: SSR catalog images 3-8 defer to viewport observer with no-JS <noscript> fallback. Source full CI run 41298892694 PASS; local-only mocked Playwright run 41298892608 PASS. Deploy ONE isolated Preview; verify source marker and no-JS SSR. Never Main / Production.
