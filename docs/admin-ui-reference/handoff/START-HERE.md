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


## Latest ADMIN source-contract check — 2026-10-21

- At start of this check ADMIN HEAD was `21a7e039749e484e42b68ec322481df6a2a797af`; source file `public/admin/index.html` blob is `a297b8298ff30c5e713896fed1c21d0f8ca3e899`.
- Rechecking current markup: mobile bottom navigation is five direct buttons and the later mobile CSS sets five columns. “Khác” opens warranty and settings actions. Do not carry forward the old hypothesis that source still has six mobile nav items.
- Product, order, customer, warranty and claim table layouts use `mobilecards`; at max-width 680 CSS overrides inline min-width and stacks rows into mobile cards. This is static source review, not authenticated browser evidence.
- Login copy is currently tagline “Luxury in Every Detail” + heading “Đăng nhập quản trị”; the old handoff note claiming those strings were reversed is stale.
- Reference pixel parity and authenticated business-flow testing remain NOT VERIFIED. Latest source CI [39545978621](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39545978621) PASS; Preview diagnostic [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) FAILS separately.


## Latest run verification — 2026-10-21

- Current ADMIN HEAD `cbc0c1c9f1504e86121eadcbfc60d76675cd1e91`; source CI [39546689786](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39546689786) PASS on this exact commit. Job steps confirm dependency audit, project integrity, automated tests all PASS.
- Preview diagnostic [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) remains FAIL on older source `de6114f...` at deployed Preview CSS/UI signature. Local source checks/screenshots and evidence upload passed; deployed Preview diagnostic failed. No newer Preview diagnostic run was found for current HEAD.
- PR #111 remains OPEN, 909 files (+30,664/-356), 406 ahead/6 behind main. PR #108 remains OPEN. Progress 43%; no authenticated module QA, no 12-screen parity claim, no remote D1/deploy.


## Latest current-HEAD verification — 2026-10-21

- ADMIN branch ref verified at `fbc783d514b194a7f922083e79b66cf333dda2ce`; source CI [39547169787](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39547169787) PASS on exact HEAD.
- Preview diagnostic [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) still FAILS at deployed CSS/UI signature mismatch on older tested source `de6114f...`. No newer Preview diagnostic found.
- Read-only API review found update-product duplicate SKU conflicts likely use generic 500 handling while create-product returns explicit 409. Uniqueness remains DB-enforced; no API change made because backend/business behavior is outside UI-only scope.
- PR #111 OPEN/unmerged: 909 files (+30,716/-356), 407 ahead/6 behind main. PR #108 OPEN. Progress 43%.


---

## Yêu cầu tích hợp mới — 2026-10-21

Đọc `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` trước khi thực hiện hai tính năng đã được chủ dự án duyệt: phân loại Hàng có sẵn/Hàng đặt riêng và QR chuyển khoản theo đơn (không tích hợp cổng thanh toán). Đây là phạm vi bổ sung; tiếp tục công việc Admin đang dang dở.

Không đoán loại sản phẩm từ tồn kho; dữ liệu cũ chưa rõ cần rà soát. QR không chứng minh tiền đã về; chỉ xác nhận thủ công sau khi kiểm tra giao dịch. Không yêu cầu thanh toán trước khi giá/điều kiện đơn được xác nhận. Nếu cần schema/API/migration, phân tích compat/rollback/test và chỉ sửa code trên nhánh Admin; không chạy migration Production hoặc ghi dữ liệu thật. Bảo vệ nhánh website tĩnh và main. PR #111 giữ mở và cần audit scope rộng trước nghiệm thu.


## Cross-branch checkout/payment synchronization — 2026-10-21

For checkout, fulfillment-type, QR, or payment-ledger work, read `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` and the cross-branch section in `docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md`.

Static checkout visual reference (customer-facing UI only; not an Admin screen):
https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/static-web-reference/checkout-payment-flow-reference.png
Recorded image blob SHA: `c89ff843af1c094def9233d27a148e048b191990`.

Admin branch remains `feature/admin-isolated-handoff-2026-10-20`; static branch remains `fix/liquid-glass-audit-2026-10-19`. Never merge/cherry-pick or edit across these branches as part of the synchronization. PR #111 stays open/unmerged; no Production deployment, remote migration, real D1/R2 mutation, or secret/binding changes.

