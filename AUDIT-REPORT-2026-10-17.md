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

### 3. Đặt hàng công khai có thể ghi đè hồ sơ khách hàng
**Mức độ:** Cao — tính toàn vẹn dữ liệu và quyền riêng tư.

Trước đây API đặt hàng tìm hồ sơ bằng số điện thoại rồi cập nhật tên, email, địa chỉ và địa chỉ chi tiết mà không xác minh người gửi sở hữu số điện thoại. Người biết số điện thoại của khách có thể làm sai lệch hồ sơ khách hàng đang gắn với những đơn hàng/bảo hành khác.

**Đã sửa trên nhánh rà soát:**
- Không cập nhật hồ sơ khách hàng hiện có từ checkout công khai.
- Tạo hồ sơ mới bằng `ON CONFLICT(phone) DO NOTHING`, rồi gắn đơn vào ID khách hàng thực tế bằng `INSERT ... SELECT` trong cùng D1 batch để xử lý cuộc gọi đồng thời có cùng số điện thoại.
- Lưu tên, điện thoại và email tại thời điểm đặt hàng trong bảng riêng `order_contact_details`; trang quản trị đơn hàng, quản trị bảo hành và tra cứu bảo hành đọc thông tin của đơn cụ thể thay vì một hồ sơ có thể thay đổi.
- Thêm migration `0007_order_contact_details.sql` để tạo bảng và backfill đơn cũ từ thông tin khách hàng hiện đang có.
- Cập nhật backup/restore; bản backup v2 cũ chưa có bảng này vẫn được khôi phục bằng thông tin liên hệ khách hàng hiện có.
- Thêm test hồi quy cho hành vi không ghi đè hồ sơ, lưu snapshot, truy vấn tra cứu bảo hành và backfill migration.

**Giới hạn cần hiểu đúng:** Không có dữ liệu lịch sử riêng để khôi phục tên/điện thoại/email ban đầu trước khi xảy ra ghi đè; migration chỉ có thể lấy thông tin hiện đang lưu trong hồ sơ khách hàng để điền cho đơn cũ.

**Điều kiện triển khai:** Phải sao lưu D1 và áp dụng migration 0007 thành công trước khi deploy phiên bản code tham chiếu bảng mới. Chưa chạy migration trên production trong đợt rà soát này.

### 4. Giới hạn đăng nhập có thể bị vượt khi nhiều yêu cầu chạy đồng thời
**Mức độ:** Cao — bảo vệ thông tin đăng nhập quản trị.

Logic cũ đọc bộ đếm bằng một truy vấn rồi mới tăng bằng truy vấn khác. Nhiều yêu cầu đồng thời có thể cùng đọc một giá trị cũ, khiến giới hạn số lần đăng nhập hoặc gọi API công khai bị vượt.

**Đã sửa:** Cả `rateLimitLogin()` và `rateLimitPublicRequest()` dùng một D1 batch nguyên tử để cập nhật bộ đếm và đọc giá trị mới. Bước dọn bản ghi cũ là tùy chọn nên nếu nó lỗi, thao tác hợp lệ không bị đổi thành 503. Đã thêm kiểm thử nhiều yêu cầu song song, reset cửa sổ và tách scope endpoint.

### 5. Yêu cầu bảo hành và ảnh đính kèm phải đi qua phiên tra cứu hợp lệ
**Mức độ:** Cao — hạn chế lạm dụng endpoint công khai.

Trước đây API chấp nhận mã bảo hành thô khi gửi khiếu nại/tải ảnh, dù giao diện chính thức dùng token hành động ngắn hạn được tạo sau khi tra cứu.

**Đã sửa:** Hai endpoint `/api/warranty-claims` và `/api/warranty-claim-uploads` từ chối yêu cầu thiếu `claimToken`; test bao gồm trường hợp cố gửi bằng mã bảo hành thô. API tra cứu cũng lọc đường dẫn ảnh từ D1 bằng `parseImages()`, thay vì tin trực tiếp JSON ảnh.

**Lưu ý:** Token là quyền tạm thời do server cấp sau tra cứu, không phải bằng chứng danh tính người mua; thời hạn, giới hạn yêu cầu và che thông tin nhạy cảm vẫn cần được duy trì.

### 6. Cập nhật khiếu nại bảo hành và nhật ký cần cùng thành công/thất bại
**Mức độ:** Trung bình — khả năng kiểm toán và đối chiếu dữ liệu.

Trước đây trạng thái khiếu nại được cập nhật trước, sau đó mới ghi audit log ở một truy vấn riêng. Nếu ghi nhật ký thất bại thì endpoint có thể trả lỗi dù trạng thái đã thay đổi.

**Đã sửa:** Ghép cập nhật và ghi log vào cùng D1 batch; log chỉ được chèn nếu khiếu nại còn tồn tại. Đã bổ sung test kiểm tra cập nhật thành công/không tìm thấy và batch nguyên tử.

### 7. Giới hạn kích thước và số bản ghi khi khôi phục backup
**Mức độ:** Trung bình — độ ổn định của Worker và D1.

Restore trước đây cho phép tối đa 20.000 bản ghi ở từng mảng riêng lẻ, nhưng không giới hạn tổng số bản ghi của tất cả các mảng. Backup rất lớn có thể buộc Worker tạo batch có hàng chục nghìn câu lệnh và vượt thời gian/giới hạn tài nguyên.

**Đã sửa:** Đọc JSON theo luồng với giới hạn 20 MB và từ chối backup có tổng hơn 5.000 bản ghi trước khi xây dựng batch ghi dữ liệu. Đã thêm regression test để xác nhận backup vượt giới hạn bị từ chối trước khi đụng đến D1.

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
