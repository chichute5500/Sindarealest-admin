# PR #111 SCOPE / PROVENANCE AUDIT

## Live tested checkpoint

- Repository chichute5500/Sindarealest-admin. PR #111 OPEN/unmerged; branch feature/admin-isolated-handoff-2026-10-20; exact SHA dacc776531248cd38bf761a2381b31b630f94213; base main at 28c768ba26b1d9f7d40e14efac5112526ed1c8b3; mergeable=false.
- Validate [#39846423113](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39846423113) SUCCESS on exact SHA dacc776531248cd38bf761a2381b31b630f94213. Follow-up handoff commit needs its own exact-SHA run once; use live GitHub after that rather than writing another pointer-only commit.
- PR #108 OPEN/unmerged, read-only; live head d869cc63660b75f434d2ea86f925e528b0ffa806. No writes to PR #108, main or static website branch.

## Live changed-path census (after empty-viewer removal)

- PR API: 384 files, +38,796/−211. Root counts: .github 1, root-level 2, data 1, docs 330, functions 24, migrations 2, public 1, scripts 4, tests 19. Extensions: yml 1, txt 1, json 165, md 166, png 1, js 26, sql 2, mjs 21, html 1.
- Tree confirms viewer path removed; canonical admin-mobile-reference.png retained. The one HTML change/file remaining is public/admin/index.html. Tree entries (1,164) and PR changed paths (384) are different measures.
- Previous cleanup: 912 generated screenshots, 10 stale snapshots, old prompt/audit artifacts, unreferenced ZIP and web-static-only workflow/script/test pollution removed; 318 compact history records retained.

## Payment/API provenance decisions

- functions/_payments.js: shared fulfillment/token/QR allowlist/full-ledger summary helpers used by handlers/tests — KEEP.
- functions/api/admin/payment-qr.js: Admin-only draft/save/activate/deactivate and audit — KEEP.
- functions/api/admin/payment-qr-upload.js: bounded, signature-checked upload that stages pending image — KEEP.
- functions/api/admin/payment-qr-preview.js: Admin-authenticated pending-key preview, private/no-store — KEEP; not a replacement for public serving.
- functions/payment-qr/[key].js: public route serves active QR only — KEEP.
- functions/api/payment-settings.js: public active configuration GET; write method disabled — KEEP.
- functions/api/admin/payment-requests.js: create/cancel requests and full-ledger aggregate separate from 100-row display — KEEP.
- functions/api/admin/payment-transactions.js: manually verified receipt/refund and atomic ledger/status/audit transition — KEEP.
- functions/api/order-payment.js: read-only capability-token customer endpoint, private/no-store, term and current QR gated — KEEP.
- Evidence: tests/fulfillment-payment-contract.test.mjs and tests/payment-ledger-route.test.mjs; both passed in Validate #39846423113 on exact SHA dacc776531248cd38bf761a2381b31b630f94213. No safe endpoint consolidation is supported.

## Orders and Order detail — separate review

- functions/api/admin/orders.js applies LIMIT 1000 to parent orders before joining all line items; one D1 read groups by order id. tests/admin-orders-query.test.mjs asserts a single query, grouping, null price preservation and empty-item order behavior.
- functions/api/orders.js + migration 0007 snapshot purchase-time contact data. tests/order-contact-isolation.test.mjs asserts checkout does not UPDATE the customer's existing profile, does atomically bind to canonical customer row and creates order_contact_details; warranty views use the order snapshot.
- public/admin/index.html has a separate order-detail view routed via selected orderId; details read from the Admin orders dataset and return-to-list focuses the selected row/actions. E2E fixtures exercise route/layout/navigation, not authenticated D1-backed workflows.
- Finding: code/query/mock-test contracts are reviewed; authenticated Order/Order detail acceptance remains NOT_TESTED and both screens remain PARTIAL_NOT_ACCEPTED. No file deletion/merge is justified from this review.

## Remaining B1 work and guardrails

1. Validate this follow-up handoff SHA once and stop metadata-only pointer updates after the live run passes.
2. Finish remaining changed-path provenance across docs/history/config/workflow/data contracts/tests. Preserve per-run records even if identical.
3. Keep migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping deferred as required. No remote D1/R2/schema/ledger actions.
4. B1 PARTIAL — NOT COMPLETE; progress 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated business/backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
5. Only write the Admin branch; PR #111/#108 open/unmerged. Never write PR #108, main or static branch; no merge, rebase, force-push, Production deploy, setup/migration/deploy scripts, secrets or Access bypass.
