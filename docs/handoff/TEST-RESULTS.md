# Test results ledger — SinDarealest2

Ghi mỗi lượt test thực sự đã chạy. Không ghi test dự định chạy vào phần kết quả như thể đã chạy.

## Quy tắc ghi nhận

Mỗi bản ghi phải có:
- Thời gian (UTC).
- Commit SHA được test và nhánh.
- URL/môi trường (Preview/local/CI); không ghi secret.
- Công cụ, suite và lệnh/workflow.
- Viewport, theme và trạng thái giao diện nếu là test UI.
- PASS/FAIL/BLOCKED/NOT TESTED.
- Tóm tắt kết quả và link log/artifact/screenshot.
- Task ID liên quan.
- Ghi chú nếu kết quả cũ không còn áp dụng do code hoặc môi trường thay đổi.

Không dùng kết quả của commit cũ để tuyên bố commit mới đã PASS khi có thay đổi liên quan. Không ghi nhận mock là test dịch vụ thật.

## Kết quả đã ghi nhận khi khởi tạo hồ sơ

Chưa có lượt chạy mới nào được xác minh trong chính hồ sơ này. Do đó không có test nào được đánh dấu PASS tại thời điểm tạo file. Hãy tra cứu GitHub Actions và các bằng chứng hiện có trước khi chạy lại test để tránh lặp việc.

## Nhật ký

| Thời gian UTC | Commit SHA | Môi trường/URL | Test | Trạng thái | Bằng chứng | Task IDs |
|---|---|---|---|---|---|---|
| Chưa ghi nhận | Chưa xác minh | Chưa xác minh | Baseline khởi tạo | NOT TESTED | Cần kiểm tra GitHub Actions và artifact | SETUP-001 |

## Mẫu ghi một lượt test mới

### YYYY-MM-DD HH:MM UTC — tên suite

- Commit:
- Branch:
- Environment / URL:
- Tool / workflow run:
- Viewport / theme / state (nếu áp dụng):
- Status: PASS / FAIL / BLOCKED / NOT TESTED
- Kết quả:
- Log / artifact / screenshot:
- Task IDs:
- Có cần chạy lại không? Vì sao:
- Giới hạn / điều kiện môi trường:

## Khi nào cần chạy lại test đã PASS?

Chỉ chạy lại khi:
1. Code liên quan thay đổi.
2. Cấu hình hoặc môi trường kiểm thử thay đổi.
3. Có lỗi hồi quy hoặc bằng chứng mới.
4. Lượt test trước không đáng tin cậy hoặc không kiểm tra đúng điều kiện.

Nếu không có lý do nào ở trên, tham chiếu kết quả trước thay vì lặp lại test vô ích.
