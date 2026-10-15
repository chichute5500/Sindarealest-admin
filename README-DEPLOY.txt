SINDAREALest — HƯỚNG DẪN THIẾT LẬP VÀ DEPLOY AN TOÀN

0. TRƯỚC KHI BẮT ĐẦU
- Giữ nguyên ZIP gốc làm bản dự phòng. Giải nén gói mới vào thư mục riêng.
- Không xóa project, database, bucket hoặc API token nào trong lúc chưa xác định chúng đang phục vụ website nào.
- Trước khi chạy setup, mở Cloudflare Dashboard và ghi đúng: Pages Project name, Production branch, D1 database name, R2 bucket name.
- Nếu chưa chắc tên nào là website thật, dừng ở bước này. Đừng đoán từ tên miền hay tên thư mục.
- wrangler.toml cố ý không chứa `pages_build_output_dir`, để deploy trực tiếp chưa bật chế độ lấy file đó làm nguồn cấu hình production. Cloudflare cảnh báo phải đối chiếu Wrangler config với cài đặt Dashboard trước khi dùng file cấu hình làm nguồn sự thật: https://developers.cloudflare.com/pages/functions/wrangler-configuration/.

1. KIỂM TRA MÃ NGUỒN TRÊN TERMUX
Mở Termux và đi đến thư mục gốc vừa giải nén. `ls` phải cho thấy package.json, functions/, migrations/ và public/.

  pkg update
  pkg install nodejs-lts unzip
  node --version
  npm install
  npm run check
  npm test

Node cần thuộc dòng 22.x. Chỉ tiếp tục nếu `npm run check` và `npm test` đều PASS.

2. THIẾT LẬP D1 + DEPLOY CÓ XÁC NHẬN
Trước hết phải hoàn thành mục 3 bên dưới: gắn bindings DB/IMAGES đúng tài nguyên Production và lưu ADMIN_PASSWORD/SESSION_SECRET trên đúng Pages project. Script sẽ hỏi xác nhận điều này; nếu trả lời NO hoặc bỏ trống, script dừng trước khi chạy SQL hay deploy.

Chạy:

  npm run setup:cloudflare

Script sẽ:
- Xác minh Wrangler đăng nhập.
- Liệt kê Pages projects và D1 databases trong tài khoản hiện tại, rồi yêu cầu nhập tên chính xác.
- Xác minh R2 bucket bằng lệnh đọc thông tin; không tự tạo bucket.
- Kiểm tra project, database, branch; branch phải khớp production branch khi Cloudflare cung cấp thông tin này.
- Hiển thị tóm tắt, yêu cầu xác nhận bindings/secrets đã lưu, rồi yêu cầu nhập chuỗi xác nhận chính xác trước khi chạy SQL/deploy.
- Áp dụng lần lượt migrations/0001_schema.sql, migrations/0003_storefront_operations.sql, migrations/0004_admin_notifications.sql migrations/0005_address_warranty_verification.sql và migrations/0006_remove_warranty_otp.sql; migration 0006 không thay đổi schema; token tải ảnh tạm được lưu trong bảng settings đã có. Luồng OTP đã bị loại khỏi ứng dụng nhưng các bảng cũ được giữ nguyên để tương thích. Script kiểm tra các bảng/cột bắt buộc rồi mới tiếp tục.
- Chỉ nhập migrations/0002_seed_products.sql nếu bạn gõ YES và script thấy products đang có đúng 0 dòng. Nếu có sẵn sản phẩm, script từ chối seed. Migration 0003 không xóa dữ liệu sản phẩm/đơn hàng hiện có.
- Khi chọn NO, script giữ dữ liệu sản phẩm hiện có, không seed lại.
- Chỉ deploy vào Pages project đã tồn tại. Script không tự tạo hoặc xóa resource.
- Migration 0005 bổ sung địa chỉ khách hàng/giao hàng, chi tiết biến thể dòng đơn và metadata ảnh yêu cầu bảo hành. Migration 0006 không thay đổi schema; metadata token tải ảnh tạm nằm trong settings và được xóa khi khôi phục. Backup JSON không chứa byte ảnh trong R2, hãy sao lưu R2 riêng.

Nếu Wrangler chưa đăng nhập, làm theo cửa sổ trình duyệt. Đừng dán token vào mã nguồn. Nếu project, D1 hoặc R2 không xuất hiện trong danh sách, kiểm tra đúng tài khoản Cloudflare và quyền của phiên đăng nhập; không đổi sang tên đoán mò.

3. GẮN BINDINGS VÀ SECRETS — LÀM TRƯỚC KHI CHẠY SETUP/DEPLOY
Trong Cloudflare Dashboard → Workers & Pages → chọn đúng Pages project → Settings:

Bindings:
- D1 database binding, Variable name chính xác `DB`, trỏ tới D1 database đã chọn ở bước 2.
- R2 bucket binding, Variable name chính xác `IMAGES`, trỏ tới bucket đã chọn ở bước 2.

