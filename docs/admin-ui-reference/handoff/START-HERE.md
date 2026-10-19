# SinDarealest ADMIN — điểm bắt đầu bàn giao cho AI

> Thư mục này là điểm bàn giao bền vững giữa các phiên AI. Nội dung chỉ phản ánh trạng thái đã được ghi và kiểm chứng; không coi báo cáo cũ là bằng chứng nếu chưa xác minh lại.

## Lưu ý về tự động tiếp tục
Các file này lưu trạng thái bền vững nhưng không tự khởi động một phiên ChatGPT mới khi phiên hiện tại hết giới hạn. Tự động chạy tiếp cần có agent/automation riêng thực sự được cấu hình. Khi một phiên AI/automation được khởi chạy, hãy tự đọc tài liệu này và prompt tổng; người dùng không cần viết lại prompt dài.

## Trước khi làm bất cứ việc gì
1. Xác nhận repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, HEAD SHA và `git status`.
2. Đọc file này, rồi đọc `LATEST-STATUS.md`, `latest-test-results.json` và `../reference-instructions.md`.
3. Mở ảnh thiết kế gốc `../admin-mobile-reference.png`; dùng `../admin-mobile-reference.html` và ZIP tham chiếu khi cần.
4. Kiểm tra ảnh gần nhất trong thư mục `history/` và đối chiếu SHA trong báo cáo với HEAD hiện tại. Nếu lệch, không coi ảnh đó là ảnh của code hiện tại.
5. Đọc MASTER PROMPT tại `../MASTER-PROMPT-AUTO-HANDOFF.md` và thực hiện đầy đủ.

## Quy tắc cập nhật sau mỗi vòng lặp
- Một vòng lặp là: thực hiện một sửa đổi có ý nghĩa → chạy lại kiểm tra → chụp lại cùng màn hình/điều kiện → so sánh kết quả.
- Sau MỖI vòng lặp hoàn chỉnh, dùng Playwright chụp ảnh ứng dụng đang chạy thật; lưu ảnh trước/sau và báo cáo trong `history/<short-sha-or-run-id>/screenshots/` cùng metadata. Không đợi kết thúc toàn bộ công việc mới lưu.
- Cập nhật `LATEST-STATUS.md`, `latest-test-results.json`, danh sách lỗi còn lại và commit mỗi vòng lặp đã kiểm tra thành công nếu có quyền/công cụ. Ghi SHA thực tế; không tự bịa thời gian, route, kết quả hoặc commit.
- Chỉ ghi PASS khi có bằng chứng. Dùng BLOCKED/NOT TESTED khi chưa kiểm tra được.
- Commit chỉ trên branch fix này. Không merge main, không deploy production, không đổi schema/binding/secret hay dữ liệu thật.
- Nếu quyền truy cập, Playwright hoặc GitHub bị lỗi, ghi rõ trở ngại và hướng tiếp tục; không tuyên bố đã lưu nếu API chưa xác nhận.

## Tệp trong thư mục này
- `LATEST-STATUS.md`: trạng thái bàn giao mới nhất.
- `latest-test-results.json`: mẫu/cập nhật kết quả kiểm thử.
- `MASTER-PROMPT-AUTO-HANDOFF.md` ở thư mục cha: prompt duy nhất dùng để khởi động và tiếp tục công việc.
- `history/`: ảnh/báo cáo theo từng mốc, giữ lịch sử không ghi đè.

## Lưu ý về ảnh
Các file `latest-*.png` chỉ được coi là ảnh chụp thực tế sau khi được tạo bởi Playwright từ ứng dụng đang chạy và lưu thành công. Nếu chưa có ảnh, không tạo placeholder PNG và không đánh dấu hoàn thành.
