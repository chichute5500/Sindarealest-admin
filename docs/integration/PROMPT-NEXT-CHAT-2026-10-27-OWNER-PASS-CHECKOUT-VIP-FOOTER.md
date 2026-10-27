# PROMPT NEXT CHAT — SINDAREALEST · OWNER PASS 27/10/2026

Tiếp tục trực tiếp dự án **SinDarealest** trên GitHub, **KHÔNG bắt đầu lại, KHÔNG hỏi lại lịch sử và KHÔNG sửa lại các phần Owner đã PASS**.

## 1. Định danh / trạng thái mới nhất

- **Repository:** `chichute5500/Sindarealest-admin`
- **Nhánh DUY NHẤT được phép chỉnh sửa:** `integration/storefront-locked-on-main-2026-10-26`
- **Pull Request #118:** https://github.com/chichute5500/Sindarealest-admin/pull/118 — **OPEN / DRAFT / chưa merge** ở thời điểm bàn giao.
- **CODE SHA mới nhất đã Owner PASS:** `72b3bbec1a3ef822e6c20df1a8bd06818e73428a`.
- **Actions đúng code SHA:** https://github.com/chichute5500/Sindarealest-admin/actions/runs/40429890684 — **SUCCESS 3/3 jobs**, gồm D1/R2 Preview separation, Chromium PC/Mobile sáng/tối, checkout → Shop trên môi trường QA cách ly.
- **Preview:** https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
- Sau SHA code trên đã có commit tài liệu bàn giao. **Đọc HEAD thực tế** để phân biệt docs-only SHA và code đã PASS. Không lấy checkpoint cũ thay thế checkpoint này.
- **Source of truth PHẢI ĐỌC TOÀN BỘ:** `docs/integration/HANDOFF-LATEST-2026-10-27-OWNER-PASS-CHECKOUT-VIP-FOOTER.md` và chính file prompt này. Những tài liệu có tên PRODUCT-DETAIL ngày 27/10 hoặc tài liệu ngày 26/10 chỉ còn là lịch sử nếu có thông tin mâu thuẫn.

## 2. Những phần Owner đã PASS — khóa giao diện/chức năng

**Footer giới thiệu (vừa PASS ngay trước khi chuyển chat, rất quan trọng):** MOBILE logo SinDarealest nằm **BÊN TRÁI**, bỏ ô nền/viền riêng, lớn vừa phải; ở **BÊN PHẢI** logo có **ĐÚNG HAI DÒNG** theo chiều dọc: dòng 1 `PREMIUM CROCODILE LEATHER FASHION`, dòng 2 `Giá trị nằm trong từng chi tiết.`. Mỗi câu chỉ **MỘT HÀNG NGANG** trong cột chữ, không xuống dòng, không tràn ngang; **KHÔNG đưa dòng tiếng Việt thành một hàng riêng toàn chiều rộng dưới logo**. Chữ rõ, cân đối; giữ PC và mô tả/kết nối bên dưới. Source `public/index.html`, CSS `#sd-footer-story-heading-2026-10-27`, kiểm thử `scripts/audit-storefront-main-preview.mjs`. Owner đã xem ảnh Chromium thực tế và **PASS** ở code `72b3...`.

**VIP:** Chỉ từ **VIP độc lập** trong tên sản phẩm hiển thị **màu đỏ**, font **SD Sans/Noto Sans Bold**, chữ **ĐỨNG, không in nghiêng**, đậm, nổi bật ở theme sáng/tối. Không biến chữ nằm trong VVIP/SuperVIP/VIP1 thành VIP. Áp dụng thẻ sản phẩm, nổi bật, chi tiết, giỏ, yêu thích, checkout; không thay dữ liệu tên SKU/SEO. CSS `#sd-vip-product-title-2026-10-27`, helper `productTitleWithVip`, test `tests/storefront-vip-title.test.mjs`. Owner **PASS**.

