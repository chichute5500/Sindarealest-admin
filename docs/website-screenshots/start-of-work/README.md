# Ảnh chụp website — TRƯỚC khi làm

Thư mục này chỉ lưu bộ baseline thực tế của website ngay trước khi bắt đầu chu kỳ sửa đổi hiện tại.

## Quy tắc chụp
- Chụp thực tế từ đúng Preview/branch/commit; không dùng ảnh tham chiếu hoặc ảnh dựng thay cho screenshot.
- Bao phủ các trang, khu vực, trạng thái tương tác, ảnh full-page và viewport cần thiết. Không dùng một ảnh dài duy nhất để đại diện toàn website.
- Kiểm tra tối thiểu mobile 360×800, mobile 390×844, tablet 768×1024 và desktop 1440×900; các trang quan trọng cần Light và Dark.
- Không lấy ảnh Production thay cho Preview.
- Chỉ cập nhật baseline khi bắt đầu chu kỳ mới và sau khi bộ end-of-work trước đó đã được xác minh hợp lệ. Giữ tên ảnh ổn định giữa hai bộ để so sánh.
- Nếu Preview không truy cập được hoặc ảnh chưa chụp được, ghi BLOCKED/NOT TESTED trong `../manifest.json`; không tạo ảnh giả.

## Quy tắc lưu
- Đây là một trong đúng hai thư mục ảnh chuẩn tắc.
- Không tạo thư mục con theo ngày, phiên chat, tên AI, commit hay Run ID.
- Không lưu ảnh tham chiếu gốc tại đây.
- Tên ảnh mô tả trang/trạng thái/viewport/theme, ví dụ `home-mobile-light-390x844.png`.
- Không tuyên bố có baseline khi thư mục chỉ chứa README hoặc .gitkeep.
