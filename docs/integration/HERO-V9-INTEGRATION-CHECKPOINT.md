# HERO V9.4 — isolated Storefront + Admin integration checkpoint

Date: 2026-10-25. This is **a staging-only follow-up**, not an authorization to merge or deploy.

## Exact scope
- Base: `integration/full-site-admin-storefront-2026-10-25`, snapshot `4df440bc9695ce07998df45bdf3abaac0317cdfd`.
- Source: `fix/liquid-glass-audit-2026-10-19`, V9.4 HEAD `3ea4c88e4c8cc9954f7754b1f6d4e7518c6e4db0`.
- Preserve the entire combined Admin + Storefront HTML, Welcome overlay, product handling, payment/QR, and migrations; insert only the `<picture>` element and append V9.4 reference-art CSS.
- Desktop and mobile WebP art reused byte-for-byte from the approved Storefront source:
  - Desktop WebP blob: `6e6ca2c6aaac2303813a5ff30c8a208ef6c4727b`, natural dimensions 1779 × 884.
  - Mobile WebP blob: `e27dcad936f06268858b8be994d4f8fdb33cd970`, natural dimensions 960 × 477.
- Keep the source shoe PNG `c17cc9058ae3008dc662806d21d2cf8f7d83b8a9` unchanged. Keep approved pedestal `25230efbf4d3c9457dc36ce91b75fbf60f56d157` unchanged.
- The visible hero typography and shoe image are baked into the WebP artwork; semantic h1 and description are visually hidden; a transparent, focusable, keyboard-accessible `#products` CTA overlays the rendered button.

## Prior evidence (source branch only, **not** combined Preview)
Pre-existing Chromium screenshot evidence of the source branch at V9.4 includes desktop 1280/1365/1440px, tablet 768px, mobile 360/390px, phone-desktop-mode 980px, both light and dark. Those captures do **not** prove the combined branch passes in a deployed browser.

## Safe verification gates
1. Staging branch CI must PASS the no-deploy integration scope, Admin commerce, Storefront references, and Hero V9 contract.
2. Combined-source browser test PC 1440/1280, tablet 768, phone 390/360, 980 desktop-mode, light/dark; screenshot-compare exact reference assets and validate CTA hitboxes and keyboard navigation.
3. Confirm combined Cloudflare Preview environment's D1/R2 bindings are isolated from Production **before deployment**, then do isolated Preview tests if available.
4. Separate Admin approval and explicit owner sign-off before any merge/deploy. PR #108 is conflicted/mixed-scope and must not be merged whole.

## Important
This change does not merge PR #108, deploy a preview, publish Production, or modify Admin runtime.
