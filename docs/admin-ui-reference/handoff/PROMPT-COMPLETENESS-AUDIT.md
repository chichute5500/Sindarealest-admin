# Kiểm toán mức độ đầy đủ của prompt bàn giao ADMIN

**Phạm vi:** Prompt redesign/kiểm toán giao diện ADMIN trên nhánh fix, đối chiếu với các yêu cầu ban đầu còn truy xuất được trong ngữ cảnh làm việc, tài liệu tham chiếu trong repository và các bổ sung về tự chụp ảnh/bàn giao giữa phiên AI.

**Giới hạn đối chiếu:** Nguyên văn toàn bộ prompt đầu tiên chưa được lưu thành một file riêng trong repository hoặc được truy xuất đầy đủ ở lượt kiểm toán này. Vì vậy, đây là đối chiếu theo các yêu cầu được ghi nhận và các tài liệu đang có, không phải chứng nhận đối chiếu từng câu chữ của một bản gốc nguyên văn.

## Ma trận đối chiếu

| Yêu cầu | Trạng thái | Nhận xét |
|---|---|---|
| Làm mới giao diện ADMIN trên đúng nhánh fix hiện tại | COVERED | Repository và branch được ghi rõ; cấm sửa/commit nhầm nhánh. |
| Đọc ảnh tham chiếu và tự trích/xem nội dung ảnh từ HTML/ZIP | COVERED | Prompt bắt buộc mở PNG, kiểm tra HTML và ZIP, trích xuất vào thư mục tạm nếu có thể. |
| Giữ nguyên nghiệp vụ, route, API, auth, schema và backend đang hoạt động | COVERED | Có quy tắc bảo toàn chức năng, không yếu hóa xác thực, không đổi hợp đồng backend. |
| Không thay đổi storefront/hiệu ứng public ngoài phạm vi ADMIN | COVERED | Được nêu trong phần phạm vi/an toàn. |
| Mobile/Android, tablet, desktop; light/dark; typography tiếng Việt và responsive | COVERED | Có ma trận viewport và các tiêu chí UX. |
| Kiểm kê mọi route/module hiện hữu, không tự bịa module | COVERED | Bao gồm dashboard, sản phẩm, ảnh, đơn hàng, khách hàng, bảo hành/hỗ trợ, cài đặt, backup/restore, logs và AI sourcing nếu tồn tại. |
| Chụp screenshot thật từ ứng dụng đang chạy, không dùng ảnh mockup làm bằng chứng | COVERED | Bắt buộc xác nhận app sẵn sàng và dùng Playwright khi môi trường hỗ trợ. |
| Chụp baseline trước sửa, so sánh, sửa, chạy regression và chụp lại | COVERED | Vòng lặp so sánh được nêu rõ. |
| Tự lưu screenshot mới sau mỗi vòng sửa–test–đối chiếu | FIXED IN LATEST VERSION | Đã sửa prompt tổng và START-HERE để yêu cầu lưu mỗi vòng lặp hoàn chỉnh, không chỉ ở cuối dự án. |
| Lưu metadata, báo cáo, trạng thái và test JSON; giữ lịch sử, commit trên branch fix | COVERED | Đã quy định đường dẫn history, SHA, route, viewport, theme và xác minh lại sau khi ghi. |
| Không đánh dấu PASS khi chưa chạy, không bịa ảnh/test/tiến độ | COVERED | Dùng PASS/FAIL/BLOCKED/NOT TESTED và yêu cầu bằng chứng. |
| Không merge main, không deploy production, không thay secret/schema/binding hay dữ liệu thật | COVERED | Các giới hạn an toàn được nêu rõ. |
| Tự khởi động AI phiên tiếp theo khi chat đạt giới hạn mà người dùng không cần kích hoạt gì | NOT IMPLEMENTED BY DOCUMENTATION ALONE | File Markdown/GitHub chỉ lưu hướng dẫn/trạng thái, không tự tạo phiên AI hay tự chạy nền. Cần agent/automation thật sự được cấu hình và có quyền chạy. Tài liệu đã được sửa để không hứa sai điều này. |
| Thực tế đã chạy Playwright và đã có screenshot mới | NOT YET DONE | LATEST-STATUS.md và JSON hiện vẫn phải phản ánh NOT TESTED; chưa có bằng chứng cho phép báo đã kiểm thử hoặc đã chụp ảnh mới. |

## Kết luận

Prompt tổng đã bao quát phần lớn yêu cầu được ghi nhận về redesign ADMIN, kiểm toán chức năng, đối chiếu ảnh và lưu bàn giao. Hai thiếu sót quan trọng đã được xử lý trong phiên rà soát này: (1) yêu cầu cập nhật ảnh/báo cáo sau mỗi vòng sửa–kiểm thử–đối chiếu; (2) làm rõ giới hạn rằng tài liệu GitHub không thể tự kích hoạt phiên AI mới.

**Không kết luận đầy đủ 100% theo nghĩa đối chiếu nguyên văn** vì bản prompt đầu tiên đầy đủ chưa được lưu/truy xuất thành tài liệu gốc riêng. Muốn xác nhận từng câu chữ tuyệt đối, phải lưu nguyên văn prompt đầu tiên và so sánh trực tiếp. Việc cập nhật tài liệu cũng không đồng nghĩa ADMIN đã được chạy, kiểm thử hoặc sửa giao diện; trạng thái này chỉ được thay đổi khi có bằng chứng mới.
