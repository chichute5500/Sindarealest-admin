# Instructions for AI: use the ADMIN UI reference

Live status source: `docs/admin-ui-reference/handoff/current-status.json`. Single chat entry point: `docs/admin-ui-reference/handoff/START-HERE.md`. Fetch PR/HEAD/Actions live before writes; recorded SHAs in documents are checkpoint evidence, not permanent truth.

Open `docs/admin-ui-reference/admin-mobile-reference.png` before editing a screen. This poster is the visual standard. Preserve business behavior, authentication and API contracts. Record the exact reference and result screenshot paths.

## Official numbering
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log.

Classification belongs to #3/#4. AI review/grouping is a separate feature and BLOCKED until route, controls, API and behavior are approved.

## Requirements
- Mobile-first Liquid Glass, light/dark, Vietnamese text, accessible focus/names, no clipping or overlap.
- Inspect actual source and API/data flows; preserve authentication and contracts.
- Unknown product images/price/stock remain unknown. Do not fabricate data to mimic screenshots.
- Compare at matching viewport/theme. Record only combinations truly tested. Fixtures demonstrate fixture behavior only.
- The latest source/fixture matrix is run #39811730576 on SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`; it is not full screen acceptance. All 12 screens remain PARTIAL_NOT_ACCEPTED.
- Do not repeat the retry-customers timeout investigation from run #39804852604 unless new evidence shows a regression; the newer run passed.
- No merge, main/static edit, Production deployment, Access bypass/secrets, or remote D1/R2/migration operation.

See `handoff/current-status.json`, `handoff/latest-test-results.json`, `handoff/12-SCREEN-REFERENCE-AUDIT.md`, and `handoff/PROMPT-NEXT-CHAT.md`.
