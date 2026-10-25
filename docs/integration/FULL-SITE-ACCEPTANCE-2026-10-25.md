# SINDAREALEST — FULL-SITE ADMIN + STOREFRONT INTEGRATION CHECKPOINT
**Date:** 2026-10-25  
**State:** SOURCE & CI PASS — NOT LIVE-PREVIEW / PRODUCTION ACCEPTED.

## Source provenance
- Repository: `chichute5500/Sindarealest-admin`.
- Isolated working branch: `integration/full-site-admin-storefront-2026-10-25`.
- Base: Admin accepted branch `feature/admin-isolated-handoff-2026-10-20` at `777988063adabc3fac3796468f2ab0f77c5606ed`.
- Original Storefront acceptance runtime SHA `c23649de31e5bfe9ed0eaa2aaa3a1bb769a9ad84`; separate clean Storefront staging validation commit `a40d257dad948e9e030e1116f14e3f014b3b88ef`.
- Combined source and no-deploy validation SHA **`3f309c4386dd4d2f78328fb90a872308d82d26f9`**.
- Source Storefront `public/index.html` blob SHA `a9d65d5732301bb774e729fee266ff173c6c46fe`, identical to approved source.
- Original Hero PNG blob SHA `c17cc9058ae3008dc662806d21d2cf8f7d83b8a9`, and approved pedestal blob SHA `25230efbf4d3c9457dc36ce91b75fbf60f56d157`. No visual rewrite.
- `main`, PR #108, PR #111, original Admin branch and original Storefront branch were not modified.

## Actual checks — both independently PASS at exact source SHA
- [Validate source and tests #40181566797](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40181566797) — **PASS**: strict dependency audit; npm run check; entire Admin + Storefront configured npm test suite.
- [Full Site Admin + Storefront integration acceptance #40181566875](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40181566875) — **3/3 PASS**:
  - SHA/scope guard: approved Hero/UI byte-for-byte and `public/admin/index.html`, `functions/_lib.js`, `functions/api/orders.js`, `functions/api/admin/products.js`, `migrations/0008_product_sku_verification.sql` identical to Admin baseline.
  - Accepted desktop/mobile UI, Gallery, category route, SKU and accessibility contract scripts.
  - Admin order, fulfillment, payment ledger, QR upload/activation and order immutability regressions. No remote writes.
- The separately staged Storefront-only branch passed both full Validate and six isolated checks on `a40d257...`.

## Compatibility work completed
- Added `functions/_storefront-route.js`: canonical `/sanpham/{category}/{verified-SKU-or-immutable-ID}`, matching eight accepted browser category aliases. Legacy `/san-pham/{key}` redirects to its canonical destination; SEO schema.org withholds unverified SKU.
- `functions/_middleware.js` and `functions/sitemap.xml.js`: accept existing schema with optional `sku_verified`; when absent, canonical path falls back to internal ID. Preview sitemap marked noindex.
- `functions/api/products.js` adds explicit fail-closed SKU visibility guard on top of Admin's existing serializer. Retains Admin's fulfillment filtering, price-visibility and stock-protection semantics.
- Updated legacy Storefront-only contract expectations, keeping the accepted Hero/Glass/Gallery content and all Admin runtime untouched.
- Dependency `undici:7.30.1` is inherited from current Admin base, strict audit PASS; do not regress pinning.

## What is **NOT** yet validated or approved
1. No deployment of this combined source SHA to an isolated Cloudflare Pages Preview. Prior individual Storefront/Admin Preview PASS cannot replace combined Preview acceptance.
2. No verified live Preview D1 state for migration 0008, `sku_verified`, fulfillment fields, payment QR and persisted order details. Do not execute migrations or change Production D1 on this basis.
3. No verified full mobile + desktop browser screens of this *combined* SHA in both light and dark modes, purchase/QR flows and Admin/Storefront cross-app navigation. The accepted source/UI hashes and tests do not alone establish visual runtime parity.
4. Separate Admin PR #111 and original Storefront PR #108 remain open. #108 is mixed-scope/dirty, and must NOT be merged wholesale. No Production/main merge has been attempted.
5. A dedicated preview should be deployed only after proving it uses a non-Production D1/QR environment. Validate bindings before any real write test.

## Next owner-safe sequence
1. Verify Cloudflare **Preview** resource bindings are isolated (not Production D1/R2), then deploy only this exact tested SHA to a new Preview branch.
2. Run screenshots and browser-based QA for PC/mobile, light/dark, Hero/pedestal, Gallery, category filters, 900ms full-card cart animation and Admin flows.
3. On a disposable Preview database, verify/apply approved schema migrations and run isolated end-to-end test order, payment QR, inventory, Admin acknowledgment and rollback; do not touch Production data.
4. Review the draft integration PR **against Admin feature branch** (not against main) for scoped changes.
5. Merge only after explicit owner approval and all Preview/CI checklists PASS.
