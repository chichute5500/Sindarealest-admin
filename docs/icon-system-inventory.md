## VERIFIED STOREFRONT ICON-STATE CHECKPOINT — 2026-10-22

- Active source SHA: `a603c3c8f4c36efb98d604c84c24ae02d217fefa`; branch `fix/liquid-glass-audit-2026-10-19`; PR #108 remains OPEN and unmerged.
- Source + tests: [run 39681751497 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751497).
- Preview deploy: [run 39681751269 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751269).
- Live visual audit: [run 39681751457 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457); artifact [12385195509](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457/artifacts/12385195509).
- Exact Preview deployment verified at alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`, deployment ID `6d641e52-8e30-4e5a-8c29-05e1d974cce7`, environment `preview`, branch/SHA exact.
- Audit: 100 screenshots, 8/8 viewport-theme pairs, 12 route checks, section/commerce/detail coverage complete, first-paint 20/20 frames and 4/4 videos, no hard failures or console/page/HTTP/request/image/readonly errors.
- Favorite interaction states: 4/4 live contexts PASS (mobile 390×844 + desktop 1440×900, Light/Dark). Press scale 0.97 with theme-specific glass tint/inset; selected heart and SVG fill/stroke red `#E5484D`; aria/storage match; unselect returns to proper theme outline and removes storage key. Ripple code removed.
- Still pending: successful add-to-cart toast while detail view is open; shared image-accurate fly-to-cart and its badge/bounce, rapid-click, no-layout-shift, image-failure and reduced-motion tests. Partial PASS is not overall feature completion.
- No merge, Production/main, Admin code, API/backend, product data, DB/R2, bindings, secrets, DNS or Access change. Canonical screenshot archive/manifest unchanged.

---

# SinDarealest storefront icon inventory — Liquid Glass

- Target branch: `fix/liquid-glass-audit-2026-10-19`
- Source audited: `public/index.html`
- Source blob at audit: `d6415ed8dd7c2084bfeafa92bf9d9f261c38f254`
- Status: specification plus partial storefront implementation. Live-verified base icon press/favorite state PASS at exact SHA `a603c3c8f4c36efb98d604c84c24ae02d217fefa`; shared fly-to-cart and add-success/cart-toast/badge animation are not yet implementation-verified. Backend, API, product data and database were not changed.
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


## Ảnh tham chiếu chính thức của bộ icon — 2026-10-22

## Token màu và thông số Liquid Glass — giá trị triển khai đề xuất

Các giá trị dưới đây được chốt làm **baseline triển khai để AI dùng nhất quán**; chúng là thông số kỹ thuật đề xuất, không phải tuyên bố đã đo chính xác pixel từ ảnh tham chiếu. Sau khi dựng trên Preview, chỉ tinh chỉnh nếu có đối chiếu ảnh/bằng chứng.

