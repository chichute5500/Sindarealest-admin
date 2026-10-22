# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài. Tự fetch live HEAD/PR/Actions, tiếp tục từ việc chưa xong và cập nhật handoff sau checkpoint.

Repository: `chichute5500/Sindarealest-admin`.

## Trạng thái tại checkpoint 2026-10-22T19:54:30Z
- PR #111 OPEN/unmerged, branch `feature/admin-isolated-handoff-2026-10-20`, HEAD `e749873c0635eec31c4d5467cc357238edbebd6c`, 385 changed paths (+38,962/−211), mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- Validate [#39844022556](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844022556): project integrity PASS, npm test FAIL vì `tests/handoff-integrity.test.mjs:35` — `latest-test-results.json.latestRun.id/url` null. Đây là lỗi handoff metadata cụ thể, không phải bằng chứng lỗi logic payment. Đã ghi lại pointer để sửa và phải xác minh trên SHA mới.
- Validate [#39844009143](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844009143) PASS trên SHA cũ `2ccfd452643c431a25f9bb7789f2bbe1acb41e5b`; không áp dụng cho HEAD mới.
- B1 PARTIAL: cleanup ảnh/snapshot/prompt/web-static cũ hoàn tất; full provenance audit runtime/API/config/migration/scripts/tests còn dang dở. 318 per-run history records được giữ theo chính sách.

## Hành động bắt buộc
1. Fetch live PR #111/#108, HEAD, changed paths, Actions; xác minh handoff files vừa đồng bộ có còn là HEAD không.
2. Xác minh `latestRun.id/url` đã hợp lệ, chạy lại Validate trên exact SHA mới; đọc logs nếu fail. Không tuyên bố pass cho SHA khác.
3. Tiếp tục B1 bằng dependency/provenance review, ưu tiên payment APIs, migration 0009, deploy/setup scripts, data contracts và test coverage. Chỉ xóa/gộp với bằng chứng cụ thể; không đoán.
4. Cập nhật `current-status.json`, `latest-test-results.json`, `START-HERE.md`, `PROMPT-NEXT-CHAT.md`, `LATEST-STATUS.md`, `PR-111-SCOPE-AUDIT.md` đồng bộ; đọc lại từ GitHub và xác minh live HEAD/Actions.

## Giới hạn không được vi phạm
- Chỉ ghi PR #111 branch `feature/admin-isolated-handoff-2026-10-20`; PR #108, `main`, nhánh web tĩnh là read-only. Không merge/rebase/force-push/deploy Production.
- Không chạy migration/setup/deploy scripts, không thao tác remote D1/R2/schema/ledger, không đọc/đổi secrets hoặc bypass Access.
- Migration 0009, PRE/PRO migrations, R2 persistence, product image save deferred by owner; AI grouping requires owner-approved API/UX contract.
- Không fabricate dữ liệu hoặc API. Authenticated backend QA chưa test; 12 màn hình vẫn PARTIAL_NOT_ACCEPTED; tiến độ 50% PROVISIONAL.
