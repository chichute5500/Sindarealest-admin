# START HERE — SINDAREALEST ADMIN

## Live checkpoint — 2026-10-23 04:50 UTC
- Writable branch HEAD at checkpoint start: `d395aea6a39b503e9a43796b7c3ed161576625e0` (evidence-only child of source/test SHA `9515d03d504ca9c49836b719ccede1eb3c2d2ce1`; workflow commit message: `test(admin): save Playwright evidence for 9515d03d504c`).
- Validate [#39901444416](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39901444416) and Admin Preview [#39901444449](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39901444449) both **SUCCESS on exact source/test SHA `9515d03d504ca9c49836b719ccede1eb3c2d2ce1`**. Preview artifact [admin-preview-evidence-371](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39901444449/artifacts/12478713244), ID `12478713244`, includes 132 distinct generated screenshot PNGs (16 login + 116 distinct module files), 120 module capture entries, 112 fixture metrics; archive contains 133 PNGs including one approved reference image.
- The new exact-SHA Playwright coverage audits Screen 7 order-detail scroll clearance at 320×640 and 390×844 in light/dark: no horizontal overflow, document-end reachability, mobile navigation visibility and >=8px clearance. Notification unread/mark-read checks from the preceding source revision remain covered. Evidence is fixture-only/read-only.
- Preview diagnostic `PASS_LOGIN_CSS_SIGNATURE` confirms login-shell CSS only, **not authenticated business workflows**. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; exact reference parity `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- Live refs verified before this documentation-only sync: PR #111 OPEN/unmerged, head `d395aea6a39b503e9a43796b7c3ed161576625e0`, base/main `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`, mergeability `dirty`, 410 changed files (+39,825/-212). PR #108 OPEN/unmerged/read-only, head `c808d1dfba542e6bab78885d1e4b507a549e77d9`, 287 changed files, mergeability `dirty`. No merge/deploy or writes to `main`/PR #108.
- Continue evidence-based screen audit, starting with Screen 7 and then Screen 12 / Screens 4–5 only where artifacts/reference show reproducible gaps. Do not repeat B1 cleanup. Do not change screen acceptance statuses based on fixture tests.

**Single entry point for every new chat.** Read this file and PROMPT-NEXT-CHAT.md. Before acting, fetch live GitHub PR #111/#108 metadata, main SHA, writable branch HEAD and recent Actions; treat the checkpoint below as historical until re-verified. Then continue unfinished work without asking the owner to paste prior history or repeating completed B1 cleanup.

## Canonical handoff
- [Prompt for next chat](PROMPT-NEXT-CHAT.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

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
1. Continue remaining screen acceptance using artifact 367 and the approved reference where direct comparison is possible; fix only reproducible issues.
2. Obtain an authorized authenticated Preview path before testing persistence. Never bypass Cloudflare Access or substitute fixtures for backend evidence.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until behavior and reference evidence supports acceptance; do not chase evidence-child SHAs with metadata-only commits.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
