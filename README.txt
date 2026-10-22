SINDAREALest — WEBSITE + QUẢN TRỊ CLOUDFLARE

Gói này nâng cấp từ SDVIP.zip, giữ kiến trúc HTML/CSS/JavaScript tĩnh + Cloudflare Pages Functions + D1 + R2 và giữ hiệu ứng Liquid nền sáng/tối hiện có.

CÁC PHẦN CHÍNH
- public/index.html: website công khai, URL chi tiết sản phẩm, giỏ chọn/đặt hàng, form hỗ trợ/bảo hành.
- public/admin/index.html: quản trị tại /admin/ — sản phẩm, đơn hàng, khách hàng, bảo hành, cài đặt trang chào mừng, sao lưu/khôi phục và nhật ký hoạt động.
- functions/_middleware.js: metadata SEO HTML theo sản phẩm và URL canonical.
- functions/api/: API sản phẩm, cài đặt, đặt hàng, hỗ trợ/bảo hành và quản trị.
- functions/media/: phục vụ ảnh upload từ R2.
- migrations/0001_schema.sql: schema ban đầu.
- migrations/0002_seed_products.sql: 235 sản phẩm nguồn; giá/tồn kho không xác nhận vẫn để NULL.
- migrations/0003_storefront_operations.sql: khách hàng, đơn hàng, bảo hành, audit log và rate limit.
- public/og-sindarealest.jpg: ảnh social preview 1200×630.
- public/watermark.webp: watermark tối ưu cho ảnh upload mới.
- data/legacy-products.json: nguồn đối chiếu danh mục.
- scripts/check-project.mjs, tests/: kiểm tra cấu trúc, dữ liệu, API mock và metadata.
- scripts/setup-cloudflare.mjs: xác minh tài nguyên rồi mới xác nhận migration/seed/deploy.
- scripts/deploy-cloudflare.mjs: deploy vào Pages project đã tồn tại.
- .github/workflows/deploy.yml: pipeline kiểm tra trước deploy; không tự chạy migration hoặc seed.

BẮT ĐẦU
1. Giữ SDVIP.zip làm bản gốc đối chiếu.
2. Giải nén gói nâng cấp vào thư mục riêng.
3. Dùng Node.js 22.x, chạy `npm install`, `npm run check`, `npm test`.
4. Đọc README-DEPLOY.txt và UPGRADE-REPORT.md trước khi deploy.
5. Cấu hình binding DB/IMAGES và secrets ADMIN_PASSWORD/SESSION_SECRET trên đúng Pages project. Sau đó chạy `npm run setup:cloudflare` để áp dụng migration 0003 và deploy có xác nhận.

LƯU Ý
- Không deploy Production trong quá trình kiểm tra này; cần người vận hành xác minh đúng tài nguyên Cloudflare.
- Đăng nhập tài khoản khách hàng chưa được bật; hồ sơ khách hàng được tạo từ yêu cầu đặt hàng. Cần thiết kế cơ chế xác thực riêng trước khi triển khai đăng nhập.
- Mã bảo hành chỉ phát hành theo chính sách cửa hàng nhập rõ ràng và sau khi đơn hoàn tất.
- Ảnh sản phẩm tĩnh đã được đóng watermark; ảnh R2 cũ cần tải lại qua quản trị để watermark nằm trong file gốc. Ảnh R2 cần sao lưu riêng.
- Watermark không thể ngăn tuyệt đối chụp/quay màn hình.


[STATUS NOTE — 2026-10-22] This file is a legacy repository overview, not the active task/handoff specification. It may describe older architecture, deployment assumptions or completed work. For current storefront scope, branch, safety boundaries and open tasks, read `docs/handoff/CURRENT-STATE.md` first. Do not use this file to override the current handoff or authorize Admin/backend/production changes.
