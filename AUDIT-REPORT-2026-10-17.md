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

**Điều kiện triển khai — cập nhật 18-10-2026:** Backup D1 Production mới đã thành công (workflow run `39057147336`; artifact còn hiệu lực khi migration bắt đầu). Migration 0007 đã được áp dụng và hậu kiểm thành công qua workflow `39057640886`: bảng `order_contact_details` tồn tại, 1 đơn hàng, 1 snapshot liên hệ và 0 đơn hàng thiếu snapshot. Việc này chỉ thay đổi schema/dữ liệu D1; không triển khai website. Mã nguồn tham chiếu bảng mới vẫn cần được phát hành có kiểm soát sau khi hoàn tất kiểm tra binding `ORIGINALS`, xác minh đúng target Cloudflare Pages và kiểm thử preview.

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

### 7. Endpoint thông báo đẩy là đầu vào của kết nối máy chủ
**Mức độ:** Trung bình — giảm bề mặt SSRF và tải phát sinh khi gửi thông báo.

Trước đây API quản trị chỉ cần URL bắt đầu bằng HTTPS để lưu endpoint Web Push. Khi cập nhật đơn hàng, máy chủ gửi yêu cầu ra các endpoint đã lưu; một URL tùy ý có thể biến luồng thông báo thành kết nối outbound không mong muốn. Ngoài ra, việc tải tất cả subscription và gửi đồng thời không có giới hạn gây tải không cần thiết nếu dữ liệu phình to.

**Đã sửa:** Kiểm tra endpoint theo danh sách host dịch vụ push của trình duyệt trước khi lưu và kiểm tra lại trước khi gửi; query và danh sách gửi đều giới hạn 50 subscription gần nhất; tắt tự động theo redirect. Service worker cũng chỉ chấp nhận URL thông báo cùng origin và trong đường dẫn /admin/, không cho payload chuyển hướng ra website khác. API xóa subscription vẫn cho phép xóa endpoint HTTPS cũ để không khóa đường dọn dữ liệu.

### 8. JSON request body cần giới hạn trước khi parse
**Mức độ:** Trung bình — giảm nguy cơ tiêu thụ bộ nhớ quá mức ở các API công khai/quản trị nhạy cảm.

Một số route trước đây gọi `request.json()` trực tiếp. Giới hạn số trường sau khi parse không ngăn được request có body rất lớn khiến Worker phải đọc và giải mã toàn bộ dữ liệu trước khi từ chối.

**Đã sửa:** Thêm `readJsonBodyLimited()` đọc body theo luồng, kiểm tra `Content-Length` nếu có và vẫn áp giới hạn khi header thiếu/không đáng tin. Áp dụng cho tạo đơn hàng (64 KB), tra cứu bảo hành (4 KB), gửi yêu cầu bảo hành (8 KB), đăng nhập admin (4 KB), tạo mô tả AI (8 KB), cập nhật đơn hàng admin (32 KB), tạo/sửa sản phẩm (32 KB), cài đặt (8 KB), thao tác bảo hành (8 KB), đăng ký push (8 KB), xóa đăng ký push (4 KB) và reset SKU (8 KB). Restore có parser riêng cùng giới hạn 20 MB. Có test cho JSON hợp lệ, JSON hỏng, payload vượt giới hạn khai báo/thực tế và xác nhận các route được áp dụng helper.

### 9. Backup phải đọc dữ liệu ở cùng một thời điểm
**Mức độ:** Trung bình — tính nhất quán của bản sao lưu.

Trước đây, backup đọc sản phẩm ở một truy vấn, rồi đọc các bảng vận hành/cài đặt bằng nhiều truy vấn độc lập chạy song song. Khi đơn hàng, trạng thái bảo hành hoặc cài đặt đổi trong lúc backup, tệp có nguy cơ chứa dữ liệu lấy từ các thời điểm khác nhau; liên kết đơn hàng–khách hàng hoặc thông tin liên hệ theo đơn có thể không còn nhất quán.

**Đã sửa:** Gom toàn bộ các lượt đọc bảng và cài đặt vào một D1 batch duy nhất để có cùng snapshot; test xác nhận backup chỉ gọi một batch. Backup và restore cũng dùng chung giới hạn 20 MB/5.000 bản ghi, nên không xuất tệp lớn hơn khả năng khôi phục an toàn.

