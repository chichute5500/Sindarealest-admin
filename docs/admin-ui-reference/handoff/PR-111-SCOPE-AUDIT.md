# PR #111 SCOPE / PROVENANCE AUDIT

## Live baseline verified before this sync

- Repository: chichute5500/Sindarealest-admin.
- PR #111 OPEN/unmerged; branch feature/admin-isolated-handoff-2026-10-20; checkpoint HEAD b8aff9d341e5c08d16ccc52efdab0b63da0e0869; base main at 28c768ba26b1d9f7d40e14efac5112526ed1c8b3; mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- PR #108 OPEN/unmerged and read-only, head 06a409152455474dab99a134e6f59b16184c11e2. No writes to it.
- Validate [#39844529679](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844529679) SUCCESS on exact SHA b8aff9d341e5c08d16ccc52efdab0b63da0e0869; checkout logs confirm SHA and npm run check / npm test passed. Failure #39844022556 on e749873c0635eec31c4d5467cc357238edbebd6c was due to null latestRun.id/url and was superseded by the successful run.
- This sync creates a new SHA; require its own Actions run before marking that SHA validated.
- Commit compare reports merge-base f38cefe4647b33bd42f9018fde00c420ee5c7c66, branch ahead 1,334 / behind 6, and diverged. Compare API lists at most 300 files; PR changed-filenames API provided the full 385 paths. Do not sync/rebase/merge.

## Changed-path census and completed cleanup

- Pre-cleanup PR census: 385 paths; roots { .github:1, root:2, data:1, docs:331, functions:24, migrations:2, public:1, scripts:4, tests:19 }; extensions yml:1, txt:1, json:165, md:166, html:2, png:1, js:26, sql:2, mjs:21.
- This sync removes docs/admin-ui-reference/admin-mobile-reference.html, a zero-byte new-only viewer. Expected PR count after removal: 384; docs paths 330 and html paths 1. Re-query GitHub after writing and correct counts from live results.
- Previous cleanup remains complete: 912 generated historical PNGs removed, 10 stale duplicate handoff snapshots removed, obsolete prompt/static audit artifacts removed, unreferenced reference ZIP removed, static-only workflow/capture script/test pollution removed, and public/index.html restored to main. Keep 318 compact per-run history records. Preserve approved admin-mobile-reference.png.
- Proven deletion: viewer blob 6ff4fc52979192eb8c6cb0cf23ab0c4079ca31f6 has length 0, despite README claiming a self-contained viewer; reference-instructions.md says to open the PNG. Removing the empty viewer and updating README does not remove/recreate the PNG.

## Provenance review — runtime/payment slice

| Path | Consumer / role evidence | Decision |
|---|---|---|
| functions/_payments.js | Shared fulfillment enum, fail-closed legacy normalization, token hashing, QR-key allowlist and full-ledger summary; imported by multiple handlers/tests. | Keep; actively used. |
| functions/api/admin/payment-qr.js | Admin config draft/save/activate/deactivate and audit log. | Keep; separate config transition. |
| functions/api/admin/payment-qr-upload.js | Bounded upload and file-signature checks; stores pending image/key and audit entry. | Keep; not the activation action. |
| functions/api/admin/payment-qr-preview.js | Admin auth, pending-key restriction, private/no-store/no-referrer. | Keep; not interchangeable with public route. |
| functions/payment-qr/[key].js | Public route serves only the active key. | Keep; distinct exposure/cache. |
| functions/api/payment-settings.js | Public active-config GET; PUT returns 405; validates active object exists. | Keep; different contract from Admin config. |
| functions/api/admin/payment-requests.js | Creates/cancels pending requests; validates order/terms/line totals and derives payment amount on server. GET display capped, summary aggregates full ledger. | Keep; request/reporting responsibility. |
| functions/api/admin/payment-transactions.js | Manually verified receipt/refund via atomic batch, payment state and audit changes. | Keep; distinct financial transition. |
| functions/api/order-payment.js | Read-only customer endpoint scoped to hashed capability token, private/no-store, confirmation/current-QR gated. | Keep; distinct customer exposure. |
| functions/api/admin/orders.js and functions/api/orders.js | Admin order pricing rejects direct payment-status changes; order creation snapshots fulfillment and hashed token. | Keep; order lifecycle contracts. |
| migrations/0009_fulfillment_and_manual_payments.sql | Creates fields/tables/indexes queried by payment routes and covered by checks. | Keep, DEFERRED_BY_OWNER; not run remotely. |
| package.json, scripts/check-project.mjs, scripts/check-migrations.mjs, scripts/setup-cloudflare.mjs, scripts/deploy-cloudflare.mjs | Package commands and validation tests reference them; setup/deploy have guarded potential remote actions; migration check uses temporary local D1. | Keep; no scripts executed. |
| tests/fulfillment-payment-contract.test.mjs, tests/payment-ledger-route.test.mjs, tests/handoff-integrity.test.mjs | Assert auth/exposure, amount rules, full-ledger-vs-capped-list, verified receipts/refunds and handoff consistency. All passed on exact checkpoint SHA in Validate #39844529679. | Keep; concrete regression evidence. |

**Conclusion:** current source/provenance evidence does not justify consolidating or deleting payment routes. They differ in authorization, public exposure, caching and state transitions. The full-ledger summary fix is covered independently from the 100-row display list.

## Remaining B1 work

1. Fetch and verify Actions for post-sync HEAD using exact SHA; inspect logs if failure.
2. Continue semantic provenance across remaining changed paths, especially configuration, workflow, data contracts, docs/history and tests; reconcile live PR census.
3. Audit Orders and Order detail independently. Keep them PARTIAL_NOT_ACCEPTED until required acceptance evidence exists.
4. Preserve per-run reports/metadata/diagnostics even where blobs are identical; the documented policy retains run history.
5. Keep migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping deferred as required. No remote D1/R2/schema/ledger actions.

## State and guardrails

- B1: **PARTIAL — NOT COMPLETE**.
- Progress: 50% PROVISIONAL. All 12 screens PARTIAL_NOT_ACCEPTED; authenticated business/backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
- Only write feature/admin-isolated-handoff-2026-10-20; PR #111 and #108 remain OPEN/unmerged. Do not modify PR #108, main or static website branch.
- No merge/rebase/force-push/Production deploy, setup/migration/deploy execution, Cloudflare Access bypass, secret access/change, or remote D1/R2/schema/ledger actions. Do not fabricate business data or unapproved contracts.
