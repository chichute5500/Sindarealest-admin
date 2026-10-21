# Hợp đồng tích hợp — QR chuyển khoản và phân loại sản phẩm SinDarealest

**Ngày lập:** 2026-10-21  
**Trạng thái:** Yêu cầu đã được chủ dự án duyệt để nghiên cứu/triển khai trên hai nhánh riêng; đây là hợp đồng tích hợp, không phải bằng chứng tính năng đã được triển khai.  
**Repository:** `chichute5500/Sindarealest-admin`

## 1. Mục tiêu và hàng rào nhánh

Hai phần được phát triển độc lập và phải cùng tuân thủ tài liệu này:

- **Website tĩnh:** `fix/liquid-glass-audit-2026-10-19`, PR #108 — giao diện khách hàng, nhãn/bộ lọc tình trạng sản phẩm và giao diện hướng dẫn chuyển khoản QR.
- **Admin:** `feature/admin-isolated-handoff-2026-10-20`, PR #111 — giao diện quản lý phân loại hàng, xác nhận giá/điều kiện đơn hàng, quản lý tiền đặt cọc/thanh toán và xác nhận giao dịch.
- **Tích hợp/backend:** chỉ thực hiện sau khi kiểm tra code và hợp đồng API hiện hành. Không tự tạo endpoint giả, không giả định hai nhánh có cùng schema, không sao chép/merge/cherry-pick hai nhánh vào nhau chỉ để đồng bộ tài liệu.

Giữ PR #108 và #111 mở. Không sửa `main`, không merge PR, không deploy Production, không chạy migration lên D1 thật và không thay đổi D1/R2/secret/cấu hình Cloudflare thật khi chưa được phê duyệt riêng.

## 2. Cơ sở hiện trạng đã kiểm tra

Trên code của nhánh Admin tại thời điểm kiểm tra, schema `products` có các trường như `sku`, `title`, `price`, `stock`, `published`, `images_json` và `source_price_confirmed`; chưa thấy trường phân loại `Hàng có sẵn/Hàng đặt riêng` trong migration nền tảng đã đọc.

Schema `orders` có `status`, `payment_status`, `subtotal`, `total` và `price_confirmation_required`. `payment_status` hiện giới hạn ở `unpaid`, `pending`, `paid`, `refunded`. Trong các migration được kiểm tra, chưa thấy ledger thanh toán riêng để theo dõi nhiều lần chuyển khoản/đặt cọc, hay các trường chuyên biệt để lưu số tiền đặt cọc và số dư còn lại.

Các route đang thấy gồm `GET /api/products` và `POST /api/orders`; Admin có nhóm route riêng dưới `/api/admin`. Đây **không** phải danh sách API thanh toán đã có. Mỗi nhánh phải đọc lại code ở HEAD mới nhất trước khi sửa vì hai nhánh đang phân kỳ.

## 3. Hợp đồng phân loại sản phẩm

### Giá trị nghiệp vụ

- `in_stock` → nhãn khách hàng: **Hàng có sẵn**.
- `made_to_order` → nhãn khách hàng: **Hàng đặt riêng**.
- `unclassified` → trạng thái nội bộ để rà soát dữ liệu cũ; **không** tự suy diễn thành một trong hai loại ở trên. Admin cần lọc và phân loại thủ công trước khi cam kết tình trạng với khách.

Tên trường API/DB đề xuất thống nhất: `fulfillment_type`. Trước khi triển khai phải kiểm tra quy ước hiện tại và migration thật ở cả hai nhánh; nếu thấy đã có trường tương đương thì tái sử dụng thay vì tạo trường trùng.

### Quy tắc bắt buộc

