# SinDarealest storefront icon inventory — Liquid Glass

- Target branch: `fix/liquid-glass-audit-2026-10-19`
- Source audited: `public/index.html`
- Source blob at audit: `d6415ed8dd7c2084bfeafa92bf9d9f261c38f254`
- Status: inventory/specification only; no storefront markup, CSS, JavaScript behavior, backend, API, product data, database, deployment, or PR merge changed.
- Approved visual direction: thin-stroke Liquid Glass; clear/translucent icy surface, fine bright rim and restrained refraction; pressed state sinks inward and changes icon tint; no ripple.

## Visual tokens and interaction contract

- Light surface/base: `#eaf3fb`; primary ink/icon: `#142a3c`; interaction accent: `#5c91b9`.
- Stroke: thin, consistent outline; target SVG stroke width 1.6–1.8 in a 24×24 viewBox where geometry permits; rounded line caps/joins.
- Default: dark navy stroke, clear pale glass, subtle edge highlight; do not put every icon inside a circle unless its existing control/container is circular.
- Pressed/active: blue accent stroke, subtle inward/inset shading and restrained scale-down (about 0.96–0.98 for ordinary controls; reserve 0.85 only for the existing image-lightbox interaction if that is already specified there). No ripple or expanding rings.
- Keep hover, keyboard focus, selected/current, disabled, expanded/open, and pressed states distinct. Use `:focus-visible` and preserve a visible focus ring; do not remove keyboard focus.
- Keep existing action, accessible name, element type, IDs, event handlers, URLs, state logic, responsive dimensions, and cart/favorite semantics unchanged.
- Respect reduced motion; no new dependencies, remote icon fonts, or network icon libraries. Prefer existing inline SVGs and local brand assets.
- Dark mode must preserve contrast and the same stroke geometry; use theme tokens rather than hard-coded light-only colors.
- Do not add fabricated service/brand marks. Official social logos should remain recognizable and should not be replaced with generic outline symbols.

## Inventory from `public/index.html`

### A. Header and primary navigation
1. Brand emblem image — `.brand-symbol` (brand asset, not a generic icon).
2. Search — `#searchJump`, inline magnifying glass.
3. Contact/help — `#contactJump`, speech bubble with ellipsis.
4. Cart — `#cartOpen`, basket/cart outline and count badge.
5. Theme — `#themeToggle` / `#themeIcon`, sun in light mode and moon in dark mode; preserve mode logic.
6. Menu — `#menuToggle`, three-line menu; must visually and accessibly switch to close state when menu is open if existing behavior supports it.
7. Desktop/mobile navigation links — primarily text labels; do not add decorative icons without a functional reason.
8. Mobile bottom navigation — `#mobileBottomNav`: home, products/list, cart, account, plus any additional tab rendered in the actual markup. Preserve active/current state and all existing tab behavior.

### B. Service / trust strip
9. Warranty/protection — shield-check.
10. Maintenance/time — clock.
11. Craft/detail — precision/tiles motif.
12. Handmade — tools/needlework motif.
13. Search/selection — magnifier with plus.
14. Product range/catalog — four-square grid.
15. Each icon lives in `.service-icon`; keep all six consistent and thin-stroke.

### C. Order instructions and trust commitment
16. Step 1 — choose product (`.order-icon`, currently a diamond glyph).
17. Step 2 — confirm order/customization (`.order-icon`, currently sparkle glyph).
18. Step 3 — confirmation/payment or production step (`.order-icon`, currently clock glyph).
19. Step 4 — completion/delivery (`.order-icon`, currently check glyph).
20. After-sales commitment — `.order-commitment-icon`, currently star glyph.
21. Zalo order CTA — `.order-zalo-mark` / `.order-zalo-cta`; retain recognizable Zalo branding and existing URL/action.
22. Order-details disclosure — `#orderDetailsToggle`; indicator should reflect expanded/collapsed state without changing behavior.

### D. Gallery and product detail
23. Artwork/gallery previous/next — `#artPrev` and paired slide controls.
24. Product image fullscreen — `#sdFullscreenShare`, `#sdFullscreenClose`, `#sdFullscreenPrev`, `#sdFullscreenNext`.
25. Fullscreen thumbnails — `.sd-fullscreen-thumb`, active thumbnail state.
26. Product detail close, previous/next image, image counter, share, and any generated image navigation controls.
27. Product favorite — `#detailFavorite`, heart outline and filled/selected state; keep `aria-pressed` synchronized.
28. Product add-to-cart/bag — `iconBag()` and product card/detail purchase controls.
29. Product card image navigation and quick-view/detail affordances; audit generated HTML in `productCard()` and `featuredProductCard()` before changing.
30. Dynamic product/category/fulfillment badges are not icons; do not replace text labels with ambiguous pictograms.

### E. Catalog controls
31. Search field — `#catalogSearch`, magnifier.
32. Category/filter pills — `#fulfillmentFilters` and category filters, with selected state.
33. Sort/view/pagination controls if rendered dynamically; inventory must be confirmed against runtime DOM before implementation.
34. Empty results and reset controls; use icon only where an existing action/control exists.

### F. Contact and footer
35. Six contact rows — `.footer-contacts .contact-grid .contact-link`: Zalo/phone, Facebook, Messenger, Instagram, email, map/location (verify exact row-to-mark mapping in source before editing).
36. Zalo/phone may contain text/logo rather than SVG; preserve real brand mark and phone call/message actions.
37. Contact SVGs currently use `.contact-icon svg`; align dimensions and baseline without flattening brand marks into generic glyphs.

