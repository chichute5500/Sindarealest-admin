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

## Bảng màu và thông số đã quy định

| Token / vai trò | Giá trị |
|---|---|
| Nền chủ đạo | `#eaf3fb` |
| Nét icon/chữ chính | `#142a3c` |
| Màu nhấn | `#5c91b9` |
| Tim yêu thích đang bật | `#E5484D` |

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

## Trạng thái và chuyển động

- Phong cách: Liquid Glass, tối giản, sang trọng, ưu tiên mobile.
- Icon mặc định: nét mảnh đồng đều, màu `#142a3c`; giữ hình học và tỷ lệ của `Icon.png`.
- Khi nhấn/chọn: chuyển sắc về `#5c91b9`, tạo cảm giác kính lún nhẹ bằng inset shading/scale rất nhỏ; không ripple và không vòng gợn lan rộng.
- Khi thả: hiệu ứng nhấn trở về trạng thái thường, nhưng trạng thái nghiệp vụ (ví dụ đã yêu thích) vẫn được giữ cho tới khi người dùng đổi lại.
- Icon yêu thích: chưa thích dùng `#142a3c`; đã thích dùng `#E5484D`; bỏ thích thì trở về màu thường.
- Giỏ hàng: huy hiệu phản ánh số lượng thực; chỉ hiện thông báo thành công sau khi thao tác thêm giỏ thực sự thành công.
- Hiệu ứng thêm giỏ chỉ chạy sau khi thao tác thêm giỏ thành công; dùng đúng ảnh/biến thể đang hiển thị; clone/overlay bay đến icon giỏ hàng, không làm dịch chuyển bố cục và không nhân đôi thao tác thêm giỏ. Nhấn icon giỏ chỉ mở giỏ, không chạy hiệu ứng bay.
- Tôn trọng `prefers-reduced-motion`; hiệu ứng không được chặn thao tác thêm giỏ nếu animation lỗi.

## Giới hạn xác nhận

Ba mã HEX nền tảng được xác nhận từ mẫu thiết kế; `#E5484D` và các trị số opacity/blur/shadow ở trên là baseline triển khai được quy định rõ, chưa phải kết quả đo pixel hoặc bằng chứng đã triển khai. Tài liệu này là đặc tả tham chiếu, không có nghĩa hiệu ứng đã được triển khai hoặc kiểm thử PASS.
