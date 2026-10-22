# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file, fetch live GitHub state, then continue from the unfinished work. Do not ask the owner to paste previous prompts or re-read old chat history.

## Canonical documents
- [Next-chat prompt](PROMPT-NEXT-CHAT.md)
- [Master compatibility pointer](../MASTER-PROMPT-AUTO-HANDOFF.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Verified checkpoint when this handoff sync started
- Repository: chichute5500/Sindarealest-admin.
- PR #111 is OPEN/unmerged, branch feature/admin-isolated-handoff-2026-10-20. HEAD at checkpoint start: b3b71fb925875e9dd8f1b38e71737a2af1bb71b2. Live PR census: 386 changed files (+38,838/-212), base main SHA 28c768ba26b1d9f7d40e14efac5112526ed1c8b3. Re-fetch live metadata before acting.
- Application/source Validate [#39847591944](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39847591944) passed on exact source SHA 1674396bec433fb915e3a6b922b9f22436335786: dependency audit, project integrity and automated tests all succeeded.
- Admin Preview diagnostic [#39847591916](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39847591916) passed on the same source SHA. Artifact admin-preview-evidence-355 contains 102 PNGs (16 login-shell, 86 read-only fixture screens; 78 fixture metrics). It is not authenticated backend acceptance.
- PR #108 is OPEN/unmerged/read-only; branch fix/liquid-glass-audit-2026-10-19, checkpoint head 3f53e0cf7519ae0c5d0be022657845d5eb0f414b. Main remains 28c768ba26b1d9f7d40e14efac5112526ed1c8b3.
- HEAD/evidence distinction matters: commit b3b71fb925875e9dd8f1b38e71737a2af1bb71b2 records the Playwright artifact and test report for source SHA 1674396bec433fb915e3a6b922b9f22436335786; it did not change Admin application code. This handoff sync will create another documentation-only SHA. Check its exact-HEAD Actions result once, then stop pointer-chasing commits.

## B1 — PR #111 cleanup disposition
- The current 386-file diff has been classified by group and consumer. This cleanup/provenance review is COMPLETE for the current diff; no further deletion or helper/API consolidation is justified without new evidence.
- Earlier verified cleanup removed 912 generated PNG screenshots, 10 duplicate handoff snapshots, stale prompt/audit material, static-only workflow/script/test artifacts, an unreferenced reference ZIP and the zero-byte admin-mobile-reference.html. The approved admin-mobile-reference.png and written instructions remain.
- Live diff groups: docs 332; Functions 24; migrations 2; Admin UI 1; scripts 4; tests 19; workflow 1; data source 1; root deployment guide/package 2.
- The history tree contains 157 SHA-keyed evidence directories and 319 report/metadata/Preview-diagnostic text/JSON files, plus its README. No generated screenshot PNGs remain in history. Keep historical success/failure evidence under the retention policy.
- data/legacy-products.json remains needed: source checks validate its 235 records, image paths, IDs/SKU rules and correspondence to migration 0002; smoke tests also exercise the related contract. README-DEPLOY.txt is covered by configuration-integrity tests. Migrations 0008/0009 are schema work, not dead files.
- The payment routes retain distinct authorization, exposure, cache and state-transition responsibilities. The fulfillment helper is canonical in functions/_lib.js; duplicate/unused payment validators were removed earlier.

## Product acceptance is still partial
- Overall progress remains 50% PROVISIONAL. All 12 screens remain PARTIAL_NOT_ACCEPTED. Authenticated business/backend QA is NOT_TESTED; remote D1 schema/ledger are NOT_VERIFIED; Production is NOT_PERFORMED.
- Orders and Order detail have source/query/mock-test review only, not authenticated live-data acceptance.
- Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain DEFERRED_BY_OWNER.

## Next actions
1. Fetch live PR #111/#108, main, writable branch HEAD, changed-path census and Actions. Verify the Validate run whose head_sha exactly matches the current handoff-sync HEAD once.
2. If it passes, record the result in the report or next substantive checkpoint; do not create another metadata-only commit solely to update its own run pointer.
3. Continue authenticated product/workflow acceptance only where authorized and available. Do not mark screens accepted from fixture screenshots.

## Guardrails
- Write only to feature/admin-isolated-handoff-2026-10-20. Keep PR #111/#108 open and unmerged. Do not write PR #108, main or the static website branch.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets changes or Cloudflare Access bypass.
- No fabricated business data or unapproved API contracts. Do not execute deferred work.