**Thanh toán checkout:** Luồng **Đặt hàng ngay → Form khách/địa chỉ → Chọn cọc hoặc thanh toán toàn bộ + QR → Kiểm tra & gửi đơn → Shop đối chiếu/xác nhận**. Liquid Glass chính website, mobile-first. Hàng có sẵn cọc **100.000đ**; hàng đặt riêng cọc **30%, làm tròn LÊN bội số 100.000đ**; thanh toán FULL **giảm 5% và Freeship**. Hiển thị tiền cần chuyển và **số dư còn lại thanh toán khi nhận hàng**. QR lấy từ Shop, hiển thị **LỚN, 1:1 nguyên ảnh gốc, không crop**, nằm **TRÊN** các ô thông tin ngân hàng. Các ô nhấn để copy; nút lưu ảnh và chia sẻ để mở ứng dụng ngân hàng khi hệ điều hành hỗ trợ. Nội dung chuyển khoản **4 số cuối SĐT + SKU + 4 chữ ngẫu nhiên**. Cảnh báo đỏ **QR KHÔNG NHÚNG TIỀN**; trên giao diện khách dùng chữ **Shop** thay cho Admin. Backend là nguồn duy nhất tính giá cọc/giảm; Shop chỉ xác nhận thanh toán khi đối chiếu thực nhận; KHÔNG tự phát sinh giao dịch. Owner đã PASS QR to 1:1 và toàn bộ giao diện/checkout tương ứng.

**Sản phẩm / trang web cũ:** Title-case tên sản phẩm và danh mục, giá `Giá: ...` không ô, SKU trái/trạng thái Liquid Glass vàng champagne phải, giữ nguyên **Hàng đặt riêng**; hai nút mua Liquid Glass **xanh** Thêm vào giỏ và **cam** Đặt hàng ngay, icon/kích cỡ/bóng tương đồng; liên hệ, bốn lợi ích/Zalo nằm dưới hai nút. 4 featured random; catalog nhóm Giày thể thao trước, random cố định trong nhóm khi phân trang. HERO, Welcome, theme, gallery, watermark, fullscreen, Admin, bay sản phẩm vào giỏ và các phần Owner duyệt đều KHÓA. Không tự phát triển biến thể sản phẩm. Baseline 218/15 và 235 sản phẩm cũ ẩn là mốc cũ; Preview có thể đã thêm sản phẩm/danh mục; không xóa/sửa để khớp số lịch sử.

## 3. Nguyên tắc làm việc và giới hạn

- **Hiện không có task code dở dang. Owner vừa PASS và yêu cầu cập nhật bàn giao chat. Hãy sẵn sàng cho yêu cầu MỚI; không tự sửa/báo Owner duyệt lại.**
- Trước yêu cầu mới: fetch GitHub HEAD, PR #118, Actions mới nhất; đọc đủ hai tài liệu mới nói trên. Không hỏi lại thông tin đã biết.
- Khi Owner giao việc mới: chỉ sửa đúng phạm vi trên nhánh integration, bảo vệ các phần đã PASS; kiểm tra CSS chồng lớp; thử mobile/PC, sáng/tối, checkout ảnh hưởng; dùng ảnh chụp Chromium từ web thực khi đối chiếu (không coi ảnh AI tưởng tượng là bằng chứng); CI/QA trên đúng SHA và báo commit/run.
- Có thể thực hiện nhiều luồng đọc/QA độc lập, tránh hai luồng cùng ghi một file, không giảm chuẩn để lấy PASS.
- **TUYỆT ĐỐI KHÔNG** tự merge PR #118, không deploy Production, không ghi/xóa D1/R2 Production, không sửa/ẩn/xóa sản phẩm hoặc giá, không gửi giao dịch thật/đánh dấu đã thanh toán, không tự mở tính năng biến thể nếu chưa có lệnh rõ của Owner.
- **Owner PASS Preview không phải quyền release Production**. Luôn chờ lệnh merge/deploy riêng.

## 4. Tài liệu cần đọc khi có nhiệm vụ liên quan

- `docs/integration/HANDOFF-LATEST-2026-10-27-OWNER-PASS-CHECKOUT-VIP-FOOTER.md`
- `public/index.html`, `scripts/audit-storefront-main-preview.mjs`, `.github/workflows/integration-storefront-isolated-preview.yml`
- `functions/_payments.js`, `functions/api/checkout-quote.js`, `functions/api/orders.js`, `functions/api/admin/payment-requests.js`, `functions/api/admin/payment-transactions.js`, `public/admin/index.html`
- `tests/checkout-preorder-contract.test.mjs`, `tests/payment-ledger-route.test.mjs`, `tests/storefront-vip-title.test.mjs`, `scripts/audit-storefront-checkout-disposable-browser.mjs`

**NHIỆM VỤ NGAY KHI MỞ CHAT MỚI:** Tiếp nhận và xác minh trạng thái HEAD / PR #118 / Actions, đọc hai tài liệu mới, ghi nhận **OWNER PASS** checkpoint `72b3bbec1a3ef822e6c20df1a8bd06818e73428a`, **chờ yêu cầu mới** của Owner. KHÔNG làm lại việc đã xong.
