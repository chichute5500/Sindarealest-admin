SINDAREALest — BẢN NÂNG CẤP WEBSITE + ADMIN, ƯU TIÊN TÍNH TOÀN VẸN

KIẾN TRÚC
- Website công khai: public/index.html.
- Trang quản trị: public/admin/index.html, truy cập /admin/.
- Pages Functions: functions/.
- Dữ liệu chính thức: Cloudflare D1 qua binding DB.
- Ảnh upload: Cloudflare R2 qua binding IMAGES.
- Ảnh sản phẩm tĩnh được đóng watermark trên file WebP; các đường dẫn ảnh đang dùng được giữ nguyên.

NGUYÊN TẮC
- Giữ giao diện tĩnh, logo, bố cục và hiệu ứng Liquid hiện có; tối ưu thêm mà không tự đổi phong cách thương hiệu.
- /api/products là nguồn dữ liệu duy nhất cho danh mục công khai. Nếu API/D1 lỗi, website báo lỗi thay vì tự chuyển sang catalogue tĩnh cũ.
- Không nạp seed nếu chưa xác minh D1 trống; script từ chối seed khi đã có sản phẩm.
- Không tự tạo project/resource, không tự xóa hoặc thu hồi token/resource.
- Tên project, database, bucket và production branch phải được xác minh từ Cloudflare và xác nhận rõ trước thay đổi từ xa.
- Không đưa token, mật khẩu, SESSION_SECRET hoặc .dev.vars/.env vào Git hay ZIP.

KIỂM TRA
1. Node.js 22.x.
2. npm install.
3. npm run check.
4. npm test.

TRƯỚC KHI DEPLOY
- Trong Cloudflare Dashboard, gắn binding DB tới đúng D1 database và binding IMAGES tới đúng R2 bucket trên Production.
- Tạo Production Secrets ADMIN_PASSWORD (ít nhất 12 ký tự) và SESSION_SECRET (ít nhất 32 ký tự, nên dùng chuỗi ngẫu nhiên dài).
- Đọc README-DEPLOY.txt. Chạy `npm run setup:cloudflare` để áp dụng migration 0003 và deploy có xác nhận. Workflow GitHub Actions không tự chạy migration/seed.

TÍNH NĂNG MỚI
- SEO metadata cho trang chủ và URL sản phẩm, Product JSON-LD, sitemap.xml, robots.txt.
- Đặt hàng lưu vào D1, quản trị trạng thái/giá, quản lý hồ sơ khách hàng.
- Yêu cầu hỗ trợ/bảo hành, phát hành mã theo chính sách cửa hàng nhập rõ ràng.
- Cài đặt trang chào mừng và backup/restore v2 có dữ liệu vận hành.

GIỚI HẠN
- Chưa bật đăng nhập tài khoản khách hàng; cần nhà cung cấp email/OTP và xác minh tên miền.
- Chưa tích hợp cổng thanh toán/email/SMS/vận chuyển.
- Ảnh R2 cũ cần tải lại qua quản trị để watermark nằm trong file gốc.
- Watermark không thể ngăn tuyệt đối chụp/quay màn hình.
- Chưa deploy Production hoặc kiểm tra bằng trình duyệt thật; xem UPGRADE-REPORT.md.