### G. Account drawer
38. Account/avatar — `.account-avatar`, user outline.
39. Close account — `#accountClose`.
40. Account menu links — support/contact, favorites, orders, address and related navigation; currently some use text glyphs such as `◎` and `›`. Replace only after verifying the exact action and accessible label for each.
41. Favorites list controls and empty state; preserve favorite semantics.
42. Account drawer expanded/selected view indicators.

### H. Cart, checkout and overlays
43. Cart close — `#cartClose`.
44. Cart row remove/decrement/increment controls — inspect generated markup in `renderCart()`; maintain quantity and remove semantics.
45. Checkout continue arrow — `#cartCheckout` (currently text arrow).
46. Zalo consult — `#cartZalo` (currently external-link arrow).
47. Checkout close/back — `#checkoutClose`, `#checkoutBackdrop`.
48. Payment/information disclosures and status marks, if shown; do not imply payment success or add payment semantics.
49. Product overlay close and toast dismiss/status icons if present.
50. Disabled/loading/error/success states must remain semantically distinct and not rely on color alone.

### I. Global control states and implementation hotspots
- CSS icon rules include `.nav-actions .icon-btn svg`, `.service-strip .service-icon svg`, `.contact-icon svg`, `.order-icon`, and `.order-commitment-icon`.
- JavaScript icon helpers include `iconBag()`, `setThemeIcon()`, `arrowIcon()`, `productCard()`, `featuredProductCard()`, `updateDetailFavoriteButton()`, and the mobile navigation setup.
- Audit all inline SVG, textual glyphs (×, →, ↗, ›, ◎, ◇, ✧, ◷, ✓, ✦), and generated HTML before declaring the inventory exhaustive. Search `public/index.html` for `<svg`, `icon`, `aria-label`, `button`, and `data-*`-generated controls.
- Do not globally style every `svg`: some SVGs are product artwork, masks/filters, brand logos, or decorative assets rather than interactive icons.

## Implementation gate / acceptance checks

1. Re-read current branch HEAD and this inventory before implementation; do not assume the audited blob SHA is still current.
2. Build a runtime DOM list of all interactive controls and dynamically generated controls; reconcile each against sections A–I.
3. Use a shared icon style only for eligible UI icons, not logos, product images, SVG filters, or decorative art.
4. Add default, hover (where relevant), active/selected, pressed, focus-visible, disabled and reduced-motion states. Pressed state uses inset depth + tint only; no ripple.
5. Verify mobile widths 320, 360, 375, 390, 412 px and tablet/desktop 768, 1280, 1440 px; check safe areas, clipping, touch targets, labels and dark mode.
6. Run source checks/build and compare before/after screenshots on the fix preview. Do not call a test PASS without its actual output.
7. Restrict all changes to `fix/liquid-glass-audit-2026-10-19`. No merge, no production deployment, no backend/API/database/schema/data changes.


## Bổ sung yêu cầu tương tác đã chốt — 2026-10-22

Đây là phần mở rộng đặc tả; không khẳng định đã triển khai trong source.

### Trạng thái icon
- Palette: `#eaf3fb` nền kính sáng, `#142a3c` icon/chữ chính, `#5c91b9` màu nhấn; trái tim đỏ khi yêu thích.
- Nhấn: kính lún nhẹ và đổi sắc, không ripple; khi thả chỉ hiệu ứng nhấn trở về, hành động thực tế vẫn giữ.
- Heart: mặc định khi chưa thích, đỏ khi thích, trở về mặc định khi bỏ thích.
- Cart: huy hiệu phản ánh quantity thực; chỉ toast thành công sau khi thao tác add thành công.
- Search/menu/account/filter/close/gallery/quantity controls: chuyển động ngắn, có ý nghĩa chức năng; tôn trọng `prefers-reduced-motion`.

### Hiệu ứng dùng chung “fly to cart”
- Tất cả nút thêm giỏ hàng ở product card/listing, trang chi tiết và các khu vực có chức năng add đều dùng chung một cơ chế.
- Điểm xuất phát là đúng sản phẩm/ảnh tại vị trí vừa thao tác; đích là icon giỏ hàng trên header hiện hành.
- Dùng clone/overlay; không di chuyển hoặc thu nhỏ DOM gốc.
- Clone phải lấy đúng ảnh đang hiển thị/chọn (bao gồm ảnh thứ 2/mặt sau trong gallery), đúng product ID/SKU và đúng variant nếu có; tuyệt đối không dùng ảnh chung hoặc ảnh sản phẩm khác.
- Thời lượng khởi điểm 0,6–0,9 giây; cart nảy nhẹ và badge cập nhật sau khi add thành công.
- Không gọi add lần thứ hai do animation; không để animation là điều kiện hoàn tất thao tác. Xử lý nhấn nhanh, ảnh lỗi/chưa tải, scroll/resize, mobile/desktop và reduced-motion.
- Nhấn icon giỏ hàng để mở giỏ không phải thao tác add và không chạy fly-to-cart.

### Trình tự an toàn
1. Xác minh branch/HEAD/Preview/workflows và baseline trước khi sửa.
2. Đối chiếu source + runtime DOM, liệt kê toàn bộ điểm add và cách lấy ảnh/variant; không giả định inventory đã exhaustively cover runtime.
3. Kiểm tra cơ chế cart/heart/toast hiện hữu và test sẵn có.
4. Thay đổi theo lát nhỏ: icon state → heart/badge/toast → fly-to-cart dùng chung.
5. Mỗi lát chạy validation + Playwright trên Preview; xác minh ảnh đúng, quantity không trùng, trang gốc không xê dịch và responsive.
6. Cập nhật prompt/handoff/test evidence. Không merge, không deploy Production, không sửa backend/API/database/secrets/bindings/dữ liệu.

**Trạng thái:** yêu cầu/tiêu chí mới; chưa có bằng chứng code đã triển khai hoặc runtime test đã PASS.
