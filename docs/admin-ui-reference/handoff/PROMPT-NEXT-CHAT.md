# BÀN GIAO MỚI NHẤT — SINDAREALEST ADMIN (25/10/2026)

**CHỈ XỬ LÝ CÁC VIỆC CHƯA PASS. KHÔNG LÀM LẠI CÁC MỤC ĐÃ PASS. D1/R2 KHÔNG CÒN LÀ ƯU TIÊN THEO YÊU CẦU CHỦ DỰ ÁN.**

Repository: chichute5500/Sindarealest-admin. Chỉ sửa branch feature/admin-isolated-handoff-2026-10-20; PR #111 OPEN, chưa merge. PR #108 (Storefront) và main chỉ đọc; không sửa Production, không tích hợp, không merge. Luôn xác minh HEAD GitHub mới nhất.

## KHÓA PASS — TUYỆT ĐỐI KHÔNG TEST LẠI
- 12/12 màn Admin và chuông thông báo hiển thị số chưa đọc OWNER APPROVED; source 1f0b7fe16e809e323caa8567d230fe34b4b87014, 10/10 CI PASS, deploy #40200290452, visual #40200290474.
- Admin R2 IMAGES/ORIGINALS upload/read/delete + cleanup PASS #40187426696; không chạy lại.
- Restore POST thật trên D1 hoàn toàn dùng một lần, rollback và xóa D1 PASS #40188752986; không chạy lại.
- Security/auth/keyboard/performance SMOKE PASS #40208397077, artifact 12604137595; không chạy lại smoke. Không đánh đồng smoke với pentest toàn diện.
- Product/order/warranty synthetic, responsive, Gallery, UI đã có chứng cứ PASS: không lặp kiểm thử không liên quan.
- Mốc deploy Admin code mới nhất được xác minh: f9c992a614193722d2510755a24fb46dac20c4eb, workflow #40208396978 PASS. Docs HEAD tại lần kiểm tra trước bàn giao: a29a46abe88516456ee23078ad29015649b31e53, 4/4 CI SUCCESS. Commit tài liệu sẽ làm HEAD thay đổi.

## CHỈ CÁC VIỆC CÒN THIẾU ĐƯỢC ƯU TIÊN
1. Kiểm toán bảo mật chuyên sâu còn thiếu: tập trung code và tình huống chưa test (authorization, session, CSRF, IDOR, XSS, abuse, secrets). Chỉ sửa lỗi mới có bằng chứng, trên Admin branch.
2. Accessibility chuyên sâu: screen-reader semantics, focus, thông báo động, contrast, error states, kế hoạch nghiệm thu với assistive technology. Không coi WCAG tự động là signoff thực tế.
3. Hiệu năng/load chuyên sâu: phân tích code, performance budgets, asset/CPU/memory; chỉ benchmark an toàn ở môi trường tách biệt khi được phép. Không stress-test Production/Preview chia sẻ tài nguyên Production.
4. Tài chính: rà soát luồng đối soát/hoàn tiền qua code và lập checklist; không thao tác tiền thật, không tự PASS đối soát ngân hàng. Cần chủ dự án và chứng từ được che dữ liệu xác nhận.
5. API/migration contract Admin–Storefront: đọc PR #108 để đối chiếu orderAccessToken, order-payment, payment-settings, QR và migration 0009. Chỉ lập phương án/test phía Admin, không sửa Storefront và không tạo PR merge tích hợp.

## D1/R2: HOÃN, KHÔNG ĐƯỢC CÔNG BỐ ĐÃ HẾT RỦI RO
Read-only preintegration workflow #40207822357 FAIL vì Storefront Preview DB và ORIGINALS còn cùng tài nguyên Production. Admin Preview ORIGINALS đã có và cách ly PASS. Hai blocker Storefront tồn tại nhưng **DEFERRED/NOT PASSED** theo quyết định không ưu tiên D1/R2; không động Cloudflare bindings, DB, R2 hoặc thử nghiệm ghi Storefront. Tích hợp vẫn BLOCKED, chỉ chủ dự án có quyền đổi ưu tiên.

## QUY TRÌNH CHAT SAU
- Đọc trước docs/preintegration/REMAINING-ONLY-HANDOFF-2026-10-25.md và docs/admin-audit/audit-status-2026-10-25.json.
- Rà soát các công việc chưa PASS theo nhiều nhóm song song; không hỏi lại lịch sử.
- Thực hiện sửa mã Admin an toàn khi phát hiện vấn đề mới; chỉ kiểm tra phần vừa thay đổi, ghi commit và bằng chứng SHA.
- Chỉ dừng khi cần quyền/chứng từ chủ dự án. Báo cáo đã hoàn tất mới, vẫn chưa PASS, phụ thuộc owner.
- Không hứa 100% dự án khi chưa đủ nghiệm thu. Không đổi logo SD vàng và giao diện 12 màn đã duyệt.

**Các tệp lịch sử bên dưới/khác có thể chứa tình trạng 0/12 hoặc D1/R2 chưa PASS đã lỗi thời; ưu tiên checkpoint này.**
