# SINDAREALEST — PHOTO FOLDER IMPORT & CATALOG CUTOVER (26/10/2026)

## Phạm vi

- Dữ liệu chủ sở hữu: `DANH_SACH_ANH.csv` 921 dòng hình, 218 nhóm mẫu `Mxxxx`, 15 danh mục, không chứa nội dung ảnh.
- CSV có 911 dòng `Ghi chú=Cần xem lại`; màu chưa xác minh và tên được lấy từ thư mục. Không tự diễn giải giá `2200K` là giá bán chính thức.
- Các ảnh thực tế ~400 MB nằm trên PC của chủ sở hữu, **chưa có trong repo**. Chưa nhập 921 ảnh thật.
- Đường dẫn chọn thư mục: `KET_QUA_NHOM_MAU...` (chọn thư mục gốc chứa 15 thư mục danh mục).
- Repo: `chichute5500/Sindarealest-admin`, staging PR #118, dynamic filters PR #119, UI nhập hàng loạt PR #120.
- **KHÔNG** sửa HERO/Welcome/Admin đã PASS, không merge PR #118/#119/#120 khi owner chưa cho phép.

## Thay đổi đã triển khai trên nhánh

- `public/admin/import.html`: chọn CSV + thư mục ngay trên trình duyệt PC, đối chiếu đường dẫn và mã Mxxxx, hiện ảnh thiếu/ảnh ngoài CSV/gắn cờ kiểm duyệt, duyệt mẫu và ảnh trước khi nhập.
- `public/admin/import-core.mjs`: CSV quoted parser, Unicode/Windows path normalization, MIME/size guards, chặn ảnh không có đường dẫn, trùng path, ảnh thiếu, quá giới hạn.
- `public/admin/index.html`: nút mở công cụ trong trang Sản phẩm, giới hạn gallery nâng từ 30 lên **50 ảnh**.
- `functions/_lib.js`: API cho phép 50 ảnh/sản phẩm, giúp mẫu M0062 gồm 44 ảnh nhập đủ **trong một sản phẩm**. Từ 51 ảnh phải có xử lý riêng, không tự cắt bớt.
- `public/index.html` từ PR #119: bộ lọc tự nhận danh mục trong D1, không giấu nhóm mới.
- Chỉ tạo sản phẩm **published=false**, **price=null**, **stock=null**, fulfillment `unclassified`. Ảnh tối ưu WebP đưa vào R2 IMAGES, ảnh gốc vào R2 ORIGINALS riêng tư. **Không ghi Production trong quá trình phát triển/QA.**
- Lưu checkpoint tạm trong localStorage trình duyệt, có thể nhập tiếp khi đóng/mở lại với cùng CSV, thư mục. Không xóa sản phẩm cũ, đơn hàng, khách hàng, bảo hành, thanh toán.

## QA/Preview

- Preview branch chỉ ghi mã nguồn vào Cloudflare Pages project `sindarealest-admin-preview`, alias `sd-import-review-20261026`. Preview URL:
  `https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev/admin/import.html`
- Workflow `.github/workflows/bulk-import-isolated-preview.yml` kiểm tra danh tính D1/R2 (khác Production) trước khi deploy, chạy toàn bộ test, verify exact SHA và chạy Chromium trên PC/mobile; thao tác upload, POST sản phẩm trong browser QA **được mock**, nên không gọi đây là nhập ảnh thực tế.
- Bằng chứng QA Chromium source `5900378a7a3fe2f959893c0aebfa49d0d711ff3d`: [workflow #40285200675](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40285200675) PASS, [3 ảnh nghiệm thu](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40285200675/artifacts/12633986695). Hai ảnh được ghép từ cấu trúc folder thật qua chooser, tạo đúng một draft mock với title, category, `published=false`, giá/tồn kho null; screenshot desktop/mobile. No Production, remote D1/R2, payment writes.
- **BỔ SUNG E2E THẬT:** Source `963758eee46044e3c699a509478c67f4c9cb6b54` có [workflow #40286016583](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40286016583): đã đăng nhập Admin Preview, tải một WebP qua API thật vào R2 public + R2 originals riêng tư, xác minh GET ảnh, tạo một sản phẩm nháp D1 với giá/tồn kho null, xác nhận sản phẩm không xuất hiện trong `GET /api/products`, sau đó xóa chính xác sản phẩm, audit và cả hai ảnh; `cleanupVerified=true`, `productionWrites=0`. [Remote QA report artifact](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40286016583/artifacts/12634345809). Không phải kiểm thử toàn bộ 921 ảnh thật của owner.
- Khi thay đổi code sau QA, chạy lại workflow trên **commit HEAD**; các commit chỉ tài liệu không đổi SHA ứng dụng được nghiệm thu.

## Hành động khi owner sử dụng PC

1. Trên PC mở Preview URL ở Chrome/Edge, đăng nhập Admin nếu được yêu cầu.
2. Chọn CSV `DANH_SACH_ANH.csv` và thư mục gốc chứa 15 danh mục.
3. Nhấn **Đối chiếu dữ liệu**. Phải xác minh: 921 dòng CSV, 218 mẫu, 0 ảnh thiếu, 0 ảnh ngoài CSV, không nhóm vượt 50 ảnh.
4. Kiểm tra các mẫu gắn cờ (911 dòng); ảnh cùng mẫu có thể khác màu/góc, không tự xuất bản.
5. Khi đủ điều kiện, nhập thử **một mẫu** trên **Preview cách ly** và xác minh ảnh gốc R2 private + 1 draft D1, Admin UI, storefront không xuất hiện sản phẩm chưa công khai.
6. Sau khi owner PASS Preview mới lên kế hoạch nhập đầy đủ vào Production (có thể cần triển khai công cụ Admin trước), không được ghi đè/copy DB Preview sang Production.
7. Trước cutover, **sao lưu toàn bộ dữ liệu** D1/R2, đối chiếu đầy đủ 921 ảnh và 218 sản phẩm. Hệ thống hiện **chưa có cutover atomic đủ bằng chứng**, không được tự xóa danh mục cũ.
8. Chỉ sau khi chủ sở hữu duyệt tập dữ liệu mới và xác nhận thay thế, xây dựng/duyệt tác vụ ẩn/xóa danh mục cũ có thể rollback, giữ nguyên lịch sử đơn, khách và bảo hành.

## BLOCKERS đến khi có ảnh thật

- Không thể kiểm thử 921 ảnh/400MB, lỗi MIME/giải mã ảnh, ảnh sai màu/trùng nội dung, hay tỷ lệ thất bại mạng khi chưa được chọn thư mục nguồn trên PC.
- Chưa có giá/tồn kho xác minh. Không gán giá từ tên thư mục vào dữ liệu thương mại.
- Chưa triển khai/kiểm thử cutover production. Không tuyên bố đã thay thế dữ liệu web.
