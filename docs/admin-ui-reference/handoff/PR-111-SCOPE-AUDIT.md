# PR #111 SCOPE / PROVENANCE AUDIT

## Live checkpoint used for this audit

- Repository: chichute5500/Sindarealest-admin.
- PR #111 OPEN/unmerged; writable branch `feature/admin-isolated-handoff-2026-10-20`; HEAD at checkpoint start `7fe4d80c900859faf388b0e7dc585adb4350d1fe` (evidence-only child of tested source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`); base main SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. PR API reported 388 changed files, +38,988/-212, and `mergeable_state=dirty`.
- Validate [#39886592981](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886592981) and Preview [#39886593197](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886593197) both PASS on exact source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`.
- PR #108 OPEN/unmerged, READ-ONLY; branch `fix/liquid-glass-audit-2026-10-19`; checkpoint head `4ff25f02ec8255b98a6db1583c6d473a7c40a0bb`; 286 changed files, +20,509/-394. Main/static branch untouched.
- Public QR cache correctness fix: `functions/payment-qr/[key].js` now sends `Cache-Control: no-store`, with a source contract assertion. This avoids stale active-QR display after deactivation/replacement.
- Treat these numbers as a checkpoint snapshot. Fetch live PR/HEAD/Actions before acting.

## Current diff census — 388 paths

| Area | Files | Disposition |
|---|---:|---|
| Documentation and handoff evidence | 334 | Keep canonical reference/instructions/contracts and SHA-keyed text/JSON run evidence; remove only verified stale duplicates/empty assets |
| Pages Functions handlers/modules | 24 | Keep active route handlers and shared helpers; routing/auth contracts or current tests reference them |
| Database migrations | 2 | Keep 0008 SKU verification and 0009 fulfillment/payment-ledger schema |
| Admin UI | 1 | Keep public/admin/index.html; it is the one remaining changed HTML file |
| Scripts | 4 | Keep package/check/migration/deploy/setup tools; consumers and tests reference them. No scripts were executed |
| Tests | 19 | Keep tests in npm test and the Playwright specs invoked by Preview workflow |
| Workflow | 1 | Keep admin-preview-diagnostics.yml; it runs repository checks, source screenshot matrix, safe Preview diagnostic and artifacts |
| Seed data | 1 | Keep data/legacy-products.json; source integrity check validates 235 items, images, IDs/SKU rules and matches the 0002 seed SQL, and smoke tests exercise related contracts |
| Root guide/package | 2 | Keep README-DEPLOY.txt, which config-integrity tests read, and package.json, which defines checks/tests/runtime |

Path counts from live PR API at checkpoint start: .github 1; root-level 2; data 1; docs 334; functions 24; migrations 2; public 1; scripts 4; tests 19. Extension counts: yml 1, txt 1, json 167, md 168, png 1, js 26, sql 2, html 1, mjs 21.

## Historical evidence decision

- The complete branch history tree contains 158 SHA-keyed evidence directories, 321 report/metadata/Preview-diagnostic text/JSON files, and the history README. It contains no generated PNG matrices. One older record is report-only because its source screenshot matrix failed; retain that failure evidence.
- Keep compact per-run SHA and failure/success evidence under history/README.md policy. Full screenshot matrices remain in temporary Actions artifacts, not in the Git diff.
- Prior status text saying “318 records” was imprecise: 318 was a previous evidence-file count; the current tree has 158 directories and 321 evidence files.

## Cleanup completed and retained

- Removed earlier: 912 generated historical screenshot PNGs; 10 duplicate/stale handoff snapshot files; obsolete prompt/static audit material; static-only workflow/script/test artifacts; unreferenced reference ZIP; zero-byte docs/admin-ui-reference/admin-mobile-reference.html.
- Retained approved docs/admin-ui-reference/admin-mobile-reference.png and reference-instructions.md.
- Previously centralized normalizeFulfillmentType in functions/_lib.js and deleted the duplicate definition plus unreferenced isValidPaymentBankId, isValidPaymentAccountNo and isValidPaymentAccountName validators from functions/_payments.js. tests/fulfillment-payment-contract.test.mjs imports the canonical helper from _lib.js.
- data/legacy-products.json is not an unused runtime catalogue: scripts/check-project.mjs verifies its 235 products, IDs, unverified SKU handling, image paths and correspondence to the 235 SQL seed rows; tests/smoke.test.mjs also uses these contracts. README-DEPLOY.txt is consumed by tests/config-integrity.test.mjs.

## Payment routes — no safe consolidation

- functions/_payments.js: shared fulfillment/token/QR allowlist/full-ledger summary helpers — KEEP.
- functions/api/admin/payment-qr.js: Admin-only draft/save/activate/deactivate and audit — KEEP.
- functions/api/admin/payment-qr-upload.js: bounded signature-checked upload that stages a pending inactive image — KEEP.
- functions/api/admin/payment-qr-preview.js: Admin-authenticated pending-key preview, private/no-store — KEEP.
- functions/payment-qr/[key].js: public route serves the active QR key only — KEEP.
- functions/api/payment-settings.js: public active-configuration GET; writes disabled — KEEP.
- functions/api/admin/payment-requests.js: create/cancel payment requests and aggregate full ledger — KEEP.
- functions/api/admin/payment-transactions.js: manually verified receipts/refunds, atomic payment/status/audit transition — KEEP.
- functions/api/order-payment.js: read-only capability-token customer endpoint, private/no-store and terms/current-QR gated — KEEP.
- Evidence: tests/fulfillment-payment-contract.test.mjs, tests/payment-ledger-route.test.mjs, migration 0009, package checks/tests. Route authorization/exposure/cache/state contracts differ; merging would remove important boundaries.

## Orders and Order detail — source review only

- functions/api/admin/orders.js bounds parent orders to 1,000 before joining items; one D1 read groups line items. The test asserts bounded query count, grouping, null prices and empty-item behavior.
- functions/api/orders.js plus migration 0007 preserve purchase-time contact details without updating a customer profile; order_contact_details records the order snapshot.
- public/admin/index.html has a separate Order detail view routed by selected order ID, using the Admin orders dataset and a return-to-list path.
- Fixture/mock tests are not authenticated D1-backed workflow evidence. Orders and Order detail remain PARTIAL_NOT_ACCEPTED.

## B1 conclusion and overall acceptance boundaries

**B1 PR cleanup/provenance review is COMPLETE for the current 388-file checkpoint diff.** All current diff categories have been classified by consumer/purpose. No additional safe deletion or helper/API merge is justified by available evidence. Reopen the cleanup audit only if the live diff changes or new unused-file evidence appears.

Overall Admin acceptance remains PARTIAL: 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated business/backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.

Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain DEFERRED_BY_OWNER. No remote D1/R2/schema/ledger actions; no setup/migration/deploy script execution; no merge/deploy/secret/Access changes.

