SINDAREALest — BẢN NÂNG CẤP WEBSITE + ADMIN, ƯU TIÊN TÍNH TOÀN VẸN

KIẾN TRÚC
- Website công khai: public/index.html.
- Trang quản trị: public/admin/index.html, truy cập /admin/.
- Pages Functions: functions/.
- Dữ liệu chính thức: Cloudflare D1 qua binding DB.
- Ảnh WebP hiển thị/logo: Cloudflare R2 binding `IMAGES`.
- Ảnh gốc sản phẩm và ảnh bằng chứng bảo hành: Cloudflare R2 binding `ORIGINALS`, bắt buộc là bucket riêng tư khác `IMAGES`.
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
- Trong Cloudflare Dashboard, gắn bindings `DB`, `IMAGES` và `ORIGINALS` tới đúng tài nguyên trên Production. `ORIGINALS` phải là bucket R2 riêng tư khác `IMAGES`, không public access, `r2.dev` hay custom domain công khai.
- Tạo Production Secrets `ADMIN_PASSWORD` (ít nhất 12 ký tự) và `SESSION_SECRET` (ít nhất 32 ký tự, nên dùng chuỗi ngẫu nhiên dài). Nếu dùng GitHub Actions để deploy, chỉ đặt repository variable `CLOUDFLARE_PAGES_ORIGINALS_READY=true` sau khi đã xác minh `ORIGINALS` riêng tư và binding đúng Production; guard sẽ chặn deploy nếu chưa xác minh.
- Đọc README-DEPLOY.txt. Chạy `npm run setup:cloudflare` để áp dụng các migration `0001`, `0003`–`0006` theo thứ tự và deploy có xác nhận; chỉ seed `0002` khi người vận hành chọn YES và D1 được xác minh đang trống. Workflow GitHub Actions deploy không tự chạy migration/seed.

TÍNH NĂNG MỚI
- SEO metadata cho trang chủ và URL sản phẩm, Product JSON-LD, sitemap.xml, robots.txt.
- Đặt hàng lưu vào D1, quản trị trạng thái/giá, quản lý hồ sơ khách hàng.
- Yêu cầu hỗ trợ/bảo hành, phát hành mã theo chính sách cửa hàng nhập rõ ràng.
- Cài đặt trang chào mừng và backup/restore v2 có dữ liệu vận hành.

GIỚI HẠN
- Chưa bật đăng nhập tài khoản khách hàng; cần thiết kế và triển khai cơ chế xác thực riêng nếu muốn mở tính năng này.
- Chưa tích hợp cổng thanh toán/email/SMS/vận chuyển.
- Watermark được phủ trên ảnh lớn ở trang chi tiết/toàn ảnh theo cài đặt; không phủ thẻ danh sách/thumbnail. Watermark overlay không sửa file ảnh. Ảnh sản phẩm tĩnh trong gói nền đã được xử lý riêng; ảnh tải mới lưu WebP sạch trong `IMAGES`, file gốc trong `ORIGINALS`.
- Watermark không thể ngăn tuyệt đối chụp/quay màn hình.
- Chưa deploy Production hoặc kiểm tra bằng trình duyệt thật; xem UPGRADE-REPORT.md.


[STATUS NOTE — 2026-10-22] This file is a legacy repository overview/audit snapshot, not the active task/handoff specification. It may describe older architecture, deployment assumptions or completed work. For current storefront scope, branch, safety boundaries and open tasks, read `docs/handoff/CURRENT-STATE.md` first. Do not use this file to override the current handoff or authorize Admin/backend/production changes.
