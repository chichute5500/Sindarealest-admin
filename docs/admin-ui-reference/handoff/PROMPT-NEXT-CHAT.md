# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài. Tự xác minh live PR/HEAD/Actions, tiếp tục từ việc chưa xong và cập nhật handoff sau checkpoint.

Repository: `chichute5500/Sindarealest-admin`.

## Latest verified source checkpoint
- PR #111 OPEN/unmerged, branch `feature/admin-isolated-handoff-2026-10-20`, source/test change HEAD at checkpoint `9f87b4fe496b48558a9682a1d4165f0956d86e9b`, 385 changed paths (+38,949/−211), mergeable=false. [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111)
- PR #108 OPEN/unmerged/read-only. Do not modify PR #108, `main`, or the static website branch.
- Latest source change fixes payment summary calculation: transaction display stays capped at 100 rows, but received/refunded/net/remaining totals are aggregated across the complete order ledger. Regression test added for >100 displayed-vs-total mismatch.
- Exact-SHA Actions/status lookup for `9f87b4fe496b48558a9682a1d4165f0956d86e9b` returned no PR-triggered workflow runs and no status checks. Validation is NOT_VERIFIED; do not claim tests passed. Recheck GitHub Actions before proceeding.
- B1 cleanup of identified generated screenshot matrices and stale handoff snapshots is complete. Full runtime/API/migration/setup/workflow provenance review remains PARTIAL; only delete/merge with clear consumer/test evidence. Keep compact per-run history records under `history/README.md` policy.
- Progress remains 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production deployment NOT_PERFORMED.

## Next steps
1. Re-fetch live PR #111/#108, HEAD, merge base, complete changed-path census and exact-SHA Actions; the above SHA is a checkpoint, not guaranteed current after handoff commits.
2. Validate the payment-summary fix and its regression test on the exact source SHA. If a failure appears, inspect logs and fix it before any further cleanup.
3. Continue provenance review of remaining runtime/API/migration/setup/workflow/docs/tests; delete or consolidate only when unused status and no audit/safety value are proven.
4. Keep both PRs OPEN/unmerged. No merge/rebase/force-push, no `main` or static branch writes, no Production deploy, Cloudflare Access bypass, secret access, remote D1/R2/schema/ledger operations, or setup/migration/deploy scripts. Migration 0009, PRE/PRO and R2/product-image save remain DEFERRED_BY_OWNER; AI grouping requires owner-approved API/UX contract.
5. After every checkpoint, sync handoff, read it back, refetch live state and never transfer PASS from another SHA.
