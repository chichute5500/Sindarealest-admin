# START HERE — SINDAREALEST ADMIN

## Mandatory live-state check
Before any work, fetch live GitHub branch HEAD, PR #111/#108 state, and the latest Actions runs for the current source SHA. Treat the checkpoint below as historical context only until those live refs are revalidated; never trust an older recorded checkpoint as current.

## Live checkpoint — 2026-10-23 06:14 UTC
- Live-state checkpoint before this sync: branch/PR #111 head `feb29900e4680a1fec0a8411c6caa22c6d714d91`; application-gallery CSS is unchanged from source SHA `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`. Fetch the live branch HEAD, PR #111/#108, and Actions again before the next task; this checkpoint is not a substitute for a live fetch.
- Validate [#39910157079](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39910157079) **FAILURE** on exact SHA `feb29900e4680a1fec0a8411c6caa22c6d714d91`: dependency audit, project integrity, and `npm run check` passed; `npm test` stopped at the handoff-integrity assertion because this file lacked an explicit link to `PROMPT-NEXT-CHAT.md`. This sync adds that required link; Actions for the resulting head still need verification.
- Preview diagnostic [#39910156991](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39910156991) **FAILURE** on the same SHA because the same `npm test` gate failed. Chromium installation, browser launch, and the screenshot matrix were **SKIPPED**. Its artifact [admin-preview-evidence-381](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39910156991/artifacts/12482711337) is diagnostic/gate evidence, not a screenshot-matrix pass.
- Previous screenshot-matrix Preview [#39909118491](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118491) **FAILURE** on `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`. The failing assertion at 360×800 demanded a rail wider than its 308px client area, but the compact 52px thumbnails fit in that space. Artifact [admin-preview-evidence-380](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118491/artifacts/12481833079) contains 16 login screenshots, 35 read-only fixture screenshots, and 33 fixture metrics. The gallery CSS was not changed for this failure.
- Test correction [`feb29900e468`] (test file only) now checks actual reachability: require scrolling only when thumbnail content overflows; otherwise require every thumbnail to fit in the rail. The earlier 320px scrollability assertion remains unchanged; do not repeat the old threshold change.
- Upload/drop-zone clearance at 390×844 and the complete responsive/theme matrix still need a successful fresh run. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; exact-reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- PR #111 is OPEN/unmerged (418 changed files, +40063/-212); PR #108 is OPEN/unmerged/read-only (head `3fcbbedfc81dd6cfb6f8ea96dbfaf96137c6c36d`, 291 files). `main` is unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge, deployment, migration, or remote D1/R2 operation.
- B1 cleanup/provenance review is COMPLETE; do not repeat it without new evidence.

## Canonical handoff

- Next-chat prompt: [PROMPT-NEXT-CHAT.md](PROMPT-NEXT-CHAT.md).

## Historical checkpoint (2026-10-23 04:07 UTC; superseded by newest verified checkpoint above)
- Writable branch HEAD is evidence-only child `1596bbd07c2257f19ecad9b2f77a7a45e9161cd0`; application/source-test SHA is `000d3d84a9cf8c63144388f80879b5cc1439d161`. Validate [#39898454195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454195) and Admin Preview [#39898454274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274) both **SUCCESS on the exact same source/test SHA**. The child stores generated history and is not a new application-source revision.
- Artifact [admin-preview-evidence-369](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274/artifacts/12478285219) records 132 unique generated screenshot PNGs (16 login-shell + 116 distinct module PNGs), 120 module capture entries, 112 fixture metrics; the ZIP also includes the approved reference PNG. The expanded matrix covers 320×640, 360×800, 390×844 in light/dark where specified, plus desktop at 1280×800. The measured fixture screens reported no horizontal overflow.
- The expanded matrix reproduced Screen 9's toast clearance defect on prior SHA `640c100a9bdffbc6c2d30fb961cbe97145972151`: at 320×640, toast bottom was 558 px and fixed navigation top was 564 px (6 px clearance; assertion requires at least 8 px). The CSS offset was raised from 82 to 84 px plus safe-area inset, then exact-SHA Preview passed. Seven console messages in the fixture run are expected 503 responses from deliberate read-only endpoint-failure/retry tests.
- The approved [mobile reference PNG](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/admin-mobile-reference.png) was successfully opened from artifact 369 for qualitative visual comparison. Full pixel parity remains **NOT_VERIFIED**. Deployed Preview diagnostics only confirm the login-shell CSS signature; authenticated backend/persistence is not established.
- Live refs: `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`; PR #111 OPEN/unmerged at `1596bbd07c2257f19ecad9b2f77a7a45e9161cd0`, 406 changed files (+39,536 / -212), mergeable state `dirty`; PR #108 OPEN/unmerged and read-only, current head `63079aabf853d6b4d492942020a71603754046d8` (287 files). No merge/deploy or writes to PR #108/`main`.

## B1 — PR #111 cleanup/provenance
**B1 audit remains complete.** The two new files since the 394-path cleanup census are compact Preview evidence (`report.md` and `preview-diagnostics.json`), not a reason to reopen file deletion or API consolidation.
- Current path census: .github 1; root 2; data 1; docs 342; functions 24; migrations 2; public 1; scripts 4; tests 19 (396 total).
- History now contains 163 SHA-keyed run directories and 330 compact report/metadata/Preview-diagnostic text/JSON files plus the README policy. Raw screenshot matrices stay in Actions artifacts.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and the zero-byte viewer HTML.
- Keep active consumers and distinct payment contracts. `normalizeFulfillmentType` is canonical in `functions/_lib.js`. No further deletions or route/helper merges without new evidence.

## Next actions
1. Continue remaining screen acceptance using artifact admin-preview-evidence-374 (run 39906240167) and the approved reference where direct comparison is possible; fix only reproducible issues.
2. Obtain an authorized authenticated Preview path before testing persistence. Never bypass Cloudflare Access or substitute fixtures for backend evidence.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until behavior and reference evidence supports acceptance; do not chase evidence-child SHAs with metadata-only commits.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
