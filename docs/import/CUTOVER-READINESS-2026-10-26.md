# SINDAREALEST — Replacement cutover readiness — 2026-10-26

## Owner requirement
Replace the old storefront product catalog with 218 newly imported products / 921 photos. Old items must not remain in the public catalog. Preserve all historical orders, customers, warranties and payment records; do not merge or deploy until a verified safe cutover is ready.

## Live verified findings
- Import audit Actions #40317900018: PASS, isolated Preview D1 contains exactly 218 imported unpublished drafts across 15 categories, referencing 921 unique optimised WebP objects, 921 originals in private R2. Both sets of 921 R2 objects were HEAD checked (200-equivalent), zero missing, zero duplicates in SKU and URLs. No imported drafts appear in public catalog. 68 of the 218 imported products have no price. The audit is aggregate-only, not a review of owner-entered individual names/prices/colors against actual source CSV.
- Production preflight Actions #40318333624: production D1 has **237** published products and 0 drafts; it has 6 historical order_items referencing products in the old catalog (5 distinct referenced product IDs). The production D1 does **not** yet contain `image_colors_json` (migration 0010 required). Preview D1 and production D1, as well as each R2 bucket, are separate.
- Main repository lacks migration 0010; dynamic 15-category filter capability is still in separate PR #119 and must be verified present in the production storefront before changing catalog.
- Nothing has been published, deleted, merged or deployed as part of this audit.

## Required safety-gated execution order
1. Verify the production storefront build can display new categories, unverified internal SKUs and products without price; deploy any required frontend/API/schema changes with explicit safeguards, independently of catalog deletion. Do not alter previously approved Hero/Welcome.
2. Create a complete verified private **restorable** production D1 backup, and capture a rollback manifest of old product IDs/rows and image references. Verify backup can be read/restored in an isolated environment; never put private order/customer data into a public repository artifact.
3. Safely migrate `image_colors_json` on production D1; retain existing historical-order linkage (archive old product snapshots rather than losing order images/metadata).
4. Transfer **all 921** display WebP objects **and 921** private originals from isolated Preview R2 buckets to production R2 buckets. Compare sizes, metadata and object checksums when available; only proceed when all referenced URLs resolve.
5. Stage 218 imported rows and verify 218 distinct IDs/SKUs, 921 image references and color associations, no published previews, category behavior PC/mobile and price-null behavior.
6. Atomic or rollback-safe catalog swap: unpublished old 237 are archived/removed from live catalog, 218 new entries published only after staging validation. Do not delete customer/order/warranty/payment data.
7. Verify public API returns exactly 218 new published products and none of old 237; exercise live product cards/deep links and category filters on PC/mobile. Roll back if required.
8. Keep old catalog backup/snapshots until owner signs off; avoid destructive deletes from backup and old R2 as part of initial cutover.

## Blockers currently open
- Production migration 0010 absent.
- Old products referenced by 6 order lines; archival/order image continuity must be protected.
- 68 new product prices are null; supported storefront fallback or owner decision required to avoid displaying wrong prices.
- Preview and Production are separate databases and buckets; neither products nor photos move automatically.
- Full restorable production backup and 921-photo transfer have not yet been completed.

## Authorized activity completed
Read-only audit and preflight only, on `audit/import-218-921-readonly-2026-10-26`. No Product URL fix resumed, no writes to import branch or production. Source evidence: [audit #40317900018](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40317900018), [preflight #40318333624](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40318333624).

## Permissions and execution checkpoint — 2026-10-26 (later)

- The full production D1 backup workflow was attempted in Actions #40319117446 but could not write to the intended private production R2 destination (Access Denied). **No backup was completed and no Production D1 row was changed.**
- A separate non-mutating permission test in Actions #40319448517 definitively found the existing `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` credentials can access Preview IMAGES and ORIGINALS, but both Production IMAGES and ORIGINALS return **403**.
- Do **not** reuse or overwrite the Preview keys. Create a separate Cloudflare R2 **Object Read & Write** token restricted to the two buckets bound to `sindarealest2` Production (`IMAGES` and `ORIGINALS`), and save its access keys as Actions secrets `R2_PRODUCTION_ACCESS_KEY_ID` and `R2_PRODUCTION_SECRET_ACCESS_KEY`. Never paste key material in chat, pull requests or code.
- Full D1 backup script `scripts/backup-production-d1-private-r2-2026-10-26.mjs` now requires separate Production credentials and is designed to export and hash-verify the SQL entirely within a private R2 object; no public backup artifact.
- Idempotent staging script `scripts/stage-imported-r2-to-production-2026-10-26.mjs` is prepared to copy and verify all 921 derivatives and 921 private originals, without touching either D1 or publishing products. It is deliberately **not triggered** until Production-scoped credentials exist. Its guarded workflow `.github/workflows/stage-imported-r2-to-production-2026-10-26.yml` only runs on the dedicated branch and an explicit trigger file.
- The backup and staging scripts passed a Node syntax CI check in Actions #40320204787. This is not proof of transfer success.
- Remaining major blockers: dedicated Production R2 rights, completed/verified private full D1 backup, production migration 0010, Product data import and atomic/rollback-safe replacement, dynamic category storefront readiness, live PC/mobile owner QA.
- The user approved the overall old-for-new catalog replacement plan; never interpret that as a request to leak credentials, bypass permission checks, or delete existing order/customer/warranty history.