### 10. Giới hạn payload upload ảnh bảo hành trước khi phân tích multipart
**Mức độ:** Trung bình — chống lãng phí bộ nhớ/thời gian ở endpoint công khai.

Trước đây mã chỉ kiểm tra kích thước `File` sau khi `request.formData()` đã phân tích toàn bộ multipart. Với request có `Content-Length` khai báo quá lớn, Worker vẫn có thể phải xử lý payload trước khi từ chối.

**Đã sửa:** Đọc multipart theo luồng với trần 6 MB và từ chối ngay khi tổng byte vượt giới hạn, kể cả khi request không có `Content-Length`; chỉ sau khi body nằm trong giới hạn mới tái tạo request và gọi `formData()`. Giới hạn ảnh thực tế vẫn là 5 MB và vẫn kiểm tra chữ ký RIFF/WEBP. Regression test bao gồm cả header khai báo quá lớn lẫn body stream quá lớn không có header.

### 11. Upload ảnh sản phẩm quản trị cũng cần giới hạn multipart trước khi parse
**Mức độ:** Trung bình — bảo vệ bộ nhớ khi tải ảnh sản phẩm lên từ admin.

Route upload ảnh sản phẩm trước đây gọi `formData()` trước khi kiểm tra giới hạn 5 MB cho ảnh hiển thị và 20 MB cho ảnh gốc. Vì vậy một multipart body quá lớn vẫn có thể bị đọc/phân tích trước khi kiểm tra kích thước từng tệp.

**Đã sửa:** Dùng chung `readBodyBytesLimited()` với trần tổng multipart 26 MB, bao gồm cả request không có `Content-Length`; chỉ sau khi nằm trong giới hạn mới parse form data. Giữ kiểm tra chữ ký WebP cho ảnh hiển thị và bổ sung kiểm tra magic bytes JPEG/PNG/WebP cho ảnh gốc trước khi ghi R2. Regression test xác nhận tệp gốc giả mạo bị từ chối trước mọi thao tác lưu. Bổ sung kiểm tra trường `original` bắt buộc; nếu thiếu ảnh gốc thì từ chối trước khi ghi cả R2 riêng tư lẫn bucket ảnh công khai.

### 12. Chặn cấp trùng mã bảo hành khi hai admin thao tác đồng thời
**Mức độ:** Cao — tính toàn vẹn dữ liệu bảo hành.

Route cấp bảo hành trước đây kiểm tra mã đã tồn tại bằng một truy vấn, sau đó mới ghi mã mới. Hai yêu cầu đồng thời có thể cùng vượt qua bước kiểm tra ban đầu.

**Đã sửa:** Chuyển điều kiện chống trùng vào chính câu lệnh `INSERT ... SELECT ... WHERE NOT EXISTS`, gộp ghi bảo hành và audit log vào một batch; chỉ trả thành công khi câu lệnh insert thực sự thêm bản ghi. Nếu một yêu cầu khác đã cấp trước, trả HTTP 409. Có regression test cho cả nhánh thành công và xung đột.

### 13. Giới hạn kích thước và số bản ghi khi khôi phục backup
**Mức độ:** Trung bình — độ ổn định của Worker và D1.

Backup/restore trước đây không có cùng giới hạn tổng bản ghi và kích thước: backup có thể xuất một tệp lớn hơn khả năng khôi phục an toàn, trong khi restore cho phép tới 20.000 bản ghi ở từng mảng riêng lẻ. Tệp lớn có thể khiến Worker phải tạo batch khổng lồ hoặc vượt thời gian/giới hạn tài nguyên.

**Đã sửa:** Backup và restore thống nhất giới hạn tối đa 20 MB và tổng 5.000 bản ghi. Restore đọc JSON theo luồng và từ chối payload quá lớn. Bộ đọc dùng chung tăng buffer theo từng phần, không giữ đồng thời toàn bộ mảng chunks và bản sao byte thứ hai. Backup đếm tổng bản ghi trong cùng D1 batch trước; mỗi truy vấn bảng chỉ trả dữ liệu nếu tổng nằm trong ngân sách, tránh nạp hàng chục nghìn dòng vào bộ nhớ rồi mới từ chối. Có regression test cho giới hạn tổng bản ghi và giới hạn từng truy vấn.

