# START HERE — SINDAREALEST ADMIN

**Điểm vào duy nhất cho chat mới.** Đọc file này trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài.

## Liên kết chuẩn
- [Prompt bàn giao chat mới — PROMPT-NEXT-CHAT.md](PROMPT-NEXT-CHAT.md)
- [Master prompt tương thích — MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md)
- [Trạng thái kiểm thử — latest-test-results.json](latest-test-results.json)
- [Trạng thái tổng hợp — current-status.json](current-status.json)
- [Báo cáo tiến độ — LATEST-STATUS.md](LATEST-STATUS.md)
- [Audit phạm vi PR #111](PR-111-SCOPE-AUDIT.md)
- [Audit 12 màn hình](12-SCREEN-REFERENCE-AUDIT.md)
- [Chính sách lưu bằng chứng theo run](history/README.md)

## Checkpoint live gần nhất
- Repository: `chichute5500/Sindarealest-admin`.
- PR #111: OPEN/unmerged; branch `feature/admin-isolated-handoff-2026-10-20`; HEAD tại checkpoint `e749873c0635eec31c4d5467cc357238edbebd6c`; 385 changed files (+38,962/−211); `mergeable=false`. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- PR #108 và `main` là read-only; không sửa, merge hoặc deploy Production.
- Validate [#39844022556](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844022556) trên HEAD trên: project-integrity PASS, automated tests FAIL tại `tests/handoff-integrity.test.mjs:35`, vì `latest-test-results.json.latestRun.id/url` là null. Đã xác định lỗi cụ thể; cập nhật pointer và chạy lại kiểm thử trên SHA mới.
- Validate [#39844009143](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844009143) PASS trên SHA cũ `2ccfd452643c431a25f9bb7789f2bbe1acb41e5b`; đây **không** phải bằng chứng PASS cho HEAD hiện tại.
- B1 vẫn PARTIAL. Đã loại 912 PNG sinh tự động cũ, 10 snapshot handoff trùng/lỗi thời, prompt/audit tĩnh lỗi thời, ZIP không được tham chiếu và workflow/script/test chỉ phục vụ web tĩnh; giữ 318 bản ghi lịch sử gọn theo chính sách. Chưa chứng minh đủ căn cứ để xóa/gộp thêm runtime/API.
- Progress 50% PROVISIONAL; 12 màn hình PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.

## Việc tiếp theo — theo đúng thứ tự
1. Fetch live PR #111/#108, HEAD, merge base, changed-path census và Actions. Không dùng SHA/counters lịch sử làm live truth.
2. Đọc `latest-test-results.json` và logs. Sửa pointer `latestRun.id/url` đã xác định, chạy Validate và xác minh exact SHA của commit bàn giao mới.
3. Nếu workflow còn fail, sửa lỗi có log chứng minh trước khi quay lại B1. Không đánh dấu PASS cho tới khi exact-SHA workflow thành công.
4. Tiếp tục rà dependency/provenance cho payment APIs, migration `0009`, scripts/config/workflow, data contracts và tests. Chỉ xóa/gộp khi chứng minh không có consumer và không làm mất giá trị audit/safety. Orders và Order detail phải audit riêng.
5. Sau checkpoint, cập nhật các file bàn giao liên quan trong một commit nguyên tử; đọc lại từ GitHub và fetch lại live HEAD/Actions.

## Rào chắn
- Chỉ ghi vào nhánh PR #111. Giữ PR #111 và #108 OPEN/unmerged. Không sửa PR #108, `main` hay nhánh web tĩnh; không merge/rebase/force-push/deploy Production.
- Không bypass Cloudflare Access; không đọc/đổi secrets.
- Không chạy setup/deploy/migration scripts; không thao tác remote D1/R2/schema/ledger.
- Migration 0009, PRE/PRO migrations, R2 persistence và lưu ảnh sản phẩm đang DEFERRED_BY_OWNER. AI image grouping cần hợp đồng API/UX được chủ dự án duyệt.
- Không tạo dữ liệu giả về sản phẩm, giá, tồn kho, khách hàng, đơn hàng, thanh toán hoặc API.
