# SINDAREALEST — D1 Rows read: Safe rollout and verification (2026-10-30)

## Ownership and environments
- Repository: `chichute5500/Sindarealest-admin`, draft PR #155.
- **Preview D1:** `sindarealest-admin-preview-db`, ID `573ad702-05fc-405e-8ef3-0cf2e7fea98d`.
- **Production D1:** `sindarealest-db`, ID `f6c208a1-052a-445c-a3b7-a442783f9bd3`.
- **Separate AI Preview D1:** `sindarealest-ai-preview-db` (not touched).
- Free Workers D1 daily `rows_read` cap: 5,000,000 **total per Cloudflare account**, not per D1 database. At 2026-10-30 Owner observed account 6.03M/5M. Both Preview and Production contribute. Limit resets at 00:00 UTC (= 07:00 Asia/Ho_Chi_Minh).

## Known Preview metrics from Owner screenshot
| Query | Calls | Total Rows read | Avg Rows read per call |
| --- | ---: | ---: | ---: |
| Admin orders `WITH recent_orders` | 507 | 3.77M | ~7,436 |
| Product route query 1 | 263 | 238.28K | ~906 |
| Product catalog query 2 | 399 | 173.53K | ~435 |
| Admin logs | 539 | 216.14K | ~401 |
No Production per-query measurements have been provided; **do not assume that the highest Production query is identical**.

## Changes prepared on PR #155
1. `migrations/0015_d1_rows_read_indexes.sql`: additive indexes on `audit_logs`, `products`, and `order_items`. No `DELETE`, `UPDATE`, `DROP` or business data reformatting.
2. `functions/api/admin/orders.js`: read the latest `order_created` audit once per order and reuse it for original payment fields and deposit timestamp logic. Original response fields, milestones, pricing and COD handling unchanged.
3. Local SQLite test: `tests/d1-rows-read-regression.test.mjs` + exact original query fixture. Verifies `EXPLAIN QUERY PLAN` index selection, original-vs-new result-row equality, payment history, public/Admin-compatible fields and null behavior.
4. **Updated 2026-11-01:** Existing 10-second order/log polling remains unchanged. Every ~45 seconds Admin requests a lightweight product revision; a full product SELECT runs only if products changed. An initial login, explicit refresh before receiving a revision, or a Preview without migration 0016 still loads the full list (safe fallback).
5. Integration caution: separate open PR #154 (Admin Liquid Glass 2.0) modifies `package.json` as well; reconcile test-script addition during merging. PR #154 does **not** modify the D1 SQL route or the migration in this PR as of review.

## Rollout gates (keep main and D1 untouched until all pass)
1. Verify repository `main` has not moved significantly and PR #155 is mergeable; rebase/update branch carefully if other PRs merge.
2. CI gate: `npm run check`, `npm test`, query comparison test PASS. Note live Preview e2e may fail for unrelated D1 quota exhaustion.
3. Use **disposable local SQLite/D1** to test migration; do not bind disposable QA to Preview or Production database IDs.
4. At a healthy daily quota, collect separate database Metrics > Queries / Rows read for **both** environments. Record per-query `Count` and `Rows read` before change, and identical metrics afterward at comparable traffic. Use query `meta.rows_read` on controlled tests if possible.
5. Before index creation, verify the correct database and that migrations through `0009` are already applied. Ensure a restorable Cloudflare Time Travel bookmark/backup is available; do not mutate customer/business records.
6. Apply additive indexes **first to the isolated test database**, then Preview D1 only after verifying its binding and backup. Execute `EXPLAIN QUERY PLAN` on original and optimized SQL; verify the composite `idx_audit_entity_action_created` index is used and `rows_read` improves.
7. Verify authenticated Admin GET orders, 6-stage tracking, payment/deposit/remaining amount, QR, warranty activation only at completion, product details & categories; verify HTTP 503 is gone and 10-second refresh remains intact.
8. Only after Preview proves compatible and metric reductions, schedule Production D1 index creation and API deploy with rollback and monitoring. Do not merge PR #155 or deploy blindly while account-level daily D1 quota is exceeded.
9. If Rows read is still excessive, measure Production's actual top queries before changing SQL further. Target the measured root cause, not generic caching that could serve stale financial information.

## Recovery & safety
- During Free plan quota exhaustion D1 queries can be rejected. A database cannot be reliably tested when the whole account is over the read quota.
- Restoring a previous code version does not remove an index; the additive index remains compatible. Rollback of SQL runtime code is straightforward; dropping indexes should only be considered after verifying query plans, and is not required to restore functionality.
- Never delete orders, products, audit logs, or customer data merely to reduce Rows read.
- This file is a **runbook**, not an assertion that database migration or Production deploy has occurred.

## Addendum: Preview products query (2026-11-01)
- Branch/PR: `perf/d1-rows-read-safe-2026-10-30` / #155 (DRAFT). The new schema is `migrations/0016_admin_products_revision.sql`.
- Confirmed source of the normalized D1 Insights query `SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT ?`: `functions/api/admin/products.js` (`LIMIT 2000` in source).
- Old Admin periodically re-read all products at the broad sync interval (~45 seconds); this was independent of the 10-second orders/log polling.
- Migration 0016: new `(sort_order, sku)` index and AFTER INSERT/UPDATE/DELETE triggers incrementing the single indexed `settings.products_revision` value. Trigger seed row is inserted **last**, so partial migrations cannot advertise an untracked revision. This does not modify existing product rows.
- API: optional `?revision=N` returns `{unchanged:true,revision:N}` (no products read) when equal. Otherwise full products JSON retains original order and fields, with a new `revision` property. Missing version row falls back to full results and no token.
- Mobile/Admin UI: preserves editing guards, manual refresh, forced refresh, 10-second order/log updates, 45-second broad sync, login, and all glass/CSS styles. It only sends a version token when previously received.
- Validation: `node tests/admin-products-revision.test.mjs` tests real disposable SQLite triggers and indexed plan, authenticated GET, hidden products, order, inserts/updates/deletes and pre-migration fallback. Existing Admin refresh contract test updated.
- Preview DB-only guarded rollout: `.github/workflows/d1-preview-products-revision-guarded.yml` and `scripts/d1-preview-products-revision-guarded.mjs`. Requires exact Preview binding, Time Travel bookmark, 0015 predecessor index, focused tests and safe row equality. Production D1 is validated by identity only, never written.
- **Important:** Source changes/CI PASS are not proof of a successful remote schema rollout or an observed account-level D1 quota reduction. Check the guarded workflow's result and artifacts, Preview Pages deployment revision and D1 Insights before declaring effectiveness.
- Full catalog requests remain necessary on first load and on every real product change; a revision check adds a very small indexed SELECT. Triggers add one settings-row write per product mutation.