### 14. Cấp SKU khi thêm sản phẩm cần giới hạn phạm vi và kiểm tra số an toàn
**Mức độ:** Thấp–trung bình — hiệu năng và khả năng phục hồi khi dữ liệu SKU bất thường.

Luồng thêm sản phẩm trước đây đọc toàn bộ cột SKU để tìm số lớn nhất của một danh mục. Khi catalog lớn hơn, truy vấn đọc nhiều dữ liệu không liên quan; hậu tố SKU bị hỏng/quá lớn cũng có thể tạo phép tính số không an toàn.

**Đã sửa:** Chỉ đọc SKU khớp prefix danh mục đang thêm và chỉ dùng hậu tố nếu `Number.isSafeInteger()` hợp lệ. Các map alias danh mục/nhãn nhật ký cũng dùng kiểm tra own-property để khóa các khóa prototype như `constructor`; bảng quy tắc SKU động dùng object không có prototype. Giữ vòng retry khi hai admin cùng cấp một SKU; regression tests bao gồm danh mục tên `constructor`.

### 15. Giới hạn công khai phải fail-closed nếu không đọc được bộ đếm
**Mức độ:** Trung bình — chống lạm dụng API công khai.

Bộ giới hạn tần suất đã ghi bộ đếm nhưng nếu kết quả đọc bộ đếm không có hoặc sai định dạng thì trước đây có thể diễn giải thành 0 lần thử và cho phép yêu cầu tiếp tục.

**Đã sửa:** Yêu cầu bộ đếm sau batch phải là số nguyên an toàn từ 1 trở lên. Nếu không xác minh được, helper ném lỗi để endpoint gọi trả lỗi dịch vụ thay vì tắt giới hạn. Thêm regression test cho bộ đếm bị thiếu và cập nhật mock kiểm thử để mô phỏng kết quả D1 hợp lệ.

### 16. Một timestamp sản phẩm sai định dạng có thể làm hỏng toàn bộ sitemap
**Mức độ:** Thấp–trung bình — SEO và khả năng phục hồi.

Sitemap gọi `toISOString()` trực tiếp trên mọi `updated_at`. Một giá trị ngày lỗi hoặc sai kiểu có thể làm toàn bộ endpoint trả 503 dù các URL sản phẩm vẫn hợp lệ.

**Đã sửa:** Chỉ phát `lastmod` khi timestamp có thể phân tích được; URL sản phẩm vẫn có trong sitemap nếu timestamp lỗi. Regression test bao gồm ngày hợp lệ, chuỗi không hợp lệ và giá trị sai kiểu.

### 17. API sản phẩm công khai có thể lộ số lượng tồn kho nội bộ
**Mức độ:** Thấp–trung bình — lộ dữ liệu vận hành không cần thiết.

Hàm chuyển đổi sản phẩm trả trường `stock` từ D1 cả khi `publicView: true`. Giao diện công khai không dùng số lượng tồn kho, nên khi admin nhập tồn kho thực, API công khai có thể tiết lộ con số này.

**Đã sửa:** Khi tạo bản ghi cho public API, `stock` luôn trả `null`; trang admin vẫn nhận giá trị tồn kho thật. Regression test kiểm tra cả hai chế độ.

### Tạo mô tả bằng AI trong trang admin
Giao diện admin đang gọi `/api/admin/ai-description`, nhưng phiên bản route ban đầu chỉ đọc `OPENAI_API_KEY` và không sử dụng Workers AI binding dù dự án đang ưu tiên Cloudflare Workers AI.

**Đã sửa trên nhánh rà soát:** Route ưu tiên `context.env.AI.run()`, mặc định model `@cf/meta/llama-3.2-11b-vision-instruct`, kiểm tra tên model tùy chỉnh, trả lỗi rõ nếu chưa cấu hình binding/khóa, giữ OpenAI làm đường dự phòng khi chỉ có `OPENAI_API_KEY`, và giới hạn tối đa 20 yêu cầu mỗi IP trong một giờ để hạn chế lạm dụng quota. Có regression test cho binding Workers AI, model mặc định/tùy chỉnh, đầu vào, cấu hình thiếu, dữ liệu không hợp lệ, fallback OpenAI, xác thực khóa API và chặn gọi AI khi vượt giới hạn.

