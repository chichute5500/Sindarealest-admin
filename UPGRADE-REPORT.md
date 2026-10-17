# Báo cáo nâng cấp SinDarealest từ SDVIP.zip

## Trạng thái

- Gói nguồn được dùng: `SDVIP.zip`.
- Gói nguồn `SDVIP.zip` ban đầu không bị sửa; bản nâng cấp được tạo trong thư mục riêng.
- Kiến trúc vẫn là HTML/CSS/JavaScript tĩnh + Cloudflare Pages Functions + D1 + R2; không chuyển sang React/Vite.
- **Chưa deploy lên Cloudflare Production.** Không có quyền truy cập/tài nguyên Production được xác minh trong lượt làm việc này; không chạy SQL hoặc thay đổi website đang hoạt động từ xa.

## Đã làm

### Giao diện và ảnh

- Giữ cấu trúc giao diện tĩnh, logo thương hiệu, font, bố cục cửa hàng, hiệu ứng nền Liquid hiện có, và cơ chế chuyển nền sáng/tối; không thay nền bằng gradient/hình mới.
- Giữ 235 sản phẩm, ID/SKU/slug và các đường dẫn ảnh sản phẩm hiện có.
- Đóng dấu logo SinDarealest lên 526 ảnh sản phẩm tĩnh bằng ảnh dẫn xuất WebP, độ mờ watermark khoảng 68%; URL ảnh giữ nguyên. `SDVIP.zip` gốc vẫn là bản đối chiếu nguyên trạng.
- Ảnh tải mới từ trang quản trị được chuyển sang WebP sạch trong `IMAGES`; file gốc JPEG/PNG/WebP được lưu trong bucket riêng tư `ORIGINALS`. Mã hiện tại không đóng dấu logo trực tiếp vào file WebP mới và không dùng hậu tố `-wm`; watermark theo cài đặt được phủ bằng overlay trên ảnh lớn ở trang chi tiết/toàn ảnh, không phủ thẻ danh sách hoặc thumbnail.
- Với ảnh R2 cũ đã tải lên trước gói này, không tự di trú hoặc thay đổi file. Route xem ảnh bằng chứng bảo hành vẫn hỗ trợ đọc bản ghi cũ từ `IMAGES` thông qua API quản trị đã xác thực; ảnh bằng chứng mới được ghi vào `ORIGINALS`. Không thể kết luận tài nguyên R2/Production thật đã được cấu hình hoặc di trú khi chưa xác minh trực tiếp trên Cloudflare.
- Thêm ảnh chia sẻ Open Graph riêng 1200×630, không thay ảnh/logo gốc thương hiệu.

### SEO và chia sẻ liên kết

- Thêm Open Graph và Twitter Card cho trang chủ; URL ảnh/title/description được trả về dưới dạng metadata HTML, không phụ thuộc việc bot chạy JavaScript.
- Thêm route sản phẩm `/san-pham/<slug>` có title, description, canonical, `og:title`, `og:description`, `og:image`, Twitter Card và Product JSON-LD theo sản phẩm.
- Thêm `/sitemap.xml` và `/robots.txt`.
- Thêm URL ổn định khi mở chi tiết sản phẩm, hỗ trợ mở trực tiếp link sản phẩm và nút Back của trình duyệt.

### Đơn hàng và chăm sóc khách hàng

- Thêm form gửi yêu cầu đặt hàng ngay trong giỏ chọn; dữ liệu được xác minh ở server và lưu vào D1.
- Không tự đặt giá/tồn kho: đơn giữ trạng thái chờ xác nhận giá khi giá không hiển thị hoặc chưa được xác nhận. Admin có thể nhập giá theo từng dòng đơn; không cho xác nhận/xử lý đơn hoặc đánh dấu đã thanh toán khi còn giá chưa xác nhận.
- Thêm quản trị đơn hàng, trạng thái xử lý/thanh toán, danh sách khách hàng từ hồ sơ đặt hàng, và nhật ký hoạt động gần đây.
- Thêm form yêu cầu hỗ trợ/bảo hành, quản trị yêu cầu, và phát hành mã bảo hành chỉ sau khi đơn hoàn tất. Tên chính sách, thời hạn và ngày bắt đầu phải được quản trị nhập rõ ràng; không tự gán chính sách mặc định.
- Thêm rate limit theo IP cho yêu cầu đặt hàng/yêu cầu hỗ trợ và từ chối request có Origin khác website.
- Backup v2 gồm danh mục, cài đặt, đơn hàng, khách hàng, dòng đơn, bảo hành, audit logs, địa chỉ khách hàng/giao hàng, biến thể dòng đơn và metadata ảnh đính kèm; vẫn chấp nhận backup v1 cũ. Byte ảnh nằm trong R2 cần được sao lưu riêng; các phiên OTP đã được loại bỏ khỏi luồng ứng dụng; migration 0006 không thay đổi schema Production, còn token tải ảnh tạm dùng bảng settings hiện có.
- Thêm trang quản trị để bật/tắt lớp chào mừng và chỉnh hai dòng tiêu đề/lời chào; hiệu ứng Liquid và thiết kế của lớp chào mừng được giữ nguyên.

