# LATEST STATUS — SinDarealest Admin

## Current checkpoint — 2026-10-23 07:01 UTC
- **Screen 12 mobile display bug fixed:** mobile audit-log table cells had existing `data-label` values but the shared mobile `td::before` rule rendered empty content. Updated `public/admin/index.html` to render `content: attr(data-label)` for `.activity-log-table` cells up to 680px, and added a Playwright assertion for all five labels: Time, Action, Entity, Actor, Details (Vietnamese UI labels: `Thời điểm`, `Thao tác`, `Đối tượng`, `Actor`, `Chi tiết`). No business data/API behavior changed.
- Source/test commit: `fa6937fea1a269a6b40de0e7f136ab969bd70a14` ([commit](https://github.com/chichute5500/Sindarealest-admin/commit/fa6937fea1a269a6b40de0e7f136ab969bd70a14)). Admin Preview workflow [#39914870835](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39914870835) **SUCCESS on the exact source/test SHA**; its dependency/project checks, `npm run check`, `npm test`, and responsive/theme Playwright matrix passed. Artifact [admin-preview-evidence-385](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39914870835/artifacts/12484820528) contains the new screenshots and test evidence. The 390×844 light screenshot confirms all five field labels are visible.
- Evidence-only child at checkpoint: `3f1b9f28d3f4b92600d752ab3de173c81940e0b0`. Workflow persisted the run report/diagnostics under `docs/admin-ui-reference/handoff/history/fa6937fea1a2/`; it does not represent another application change.
- Review scope also revisited Screens 4 (Product editor), 5 (Gallery), and 7 (Order detail) in artifact 384. No additional reproducible defect was confirmed from those screenshots; synthetic/unknown product, customer and order fields must remain unknown rather than being fabricated. Gallery's earlier responsive reachability and footer assertions remain covered.
- Deployed Preview diagnostic passed **only** the login CSS signature; it does not establish authenticated module workflows or backend persistence. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- Live safety boundary: PR #111 OPEN/unmerged at evidence child `3f1b9f28d3f4b92600d752ab3de173c81940e0b0`; PR #108 OPEN/unmerged/read-only at `44baa3926bf6acca0110689ce440e7da101047ed`; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge or deployment.


## Previous checkpoint — 2026-10-23 06:26 UTC (superseded above)
- Validate [#39911090605](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090605) **SUCCESS** on exact source/test SHA `f2a3bee28523cc0ecb541a17b095c80acb2a4b31`: dependency audit, project integrity, `npm run check`, and `npm test` all PASS.
- Admin Preview [#39911090568](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568) **SUCCESS** on the same SHA. Responsive/theme matrix PASS. Artifact [admin-preview-evidence-383](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568/artifacts/12482517911) records 132 generated PNGs (16 login + 116 distinct module screenshot files; 120 module capture entries) and 112 fixture metrics. All document horizontal-overflow metrics are false; page errors 0, failed requests 0, HTTP errors 0, attempted writes 0, unexpected API paths 0. Seven expected HTTP 503 console entries are from synthetic read-only retry tests.
- Deployed Preview diagnostic returned `PASS_LOGIN_CSS_SIGNATURE` only; it does not prove authenticated business workflows. Preview evidence is local source + synthetic/read-only fixture coverage.
- The two failing 360×800 checks were overstrict assumptions that the rail must overflow even when thumbnails fit. Both were corrected in tests only; no UI CSS was changed and the existing 320px scroll requirement remains.
- PR #111 OPEN/unmerged; PR #108 OPEN/unmerged/read-only at `97153b5351fadc0169205db20e3049a219f0bf7c`; `main` unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. B1 cleanup/provenance audit COMPLETE.
- Product acceptance is unchanged: all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## Historical source/Preview checkpoint


## Historical source/Preview checkpoint

## Historical source/Preview checkpoint — 2026-10-23 04:07 UTC (superseded above)
- Application source/test SHA: `000d3d84a9cf8c63144388f80879b5cc1439d161`.
- Validate [#39898454195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454195) **SUCCESS on exact SHA**; Admin Preview [#39898454274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274) **SUCCESS on that same SHA**.
- Artifact [admin-preview-evidence-369](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274/artifacts/12478285219) records 132 unique generated screenshot PNGs (16 login-shell + 116 distinct module PNGs), 120 module capture entries, 112 fixture metrics; ZIP includes the approved reference PNG. Expanded 320×640 / 360×800 mobile coverage passed alongside 390×844 and 1280×800 checks; measured fixture screens showed no horizontal overflow.
- Preview run first found a reproducible Screen 9 defect on prior SHA `640c100a9bdffbc6c2d30fb961cbe97145972151`: toast/nav gap was 6 px (bottom 558, nav top 564) while the test required at least 8 px. CSS offset changed from 82 to 84 px plus safe-area inset; the new exact-SHA run passed. Seven console log entries are expected from simulated 503 endpoint-failure/retry fixture paths; page errors and attempted writes: zero.
- Preview diagnostic reports `PASS_LOGIN_CSS_SIGNATURE` only. Screenshots use synthetic read-only fixtures and do not prove authenticated business persistence. The approved reference PNG was opened from the artifact for qualitative comparison, but full pixel parity remains **NOT_VERIFIED**.
- Live refs at this checkpoint: branch HEAD evidence child `1596bbd07c2257f19ecad9b2f77a7a45e9161cd0`; `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`; PR #111 OPEN/unmerged, 406 files (+39,536/-212), mergeable state `dirty`; PR #108 OPEN/unmerged/read-only, head `63079aabf853d6b4d492942020a71603754046d8`, 287 files. No merge or Production deployment.

## Concrete UI changes verified
- Screen 8 mobile customer card: added compact identity/order summary and details disclosure; fixed CSS specificity so desktop identity remains hidden on mobile. Playwright passed on `cd432ecd775129ee652bd0e127cfcea24e5d9e57`.
- Screen 9 mobile toast clearance: corrected the narrow-screen bottom offset from 82 px to 84 px plus safe-area inset after Playwright measured only 6 px clearance at 320×640. Validate and Preview passed on exact source/test SHA `000d3d84a9cf8c63144388f80879b5cc1439d161`; 320×640 and 360×800 are now included in the broader fixture matrix. This is layout evidence only; warranty backend actions remain untested.
- Screen 10 settings order: public price → welcome page → watermark → QR payment panel; earlier Validate/Preview passed on exact SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`.
- Screen 11 Backup/Restore is a dedicated route with desktop/mobile navigation; earlier Validate/Preview passed on exact SHA `5ba5bf69b71e3512491ece4023c886c056ced4fc`. Real export/import remains untested.

## B1 — complete
PR #111 provenance/cleanup review remains complete. No further deletions or API consolidation without new consumer evidence.

## Acceptance boundary
- All 12 screens: `PARTIAL_NOT_ACCEPTED`.
- Authenticated backend QA: `NOT_TESTED`.
- Remote D1 schema/ledger: `NOT_VERIFIED`.
- Exact reference-image parity: `NOT_VERIFIED`.
- Production deployment: `NOT_PERFORMED`.
- Migration 0009, PRE/PRO migrations, product-image/R2 persistence and AI image grouping: `DEFERRED_BY_OWNER`.

## Next actions
1. Continue remaining screen acceptance using artifact 367 and the approved reference where direct comparison is possible; fix only reproducible differences.
2. Obtain an authorized authenticated Preview path before testing persisted business workflows. Never bypass Cloudflare Access.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until full behavior/reference evidence supports acceptance.
4. No merge/rebase/force-push, Production deploy, remote D1/R2/schema/ledger operations, or writes to PR #108/`main`.

## Kết quả kiểm thử tự động gần nhất

- Tested commit: fa6937fea1a269a6b40de0e7f136ab969bd70a14
- Run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39914870835
- npm run check: PASS
- npm test: PASS
- Local source Playwright matrix: PASS; 132 real PNGs captured in artifact admin-preview-evidence-385 (not committed to Git).
- Deployed Preview: success.
- Source screenshot matrix: 132 real PNGs; login shell: 16; read-only fixture module screens: 120; fixture metrics: 112.
- Fixture screens use synthetic/read-only data and do not prove authenticated business-data workflows; those remain NOT TESTED.
- Production deployment: NOT PERFORMED.