Keep ownership strict: Admin owns product type, payment rules/configuration, QR verification, and the transaction ledger; static website owns customer-facing presentation and consumption of public-safe API only. The contract is not proof that the live API or Preview is compatible. Verify source SHA, tests, response shape, and Preview separately before reporting integration complete.


## Handoff refresh — 2026-10-21 14:42 ICT

Read the integration contract and current HEAD before code edits. Observed HEAD: `8b1a9fe4b8b87b9c2cf498bb73d50b5d646e471e`. Latest source CI: run 39563376269 (success, SHA 8b1a9fe4b8b87b9c2cf498bb73d50b5d646e471e). Latest Preview diagnostic: run 39562983543 (failure, SHA da66197b372cbabc4c31bb1f1427fe8b8bfe5532); this is not current-HEAD Preview evidence. Overall Admin estimate 46%; QR/fulfillment estimate 70%; integration is NOT VERIFIED. See `LATEST-STATUS.md` and `PROMPT-NEXT-CHAT.md` for details and strict branch/production guardrails.

## Current verified checkpoint — 2026-10-21 — Admin payment/QR source hardening

- Repository/branch: `chichute5500/Sindarealest-admin` / `feature/admin-isolated-handoff-2026-10-20`. HEAD before this documentation commit: `69cd0b07c97b8087bfcfaa2b7fb6bf835d584440`; code/test SHA checked by CI: `cedebd78b2056ae4d0e6f6982793106b586d99b2`.
- Source CI [39565547871](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39565547871) **PASS** on exact `cedebd78b2056ae4d0e6f6982793106b586d99b2` (dependency audit, project integrity and tests). Preview diagnostic [39565547828](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39565547828) **FAIL** on the same code SHA: `PREVIEW_CSS_SIGNATURE_MISMATCH`; `.topbar > .brand` is visible, selector is supported/matches, but `hasLoginHideRule=false` among 226 parsed CSS rules.
- Targeted safeguards in the source commit: token-scoped payment responses use private/no-store/no-referrer; a pending payment request is selected before historical completed/cancelled requests; payment request creation fails closed if the active QR storage binding/object is missing; null/undefined/empty/invalid item `line_total` is rejected; public QR settings hide account fields and URL while its active object is missing.
- Regression tests for these cases are included in the CI-tested source. Playwright source/fixture matrix: PASS, 58 PNGs (16 login shell + 42 synthetic/read-only module fixture screens), 36 metrics; artifact `admin-preview-evidence-116` (ID 12329841294, around 9.3 MB, expires 2026-11-04). Zero recorded page/console/network/HTTP errors or attempted writes. These fixtures do not prove live authenticated business flows.
- Overall progress remains **46%**; QR/fulfillment estimate remains **70%**. All-12-screen parity and authorized current-source Preview identity are still NOT VERIFIED. Authenticated real backend QA and remote migration state remain NOT VERIFIED.
- PR #111 OPEN/unmerged with **1,072 files (+36,072/−389)** and mixed storefront/backend/migration/script/evidence scope; PR #108 OPEN/unmerged. Do not merge either.
- No local checkout is available to report `git status`. No static branch/main edit, merge, Production deployment, remote migration, D1/R2 mutation, secret change or Access bypass was performed.
- Owner action needed for remote verification: confirm the authorized Preview deployment URL/identity for current Admin source and the approved Cloudflare Access path. Do not paste secret values into chat; do not bypass Access.

## Next action
Continue from the live `LATEST-STATUS.md` and `latest-test-results.json`. Re-fetch HEAD/PR/Actions before modifying code. Do not treat the current Preview as passing. Work only on the Admin branch and do not merge or deploy Production.



## Latest owner Preview check — 2026-10-21 15:39 +07:00

Owner confirmed login, opening product list/detail, and opening image-selection UI on Preview. These are basic UI observations only; save/upload and full backend flows are not confirmed. Latest source CI run #39569134111 and Preview diagnostic run #39569133914 failed at automated tests on source `3ed2d86b8b97f04718c478979136f986b3d1b07b`; the diagnostic skipped browser and deployed Preview checks. Read the newest section in `LATEST-STATUS.md` and JSON before continuing. Inspect detailed failure output; do not guess root cause. Keep both PRs open and do not deploy Production or mutate Cloudflare/D1/R2.
