# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thật trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước, tự fetch trạng thái live và tiếp tục phần chưa hoàn thành; không yêu cầu chủ dự án dán lại lịch sử.

Repository: chichute5500/Sindarealest-admin.

## Checkpoint đã xác minh
- PR #111 OPEN/unmerged, branch feature/admin-isolated-handoff-2026-10-20; exact SHA đã test dacc776531248cd38bf761a2381b31b630f94213.
- Validate #39846423113 SUCCESS trên exact SHA dacc776531248cd38bf761a2381b31b630f94213: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39846423113.
- Follow-up handoff commit sinh một SHA mới; fetch Actions run theo head_sha của SHA mới đúng một lần. Khi thành công, không tạo thêm metadata-only commit để chase pointer; nguồn chuẩn là live GitHub.
- PR #108 và main/static branch read-only. Không merge/deploy.

## B1 state
- PARTIAL, chưa nghiệm thu. Cleanup cũ đã hoàn tất; 318 per-run compact records được giữ.
- Viewer HTML 0 byte đã xóa; README sửa; PNG chuẩn và instructions giữ lại; PR changed paths reconciled 384.
- Payment APIs được provenance-audit, không có căn cứ route merge/delete.
- Orders list query and tests were reviewed; order-contact snapshot tests protect per-order contact without mutating customer profile. Order detail is a distinct deep-link view over the same Admin orders data. Fixture/mocks are not authenticated QA.
- Remaining: exact-SHA run for follow-up handoff; finish remaining path/provenance audit; authenticated acceptance for Orders and Order detail is still missing.

## Actions
1. Fetch PR #111/#108, main, current branch HEAD, merge/base, full changed-file list and Actions.
2. Inspect Validate run with head_sha exactly equal to current HEAD; inspect logs if a step fails. Do not infer from older SHA.
3. Continue provenance on remaining configs/workflows/data contracts/docs/history/tests. Keep history records; no deletions without consumer evidence.
4. Do not repeat earlier cleanup or merge payment routes with distinct security/exposure/state contracts.
5. Update handoff only at a substantive checkpoint; avoid endless metadata-only commits.

## Guardrails
- Write only feature/admin-isolated-handoff-2026-10-20; PR #111 and #108 remain open/unmerged. No writes to PR #108, main or static website branch.
- No merge/rebase/force-push/Production deploy, setup/migration/deploy script execution, remote D1/R2/schema/ledger or secrets/Access policy actions.
- Migration 0009, PRE/PRO, product-image/R2 persistence and AI grouping remain deferred unless separately owner-approved.
- Keep 50% PROVISIONAL, all 12 screens PARTIAL_NOT_ACCEPTED, authenticated backend QA NOT_TESTED, remote schema/ledger NOT_VERIFIED and Production NOT_PERFORMED.
