# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file and PROMPT-NEXT-CHAT.md. Before acting, fetch live GitHub PR #111/#108 metadata, main SHA, writable branch HEAD and recent Actions; treat the checkpoint below as historical until re-verified. Then continue unfinished work without asking the owner to paste prior history or repeating completed B1 cleanup.

## Canonical handoff
- [Prompt for next chat](PROMPT-NEXT-CHAT.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Live checkpoint (2026-10-23 03:51 UTC; re-fetch before action)
- Last verified live branch / PR #111 HEAD before this handoff refresh: `d0db56b7a16ff9a95f9eca016685fe1a4e6d53de` (Preview-generated evidence-only child). Application source/test SHA `cd432ecd775129ee652bd0e127cfcea24e5d9e57` passed Validate [#39896884047](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896884047) and Admin Preview [#39896884082](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896884082) on the exact same SHA.
- Preview artifact [admin-preview-evidence-367](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896884082/artifacts/12476992112) contains 102 PNGs: 16 login-shell and 86 read-only fixture/module screenshots, plus 78 fixture metrics. Deployed diagnostic confirms login-shell CSS signature only; no authenticated business persistence proof.
- PR #111 OPEN/unmerged, 402 files (+39441 / -212), base `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. PR #108 OPEN/unmerged/read-only at head `bc1a631d5ca82995b3a772da9bc26a4e8f241309` (287 files). Do not write there. `main` unchanged.
- Screen 8 mobile customer identity CSS specificity correction passed the Playwright matrix on `cd432ecd775129ee652bd0e127cfcea24e5d9e57`. Screen 10 settings order previously passed on `4ac7465539e746b7f37517327d7bf9bddcfa3285`; Screen 11 Backup/Restore route split passed Validate/Preview on `5ba5bf69b71e3512491ece4023c886c056ced4fc`.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## B1 — PR #111 cleanup/provenance
**B1 audit remains complete.** The two new files since the 394-path cleanup census are compact Preview evidence (`report.md` and `preview-diagnostics.json`), not a reason to reopen file deletion or API consolidation.
- Current path census: .github 1; root 2; data 1; docs 342; functions 24; migrations 2; public 1; scripts 4; tests 19 (396 total).
- History now contains 163 SHA-keyed run directories and 330 compact report/metadata/Preview-diagnostic text/JSON files plus the README policy. Raw screenshot matrices stay in Actions artifacts.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and the zero-byte viewer HTML.
- Keep active consumers and distinct payment contracts. `normalizeFulfillmentType` is canonical in `functions/_lib.js`. No further deletions or route/helper merges without new evidence.

## Next actions
1. Continue remaining screen acceptance using artifact 367 and the approved reference where direct comparison is possible; fix only reproducible issues.
2. Obtain an authorized authenticated Preview path before testing persistence. Never bypass Cloudflare Access or substitute fixtures for backend evidence.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until behavior and reference evidence supports acceptance; do not chase evidence-child SHAs with metadata-only commits.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
