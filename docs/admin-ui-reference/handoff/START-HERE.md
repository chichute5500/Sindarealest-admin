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

## Checkpoint live đã kiểm thử
- Repository chichute5500/Sindarealest-admin.
- PR #111 OPEN/unmerged; branch feature/admin-isolated-handoff-2026-10-20; checkpoint HEAD dacc776531248cd38bf761a2381b31b630f94213; 384 changed files (+38,796/−211); mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- PR #108 OPEN/unmerged, read-only; branch fix/liquid-glass-audit-2026-10-19; head d869cc63660b75f434d2ea86f925e528b0ffa806. Main/base SHA 28c768ba26b1d9f7d40e14efac5112526ed1c8b3.
- Validate [#39846423113](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39846423113) **SUCCESS trên đúng SHA dacc776531248cd38bf761a2381b31b630f94213**; Actions run head_sha khớp live checkpoint và job validate hoàn tất thành công, gồm project integrity và npm test.
- Handoff sync tiếp theo tạo một SHA mới. Phải kiểm tra run có head_sha đúng SHA mới một lần; sau đó dùng live GitHub làm nguồn sự thật và không tạo commit chỉ để tự cập nhật pointer của chính run đó.

## B1 — tiến độ và bằng chứng
- B1 **PARTIAL, chưa hoàn tất**. Cleanup trước đó: 912 PNG cũ, 10 snapshot handoff trùng/lỗi thời, prompt/audit lỗi thời, ZIP không tham chiếu, workflow/script/test riêng web tĩnh; giữ 318 bản ghi history gọn.
- Đã xóa docs/admin-ui-reference/admin-mobile-reference.html vì blob 0 byte; sửa README. PNG chuẩn admin-mobile-reference.png và reference-instructions.md vẫn còn. Live PR census xác nhận 384 changed paths; còn một file HTML là Admin UI.
- Payment provenance: các route cấu hình QR, upload pending, preview riêng tư, serve QR active công khai, public settings, token-scoped customer view, tạo/hủy request và ledger xác minh giao dịch khác trách nhiệm/quyền/cache/trạng thái. Tests assert các ranh giới; không có căn cứ gộp/xóa.
- Orders: query giới hạn 1.000 parent orders trước khi join items trong một lần đọc; test mock kiểm tra grouping, giá null và số query. Checkout snapshot giữ thông tin liên hệ tại thời điểm đặt, không ghi đè hồ sơ khách; tests/migration 0007 kiểm tra điều đó.
- Order detail là route/view riêng dựa trên orderId, đọc lại dữ liệu orders hiện có và có luồng quay về dòng thao tác. E2E ảnh dùng fixture/mock, không phải authenticated backend acceptance; Orders và Order detail tiếp tục PARTIAL_NOT_ACCEPTED.
- Migration 0009, PRE/PRO, R2 product-image persistence còn DEFERRED_BY_OWNER. Không chạy setup/deploy/migration scripts hoặc remote D1/R2.

## Việc tiếp theo
1. Fetch live branch HEAD, PR #111/#108, main, changed paths và Actions; xác minh run exact-SHA của handoff sync cuối cùng một lần.
2. Nếu run exact SHA thành công, tiếp tục B1 mà không tạo commit chỉ để đuổi theo pointer mới; live GitHub là nguồn trạng thái kiểm thử.
3. Hoàn thiện provenance cho changed paths/docs/history/config/workflow/data contracts/tests còn lại. Giữ per-run compact history theo policy.
4. Không nâng Orders/Order detail hay 12 màn hình lên accepted trước khi có bằng chứng backend được xác thực.

## Rào chắn
- Chỉ ghi branch feature/admin-isolated-handoff-2026-10-20. Giữ PR #111/#108 OPEN/unmerged; không ghi PR #108, main hoặc static branch.
- Không merge/rebase/force-push/deploy Production; không chạy setup/migration/deploy; không remote D1/R2/schema/ledger; không secret hay Cloudflare Access bypass.
- Không tạo dữ liệu giả; không thay API contract chưa được duyệt.
- Tiến độ 50% PROVISIONAL; 12 màn hình PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
