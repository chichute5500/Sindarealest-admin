# SINDAREALEST ADMIN — Owner request: bulk made-to-order + inline cards + touch reorder (2026-10-27)

## Owner instructions (authoritative)
1. **Direct one-time conversion by assistant**, not a button for Owner: classify every existing product as `made_to_order` / “Hàng đặt riêng”. Products remain individually reversible to `in_stock` or `unclassified`; do **not** force future new products to made-to-order. Preserve all other fields, old orders, D1 schema and R2.
2. Admin product-list tap directly on fulfillment chip (“Chưa phân loại”/“Hàng đặt riêng”), price, cover image; also product category name. Save individually without overwriting unrelated fields.
3. Admin product-editor gallery can insert an image into any slot by dragging (Android touch grip + existing desktop drag), shifting others back one position; Save persists the new order and cover.

## Production ONE-TIME D1 conversion — COMPLETED AND VERIFIED
- GitHub Actions: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40543838980 **SUCCESS**.
- Exact Production Pages project `sindarealest2`, Production D1 UUID `f6c208a1-052a-445c-a3b7-a442783f9bd3` were verified first.
- Preflight **217 existing rows**; **214 needed change**, 3 already `made_to_order`.
- Postflight **217/217 products `made_to_order`**. No price, images, SKU, visibility, order_items, orders or R2 change.
- Original `(id, sku, fulfillment_type)` preimage was saved as short-lived private Actions artifact **before any write** (1-day retention). An idempotence marker is saved in D1 settings.
- One-shot workflow and temporary mutation script were subsequently removed from feature branch: **DO NOT RE-RUN**. Individual Admin edits remain allowed; future products retain pre-existing default.

## Feature code pending Owner review
- Branch `feature/admin-inline-edit-photo-drag-preorder-2026-10-27` based on last known Production `main` commit `c7b55e46c57e08e4da9f015b964be8fb68ff2c0b`.
- `functions/api/admin/products/[id].js`: Admin-authenticated `PATCH` of one allowlisted field (fulfillmentType, category, price, images). Optimistic CAS based on original field prevents stale updates; audit only on effective successful update; 409 conflicts. Existing full PUT and delete unchanged.
- `public/admin/index.html`: direct card controls on both PC and mobile; cover change through existing authenticated WebP upload, preserving other photos and private originals; image gallery pointer-event grip for mobile and native drag on desktop, splice insert/shift; one retained Owner-approved CSS block.
- `tests/admin-product-quick-edit.test.mjs`: in-memory SQLite tests of field preservation, permissions, reverse changes, conflict and photo order.
- `package.json` adds test command.
- Isolated Admin Preview: https://owner-admin-quickedit-1027.sindarealest-admin-preview.pages.dev/admin/
- Preview workflow: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40544105841 **SUCCESS**; verified isolated Preview D1 and R2 bindings.
- Owner HAS NOT YET PASSed the inline Admin UI or image reorder; **do not merge these code changes to main before Owner approval.**

## Acceptance checklist
- Mobile 390 px: tap type chip, choose Hàng có sẵn; save only that product and field. Same for category, price, cover.
- Mobile Gallery: drag image #3 to #1, should show #3,#1,#2 (not swap); Save, reopen, order persists.
- Desktop gallery existing drag/drop still works.
- Existing Home/Storefront, checkout, orders, warranty, Admin 12-screen Owner-PASS remain untouched.
