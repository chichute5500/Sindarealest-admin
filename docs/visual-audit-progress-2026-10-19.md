# SinDarealest — tiến độ kiểm toán giao diện

Cập nhật: 19/10/2026  
Repository: `chichute5500/Sindarealest-admin`  
Nhánh thử nghiệm: `fix/liquid-glass-audit-2026-10-19`  
Source HEAD đã xác minh trước cập nhật tài liệu: `054c6c2cd3a8232900624dd62466b85523284a52`  
Production: không merge vào `main`, không deploy, không thay DNS/secrets/DB/R2.

## Các thay đổi thực tế gần nhất

1. Sửa override CSS mobile khiến chiều cao thẻ cam kết bị ép cứng; chiều cao giờ do nội dung và quy tắc responsive điều khiển.
2. Xóa khối cam kết thương hiệu bị lặp sau “Sản phẩm nổi bật”. Sáu cam kết chính dưới hero được giữ nguyên. Quy trình đặt hàng vẫn còn trong CTA “Đặt hàng an tâm” có thể mở chi tiết.
3. **Sửa lỗi gốc khiến section “The art of…” bị sụp chiều cao trên mobile.** Quy tắc mobile cuối cùng ghi `grid-template-rows:auto` ghi đè chiều cao hàng đã định nghĩa trước đó; các thẻ mosaic dùng ảnh/nội dung định vị tuyệt đối nên không tạo intrinsic height. Đã khôi phục hàng `200px 145px` cho lưới mobile.
4. Bổ sung assertion hồi quy trong `scripts/capture-liquid-glass-preview.mjs` để kiểm tra bounding box mosaic ở mobile 390 px trong cả Light/Dark, tránh tái phát lỗi section bị sụp.

## Bằng chứng kiểm thử ở source HEAD `054c6c2cd3a8`

- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187543943).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187544051).
- Artifact: [sindarealest-liquid-glass-preview-76](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187544051).
- Đã tải và đọc `visual-audit.json`: 36 screenshot; 20 tổ hợp responsive (10 viewport × 2 theme); 42 interaction checks; `passed=true`; `responsiveOverflowCount=0`; `hardFailures=[]`; không có page errors, console errors, same-origin HTTP errors hoặc failed requests.
- Assertion mới về mosaic PASS ở cả hai theme: tổng chiều cao lưới 353 px; thẻ chính 200 px; hai thẻ phụ mỗi thẻ 179 × 145 px.
- Viewport: 320/360/375/390/412/430 px, tablet 768/1024 px, desktop 1366/1440 px, Light/Dark. Có thêm ảnh detail, fullscreen gallery, cart, checkout, order process và account.
- Môi trường: Chromium/Playwright, preview tĩnh cô lập, fixture sản phẩm legacy chỉ đọc; không dùng Cloudflare/D1/R2, không ghi dữ liệu và không gọi request ngoài. Đây không phải kiểm thử Android vật lý hoặc backend production.

## Sai lệch và giới hạn còn lại

1. **P1 — Similarity với ảnh mẫu:** trang hiện tại vẫn là storefront dài, không phải giao diện app nhiều màn hình như ảnh mẫu. Hero, mật độ nội dung, product card, texture nền và chiều sâu Liquid Glass chưa được nghiệm thu trực quan 100%.
2. **P1 — Hình ảnh/catalog:** preview fixture có sneaker/giày/phụ kiện, còn ảnh tham chiếu có túi xách/ví/thắt lưng cụ thể. Không thay dữ liệu thật bằng ảnh giả; cần catalog/ảnh được chủ dự án xác nhận.
3. **P1 — Kiến trúc trải nghiệm:** một số luồng dùng anchor/drawer/modal trong cùng trang. Các luồng detail/gallery/cart/checkout/account hiện có đã được script kiểm tra; việc tách route cần đánh giá riêng để tránh phá state và browser history.
4. **P2 — ZIP nguồn:** chưa tìm được `sindarealest-liquid-glass-preview-21.zip` gốc gồm 28 screenshot trong tài nguyên hiện truy cập được. Artifact 76 là bộ mới 36 screenshot, không thay thế ZIP gốc.
5. **P2 — Android thật:** không có bằng chứng kiểm thử trên thiết bị vật lý; Playwright chỉ xác nhận môi trường browser mô phỏng.
6. **P2 — Backend production:** các workflow là preview chỉ đọc, không chứng minh đăng nhập, thanh toán, tồn kho, đơn hàng hay dữ liệu D1/R2 production hoạt động.

## Trạng thái

- Bảo toàn branch, không deploy/merge production: **đã tuân thủ**.
- Source/test CI: **pass** ở `054c6c2cd3a8`.
- Visual preview automation: **pass** ở `054c6c2cd3a8`.
- Responsive overflow ở 20 tổ hợp viewport/theme: **0** theo audit.
- Interaction checks: **42, không có hard failure**.
- Lỗi mosaic mobile đã có bằng chứng trước/sau và assertion hồi quy: **đã sửa/đã kiểm tra**.
- ZIP nguồn 28 ảnh, so sánh overlay/pixel trực tiếp với mẫu và kiểm thử Android thật: **chưa hoàn thành**.
- Nghiệm thu thị giác tổng thể và backend: **chưa hoàn thành**.

## Tiến độ ước tính

**68%** theo nhóm nhiệm vụ và bằng chứng, không phải điểm similarity. Đã tăng vì phát hiện/sửa nguyên nhân gốc khiến mosaic sụp, thêm kiểm tra hồi quy, và xác minh preview mới 36 ảnh/42 interaction checks. Không báo 100% khi thiếu ZIP gốc, catalog được xác nhận và kiểm thử thiết bị/backend.

## Tiếp theo

1. Tiếp tục sửa sai lệch thị giác có bằng chứng từ screenshot Light/Dark, nhất là độ đậm nền Liquid Glass, tỷ lệ hero và product card.
2. Kiểm tra các route/trạng thái còn thiếu screenshot bằng browser automation.
3. Khi ZIP gốc có thể truy cập, kiểm kê đúng 28 ảnh và đối chiếu trực tiếp từng viewport/theme.
4. Giữ branch thử nghiệm; không merge/deploy production.
