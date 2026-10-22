# PROMPT NEXT CHAT — SINDAREALEST ADMIN

## One-line starter
`Tiếp tục SinDarealest Admin theo trạng thái live trên GitHub. Tự xác minh PR/HEAD/Actions, đọc handoff hiện tại, sửa và kiểm chứng lỗi thật, rồi tiếp tục công việc; không dừng sau báo cáo và không yêu cầu tôi dán prompt cũ.`

## Current checkpoint (before this docs-only commit)
- Product/test SHA: `326526f8f74172ae0aea7fa37739c9a8e8f513ec`; source fix commit: `e11ec06cd5870522735a28205b678897de829361`.
- PR #111 OPEN/unmerged on `feature/admin-isolated-handoff-2026-10-20`; PR #108 OPEN/unmerged with last-observed head `32c4aa52e03e8917b930ff13d9775215e2876f62`.
- Validate #39804852564 SUCCESS on exact SHA; dependency audit, `npm run check`, `npm test` passed.
- Preview #39804852604 PENDING with no job/artifact at last poll.
- Older Preview #39802525217 still in progress at Chromium installation on old SHA `920f53d...`; poll before any rerun.
- Progress remains **50% PROVISIONAL**; no screen is fully accepted.

## Operating sequence
1. Fetch live PR #111/#108 and current ADMIN HEAD. This handoff-only commit advances HEAD; distinguish current HEAD from code/test SHA.
2. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, and `PR-111-SCOPE-AUDIT.md` live.
3. Poll already-running Actions; do not create duplicate runs while `admin-preview-diagnostics` concurrency is occupied.
4. Read exact-SHA logs and artifacts. Fix only reproduced issues; read files back and re-validate.
5. Continue #8 Customers, #9 Warranty/support, #10 Settings, #11 Backup/Restore and #12 Activity log. Compare screenshots against reference at matching viewport/theme; keep fixture outcomes separate from backend acceptance.
6. Continue the 1,304-path PR #111 provenance review in small batches. Don't blindly revert inherited files.
7. Update handoff only when evidence materially changes; consolidate docs in a single commit where feasible.

## Product fix already delivered
- `e11ec06cd5870522735a28205b678897de829361`: Customers/Warranty API failure or malformed response now renders explicit error state with GET-only retry.
- `326526f8f74172ae0aea7fa37739c9a8e8f513ec`: synthetic HTTP 503→retry→GET-fixture recovery regression; source/unit CI passed, Playwright remains pending.

## Hard constraints
- Only write to `feature/admin-isolated-handoff-2026-10-20`; keep both PRs OPEN/unmerged.
- No `main` or website-branch writes, Production deploy, Cloudflare Access bypass, secret access/exposure.
- Do not run setup/deploy/migration scripts or remote D1/R2 operations.
- No fake product/customer/order/payment facts, price, stock, images or unapproved API contracts.
- PASS requires exact SHA and supporting logs/artifact; otherwise FAIL/BLOCKED/NOT VERIFIED/PARTIAL_NOT_ACCEPTED.
- Brief Vietnamese checkpoint reports must be followed by the next safe action; docs/test-only work does not raise the progress percentage.