- Loại sản phẩm và số lượng tồn kho là hai khái niệm khác nhau. Không suy ra `in_stock` chỉ vì `stock > 0`, hoặc suy ra `made_to_order` vì `stock` null/0.
- Sản phẩm cũ chưa xác định phải được đánh dấu `unclassified` hoặc trạng thái rà soát tương đương; không tự phân loại hàng loạt.
- Lưu snapshot loại hàng trong từng dòng đơn hàng khi tạo đơn, nếu kiến trúc cho phép, để thay đổi sản phẩm về sau không làm sai lịch sử đơn.
- Admin cần chỉnh sửa loại hàng và lọc theo cả ba trạng thái; website chỉ hiển thị nhãn đã xác nhận, với sản phẩm chưa phân loại thì không cam kết còn hàng/đặt riêng và hướng dẫn khách liên hệ xác nhận.
- Không thay đổi SKU/ID/tên/giá/ảnh/danh mục hiện có chỉ để bổ sung phân loại.

## 4. Hợp đồng QR chuyển khoản

### Trải nghiệm khách hàng

- Ưu tiên QR theo đơn hàng, dùng thông tin tài khoản nhận tiền đã được Admin cấu hình và nội dung chuyển khoản có mã đơn hàng dễ đối chiếu.
- Có thể giữ QR cố định do chủ dự án cung cấp làm phương án dự phòng sau khi xác minh mã QR, ngân hàng, chủ tài khoản và thông tin nhận tiền. Ảnh QR được cung cấp là tài liệu tham chiếu; chưa coi là đã giải mã/kiểm thử thành công.
- Nếu tổng tiền, giá, tiền đặt cọc hoặc điều kiện đơn chưa được xác nhận, website phải hiển thị trạng thái chờ tư vấn/xác nhận; không yêu cầu khách chuyển tiền trước.
- Chỉ điền sẵn số tiền trên QR nếu đó là số tiền phải trả đã được xác nhận từ nguồn dữ liệu tin cậy. Không lấy số tiền do trình duyệt gửi lên làm căn cứ tính tiền.
- Không tích hợp cổng thanh toán và không tuyên bố đã thanh toán tự động. QR chỉ khởi tạo hướng dẫn chuyển khoản ngân hàng.

### Luồng thanh toán

1. Khách gửi yêu cầu đặt hàng.
2. Đơn ở trạng thái chờ xác nhận; nhân viên xác nhận giá, tình trạng hàng, thời gian thực hiện/giao hàng và mọi điều kiện liên quan.
3. Chỉ sau khi xác nhận, hệ thống mới trình bày số tiền phải chuyển cho đợt đó và tạo/hiển thị QR tương ứng.
4. Khách tự chuyển khoản ngoài hệ thống.
5. Admin kiểm tra giao dịch thực tế và xác nhận thủ công; lưu người xác nhận, thời điểm, số tiền và mã tham chiếu phù hợp.
6. Trạng thái đơn/thanh toán chỉ cập nhật theo số tiền đã xác minh. Quét/mở/tải QR, ảnh chụp biên lai hoặc lời báo của khách không tự nó chứng minh tiền đã vào tài khoản.

### Dữ liệu và bảo mật

- Thiết kế phải theo dõi riêng ít nhất: tổng tiền đã được xác nhận, số tiền phải thu của từng đợt, số tiền thực nhận đã xác minh và số dư còn lại. Ưu tiên ledger/record giao dịch để hỗ trợ đặt cọc, thanh toán tiếp và kiểm toán; không chỉ ghi đè một cờ `paid`.
- Tách trạng thái “đã tạo QR/đang chờ chuyển khoản” khỏi “đã xác nhận nhận tiền”. Cần xử lý xác nhận lặp, chuyển thiếu/thừa, đơn bị hủy và thanh toán nhiều đợt.
- QR/receiver config phải lấy từ cấu hình được quản lý có kiểm soát. Không đưa secret/API key vào frontend. Chỉ công khai đúng các trường cần để khách chuyển khoản.
- Endpoint tạo QR phải lấy order, người dùng/phiên và số tiền từ dữ liệu có thẩm quyền; không chấp nhận client tùy ý thay tài khoản nhận hoặc tự tăng/giảm số tiền.
- Ghi audit log cho hành động xác nhận/thay đổi thanh toán. Không bao giờ tự động đánh dấu `paid` do QR đã được hiển thị.

