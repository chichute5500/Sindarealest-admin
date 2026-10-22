# START HERE — SINDAREALEST ADMIN

**Điểm vào duy nhất cho chat mới.** Không yêu cầu chủ dự án dán lại prompt dài hoặc giải thích lịch sử đã có trong repo.

## Bước đầu bắt buộc
1. Fetch live PR #111, PR #108, HEAD và Actions; mọi SHA trong tài liệu là checkpoint, không thay thế kiểm tra live.
2. Đọc `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`.
3. Làm task an toàn kế tiếp; không lặp lỗi đã được run SHA mới vượt qua.
4. Sau checkpoint, cập nhật nguồn trạng thái và các prompt liên quan, đọc lại JSON/Markdown rồi refetch HEAD/PR.

## Checkpoint live — 2026-10-22
- Repo: `chichute5500/Sindarealest-admin`.
- Chỉ ghi nhánh ADMIN `feature/admin-isolated-handoff-2026-10-20`. HEAD tại đầu đợt audit này: `0502739790fecfdf56f3c267dcaf607f1751908e`; các commit handoff tiếp theo sẽ làm HEAD tiến lên.
- PR #111 OPEN/unmerged, 1,310 changed files, +49,466 / −404, mergeable=false.
- PR #108 OPEN/unmerged, HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`, 288 changed files, mergeable=false; nhánh website/static chỉ đọc.
- Source/test SHA gần nhất: `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`. [Run #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576) SUCCESS. [Artifact #339](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576/artifacts/12441015558) có 102 PNG / 78 fixture metrics.
- Run #39804852604 lỗi selector `retry-customers` trên SHA cũ `326526f8...`; run mới #39811730576 PASS, nên không debug lại trừ khi có bằng chứng hồi quy mới.
- Tiến độ sản phẩm **50% PROVISIONAL**. Cả 12 màn hình vẫn PARTIAL_NOT_ACCEPTED; ảnh/fixtures không chứng minh authenticated backend acceptance.

## Đã xác minh trong audit nguồn hiện tại
- PR #111 chứa 1,310 paths; census cũ 1,304 lỗi thời. Trong 36 runtime/config paths, 14 thêm mới và 22 sửa so với merge-base `f38cefe4647b33bd42f9018fde00c420ee5c7c66`.
- Bảy blob runtime trùng chính xác với PR #108; `public/index.html` trên PR #111 khác cả `main` lẫn static PR #108. Không sửa file storefront hoặc nhánh static từ đây; scope cần giải quyết trước merge.
- Cả `scripts/setup-cloudflare.mjs` và `scripts/deploy-cloudflare.mjs` đều có source preflight cho migration 0009. Setup vẫn ghi migration/DDL cũ trước điểm preflight. Đây là code inspection, KHÔNG phải xác minh D1 từ xa; không chạy script.
- Gallery #5: source có featured slot + horizontal thumbnail rail và test accessibility/reorder; ảnh trong fixture là placeholder tổng hợp, không tự điền ảnh sản phẩm thật.

## Việc tiếp theo
1. Audit ngữ nghĩa 36 runtime/config paths theo batch, ưu tiên `public/index.html`, các blob trùng static, payment API/ledger và sequencing của setup; chỉ đọc hoặc sửa code ADMIN nếu có lỗi tái hiện rõ.
2. Tiếp tục acceptance từng màn dựa trên `docs/admin-ui-reference/admin-mobile-reference.png` và artifact #339 theo đúng viewport/theme.
3. Làm mới provenance batch của tests/docs/evidence; chưa kết luận PR-wide PASS trước khi toàn bộ scope được phân loại.

## Guardrails
- Giữ PR #111/#108 OPEN/unmerged. Không sửa `main` hoặc nhánh static; không merge.
- Không Production deploy, Access bypass, secrets, remote D1/R2/schema/ledger hoặc chạy setup/migration/deploy scripts.
- Migration 0009, PRE/PRO migrations và R2/product-image save tiếp tục DEFERRED_BY_OWNER; AI grouping cần API/UX contract được duyệt.
- Không bịa dữ liệu sản phẩm, giá, tồn kho, ảnh, đơn hàng, khách hàng, hoặc API contract.

## Một dòng cho chat mới
Tiếp tục SinDarealest Admin từ `docs/admin-ui-reference/handoff/START-HERE.md`: fetch PR/HEAD/Actions live, đọc handoff JSON/Markdown, không lặp run lỗi cũ #39804852604 đã được #39811730576 vượt qua, tiếp tục semantic provenance audit 36 runtime/config paths và screen acceptance. Chỉ ghi nhánh ADMIN; cập nhật bằng chứng sau từng checkpoint; không merge/deploy/đụng remote D1/R2/secrets/Access.
