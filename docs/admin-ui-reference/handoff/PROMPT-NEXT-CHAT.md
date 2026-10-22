# PROMPT NEXT CHAT — SINDAREALEST ADMIN

## One-line starter
`Tiếp tục SinDarealest Admin theo trạng thái live trên GitHub. Tự xác minh PR/HEAD/Actions, đọc handoff hiện tại, sửa và kiểm chứng lỗi thật, rồi tiếp tục công việc; không dừng sau báo cáo và không yêu cầu tôi dán prompt cũ.`

## Latest verified checkpoint (2026-10-22)
- Repository: `chichute5500/Sindarealest-admin`.
- Writable branch only: `feature/admin-isolated-handoff-2026-10-20`.
- PR #111 OPEN/unmerged; PR #108 OPEN/unmerged and read-only. Fetch their live head SHAs at the start; handoff docs may lag live GitHub.
- Last explicit code/test SHA recorded: `326526f8f74172ae0aea7fa37739c9a8e8f513ec`. Source fix commit: `e11ec06cd5870522735a28205b678897de829361`.
- Progress remains **50% PROVISIONAL**. Do not increase based on documentation or unit CI alone.
- Validate run [#39804852564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852564) was SUCCESS on code/test SHA `326526f8...` (dependency audit, `npm run check`, `npm test`).
- Preview run [#39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604) was last recorded PENDING with no jobs/artifacts.
- Older Preview run [#39802525217](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39802525217) was last recorded in progress at Chromium installation on older SHA `920f53d...`. These statuses are historical until polled live.

## Required operating sequence
1. Fetch live PR #111 and #108, resolve current branch HEAD SHA, and check whether either PR state or workflow status changed. Never assume this prompt's SHA is still current.
2. Read these files from the writable branch: `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`, and this prompt.
3. Poll the existing Preview runs first; inspect jobs, logs and artifacts for the exact tested SHA. Do not dispatch duplicate workflows while concurrency is occupied.
4. Continue real work after each brief Vietnamese checkpoint; do not stop at reporting. Reproduce an actual failure, make the smallest safe fix, reread the changed files, and validate the new code/test SHA.
5. Review screens #8 Customers, #9 Warranty/support, #10 Website settings, #11 Backup/Restore, #12 Activity log against `docs/admin-ui-reference/admin-mobile-reference.png` at matching viewport/theme. Capture evidence; fixture coverage is not authenticated backend acceptance.
6. Continue the 1,304-path PR #111 provenance review in small evidence-backed batches. Do not blindly revert inherited files or copy across branches.
7. Update handoff files only when live evidence changes. Keep one consistent status and distinguish branch HEAD from tested code SHA. Read back each write and record resulting commit SHA.
8. PASS requires exact SHA plus successful logs and appropriate artifact/screenshots. Otherwise use FAIL / BLOCKED / NOT VERIFIED / PARTIAL_NOT_ACCEPTED.

## Product fix already delivered
- `e11ec06cd5870522735a28205b678897de829361`: Customers/Warranty failed or malformed API responses now show an explicit error instead of pretending the result is an empty list; retry is GET-only.
- `326526f8f74172ae0aea7fa37739c9a8e8f513ec`: synthetic HTTP 503 → error/retry → GET fixture recovery regression authored. Playwright execution and real authenticated backend behavior must be verified separately.

## Hard constraints
- Write only to `feature/admin-isolated-handoff-2026-10-20`.
- Keep PR #111 and #108 OPEN/unmerged. No writes to `main` or the website/static branch.
- No Production deploy, Cloudflare Access bypass, secrets access/exposure.
- Do not run setup/deploy/migration scripts or remote D1/R2 operations.
- No fake product/customer/order/payment facts, prices, stock, images, or unapproved API contracts.
- Documentation-only or test-only work does not increase product progress.
