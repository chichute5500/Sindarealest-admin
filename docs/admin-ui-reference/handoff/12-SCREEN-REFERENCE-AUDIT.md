# ADMIN — 12-SCREEN REFERENCE AUDIT

**Current product progress: 50% PROVISIONAL.** No screen is fully accepted. Product code/UI evidence and the later handoff-integrity check are tracked separately.


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
| 12 | Activity log | PARTIAL_NOT_ACCEPTED | `activity-log__390x844__light.png`/dark counterpart; fixture-only single record, authenticated audit feed untested. |

## Acceptance boundary
Fixture/test PASS does not mean final visual parity or authenticated backend PASS. D1 schema/payment ledger NOT_VERIFIED; migration 0009, PRE/PRO and R2/product-image save DEFERRED_BY_OWNER; Production deployment NOT_PERFORMED.

## Next actions
1. Fetch current HEAD/Actions first; verify whether the link-repair commit passes the new handoff test.
2. If image rendering becomes available, compare reference and screenshot at matching viewport/theme and log concrete names/coordinates; until then do not claim pixel parity.
3. Continue Gallery and screens #8–#12; make only visible, reproducible ADMIN-specific fixes. Keep each screen PARTIAL_NOT_ACCEPTED until its behavior and reference are truly accepted.

## Screen 8 mobile CSS regression found and fixed
- Preview run [#39895792200](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895792200) failed its Playwright screenshot matrix because the desktop customer identity block was not explicitly hidden alongside the compact mobile summary. The source contract now asserts the missing CSS rule. Re-run exact-SHA Validate and Preview before treating Screen 8 layout as passing.
