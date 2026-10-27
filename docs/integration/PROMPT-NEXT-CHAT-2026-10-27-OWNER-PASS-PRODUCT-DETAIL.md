# PROMPT NEXT CHAT — SINDAREALEST (OWNER PASS CHI TIẾT SẢN PHẨM, 27/10/2026)

Tiếp tục **trực tiếp** dự án SinDarealest đang có trên GitHub. **KHÔNG bắt đầu lại, KHÔNG hỏi người dùng kể lại lịch sử, KHÔNG sửa lại những hạng mục đã được OWNER PASS**.

## Định danh & checkpoint mới nhất

- **Repository:** `chichute5500/Sindarealest-admin`
- **Nhánh DUY NHẤT được phép sửa theo yêu cầu mới:** `integration/storefront-locked-on-main-2026-10-26`
- **PR #118:** https://github.com/chichute5500/Sindarealest-admin/pull/118 — **OPEN, DRAFT, KHÔNG MERGE**.
- **SOURCE CODE ĐÃ OWNER PASS:** `5f991ff3339848efc036a30bcc1c7e66fd224cd0`.
- **Integrated Preview Actions:** https://github.com/chichute5500/Sindarealest-admin/actions/runs/40383014004 — **attempt 2, PASS 3/3 jobs** trên chính source SHA này (attempt 1 lỗi timing theme Chromium; rerun không đổi mã giao diện).
- **Preview:** https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
- Sau khi cập nhật tài liệu bàn giao, branch HEAD có thể **mới hơn code SHA** do **docs-only commit**. Hãy kiểm tra HEAD/PR và diff trước khi sửa; KHÔNG tự reset hoặc rebase.

## BẮT BUỘC ĐỌC ĐẦU TIÊN

1. `docs/integration/HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md` — **bàn giao mới nhất, nguồn sự thật, đọc đầy đủ**.
2. `docs/integration/PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md` — prompt này.
3. `docs/integration/HANDOFF-LATEST-2026-10-26-CATALOG-SYNC.md` nếu cần hiểu căn nguyên catalog/D1.
4. `.github/workflows/integration-storefront-isolated-preview.yml`, `scripts/audit-storefront-main-preview.mjs`, `public/index.html` **chỉ nếu cần thực hiện/kiểm thử yêu cầu mới**.

## OWNER PASS — ĐỪNG LÀM LẠI

- Chi tiết sản phẩm: bỏ nhãn danh mục phía trên tên, **tên đậm, Title Case**, giá **`Giá: …`** không khung; tên phân loại viết hoa đầu mỗi từ (Giày Tây, Giày Lười, Ví Cầm Tay).
- **SKU bên trái** và **trạng thái bên phải** trên cùng hàng; trạng thái là **Liquid Glass vàng champagne nhẹ**, không có tiền tố `Tình trạng:`; **Hàng đặt riêng** PHẢI ghi đúng đầy đủ (không viết rút gọn).
- Hai nút mua trên một hàng: **trái xanh** `Thêm vào giỏ hàng` + icon; **phải cam** `Đặt hàng ngay` + icon. **Hai nút giống hệt Liquid Glass/viền/gradient/bóng/interaction, chỉ khác màu**.
- Nút trái thêm giỏ bình thường. Nút phải **thêm sản phẩm đã chọn vào giỏ hiện có, đóng modal chi tiết và mở ngay form checkout**, **không tự xác nhận đơn/không thanh toán online**.
- Phần liên hệ/mô tả, 4 ô lợi ích, Zalo ở phía dưới khu vực nút mua để chừa chỗ phía trên cho **biến thể/phân loại sau này**. `#detailVariants[hidden]` mới chỉ là điểm chờ, chưa có tính năng.
- **Sản phẩm nổi bật đúng 4 ô, random**; **Tất cả sản phẩm** hiển thị hết Giày thể thao trước rồi nhóm kế tiếp; random trong mỗi nhóm một lần tải trang, không tự đổi thứ tự khi phân trang.
- Catalog Preview **218 sản phẩm mới/15 danh mục**, **235 cũ ẩn**, ảnh R2 đọc được; giữ giá gốc và công tắc `show_prices` người dùng đã bật, không tự thêm giá chưa xác nhận.
- HERO, Welcome, theme mobile Light/Dark, gallery, fullscreen, watermark, bay cả ô sản phẩm vào giỏ, Admin và các phần khác đã PASS **giữ nguyên**. Owner vừa xác nhận cụ thể **“Pass”** cho bản có hai nút xanh/cam.

## CẦN LÀM Ở CHAT MỚI

1. Trước yêu cầu sửa nào, dùng GitHub connector kiểm tra **nhánh HEAD, PR #118 OPEN/DRAFT, GitHub Actions mới nhất**, đọc tài liệu mới nhất ở trên. Không xem các checkpoint 26/10 cũ là nguồn ưu tiên.
2. **Hiện không có yêu cầu sửa code đang dở.** Chủ web đã PASS và muốn đổi chat; **chờ yêu cầu tiếp theo**. Nếu user nêu việc mới, triển khai trực tiếp ở nhánh integration, không hỏi lại việc đã rõ.
3. Khi thay đổi mã, làm đúng scope mới, giữ các khu vực PASS, rà soát CSS chồng lấn, làm responsive PC/Mobile sáng/tối, kiểm thử Chromium thực trên Preview cùng regression tests, báo cáo SHA/run/pass thực tế. Có thể chạy các kiểm tra độc lập song song, nhưng tránh ghi cùng file song song.
4. Không nới điều kiện CI/QA để ép PASS, không báo PASS khi chưa kiểm chứng. Lỗi timing theme đã từng flake; **attempt 2 #40383014004 PASS cùng SHA**, không cần sửa theme khi không có lỗi mới.
5. **NGHIÊM CẤM** tự merge PR #118 / push main / deploy Production / ghi D1-R2 Production / giả chuyển khoản / sửa hay xóa sản phẩm và giá không có lệnh. Nếu chủ web sau này muốn release, phải xác minh ranh giới dữ liệu, review và được phép rõ ràng.
6. Tài liệu nên cập nhật cùng mỗi milestone Owner PASS, không để source SHA/Owner PASS cũ ghi đè trạng thái mới.

**Trạng thái thực tế ở thời điểm bàn giao:** **Owner PASS UI + Preview technical PASS 3/3**; **PR #118 OPEN/DRAFT**, **Production release chưa được cho phép**. Sẵn sàng nhận yêu cầu tiếp theo; **không làm lại nội dung đã PASS**.
