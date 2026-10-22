# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục làm việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài. Sau đó xác minh live PR #111/#108, branch HEAD, merge base, changed-file list và Actions.

Repository: `chichute5500/Sindarealest-admin`.

## Checkpoint bàn giao gần nhất (phải xác minh lại trước khi thao tác)
- PR #111 OPEN/unmerged; branch `feature/admin-isolated-handoff-2026-10-20`; HEAD được xác minh trong phiên bàn giao: `aa72c11d3bab73a2d49c76121f37b94fa6299892`; changed paths tại checkpoint trước đó là 390; mergeable=false.
- PR #108 OPEN/unmerged; branch `fix/liquid-glass-audit-2026-10-19`; READ-ONLY.
- GitHub connector không trả workflow runs/combined statuses cho HEAD trước đó `edb54cc3d832ded55e3fa07c615f46a98717a578`; exact-SHA validation khi đó NOT_VERIFIED. Kiểm tra lại trên HEAD hiện tại.
- Tiến độ vẫn 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production deployment NOT PERFORMED.

## Giới hạn bắt buộc
- Chỉ ghi lên `feature/admin-isolated-handoff-2026-10-20`; giữ PR #111 và #108 OPEN/unmerged. Không sửa PR #108, nhánh web tĩnh hoặc `main`.
- Không merge, force-push, deploy Production, bypass Cloudflare Access, truy xuất/lộ/thay secrets, thao tác remote D1/R2/schema/ledger, hoặc chạy script setup/migration/deploy.
- Giữ nguyên các mục `DEFERRED_BY_OWNER`: migration 0009, PRE/PRO migrations, R2 persistence/product image save. AI image grouping đang chờ hợp đồng API/UX được chủ dự án duyệt.
- Không bịa dữ liệu sản phẩm, giá, tồn kho, ảnh, khách hàng, đơn hàng, thanh toán hoặc API.

## B1 — tiếp tục cleanup PR #111
1. Xác minh lại live metadata, HEAD, merge base, danh sách changed files và Actions.
2. Audit source/config/tests/workflows/docs. Chỉ xóa file khi chứng minh lỗi thời/ngoài scope/không có consumer; chỉ hợp nhất khi đã xác minh chức năng và mọi tham chiếu.
3. Đã dọn 912 PNG screenshot kiểm thử cũ và 10 snapshot handoff trùng lặp; không làm lại. Giữ ảnh tham chiếu chuẩn và bằng chứng text/JSON.
4. Chạy checks trên exact SHA; kiểm tra Actions. Nếu không có kết quả đúng SHA, ghi NOT_VERIFIED, không suy diễn PASS.
5. Sau checkpoint đã xác minh, đồng bộ `START-HERE.md`, file này, `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `PR-111-SCOPE-AUDIT.md`; đọc lại file sau commit và xác minh HEAD mới.
6. Báo cáo commit, file đã đổi/xóa, kết quả test exact-SHA và blocker còn lại; tiếp tục làm việc thực tế, không dừng ở kế hoạch.

Không nâng % tiến độ khi chưa có tiêu chí nghiệm thu và bằng chứng. Fixture screenshots không phải authenticated backend QA.