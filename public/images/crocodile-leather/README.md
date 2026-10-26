# Ảnh da cá sấu thật — mục “Chất liệu cao cấp”

Đây là **thư mục tải ảnh lên** cho ô “Chất liệu cao cấp” trên trang chủ SinDarealest.

1. Mở thư mục `public/images/crocodile-leather/` trên đúng nhánh `integration/storefront-locked-on-main-2026-10-26` và chọn **Add file → Upload files**. Đưa ảnh thật của bạn vào đây, ví dụ: `da-01.webp`, `da-02.jpg`, `da-03.png`.
2. Mở **một file danh sách** `gallery.json` cùng thư mục, thay `"images": []` bằng `"images": ["da-01.webp", "da-02.jpg", "da-03.png"]`, đúng tên ảnh bạn vừa đưa lên. Không cần sửa HTML/CSS/JavaScript.
3. Lưu (commit) lên nhánh tích hợp. Preview của PR sẽ cập nhật theo workflow. Chỉ đưa vào Production khi Owner cho phép merge/deploy.

**Hành vi:** tự chuyển mỗi **1,5 giây**, lặp vòng, **không có nút bấm, dấu chấm hay bộ đếm**, trên cả PC và Mobile. Không phụ thuộc theme; ảnh thật giữ nguyên sắc độ, không nhuộm light/dark. Một ảnh thì đứng yên; ảnh lỗi sẽ bỏ qua. Ảnh chưa được cấu hình thì vẫn hiển thị hai ảnh hiện tại như cũ.

**Quy cách:** JPEG/PNG/WebP/AVIF, tên file ngắn chỉ dùng chữ Latin, số, dấu `-`, `_`, `.`; không dùng khoảng trắng hoặc thư mục con; tối đa 24 ảnh. Để mượt trên điện thoại, nên nén mỗi ảnh tới khoảng 200–500 KB, chiều ngang ~1200 px, tránh ảnh gốc dung lượng lớn. File `gallery.json` là danh sách cần thiết vì trình duyệt không thể tự liệt kê ảnh trong thư mục web tĩnh.
