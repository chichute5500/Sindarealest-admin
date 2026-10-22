# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục làm việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài. Sau đó xác minh live PR #111/#108, branch HEAD, merge base, changed-file list và Actions.

Repository: `chichute5500/Sindarealest-admin`.

## Checkpoint bàn giao gần nhất (phải xác minh lại trước khi thao tác)
- PR #111 OPEN/unmerged; branch `feature/admin-isolated-handoff-2026-10-20`; HEAD trước handoff sync `d49c09c582be2e8dad2d501347415581abbe01d5`; 385 changed paths (+38756/−211); mergeable=false.
- PR #108 OPEN/unmerged, read-only; live HEAD `ae2a46506a1b1f4db9dea5bd9131e71bf4fd5f86`; 286 changed files.
- Exact source validation/test [#39840693024](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39840693024) and Preview diagnostic [#39840692976](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39840692976) passed on source SHA `2eb6e7e9d6b1cf15002a7d67e299c713a4d32118`; artifact `admin-preview-evidence-352` contains 102 PNGs. Workflow evidence commit advanced live HEAD to `d49c09c582be2e8dad2d501347415581abbe01d5`; exact-SHA validation for that HEAD is NOT_VERIFIED.
- Census before handoff sync: 385 paths; docs 331, including 318 retained per-run history records. Product progress 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED.

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