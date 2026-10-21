# SinDarealest — Icon Design Assets

Thư mục này chứa ảnh tham chiếu cho hệ thống icon Liquid Glass và hành vi tương tác của website.

## Ảnh tham chiếu đã tải lên

1. `Icon.png` — ảnh bộ icon gốc do người dùng cung cấp. Ưu tiên ảnh này để giữ đúng hình dáng, nét vẽ, tỷ lệ, màu sắc và trạng thái của icon.
2. `Chitiet.png` — ảnh tham chiếu chi tiết về phong cách, trạng thái nhấn, yêu thích, giỏ hàng và hiệu ứng bay vào giỏ.

## Quy tắc sử dụng

- Đây là tài liệu tham chiếu thiết kế; không tự động trở thành tài nguyên mà website tải về hoặc dùng trực tiếp.
- Nếu hai ảnh có khác biệt, ưu tiên `Icon.png` về hình dáng icon; dùng `Chitiet.png` để hiểu trạng thái và hành vi tương tác.
- Không tự ý thay đổi hình dáng, nét vẽ hoặc tỷ lệ của bộ icon gốc chỉ để khớp ảnh infographic.
- Không đặt thông tin bí mật, thông tin khách hàng hoặc dữ liệu vận hành vào thư mục này.
- Không sửa backend, API, cơ sở dữ liệu, secrets, bindings hay cấu hình deploy khi chỉ cập nhật tài liệu tham chiếu.

## Bảng màu đã xác nhận từ thiết kế tham chiếu

| Token / vai trò | Giá trị | Quy tắc |
|---|---|---|
| `--sd-glass-base` | `#eaf3fb` | Nền sáng chủ đạo; không hiểu đây là màu tô đặc bắt buộc cho mọi mặt kính. |
| `--sd-icon-ink` | `#142a3c` | Nét icon và chữ chính ở trạng thái mặc định trên nền sáng. |
| `--sd-accent` | `#5c91b9` | Nét icon khi nhấn/chọn và các điểm nhấn giao diện. |
| `--sd-favorite-active` | Chưa chốt HEX riêng | Trái tim chuyển đỏ khi đã thích; không tự khẳng định một mã đỏ là mã thương hiệu. Đối chiếu `Chitiet.png`/quyết định thiết kế trước khi khóa mã. |
| Mặt kính, viền sáng, bóng đổ | Dựa trên `Icon.png` và `Chitiet.png` | Dùng nền trong/bán trong, viền sáng mảnh và bóng đổ/refraction nhẹ; không tự đặt một màu kính đặc hoặc hiệu ứng quá đậm. Chưa khóa opacity/blur/shadow bằng số nếu chưa đo từ mẫu thực tế. |

## Trạng thái và chuyển động

- Phong cách: Liquid Glass, tối giản, sang trọng, ưu tiên mobile.
- Icon mặc định: nét mảnh đồng đều, màu `#142a3c`; giữ hình học và tỷ lệ của `Icon.png`.
- Khi nhấn/chọn: chuyển sắc về `#5c91b9`, tạo cảm giác kính lún nhẹ bằng inset shading/scale rất nhỏ; không ripple và không vòng gợn lan rộng.
- Khi thả: hiệu ứng nhấn trở về trạng thái thường, nhưng trạng thái nghiệp vụ (ví dụ đã yêu thích) vẫn được giữ cho tới khi người dùng đổi lại.
- Icon yêu thích: chưa thích dùng màu thường; đã thích chuyển đỏ; bỏ thích thì trở về màu thường. Mã HEX đỏ riêng chưa được phê duyệt.
- Giỏ hàng: huy hiệu phản ánh số lượng thực; chỉ hiện thông báo thành công sau khi thao tác thêm giỏ thực sự thành công.
- Hiệu ứng thêm giỏ chỉ chạy sau khi thao tác thêm giỏ thành công; dùng đúng ảnh/biến thể đang hiển thị; clone/overlay bay đến icon giỏ hàng, không làm dịch chuyển bố cục và không nhân đôi thao tác thêm giỏ. Nhấn icon giỏ chỉ mở giỏ, không chạy hiệu ứng bay.
- Tôn trọng `prefers-reduced-motion`; hiệu ứng không được chặn thao tác thêm giỏ nếu animation lỗi.

## Giới hạn xác nhận

Ba mã HEX nền tảng ở trên được xác nhận từ mẫu thiết kế. Mã đỏ yêu thích và các trị số opacity/blur/shadow chưa được khóa; cần đối chiếu mẫu hình ảnh trước khi ấn định. Tài liệu này là đặc tả tham chiếu, không có nghĩa hiệu ứng đã được triển khai hoặc kiểm thử PASS.
