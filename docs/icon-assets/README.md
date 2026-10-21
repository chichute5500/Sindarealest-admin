# SinDarealest — Icon Design Assets

Thư mục này dành cho các ảnh tham chiếu chính thức của hệ thống icon Liquid Glass và hình minh họa tương tác.

## Hãy tải lên tại đây

1. `icon-reference-original.png` — ảnh bộ icon gốc do người dùng cung cấp. Giữ nguyên hình dáng, nét vẽ, tỷ lệ, màu sắc và trạng thái trong ảnh; đây là nguồn tham chiếu ưu tiên.
2. `icon-interaction-spec.png` — ảnh infographic chi tiết về icon, trạng thái nhấn, yêu thích, giỏ hàng và hiệu ứng bay vào giỏ vừa được render.
3. Các ảnh crop/phóng to từng icon hoặc trạng thái (nếu có), đặt tên dễ hiểu, ví dụ `cart-default.png`, `cart-pressed.png`, `favorite-active.png`.

## Quy tắc sử dụng

- Ảnh trong thư mục này là tài liệu tham chiếu thiết kế, không tự động trở thành tài nguyên được website tải về hay dùng trực tiếp.
- Không thay đổi phong cách icon gốc chỉ để khớp infographic mới. Khi có khác biệt, ưu tiên ảnh bộ icon gốc của người dùng về hình dáng; dùng infographic mới để hiểu trạng thái và hành vi.
- Không đặt thông tin bí mật, thông tin khách hàng hoặc dữ liệu vận hành vào đây.
- Không sửa backend, API, cơ sở dữ liệu, secrets, bindings hay cấu hình deploy trong quá trình thêm tài liệu tham chiếu.

## Thông số phong cách

- Nền sáng: `#eaf3fb`
- Màu chữ/icon chính: `#142a3c`
- Màu nhấn: `#5c91b9`
- Phong cách: Liquid Glass, tối giản, sang trọng, ưu tiên mobile.
- Hiệu ứng thêm giỏ: chỉ chạy sau khi thao tác thêm giỏ thành công; dùng đúng ảnh/biến thể đang hiển thị; không làm dịch chuyển bố cục và không nhân đôi thao tác thêm giỏ.
