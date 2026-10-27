# SINDAREALEST — HANDOFF MỚI NHẤT 27/10/2026 — FIX 404 KHI DÁN LINK DANH MỤC

> **Nguồn sự thật cập nhật sau PR #131 / Production deploy.** Dự án tiếp diễn, KHÔNG tạo web mới, KHÔNG làm lại phần Owner PASS, KHÔNG tự merge PR cũ hay sửa Production D1/R2. Tài liệu lịch sử trước bản này có SHA/PR/trạng thái cũ, không được dùng chúng làm hiện trạng.

## 1. Trạng thái xác minh cuối phiên

| Trường | Kết quả |
| --- | --- |
| Repo | `chichute5500/Sindarealest-admin` |
| **Main CODE SHA đang chạy** (trước commit docs-only) | `434911b5aada64a302673665743451c6d82edb98` |
| PR sửa URL mới nhất | [#131](https://github.com/chichute5500/Sindarealest-admin/pull/131) — **MERGED** |
| Test branch | source CI #40529355398, PR CI #40529411726 — SUCCESS; Admin Preview Playwright #40529411110 — SUCCESS |
| Production deploy | [#40529662547](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40529662547) — **SUCCESS**, đúng CODE SHA trên |
| Cloudflare log | `Deployment complete`, Production project branch = `main`; `CATALOG_CUTOVER=ALREADY_COMPLETED`, không ghi lại D1 |
| Website chính | https://sindarealest2.pages.dev/ |
| Admin chính | https://sindarealest2.pages.dev/admin/ |
| **Chủ shop xác nhận nghiệm thu lỗi deep link sau PR #131?** | **CHƯA** — phải phân biệt CI/deploy PASS với Owner PASS trên điện thoại |

**Quan trọng:** Khi tạo/merge chính các tệp bàn giao này, HEAD `main` sẽ mới hơn do **docs-only commit**. Không gắn SHA docs-only thành “source code đã nghiệm thu”; xác nhận `git diff` và lấy lại HEAD, Actions trước công việc tiếp theo.

## 2. Lỗi được phát hiện và xử lý mới nhất — 404 khi dán URL

### Hiện tượng thực tế từ Owner

- Owner dán thẳng `https://sindarealest2.pages.dev/sanpham/mu` vào thanh địa chỉ Android rồi Enter; thấy trang riêng của Shop `404 / Không tìm thấy trang`.
- Tương tự các link danh mục khác: từ nút/danh mục trong web có thể cập nhật URL, nhưng **mở trực tiếp hay tìm trên thanh URL** lại báo 404.
- Đây KHÔNG phải lỗi tên miền, mã SKU hay lỗi Google Search Console.

### Nguyên nhân gốc chính xác

- `functions/_middleware.js` đã có route server-side cho `/sanpham`, `/sanpham/<category-slug>`, `/sanpham/<category-slug>/<SKU>` và render `index.html` với metadata tương ứng; server xử lý URL danh mục hợp lệ.
- **`public/index.html`, script `#sd-not-found-route-init` chạy tức thì khi HTML load, kiểm tra sai:** chỉ nhận `/sanpham/<category>/<SKU>` (3 phần) hoặc `/san-pham/<id>`, không nhận `/sanpham` và `/sanpham/<category>` (1/2 phần). Nó thêm `body.sd-not-found-route`.
- CSS `#sd-not-found-route-styles` ẩn toàn bộ storefront, hiện overlay 404. Vì vậy link đúng vẫn trông giống trang không tồn tại.

### Phần sửa đã MERGE + DEPLOY

- PR **#131** trên branch `fix/catalog-direct-links-404-bootstrap-2026-10-27`, merge SHA `434911b5aada64a302673665743451c6d82edb98`.
- `public/index.html`: sửa guard pre-bootstrap bằng biểu thức chính quy để phân biệt đúng `/sanpham`, `/sanpham/<category-slug>`, `/sanpham/<category-slug>/<SKU>` và legacy `/san-pham/<id>`. Đường dẫn không hợp lệ vẫn giữ 404 thật.
- `syncCatalogFromLocation()` xóa `sd-not-found-route` và ẩn `#notFoundPage` khi khôi phục hoặc đổi sang đường dẫn danh mục hợp lệ.
- Tạo `tests/catalog-direct-links-bootstrap.test.mjs`, chạy **chính guard JavaScript thực tế** bằng VM, kiểm tra 15 danh mục, /sanpham, SKU route, legacy route, 404 thật, middleware server & history recovery.
- Thêm test mới vào `package.json` / CI. Source CI và Playwright SUCCESS; Production deploy SUCCESS.
- **KHÔNG** đổi thiết kế, CSS Liquid Glass, SEO ảnh chia sẻ, dữ liệu SKU, giá, đơn hàng hay bảo hành.

**Chưa có ảnh Owner thử lại trên Android sau phát hành.** Đây là mục cần xác minh tiếp nếu Owner muốn nghiệm thu.

## 3. URL chuẩn áp dụng cho toàn bộ website

- Trang chủ: `/`.
- Tất cả sản phẩm: `/sanpham`.
- Danh mục: `/sanpham/<slug>`.
- Sản phẩm: `/sanpham/<slug>/<SKU-chính-thức>`.
- Khi mở danh mục trực tiếp phải hiển thị đúng catalog + chip lọc, heading danh mục; không có màn 404. Back/Forward và đường dẫn cũ `/#products` giữ hỗ trợ.
- Các slug danh mục trong `functions/_storefront-route.js`: `sneaker`, `giayluoi`, `giaytay`, `thatlung`, `dep`, `daydongho`, `oplung`, `vinam`, `vicamtay`, `caplaptop`, `clutch`, `mu`, `tuideocheo`, `tuigolf`, `tuinu`.
- Bản đồ 15 tiền tố SKU đã được Owner chốt (không tự đổi):
  1. Giày thể thao (Sneaker): `SD-SN`
  2. Giày lười: `SD-GL`
  3. Giày tây: `SD-GT`
  4. Thắt lưng: `SD-TL`
  5. Dép: `SD-DD`
  6. Dây đồng hồ: `SD-DH`
  7. Ốp điện thoại: `SD-OP`
  8. Ví nam (Ví da cũ): `SD-VN`
  9. Ví cầm tay: `SD-VD`
  10. Cặp – Tab – Laptop: `SD-CA`
  11. Clutch: `SD-CL`
  12. Mũ: `SD-MU`
  13. Túi đeo chéo: `SD-DC`
  14. Túi golf: `SD-TG`
  15. Túi nữ: `SD-TN`

## 4. Những phần Owner đã PASS — KHÓA

- **SKU/data:** PR #123/#124 đã cutover Production, dọn sản phẩm ẩn, cấp SKU chính thức và tự cấp SKU cho hàng mới; 217 sản phẩm đang hiện / 15 danh mục là số liệu **tại thời điểm cutover**, không coi là số realtime. URL sản phẩm theo SKU, sắp xếp sản phẩm mới lên trước. Không tự reset SKU/xóa D1 lần nữa.
- **Canonical & SEO:** PR #125 URL danh mục + sitemap; PR #126 sửa tìm kiếm danh mục theo slug + tiêu đề hiển thị, cả mobile và PC. `/sitemap.xml` tự sinh từ D1; Google Search Console owner đã xác minh sở hữu HTML tag (PR #127). **Search Console từng báo “Không thể đọc sitemap”, dù XML mở 200; chưa có bằng chứng Google đã index hết**, không nhận 0 URL là code 404.
- **Logo/favicon/share preview:** PR #128 sinh favicon từ `public/images/brand-emblem.png` thật; PR #129 tạo OG mẫu cũ; PR **#130** Owner **PASS mẫu xanh nhạt Liquid Glass** mới. Ảnh chốt: `public/og-sindarealest-light-blue-20261027.jpg`, URL https://sindarealest2.pages.dev/og-sindarealest-light-blue-20261027.jpg. Trang chủ/danh mục dùng OG này, chi tiết SKU ưu tiên ảnh sản phẩm. **Không đổi về OG xanh đậm, nền kem hoặc tự vẽ lại logo.**
- **Giao diện Storefront:** theme sáng/tối, Liquid Glass xanh nhạt, HERO/Welcome, footer logo trái + hai dòng phải, chữ VIP đỏ **không nghiêng**, gallery, watermark, nút thêm giỏ xanh / mua ngay cam, checkout + QR 1:1, yêu cầu giá/cọc/thu thật; không thay trái ý Owner.
- **Đơn & bảo hành:** web khách 6 bước tra cứu; Admin 5 bước; chỉ cấp/kích hoạt bảo hành khi **Hoàn thành**, không khi Xác nhận đơn; cơ chế thanh toán/cọc/COD theo tài liệu Owner PASS trước. Không thay dữ liệu tài chính hay hồi tố bảo hành.
- Các PR Draft/legacy khác trong repo **không được tự merge**; Owner PASS từng phần không đồng nghĩa đồng ý ghép toàn bộ PR cũ.

## 5. Những việc còn cần làm ở chat kế tiếp

**Trọng tâm duy nhất đang chờ chủ shop xác nhận là nghiệm thu thực tế lỗi deep link trên máy Android** sau PR #131:

1. Đầu tiên fetch lại `main`, PR #131, Actions, Production deployed SHA; đọc tệp này và prompt đi kèm. Không hỏi lại từ đầu.
2. Nếu Owner yêu cầu kiểm tra, dùng web/browser thực trên Production:
   - https://sindarealest2.pages.dev/sanpham/mu
   - https://sindarealest2.pages.dev/sanpham/sneaker
   - https://sindarealest2.pages.dev/sanpham/giaytay
   - https://sindarealest2.pages.dev/sanpham
   - ít nhất một link SKU chính thức tồn tại, cùng link lỗi thực sự để đảm bảo 404 hợp lệ.
3. Kiểm tra **nội dung DOM**: không có class `sd-not-found-route`, catalog hiển thị và lọc đúng, không chỉ HTTP 200; làm cả PC/mobile, sáng/tối nếu có điều kiện.
4. Nếu Owner báo PASS, ghi nhận Owner PASS cho PR #131. Nếu còn lỗi, điều tra cache/Pages route/JS hoặc lỗi khác từ bằng chứng, tạo nhánh fix MỚI, chạy source CI/Playwright và gửi cho Owner; không phát hành thay đổi ngoài scope khi chưa có chỉ đạo.
5. Ngoài yêu cầu đó: **không còn công việc code đã giao nhưng chưa merge** ở dòng URL 404; không tự nhận phải sửa thêm gì.

## 6. Điểm đọc mã nguồn và kiểm thử

- `public/index.html`: `#sd-not-found-route-init`, `#sd-not-found-route-styles`, `catalogCategoryFromLocation`, `syncCatalogFromLocation`, `init()`.
- `functions/_middleware.js`: catalog/direct product routes, 301 aliases, OG metadata.
- `functions/_storefront-route.js`: category-to-slug/SKU helper.
- `public/_redirects`: static SPA fallback `/* /index.html 200`.
- `tests/catalog-direct-links-bootstrap.test.mjs`: guard regression.
- `tests/catalog-listing-routes.test.mjs`: server category/slug/sitemap tests.
- `tests/official-brand-preview.test.mjs`: icon/OG; `tests/storefront-operations.test.mjs`.
- `.github/workflows/deploy.yml`: Production only main and verification gate.
- Prompt đi kèm: [PROMPT-NEXT-CHAT-2026-10-27-AFTER-DIRECT-LINK-404.md](./PROMPT-NEXT-CHAT-2026-10-27-AFTER-DIRECT-LINK-404.md).

**Kết luận:** PR #131 merged, source SHA `434911b5...`, CI/Playwright/Cloudflare SUCCESS. **Owner chưa PASS kiểm tra trực tiếp sau sửa 404.** Các phần đã chốt trước đó tiếp tục khóa.
