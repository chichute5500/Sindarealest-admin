# Tham chiếu giao diện web tĩnh — nhánh fix

Mục đích: lưu ảnh thiết kế GỐC để AI đối chiếu khi chỉnh sửa giao diện web tĩnh trên nhánh `fix/liquid-glass-audit-2026-10-19`.

## Ảnh tham chiếu đã xác định

Hai ảnh dưới đây là **giao diện web trên điện thoại**, dùng làm mẫu chuẩn cho chế độ sáng và tối:

- **Chế độ sáng:** `file_0000000017088207af45f5e6dd90cfa4.png`
- **Chế độ tối:** `file_00000000fcb48207a23aeda23caa5eeb.png`

Không tự đổi vai trò hai ảnh này. Khi so sánh, kiểm tra giao diện mobile ở cả hai chế độ màu. Nếu chưa có ảnh desktop thì không suy diễn bố cục desktop chỉ từ ảnh điện thoại.

## Cách thêm ảnh

1. Tải ảnh thiết kế chuẩn lên chính thư mục này.
2. Đặt tên dễ hiểu khi có thể, ví dụ `web-static-reference-desktop.png` hoặc `web-static-reference-section-01.png`.
3. Không ghi đè hoặc xóa ảnh admin tham chiếu ở `docs/admin-ui-reference/`; thư mục đó thuộc quy trình admin thử nghiệm riêng.
4. Nếu có thêm ảnh, ghi rõ chế độ màu, thiết bị/viewport và khu vực cần tham chiếu tại đây.

## Quy tắc dành cho AI

- Coi ảnh trong thư mục này là **mẫu tham chiếu thiết kế**, không phải ảnh chụp trạng thái hiện tại.
- Đọc ảnh cùng mã HTML/CSS/JS hiện có và trang Preview tương ứng; không suy đoán các chi tiết bị khuất.
- Chỉ thay đổi giao diện web tĩnh được yêu cầu. Giữ nguyên chức năng, dữ liệu, API, xác thực, D1/R2 và các phần không liên quan.
- Không lấy ảnh admin thử nghiệm làm mẫu thay thế cho ảnh web tĩnh; giữ riêng quy trình tham chiếu web tĩnh và admin.
- Chụp lại cùng kích thước viewport và đối chiếu sau mỗi lần sửa; kiểm tra mobile ở cả chế độ sáng và tối.
- Không merge, không triển khai Production, không đổi cấu hình triển khai trong quá trình tham chiếu này.
- Trước khi commit bất kỳ thay đổi nào vào nhánh này, xác minh nhánh đó vẫn là nhánh Preview/test, không phải nhánh Production hiện được Cloudflare Pages cấu hình.

## Ghi chú đối chiếu

- Thiết bị: điện thoại.
- Chế độ sáng: `file_0000000017088207af45f5e6dd90cfa4.png`.
- Chế độ tối: `file_00000000fcb48207a23aeda23caa5eeb.png`.
- Các khu vực cần khớp: đối chiếu toàn bộ giao diện nhìn thấy trong từng ảnh; không tự ý thay đổi chức năng.


## Quy trình thanh toán — tài liệu tham chiếu bổ sung (2026-10-21)

Bộ render checkout/payment đã được người dùng tải lên GitHub và được xác minh tồn tại trên nhánh `fix/liquid-glass-audit-2026-10-19` tại `docs/static-web-reference/checkout-payment-flow-reference.png` (blob SHA `c89ff843af1c094def9233d27a148e048b191990` tại lần kiểm tra 2026-10-21). [Mở ảnh tham chiếu checkout/payment](./checkout-payment-flow-reference.png). Nếu kiểm tra ở thời điểm sau thấy SHA/path thay đổi hoặc file không mở được, xác minh lại trực tiếp trên GitHub; không quay lại trạng thái ghi “chưa có” khi file vẫn tồn tại. Ảnh này bổ sung cho hai ảnh mobile gốc, không thay thế chúng.

Nội dung nghiệp vụ cần đối chiếu trong mẫu:
- Trạng thái hàng (`made_to_order` / `in_stock` / `unclassified`) do chủ cửa hàng thiết lập ở Admin cho từng sản phẩm; khách hàng không được chọn loại hàng.
- Hàng đặt làm: cọc 30% hoặc thanh toán 100% được freeship.
- Hàng có sẵn: cọc cố định 100.000 ₫ hoặc thanh toán 100% được freeship.
- Giá thay đổi trong Admin thì số tiền cọc/toàn bộ phải tự tính từ giá và điều kiện đã được server xác nhận.
- Nếu giá/loại hàng chưa được xác định, vẫn cho gửi yêu cầu tư vấn nhưng không tạo số tiền hoặc QR thanh toán giả.
- QR và thông tin tài khoản lấy từ cấu hình Admin đang hoạt động; không dùng QR/chi tiết ngân hàng minh họa trong ảnh.

**Đối chiếu thị giác bắt buộc khi ảnh đã được commit:** mở ảnh ở độ phân giải gốc; so sánh với cả hai ảnh tham chiếu mobile gốc và trang Preview hiện hành; chụp và đối chiếu màn hình checkout ở chế độ sáng/tối. Mẫu render chỉ bổ sung luồng checkout, không thay thế thiết kế gốc toàn website.


## Trạng thái đồng bộ ảnh checkout/payment — 2026-10-21

- File chuẩn: [`checkout-payment-flow-reference.png`](./checkout-payment-flow-reference.png).
- URL GitHub đầy đủ: https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/static-web-reference/checkout-payment-flow-reference.png
- Tên file, đường dẫn và nhánh phải giữ thống nhất trong Master Prompt và Next Chat Prompt. Đây là ảnh storyboard tham chiếu; không sao chép dữ liệu ví dụ (giá, SKU, tài khoản ngân hàng, ngày tháng) thành dữ liệu thật.
- Tham chiếu thị giác có 3 nguồn: ảnh gốc mobile sáng, ảnh gốc mobile tối và storyboard checkout/payment. Luôn đối chiếu Preview thực tế với cả ba; storyboard không thay thế giao diện thương hiệu đang chạy.
