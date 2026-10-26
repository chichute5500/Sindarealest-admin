> **CHECKPOINT MỚI NHẤT — OWNER PASS 27/10/2026:** Các commit/trạng thái "mới nhất" trong tài liệu cũ phía dưới là lịch sử. **ĐỌC TRƯỚC** [HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md](./HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md) và [PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md](./PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md). Source Owner PASS `5f991ff3339848efc036a30bcc1c7e66fd224cd0`; isolated Preview [Actions #40383014004](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40383014004), attempt 2 SUCCESS 3/3. PR #118 OPEN/DRAFT, chưa merge/Production. Không làm lại phần được PASS.

---

# PROMPT NEXT CHAT — SINDAREALEST (218 SẢN PHẨM / 15 LOẠI ĐÃ ĐỒNG BỘ PREVIEW)

Tiếp tục trực tiếp dự án **SinDarealest** trên GitHub, **không bắt đầu dự án mới, không hỏi lại lịch sử, không làm lại việc đã PASS**.

**Repository:** `chichute5500/Sindarealest-admin`
**Chỉ nhánh được phép sửa:** `integration/storefront-locked-on-main-2026-10-26`
**PR #118:** OPEN / DRAFT / KHÔNG MERGE.
**App/QA SHA đã PASS:** `2f89b133a10fa3d8be59aef859c54cc9e165210c` (HEAD có thể mới hơn vì commit tài liệu bàn giao).
**Preview:** https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/

## BẮT BUỘC ĐỌC
1. `docs/integration/HANDOFF-LATEST-2026-10-26-CATALOG-SYNC.md` — **bàn giao chính, mới nhất**.
2. `docs/integration/PROMPT-NEXT-CHAT-2026-10-26-CATALOG-SYNC.md` — prompt này lưu trên repo.
3. Các tài liệu legacy trong `docs/integration/` chỉ đọc khi cần nguồn chi tiết; những checkpoint “chưa PASS” cũ có thể lỗi thời.

## TRẠNG THÁI ĐÃ HOÀN TẤT (KHÔNG LÀM LẠI)
- Lỗi owner chụp ảnh: Preview chỉ thấy 235 mẫu cũ/8 nhóm dù Admin có mẫu mới.
- Xác minh D1: Production 218 mới published + 237 cũ hidden (15 nhóm, 921 ảnh tham chiếu); Preview trước đó 218 draft + 235 cũ published.
- Sửa frontend `renderFilters()` thành bộ lọc **tự phát hiện danh mục** từ dữ liệu API `GET /api/products`, nhóm mới đầy đủ, đếm nhóm và escape HTML; không gộp Ví nam/Ví cầm tay, nhóm túi.
- D1 Preview **đã chuyển xong** sang 218 mới visible + 235 cũ hidden, không xóa, không ghi Production. Protected swap [#40362020765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40362020765) PASS.
- **Integrated isolated Preview [#40363268817](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40363268817) attempt 2 PASS 3/3** với SHA `2f89b133a10fa3d8be59aef859c54cc9e165210c`: source/deploy+remote Admin D1+Chromium PC/Mobile PASS. **Dữ liệu thật**: API 218 items/15 danh mục, click loại mới `clutch` lọc đúng, ảnh R2 HTTP 200 image/webp. Attempt 1 Welcome transitionstart flake, rerun job đã PASS, KHÔNG sửa Welcome đã duyệt.
- Theme chuyển Light/Dark trên điện thoại **Owner PASS**; HERO, Welcome, Gallery, Liquid Glass, Admin đã PASS, GIỮ NGUYÊN.

## VIỆC CẦN LÀM SAU BÀN GIAO
Trước hết xác minh HEAD/PR và current workflow trên GitHub. Không có bước sửa code bắt buộc mới; **chờ owner đánh giá trực quan danh mục mới trên Preview** hoặc thực hiện yêu cầu tiếp theo của owner. Chỉ phát hiện bug có bằng chứng mới sửa. Nếu owner muốn tiếp tục, giữ mọi thiết kế đã duyệt; so sánh ảnh thực tế với kết quả kỹ thuật.

**GIỚI HẠN CỨNG:** chỉ sửa đúng nhánh integration, tuyệt đối KHÔNG merge PR #118, KHÔNG triển khai Production, KHÔNG ghi/đụng D1/R2 Production, KHÔNG xóa hoặc chỉnh sản phẩm/giá/ảnh nếu không có chỉ thị. Không báo cáo nghiệm thu Owner PASS danh mục mới khi người dùng chưa xác nhận. Không bỏ qua lỗi CI; phân biệt tình trạng test synthetic và real API. Chạy các luồng độc lập song song nếu cần, tự kiểm tra và tiếp tục đến khi chạm hành động cần owner.
