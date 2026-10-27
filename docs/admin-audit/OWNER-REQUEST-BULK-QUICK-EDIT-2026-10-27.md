# SINDAREALEST ADMIN — Owner request: bulk made-to-order + inline cards + touch reorder (2026-10-27)

## Owner instructions (authoritative)
1. **Direct one-time conversion by assistant**, not a button for Owner: classify every existing product as `made_to_order` / “Hàng đặt riêng”. Products remain individually reversible to `in_stock` or `unclassified`; do **not** force future new products to made-to-order. Preserve all other fields, old orders, D1 schema and R2.
2. Admin product-list tap fulfillment chip (“Chưa phân loại”/“Hàng đặt riêng”), product category and price to quick-edit each field; tap the cover to enter the **Gallery editor** (not immediate file replacement); tap blank area/title of the card to enter regular Details editor. Save without overwriting unrelated fields.
3. Admin gallery is photo-only (no arrows, individual bins, old upload drop area or grip handle). Drag anywhere on photo to INSERT it in a target slot (PC and mobile); the others shift. Hold photo stationary to show full-screen enlarged preview, releasing to dismiss; dragging ends the preview. Drag photo onto the single small bottom bin to remove it from the **unsaved draft**; Save persists, Cancel discards the change. Keyboard: arrows/Home/End move focused photo; Delete removes it from draft.

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
- `public/admin/index.html`: list card image opens Gallery tab; blank card opens Details; category, fulfillment and price remain individually editable. Whole-photo unified Pointer Events for Android and desktop, hold-to-enlarge then release-to-dismiss, drag-to-reorder with splice insert/shift, and one bottom drag-to-trash zone. The existing Gallery “Thêm ảnh” and Save pipeline remain, so existing WebP/private originals behavior is preserved. One Owner-approved CSS block retained.
- `tests/admin-product-quick-edit.test.mjs`: in-memory SQLite tests of field preservation, permissions, reverse changes, conflict and photo order.
- `package.json` adds test command.
- Isolated Admin Preview: https://owner-admin-quickedit-1027.sindarealest-admin-preview.pages.dev/admin/
- Preview workflow: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40544105841 **SUCCESS**; verified isolated Preview D1 and R2 bindings.
- Owner HAS NOT YET PASSed the inline Admin UI or image reorder; **do not merge these code changes to main before Owner approval.**

## Acceptance checklist
- Mobile 390 px: tap type chip, choose Hàng có sẵn; save only that product and field. Same for category and price. Tap cover: open Gallery editor without choosing a file. Tap blank card: open Details editor without hitting the pen.
- Mobile Gallery: drag image #3 to #1, should show #3,#1,#2 (not swap); long-hold should enlarge until release; drag image to the bottom bin to remove from the pending gallery; Cancel leaves server unchanged, Save persists reorder/removal.
- Desktop gallery: drag photo itself (no grip or controls) to reorder or to the bottom trash; keyboard fallback Arrow/Home/End/Delete available.
- Existing Home/Storefront, checkout, orders, warranty, Admin 12-screen Owner-PASS remain untouched.
