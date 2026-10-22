## PERMANENT START RULE — NO MANUAL PROMPT HANDOFF

This is the permanent operating contract. It overrides stale instructions elsewhere in this file when they conflict.

### User's only action
The user should not have to copy the previous chat's prompt, summarize status, or paste a handoff. A new chat receives only this fixed starter:
"Tiếp tục SinDarealest Admin theo nguồn trạng thái live trong GitHub. Tự xác minh HEAD/PR/CI, đọc handoff mới nhất, rồi tiếp tục làm việc thực tế; không hỏi tôi dán prompt cũ."

### Mandatory startup protocol for every chat
1. Identify repository `chichute5500/Sindarealest-admin` and ADMIN branch `feature/admin-isolated-handoff-2026-10-20`.
2. Fetch live PR #111 and PR #108, current ADMIN branch HEAD, and latest relevant workflow runs. Do not assume SHAs/statuses copied into this file are current.
3. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`, and this prompt from the live ADMIN branch. Resolve disagreements using evidence tied to exact SHA and timestamp.
4. Poll already-running workflows for the current HEAD before triggering another. Never start duplicate runs just to create activity. A run on an older SHA is historical, not proof for current HEAD.
5. Select the next incomplete product acceptance item from the live audit. Reuse existing evidence; don't repeat completed checks without a changed source, failed test, or explicit reason.
6. Make a focused, reversible change on ADMIN branch only when a concrete defect or missing acceptance criterion is evidenced. Never touch `main`, PR #108/static branch, Production, secrets, Cloudflare Access, remote D1/R2, or migrations. Do not run `setup-cloudflare.mjs`.
7. Validate the change on the exact commit, inspect logs/artifacts, and read back the changed file. If CI is queued, continue safe work on an independent item instead of waiting passively, but do not claim the queued test passed.
8. Update handoff files only when meaningful evidence or the next action changes. Keep JSON and Markdown consistent; avoid docs-only commits that merely restate old status. Commit and re-read from the live branch.
9. End the session with exact current HEAD, PR states, latest CI status, verified deliverables, blockers, and next action written to the live source of truth. Report briefly, then continue safe work when possible.

### Progress rules
- Never increase the overall percentage for prompt edits, docs-only commits, test-harness-only fixes, repeated investigations, or screenshots without accepted criteria.
- Increase progress only when a product screen/feature passes explicit acceptance criteria with evidence tied to exact SHA. Keep unverified backend/payment/R2/AI/migration capabilities explicitly unverified.
- A session counts as progress only if it delivers a verified product improvement or closes a previously open acceptance/blocker with evidence. Otherwise state the actual blocker; do not disguise activity as completion.

### Historical checkpoint — revalidate before use
- ADMIN code/test commit last observed: `7d9cde727476ac05ee7431b457e7377b34c750fe`.
- Workflow `39797841880` was queued when last observed; re-query it. Do not assume it is still queued or passed.
- Earlier test failures: run `39794007381` failed the `.mobiletabs` visibility expectation; run `39796182324` failed with `ReferenceError: variant is not defined`. Commit `7d9cde7` changed the test to use `page.viewportSize()?.width`; its exact-SHA outcome was not verified at the last checkpoint.
- PR #111 and PR #108 were last observed OPEN/unmerged. Revalidate both before claiming their state.
- Overall progress was last stated as 50% provisional; recalculate from accepted deliverables before presenting it as current.
- These are historical facts, not live state.

---

# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục làm việc thực tế trên GitHub, không chỉ phân tích/báo cáo. Sau mỗi checkpoint hãy tiếp tục ngay bước an toàn kế tiếp trong cùng phiên. Không hỏi lại thông tin đã có, không lặp lại chẩn đoán đã đóng. **Mục tiêu mỗi phiên phải tạo ra tiến triển sản phẩm hoặc một kết luận kiểm thử mới có bằng chứng; không tính sửa tài liệu/test harness là tiến độ sản phẩm.**

## LIVE CHECKPOINT — 2026-10-22
- ADMIN HEAD hiện tại: `7d9cde727476ac05ee7431b457e7377b34c750fe`.
- PR #111 vẫn OPEN/unmerged; PR #108 vẫn chỉ đọc.
- Run duy nhất cần poll trước tiên: [#39797841880](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39797841880), exact SHA `7d9cde7`; trạng thái gần nhất QUEUED. Không tạo run trùng.
- Lỗi chain đã xác minh: #326 trên `26f1c6f` fail vì `.mobiletabs` hidden trong khi test mong visible ở line 1752; #327 trên `401b961` fail `ReferenceError: variant is not defined` cùng line. Commit `7d9cde7` đọc viewport thực từ `page.viewportSize()` để bỏ biến ngoài scope; CI chưa xác nhận kết quả.
- Progress giữ 50% PROVISIONAL; chỉ tăng khi hạng mục sản phẩm/màn hình đạt tiêu chí chấp nhận, không tăng vì commit kiểm thử hoặc docs.
- Sau CI, dành phiên cho hạng mục chức năng/màn hình chưa được chấp nhận. Không tiếp tục tạo chuỗi docs-only commits trừ khi có kết quả mới cần bàn giao.

## 1. Repository và phạm vi cứng

- Repository: `chichute5500/Sindarealest-admin`
- Chỉ làm việc trên nhánh ADMIN: `feature/admin-isolated-handoff-2026-10-20`
- PR ADMIN #111: https://github.com/chichute5500/Sindarealest-admin/pull/111 — giữ OPEN, không merge.
- Website tĩnh / PR #108: `fix/liquid-glass-audit-2026-10-19` / https://github.com/chichute5500/Sindarealest-admin/pull/108 — chỉ đọc/xác minh, không ghi.
- Không sửa `main`, không cherry-pick hoặc ghi chéo nhánh.
- Không deploy Production, bypass Cloudflare Access, đọc/ghi secret, hoặc chạy setup/deploy/migration/remote D1/R2/schema/data operation. **Tuyệt đối không chạy `scripts/setup-cloudflare.mjs`.**
- Không tự tạo sản phẩm, ảnh, giá, tồn kho, đơn hàng, khách hàng, trạng thái thanh toán hoặc API contract giả.
- PASS chỉ khi có bằng chứng thật với SHA + workflow/artifact; phân biệt PASS / FAIL / BLOCKED / NOT VERIFIED / PARTIAL_NOT_ACCEPTED.

## 2. Bước đầu tiên — live refs, sau đó workflow hiện có

Handoff cũ bên dưới là lịch sử, không phải trạng thái live. HEAD mới nhất đã tiến tới `7d9cde727476ac05ee7431b457e7377b34c750fe`; không dùng các SHA/run cũ làm trạng thái hiện tại. Vì vậy:
1. Poll run #39797841880 và xác minh PR refs live; chỉ đọc lại file handoff khi cần chỉnh theo kết quả mới.
2. Code/test SHA cần xác minh hiện tại là `7d9cde727476ac05ee7431b457e7377b34c750fe`; commit này vẫn chỉ sửa harness, không phải product fix.
3. Poll run #39797841880 trước tiên, không tạo duplicate. Nếu fail, lấy log đúng run và sửa nguyên nhân mới đã chứng minh. Các run #39794007381/#39796182324 là bằng chứng lịch sử cho lỗi breakpoint và lỗi biến `variant`, không phải run hiện tại.
4. Run #324 chứng minh `npm run check` và `npm test` PASS trên `a6fc090`; không chứng minh SHA mới `26f1c6f`. Run #326 phải được đọc log + artifact trước khi cập nhật trạng thái.

## 3. Lỗi và sửa gần nhất

- `a6fc090`: chọn action hiển thị khi trả từ Order detail.
- `37c3c40`: chọn order row/card đang hiển thị ở breakpoint hiện hành.
- `26f1c6f`: sửa E2E assertion sau khi thoát Order detail thành selector `:visible`.first(), tránh strict-mode vì desktop/mobile có hai nút trùng selector.
- Run #324 lỗi ở `tests/e2e/admin-static-baseline.spec.js:630`: selector cũ match cả hai button. Không sửa lại chỉ từ suy luận; chờ run #326 xác nhận. Nếu lỗi tiếp, đọc log/artifact chính xác rồi chỉ sửa nguyên nhân đã chứng minh.

## 4. Các file handoff phải đồng bộ

Đọc/cập nhật theo thông tin live, không tin snapshot cũ hơn:
1. `docs/admin-ui-reference/handoff/current-status.json`
2. `docs/admin-ui-reference/handoff/latest-test-results.json`
3. `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`
4. `docs/admin-ui-reference/handoff/LATEST-STATUS.md`
5. `docs/admin-ui-reference/handoff/12-SCREEN-REFERENCE-AUDIT.md`
6. `docs/admin-ui-reference/handoff/PR-111-SCOPE-AUDIT.md`

Đừng lặp lại mọi checkpoint cũ. Giữ phần lịch sử chỉ khi còn hữu ích; đầu file phải thể hiện trạng thái mới nhất, SHA cụ thể và run chính cần làm tiếp. Sau khi cập nhật, đọc lại các file ở HEAD mới và kiểm tra PR #111/#108.

## 5. Kết quả mới và 12 màn hình

Artifact #324 có 61 PNG: 16 login shell + 45 ảnh fixture, 41 metric; page/console/failed request/HTTP error = 0; fixture mode chặn tất cả non-GET requests. Đây là local source và dữ liệu UI-only giả lập, **không** phải authenticated backend QA.

- #6 Orders — PARTIAL_NOT_ACCEPTED: SHA `a6fc090`, 390×844 light/dark và 1280×800 light. Document width khớp viewport; desktop table scroll 934px client / 987px content là cuộn bên trong bảng. Có 3 đơn fixture; chưa kiểm tra backend/phân trang nhiều trang.
- #7 Order detail — PARTIAL_NOT_ACCEPTED: SHA `a6fc090`, 390×844 light + full-page, documentWidth 390, horizontalOverflow=false. Detail UI chụp được; test lỗi ở bước assertion focus sau đó. Chưa có dark/desktop/authenticated proof.
- #3 Product list: đã đóng review hình học hiện tại vì chưa chứng minh lỗi source; chỉ 3 fixtures và page size 12 nên pagination/content density chưa được chứng minh. Không lặp lại kiểm tra cũ nếu không có nguyên nhân mới.
- #4 Product editor: layout/tab/keyboard/SKU checkbox/AI button có fixture coverage; chưa chứng minh lưu thật, SKU persistence hoặc AI endpoint.
- #1/#2/#5 có ảnh fixture; #8–#12 chưa có evidence mới đủ cho acceptance độc lập. Tiếp tục #8 Customers, #9 Warranty/support, #10 Website settings, #11 Backup/Restore, #12 Activity log, đọc artifact cũ trước để tránh lặp.
- Không màn hình nào được chấp nhận hoàn toàn; tiến độ giữ 50% PROVISIONAL.

## 6. PR scope và hạn chế môi trường

PR #111 census hiện 1.302 paths: docs 1.239, functions 24, tests 25, scripts 5, migrations 2, public 2, workflows 2, data 1, package.json 1, README-DEPLOY.txt 1. Full path provenance chưa hoàn tất.

- `public/index.html` và `.github/workflows/liquid-glass-visual-preview.yml` có blob trên ADMIN bằng merge-base — inherited unchanged sau split; không blind-revert.
- `scripts/setup-cloudflare.mjs` và `scripts/deploy-cloudflare.mjs` có thay đổi post-merge-base cho ADMIN — tuyệt đối không chạy.
- Migration 0009 và PRE/PRO migrations hoãn theo chủ sở hữu; remote D1 schema/ledger NOT VERIFIED; R2 save deferred; AI grouping BLOCKED chờ contract được duyệt.
- Payment guardrails ở mức code/unit/local tests, không tuyên bố live payment/backend PASS.

## 7. Quy tắc làm việc

Trình tự: poll run hiện hữu → xác định lỗi theo log chính xác → sửa một nguyên nhân mỗi commit → xác minh exact SHA → tiếp tục hạng mục sản phẩm tiếp theo → chỉ cập nhật handoff khi có kết quả mới đáng kể. Hạn chế commit docs-only và không báo cáo tiến độ bằng số lần kiểm tra. Mỗi phiên phải kết thúc với một deliverable/defect fix đã kiểm chứng hoặc blocker thật được chứng minh. Sau mọi ghi Git, đọc lại và xác minh cả hai PR.

Mỗi lần ghi Git, dùng expected-SHA/lease và dừng nếu branch thay đổi. Không merge PR. Sau mỗi checkpoint báo cáo ngắn gọn bằng tiếng Việt và tiếp tục bước an toàn tiếp theo.
