# SinDarealest2 — báo cáo rà soát mã nguồn

**Ngày:** 17-10-2026  
**Mã nguồn gốc rà soát:** `fix/ai-review-quota-scope-2026-10-15` @ `bce2d4627c5c9a888fb9c4a531b62b86caf7a24e`  
**Nhánh đề xuất sửa:** `audit/full-review-2026-10-17`  
**Phạm vi:** Cloudflare Pages Functions, xác thực quản trị, xử lý sản phẩm/ảnh, đơn hàng, bảo hành, backup/restore, workflow triển khai và kiểm thử hiện có.

## Các vấn đề đã xác định và xử lý trên nhánh rà soát

### 1. Chèn HTML qua đường dẫn ảnh trong thư viện xem toàn màn hình
**Mức độ:** Cao nếu cơ sở dữ liệu có ảnh cũ/nhập ngoài quy tắc.

Hàm `renderFullscreenThumbs()` đưa `imgPath(src)` trực tiếp vào thuộc tính `src` của HTML được tạo bằng chuỗi. Giá trị ảnh đến từ dữ liệu sản phẩm API; helper `parseImages()` trước đó chỉ lọc kiểu chuỗi. Nếu D1 có một giá trị ảnh không hợp lệ, dấu nháy có thể thoát khỏi thuộc tính HTML.

**Đã sửa:** Escape giá trị đường dẫn trước khi ghép vào HTML và lọc ảnh trả ra từ D1 theo danh sách cho phép: WebP nội bộ trong `images/` hoặc `/media/` với định dạng tên tệp hợp lệ. Đã thêm kiểm thử hồi quy payload HTML độc hại và URL ngoài/traversal.

### 2. Truy vấn N+1 ở màn hình quản trị đơn hàng
**Mức độ:** Trung bình — tăng độ trễ và số truy vấn D1 khi số đơn tăng.

API quản trị lấy tối đa 1.000 đơn, rồi gọi thêm một truy vấn riêng cho từng đơn để lấy dòng sản phẩm; tức tối đa khoảng 1.001 lượt đọc cho một lần tải danh sách.

**Đã sửa:** Dùng CTE giới hạn 1.000 đơn trước, sau đó LEFT JOIN các dòng sản phẩm trong một truy vấn, nhóm kết quả theo ID đơn và giữ nguyên các giá chưa xác nhận ở dạng `null`. Đã thêm kiểm thử đảm bảo chỉ gọi D1 một lần và giữ đúng cấu trúc dữ liệu trả về.

## Các kiểm tra/điểm vận hành cần chú ý

### Trạng thái deploy
Workflow gần nhất `39037562800` trên commit gốc cho kết quả tổng thể xanh, nhưng bước **Deploy to verified Pages project** bị **skipped** vì biến repo `CLOUDFLARE_PAGES_ORIGINALS_READY` không bằng `true`. Do đó không được diễn giải kết quả workflow đó là đã triển khai mã mới lên web chính. Giữ cổng bảo vệ này cho tới khi chủ dự án quyết định rõ việc bật deploy.

### Ảnh bằng chứng bảo hành
Nhánh gốc đã có các biện pháp quan trọng: ảnh khiếu nại mới phải lưu ở binding R2 riêng `ORIGINALS`, không dùng chung bucket hiển thị `IMAGES`; route đọc ảnh cần xác thực admin; media công khai từ chối đường dẫn `warranty-claims/`; script kiểm tra binding yêu cầu hai bucket tách biệt và xác minh public access của `ORIGINALS` đã tắt. Không được bỏ các kiểm tra này để “làm cho deploy chạy”.

### Phiên quản trị
Đã rà soát thấy thời hạn session 10 phút, cookie `HttpOnly; Secure; SameSite=Strict`, kiểm tra session trên endpoint quản trị, giới hạn thử đăng nhập và có bài test ngăn middleware cấp lại cookie hợp lệ ngay sau logout. Cần giữ các regression tests này khi sửa về sau.

### Backup/restore
Restore có thể thay thế dữ liệu sản phẩm và, với bản backup có dữ liệu vận hành, xóa rồi khôi phục các bảng đơn hàng/khách hàng/bảo hành/nhật ký. Đây là thao tác phá hủy có chủ đích, không tự động chạy qua deploy; chỉ dùng sau khi đã tải backup mới và kiểm tra đúng môi trường D1.

## Giới hạn kiểm tra

Đây là rà soát mã và workflow GitHub từ repository. Tôi không có bằng chứng xác nhận đã chạy kiểm thử HTTP/E2E trực tiếp trên phiên bản web đang phục vụ người dùng, và không xem được giá trị secrets của Cloudflare. Cần xác nhận runtime sau khi kiểm thử nhánh đề xuất; báo cáo này không tuyên bố website đã triển khai các sửa đổi.

### Dependency/build integrity
The audit also found that CI installed dependencies with `--no-audit --no-fund`, both primary workflows used old action versions that emitted a Node.js 20 deprecation warning, and the repository did not contain `package-lock.json`. On this review branch, the direct Wrangler dependency is pinned to `4.149.0`, GitHub Actions references are refreshed to `@v7`, and CI/deploy now run `npm audit --audit-level=high` after installation. **Remaining limitation:** no lockfile is committed yet, so npm can still resolve transitive dependencies to different versions on later runs. A checked-in, tested lockfile should be the next reproducibility improvement; do not claim fully reproducible builds until that is done.
