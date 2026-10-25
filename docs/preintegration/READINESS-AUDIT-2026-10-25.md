# SinDarealest — PRE-INTEGRATION AUDIT (DO NOT MERGE/DEPLOY)

Audit date: **2026-10-25**. Status: **BLOCKED — 100% acceptance NOT earned**.

Scope explicitly approved: READ-ONLY investigation of Admin isolated Preview versus Storefront experimental Preview. **No source merge, no combined deployment, no live business writes, no D1 migrations, and no R2 object operations.**

## Exact source identities / CI
- Admin branch: `feature/admin-isolated-handoff-2026-10-20` (PR #111), audited starting at `c64e07fca248dc527361c4d018dc26c11f5b3570` and read-only metadata-audit code at `5c2a0b07fff27cca42a3941a75e20a805a88107e`.
- Storefront experimental branch: `fix/liquid-glass-audit-2026-10-19` (PR #108), `7558ab4cdc329b7b3786a37e20a3c3eca5e9eaa4`.
- Production `main` at audit start: `227622d3e3b7c75724ffa1775b193da71089269a`. PRs OPEN and not merged.
- Admin commit `c64e07f` had 7/7 green GitHub workflows; Storefront `7558ab4` had independent validate/Preview deploy/Hero/gallery PASS. **These are not a combined integration test.**
- Admin 12-screen approved-reference rubric still **0/12 signed off, 32/100 evidence-weight, NOT project completion percentage**. Capturing 72 screenshots and passing functional assertions is not design acceptance.

## Critical live Cloudflare configuration evidence

Read-only Actions preflight [#40166237135](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40166237135) used Cloudflare Pages project metadata. It made **zero** deployments, D1 queries/writes or R2 object operations; secret binding identifiers were not logged.

| Binding or resource | Observed relationship | Decision |
| --- | --- | --- |
| Admin Preview `DB` | Different from storefront Production D1 | PASS isolation |
| Storefront Preview `DB` | **Same ID as storefront Production D1** | **P0 BLOCKER: no Preview write QA, no integration** |
| Admin Preview `IMAGES` | Different from storefront Production IMAGES and ORIGINALS | PASS isolation |
| Storefront Preview `IMAGES` | **Same non-Production R2 bucket as Admin Preview IMAGES** | PASS cross-Preview public gallery storage identity, but does NOT prove full gallery behavior |
| Admin Preview `ORIGINALS` | **Binding absent** | **P0 BLOCKER: product original uploads and warranty image uploads cannot be tested; routes fail closed** |
| Storefront Preview `ORIGINALS` | **Same R2 bucket as storefront Production ORIGINALS** | **P0 BLOCKER: never upload warranty/private images from experimental site** |

Expected remediation (owner/cloud configuration only, no Production modifications): create or choose a **dedicated isolated D1 for Storefront Preview**, bind `DB` only to that isolated D1; make `ORIGINALS` a separate **private non-Production R2 bucket** in **both** Preview projects (must never be `IMAGES` or Production ORIGINALS); retain the current isolated shared Preview `IMAGES` relationship when approved; confirm full schema/migration compatibility in disposable databases, then redeploy each **Preview only**. Do not copy real customer/order/financial data. Re-run read-only preflight **before any write QA**. Never try to fix this by pointing Admin Preview at Production D1.

## Source-code contract drift — verified from branch-specific files

The two branches diverge at **20 `functions/` files**, migration `0009_fulfillment_and_manual_payments.sql` and both `public/index.html` (Admin 163,201 characters vs Storefront 414,132; Git tree also contains many independent assets and docs). Never overwrite Storefront Hero/visual product code with Admin's older `public/index.html` nor overwrite Admin API changes with Storefront's older Functions.

| Contract | Admin branch | Storefront branch | Integration consequence |
| --- | --- | --- | --- |
| `migrations/0009_fulfillment_and_manual_payments.sql` | Present: `fulfillment_type`, `payment_terms_confirmed_at`, order access token hash and manual payment ledger/request tables | **Missing** | Schema must be staged and checked on an isolated test DB before any cross-environment execution |
| `functions/api/products.js` | Filters by fulfillment type and serializes field | Old variant without the fulfillment filter | Product availability/filter UI can disagree |
| `functions/api/orders.js` | Persists token hash, order item fulfillment, returns `orderAccessToken` | Returns order number but **not `orderAccessToken`** | Storefront UI's local order history does not get token needed for payment status |
| `functions/api/order-payment.js` | Present, token-authenticated order payment-status GET | **Missing** | Storefront `public/index.html` calls `/api/order-payment`; it cannot be served by this branch as built |
| `functions/api/payment-settings.js` and `functions/payment-qr/[key].js` | Present | **Missing** | QR payment readiness/public image access not available on Storefront Preview |
| `functions/api/admin/products/[id].js` | UPDATE writes `fulfillment_type` | Old SQL without it | Saving a product from the old endpoint would not preserve new fulfillment classification |
| `functions/api/admin/backup.js`, `restore.js` | Include new payment/order data structures | Old variant | Backup/restore parity and reversibility not yet proved |
| `functions/api/admin/payment-qr*.js` and `payment-transactions.js` | New manual payment functionality | Missing | Cannot treat settlement/refund as integrated |
| Logo/branding | Official SD emblem unfiltered on current Admin branch | Storefront has separately approved Hero look | Preserve brand asset and owner's design approval on both |

Static comparison does not prove specific runtime 404 on an Access-protected Preview; no destructive live endpoint probing performed. Unsupported compatibility is considered NOT VERIFIED, never implicitly PASS.

## Acceptance gates before owner may authorize integration

Every gate requires linked evidence, with no exemptions or percentage rounding:

1. [ ] Cloudflare: both Preview D1 bindings are **not** Production D1 and intentionally mapped for the planned architecture (shared isolated D1 OR explicitly implemented/tested sync).
2. [ ] Cloudflare: Preview `IMAGES` and **private** `ORIGINALS` bindings are independent of Production and private/public buckets separated.
3. [ ] DB: schema `0001…0009` migration checksum, ordered application, backup/rollback and foreign-key integrity verified on fresh isolated D1 (do not run on Production).
4. [ ] Code contract: one agreed API model for product shape/category/sku/fulfillment/visibility/pricing and both consumers/producers tested.
5. [ ] Orders: checkout token issuance, durable snapshot, price confirmation, cancellation, order lookup and ownership/isolation end-to-end tested using synthetic data only.
6. [ ] Payments: QR pending/activation, authorized read-back, provider-independent manual receipt, refunds, replay protection and no real money movement.
7. [ ] Media: 6 real gallery images, product WebP derivative and private original upload/read, watermark, permissions, nonexistent object behavior, Preview-owned R2 cleanup.
8. [ ] Warranty: issuance, claim, attachment upload/access private ownership, status change and idempotency validated on isolated environment.
9. [ ] Backup and Restore V2: export/import/rollback through **real isolated D1**, integrity of new payment tables and auditable changes, fully cleaned.
10. [ ] Security: authentication/session/CSRF/abuse protection, rate limiting, XSS, unsafe URLs, secrets, cross-project isolation and authorization independently reviewed.
11. [ ] UX: approved brand/Logo unchanged, mobile 320/360/375/390/412 and desktop 1280/1440; light/dark; keyboard and screen-reader accessibility, error/loading/empty states.
12. [ ] Design: each of the 12 Admin reference screens compared against the approved design with same data/state and owner grants explicit visual acceptance.
13. [ ] Combined artifact: test a merge candidate **only on a new disposable test branch** after all read-only gates are green, with a file-by-file conflict review; no Production deploy.
14. [ ] Evidence hygiene: reproducible source SHA and deployed SHA, screenshots/reports, no real data or credential exposure, run-owned synthetic record/object cleanup twice verified.
15. [ ] Explicit owner approval for merge/production; otherwise retain both OPEN PRs.

No gate becomes PASS merely because an independent CI run is green. **Current overall integration readiness: BLOCKED**.

## Safe next action

Owner-only Cloudflare steps are needed to separate the experimental storefront `DB` and `ORIGINALS` from Production and add Admin Preview's separate `ORIGINALS`. Until proven, perform only read-only checks on storefront Preview; continue non-destructive local/static contract tests and screenshot reviews separately. **Do not combine, merge or deploy integration yet.**
