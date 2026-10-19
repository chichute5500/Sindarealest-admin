# Tham chiếu giao diện web tĩnh — nhánh fix

Mục đích: lưu ảnh thiết kế GỐC để AI đối chiếu khi chỉnh sửa giao diện web tĩnh trên nhánh `fix/liquid-glass-audit-2026-10-19`.

## Cách thêm ảnh

1. Tải ảnh thiết kế chuẩn lên chính thư mục này.
2. Đặt tên dễ hiểu, ví dụ:
   - `web-static-reference-desktop.png`
   - `web-static-reference-mobile.png`
   - `web-static-reference-section-01.png`
3. Không ghi đè hoặc xóa ảnh admin tham chiếu ở `docs/admin-ui-reference/`; thư mục đó thuộc quy trình admin thử nghiệm riêng.
4. Nếu có nhiều ảnh, ghi rõ thứ tự xem và khu vực cần tham chiếu trong phần bên dưới.

## Quy tắc dành cho AI

- Coi ảnh trong thư mục này là **mẫu tham chiếu thiết kế** cho web tĩnh, không phải ảnh chụp trạng thái hiện tại.
- Đọc ảnh cùng mã HTML/CSS/JS hiện có và trang Preview tương ứng; không suy đoán các chi tiết bị khuất.
- Chỉ thay đổi giao diện web tĩnh được yêu cầu. Giữ nguyên chức năng, dữ liệu, API, xác thực, D1/R2 và các phần không liên quan.
- Không lấy ảnh admin thử nghiệm làm mẫu thay thế cho ảnh web tĩnh.
- Chụp lại cùng kích thước viewport và đối chiếu sau mỗi lần sửa; kiểm tra desktop và mobile nếu có ảnh tương ứng.
- Không merge, không triển khai Production, không đổi cấu hình triển khai trong quá trình tham chiếu này.
- Trước khi commit bất kỳ thay đổi nào vào nhánh này, xác minh nhánh đó vẫn là nhánh Preview/test, không phải nhánh Production hiện được Cloudflare Pages cấu hình.

## Mô tả ảnh tham chiếu

Sau khi tải ảnh lên, ghi chú tại đây:
- Ảnh chuẩn chính:
- Kích thước/viewport:
- Các khu vực cần khớp:
- Chi tiết bắt buộc giữ nguyên:
