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
- **Vòng QA bổ sung cuối** của source `23bbb25...`: [Chrome Browser / Preview](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40576608412), [Source CI](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40576608410). Lúc ghi tài liệu: ĐANG CHẠY; phải đọc kết luận cuối trước khi Owner nghiệm thu.
- Browser QA bổ sung kiểm chứng giỏ hàng cũ, chọn lại sau đổi category, tổng 50 chiếc qua nhiều size; cùng bài test Storefront/Admin trên mobile/PC sáng/tối.
- Admin Preview Playwright cho source trước GREEN: [40574548379](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40574548379).

## Quy tắc bảo toàn

- Không triển khai `main` hoặc Production Pages cho đến khi Owner PASS.
- Không sửa/xóa/sao lưu ghi Production D1/R2; staging dự án `sindarealest-admin-preview` phải qua `scripts/admin-preview-binding-safety.mjs` trước deploy.
- Không tự ý chỉnh lại các giao diện/chức năng chủ web đã PASS trước đây, đặc biệt theme, welcome, QR, 6 bước tra cứu, sản phẩm và giá.
- Không tuyên bố QA final xanh trước khi kiểm tra conclusion thực tế của GitHub run.
- Không khẳng định trên bản Preview đã có bản sao sản phẩm Production: Preview có D1/R2 cách ly, các bản thử ảnh dùng fixture riêng.

## Prompt tiếp nối nếu chat bị dài

> Tiếp tục trực tiếp repository `chichute5500/Sindarealest-admin`, branch `feat/product-options-shoes-belts-phone-2026-10-28`, PR #137 OPEN/DRAFT. Đọc toàn bộ `docs/features/PRODUCT-OPTIONS-OWNER-REVIEW-2026-10-28.md`. Chủ shop đã yêu cầu size giày 38–44, thắt lưng bản 3.5/4.0 cm, ốp điện thoại ghi dòng máy; đồng bộ storefront/admin PC/mobile. Tính năng đã triển khai và SQLite/Chrome QA cũ GREEN. Source QA mở rộng mốc `23bbb25` cần xác minh CI run 40576608412 / 40576608410, sửa nếu đỏ. Nếu GREEN, cập nhật tài liệu & PR với link evidence, báo cáo nghiệm thu và xin Owner PASS; không merge main/Production khi chưa được phép. Không làm lại các phần Owner PASS trước đó. Không thay đổi Production D1/R2.
