# Kiểm toán mức độ đầy đủ của prompt bàn giao ADMIN

**Phạm vi:** Prompt kiểm toán/redesign ADMIN, quy trình screenshot/Playwright, bàn giao liên phiên và yêu cầu cô lập nhánh khỏi AI website tĩnh.

**Giới hạn đối chiếu:** Nguyên văn toàn bộ prompt đầu tiên chưa được lưu thành một file riêng trong repository hoặc được truy xuất đầy đủ. Đây là đối chiếu theo các yêu cầu được ghi nhận và tài liệu trong repository, không phải chứng nhận đối chiếu từng câu chữ với một bản gốc đầy đủ.

## Ma trận đối chiếu

| Yêu cầu | Trạng thái | Nhận xét |
|---|---|---|
| Có nhánh ADMIN riêng, không dùng chung nhánh fix với website tĩnh | ADDED — VERIFY AFTER WRITE | Nhánh ADMIN dự kiến `feature/admin-isolated-handoff-2026-10-20`; xác minh tồn tại và chỉ commit trên nhánh này |
| Bảo vệ nhánh website tĩnh `fix/liquid-glass-audit-2026-10-19` | COVERED | Không sửa/commit nhánh đó trong nhiệm vụ ADMIN |
| Không tự merge/cherry-pick hoặc đồng bộ hai nhánh | COVERED | Phải so sánh SHA/diff và có chỉ thị rõ ràng trước khi đồng bộ |
| Bảo toàn thay đổi chưa commit và không dùng reset/stash mù quáng | COVERED | Xác minh Git trước khi hành động; dừng thao tác nguy hiểm khi không chắc chắn |
| Đọc ảnh tham chiếu và kiểm tra PNG/HTML/ZIP | COVERED | Prompt yêu cầu mở PNG, kiểm tra HTML/ZIP và ghi rõ nếu không đọc được |
| Giữ nghiệp vụ, route, API, auth, schema và backend đang hoạt động | COVERED | Không loại bỏ tính năng, thay đổi API ngầm hoặc làm yếu xác thực |
| Không thay đổi storefront/hiệu ứng public ngoài phạm vi ADMIN | COVERED | Có danh sách khu vực public được bảo vệ và quy tắc với file dùng chung |
| Mobile/Android, tablet, desktop; light/dark; typography tiếng Việt | COVERED | Có ma trận viewport và tiêu chí UX |
| Kiểm kê module thực tế, không bịa module | COVERED | Kiểm tra những route/module có thật trong source |
| Chụp screenshot thật từ ứng dụng đang chạy | COVERED | Không dùng mockup làm bằng chứng |
| Chụp baseline, so sánh, sửa, chạy regression, chụp lại | COVERED | Vòng lặp so sánh bắt buộc |
| Lưu ảnh/báo cáo/status/JSON sau mỗi vòng lặp hoàn chỉnh | COVERED | Cập nhật trên nhánh ADMIN và giữ lịch sử |
| Không đánh dấu PASS nếu chưa chạy, không bịa tiến độ | COVERED | PASS/FAIL/BLOCKED/NOT TESTED phải có bằng chứng |
| Không merge main, không deploy production, không sửa secrets/schema/binding/dữ liệu thật | COVERED | Các giới hạn an toàn được nêu rõ |
| Tự khởi động AI tiếp theo chỉ bằng file Markdown | NOT PROVIDED BY DOCUMENTATION ALONE | Cần agent/automation thật sự được cấu hình; handoff file không tự khởi chạy AI |
| Đã chạy Playwright/chụp ảnh thật trong lần cập nhật tài liệu này | NOT DONE / NOT CLAIMED | Chưa có bằng chứng cho phép tuyên bố đã test hoặc đã chụp ảnh mới |
| Đối chiếu nguyên văn 100% với prompt ban đầu | NOT VERIFIABLE YET | Cần bản gốc đầy đủ được lưu/truy xuất để so sánh từng yêu cầu |

## Kết luận

Prompt và handoff được điều chỉnh để ADMIN có nhánh riêng, trong khi nhánh `fix/liquid-glass-audit-2026-10-19` tiếp tục thuộc luồng website tĩnh. Việc tách nhánh/tài liệu không đồng nghĩa code ADMIN đã được sửa hoặc kiểm thử. Trước khi làm code, AI phải xác minh branch, HEAD SHA, working tree và diff thực tế.

Không kết luận “100% hoàn thành” khi chưa có bằng chứng cho các kiểm thử và khi chưa thể đối chiếu nguyên văn với prompt đầu tiên đầy đủ.