## 5. Trách nhiệm theo nhánh

### Website tĩnh — PR #108

- Thiết kế nhãn/bộ lọc sản phẩm và vùng thanh toán QR theo đúng phong cách giao diện hiện tại.
- Chỉ dùng dữ liệu/API thực tế. Nếu API chưa sẵn sàng, ghi rõ trạng thái BLOCKED/contract dependency; không giả lập thành công hoặc dựng endpoint giả.
- Hiển thị mã đơn, số tiền và nội dung chuyển khoản chỉ khi server cung cấp thông tin phù hợp; có trạng thái chờ xác nhận và hướng dẫn liên hệ.
- Không đánh dấu đơn đã trả tiền ở frontend.

### Admin — PR #111

- Thêm UI quản lý loại hàng, lọc sản phẩm chưa phân loại và xem trạng thái trong chi tiết đơn.
- Thiết kế phần cấu hình tài khoản/QR và quy trình xác nhận thanh toán thủ công.
- Kiểm tra API/schema hiện hành; đề xuất migration/API cần thiết và bài test. Migration/schema/API dùng chung chỉ được sửa trên nhánh được phép sau khi ghi rõ tác động, bảo vệ tương thích và thêm test; không chạy migration trên D1 Production.
- Ghi nhận phạm vi PR #111 đang rộng hơn Admin thuần; audit/tách scope trước khi nghiệm thu, không merge PR chỉ vì kiểm thử một phần PASS.

### Hợp tác

- Cả hai bên cùng ghi rõ endpoint, request/response, enum, lỗi và test contract trước khi kết nối.
- Contract chỉ được xem là hoàn tất sau khi hai bên đối chiếu API thật và CI/test trên đúng commit.
- Nếu phát hiện cần thay đổi backend hoặc migration để tính năng hoạt động, trình bày rõ file, rủi ro, phương án rollback và test; không thao tác dữ liệu thật.

## 6. Tiêu chí nghiệm thu

- [ ] Phân loại ba trạng thái được lưu bền vững, hiển thị chính xác; không đoán loại cho dữ liệu cũ.
- [ ] Số lượng tồn kho không bị đồng nhất với loại hàng.
- [ ] Đơn chưa xác nhận giá/điều kiện không đưa ra yêu cầu thanh toán.
- [ ] QR chứa đúng tài khoản nhận/nội dung đơn; số tiền chỉ được điền sẵn khi đã xác nhận.
- [ ] Quét/mở QR không chuyển trạng thái thanh toán thành `paid`.
- [ ] Admin xác nhận thủ công có audit, chống cập nhật lặp và theo dõi được đặt cọc/số dư.
- [ ] Kiểm thử các tình huống chuyển thiếu/thừa, nhiều lần chuyển, hủy đơn, QR thiếu/sai cấu hình và sản phẩm chưa phân loại.
- [ ] Website/Admin không làm rò rỉ secret; API kiểm soát dữ liệu có thẩm quyền phía máy chủ.
- [ ] Kiểm thử được gắn với source SHA thực tế; báo cáo PASS/FAIL/BLOCKED/SKIPPED rõ ràng.
- [ ] Không merge, không Production deploy và không thay đổi dữ liệu Cloudflare thật trong đợt này.

## 7. Lưu ý khi tiếp tục

Tài liệu này phê duyệt **phạm vi chức năng và nguyên tắc tích hợp**, không tự động phê duyệt thay đổi Production, migration dữ liệu thật, cấu hình/tài khoản ngân hàng, giao dịch tiền thật hoặc merge PR. Hãy kiểm tra lại branch HEAD/API/migrations ngay trước khi sửa và cập nhật tài liệu bàn giao bằng bằng chứng mới nhất.