**Việc cần cấu hình ngoài mã:** Pages Functions cần một Workers AI binding có tên chính xác `AI` trong cả môi trường Production và Preview; cần redeploy để binding có hiệu lực. Tạo API token hoặc đồng ý điều khoản model không tự tạo binding cho Pages. Hướng dẫn chính thức: https://developers.cloudflare.com/pages/functions/bindings/

## Các kiểm tra/điểm vận hành cần chú ý

### Trạng thái deploy
CI trên head hiện tại đã pass toàn bộ các bước kiểm tra, kiểm thử và `npm audit` ở [run 39049693138](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39049693138); các kiểm thử nguồn/tích hợp, kiểm thử D1 migration cục bộ và regression tests mới đều xanh, `npm audit` báo 0 vulnerability trong dependency graph đã cài ở lần chạy đó. Bộ kiểm thử mới nhất cũng xác nhận số tồn kho nội bộ không được trả qua API công khai, nhưng vẫn giữ nguyên ở API quản trị. Đây chỉ xác nhận mã nguồn/test trên nhánh rà soát, không phải kiểm thử E2E production và không có nghĩa production đã được cập nhật.

Workflow gần nhất `39037562800` trên commit gốc cho kết quả tổng thể xanh, nhưng bước **Deploy to verified Pages project** bị **skipped** vì biến repo `CLOUDFLARE_PAGES_ORIGINALS_READY` không bằng `true`. Do đó không được diễn giải kết quả workflow đó là đã triển khai mã mới lên web chính. Giữ cổng bảo vệ này cho tới khi chủ dự án quyết định rõ việc bật deploy.

**Bổ sung cổng an toàn D1:** script deploy giờ chạy truy vấn chỉ đọc trên database `sindarealest-db` để đếm số đơn hàng còn thiếu snapshot trong `order_contact_details`. Nếu bảng chưa tồn tại hoặc còn đơn hàng thiếu snapshot sau migration 0007, deploy sẽ dừng. Truy vấn không ghi/xóa dữ liệu và script không tự chạy migration. CI cũng áp dụng migrations 0001–0007 lên một D1 cục bộ mới, tạo đơn hàng fixture trước migration 0007 rồi kiểm tra dữ liệu liên hệ lịch sử được backfill đúng; không dùng database từ xa.

### Ảnh bằng chứng bảo hành
Nhánh gốc đã có các biện pháp quan trọng: ảnh khiếu nại mới phải lưu ở binding R2 riêng `ORIGINALS`, không dùng chung bucket hiển thị `IMAGES`; route đọc ảnh cần xác thực admin; media công khai từ chối đường dẫn `warranty-claims/`; script kiểm tra binding yêu cầu hai bucket tách biệt và xác minh public access của `ORIGINALS` đã tắt. Không được bỏ các kiểm tra này để “làm cho deploy chạy”.

### Phiên quản trị
Đã rà soát thấy thời hạn session 10 phút, cookie `HttpOnly; Secure; SameSite=Strict`, kiểm tra session trên endpoint quản trị, giới hạn thử đăng nhập và có bài test ngăn middleware cấp lại cookie hợp lệ ngay sau logout. Cần giữ các regression tests này khi sửa về sau.

### Backup/restore
Restore có thể thay thế dữ liệu sản phẩm và, với bản backup có dữ liệu vận hành, xóa rồi khôi phục các bảng đơn hàng/khách hàng/bảo hành/nhật ký. Đây là thao tác phá hủy có chủ đích, không tự động chạy qua deploy; chỉ dùng sau khi đã tải backup mới và kiểm tra đúng môi trường D1. Regression test mới xác nhận backup v1 không xóa dữ liệu vận hành mà nó không chứa, v2 cũ được tổng hợp snapshot liên hệ, backup lỗi/trùng bị từ chối trước khi ghi và toàn bộ restore chỉ dùng một D1 batch nguyên tử.

## Giới hạn kiểm tra

