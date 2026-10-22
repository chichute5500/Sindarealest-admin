# START HERE — SINDAREALEST ADMIN

**Điểm vào duy nhất cho chat mới.** Không yêu cầu chủ dự án dán lại prompt dài hoặc giải thích lịch sử đã có trong repo.

## Bước đầu bắt buộc
1. Fetch live PR #111, PR #108, HEAD và Actions; mọi SHA trong tài liệu là checkpoint, không thay thế kiểm tra live.
2. Đọc `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`.
3. Làm task an toàn kế tiếp; không lặp lỗi đã được run SHA mới vượt qua.
4. Sau checkpoint, cập nhật nguồn trạng thái và các prompt liên quan, đọc lại JSON/Markdown rồi refetch HEAD/PR.

## Checkpoint live — 2026-10-22 (latest tested change)
- Repo `chichute5500/Sindarealest-admin`; writable ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged. PR #108 OPEN/unmerged, website/static branch read-only.
- HEAD before this handoff edit: `23b93779f232966aa150668cfd6bbe4c083ffe40`; fetch live HEAD before later writes.
- Latest tested source/test SHA: `4b2220d510a906882e4309df6969c0c43514c421` — [toast/navigation fix](<https://github.com/chichute5500/Sindarealest-admin/commit/4b2220d510a906882e4309df6969c0c43514c421>).
- Source CI [#39813340342](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340342>) SUCCESS; local Playwright matrix + Preview diagnostic [#39813340309](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309>) SUCCESS, both on exact SHA `4b2220d510a906882e4309df6969c0c43514c421`.
- [Artifact #344 / ID 12439794397](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397>): 102 PNG (16 login shell, 86 fixture-module screens), 78 fixture metrics. Reviewed `warranties__390x844__light.png`: toast is above mobile nav and nav labels remain visible.
- Fix reserves safe-area-aware space above fixed nav and adds an assertion for at least 8px clearance. Authenticated backend acceptance remains NOT_TESTED.
- Old timeout #39804852604 at `retry-customers` on SHA `326526f8...` is historical, not the active blocker; newer runs passed.
- Product progress **50% PROVISIONAL**; all 12 screens PARTIAL_NOT_ACCEPTED. PR #111 has 1,314 changed files; provenance remains PARTIAL.
## Đã xác minh trong audit nguồn hiện tại
- PR #111 chứa 1,314 paths; census cũ 1,304 lỗi thời. Trong 36 runtime/config paths, 14 thêm mới và 22 sửa so với merge-base `f38cefe4647b33bd42f9018fde00c420ee5c7c66`.
- Bảy blob runtime trùng chính xác với PR #108; `public/index.html` trên PR #111 khác cả `main` lẫn static PR #108. Không sửa file storefront hoặc nhánh static từ đây; scope cần giải quyết trước merge.
- Cả `scripts/setup-cloudflare.mjs` và `scripts/deploy-cloudflare.mjs` đều có source preflight cho migration 0009. Setup vẫn ghi migration/DDL cũ trước điểm preflight. Đây là code inspection, KHÔNG phải xác minh D1 từ xa; không chạy script.
- Gallery #5: source có featured slot + horizontal thumbnail rail và test accessibility/reorder; ảnh trong fixture là placeholder tổng hợp, không tự điền ảnh sản phẩm thật.

## Việc tiếp theo
1. Compare artifact #344 with `docs/admin-ui-reference/admin-mobile-reference.png` at identical viewport/theme; prioritize Gallery (#5), then screens #8–#12.
2. Continue PR #111 provenance review from the live paginated 1,314-file list; prioritize runtime/API/migration/setup/workflow paths and distinguish inherited files from new changes.
3. For every meaningful change, validate exact SHA, update/read back handoff files, then refetch PR/HEAD. Do not rerun unchanged passing tests without reason.
4. Keep progress at 50% PROVISIONAL until actual product acceptance evidence changes; screenshots/fixtures are not backend acceptance.

## Guardrails
- Giữ PR #111/#108 OPEN/unmerged. Không sửa `main` hoặc nhánh static; không merge.
- Không Production deploy, Access bypass, secrets, remote D1/R2/schema/ledger hoặc chạy setup/migration/deploy scripts.
- Migration 0009, PRE/PRO migrations và R2/product-image save tiếp tục DEFERRED_BY_OWNER; AI grouping cần API/UX contract được duyệt.
- Không bịa dữ liệu sản phẩm, giá, tồn kho, ảnh, đơn hàng, khách hàng, hoặc API contract.

## Một dòng cho chat mới
Tiếp tục SinDarealest Admin từ `docs/admin-ui-reference/handoff/START-HERE.md`: fetch PR/HEAD/Actions live, đọc handoff JSON/Markdown, không lặp run lỗi cũ #39804852604 đã được #39816652346 vượt qua, tiếp tục semantic provenance audit 36 runtime/config paths và screen acceptance. Chỉ ghi nhánh ADMIN; cập nhật bằng chứng sau từng checkpoint; không merge/deploy/đụng remote D1/R2/secrets/Access.


## Latest live checkpoint refresh — 2026-10-22T17:00:43.450Z
- Live HEAD at sync start: `9ec143a6d0250b4c5949cfaa6e6f6eed01d6748e`; latest source/test SHA: `105f46b90dc5664dd091493dbd5cea1af7796c44`.
- Source validation [#39816652373](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652373) SUCCESS; responsive/theme screenshot + Preview diagnostic [#39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346) SUCCESS.
- Current evidence artifact [admin-preview-evidence-344, ID 12441639210](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210). Use this instead of #339 for next review.
- PR #111 live metadata now reports 1,314 changed files; older 1,310 census is historical and needs refresh from paginated filenames.
- Product progress remains 50% PROVISIONAL; no screen is fully accepted.
