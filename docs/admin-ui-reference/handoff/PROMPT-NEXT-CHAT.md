# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục làm việc thực tế trên GitHub, không chỉ phân tích/báo cáo. Sau mỗi checkpoint hãy báo cáo tiếng Việt ngắn gọn rồi làm tiếp bước an toàn kế tiếp trong cùng phiên. Không hỏi lại thông tin đã có.

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

Handoff này được tạo từ code/test SHA trước cập nhật tài liệu `26f1c6fb0632a2b80b3f8d4864fa043fc3e98642`. Commit handoff mới chỉ chứa 6 file tài liệu. Vì vậy:
1. Đọc 6 file bên dưới trực tiếp từ ADMIN branch mới nhất; fetch live PR #111/#108 và xác định HEAD mới sau commit handoff.
2. Không coi docs commit là đã được code-test. Source/test SHA hiện cần xác minh là `26f1c6fb0632a2b80b3f8d4864fa043fc3e98642`.
3. Poll các run đã tồn tại, không tạo duplicate:
   - #39793390442 — SHA `37c3c40e24c7f222adeac52ac2cbb6d30ed433f4`, tại checkpoint đang chạy; run này vẫn có assertion mơ hồ cũ.
   - #39794007381 — SHA `26f1c6fb0632a2b80b3f8d4864fa043fc3e98642`, tại checkpoint QUEUED; đây là run ưu tiên xác nhận assertion mới.
   - #39792844330 — SHA `a6fc090b60e579e9d708775f0c25e3ba56f3439b`, hoàn tất FAIL; 2 test passed/1 failed. Artifact #324: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39792844330/artifacts/12431484447.
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

Trình tự: verify live refs/run → inspect logs/artifacts → fix lỗi source/test đã chứng minh → đợi/kiểm tra run exact SHA → review per-screen/scope → cập nhật handoff đồng bộ → lease-protected commit → read back → verify cả hai PR.

Mỗi lần ghi Git, dùng expected-SHA/lease và dừng nếu branch thay đổi. Không merge PR. Sau mỗi checkpoint báo cáo ngắn gọn bằng tiếng Việt và tiếp tục bước an toàn tiếp theo.
