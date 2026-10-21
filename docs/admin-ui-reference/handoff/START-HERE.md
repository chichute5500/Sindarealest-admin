# SinDarealest ADMIN — điểm bắt đầu bàn giao cho AI

> Đây là điểm bắt đầu bắt buộc cho mọi phiên AI/agent tiếp tục công việc ADMIN. Nội dung chỉ phản ánh trạng thái đã ghi và kiểm chứng; luôn xác minh Git thực tế trước khi sửa.

## Phân chia nhánh — bắt buộc

- Repository: `chichute5500/Sindarealest-admin`
- **Nhánh WEBSITE TĨNH cần bảo vệ:** `fix/liquid-glass-audit-2026-10-19`
- **Nhánh ADMIN duy nhất được phép sửa/commit:** `feature/admin-isolated-handoff-2026-10-20`
- Nhánh ADMIN được tách từ nhánh website tĩnh tại thời điểm tạo. Điều đó chỉ xác định điểm xuất phát; không cấp quyền chỉnh sửa website tĩnh.
- Không commit ADMIN vào nhánh `fix/liquid-glass-audit-2026-10-19`, không commit vào `main`, không force-push, không tự merge/cherry-pick qua lại.
- Không tự động đồng bộ các commit website mới sang nhánh ADMIN. Trước khi đồng bộ phải so sánh SHA/diff, đánh giá file xung đột và có chỉ thị rõ ràng.

## Trước khi làm bất cứ việc gì

1. Xác nhận repository, branch hiện tại, HEAD SHA, remote, `git status` và các thay đổi chưa commit.
2. Nếu không ở `feature/admin-isolated-handoff-2026-10-20`, **không sửa hoặc commit**. Không checkout/reset/stash một cách mù quáng; trước tiên bảo toàn thay đổi hiện có rồi mới quyết định chuyển nhánh an toàn.
3. Ghi nhận SHA hiện tại của nhánh website tĩnh để làm mốc đối chiếu; không sửa nhánh đó.
4. Đọc `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-COMPLETENESS-AUDIT.md`, `../reference-instructions.md` và `../MASTER-PROMPT-AUTO-HANDOFF.md`.
5. Mở ảnh tham chiếu `../admin-mobile-reference.png`; dùng `../admin-mobile-reference.html` và ZIP tham chiếu khi cần.
6. Kiểm tra screenshot gần nhất trong `history/` và so sánh SHA của ảnh/báo cáo với code đang chạy. Nếu không khớp, không gọi đó là ảnh của code hiện tại.

## Phạm vi công việc

- Chỉ chỉnh giao diện và chức năng ADMIN theo master prompt, bảo toàn nghiệp vụ/backend hiện có.
- Không redesign hoặc thay đổi storefront, trang chủ công khai, sản phẩm công khai, giỏ hàng/checkout, navbar/footer public, Liquid Glass, nền động, theme, typography hay responsive của website tĩnh.
- Với API/auth/component/config dùng chung, trước khi sửa phải ghi rõ phụ thuộc, lý do, rủi ro và kế hoạch regression. Nếu không thể cô lập an toàn, ghi BLOCKED cho mục đó và tiếp tục việc độc lập.
- Không tự ý thay đổi Cloudflare/Production, secrets, D1 schema/bindings, R2 data hoặc dữ liệu khách hàng/đơn hàng thật.

## Quy tắc cập nhật sau mỗi vòng lặp

- Một vòng lặp là: sửa đổi có ý nghĩa → chạy kiểm tra → chụp lại cùng màn hình/điều kiện → so sánh.
- Sau MỖI vòng lặp hoàn chỉnh, lưu ảnh thật từ ứng dụng đang chạy, metadata và báo cáo vào `history/<short-sha-or-run-id>/`.
- Cập nhật `LATEST-STATUS.md`, `latest-test-results.json` và các lỗi còn lại. Chỉ ghi PASS khi có bằng chứng; dùng BLOCKED/NOT TESTED nếu chưa kiểm tra được.
- Commit tài liệu, screenshot và code ADMIN đã kiểm tra chỉ trên `feature/admin-isolated-handoff-2026-10-20`. Xác minh commit và đọc lại file sau khi ghi.
- Không giả vờ đã chụp ảnh, chạy test, lưu GitHub hoặc hoàn thành nếu chưa có xác nhận thực tế.

## Tự động tiếp tục

Các file này lưu trạng thái bền vững nhưng không tự khởi động một phiên ChatGPT mới khi phiên hiện tại hết giới hạn. Việc tự chạy tiếp cần agent/automation riêng thực sự được cấu hình và chạy. Khi một phiên AI/automation được khởi chạy, hãy đọc handoff và master prompt trước khi hành động.

## Tệp bàn giao

