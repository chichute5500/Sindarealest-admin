# SINDAREALEST — HANDOFF LATEST / LIQUID GLASS SOFT INSET 3D — OWNER CHƯA PASS

**Ngày bàn giao:** 2026-10-30 (Asia/Ho_Chi_Minh)  
**Trạng thái quyết định:** **OWNER CHƯA PASS / NOT READY TO MERGE**. Không gọi "hoàn tất" chỉ vì CI xanh.  
**Mục tiêu:** Tiếp tục sửa thật trên GitHub, không viết prompt/CSS mẫu hoặc dựng demo.

## 0. Xác minh nguồn thật trước mỗi thay đổi

- Repository: `chichute5500/Sindarealest-admin`
- **Nhánh duy nhất được tiếp tục sửa:** `feat/soft-neumorphic-controls-2026-10-29`
- PR: [#152](https://github.com/chichute5500/Sindarealest-admin/pull/152) — **OPEN / DRAFT**, base `feat/zalo-customer-login-2026-10-29`, không phải `main`. Mã nguồn phụ thuộc Customer Login PR #150; **không tự merge cả hai PR**.
- **Code HEAD được xác minh trước commit tài liệu bàn giao:** `a9ae91105d4178ffb636d88155f604d6d2103cad`. Việc tạo hai file handoff này làm HEAD nhánh tiến lên; **luôn đọc GitHub HEAD thực tế** rồi đối chiếu lịch sử. Không checkout/ghi đè theo SHA cũ, không cherry-pick nhầm.
- Build **bất biến gần nhất đã chạy Browser QA cho code HEAD trên**: https://57d129a5.sindarealest-admin-preview.pages.dev/
- Alias Preview có thể thay đổi theo deployment: https://soft-neumorphism-1029.sindarealest-admin-preview.pages.dev/
- Project deploy Preview: `sindarealest-admin-preview`, **khác Production Storefront** `sindarealest2`. Trước mọi lần deploy bắt buộc xác minh D1/R2 isolation read-only theo workflow.
- Kết quả **kỹ thuật**, không phải nghiệm thu thẩm mỹ: [CI PASS run #40918071404](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40918071404); [isolated Preview + Playwright 8/8 PASS run #40918071445](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40918071445). Chỉ áp dụng cho code SHA nêu trên. Browser QA sử dụng Chrome / touch emulation, **không phải Android thật**.
- GitHub Actions artifact `soft-glass-controls-a9ae91105d4178ffb636d88155f604d6d2103cad` thuộc run #40918071445 (artifact retention 14 ngày; tải về khi còn hiệu lực); bao gồm screenshot và test evidence. Không coi artifact cũ là bằng chứng cho commit mới.

## 1. Quyết định Owner mới nhất, quan trọng hơn CI

Owner đã nhìn hình tham chiếu `84896.jpg` và ảnh chụp Preview thực tế `84903.jpg` và **tuyên bố CHƯA PASS**. Nếu ảnh không tự hiện trong chat mới, yêu cầu người dùng đính kèm lại hai ảnh, nhưng **vẫn tiếp tục audit source/test** thay vì bỏ dở việc.

**Vật liệu mẫu:** Soft Inset 3D Glass, không phải opaque soft-plastic/soft-rubber Neumorphism, cũng không phải luminous neon outline.

Lỗi bản trước và ngay cả sau những đợt sửa:
1. Lòng kính có xu hướng mờ đục/hơi tối, phồng như đệm cao su.
2. Các chip/category, search có thể thấy nhiều vòng đồng tâm từ border + box-shadow + pseudo-layer.
3. Mép chưa diễn đạt một khối kính cong liền mạch, độ dày quang học chưa thuyết phục.
4. Phản quang pastel bị quá yếu hoặc thành outline: **hồng/tím rất nhẹ phía trên trái, xanh lam phía phải, xanh ngọc phía dưới**, phải bám hướng ánh sáng trên mép cong, không gradient neon khép kín.
5. Bóng tiếp xúc, ambient và inner recess cần được cân bằng, không tăng thêm inset/outside shadow để che sai hình khối.
6. Nền gợn sóng đã Owner PASS: **giữ nền**, chỉ điều chỉnh cách vật liệu tương quan với nền.
7. Nút search, category chip, icon tròn, top nav, bottom nav, size, CTA, cart, account phải dùng **cùng ngôn ngữ quang học nhưng các biến thể độ sâu riêng theo chức năng**.
8. Press: touch/hold chuyển contact -> inner recess + thay ánh mép; release êm (nhấn ~100–150 ms, nhả ~200–280 ms), không chỉ scale; phải test không kẹt sau scroll/cancel.

**Không** tự tuyên bố Owner PASS hoặc đưa lên Main.

## 2. Những phần đã thực hiện / không làm lại

Qua nhiều lần refactor trên PR #152 đã có:
- Đổi bề mặt icon/menu/search, catalog category chips, top/bottom nav sang token dùng chung; có hover, selected, focus-visible, reduced-motion.
- Xử lý selected-state CSS specificity ở Dark Mode; hỗ trợ press touch giữ bằng `data-sd-glass-press` và controller, release qua pointer/touch cancel/end, scroll, blur.
- Chuẩn hóa lớp trình bày của product option/size, CTA xanh/cam, cart, checkout, account, vẫn bảo toàn logic.
- Mới nhất tại code SHA `a9ae91105d4178ffb636d88155f604d6d2103cad`: chuyển `--sd-3d-rim` sang radial phản quang theo hướng, tăng độ trong của `--sd-3d-surface`, search dùng `--sd-3d-surface-search`, bevel dùng `--sd-3d-bevel`; Chrome QA 8/8 xanh. **Chưa đủ để Owner PASS** vì cảm giác vật liệu vẫn chưa đạt hình mẫu; không chỉ thay màu thêm một lần nữa.

**Giữ nguyên các chức năng/thiết kế đã Owner PASS:**
- Hero, Welcome một lần / reload, Gallery, nền gợn Liquid Glass xanh nhạt, theme sáng/tối ưu tiên device, hiệu ứng chuyển theme, favicon và social preview.
- 15 danh mục thật, dữ liệu sản phẩm, SKU tự động, trạng thái hàng đặt riêng, lựa chọn size/màu hiện có, ảnh, URL deep link, yêu thích, tìm kiếm, lọc danh mục, giỏ hàng, QR checkout, nút mua xanh/cam, tracking 6 bước, bảo hành, Admin và login customer.
- Thanh header và bottom nav giữ bố cục 4 tab, badge giỏ hàng, logo, icon, nhãn và vùng bấm.
- Không thay đổi API/backend/D1/R2, không xóa các nhánh khác, không merge main hoặc PR #150/#152.

## 3. Vị trí source và các nguyên nhân cần điều tra

**Trọng tâm:** `public/index.html` (lớn, có nhiều vùng CSS; tránh thêm patch ở đuôi file).

- `<style id="sd-unified-icon-system-final">`: `--sd-3d-shadow`, `--sd-3d-depressed`, `--sd-3d-selected`, `--sd-3d-rim`, `--sd-3d-surface`, `--sd-3d-surface-search`, `--sd-3d-bevel`, `--sd-3d-bevel-pressed`, `--sd-3d-tray`; icon/nav/cart/button variants.
- Catalog CSS cạnh comment `SINDAREALEST soft-inset material`: `#products .search-field`, `#products .filter-pill`, `#products .filter-pill.active`, pseudo `::after`, touch selectors, responsive breakpoints. Lưu ý các CSS catalog và icon material có thể ở 2 style blocks khác nhau; kiểm tra actual cascade và computed styles trong trình duyệt. **Không tạo thêm lớp override** nếu cần thay đổi cốt lõi.
- `#mobileBottomNav .mobile-tab`, `.mobile-bottom-nav` (tray khác control), `.nav-wrap .nav`, `.icon-btn`.
- `#productOverlay .sd-product-option-chip`, `.detail-actions .detail-purchase-button`, `.detail-buy-now`, `.qty-controls`, `.pill-btn`, `.sd-checkout-option`.
- `public/customer-auth.css` cho nút Google/Account, có fallback token.
- `<script id="sd-glass-touch-press-controller">` điều khiển trạng thái hold. Giữ những nhánh release; không can thiệp business event hoặc `preventDefault`.
- Tránh `backdrop-filter` cho quá nhiều tầng; ưu tiên gradient/optical highlights vừa đủ trên Android.
- Đặc biệt: `scripts/audit-css-cascade.mjs` đòi tài liệu HTML cuối có `</style></body></html>` theo quy tắc cấu trúc, **đừng chèn script trước `</body>` sau stylesheet cuối**; touch controller đã chuyển lên trước style cuối sau lần fail.
- Trước đó test CSS có regex cố định cho gradient cũ; nếu kiến trúc material thay đổi hợp lý, sửa contract test mô tả ý định Owner, không vô hiệu hóa test.

**Kiểm thử liên quan:**
- `.github/workflows/qa-soft-glass-controls.yml` — isolated Preview, `npm run check`, `npm test`, contract test, Playwright 360x800, 390x844, 768x1024, 1440x900 sáng/tối.
- `tests/soft-glass-controls-contract.test.mjs`, `tests/product-card-liquid-glass.test.mjs`, `tests/dynamic-product-categories.test.mjs`, `tests/e2e/soft-glass-controls.spec.js`.
- `playwright.owner-gesture.config.js`; screenshot output `artifacts/soft-glass-controls/`.
- Cần thêm kiểm tra ảnh crop **cùng vị trí cùng viewport** cho chip "Tất cả", search, icon tròn, bottom nav, không chỉ screenshot full-page. Với ảnh `84896.jpg`, đối chiếu vật liệu chứ không ép pixel-perfect layout khác ngữ cảnh. Test chạm giữ/thả, selected, focus, light/dark, giảm motion.
- Android thật: chưa được xác minh; không claim PASS điện thoại thật.

## 4. Quy trình đề xuất cho chat tiếp theo

1. Fetch GitHub PR #152 HEAD và source, đọc file handoff + prompt này, đọc quyết định Owner mới nhất ở cuộc trò chuyện. Đối chiếu `main` chỉ read-only; chỉ commit đúng nhánh.
2. Inspect CSS computed values và các layer ngoài/inside, background-clip, pseudo-element, overflow, border-radius, stacking, multi-shadow. Xác định phần tạo nhựa/đệm, vòng viền kép, reflective edge kém tự nhiên; có bằng chứng chụp ảnh.
3. **Thử một biến thể chủ đạo trên category chip trước**; bề mặt trung tâm bán trong suốt nhẹ, một mép cong phản quang hướng sáng, một lõm nhẹ, bóng tiếp xúc mềm. Không tăng opacity và nhiều inset để che.
4. Sau khi chip đạt trực quan gần mẫu, dùng tokens có biến thể search/icon/tray/selected và áp dụng đồng nhất; giữ geometry.
5. Check source/tests/build; deploy chỉ lên `sindarealest-admin-preview` theo workflow, kiểm tra 8 viewport/theme và CDP Touch, không phát sinh dữ liệu Production.
6. Chụp ảnh so sánh BEFORE vs AFTER chính xác cùng viewport, crop bốn control, đưa immutable Preview URL và report test chính xác. **Chờ Owner nghiệm thu; không tự PASS.**

## 5. Báo cáo cuối được yêu cầu

- Branch, HEAD code trước/sau, PR DRAFT, file thay đổi và vai trò.
- Tách bạch: nguồn code, CI, Browser QA, cloud Preview, so sánh hình, Android thật, Owner visual PASS.
- Bằng chứng ảnh: chip/search/icon/bottom nav ở Light/Dark và trạng thái rest/pressed/released.
- Link immutable Preview của **đúng HEAD mới kiểm**, không lấy ảnh/alias cũ để thay bằng chứng.
- Nếu bất kỳ gate nào chưa đạt, ghi FAIL rõ và tiếp tục xử lý trong cùng phạm vi.
- Không gọi chương trình hoàn thành khi Owner đang **CHƯA PASS**.

## 6. Handoff continuation

**Prompt tiếp tục:** `docs/audit/PROMPT-NEXT-CHAT-2026-10-30-SOFT-INSET-GLASS-OWNER-NOT-PASS.md`.  
Tài liệu này ghi lại **code HEAD trước các commit tài liệu** là `a9ae91105d4178ffb636d88155f604d6d2103cad`; khi đọc tài liệu trong chat mới hãy luôn xác minh HEAD mới nhất GitHub. **Nếu chỉ thấy 2 commit docs sau code HEAD, chúng không phải thay đổi giao diện và không cần redo các hạng mục đã PASS**.