Production Variables and Secrets:
- Secret `ADMIN_PASSWORD`: mật khẩu quản trị riêng, ít nhất 12 ký tự; khuyên dùng 16 ký tự trở lên.
- Secret `SESSION_SECRET`: chuỗi ngẫu nhiên riêng, ít nhất 32 ký tự. Không dùng mật khẩu đăng nhập làm secret này.

Không đặt secrets trong public/, trong file nguồn, trong Git, hoặc gửi qua chat. Không thay SESSION_SECRET mỗi lần deploy; thay giá trị sẽ làm phiên đăng nhập cũ mất hiệu lực.

Lưu bindings/secrets trước rồi mới chạy `npm run setup:cloudflare` hoặc `npm run deploy`. Script setup sẽ chặn nếu bạn chưa xác nhận bindings/secrets. Lệnh deploy cũng yêu cầu project đã tồn tại và từ chối branch không khớp production branch nếu Cloudflare cung cấp thông tin đó.

4. GITHUB ACTIONS (TÙY CHỌN)
Workflow `.github/workflows/deploy.yml` chạy `npm install`, `npm run check`, `npm test` rồi mới deploy; workflow KHÔNG chạy migrations hoặc seed.

Trong GitHub repository, thêm Secrets:
- `CLOUDFLARE_API_TOKEN`: token chỉ có quyền tối thiểu cần cho Pages deploy và đọc danh sách project.
- `CLOUDFLARE_ACCOUNT_ID`: Account ID của tài khoản Cloudflare đúng.

Thêm Repository Variables:
- `CLOUDFLARE_PAGES_PROJECT`: tên Pages project đúng.
- `CLOUDFLARE_PAGES_BRANCH`: production branch đúng.

Token cần được tạo trong Cloudflare Dashboard và không được commit vào repository. Trước khi bật workflow, xác nhận project đã tồn tại trong cùng tài khoản với Account ID. Nếu thiếu hoặc sai cấu hình, workflow phải thất bại trước deploy.

Chọn một quy trình deploy chính (Termux hoặc GitHub Actions) và dùng nhất quán. Không cần đồng thời tạo nhiều Pages project cho cùng website.

5. KIỂM TRA SAU DEPLOY
- `https://TEN-MIEN-CUA-BAN/` mở website.
- `https://TEN-MIEN-CUA-BAN/admin/` mở trang quản trị.
- `/api/products` trả JSON từ D1. Nếu API lỗi, website sẽ hiện cảnh báo thay vì dùng catalogue tĩnh cũ.
- Mở `/sitemap.xml`, `/robots.txt` và thử chia sẻ `/san-pham/<slug>` để kiểm tra title/OG/Twitter preview.
- Thử gửi một đơn từ giỏ chọn, cập nhật trạng thái trong Admin → Đơn hàng; chỉ phát hành bảo hành sau khi đã xác nhận chính sách và đơn hàng hoàn tất.
- Đăng nhập admin bằng ADMIN_PASSWORD.
- Kiểm tra đủ sản phẩm, giá/tồn kho trống nếu chưa được xác nhận, lưu một sản phẩm thử và thử ẩn/hiện sản phẩm.
- Bật/tắt “Hiển thị giá cho khách hàng” và xác nhận API công khai không trả giá thật khi đang ẩn.
- Tải lên một ảnh WebP; đường dẫn mới sẽ có dạng `/media/<key>.webp` và ảnh được lưu trong R2.
- Tải backup JSON v2 trước khi thử Khôi phục; v2 thay thế dữ liệu danh mục, đơn hàng, khách hàng, bảo hành và nhật ký. Ảnh trong R2 phải được sao lưu riêng.
- Đăng xuất rồi thử tải `/api/admin/products`; API không được trả dữ liệu quản trị khi chưa đăng nhập.

6. CÁCH XỬ LÝ LỖI MÀ KHÔNG LÀM MẤT DỮ LIỆU
- `Project not found`: kiểm tra tài khoản Wrangler và tên Pages Project trong Dashboard. Không cho script tạo project mới.
- `/api/products` trả 503: kiểm tra binding DB, migrations/schema và hoạt động D1.
- Admin không đăng nhập: kiểm tra Production Secrets và bảng admin_login_attempts trong D1.
- Upload ảnh thất bại: kiểm tra binding IMAGES và R2 bucket.
- Trang `/admin/` hiện trang chủ: kiểm tra đã deploy đúng gói này và file public/_redirects.
- Nếu check/test lỗi: giữ nguyên toàn bộ thông báo để xác định lỗi trước khi deploy lại.
- Không xóa D1 hoặc R2, không chạy lại seed trong database đã có dữ liệu, không thu hồi token đang được workflow sử dụng nếu chưa có token thay thế.
