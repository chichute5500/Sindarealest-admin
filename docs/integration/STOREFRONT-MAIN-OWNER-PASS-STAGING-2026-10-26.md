# SinDarealest — Storefront integration from owner PASS (2026-10-26)

## Scope and provenance
- Staging branch: `integration/storefront-locked-on-main-2026-10-26`; based on Production Admin `main` commit `352121028060c503a5c4f9eece3844c6a5e6dd3f`.
- Approved Storefront source: `fix/liquid-glass-audit-2026-10-19` commit `4feacf7b9d12ec75c5009264adcab99477da5d14`.
- **Owner-PASS LOCKED**: code-only Liquid Glass HERO, desktop and mobile dark/light, Welcome first-paint no-white-panel, gallery, bidirectional scroll and 900ms full-card cart flight, along with previously approved Storefront effects. Do not redesign.
- Admin was promoted on `main`; Admin public HTML, Admin Functions and production D1/R2 are **not modified** by this staging port.
- New stage takes `public/index.html` and its matching `public/code-hero.css` plus the four light/dark SVG texture assets from the approved Storefront exact blob identities.
- Adds only proven compatibility middleware, public catalog serializer and sitemap helpers to render modern `/sanpham/{category}/{verifiedSKU-or-id}` routes; legacy `/san-pham/{key}` gets an SEO-safe redirect. Main Admin session control and new order/QR-payment routes remain preserved.
- Payment and checkout UI must remain fail-closed before Admin confirms amount and QR, using `orderAccessToken` and `/api/order-payment` from `main`.

## Gates before any merge or production promotion
1. Full `npm run check`, `npm test`, strict security/API/admin regressions **PASS on exact integration SHA**. Treat failed/skip separately.
2. No unintended modifications to `public/admin/index.html`, Admin APIs, migrations, Production workflows or deployment bindings. Main branch continues evolving: inspect merge-base/diff before any promotion.
3. Verify **isolated** non-production D1 and private R2 bindings before any combined Preview deployment or write-based browser QA. Prior storefront Preview pointed at Production DB/ORIGINALS — do not write or use it for orders/tests.
4. Capture real browser screenshots PC/mobile light/dark, Welcome first-paint and dismissal, HERO, gallery, catalog, cart animation, checkout and accessible navigation. Do not use old screenshot assets as latest evidence.
5. Test order creation, price/QR authorization and updates only with disposable fixtures on isolated D1 + R2. Avoid a real bank transfer.
6. Final owner review of the integrated site. User's PASS for individual features is preserved, but is not automatically a PASS for the integrated runtime.
7. Do not merge PR #108 wholesale (merge conflict + wrong Admin Functions). Do not merge stale PR #113 wholesale.

## Audit source references
- HERO owner PASS: `docs/handoff/HERO-CODE-ONLY-OWNER-PASS-2026-10-26.md` on source `fix`.
- Welcome verified 12/12: GitHub Actions `40270377719`.
- Main Production deploy source validated: GitHub Actions `40270047772`, check new `main` SHA before final merge.
- Backend read-only compatibility: `tests/storefront-integration-route.test.mjs`, full main payment ledger regression suite.

**State:** STAGING / NOT PRODUCTION APPROVED. Update with exact SHA, CI and deployed screenshots, keeping PASS LOCKS intact.
