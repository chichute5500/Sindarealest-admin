# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài. Tự fetch live HEAD/PR/Actions, tiếp tục việc chưa xong và cập nhật handoff sau checkpoint.

Repository: chichute5500/Sindarealest-admin.

## Checkpoint đã xác minh
- PR #111 OPEN/unmerged, branch feature/admin-isolated-handoff-2026-10-20; checkpoint SHA đã test b8aff9d341e5c08d16ccc52efdab0b63da0e0869; mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- Validate [#39844529679](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39844529679) SUCCESS trên đúng SHA b8aff9d341e5c08d16ccc52efdab0b63da0e0869; checkout SHA khớp và npm run check + npm test đều PASS.
- Lần đồng bộ handoff này tạo SHA mới; cần xác minh Validate trên exact SHA live mới. Không dùng run #39844529679 làm bằng chứng cho child SHA.
- PR #108, main và nhánh tĩnh vẫn read-only. Không merge hoặc deploy.

## B1 state
- PARTIAL, không tuyên bố hoàn tất. Cleanup cũ đã hoàn tất; 318 per-run compact records được giữ.
- Đã loại viewer admin-mobile-reference.html rỗng 0 byte và sửa README; PNG chuẩn cùng chỉ dẫn reference được giữ.
- Payment provenance đã đọc cùng consumers/tests/migration 0009; trách nhiệm auth/config/upload/preview/serve/request/ledger/customer-token riêng biệt. Không có căn cứ gộp/xóa runtime route.
- Remaining: verify exact-SHA Actions for new sync head; finish path/provenance reconciliation; audit Orders and Order detail separately; preserve QA/deferred boundaries.

## Hành động bắt buộc
1. Fetch PR #111/#108 and main, current branch HEAD, base/compare, complete changed paths and latest Actions. Không tin SHA lịch sử là live truth.
2. Inspect Validate run whose head_sha exactly equals live HEAD; read logs if a step fails. Keep failure #39844022556 in history but recognize #39844529679 passed on b8aff9d341e5c08d16ccc52efdab0b63da0e0869.
3. Continue B1 using consumer/provenance evidence. Do not repeat old deletions or merge endpoints with different auth/exposure/state contracts.
4. After each checkpoint synchronize current-status.json, latest-test-results.json, START-HERE.md, this prompt, LATEST-STATUS.md and PR-111-SCOPE-AUDIT.md; read back from GitHub and verify refs.
5. Preserve separate acceptance for Orders and Order detail. Fixture screenshots do not prove authenticated backend acceptance.

## Guardrails
- Write only to feature/admin-isolated-handoff-2026-10-20; keep PR #111 and #108 OPEN/unmerged. Never write PR #108, main or static website branch.
- No merge/rebase/force-push/Production deploy; do not run setup/migration/deploy scripts; no remote D1/R2/schema/ledger actions; no secrets or Cloudflare Access bypass.
- Migration 0009, PRE/PRO migration changes, product image save/R2 and AI image grouping remain deferred unless separately owner-approved.
- Keep progress 50% PROVISIONAL, all 12 screens PARTIAL_NOT_ACCEPTED, authenticated backend QA NOT_TESTED, remote D1 schema/ledger NOT_VERIFIED and Production NOT_PERFORMED.
