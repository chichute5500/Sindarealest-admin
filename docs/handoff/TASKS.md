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

| ID | Hạng mục | Trạng thái hiện tại | Tiêu chí đóng việc / bằng chứng / bước tiếp theo |
|---|---|---|---|
| SETUP-001 | Xác minh nhánh, HEAD, diff và môi trường Preview | IN_PROGRESS | Đã xác minh nhánh `fix/liquid-glass-audit-2026-10-19`, commit được workflow kiểm thử `c1757447f3b30aee9923297aca2c8ab89a42775d`; workflow run [39320885814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814). URL Cloudflare Preview chưa xác minh được: lần truy cập tự động trước đó trả login_required. Xác minh quyền truy cập Preview và HEAD hiện tại trước khi sửa giao diện. |
| REF-001 | Hiển thị trực quan ảnh mẫu mobile sáng/tối | UNVERIFIED | README và hai đường dẫn ảnh mẫu đã xác minh trong repo; chưa có bằng chứng ảnh được hiển thị/xem trực quan trong phiên này. |
| SHOT-001 | Xác minh workflow chụp ảnh baseline/end | PASS (local pipeline only) | Run [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706) kết thúc success; job gồm test, check, Chromium, capture và artifact upload. Artifact [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329). Lưu ảnh vào thư mục chuẩn tắc bị skip do run là push, không phải workflow_dispatch. Không xác nhận Cloudflare Preview hoặc baseline. |
| SHOT-002 | Chụp baseline trước khi sửa | BLOCKED | Chưa có `docs/website-screenshots/manifest.json` hoặc ảnh baseline trong thư mục đích. Không sao chép ảnh artifact thành bằng chứng Preview trực tiếp. Cần chạy capture có ghi stage sau khi xác nhận điều kiện/môi trường rõ ràng; ghi rõ local fixture hay Cloudflare Preview. |
| UI-001 | Đối chiếu toàn bộ giao diện hiện tại với mẫu gốc | TODO | Chỉ bắt đầu sau khi ảnh mẫu và baseline thực tế được xem/ghi nhận; lập bảng chênh lệch dựa trên ảnh. |
| UI-002 | Kiểm tra hero, nền cũ, lớp phủ và hiệu ứng kính | TODO | Xác định nguyên nhân từ CSS/DOM; test sáng/tối và ảnh đối chiếu. |
| UI-003 | Kiểm tra logo, màu sắc và tỷ lệ thương hiệu | TODO | Giữ tài sản logo gốc; không dùng CSS filter đổi màu. |
| UI-004 | Kiểm tra tương phản và vùng chạm các nút gallery | TODO | Xác minh chuột/chạm/bàn phím khi phù hợp. |
| THEME-001 | Kiểm tra chuyển theme, nhấp nháy và layout shift | TODO | Test theme lặp, refresh và navigation; ghi lỗi còn lại. |
| NAV-001 | Kiểm tra Back trên mobile khi overlay mở | TODO | Overlay trên cùng đóng trước; không history loop hoặc trap. |
| FUNC-001 | Kiểm thử danh mục, tìm kiếm, lọc, chi tiết và URL sản phẩm | TODO | Kiểm tra luồng hiện có, URL trực tiếp/refresh/share và tương thích đường dẫn cũ. |
| FUNC-002 | Kiểm thử yêu thích và trạng thái lưu | TODO | Xác minh persistence chỉ khi được hỗ trợ. |
| FUNC-003 | Kiểm thử giỏ hàng, số lượng, tổng tiền và cách đóng | TODO | Các thao tác và tính toán đã được xác minh. |
| FUNC-004 | Kiểm thử tài khoản và checkout an toàn | TODO | Validation/điều hướng; không đặt đơn/thanh toán thật. |
| FUNC-005 | Kiểm tra gallery/trình xem ảnh và lỗi tài nguyên | TODO | Xác minh điều khiển, ảnh, zoom/đóng theo chức năng hiện có. |
| PERF-001 | Đo hiệu năng và lỗi console/network | IN_PROGRESS | Run local static audit trên commit `c1757447f3b30aee9923297aca2c8ab89a42775d`: 0 page errors, 0 HTTP errors và 0 responsive overflow theo log; console/network đầy đủ và hiệu năng chưa được đánh giá trên Cloudflare Preview. |
| AI-001 | Xác minh phạm vi và trạng thái AI gom nhóm ảnh (nếu thuộc nhánh) | UNVERIFIED | Không thuộc phạm vi sửa giao diện phiên này; không tuyên bố chất lượng AI từ mock. |
| REG-001 | Chạy kiểm tra cú pháp, CI và Playwright phù hợp | PASS (local pipeline only) | Run mới nhất [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706) PASS trên commit `e3c5c08e633bc73900343933dc3145720fbaefa2`; `npm test`, `npm run check` và capture Playwright local hoàn tất. Chưa phải test deployed Preview. |
| SHOT-003 | Chụp ảnh end-of-work và so sánh baseline/mẫu | TODO | Chỉ sau baseline và các thay đổi được kiểm tra. |
| SAFE-001 | Rà soát diff và xác nhận không chạm Production/nhánh admin riêng | IN_PROGRESS | Phiên này chỉ đọc GitHub và ghi nhận hồ sơ nhánh fix; chưa sửa website code, không deploy/merge Production. Tiếp tục kiểm tra diff trước khi hoàn tất. |
| HANDOFF-001 | Cập nhật hồ sơ bàn giao cuối phiên | IN_PROGRESS | Cập nhật test log/task ledger trong phiên này; cập nhật tiếp khi có ảnh baseline và kết quả Preview. |

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


## Bổ sung xác minh 2026-10-20

- Run [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706) thành công trên commit `e3c5c08e633bc73900343933dc3145720fbaefa2`; artifact [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329) tồn tại.
- Phân loại chính xác: SHOT-001/REG-001 PASS cho pipeline local fixture; SHOT-002 vẫn BLOCKED; SHOT-003 chưa làm. Không được nâng trạng thái kiểm tra Preview hoặc so sánh giao diện.
- Lý do không sửa giao diện: chưa có baseline thật và chưa xem trực quan ảnh mẫu. Chuyển route hiện tại cũng chưa đủ căn cứ do legacy records có SKU chưa xác minh.
