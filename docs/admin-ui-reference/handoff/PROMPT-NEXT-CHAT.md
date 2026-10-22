> **LIVE CHECKPOINT — supersedes all older SHA/run snapshots below (2026-10-22 21:00 +07).** ADMIN branch HEAD: `df819968a1b3b561bba00abde4fe3432adaa8b39`. PR #111 OPEN/unmerged and matches this HEAD. PR #108 OPEN/unmerged; latest observed static HEAD `f291209565dbc49d78a0b3a387d00be0c754df45`. Progress stays **50% PROVISIONAL**.
>
> - Source validation [#39790514805](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514805) = SUCCESS on exact HEAD `df819968a1b3b561bba00abde4fe3432adaa8b39`.
> - Preview diagnostic [#39790514765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514765) = IN_PROGRESS on exact HEAD `df819968a1b3b561bba00abde4fe3432adaa8b39`; last observed step was Chromium install. Screenshot matrix and Preview diagnosis pending; no artifact available at that poll. Do not mark visual QA PASS.
> - Fixes since earlier checkpoints: [`9209ac3`](https://github.com/chichute5500/Sindarealest-admin/commit/9209ac398636e2187beb2731359ae9c205901157) restores nav collection iteration; [`df81996`](https://github.com/chichute5500/Sindarealest-admin/commit/df819968a1b3b561bba00abde4fe3432adaa8b39) updates Order detail E2E to choose the visible responsive button. Source CI is green; E2E/visual result still pending.
> - #6 Orders remains PARTIAL_NOT_ACCEPTED (3 UI-only fixtures; no live backend or multi-page pagination proof). #7 Order detail NOT VERIFIED pending this run's logs and screenshot artifact.
> - **First action next chat:** poll run #39790514765, jobs/steps/logs/artifacts to completion. Only then review screenshots and update screen statuses. Do not repeat old #3/#4 geometry without a new failure/state.

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


## Live checkpoint 2026-10-22T20:15:00+07:00 — use this before repeating any earlier steps
- Verified ADMIN branch HEAD: `340f50d6ed79afbe11e1db36c878c58f4eec77d6`; PR #111 OPEN/unmerged. PR #108 remains OPEN/unmerged; do not write to its static branch.
- Exact-HEAD source workflow #4740: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39784873315 — PASS, `npm run check`, `npm test`, and activity-log route regression assertions passed.
- Exact-HEAD responsive/Preview workflow #4741: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39784873281 — IN_PROGRESS at last poll. Source/unit steps passed; Chromium/Playwright and final Preview smoke outcomes are NOT VERIFIED yet. Poll this run and inspect job logs/artifacts before rerunning any tests.
- Implemented a dedicated read-only Activity Log screen in `public/admin/index.html`, with regression assertions in `tests/admin-upgrade.test.mjs`. It uses existing authenticated GET `/api/admin/audit-logs`; includes search/action filter/manual refresh/error state, declares the 200-record server limit, and is reachable from desktop nav and mobile “Khác”. No new API contract, fake business data, remote writes, migration, or deployment.
- Activity Log source/unit tests: PASS at `340f50d6ed79afbe11e1db36c878c58f4eec77d6`; visual/mobile/desktop and authenticated live-data QA: NOT VERIFIED. Do not mark screen #12 PASS based on source tests.
- Keep progress **50% PROVISIONAL**. Next: (1) poll #4741 and inspect artifacts; (2) only fix reproducible source defects; (3) update screen #12 evidence after actual screenshots/Preview access; (4) continue remaining screen audit and PR scope audit without repeating valid exact-SHA checks.


## Latest verified handoff update — 2026-10-22T20:25:00+07:00
- ADMIN branch HEAD and PR #111 head: `78697c759185e04f58cdf2ac629fdb368204a3b8`. PR #111 OPEN/unmerged; PR #108 OPEN/unmerged. Do not edit static branch.
- Exact-HEAD source workflow #39785571172 completed SUCCESS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39785571172. Inspect job logs for step-level details; do not reuse an older SHA's results as current-HEAD evidence.
- Preview diagnostic #39784873281 remains IN_PROGRESS on older SHA `340f50d6ed79afbe11e1db36c878c58f4eec77d6`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39784873281. Screenshot/deployed Preview steps were pending at last poll; it does not validate current HEAD.
- Activity Log screen exists in `public/admin/index.html` with regression assertions in `tests/admin-upgrade.test.mjs`; uses existing `GET /api/admin/audit-logs`, search, action filter, refresh, error state, 200-record limit disclosure, desktop nav and mobile More. Visual and authorized live-data QA remain NOT VERIFIED.
- Progress remains **50% PROVISIONAL**. Next: inspect exact-HEAD source logs; obtain safe Preview evidence on current HEAD; record separate PASS/FAIL/BLOCKED/NOT VERIFIED for all 12 screens; continue PR scope audit.
- Safety: no merge, Production deploy, Access bypass, secrets, remote D1/R2 writes, migration/setup execution, fake data or unapproved API contract. Migration 0009, PRE/PRO migrations, R2 save and AI grouping remain deferred/blocked.
