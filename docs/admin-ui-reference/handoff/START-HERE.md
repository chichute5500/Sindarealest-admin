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

## Live checkpoint (verified after Validate #39893834166)
- Live writable branch HEAD and PR #111 head: `83733513da6d3a28a13e773f479b596a4432df1f`. Validate [#39893834166](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39893834166) completed **SUCCESS on this exact SHA**; dependency audit, project integrity and automated tests all passed.
- PR #111 remains OPEN/unmerged, base `main` at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`, 396 changed files (+39,231 / -212). No merge action taken.
- PR #108 remains OPEN/unmerged and read-only. Live API now reports head `7e8c33f52e9216ff07484133910479ea5a456225`, 287 files (+21,043 / -398). Do not write to that branch.
- `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Screen 10 settings order remains covered by the regression test: public price, welcome page, watermark, then QR payment panel. Prior Admin Preview [#39891442082](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082) passed on source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`; it is fixture-only and does not prove backend persistence.
- Acceptance remains incomplete: all 12 screens `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## B1 — PR #111 cleanup/provenance
**B1 audit remains complete.** The two new files since the 394-path cleanup census are compact Preview evidence (`report.md` and `preview-diagnostics.json`), not a reason to reopen file deletion or API consolidation.
- Current path census: .github 1; root 2; data 1; docs 342; functions 24; migrations 2; public 1; scripts 4; tests 19 (396 total).
- History now contains 163 SHA-keyed run directories and 330 compact report/metadata/Preview-diagnostic text/JSON files plus the README policy. Raw screenshot matrices stay in Actions artifacts.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and the zero-byte viewer HTML.
- Keep active consumers and distinct payment contracts. `normalizeFulfillmentType` is canonical in `functions/_lib.js`. No further deletions or route/helper merges without new evidence.

## Next actions
1. Validate this handoff refresh on its exact commit SHA once; do not make another metadata-only commit to chase its own SHA.
2. Continue the 12-screen acceptance audit. Current source/tests were reviewed for Screens 8–12; no new reproducible source defect was established from the available text evidence. Exact pixel/reference parity remains NOT_VERIFIED because direct reference-image comparison is unavailable.
3. Obtain an authorized authenticated Preview test path before testing business persistence. Never bypass Cloudflare Access or substitute fixtures for backend evidence.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