- Tim yêu thích đang bật: `#E5484D` (đỏ ấm, đủ tương phản trên kính sáng). Chưa thích: `#142a3c`; trạng thái nhấn chưa chọn vẫn dùng accent `#5c91b9`.
- Bề mặt kính sáng: `rgba(255, 255, 255, 0.42)`.
- Viền kính: `1px solid rgba(255, 255, 255, 0.72)`.
- Nền kính có sắc xanh nhẹ khi cần: `rgba(234, 243, 251, 0.48)`.
- Blur nền: `backdrop-filter: blur(16px) saturate(145%)`; fallback khi không hỗ trợ backdrop-filter là nền `#eaf3fb` bán đặc, bảo đảm độ đọc.
- Bóng ngoài mặc định: `0 8px 24px rgba(20, 42, 60, 0.10)`.
- Highlight mép trong: `inset 0 1px 0 rgba(255, 255, 255, 0.80)`.
- Trạng thái nhấn: `transform: scale(0.97)`; bóng lún `inset 0 2px 8px rgba(20, 42, 60, 0.14)`; chuyển màu icon sang `#5c91b9`; không ripple. Thời gian chuyển trạng thái khoảng `140ms` với easing `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Nét icon SVG: stroke `1.6–1.8` trên viewBox `24×24`, linecap/linejoin `round` khi phù hợp hình gốc.
- Dark mode không dùng nguyên xi mặt kính trắng; dùng bề mặt tối trong mờ, viền trắng mờ và bóng nhẹ nhưng giữ cùng geometry/độ tương phản. Không thay đổi token sáng gốc đã chốt.
- Tôn trọng `prefers-reduced-motion`: bỏ scale/di chuyển lớn, giữ phản hồi màu/độ tương phản ngắn.
- Các trị số này là baseline thống nhất cho implementation; không được mô tả là đã triển khai hoặc test PASS trước khi có kết quả Preview/Playwright.



- `docs/icon-assets/Icon.png`: ảnh icon gốc người dùng tải lên. Đây là nguồn ưu tiên cho hình dáng, nét vẽ, tỷ lệ, màu sắc và các trạng thái gốc.
- `docs/icon-assets/Chitiet.png`: bảng tham chiếu chi tiết cho phong cách Liquid Glass, trạng thái nhấn/yêu thích/giỏ hàng và storyboard fly-to-cart.
- Phải mở và xem cả hai ảnh thực tế trước khi triển khai; không suy đoán chỉ từ tên file hoặc README.
- Khi có khác biệt: `Icon.png` quyết định hình học icon; `Chitiet.png` bổ sung hành vi/hiệu ứng. Ảnh chi tiết không cấp phép tự ý thay thiết kế gốc.
- Palette đã xác nhận: nền sáng `#eaf3fb`, nét/chữ chính `#142a3c`, màu nhấn `#5c91b9`.
- Tim yêu thích bật dùng `#E5484D`; chưa thích dùng `#142a3c`; accent khi nhấn `#5c91b9`. Baseline kính: surface `rgba(255,255,255,0.42)`, border `rgba(255,255,255,0.72)` 1px, blur `16px saturate(145%)`, shadow `0 8px 24px rgba(20,42,60,0.10)`, highlight `inset 0 1px 0 rgba(255,255,255,0.80)`. Nhấn: scale `0.97`, inset shadow `inset 0 2px 8px rgba(20,42,60,0.14)`, transition `140ms cubic-bezier(0.2,0.7,0.2,1)`, không ripple. Đây là baseline triển khai đề xuất, cần kiểm chứng trên Preview; không khẳng định đã test PASS.
- Các ảnh là tài liệu thiết kế, không tự động là asset được website tải/runtime sử dụng. Đặc tả không đồng nghĩa đã triển khai hoặc test PASS.

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


## CURRENT PROGRESS / HANDOFF OVERRIDE — 2026-10-22 10:56 ICT

- **Estimated overall completion: 82%** (estimate only, not a test result). Public storefront visual audit ~90%; favorite/icon state partially verified in earlier recorded evidence; successful add-to-cart toast/badge and shared fly-to-cart remain pending; final exact-SHA reconciliation remains pending.
- Branch HEAD observed before this documentation update: `5873920b9ef24df843bff8173ad99ae529990252`; PR #108 stays OPEN/unmerged. Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Existing handoff documents icon-state checkpoint SHA `a603c3c8f4c36efb98d604c84c24ae02d217fefa`, Validate [39681751497](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751497), Deploy [39681751269](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751269), Live audit [39681751457](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457), artifact [12385195509](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457/artifacts/12385195509). Existing record says 100 screenshots, 8/8 viewport-theme pairs, first-paint 20/20, video 4/4, no hard failures and heart states 4/4. Reconcile against actual HEAD before claiming current-SHA acceptance.
- Reference PNGs `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png` exist according to GitHub metadata, but actual visual inspection is **NOT VERIFIED**: binary blob read failed UTF-8 decoding. Render/open both images before claiming review or implementing pixel-specific icon shape. Read `docs/icon-assets/README.md`, `docs/icon-system-inventory.md`, `docs/admin-ui-reference/handoff/START-HERE.md`, `docs/admin-ui-reference/handoff/LATEST-STATUS.md`, and master prompt §XXII in documented order.
- Preserve design baseline: surface `#eaf3fb`, icon/text `#142a3c`, accent `#5c91b9`, active favorite `#E5484D`; no ripple; press feedback inset/tint around scale 0.97 and ~140ms; adapt dark mode and respect `prefers-reduced-motion`.
- Next: reconcile HEAD/workflows/deployment SHA; verify successful-add outcome, toast and real badge; then implement one shared 0.6–0.9s fly-to-cart using the exact displayed/selected image and correct item/variant. Bounce only on successful add; no duplicate quantity or layout shift. Test failed/rapid add, image error, scroll/resize, responsive/sticky target, reduced-motion; inspect actual Preview screenshots.
- Do not count commit `8afab8bfcebed3ec045b544e277e8e81acba70c3` as accepted: exact-SHA completed validation/deploy/live artifact was not verified in this session. Reconcile it with the later documented heart-state checkpoint rather than overwriting newer work.
- Hero `/images/hero-sd-gl052.png` is approved; do not return to catalog search. No Admin code, merge, Production/main, backend/API/schema/database/product data/image mapping/D1/R2/bindings/secrets/DNS/Access changes. Continue automatically; do not rerun unrelated PASS tests.
