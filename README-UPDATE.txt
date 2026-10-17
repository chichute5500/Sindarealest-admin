SINDAREALest — TÓM TẮT BẢN NÂNG CẤP SDVIP

- Giữ kiến trúc HTML/CSS/JavaScript tĩnh và hiệu ứng Liquid nền sáng/tối hiện tại; không chuyển framework, không tự đổi phong cách thương hiệu.
- Giữ 235 sản phẩm, ID/SKU/slug và URL ảnh hiện có.
- 526 ảnh sản phẩm tĩnh trong gói nền đã được đóng dấu logo ở độ mờ khoảng 68%. Ảnh tải mới qua quản trị được tối ưu sang WebP sạch trong `IMAGES`, bản gốc được lưu riêng tư trong `ORIGINALS`; watermark theo cài đặt được phủ trên ảnh lớn ở trang chi tiết/toàn ảnh, không phủ thẻ danh sách/thumbnail.
- Thêm SEO Open Graph/Twitter cho trang chủ và URL sản phẩm /san-pham/<slug>, canonical, Product JSON-LD, sitemap.xml, robots.txt và ảnh social preview 1200×630.
- Thêm form yêu cầu đặt hàng, admin đơn hàng/giá/trạng thái, danh sách khách hàng, yêu cầu hỗ trợ/bảo hành, phát hành mã bảo hành theo chính sách quản trị nhập, và nhật ký hoạt động.
- Thêm cài đặt bật/tắt/chỉnh chữ trang chào mừng mà không thay hiệu ứng Liquid.
- Thêm migration 0003, rate limit request công khai và backup/restore v2 cho dữ liệu vận hành; ảnh R2 phải sao lưu riêng.

KIỂM TRA: npm run check PASS; npm test PASS; SQLite migration và 526 ảnh WebP PASS.

CHƯA XÁC NHẬN DEPLOY PRODUCTION. Trước khi dùng, cấu hình bindings `DB`/`IMAGES`/`ORIGINALS` (`ORIGINALS` là bucket riêng tư khác `IMAGES`) cùng hai secrets trên đúng Pages project; nếu dùng GitHub Actions, chỉ đặt `CLOUDFLARE_PAGES_ORIGINALS_READY=true` sau khi xác minh, rồi mới deploy. Đăng nhập tài khoản khách hàng chưa được bật; tra cứu bảo hành không sử dụng mã xác minh. Chính sách bảo hành phải do cửa hàng xác nhận. Ảnh R2 cũ không tự bị thay đổi; watermark giao diện là lớp phủ trên ảnh lớn, không sửa file ảnh.
Xem UPGRADE-REPORT.md để biết chi tiết và các giới hạn còn lại.
