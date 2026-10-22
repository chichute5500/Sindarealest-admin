# ADMIN — 12-SCREEN REFERENCE AUDIT (CANONICAL MAPPING)

**Checkpoint:** 2026-10-22T18:44:39+07:00 · parent HEAD `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e`  
**Visual evidence:** [Preview #39767851318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318), [artifact #311](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318/artifacts/12420678829), source SHA `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`. Artifact: 99 PNGs (16 login shell + 83 fixtures) and 75 metrics. [Validate exact parent HEAD #39769095034](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769095034) SUCCESS.

Older status text misnumbered Category #6, AI grouping #11 and Backup/Restore #12. The poster's real mapping is below; the old wording is archived at `docs/admin-ui-reference/handoff/history/legacy-2026-10-22/12-SCREEN-REFERENCE-AUDIT.md`.

| # | Official reference screen | Status | Evidence / gap |
|---:|---|---|---|
| 1 | Login | PARTIAL_NOT_ACCEPTED | Login shell tests only. |
| 2 | Dashboard | PARTIAL_NOT_ACCEPTED | Fixture/no-data state; do not invent chart data. |
| 3 | Product list | PARTIAL_NOT_ACCEPTED | Reference and 390×844 light screenshot opened. Fixture placeholders/unknown price-stock are intentional; continue matched-state comparison. |
| 4 | Product editor | PARTIAL_NOT_ACCEPTED | Screenshot opened; isolated geometry tests do not accept whole screen. |
| 5 | Product gallery | PARTIAL_NOT_ACCEPTED | Regression evidence exists on prior SHA; R2 deferred. |
| 6 | Orders | PARTIAL_NOT_ACCEPTED | Fixture list/filter evidence only; compare to poster. |
| 7 | Order detail | PARTIAL_NOT_ACCEPTED | Verify totals, timeline, status controls and guarded actions independently. |
| 8 | Customers | PARTIAL_NOT_ACCEPTED | Fixture search tests; do not invent avatar photos or segmentation. |
| 9 | Warranty/support | PARTIAL_NOT_ACCEPTED | Fixture checks; live-data parity not accepted. |
| 10 | Website settings | PARTIAL_NOT_ACCEPTED | Compare settings groups and toggles. |
| 11 | Backup/Restore | PARTIAL_NOT_ACCEPTED | UI checks do not prove actual export/restore. |
| 12 | Activity log | PARTIAL_NOT_ACCEPTED | Fixture log is not live audit-log acceptance. |

## Cross-cutting
- Viewports: 320×640, 360×800, 375×812, 390×844, 412×915, 768×1024, 1280×800, 1440×900. Matrix coverage is PARTIAL; record only actually exercised combinations.
- Light/dark and accessibility: PARTIAL.
- Product classification: capability inside #3/#4, PARTIAL_EXISTING_CONTROLS_ONLY.
- AI image review/grouping: BLOCKED separate feature; no approved route, controls, API or behavior contract.
- Authenticated backend QA: NOT_TESTED; R2 and PRE/PRO: DEFERRED_BY_OWNER.
- No screen PASS from CI, fixture screenshots, one assertion or login smoke alone.

## Next
1. Finish #3 matched viewport/theme comparison and change only demonstrated ADMIN-only defects.
2. Complete #4, then #6 and #7 as separate screens.
3. Continue remaining screens and PR #111 read-only ancestry/scope audit. Keep PRs open/unmerged.


## Visual comparison checkpoint — 2026-10-22T21:05:00+07:00

- Reference: `docs/admin-ui-reference/admin-mobile-reference.png`; artifact [#311](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318/artifacts/12420678829), source SHA `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`.
- Opened the poster and the `products-reference-matrix__390x844__light.png` screenshot from the downloaded artifact ZIP. Screenshot is a synthetic fixture with three product rows, explicit placeholder thumbnails, unknown prices and unverified stock; the poster's sample products have photos and filled commercial fields.
- Finding: data-state mismatch prevents a fair card-density/content-parity judgment. It is not evidence that source should fabricate images, price or stock. The visible UI has search, category/fulfillment filters, publish-state chips, edit controls and pagination; full screen #3 remains NOT_ACCEPTED.
- No source code changed in this checkpoint because no specific, reproducible ADMIN-only visual defect was established from the available fixture screenshot. Next compare the same #3 state at 320×640 and 360×800 light/dark, inspect relevant metrics, then change source only if a concrete defect independent of missing fixture data is proven.
- This is a docs-only checkpoint, not a screen acceptance or progress increase.


### Additional narrow-viewport review — 2026-10-22T21:12:00+07:00
Opened artifact #311 screenshots for #3 at 320×640 light/dark and 360×800 light/dark. No clear horizontal page overflow was apparent in these captures; at 320px, product names are intentionally ellipsized and SKU/category details wrap. The same fixture-data mismatch remains, and these screenshots alone do not establish complete card/action/filter/pagination parity. Screen #3 remains NOT_ACCEPTED; no source edit justified from the evidence inspected so far.
