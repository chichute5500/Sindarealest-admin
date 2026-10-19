# Ảnh chụp website — SAU khi hoàn thành

Thư mục này chỉ lưu bộ screenshot kết quả mới nhất đã được chụp và kiểm tra thực tế trong chu kỳ hiện tại.

## Quy tắc chụp
- Chụp cùng các trang, trạng thái, viewport, theme và nguồn Preview với baseline khi tương ứng; chụp thêm khu vực bị ảnh hưởng.
- Chụp ảnh viewport và full-page khi phù hợp; các khu vực quan trọng cần ảnh riêng đủ rõ để kiểm tra.
- Kiểm tra tối thiểu mobile 360×800, mobile 390×844, tablet 768×1024 và desktop 1440×900; các trang quan trọng cần Light và Dark.
- Không sao chép baseline hoặc ảnh tham chiếu để giả làm kết quả sau sửa.
- Ghi rõ route, Preview URL, branch, commit, theme, viewport, trạng thái file và kết quả so sánh trong `../manifest.json`.
- Nếu ảnh thiếu, trang trắng, sai Preview hoặc chưa mở để kiểm tra, ghi trạng thái tương ứng; không coi bộ ảnh là PASS.

## Quy tắc lưu
- Đây là một trong đúng hai thư mục ảnh chuẩn tắc.
- Không tạo thư mục con theo ngày, phiên chat, tên AI, commit hay Run ID.
- Ảnh cùng tên được thay bằng kết quả hợp lệ mới nhất của cùng trang/trạng thái.
- Khi bắt đầu chu kỳ mới, chỉ sau khi bộ kết quả này đã được xác minh hợp lệ mới sao chép/chuyển nó thành baseline mới; không cập nhật baseline giữa chu kỳ.
- Không tuyên bố hoàn thành nếu thư mục chỉ chứa README hoặc .gitkeep.