### Cơ sở dữ liệu và an toàn

- Thêm `migrations/0003_storefront_operations.sql` với bảng khách hàng, đơn hàng, dòng đơn, bảo hành, yêu cầu bảo hành, audit log và giới hạn request công khai. Migration 0006 không thay đổi schema; token tải ảnh tạm được lưu trong settings hiện có và các bảng legacy được giữ nguyên.
- Script thiết lập Cloudflare áp dụng các migration 0001, 0003, 0004 và 0005 theo thứ tự, kiểm tra bảng/cột trước khi deploy; chỉ nạp seed 0002 khi người vận hành xác nhận D1 đang trống. Script yêu cầu xác nhận đúng Pages project, D1, R2, bindings và secrets trước thao tác từ xa.
- Thêm ghi nhật ký cho tạo/sửa/xóa sản phẩm, thay đổi cài đặt, tạo/cập nhật đơn, yêu cầu bảo hành và phát hành mã bảo hành.
- Bổ sung header bảo mật cơ bản, kiểm tra metadata sản phẩm, kiểm tra dữ liệu backup v2 và quan hệ khóa ngoại trước khi restore.

## Kiểm thử đã chạy

- `npm run check`: PASS.
- `npm test`: PASS.
- Kiểm tra cú pháp các JavaScript server và script nhúng HTML: PASS thông qua `scripts/check-project.mjs`.
- Kiểm tra SQLite với thứ tự migration `0001 → 0003 → 0002` và `0001 → 0002 → 0003`: PASS; cả hai cho 235 sản phẩm và đủ bảng vận hành.
- Kiểm tra 526 đường dẫn ảnh sản phẩm: không thiếu tệp, tất cả còn là WebP hợp lệ.
- Kiểm thử metadata trang chủ/sản phẩm, canonical, JSON-LD, sitemap/robots và từ chối request khác Origin: PASS.
- CI GitHub Actions trên nhánh `upgrade/checklist-sindarealest-2026-10`, commit `d290ea39d9d2158a0c90b55d9f1493926fbf621f`: `npm run check` và `npm test` PASS. Các test này gồm mock/static regression; chúng không thay thế kiểm thử trực tiếp trên Cloudflare D1/R2 hoặc SMS Twilio.
- Rà soát bổ sung: sửa backup/restore v2 để giữ địa chỉ, size và metadata ảnh yêu cầu bảo hành; khi khôi phục, các bản ghi tải ảnh tạm thời bị xóa.

## Những phần chưa hoàn tất / cần xác nhận trước Production

1. **Đăng nhập tài khoản khách hàng chưa được bật.** Hiện hồ sơ khách hàng được tạo/gộp theo số điện thoại từ đơn hàng; chưa có đăng nhập, quên mật khẩu hoặc trang tài khoản. Cần thiết kế cơ chế xác thực riêng trước khi triển khai; không thêm hệ thống mật khẩu tự chế thiếu xác minh.
2. Chính sách bảo hành phải do cửa hàng quyết định và nhập khi phát hành; chưa có bộ chính sách pháp lý/điều kiện bảo hành theo từng dòng sản phẩm được cung cấp.
3. Chưa tích hợp cổng thanh toán, hãng vận chuyển, SMS/email xác nhận đơn hoặc hóa đơn. Đơn hàng hiện là yêu cầu để cửa hàng liên hệ xác nhận. Tra cứu bảo hành dùng mã bảo hành, không gửi hoặc xác minh mã qua Twilio.
4. Ảnh R2 đã tải lên trước đây chưa được tải lại để đóng watermark vào file gốc; watermark cũ chỉ phủ trên giao diện.
5. Chưa chạy kiểm thử hiển thị bằng trình duyệt thật trên thiết bị/viewport thực tế; phần kiểm tra hiện tại là kiểm tra mã, cấu trúc, API mock, migration SQLite và ảnh. Cần mở Preview sau deploy để kiểm tra thủ công sáng/tối, điện thoại/máy tính và việc chia sẻ thật qua Zalo/Facebook.
6. Trước deploy, phải sao lưu dữ liệu, xác minh Production bindings `DB`, `IMAGES` và cấu hình secrets `ADMIN_PASSWORD`, `SESSION_SECRET`; sau đó chạy `npm run setup:cloudflare` để áp dụng và xác minh migrations 0001, 0003, 0004, 0005, 0006. Script có xác nhận rõ Pages project/database/bucket và không tự tạo/xóa tài nguyên. Các bindings/secrets từ Cloudflare Production chưa được kiểm chứng trong phiên rà soát này; chưa chạy migration từ xa hoặc deploy.

## Lưu ý bảo vệ ảnh

Watermark giúp nhận diện nguồn ảnh và làm giảm khả năng tái sử dụng trực tiếp, nhưng không thể ngăn tuyệt đối chụp màn hình/quay màn hình. Ảnh tĩnh công khai trong gói nền đã được xử lý riêng. Watermark overlay chỉ áp dụng tại vị trí ảnh lớn theo thiết lập giao diện; ảnh upload mới dùng WebP sạch và bản gốc được lưu riêng tư trong `ORIGINALS`.
