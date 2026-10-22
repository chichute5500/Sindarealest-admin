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

## Checkpoint đã xác minh trước lần đồng bộ này
- Repository: chichute5500/Sindarealest-admin.
- PR #111: OPEN/unmerged; branch feature/admin-isolated-handoff-2026-10-20; checkpoint HEAD b8aff9d341e5c08d16ccc52efdab0b63da0e0869; 385 changed files trước cleanup viewer (+38,670/−211); mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- PR #108: OPEN/unmerged, read-only; branch fix/liquid-glass-audit-2026-10-19, HEAD 06a409152455474dab99a134e6f59b16184c11e2. Main HEAD/base SHA là 28c768ba26b1d9f7d40e14efac5112526ed1c8b3.
- Validate [#39844529679](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844529679) **SUCCESS trên đúng SHA b8aff9d341e5c08d16ccc52efdab0b63da0e0869**. Run metadata và checkout log khớp SHA; npm run check và npm test đều PASS, bao gồm handoff integrity, fulfillment/payment contract và payment-ledger route tests.
- Failure #39844022556 trên SHA e749873c0635eec31c4d5467cc357238edbebd6c là lịch sử: latestRun.id/url null. Lỗi pointer đã được sửa; không dùng run cũ làm trạng thái hiện hành.
- Đồng bộ handoff/audit hiện tại tạo SHA mới; phải fetch live HEAD và kiểm tra Validate chạy trên đúng SHA mới trước khi nói current HEAD đã pass. Test parent SHA không thay bằng chứng child SHA.

## B1 — tiến độ và bằng chứng
- B1 vẫn **PARTIAL**. Cleanup đã hoàn tất trước đây: xóa 912 PNG Playwright cũ, 10 snapshot handoff trùng/lỗi thời, prompt/audit lỗi thời, ZIP không được tham chiếu và workflow/script/test chỉ phục vụ web tĩnh; giữ 318 bản ghi history gọn theo chính sách.
- Cleanup mới có căn cứ: docs/admin-ui-reference/admin-mobile-reference.html là file 0 byte, không phải viewer như README mô tả. Đã bỏ viewer rỗng và sửa README; giữ PNG chuẩn admin-mobile-reference.png cùng reference-instructions.md.
- Provenance payment đã rà: các route Admin cấu hình QR, upload QR chờ duyệt, preview riêng tư, serve QR active công khai, public settings, customer capability-token payment read, tạo/hủy payment request và ghi nhận tiền xác minh có phạm vi/quyền/chuyển trạng thái khác nhau. Contract tests kiểm tra ranh giới; không có căn cứ gộp/xóa route.
- functions/_payments.js, migration 0009, package scripts, check/setup/deploy scripts và test consumers đều có tham chiếu; không phải dead code. Migration 0009 và PRE/PRO vẫn DEFERRED_BY_OWNER; không chạy migration/script.
- Audit tổng thể, full changed-path census và QA từng màn hình chưa đóng. Không lặp cleanup cũ; fetch live GitHub trước hành động tiếp theo.

## Việc tiếp theo — theo thứ tự
1. Fetch live PR #111/#108, main, branch HEAD, merge base, changed-file list và Actions mới nhất. Chỉ tin SHA/runs xác minh trực tiếp.
2. Xác minh Validate cho SHA mới của lần đồng bộ này; nếu fail, đọc log và chỉ sửa nguyên nhân có bằng chứng.
3. Tiếp tục provenance cho docs/history/config/workflow/data contracts/tests còn lại. Chỉ xóa hoặc hợp nhất khi chứng minh được consumer/provenance; giữ compact history từng run.
4. Audit riêng Orders và Order detail; synthetic fixtures/screenshots không thay cho authenticated backend QA.
5. Sau checkpoint, đồng bộ handoff và xác minh lại từ GitHub; luôn ghi SHA thực sự đã test.

## Rào chắn bắt buộc
- Chỉ ghi vào feature/admin-isolated-handoff-2026-10-20. Giữ PR #111 và #108 OPEN/unmerged. Không sửa PR #108, main hoặc nhánh web tĩnh; không merge/rebase/force-push/deploy Production.
- Không bypass Cloudflare Access; không đọc/đổi secrets.
- Không chạy setup/deploy/migration scripts; không thao tác remote D1/R2/schema/ledger.
- Migration 0009, PRE/PRO migrations, R2 persistence và lưu ảnh sản phẩm DEFERRED_BY_OWNER. AI image grouping cần hợp đồng API/UX được chủ dự án duyệt.
- Không tạo dữ liệu giả về sản phẩm, giá, tồn kho, khách hàng, đơn hàng, thanh toán hoặc API.
- Mức tiến độ 50% PROVISIONAL; cả 12 màn hình PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
