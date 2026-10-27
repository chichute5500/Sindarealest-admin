# SINDAREALEST — Product options / Owner review — 2026-10-28

## Trạng thái và phạm vi

- Repository: `chichute5500/Sindarealest-admin`.
- Branch thử nghiệm: `feat/product-options-shoes-belts-phone-2026-10-28`.
- PR: [#137](https://github.com/chichute5500/Sindarealest-admin/pull/137) — **OPEN, DRAFT**, CHƯA ĐƯỢC OWNER PASS, không được merge trước khi Owner duyệt.
- Source code kiểm toán đến: `23bbb25db053ad45e95972c80d26ef1f8f6d0962`.
- Main khi bắt đầu: `a5605ea9a18320854ac45d913c9f5cc939cd1ff2`; mọi sửa đổi ở branch thử nghiệm.
- Preview độc lập: https://product-options-1028.sindarealest-admin-preview.pages.dev/
- Mọi bài kiểm tra trình duyệt dùng dữ liệu *mock/fixture*; thông tin SKU, tên, đơn QA là giả lập, không phát sinh đơn/thu tiền thật.

## Phạm vi đã triển khai

1. Giày (sneakers, loafers, dress-shoes và danh mục Admin tạo mới bắt đầu bằng Giày/Shoe/Boot, cũng như Oxford/Derby): bắt buộc size **38, 39, 40, 41, 42, 43, 44**.
2. Thắt lưng (`belts`): bắt buộc bản dây **3.5 cm** hoặc **4.0 cm**.
3. Ốp điện thoại (`phone-cases`): bắt buộc nhập dòng máy (2–80 ký tự Unicode, chuẩn hóa khoảng trắng; từ chối markup/control).
4. Các danh mục khác không hiện ô lựa chọn không liên quan.
5. Nút Thêm giỏ từ catalog chuyển tới modal lựa chọn; nút Thêm giỏ/Đặt ngay từ modal từ chối khi chưa chọn. Giữ nguyên Owner-PASS Liquid Glass xanh sáng/tối và lối đi checkout cũ.
6. Giỏ hàng phân biệt cùng sản phẩm theo `productId::encodeURIComponent(option)`; cùng size cộng số lượng, size khác không gộp. Giới hạn tổng **50 chiếc/mẫu** trên tất cả size, cả trong trình duyệt và server.
7. Giỏ hàng cũ không có option vẫn giữ nguyên số lượng, nhưng checkout khóa lại cho đến khi khách chọn bổ sung. Nếu Admin chuyển loại sản phẩm khiến option đã lưu không hợp lệ, giữ số lượng và yêu cầu chọn lại thay vì xóa dòng giỏ.
8. Checkout quote (`functions/api/checkout-quote.js`) và tạo đơn (`functions/api/orders.js`) đều kiểm tra option bằng **danh mục sản phẩm thật trong D1**, không tin category hoặc giá do trình duyệt gửi. Quote và đơn dùng số lượng tổng theo productId để kiểm tra tồn kho, giảm giá, cọc và thành tiền.
9. Snapshot chi tiết lựa chọn lưu trực tiếp trong `order_items.title` (ví dụ `Giày lười · Size 42`, `Thắt lưng · Bản dây 3.5 cm`, `Ốp điện thoại · Dòng điện thoại: iPhone 16 Pro Max`). Các size khác là **dòng đơn riêng** với ID khác, giúp Admin PC/mobile, điều chỉnh thanh toán và tình trạng đơn không nhầm lẫn.
10. Size giày lưu thêm vào bảng `order_item_details.size` đã tồn tại từ migration 0005, hỗ trợ tra cứu bảo hành. **KHÔNG** cần migration D1 mới, không đụng R2.
11. Admin Editor hiển thị hướng dẫn loại lựa chọn theo danh mục; đơn hàng Admin đọc snapshot title có lựa chọn, không phụ thuộc sản phẩm bị đổi tên sau mua. Giữ nguyên kiểm tra xác nhận thanh toán và chỉ kích hoạt bảo hành khi hoàn tất.

## Đã kiểm tra và đang kiểm tra

- [Source CI và SQLite integration 100% GREEN ở mốc trước](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40574548362): chọn sai/thiếu option trả 400; cùng size được gộp và khác size tách; real temporary SQLite D1 compatible, admin auth, FK và warranty size.
- [Chrome QA 8/8 GREEN ở mốc trước](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40574536411): Storefront/Admin ở 390px và 1366px, light/dark; Cloudflare binding isolation và deploy Preview độc lập đã SUCCESS.
- **Vòng QA bổ sung cuối** của source `23bbb25db053ad45e95972c80d26ef1f8f6d0962`: [Chrome Browser / Preview](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40576608412) — **SUCCESS, 20/20 tests passed**; [Source CI](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40576608410) — **SUCCESS**.
- CI Browser xác minh các bước `npm run check`, `npm test`, **20 Playwright Chrome** (Admin 4, Storefront 16: catalog/cart/checkout + legacy cart + aggregate quantity limit + changing category trên 4 giao diện), so sánh binding Preview–Production, và triển khai branch `product-options-1028`: **tất cả SUCCESS**. Bằng chứng [32 ảnh chụp/file test, artifact 12768140858](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40576608412/artifacts/12768140858).
- Preview sau vòng cuối: https://product-options-1028.sindarealest-admin-preview.pages.dev/ (Wrangler deploy alias trả SUCCESS, code commit `23bbb25d`). Hình chụp trình duyệt dùng mock API; Preview chạy D1 cách ly thực tế.
- Browser QA bổ sung kiểm chứng giỏ hàng cũ, chọn lại sau đổi category, tổng 50 chiếc qua nhiều size; cùng bài test Storefront/Admin trên mobile/PC sáng/tối.
- Admin Preview Playwright cho source trước GREEN: [40574548379](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40574548379).

## Quy tắc bảo toàn

- Không triển khai `main` hoặc Production Pages cho đến khi Owner PASS.
- Không sửa/xóa/sao lưu ghi Production D1/R2; staging dự án `sindarealest-admin-preview` phải qua `scripts/admin-preview-binding-safety.mjs` trước deploy.
- Không tự ý chỉnh lại các giao diện/chức năng chủ web đã PASS trước đây, đặc biệt theme, welcome, QR, 6 bước tra cứu, sản phẩm và giá.
- Không tuyên bố QA final xanh trước khi kiểm tra conclusion thực tế của GitHub run.
- Không khẳng định trên bản Preview đã có bản sao sản phẩm Production: Preview có D1/R2 cách ly, các bản thử ảnh dùng fixture riêng.

## Prompt tiếp nối nếu chat bị dài

> Tiếp tục trực tiếp repository `chichute5500/Sindarealest-admin`, branch `feat/product-options-shoes-belts-phone-2026-10-28`, PR #137 OPEN/DRAFT. Đọc toàn bộ `docs/features/PRODUCT-OPTIONS-OWNER-REVIEW-2026-10-28.md`. Chủ shop đã yêu cầu size giày 38–44, thắt lưng bản 3.5/4.0 cm, ốp điện thoại ghi dòng máy; đồng bộ storefront/admin PC/mobile. Tính năng đã triển khai và SQLite/Chrome QA cũ GREEN. Source QA mở rộng mốc `23bbb25` cần xác minh CI run 40576608412 / 40576608410, sửa nếu đỏ. QA Chrome vòng cuối **20/20 GREEN**, source CI xanh, Preview branch đã deploy; báo cáo nghiệm thu và xin Owner PASS; không merge main/Production khi chưa được phép. Không làm lại các phần Owner PASS trước đó. Không thay đổi Production D1/R2.

## Điều chỉnh giao diện lựa chọn theo yêu cầu Owner (2026-10-28)

- Thay select/dropdown cho **mọi lựa chọn cố định** bằng ô bấm riêng: giày 38–44 có **7 nút số nhỏ**, thắt lưng 3.5/4.0 cm có **2 nút**, hiển thị 3,5 và 4,0; nhãn bên trên ghi đơn vị cm.
- Các nút vừa nội dung số, `flex-wrap` tự xuống hàng trên màn nhỏ, không kéo rộng kín hàng. Nút chọn dùng màu xanh `--gold` của giao diện đã Owner PASS, trạng thái `aria-pressed`, điều hướng phím mũi tên, Home/End và focus-visible.
- Ốp điện thoại có tên máy nhập tự do, không thể biến thành danh sách hữu hạn: giữ ô nhập chữ nhưng thu gọn tối đa 280px, bo tròn đồng tông.
- Không đổi hợp đồng API, giá, QR, Admin, bản ghi size đã lưu hoặc logic giỏ. Hidden canonical value truyền lại lựa chọn như trước.
- Mã nguồn chức năng được kiểm tra: `69fb405a8dc7860c32630b0730e5f72822cd00ac`.
- [Chrome QA chọn ô và hậu kiểm toàn luồng](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40578106356): **SUCCESS, 20/20**, gồm chip 7 nút, bề ngang nút dưới 60px, mobile overflow, keyboard navigation, đồng bộ giỏ/checkout/Admin trên PC/mobile sáng/tối; bước binding safety, Preview deploy **SUCCESS**.
- [Source checks](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40578106322): **SUCCESS**; [Admin Preview regression](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40578117361): **SUCCESS**.
- Preview đã cập nhật thành công: https://product-options-1028.sindarealest-admin-preview.pages.dev/
- **Chờ Owner PASS mới merge.** Không chạm `main`, Production D1 hoặc R2.
