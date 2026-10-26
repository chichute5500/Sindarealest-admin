> **CHECKPOINT MỚI NHẤT — OWNER PASS 27/10/2026:** Các commit/trạng thái "mới nhất" trong tài liệu cũ phía dưới là lịch sử. **ĐỌC TRƯỚC** [HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md](./HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md) và [PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md](./PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md). Source Owner PASS `5f991ff3339848efc036a30bcc1c7e66fd224cd0`; isolated Preview [Actions #40383014004](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40383014004), attempt 2 SUCCESS 3/3. PR #118 OPEN/DRAFT, chưa merge/Production. Không làm lại phần được PASS.

---

# SINDAREALEST — BÀN GIAO MỚI NHẤT: 218 SẢN PHẨM / 15 DANH MỤC, 2026-10-26

**Ưu tiên tài liệu này trước tất cả checkpoint cũ. Không bắt đầu dự án mới.** Đây là trạng thái đã xác minh trực tiếp trong GitHub Actions ngay trước khi chuyển chat.

## 1. Khóa repo, nhánh và an toàn
- Repository: `chichute5500/Sindarealest-admin`.
- Chỉ nhánh được phép sửa: `integration/storefront-locked-on-main-2026-10-26`.
- PR #118: **OPEN, DRAFT, không merge**.
- Source app + QA SHA đã kiểm chứng: `2f89b133a10fa3d8be59aef859c54cc9e165210c` (full SHA).
- Commit kế tiếp có thể là **chỉ tài liệu bàn giao**; luôn đọc HEAD mới trên GitHub, không ghi đè.
- Preview được phép: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
- Tuyệt đối **không tự merge PR, không Production deploy, không ghi D1/R2 Production**, không tự thêm/xóa sản phẩm hay điều chỉnh giá, không xóa dữ liệu kinh doanh.
- HERO, Welcome, Gallery, Liquid Glass, Admin, theme Sáng/Tối trên mobile được Owner PASS; bảo toàn thiết kế và không yêu cầu nghiệm thu lại phần đó nếu không phát sinh lỗi mới.

## 2. Chủ đề vừa xong: hiện bộ sản phẩm cũ trên Preview
**Triệu chứng owner gửi ảnh Android 23:32:** Preview hiển thị đúng **235 sản phẩm cũ thuộc 8 nhóm**, không có nhóm của lô mới mặc dù phía Production đã cập nhật.

### Nguyên nhân đã xác minh (KHÔNG phỏng đoán)
- **Production D1:** 455 bản ghi, **218 mẫu mới published**, 237 mẫu cũ hidden, 15 danh mục, 921 ảnh tham chiếu cho lô mới. Lượt audit independent Production [#40351570849](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40351570849) PASS read-only; catalog cutover đã thực hiện bởi workflow của workstream riêng [#40351175590](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40351175590), không lặp lại.
- **Preview D1 trước sửa:** 453 bản ghi = 218 mẫu mới **draft** + 235 cũ published. D1 và cả hai R2 của Preview đã xác minh khác Production, không dùng chung binding.
- Trước đó Storefront có danh mục tĩnh 8 loại. Source commit `f16c96ae82d951a5b596a0c931599b9bfd070f34` sửa `public/index.html` để sinh bộ lọc động từ `GET /api/products`, `categoryLabel` và số lượng thật, không gộp Ví nam/Ví cầm tay hoặc các nhóm túi; test `tests/dynamic-product-categories.test.mjs` PASS. Tuy vậy **chỉ sửa frontend chưa đủ** vì Preview D1 vẫn published lô cũ.

### Đồng bộ dữ liệu Preview đã HOÀN THÀNH
1. Guarded read-only preflight [#40361476146](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40361476146) **PASS**: trùng ID, tên, category, price, image_color và 921 images với đúng lô mới Production; Preview=218 draft + 235 published.
2. Protected D1 Preview-only atomic visibility swap [#40362020765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40362020765) **PASS**: **218 mới published, 235 cũ unpublished**, không xóa bản ghi, không sửa giá/ảnh/kho, 0 Production writes/deploy, 0 R2 writes/deletes. Script `scripts/sync-approved-products-isolated-preview.mjs` kèm workflow `.github/workflows/sync-approved-products-isolated-preview.yml`. Script nhận diện trạng thái đã đồng bộ để tránh chạy lại; **đừng khởi chạy lại nếu không cần**.
3. **Trình duyệt kiểm tra DỮ LIỆU THẬT**: `scripts/audit-storefront-main-preview.mjs` được mở rộng thay vì chỉ test synthetic API. Gửi GET thực tới Preview `/api/products` xác nhận HTTP 200, **218 sản phẩm, 15 danh mục**. Android-width 390px render chính xác **15 nút danh mục + nút Tất cả**, lọc nhóm mới `clutch` đúng, và GET ảnh thực từ `/media/...` trả **HTTP 200, content-type image/webp**. Lưu ý mới kiểm một ảnh đại diện trực tiếp, không tuyên bố toàn bộ 921 ảnh đều GET 200.
4. Workflow [Integrated isolated Preview #40363268817](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40363268817) **attempt 2: SUCCESS 3/3**, cùng source SHA `2f89b133a10fa3d8be59aef859c54cc9e165210c`. Các job:
   - Validate exact SHA, D1/R2 bindings, source tests, deploy Preview: **SUCCESS**.
   - Remote isolated Preview D1 checkout + Admin with fixture cleanup: **SUCCESS**.
   - Chromium PC/Mobile, Light/Dark, Welcome/HERO/gallery and **REAL 218 / 15 categories / clutch / R2 media**: **SUCCESS**.
   - Attempt 1 thất bại vì welcome fade `transitionstart` không được ghi nhận trong một lượt test; chạy lại duy nhất job Chromium attempt 2 PASS. Không sửa Welcome Owner đã duyệt.
5. Các nhóm ví và túi mới tự động xuất hiện theo giá trị `category` thực từ API; không thêm hard-coded 15 danh mục. 68 sản phẩm mới chưa có giá xác nhận: **không tự điền giá**.

## 3. Công việc còn mở
- **Owner chưa gửi ảnh/nhắn PASS riêng cho kết quả cập nhật danh mục mới trên điện thoại**, chỉ kiểm thử kỹ thuật đã PASS. Khuyến nghị đưa link Preview đã triển khai và nhờ owner đối chiếu 15 nhóm, không tự gắn “Owner PASS”.
- Nếu owner cho phép phát hành, cần quy trình duyệt merge/deploy Production riêng — tuyệt đối không tự merge.
- Mọi chức năng đã Owner PASS, nhất là theme Mobile, HERO, Welcome và Admin, tiếp tục được khóa.

## 4. GitHub source/test cụ thể
- `public/index.html`: `renderFilters()` lấy từ `products` do API D1 trả, đếm nhóm tự động và escape HTML.
- `functions/api/products.js`: truy vấn `WHERE published = 1` và trả dữ liệu công khai.
- `scripts/sync-approved-products-isolated-preview.mjs`: bảo vệ phân biệt Preview/Production, only D1 Preview write.
- `.github/workflows/sync-approved-products-isolated-preview.yml`: synchronization workflow (đã PASS).
- `scripts/audit-storefront-main-preview.mjs`: thêm test real Preview 218/15/filter/R2.
- `.github/workflows/integration-storefront-isolated-preview.yml`: chạy integrated Preview, PC/Mobile QA.
- `tests/dynamic-product-categories.test.mjs`: test tự động danh mục mới.

## 5. Nguyên tắc chat sau
1. Đọc tài liệu này và prompt bên cạnh, kiểm tra HEAD/PR/Actions **trực tiếp** trên GitHub. KHÔNG tin các checkpoint cũ hơn ở dưới.
2. Không cần tái triển khai sản phẩm/danh mục, không sửa lại phần đã PASS; chỉ tiếp tục vấn đề owner vừa chỉ định hoặc chưa nghiệm thu.
3. Làm việc trực tiếp trên nhánh được phép, kiểm tra CI/Preview đúng SHA, báo cáo tình trạng trung thực, không gọi synthetic PASS là đã đồng bộ dữ liệu thật.
4. PR #118 luôn DRAFT, Production không bị động chạm.
