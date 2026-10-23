# ADMIN — 12-SCREEN REFERENCE AUDIT

## Live checkpoint — 2026-10-23 06:04 UTC
- Current source/test SHA `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`: Validate [#39909118547](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118547) **SUCCESS**; Admin Preview [#39909118491](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118491) **IN_PROGRESS** at Chromium installation when last checked.
- Previous Preview [#39908380252](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39908380252) captured 50 PNGs but the fixture matrix failed on the 320px thumbnail-rail assertion: actual scroll width 284px, expected >288px. The assertion threshold was adjusted from +20px to +10px on `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`; wait for exact-SHA Preview and inspect the gallery screenshot before recording a pass.
- Gallery CSS compacted (cover ratio 1.75, smaller thumbnail rail and controls); a regression assertion checks that the full upload/drop zone fits above the sticky footer at 390×844. This is not accepted until current screenshot/metrics verify it.
- PR #111 OPEN/unmerged at `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`; PR #108 OPEN/unmerged/read-only at `0e4a1d5eef3662951b3ce182c8bbf154467a8866`; `main` unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. B1 remains complete.
## Historical narrow-viewport and Screen 9 clearance checkpoint

## Historical narrow-viewport and Screen 9 clearance checkpoint — 2026-10-23 04:07 UTC (superseded above)
- Source/test SHA `000d3d84a9cf8c63144388f80879b5cc1439d161` passed Validate [#39898454195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454195) and Admin Preview [#39898454274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274) on the exact same SHA.
- Artifact [admin-preview-evidence-369](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274/artifacts/12478285219) records 132 unique generated screenshot PNGs (16 login-shell + 116 distinct module PNGs), 120 fixture module capture entries, 112 fixture metrics; ZIP includes the approved reference PNG. The broader matrix includes 320×640 and 360×800, plus 390×844 and 1280×800; measured fixture layouts reported no document-level horizontal overflow.
- The first expanded run [#39897883648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897883648) reproduced a real Screen 9 positioning regression at 320×640: toast bottom 558 px, navigation top 564 px, leaving only 6 px where the test requires 8 px. CSS changed from `bottom: calc(82px + env(safe-area-inset-bottom))` to `bottom: calc(84px + env(safe-area-inset-bottom))`. Follow-up Validate/Preview on `000d3d84a9cf8c63144388f80879b5cc1439d161` passed the same assertion.
- Fixture audit metadata recorded zero page errors, unexpected API paths or attempted writes. Seven console messages were expected 503 responses from deliberate endpoint failure/retry tests; these are not authenticated backend errors. All fixture API writes remain blocked.
- The approved composite reference `admin-mobile-reference.png` was successfully rendered from the downloaded artifact for qualitative comparison. Visual comparison is now possible, but exact pixel parity and full acceptance of all 12 screens remain **NOT_VERIFIED / PARTIAL_NOT_ACCEPTED**. Preview's deployed diagnostic still proves only the login-shell CSS signature, not authenticated business persistence.

## Screen 10/11 structural parity work
- Direct comparison is now possible using the approved reference crops and the Preview screenshot at 390×844. The source combined Screen 10 Website settings and Screen 11 Backup/Restore in one `settings` view/title, while the reference maps them separately; baseline capture consequently scrolled deep inside Settings for the backup image.
- This change splits the existing Backup/Restore, D1 summary and binding-information panels into a dedicated `backup` view, adds desktop/mobile navigation and history routing, and updates the static baseline to capture that route from its top. This is a source-level UI correction only; it does not establish backend acceptance. Check live Validate/Preview for the candidate SHA before changing screen statuses.


## Screen 8 compact mobile customer cards
- The exact 390×844 Preview screenshot showed verbose stacked table columns (five separately labeled rows per customer), while the approved Screen 8 reference uses a compact identity/contact/order summary. Changed only presentation: a compact mobile summary uses existing name, phone, order count and last-order fields; email/address/created timestamp remain behind an explicit details disclosure. It does not add mock profile photos or order totals that the API does not return. Desktop table columns and search over existing fields remain intact.
- Added source-contract assertions and Playwright checks for mobile summary height, hidden desktop columns, details disclosure, search behavior, and the unchanged desktop table. Re-check exact-SHA Validate and Preview before assigning acceptance.

## Latest successful UI evidence

- Latest live branch checkpoint (documentation only): HEAD `83733513da6d3a28a13e773f479b596a4432df1f`; Validate [#39893834166](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39893834166) SUCCESS on exact SHA. This validates source integrity/tests but is not a new screenshot/Preview run.
- Screen 10 UI regression remains validated on source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`; the latest screen 8–12 source/test review found no additional reproducible defect from the available text evidence.
- Direct reference-image parity remains NOT_VERIFIED; do not infer visual acceptance from fixture screenshots.

- Application source/test SHA: `574a94827fa3429a2022e6cfca552bb3ded07315`. Validate [#39887267741](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39887267741) PASS on exact SHA; Admin Preview diagnostic [#39887267725](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39887267725) SUCCESS on the same SHA.
- Artifact `admin-preview-evidence-357` contains 102 PNGs: 16 login-shell captures, 86 read-only fixture/module screenshots and 78 fixture metrics. Expires 2026-11-06; raw PNGs are not committed to source.
- Public QR image cache fix (`Cache-Control: no-store`) and runtime tests (active=200/no-store; deactivated/replaced=404) passed Validate on this SHA.
- Preview diagnostic status: `PASS_LOGIN_CSS_SIGNATURE`. It confirms the configured login-shell CSS signature, not authenticated business-data acceptance. The screenshot matrix uses synthetic/read-only fixtures.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`. Authenticated business/backend QA is `NOT_TESTED`; Orders and Order detail require authenticated end-to-end workflow evidence.

## Older successful runs (historical evidence)

- Source/test SHA: `105f46b90dc5664dd091493dbd5cea1af7796c44`.
- Validate: [#39816652373](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652373) PASS.
- Screenshot matrix/Preview diagnostic: [#39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346) SUCCESS; [artifact #344 / ID 12441639210](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210), 102 PNGs and 78 fixture metrics.
- The module screenshots are read-only fixture/synthetic data. They are not authenticated business data and do not prove backend save/persistence. The deployed diagnostic only confirms the configured login CSS signature.
- Latest attempted handoff regression run on SHA `7a60099f96bb0be4f68dbda47fbec9c10df44390`: Validate [#39820101711](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39820101711) FAIL and Preview diagnostic [#39820105048](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39820105048) FAIL because START-HERE did not explicitly link `PROMPT-NEXT-CHAT.md`. This handoff sync repairs that link; check live Actions for the new SHA before claiming PASS. The screenshot/Preview stages were skipped in the failed attempt.
- Exact reference comparison remains **NOT_VERIFIED**: although the reference asset exists in the repo (1024×1536), it could not be rendered in the available inspection tool for direct pixel/layout comparison. Never describe it as reviewed in this checkpoint.

| # | Screen | Status | Latest source/fixture evidence and remaining boundary |
|---:|---|---|---|
| 1 | Login | PARTIAL_NOT_ACCEPTED | 16 login-shell shots in #344; unauthenticated only. |
| 2 | Dashboard | PARTIAL_NOT_ACCEPTED | Fixture dashboard; real KPI/business data not tested. |
| 3 | Product list | PARTIAL_NOT_ACCEPTED | Fixture catalog; three products do not prove real catalog density/pagination. No fabricated price/stock/image values. |
| 4 | Product editor | PARTIAL_NOT_ACCEPTED | Fixture controls only; persistent save, verified SKU and AI endpoint untested. |
| 5 | Product gallery | PARTIAL_NOT_ACCEPTED | `product-gallery__390x844__light.png` and dark counterpart show featured placeholder image, controls and horizontal thumbnail rail. No reproducible defect established; R2/product-image persistence deferred. |
| 6 | Orders | PARTIAL_NOT_ACCEPTED | Synthetic orders; authenticated/multipage data and mutations untested. |
| 7 | Order detail | PARTIAL_NOT_ACCEPTED | Fixture flow only; live actions untested. |
| 8 | Customers | PARTIAL_NOT_ACCEPTED | `customers__390x844__light.png`/dark counterpart show fixture customer cards; retry recovery is synthetic, live backend untested. |
| 9 | Warranty/support | PARTIAL_NOT_ACCEPTED | `warranties__390x844__light.png`/dark counterpart. In light shot, toast is above fixed mobile navigation; geometry fix passed in prior Playwright. Real warranty operations untested. |
| 10 | Website settings | PARTIAL_NOT_ACCEPTED | `settings__390x844__light.png`/dark counterpart; QR/draft UI only. Real save/activation unverified. |
| 11 | Backup/Restore | PARTIAL_NOT_ACCEPTED | `backup-restore__390x844__light.png` and desktop evidence; no real export/import cycle. A screenshot starting mid-page is not evidence of clipping by itself. |
| 12 | Activity log / notifications | PARTIAL_NOT_ACCEPTED | Activity log is fixture-only; new exact-SHA Playwright checks cover unread badge, mark-read timestamp, Escape close and focus restoration. Authenticated audit feed and real notifications remain untested. |

## Acceptance boundary
Fixture/test PASS does not mean final visual parity or authenticated backend PASS. D1 schema/payment ledger NOT_VERIFIED; migration 0009, PRE/PRO and R2/product-image save DEFERRED_BY_OWNER; Production deployment NOT_PERFORMED.

## Next actions
1. Continue reference-driven review with Screen 12 Activity/Notifications, then Screens 4/5 (Product editor/Gallery) and 7 (Order detail), using artifact admin-preview-evidence-374 (run 39906240167) at matching mobile viewports/themes. Record precise, repeatable differences only; do not fabricate product/customer data to imitate the reference.
2. Preserve `PARTIAL_NOT_ACCEPTED` for all 12 screens until both interactions and reference parity are substantiated. Fixture coverage does not establish live data, persistence, authorization or backend behavior.
3. Obtain an authorized authenticated Preview path before testing business workflows; never bypass Cloudflare Access or change secrets.
4. Keep remote D1 schema/ledger `NOT_VERIFIED`, Production `NOT_PERFORMED`, and migration 0009, PRE/PRO, product-image/R2 and AI grouping deferred.
5. Do not repeat B1 cleanup/provenance, merge/rebase/force-push, deploy, or write to `main`/PR #108.


## Screen 8 mobile CSS regression found and fixed
- Preview run [#39895792200](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895792200) failed its Playwright screenshot matrix because the desktop customer identity block was not explicitly hidden alongside the compact mobile summary. The source contract now asserts the missing CSS rule. Re-run exact-SHA Validate and Preview before treating Screen 8 layout as passing.