Đã thực hiện kiểm tra HTTP chỉ đọc trên production ngày 2026-10-17 và chạy lại smoke check read-only:  trang chủ tải được; `/api/products` trả danh mục 236 sản phẩm; `/api/settings` trả cài đặt; `robots.txt` và `sitemap.xml` đọc được (sitemap 237 URL); `/san-pham/SD-SN001` trả nội dung và metadata OG/canonical phù hợp. Đây là smoke check bên ngoài, không phải kiểm thử trình duyệt đầy đủ. Thử đọc preview theo tên nhánh rà soát trả `login_required`; không có phiên đăng nhập Preview được cung cấp nên không thể thực hiện browser E2E, và không tìm cách vượt qua lớp bảo vệ đó.

Kiểm tra không có cookie đăng nhập cho `/api/admin/session`, `/api/admin/products`, `/api/admin/backup` và `/api/admin/warranties` đều nhận HTTP 401 như mong đợi. Chưa thực hiện đăng nhập admin hoặc thao tác ghi/sửa/xóa đơn hàng, sản phẩm, bảo hành trên production; không xem được giá trị secrets/bindings riêng tư của Cloudflare. Chưa thể xác nhận các sửa đổi ở nhánh rà soát đã chạy trên production. Cần kiểm thử runtime và xác minh binding sau khi bản sửa được duyệt/triển khai; báo cáo không tuyên bố website đã hoàn thiện 100%.

### Dependency/build integrity
The audit also found that CI installed dependencies with `--no-audit --no-fund`, both primary workflows used old action versions that emitted a Node.js 20 deprecation warning, and the repository did not contain `package-lock.json`. On this review branch, the direct Wrangler dependency is pinned to `4.149.0`, GitHub Actions references are refreshed to `@v7`, and CI/deploy now run `npm audit --audit-level=high` after installation. **Remaining limitation:** no lockfile is committed yet, so npm can still resolve transitive dependencies to different versions on later runs. A checked-in, tested lockfile should be the next reproducibility improvement; do not claim fully reproducible builds until that is done.

### Tăng cường giới hạn đăng nhập khi bộ đếm D1 không xác minh được
**Mức độ:** Cao — bảo vệ chống dò mật khẩu quản trị.

Rà soát sâu bổ sung phát hiện bộ giới hạn đăng nhập nguyên tử vẫn diễn giải kết quả SELECT bị thiếu/sai thành `0` lần thử. Nếu D1 trả kết quả không thể xác minh, luồng đăng nhập có thể tiếp tục mà không chứng minh được giới hạn đã áp dụng.

**Đã sửa trên nhánh rà soát:** `rateLimitLogin()` giờ yêu cầu bộ đếm là số nguyên an toàn từ 1 trở lên; nếu thiếu hoặc sai, helper ném lỗi để endpoint đăng nhập trả 503 và không xác thực mật khẩu trong lượt đó. Đã bổ sung regression test cho kết quả bộ đếm rỗng; test giới hạn đồng thời và reset cửa sổ vẫn được giữ.

### Kiểm tra quan hệ giữa đơn hàng, dòng đơn và yêu cầu bảo hành khi khôi phục
**Mức độ:** Cao — tính toàn vẹn dữ liệu nghiệp vụ.

Rà soát bổ sung phát hiện bộ xác thực backup kiểm tra riêng việc tồn tại của `order_id`, `order_item_id` và `customer_id`, nhưng chưa chứng minh các bản ghi có liên hệ với nhau đúng cách. Backup bị chỉnh sửa có thể gắn bảo hành vào dòng sản phẩm của đơn khác hoặc gắn yêu cầu bảo hành vào khách hàng không thuộc đơn hàng.

**Đã sửa trên nhánh rà soát:** xác thực quan hệ `warranty.order_id` ↔ `order_item.order_id` và `warranty_claim.order_id` ↔ `order.customer_id` trước khi tạo bất kỳ câu lệnh ghi D1 nào. Bổ sung regression tests xác nhận hai trường hợp bị từ chối và không phát sinh batch ghi.

### Từ chối bản ghi backup rỗng/sai kiểu trước khi kiểm tra trường
**Mức độ:** Trung bình — độ bền của API khôi phục.

