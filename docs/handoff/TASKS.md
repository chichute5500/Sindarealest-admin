# Task ledger — SinDarealest2

Mỗi task có ID bền vững. Cập nhật trạng thái và bằng chứng, không tạo task trùng cho cùng một lỗi.

## Quy ước trạng thái

- `TODO`: chưa bắt đầu.
- `IN_PROGRESS`: đang xử lý; phải ghi người/AI, commit bắt đầu và bước kế tiếp.
- `PASS`: tiêu chí đã đạt và có bằng chứng cụ thể.
- `FAIL`: đã chạy kiểm thử và xác nhận không đạt.
- `BLOCKED`: bị chặn bởi quyền, môi trường, secret, quota hoặc dịch vụ ngoài; phải ghi điều kiện gỡ chặn.
- `UNVERIFIED`: có báo cáo/thay đổi nhưng chưa đủ bằng chứng xác minh.
- `NOT TESTED`: chưa chạy test.
- `NOT APPLICABLE`: chức năng không tồn tại/không thuộc phạm vi, kèm bằng chứng.

## Danh sách công việc ban đầu

> Các trạng thái dưới đây là trạng thái khởi tạo bảo thủ, không phải khẳng định rằng chưa ai từng làm việc. AI tiếp quản phải xác minh lịch sử commit, code và test trước khi đổi trạng thái.

| ID | Hạng mục | Trạng thái ban đầu | Tiêu chí đóng việc |
|---|---|---|---|
| SETUP-001 | Xác minh nhánh, HEAD, diff và môi trường Preview | TODO | Ghi SHA, diff và URL/môi trường thực tế |
| REF-001 | Hiển thị trực quan ảnh mẫu mobile sáng/tối | UNVERIFIED | Hai ảnh đã được mở và xem trực tiếp; ghi các điểm thiết kế quan sát được |
| SHOT-001 | Xác minh workflow chụp ảnh baseline/end | UNVERIFIED | Workflow chạy thực tế, ảnh được tạo và lưu đúng thư mục, có manifest |
| SHOT-002 | Chụp baseline thực tế trước khi sửa | TODO | Ảnh mới, URL, commit, viewport, theme và thời gian trong manifest |
| UI-001 | Đối chiếu toàn bộ giao diện hiện tại với mẫu gốc | TODO | Bảng chênh lệch dựa trên ảnh thực tế; không suy đoán phần bị khuất |
| UI-002 | Kiểm tra hero, nền cũ, lớp phủ và hiệu ứng kính | TODO | Nguyên nhân từ CSS/DOM xác định; test sáng/tối và ảnh đối chiếu |
| UI-003 | Kiểm tra logo, màu sắc và tỷ lệ thương hiệu | TODO | Logo giữ đúng tài sản gốc; không dùng CSS filter đổi màu |
| UI-004 | Kiểm tra tương phản và vùng chạm các nút gallery | TODO | Các nút nhìn rõ, thao tác được bằng chuột/chạm/bàn phím khi phù hợp |
| THEME-001 | Kiểm tra chuyển theme, nhấp nháy và layout shift | TODO | Test theme lặp, refresh và navigation; ghi lỗi còn lại |
| NAV-001 | Kiểm tra Back trên mobile khi overlay mở | TODO | Overlay trên cùng đóng trước; không history loop hoặc trap |
| FUNC-001 | Kiểm thử danh mục, tìm kiếm, lọc, chi tiết và URL sản phẩm | TODO | Test các luồng tồn tại trong code, gồm URL trực tiếp/refresh/share |
| FUNC-002 | Kiểm thử yêu thích và trạng thái lưu | TODO | Kết quả phù hợp thiết kế; persistence chỉ kiểm tra nếu được hỗ trợ |
| FUNC-003 | Kiểm thử giỏ hàng, số lượng, tổng tiền và cách đóng | TODO | Các thao tác và tính toán đã được xác minh |
| FUNC-004 | Kiểm thử tài khoản và checkout an toàn | TODO | Validation và điều hướng đạt; không đặt đơn/thanh toán thật |
| FUNC-005 | Kiểm tra gallery/trình xem ảnh và lỗi tài nguyên | TODO | Điều khiển, ảnh, zoom/đóng hoạt động theo chức năng hiện có |
| PERF-001 | Đo hiệu năng và lỗi console/network | TODO | Có số liệu thực đo, môi trường và công cụ; phân loại lỗi |
| AI-001 | Xác minh phạm vi và trạng thái AI gom nhóm ảnh (nếu thuộc nhánh) | UNVERIFIED | Tách rõ test logic/mock với AI thật; không công bố chất lượng nếu chưa có mẫu đánh giá |
| REG-001 | Chạy kiểm tra cú pháp, CI và Playwright phù hợp | TODO | Ghi link run, commit được test, kết quả từng suite |
| SHOT-003 | Chụp ảnh end-of-work và so sánh với baseline/mẫu | TODO | Ảnh sau sửa mới, cùng viewport/theme/URL khi có thể, ghi chênh lệch |
| SAFE-001 | Rà soát diff và xác nhận không chạm Production/nhánh admin riêng | TODO | Diff cuối sạch khỏi thay đổi ngoài phạm vi; không có deploy/merge Production |
| HANDOFF-001 | Cập nhật hồ sơ bàn giao cuối phiên | TODO | HANDOFF, task ledger, test log và quyết định được cập nhật cùng phiên |

## Mẫu thêm task

| ID | Hạng mục | Trạng thái | Ưu tiên | Bằng chứng/commit | Bước tiếp theo |
|---|---|---|---|---|---|
| `AREA-NNN` | Mô tả lỗi cụ thể | TODO | P1/P2/P3 | Link issue/log/ảnh/commit | Hành động cụ thể |

## Quy tắc chống trùng lặp

- Trước khi tạo task mới, tìm ID và mô tả tương tự trong file này.
- Một lỗi gốc chỉ có một task ID; các test liên quan tham chiếu cùng ID.
- Task PASS không được làm lại vô cớ. Nếu sửa code liên quan, tạo lượt hồi quy gắn với commit mới hoặc chuyển trạng thái kèm lý do.
- Sau hai lần sửa không đạt cùng tiêu chí, dừng thay đổi ngẫu nhiên; xem lại giả thuyết, log và môi trường.
- Không xóa task đã đóng; ghi lịch sử ngắn hoặc link commit.
