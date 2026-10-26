# PROMPT CHAT MỚI — SINDAREALEST: HOÀN THÀNH TÍCH HỢP WEB (26/10/2026)

> **CHECKPOINT QA BỔ SUNG 26/10/2026 — ƯU TIÊN HƠN THÔNG TIN CŨ BÊN DƯỚI.** SOURCE kiểm thử mới **`cfb9351424eea3d43a4fe2936a6f989be4dbe10a`** (HEAD có thể đã thêm commit tài liệu). Đã tạo E2E có thực thi đầy đủ Cloudflare Pages **route handlers** với một SQLite disposable áp dụng migration 0001–0009: Storefront tạo đơn, Admin xem/duyệt giá và terms, pending/active QR giả, payment request, ledger nhận tiền/hoàn tiền giả, paid/freeship/cancel, token/auth/CSRF/fail-closed; và Chromium **4/4 PC/Mobile sáng/tối** bấm UI trên Preview nhưng **POST chỉ gọi route handler ở địa chỉ cục bộ và DB disposable**. **0 remote writes, 0 real transfers**. Source CI PASS [#40277268196](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268196); Preview D1/R2 safety/deployed SHA, 8/8 browser UI + 4/4 browser checkout PASS [#40277262988](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988); Admin Preview read-only PASS [#40277268193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268193); screenshot artifact ID **12630847523**, expires 09/11/2026. **ĐỌC CHI TIẾT:** [QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md](./QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md). Workflow Admin isolated branch guard [#40277268183](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268183) FAIL do chạy sai nhánh, không gọi tất cả xanh. **CHƯA chứng minh remote Preview D1 POST hay ngân hàng thật; chưa OWNER nghiệm thu tổng thể; PR #118 DRAFT CHƯA MERGE; cấm deploy Production.** Không làm lại phần UI Owner PASS. Việc tiếp theo: xác minh branch/main/PR HEAD; nếu Owner yêu cầu Gate remote Preview D1 thì dùng D1/R2 test cách ly độc lập có chứng cứ, còn không trình Preview+ảnh để Owner nghiệm thu tích hợp và chỉ xin phép merge sau acceptance.


**Tiếp tục trực tiếp**, KHÔNG tạo dự án mới, KHÔNG hỏi người dùng lặp lịch sử. Repo GitHub `chichute5500/Sindarealest-admin`. Đầu tiên truy xuất tài liệu `docs/integration/STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md` trên branch `integration/storefront-locked-on-main-2026-10-26`, rồi xác minh SHA/PR/CI/Preview trực tiếp trên GitHub.

## Checkpoint đã kiểm chứng
- Production Admin `main` ở `db40af63965678598b0ebd3f3fe63865849dcf2e` khi bàn giao. User đã triển khai Admin lên main. Nếu main thay đổi, lấy trạng thái mới trước khi sửa.
- Branch tích hợp `integration/storefront-locked-on-main-2026-10-26`; **last full source QA SHA** `dd72ed1ec1d3854ef43d6d707259915c698e4b86`. HEAD có thể đã thêm commit tài liệu, hãy so diff, đừng đánh mất SHA PASS.
- **PR #118**, OPEN/DRAFT/mergeable, **CHƯA MERGE**: https://github.com/chichute5500/Sindarealest-admin/pull/118.
- **CI PASS**: Actions #40274309066 và #40274305508.
- **Isolated Preview full pipeline PASS** Action #40274305506, cả hai jobs gồm SHA/binding isolation, deploy + Chromium 8/8 PC/Mobile sáng–tối PASS, GET API public PASS; screenshot artifact `storefront-main-integration-dd72ed1ec1d3854ef43d6d707259915c698e4b86`, id `12629383033`, exp 09/11/2026.
- Live isolated Preview: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ (Cloudflare rút gọn alias, không dùng URL dài).
- Admin Preview Playwright PASS #40274308968. Một workflow riêng "Admin isolated Preview Playwright" #40274309155 FAIL ở branch guard vì đây không phải nhánh Admin isolated; điều tra đúng phạm vi, đừng báo tất cả đều xanh.
- Nguồn Storefront owner PASS: `fix/liquid-glass-audit-2026-10-19` @ `4feacf7`. HERO code-only owner PASS, Welcome 12/12 PASS, Gallery, các ô dịch vụ, layout và **bay CẢ ô sản phẩm vào giỏ** đã được owner PASS. **KHÓA THIẾT KẾ — KHÔNG SỬA/RENDER/DỰNG LẠI PHẦN PASS**. Admin trên main đã hoàn tất, không thiết kế lại.
- Không merge bừa PR #108 hay PR #113 cũ; PR #118 đã tích hợp chọn lọc trên main mới.

## NHỮNG VIỆC CHƯA HOÀN THÀNH — LÀM NGAY, ĐA LUỒNG
**L1 (Git/CI & security):** Kiểm tra branch/PR118/compare với main mới nhất, CI, drift/mergeable, Preview D1/R2 KHÔNG trùng Production; xử lý các gate CI còn lỗi đúng nguyên nhân, không bỏ bảo vệ.

**L2 (E2E checkout + Admin + payment):** Đây là GATE QUAN TRỌNG. Audit Chromium trước **chặn mọi method ghi** và mock public catalog; 8/8 PASS **không** đồng nghĩa luồng mua hàng thật đã test. Dùng **chỉ D1/R2 Preview cách ly hoặc disposable local fixtures** để chạy giỏ → checkout → POST tạo đơn → snapshot/mã `orderAccessToken` → Admin nhận đơn → admin xác nhận giá → QR active/payment request → trạng thái nhận tiền/ledger/freeship/refund/cancel. Thử cả điều kiện fail-closed và CSRF, không chuyển tiền thật, không dùng dữ liệu Production. Báo PASS dựa trên request/response/DB evidence thực, thất bại thì sửa đúng phạm vi và chạy lại.

**L3 (browser regression):** Đồng thời chạy Playwright trên Preview đúng SHA, PC/Mobile sáng/tối; kiểm tra các phần đã owner PASS chỉ để phát hiện regression tích hợp: Welcome first paint, HERO ngắn mobile, tiếng Việt, Gallery, sản phẩm, tương tác cart, checkout, accessibility, CSS không chồng. Chụp/snapshot đối chiếu. Tuyệt đối không chỉnh sửa thẩm mỹ phần PASS.

**L4 (release/handoff):** Rà API đường dẫn `/sanpham/{category}/{verifiedSKU-or-id}`, sitemap, legacy redirect, public catalog, migrations D1 0009, các API mới, deployment bindings; chuẩn bị checklist QA + rollback; cập nhật docs/pr evidence. Làm song song với L1/L2/L3, không chờ khi không phụ thuộc.

## Quy tắc an toàn và kết thúc
1. Không chạy workflow test ghi trên Preview fix cũ `fix-liquid-glass-audit-2026.sindarealest2.pages.dev` vì có rủi ro binding Production; mọi ghi thử chỉ ở Preview cách ly đã verify DB/R2 khác Production.
2. Chỉ sửa nhánh tích hợp, giữ `main` không đổi, không force-push, không sửa backend thanh toán Admin nếu không có bug có bằng chứng.
3. Không nói dự án "100%" nếu chưa thực sự đóng E2E + nghiệm thu tích hợp + được owner cho phép merge + xác minh Production.
4. Không hỏi lại phần người dùng đã PASS; chỉ xin quyết định của owner ở bước cuối cần xác nhận merge/deploy.
5. Khi xong các gate: gửi link Preview + ảnh + logs + báo cáo từng PASS/FAIL, rồi xin quyền merge PR #118 sang `main`; nếu được cho phép thì mới merge và xác minh Production. Không tự triển khai.
6. Làm việc đa luồng/Promise.all với nhiệm vụ độc lập, kiểm tra commit mới nhất trước khi ghi, không bịt lỗi bằng bỏ bài test. Báo cáo tiến triển đúng sự thật, tiếp tục xử lý ngay các việc còn khả thi. Không hứa tự làm sau khi chat kết thúc.

**Ưu tiên số 1:** E2E đơn hàng và thanh toán trên isolated D1/R2. **Giữ nguyên HERO, Welcome, Gallery, cart flight, Admin và UI đã được PASS.**
