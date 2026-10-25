# INDEPENDENT ADMIN QA — 2026-10-25

## Scope and source provenance

Repo `chichute5500/Sindarealest-admin`. Writable Admin branch `feature/admin-isolated-handoff-2026-10-20`. PR #111 OPEN, unmerged. Production `main` remains `227622d3e3b7c75724ffa1775b193da71089269a`; Storefront PR #108 remains OPEN, read-only. The tested code HEAD before this documentation commit is `27a145253c71bc887b536611e9fece3ddd51779d`.

## New verified code fixes

1. `30b193a640dd6bad826265bf3b982b05558616cc` — `functions/api/admin/payment-transactions.js`: `amount` must be a JSON number, not a coerced boolean/array/string. The admin form already serializes `Number(input.value)`. Three regression requests must return HTTP 400 with no D1 batch.
2. `27a145253c71bc887b536611e9fece3ddd51779d` — `functions/api/admin/warranties.js`: warranty duration rejects arrays, objects, booleans and padded/non-decimal strings; accepts integer JSON numbers and decimal-only strings emitted by the actual `FormData` form. Tests require 400/no DB mutation on invalid input and 201 on valid `"12"`.

## Exact-SHA CI

- `Admin Preview Playwright` [#40175655753](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175655753): `success`
- `Validate source and tests` [#40175655821](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175655821): `success`
- `Admin isolated Preview Playwright` [#40175655848](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175655848): `success`
- `Validate source and tests` [#40175651274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175651274): `success`
- `Admin isolated Preview Playwright` [#40175651270](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175651270): `success`
- `Admin Preview diagnostic smoke test` [#40175651273](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40175651273): `success`

## Independent artifact verification

Downloaded GitHub Actions artifact `admin-preview-evidence-590` (#12591429398, source `30b193a640dd6bad826265bf3b982b05558616cc`), inspected the PNGs and metadata from ZIP. **132 PNG files** decoded successfully. No declared viewport-size mismatch. Across all 132 captures, **112 SHA-256 distinct** (20 repeats across auxiliary view/state captures), so do not claim all 132 are unique.

Within the canonical **12 screen names** (`admin-login`, `dashboard`, `products`, `product-editor`, `product-gallery`, `orders`, `order-detail`, `customers`, `warranties`, `settings`, `backup-restore`, `activity-log`), each of the three comparison groups **390x844 light**, **390x844 dark**, **1280x800 light** has **12/12 distinct images**. Visual inspection shows responsive mobile navigation and desktop sidebar. These captures are synthetic/local-static states, **not same-data approved-reference comparison or live-deployed SHA certification**. No owner signoff was granted: **0/12 OWNER_ACCEPTED**.

Downloaded isolated Admin Preview Playwright artifact `admin-isolated-preview-playwright-101` (#12592052512) and checked deployment-provenance-readonly.json: status `REPORTED_SHA_MISMATCH`, expected `30b193a640dd6bad826265bf3b982b05558616cc`, observed deployed source `c64e07fca248dc527361c4d018dc26c11f5b3570`, Pages project `sindarealest-admin-preview`. This is Cloudflare API metadata evidence, not byte-for-byte served asset digest. Login CSS diagnostics `PASS_LOGIN_CSS_SIGNATURE`.

## Environment and acceptance blockers

Owner Cloudflare metadata preflight [#40167641001](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40167641001) previously established three P0 configuration blockers: `ADMIN_PREVIEW_ORIGINALS_MISSING`, `STOREFRONT_PREVIEW_DB_SHARES_PRODUCTION`, and `STOREFRONT_PREVIEW_ORIGINALS_PRODUCTION_BACKED`. Admin Preview `DB` and `IMAGES` are isolated from Production. No new privileged Cloudflare settings read or R2 write was made in this round.

The owner must configure on Cloudflare Pages **Preview** environment only: (1) Admin project `sindarealest-admin-preview` add `ORIGINALS` bound to a dedicated *private, non-Production* R2 bucket; (2) experimental Storefront Preview remap `DB` to a disposable isolated non-Production D1 and `ORIGINALS` to an independent private Preview-only R2 bucket. Do not touch Production identities or reuse `IMAGES` as `ORIGINALS`. Rerun read-only preflight before remote write QA or any Preview deployment. Even when configured, no automatic merge/integration is authorized.

Still **NOT ACCEPTED**: real Preview QR/private-original R2 write-read-cleanup, standalone disposable remote Restore POST, financial settlement/refund business signoff, security/accessibility/performance comprehensive acceptance, actual latest-source Preview deployment and 12-screen same-state owner visual approval. Rubric remains **32/100 evidence-weight, NOT percent complete**, until gates are newly supported.

## Continue independently when safe

Continue Admin-only contract and regression audits, exact-SHA CI, screenshot comparisons. Preserve official gold SD logo without color filters. No Production, storefront source or shared resource writes; only safely isolated, clearly tagged run-owned synthetic data with two cleanup verifications when remote writes become permissible.


## Additional Admin order stale-snapshot guard — 030a39928204a5b091b27880adf645f57e343593

Modified `functions/api/admin/orders.js` and `tests/disposable-sqlite-integration.test.mjs`. Ordinary status saves that *do not* reprice now skip rewriting unchanged order item prices, and final summary UPDATE requires the live D1 `order_items` snapshot (row count, IDs, quantity, existing unit price) to still match the preflight read. A real in-memory SQLite test injects a concurrent, already-committed `130000` VND reprice after this request read original `120000`: stale PATCH must return 409, leave `order_items.unit_price=130000`, `orders.total=130000`, zero false audit rows. Production/remote D1 are untouched.

Exact SHA CI at report update:
- [#40176386344](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176386344) `Admin Preview Playwright`: `success`
- [#40176386338](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176386338) `Admin isolated Preview Playwright`: `success`
- [#40176386348](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176386348) `Validate source and tests`: `success`
- [#40176382610](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176382610) `Validate source and tests`: `success`
- [#40176382603](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176382603) `Admin isolated Preview Playwright`: `success`
- [#40176382625](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40176382625) `Admin Preview diagnostic smoke test`: `success`

**Residual work:** Concurrent *actual price changes* (as opposed to unchanged-price status saves) still require deeper optimistic concurrency and multi-row atomicity review before 100% acceptance. This fix is narrowly scoped; do not claim all order-write races are solved. No Admin backend redeployment has been verified. Owner action for Preview ORIGINALS and separate Storefront test-only DB/ORIGINALS remains necessary for safe remote QA, without authorization to integrate.
