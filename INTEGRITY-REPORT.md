# Báo cáo tính toàn vẹn — bản nâng cấp SDVIP

Báo cáo kiểm thử và phạm vi bản nâng cấp hiện tại nằm trong **`UPGRADE-REPORT.md`**.

- Gói nền dùng để nâng cấp: `SDVIP.zip`; gói gốc vẫn được giữ nguyên riêng biệt.
- `npm run check`: PASS.
- `npm test`: PASS.
- SQLite migration order `0001 → 0003 → 0002` và `0001 → 0002 → 0003`: PASS, 235 sản phẩm.
- 235 sản phẩm, 526 đường dẫn ảnh sản phẩm được kiểm tra; không thiếu ảnh, toàn bộ ảnh tham chiếu còn là WebP hợp lệ.
- Chưa deploy Cloudflare Production và chưa xác minh binding/secrets/tên miền/branch từ tài khoản thật.
- Đăng nhập tài khoản khách hàng chưa được bật; ảnh R2 cũ cần tải lại để đóng watermark vào file.

Xem `README-DEPLOY.txt` để biết quy trình thiết lập có xác nhận và các bước kiểm tra sau deploy.