Các mảng backup JSON có thể chứa `null`, chuỗi hoặc mảng lồng thay vì bản ghi đối tượng. Việc truy cập trường trực tiếp có thể làm validation ném lỗi ngoài dự kiến thay vì trả lỗi dữ liệu có kiểm soát.

**Đã sửa trên nhánh rà soát:** kiểm tra mọi phần tử trong các mảng dữ liệu vận hành và sản phẩm phải là đối tượng hợp lệ trước khi đọc trường; bổ sung regression tests xác nhận trả 400 và không ghi D1 với bản backup có hàng `null`.

### Bảo đảm phiên tra cứu bảo hành chỉ tạo một yêu cầu khi gửi đồng thời
**Mức độ:** Cao — ngăn gửi trùng và sử dụng lại phiên tra cứu.

Trước khi sửa, endpoint kiểm tra token rồi mới chèn yêu cầu theo các bước tách rời; hai request đồng thời có thể cùng vượt qua bước kiểm tra trước khi token bị xóa.

**Đã sửa trên nhánh rà soát:** câu lệnh tạo yêu cầu giờ chỉ chèn nếu token còn tồn tại và chưa hết hạn trong cùng D1 batch; xóa token, đính kèm và ghi audit chỉ diễn ra khi bản ghi yêu cầu thực sự được tạo. Nếu request thua cuộc đua, endpoint trả 409. Bổ sung regression test cho kết quả chèn thành công và token đã bị tiêu thụ.

### Điều chỉnh giới hạn restore theo tài liệu D1
**Mức độ:** Cần chính xác hóa — tránh từ chối backup hợp lệ.

Một bản sửa trước đó đã diễn giải giới hạn “approximately 5,000 bindings” của tài liệu D1 thành giới hạn tổng tham số SQL của một batch. Đọc đúng ngữ cảnh, giới hạn này nói về resource bindings mà Worker có thể gắn (ví dụ D1 databases), không xác lập một ngân sách 4.500 tham số SQL cho toàn bộ batch.

**Đã điều chỉnh trên nhánh rà soát:** gỡ chốt 4.500 tham số không có căn cứ tài liệu và thay regression test: bản backup hợp lệ có 650 hồ sơ khách hàng không còn bị từ chối vì giới hạn giả định này; vẫn phải qua xác thực schema/quan hệ, giới hạn 20 MB, giới hạn 5.000 bản ghi và batch D1 nguyên tử. Giới hạn truy vấn/thời gian thực tế của D1 vẫn áp dụng; nếu batch vượt giới hạn thực thi, restore trả lỗi có kiểm soát và batch nguyên tử không để lại một phần dữ liệu.

Nguồn: https://developers.cloudflare.com/d1/platform/limits/

### Đồng bộ giới hạn tệp khôi phục trên giao diện và API
**Mức độ:** Thấp — tránh lỗi trải nghiệm khi người dùng chọn tệp backup.

Giao diện quản trị từng cho phép chọn tệp JSON tới 40 MB, trong khi API restore giới hạn 20 MB. Người dùng có thể chọn tệp được giao diện chấp nhận nhưng bị server từ chối bằng HTTP 413.

**Đã sửa trên nhánh rà soát:** giao diện giờ từ chối tệp lớn hơn 20 MB ngay khi chọn; regression test xác nhận giới hạn giao diện khớp giới hạn API. Kiểm thử toàn diện pass tại [CI run 39049190761](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39049190761).


### Backup JSON không bao gồm tệp nhị phân trong R2
**Mức độ:** Trung bình — tránh hiểu nhầm rằng tệp backup D1 có thể phục hồi cả nội dung ảnh đã mất.

Backup JSON xuất dữ liệu sản phẩm và metadata/khóa ảnh bảo hành trong D1, nhưng không tải nội dung object ảnh từ bucket R2 vào tệp JSON. Vì vậy khôi phục backup chỉ tái lập dữ liệu D1; ảnh vẫn cần tồn tại trong các bucket R2 tương ứng. Đã bổ sung cảnh báo ở giao diện tải và khôi phục backup để người quản trị sao lưu R2 riêng. Regression test xác nhận cảnh báo này không bị bỏ mất.

