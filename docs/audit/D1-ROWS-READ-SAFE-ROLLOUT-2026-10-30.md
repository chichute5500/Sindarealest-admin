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

## Parallel QA continuation — 1 November 2026 (PR #155 only)

Three independent validation tracks now run without touching main:
1. **Local functional/regression:** `tests/admin-products-revision.test.mjs` covers authenticated product API, ordering, hidden rows, insert/update/delete triggers, a restore-style replacement in one transaction, and missing-schema fallback. `tests/admin-mobile-refresh-contract.test.mjs` preserves the existing Android refresh guards, 10-second order/log sync and 45-second catalog version polling.
2. **Schema rollout and recovery:** `.github/workflows/d1-preview-products-revision-guarded.yml` invokes `scripts/d1-preview-products-revision-guarded.mjs` against only database `sindarealest-admin-preview-db` after exact binding checks and Time Travel bookmark. The script validates all three stored trigger definitions, checks original product row parity and requires `idx_products_sort_sku` in the remote query plan.
3. **Read-only Preview verification and isolated UI:** `scripts/d1-preview-products-readonly-validation.mjs` measures one original full query plus an indexed revision lookup and emits **metadata only** to `artifacts/d1-preview-products/readonly-metrics.json`. `.github/workflows/pr155-d1-products-preview.yml` gates an isolated deployment to `https://d1-products-155.sindarealest-admin-preview.pages.dev/admin/` on successful remote schema verification. This alias is distinct from the Storefront owner Preview. It must not be described as deployed until its workflow succeeds.

**Release gates still open:** Verify the actual GitHub Actions push-workflow results and remote artifact, then confirm deployed Preview source SHA, no anonymous API access, exact Preview D1 rows-read delta, and all Admin actions in read-only/fake-data QA. A green local CI does **not** prove Preview migration or a reduced account-wide quota. Production/Main remain out of scope until Owner PASS. Do not repeat remote index creation if schema is already verified.


## Verified remote Preview D1 results — 2026-11-01

**Source SHA tested:** `23e9304c7b6e2a7c40bdaa8ae61112c0685b2475`.
**GitHub Actions:** https://github.com/chichute5500/Sindarealest-admin/actions/runs/41232156793
**Sanitized evidence:** GitHub Actions artifact `d1-preview-products-checkpoint`, artifact ID `13054116244` (temporary retention), plus the PR #155 comment by `github-actions[bot]`.

| Query / check | Actual Preview D1 rows_read |
| --- | ---: |
| Full `SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000` before index | **453** |
| Full product query after index | **453** |
| Indexed `SELECT value FROM settings WHERE key='products_revision' LIMIT 1` | **1** |
| Preview product count | **453 products** |
| Per unchanged catalog check reduction | **99.78%** |

Workflow result **SUCCESS**. Guarded migration created and verified `idx_products_sort_sku` and the three products-revision triggers, inserted revision seed only after validation, confirmed full product order/value parity, reported unchanged-read metric, and deployed **only** isolated Preview alias:
https://d1-products-155.sindarealest-admin-preview.pages.dev/admin/

The workflow also confirmed HTTP 401 for an unauthenticated Admin products API request and that the Preview Admin page rendered. GitHub source/automation CI and Admin Preview Playwright were successful at this version. **No Main merge and no Production D1 or Production Pages writes**.

**Interpretation:** On each logged-in Admin periodic catalog check with unchanged products, the product query cost drops from 453 rows read to 1 row read. A first/full reload or an actual mutation still reads all 453 products (by design). An index does not reduce the full SELECT's own rows_read: the savings come from skipping unchanged full reads. This is not yet evidence of an identical 99.78% reduction in account-wide D1 quota, because orders, audit logs, public catalog, login and other endpoints contribute to the aggregate.

**Next release gates:** Compare Cloudflare D1 Insights total Rows Read under representative Preview traffic, confirm real edit/create/delete sync on authorized Preview test data if safe, review any PR #154/#159 overlapping changes, and require Owner acceptance before integration into Production. Do not re-run unnecessary writes on the live D1 merely to confirm metrics.

## Verified Admin audit-log polling optimization — 1 November 2026

**Preview D1 evidence:** https://github.com/chichute5500/Sindarealest-admin/actions/runs/41232964715  
**Source SHA tested:** `4c2372d95a24a3223731df31dadfe23dee07f8ed`.

The `scripts/d1-preview-admin-polling-readonly.mjs` workflow first measured the exact live Admin GET SQL on Preview D1 (read-only run https://github.com/chichute5500/Sindarealest-admin/actions/runs/41232739210):

| Endpoint | Before: Rows Read per call | After: Rows Read per call when unchanged |
| --- | ---: | ---: |
| Products | 453 | **1** |
| Audit logs | 401 | **1** |
| Orders | 58 | 58 (unchanged by this follow-up) |

**New change:** `migrations/0017_admin_audit_revision.sql` adds a `(created_at DESC,id DESC)` sort index and INSERT/UPDATE/DELETE audit-log revision triggers. The Admin GET audit endpoint now accepts an optional revision token, like products. Active 10-second order/log polling stays intact, but audit history is only reloaded after an actual log mutation. Missing revision seed falls back to the full original list.

The **guarded remote migration and deployed Preview both PASSED**:
- Before index: 401 Rows Read to return 200 audit entries.
- After index, full audit query: **200 Rows Read**, identical content and order.
- Unchanged revision check: **1 Rows Read**: **99.75% lower per idle audit poll** than the original full query.
- Schema: all three triggers and the index were verified on `sindarealest-admin-preview-db`; Time Travel bookmark saved.
- Isolated deployed QA: https://d1-audit-155.sindarealest-admin-preview.pages.dev/admin/
- HTTP 401 on anonymous Admin audit API: PASS.
- `tests/admin-audit-revision.test.mjs` covers 50 idle polls, real in-memory SQLite triggers, update/delete, restore, Admin authentication, index selection and old-schema fallback. `npm run check`, `npm test`, and Admin Preview Playwright: PASS.

**Interpretation and limits:** The two 99% figures are actual reductions **per unchanged Admin poll**, not a claim of 99% account-level savings. An initial load or real mutation still reads all relevant products/logs. Orders continue reading 58 rows per request in this measured Preview dataset and 10-second cadence. Other endpoints and Production traffic contribute to Cloudflare's total Rows Read.

**Release decision:** D1 query/performance and isolated Admin Preview QA for products + audit logs = **PASS**; Production roll-out and account-level quota comparison = **NOT YET PASS**. PR #155 contains additional Storefront changes unrelated to these optimizations; it overlaps PR #154 in `package.json` and `public/admin/index.html`, and PR #159 in `package.json`, `public/index.html`, and `tests/order-trust-layout.test.mjs`. Do not merge PR #155 wholesale without resolving these conflicts and preserving Owner-approved Liquid Glass. Do not modify Production until approved.

### Safe handoff

- Branch: `perf/d1-rows-read-safe-2026-10-30`, PR #155 (draft, unmerged).
- Preserve `migrations/0015_d1_rows_read_indexes.sql`, `0016_admin_products_revision.sql` and `0017_admin_audit_revision.sql`, their API and Admin polling changes, and regressions when integrating.
- Do not rerun remote migration to claim additional savings; it is already applied and verified on Preview D1.
- For a Production release: resolve PR conflicts, review Production D1 backup/binding, obtain Owner approval, then perform a separate guarded Production rollout with comparable-traffic monitoring. No customer or payment writes are needed for performance measurement.
