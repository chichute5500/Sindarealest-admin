# START HERE — SINDAREALEST ADMIN

## Mandatory live-state check
Before any work, fetch live GitHub branch HEAD, PR #111/#108 state, and the latest Actions runs for the current source SHA. Treat the checkpoint below as historical context only until those live refs are revalidated; never trust an older recorded checkpoint as current.

## Live checkpoint — 2026-10-23 06:26 UTC
- Revalidated branch at capture: `a46eb2eb1bfa26055d21aaaaad8364d09a486674`, an evidence-only child produced after the Preview matrix; the exact application source/test SHA is `f2a3bee28523cc0ecb541a17b095c80acb2a4b31` (gallery CSS remained from `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`). The upcoming handoff-only sync will create a newer branch HEAD, so fetch live branch/PR/Actions before any next code change.
- Validate [#39911090605](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090605) **SUCCESS** on exact SHA `f2a3bee28523cc0ecb541a17b095c80acb2a4b31`. Dependency audit, project integrity, `npm run check`, and `npm test` all passed.
- Admin Preview [#39911090568](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568) **SUCCESS** on the same exact SHA. Chromium install, static fixture startup, responsive/theme screenshot matrix, Preview diagnostic, evidence persistence, and artifact upload all completed successfully.
- Evidence: [admin-preview-evidence-383](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568/artifacts/12482517911) contains **132 generated screenshot PNGs** (16 login shell + 116 distinct module PNGs; metadata records 120 module capture entries), 112 UI fixture metrics, and the retained approved reference image as one extra PNG in the archive. All 112 metrics report no document horizontal overflow. No Playwright page errors, failed requests, HTTP errors, attempted writes, or unexpected API paths; seven expected simulated HTTP 503 console entries are from the read-only retry fixture.
- Mobile gallery tests now verify real reachability: require scrolling when content overflows and allow all thumbnails to fit when they do not. The separate 320px scrollability requirement remains in force. These were test-only corrections; no gallery CSS was changed to satisfy the 360px assertions. The 390×844 upload/gallery-footer regression passed as part of the matrix.
- Deployed Preview diagnostic returned `PASS_LOGIN_CSS_SIGNATURE` only. It confirms the login CSS signature, not authenticated module workflows or real business-data persistence. All screenshots/fixture data remain synthetic/read-only evidence.
- PR #111 is OPEN/unmerged (live pre-sync HEAD `a46eb2eb1bfa26055d21aaaaad8364d09a486674`, 422 changed files, +40,202/-212). PR #108 is OPEN/unmerged/read-only at `97153b5351fadc0169205db20e3049a219f0bf7c` (291 changed files). `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge or Production deployment.
- B1 cleanup/provenance audit remains COMPLETE; do not repeat without new evidence. All 12 screens stay `PARTIAL_NOT_ACCEPTED`; exact reference-image parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`. Migration 0009, PRE/PRO migrations, R2 persistence, and AI image grouping remain deferred by owner.

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