**Giới hạn còn lại:** Quy trình sao lưu object R2 và xác minh khả năng khôi phục R2 vẫn cần thực hiện riêng; không thể tuyên bố backup JSON là bản sao lưu đầy đủ cho toàn bộ website.


### Kiểm tra trùng ID mã bảo hành trong backup
**Mức độ:** Thấp — lỗi dữ liệu không hợp lệ cần bị từ chối trước khi bắt đầu restore.

Bộ xác thực backup đã kiểm tra mã bảo hành trùng nhưng chưa kiểm tra riêng ID bản ghi bảo hành trùng. D1 vẫn sẽ rollback batch nếu khóa chính bị trùng, nhưng lỗi chỉ xuất hiện khi ghi và có thể trả lỗi dịch vụ thay vì chỉ rõ tệp backup sai. Đã bổ sung tập ID bảo hành riêng và regression test bảo đảm backup có ID bảo hành trùng trả 400 trước khi phát sinh batch ghi.

### Vệ sinh danh sách kiểm thử
Một kiểm tra cuối danh sách lệnh `npm test` phát hiện `tests/warranty-claim-atomicity.test.mjs` bị gọi lặp hai lần. Đã xóa lệnh trùng để CI không chạy lại cùng bộ test vô ích; [CI run 39049693138](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39049693138) xác nhận toàn bộ bước kiểm tra và kiểm thử vẫn pass.

### Khôi phục lớp Liquid Glass cho thẻ sản phẩm

**Mức độ:** Trải nghiệm giao diện — đồng nhất bề mặt kính ở chế độ sáng/tối.

Rà soát giao diện phát hiện thẻ sản phẩm có nền bán trong suốt nhưng thiếu `backdrop-filter`, vì vậy nhìn giống lớp phủ mờ phẳng hơn các thành phần kính khác.

**Đã sửa trên nhánh rà soát:** thêm blur + saturate và highlight/inset border nhiều lớp cho thẻ sản phẩm; trên màn hình nhỏ giảm blur để cân bằng hiệu năng. Giữ nguyên ảnh, bố cục, dữ liệu và hiệu ứng chuyển theme. Thêm regression test để tránh mất lớp kính ở desktop/mobile.

**CI sau thay đổi:** [run 39050041087 — toàn bộ bước kiểm tra và test pass](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39050041087).

### Ranh giới xác minh trước khi phát hành

- Mã nguồn và regression tests đã được kiểm tra trên nhánh audit; dependency audit hiện không báo lỗ hổng mức cao.
- Chưa có bản preview của đúng commit được xác minh bằng trình duyệt thật. Không tự tạo deployment vì cấu hình nhánh production trong Cloudflare phải được xác nhận trước, tránh vô tình đưa nhánh thử lên production.
- Chưa kiểm tra được các binding/secrets trong Cloudflare Dashboard từ GitHub; đặc biệt cần xác minh D1 migration 0007 và R2 `ORIGINALS` trước khi phát hành.
- Tệp backup JSON không chứa nội dung ảnh nhị phân của R2. Muốn có khả năng khôi phục đầy đủ phải sao lưu và kiểm tra phục hồi bucket R2 riêng.

### Kết quả smoke test chỉ đọc trên production

Ngày 17-10-2026, đã kiểm tra các URL công khai mà không gửi form hay thay đổi dữ liệu:

- Trang chủ tải được, canonical và Open Graph trỏ đúng `https://sindarealest2.pages.dev/`.
- `/api/products` trả 236 sản phẩm; giá công khai vẫn là `null`.
- `/sitemap.xml` có 237 URL, bao gồm đường dẫn SKU ổn định.
- `/api/admin/session` không có cookie trả HTTP 401, đúng hành vi bảo vệ phiên quản trị.
- **Phát hiện production cần sửa:** API danh mục công khai đang để lộ trường tồn kho khác null cho SKU `SD-TL001`; các mã khác trong mẫu trả null. Nhánh audit đã sửa `fromRow(..., { publicView: true })` để luôn ẩn tồn kho công khai và có regression test. Vì chưa deploy, đây vẫn là vấn đề tồn tại trên web chính tại thời điểm kiểm tra.