- `LATEST-STATUS.md`: trạng thái mới nhất.
- `PROMPT-NEXT-CHAT.md`: prompt ngắn, đầy đủ để phiên chat tiếp theo tiếp tục đúng trạng thái hiện tại; sao chép toàn bộ nội dung file này vào chat mới sau khi đọc Master Prompt.
- `latest-test-results.json`: kết quả kiểm thử có bằng chứng.
- `PROMPT-COMPLETENESS-AUDIT.md`: bảng đối chiếu yêu cầu và giới hạn.
- `../MASTER-PROMPT-AUTO-HANDOFF.md`: prompt chuẩn.
- `history/`: ảnh/báo cáo lịch sử; không ghi đè mốc cũ.

## Ảnh tham chiếu

Các file PNG/HTML tham chiếu là mục tiêu thiết kế, không phải screenshot ứng dụng chạy thật. Chỉ ảnh do Playwright chụp từ app đang chạy mới được coi là bằng chứng thực tế.


## Current checkpoint — 2026-10-21

- Progress estimate: **43%**. Latest PR #111 head observed: `eee7dcedb71a42516822a9f46384ddacc107eb4e`; still OPEN/unmerged.
- Latest scope audit: 909 changed files (862 docs/evidence + 47 non-doc). PR includes storefront, backend/functions, migration 0008, setup/deploy scripts and tests; it is not Admin-UI-only.
- No PR-triggered Actions run was returned for the latest observed head. The most recent known evidence run is old and has Preview diagnostics FAIL. Do not claim current CI green.
- Important safety blocker: setup script contains remote D1 migration/direct ALTER TABLE logic; it has not been executed. No schema/data/Production operations were performed.
- Continue from `LATEST-STATUS.md`, `latest-test-results.json` and `PROMPT-NEXT-CHAT.md`; do not merge PR #111 or #108, deploy Production, modify secrets, or bypass Cloudflare Access.



## Current checkpoint — verified 2026-10-21

- Current ADMIN branch HEAD at the latest read: `9c94c106fec99aa5920685da4d4af32b53e680ad`. PR #111 remains OPEN/unmerged; PR #108 remains OPEN/unmerged.
- Latest source CI run [39543407286](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39543407286) is PASS on `9c94c106fec99aa5920685da4d4af32b53e680ad` for project checks, automated tests and dependency audit.
- Latest Preview diagnostic run [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) tested `de6114f75cba36193c50ad043175d08be092929f` and FAILed on `PREVIEW_CSS_SIGNATURE_MISMATCH`; inspect artifact `admin-preview-evidence-62 (ID 12320316041)` for metadata/screenshots.
- Evidence sets: 16 login-shell images + 42 synthetic-fixture module images; none is authenticated real backend QA. Progress stays 43%.
- PR #111 has 909 changed files (862 docs/evidence, 47 non-doc) including public storefront, Functions/API, migration 0008, deploy/setup scripts and public-site tests. Keep PR unmerged; do not execute setup/deploy or migrations.
- No local checkout exists in this runtime; local `git status` is NOT VERIFIED. Do not pretend otherwise.
- Next: confirm authorized intended Preview target, complete visual comparison against all 12 approved screens, safely test authenticated read-only module flows, and finish mixed-scope PR audit. Never bypass Cloudflare Access, touch secrets/real data, or deploy Production.


## Latest content-scope audit — 2026-10-21

- At start of the audit, ADMIN branch HEAD was `179d6d5ae93ebd56215abb0d4bbdaa45679dd7fa`; protected static branch snapshot was `e63b7c651fb7615bf2569b60f3c8dad53956e2bd`. Recheck live refs later.
- `public/index.html` differs between ADMIN and static branches (blob SHA `bb0ae30...` vs `eca254f...`) and contains extensive public storefront styling plus public price/watermark/favourites presentation. `public/admin/index.html` also differs by branch. Do not sync branches or merge PR #111.
- `data/legacy-products.json` is byte-identical between ADMIN and static branch; field-level JSON compare vs main found all 235 product records keep other fields unchanged while `sku` became null and `skuVerified=false`. This is not live D1 data, but it is still a public/fixture file in the mixed-scope PR.
- Current source CI [39545082149](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39545082149) PASS on `179d6d5ae93ebd56215abb0d4bbdaa45679dd7fa`; Preview diagnostic run [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) FAILS on source-signature mismatch. Progress stays 43%.


## Additional safety finding — D1 migration tracking

- `scripts/setup-cloudflare.mjs` uses remote `d1 execute --file` for several schema files and manual `ALTER TABLE` for 0008 columns; it does not apply migration 0008 through `d1 migrations apply --remote`. Deploy gate checks column existence but not the applied-migrations ledger. This may cause schema/history divergence; remote D1 state was NOT queried.
- Local migration test `scripts/check-migrations.mjs` is not a remote migration proof. Do not run setup/deploy/migrations; require owner-reviewed migration procedure first. See [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
