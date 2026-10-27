# PROMPT NEXT CHAT — SINDAREALEST · 27/10/2026 · SAU FIX 404 LINK DANH MỤC

Tiếp tục dự án **SinDarealest** trực tiếp trên GitHub. **Đây không phải dự án mới. Không hỏi lại lịch sử, không làm lại phần Owner đã PASS, không tự sửa Production ngoài nhiệm vụ mới.**

## Tài liệu bắt buộc đọc trước

- Repo: `chichute5500/Sindarealest-admin`.
- **ĐỌC TOÀN BỘ:** `docs/integration/HANDOFF-LATEST-2026-10-27-AFTER-DIRECT-LINK-404.md`. Đây là checkpoint mới nhất, ghi đè các trạng thái main/PR cũ trong tài liệu lịch sử.
- Main code SHA đã xác minh trước docs-only: `434911b5aada64a302673665743451c6d82edb98`.
- PR **#131**: https://github.com/chichute5500/Sindarealest-admin/pull/131 — MERGED.
- Production deploy đúng SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40529662547 — **SUCCESS**.
- Source CI PR #40529411726 SUCCESS, Playwright #40529411110 SUCCESS. HEAD có thể tăng vì docs-only commit; luôn fetch HEAD mới trước khi làm việc.

## Lỗi mới nhất đã sửa

Owner báo dán `https://sindarealest2.pages.dev/sanpham/mu` hay URL danh mục khác sẽ thấy 404. Nguyên nhân gốc **trong `public/index.html`**: đoạn `#sd-not-found-route-init` chỉ xem URL 3 phần (`/sanpham/<category>/<SKU>`) là hợp lệ, nên gắn class `sd-not-found-route` cho `/sanpham/<category>`. CSS ẩn toàn bộ catalog rồi hiện 404 mặc dù server xử lý đúng. PR #131 đã sửa guard, đồng bộ cả catalog và category; khi khôi phục route hợp lệ xóa class 404. Thêm regression `tests/catalog-direct-links-bootstrap.test.mjs` cho 15 danh mục, sản phẩm SKU, Back/Forward, URL lỗi thật. **Đã merge + Production deploy; chưa có Owner PASS sau khi thử lại trên điện thoại.**

**Bước cần ưu tiên khi Owner yêu cầu:** Kiểm tra trực tiếp URL production **`/sanpham/mu`**, `/sanpham/sneaker`, `/sanpham/giaytay`, `/sanpham` bằng gõ/dán URL mới và điều hướng nội bộ. Phải kiểm cả DOM không còn 404, hiển thị danh mục và sản phẩm đúng, PC/mobile. Nếu đạt, chờ hoặc ghi nhận Owner PASS; nếu không, tìm nguyên nhân thực tế và sửa có test, không nói PASS chỉ dựa HTTP 200.

## Phần Owner PASS phải giữ nguyên

- 15 danh mục và SKU chính thức `SD-*`, URL `/sanpham/<slug>/<SKU>`; cắt dữ liệu ẩn/SKU chỉ một lần, tự sinh SKU mới và ưu tiên sản phẩm mới trước.
- **Preview link Zalo/OG xanh nhạt Liquid Glass đã được Owner PASS:** `public/og-sindarealest-light-blue-20261027.jpg`. Giữ logo/favicon thật SinDarealest, không sử dụng mẫu xanh đậm/kem cũ hoặc render thay logo.
- Web có Liquid Glass xanh nhạt, theme sáng/tối, HERO/Welcome/footer/VIP đứng đỏ, sản phẩm/gallery/giỏ, thanh toán/QR/cọc/COD.
- Tra cứu đơn hàng công khai **6 bước**, Admin **5 bước**; bảo hành chỉ kích hoạt ở **Hoàn thành**, không ở Xác nhận đơn.
- Web chính: https://sindarealest2.pages.dev/ ; Admin: https://sindarealest2.pages.dev/admin/ ; sitemap: https://sindarealest2.pages.dev/sitemap.xml.
- Không tự merge các PR Draft/PR legacy, không xóa/chỉnh D1/R2, không tự thay giá/đơn/bảo hành đã PASS.

## Quy trình

Kiểm lại SHA + CI + Cloudflare trước khi tuyên bố tình trạng. Nếu chỉ nghiệm thu, **không sửa code**. Nếu phát hiện lỗi mới, nhánh fix riêng, phạm vi tối thiểu, test root cause cả PC/mobile và chống CSS/JS xung đột; không hợp nhất hoặc deploy ngoài chỉ đạo Owner. **Đừng suy diễn việc đã deploy SUCCESS = Owner đã PASS.** Tiếp tục nhận công việc mới từ Owner theo dữ liệu thật.
