SINDAREALest — TÓM TẮT BẢN NÂNG CẤP SDVIP

- Giữ kiến trúc HTML/CSS/JavaScript tĩnh và hiệu ứng Liquid nền sáng/tối hiện tại; không chuyển framework, không tự đổi phong cách thương hiệu.
- Giữ 235 sản phẩm, ID/SKU/slug và URL ảnh hiện có.
- Đóng dấu logo ở độ mờ khoảng 68% lên 526 ảnh sản phẩm tĩnh; ảnh tải mới qua quản trị cũng được đóng dấu trước khi lưu R2.
- Thêm SEO Open Graph/Twitter cho trang chủ và URL sản phẩm /san-pham/<slug>, canonical, Product JSON-LD, sitemap.xml, robots.txt và ảnh social preview 1200×630.
- Thêm form yêu cầu đặt hàng, admin đơn hàng/giá/trạng thái, danh sách khách hàng, yêu cầu hỗ trợ/bảo hành, phát hành mã bảo hành theo chính sách quản trị nhập, và nhật ký hoạt động.
- Thêm cài đặt bật/tắt/chỉnh chữ trang chào mừng mà không thay hiệu ứng Liquid.
- Thêm migration 0003, rate limit request công khai và backup/restore v2 cho dữ liệu vận hành; ảnh R2 phải sao lưu riêng.

KIỂM TRA: npm run check PASS; npm test PASS; SQLite migration và 526 ảnh WebP PASS.

CHƯA DEPLOY PRODUCTION. Trước khi dùng, cấu hình DB/IMAGES + secrets trên đúng Pages project, sau đó chạy npm run setup:cloudflare. Đăng nhập tài khoản khách hàng chưa được bật; tra cứu bảo hành không sử dụng mã xác minh. Chính sách bảo hành phải do cửa hàng xác nhận. Ảnh R2 cũ cần tải lại qua quản trị để đóng watermark vào file.
Xem UPGRADE-REPORT.md để biết chi tiết và các giới hạn còn lại.
