# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục làm việc thực tế trên GitHub; sau mỗi checkpoint ngắn, tự làm tiếp nhiệm vụ an toàn kế tiếp. Không dừng ở báo cáo. Không hỏi lại dữ kiện đã có; nếu thật sự cần quyền/contract/phê duyệt của chủ sở hữu thì ghi BLOCKED.

## Refs và exact-SHA
- Repo chichute5500/Sindarealest-admin. ADMIN branch duy nhất: feature/admin-isolated-handoff-2026-10-20; PR #111 phải OPEN, không merge.
- Protected static branch fix/liquid-glass-audit-2026-10-19; PR #108 phải OPEN, không merge và không ghi vào branch này.
- Pre-write ADMIN HEAD 368b3f26911f47f12cdb7ab6f300ad359283b9cc. Validate #4737 (https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780791597) chạy đúng SHA này; npm run check PASS, npm test PASS. Lượt ghi handoff này tạo successor docs-only; bắt buộc fetch live HEAD và kiểm tra chính SHA mới khi bắt đầu chat sau.
- PR #108 snapshot OPEN/unmerged, HEAD ebdd5e657c317490ce7747056ffa37be8c65ab0c. Fetch lại cả hai PR trước mọi việc.
- Responsive/Preview run #316 (https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707) dùng SHA 305fc139c22d682b4b6882af18d6d79836887cc7, artifact https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707/artifacts/12426370257. Log ghi 3 local Playwright test và 2 Preview smoke test PASS. Compare sang 368b3f26911f47f12cdb7ab6f300ad359283b9cc chỉ đổi README/handoff docs, không đổi application-source paths; song exact-SHA policy vẫn là NOT VERIFIED cho UI/Preview.
- Tiến độ giữ 50% PROVISIONAL; docs, CI xanh, ảnh fixture không tự tăng %.

## UI: không lặp lại
Mapping chuẩn: #1 Login, #2 Dashboard, #3 Product list, #4 Product editor, #5 Product gallery, #6 Orders, #7 Order detail, #8 Customers, #9 Warranty/support, #10 Website settings, #11 Backup/Restore, #12 Activity log. Product classification ở #3/#4. AI image grouping là feature riêng BLOCKED, không phải #11.
- #3: REVIEW_CLOSED_DATA_LIMITED_NO_SOURCE_DEFECT_PROVEN, vẫn PARTIAL_NOT_ACCEPTED. 320×640 và 360×800 light/dark không overflow ngang; 3 fixtures / page-size 12 nên pagination nhiều trang chưa chứng minh. Placeholder ảnh, giá và stock phải giữ thật. Không lặp review nếu không có state mới/lỗi source tái hiện.
- #4: PARTIAL_NOT_ACCEPTED. Tabs/keyboard, layout, SKU checkbox geometry, AI button geometry, footer đã xem; không chứng minh SKU persistence, backend save, AI endpoint thật hoặc parity toàn màn hình. Không lặp geometry cũ.
- Next audit UI: #6 Orders và #7 Order detail độc lập; sau đó các screen còn lại, từng screen status riêng. Tất cả 12 hiện PARTIAL_NOT_ACCEPTED.

## CI/source
- Exact pre-write source SHA 368b3f26911f47f12cdb7ab6f300ad359283b9cc: [Validate #4737](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780791597) job validate PASS. npm run check, npm test PASS. Migration checks use temporary/local D1, not remote database.
- [Preview #316](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707) source 305fc139c22d682b4b6882af18d6d79836887cc7, [artifact #316 / 12426370257](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707/artifacts/12426370257). Limited login/dashboard smoke only; not full authenticated business-module QA.
- Cloudflare Pages check gave Preview URL https://86630339.sindarealest2.pages.dev and branch URL https://feature-admin-isolated-hando.sindarealest2.pages.dev. This work did not deploy Production.

## Migration/setup/deploy and API guards
- Source preflight 0009 uses SELECT ... LIMIT 0 and tests assert query/ordering. Setup/deploy gate commits ca06ac02253644ed0290c5bca343c33a872010d0 and 6ad36a5bbb3b7ffb5ee2f90d5df0eb4d47c75972; tests at 305fc139c22d682b4b6882af18d6d79836887cc7.
- CRITICAL: setup-cloudflare.mjs checks 0009 only after remote migration commands 0001 and 0003–0008. Gate itself is read-only and blocks seed/deploy; the whole script is not read-only and may alter schema before the gate fails. Do not run setup/deploy/migrations.
- Payment source routes require Admin auth, server-derived amount, confirmed price/terms, priced items/classified fulfillment/valid QR; transaction route/test has duplicate reference and atomic refund guards. Unit test coverage is not real authenticated backend QA.
- Remote D1 schema/ledger NOT VERIFIED. Migration 0009 DEFERRED_BY_OWNER; AI grouping BLOCKED awaiting approved contract; R2 image saving and PRE/PRO migrations DEFERRED_BY_OWNER.

## Required next steps and safety
1. Re-read current-status.json, latest-test-results.json, PROMPT-NEXT-CHAT.md, LATEST-STATUS.md, 12-SCREEN-REFERENCE-AUDIT.md and PR-111-SCOPE-AUDIT.md at the live current HEAD.
2. Fetch workflow runs, jobs and logs; require head_sha to equal the live HEAD for each PASS. Do not infer visual PASS from unchanged app source or a different SHA.
3. Do #6/#7 separate screen-specific audits; then remaining screens, record status, SHA, viewport/theme, artifact URL, scope and limitations.
4. Continue PR #111 path provenance. Preserve inherited files and never blind-revert.
5. No merge #111/#108; no main/static writes; no Production deployment; no Access bypass; no secret read/change; no setup/deploy/migration or remote D1/R2 query/write; no invented product data, API contract or acceptance evidence.
6. After every documentation write, read back all affected files from GitHub at resulting commit, report exact commit SHA and re-confirm both PRs open/unmerged.
