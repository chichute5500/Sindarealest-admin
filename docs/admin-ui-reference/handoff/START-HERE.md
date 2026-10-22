# START HERE — SINDAREALEST ADMIN

**Điểm vào duy nhất cho chat mới.** Không yêu cầu chủ dự án dán lại prompt dài, lịch sử, hoặc nội dung đã có trên GitHub.

## Bước đầu bắt buộc
1. Lấy trạng thái live của PR #111, PR #108, HEAD nhánh ADMIN và Actions; không tin SHA/trạng thái cũ trong chat.
2. Đọc `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`.
3. Tiếp tục task kế tiếp an toàn ngay sau checkpoint; không lặp task đã có bằng chứng PASS.
4. Sau mỗi thay đổi có ý nghĩa, xác minh đúng SHA, cập nhật các file handoff liên quan, đọc lại để kiểm tra chúng nhất quán.

## Checkpoint đã xác minh — 2026-10-22
- Repo: `chichute5500/Sindarealest-admin`.
- Nhánh duy nhất được ghi: `feature/admin-isolated-handoff-2026-10-20` (ADMIN / PR #111).
- HEAD khi bắt đầu checkpoint: `074d8ef712914d456754bdedb26e87c7fc00c5ad`. Commit này lưu bằng chứng sau source/test SHA bên dưới; các commit handoff tiếp theo lại làm HEAD tiến lên. Luôn fetch HEAD live trước write.
- PR #111: OPEN, unmerged, 1,310 changed files, mergeable=false tại lần đọc live.
- PR #108: OPEN, unmerged, 288 changed files, mergeable=false; nhánh website/static chỉ đọc.
- Source + test SHA đã kiểm thử mới nhất: `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`.
- Actions mới nhất [run #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576): SUCCESS trên đúng SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`. Job bước kiểm tra source, npm tests, cài Chromium, Playwright screenshot matrix và Preview diagnostic đều SUCCESS; bước báo thiếu cấu hình bị SKIPPED vì không cần. Artifact `admin-preview-evidence-339`, ID `12441015558`, chứa 102 PNG (16 login shell, 86 fixture module screens) và 78 fixture metrics.
- Run cũ #39804852604 thất bại ở Playwright timeout selector retry-customers trên SHA `326526f8...`; đây là lỗi lịch sử, **không phải task hiện tại** vì run mới hơn đã PASS.
- Tiến độ sản phẩm: **50% PROVISIONAL**. 12 màn hình vẫn PARTIAL_NOT_ACCEPTED; screenshots/fixture và CI không chứng minh authenticated business/backend flows.

## Việc tiếp theo
1. Đối chiếu artifact #339 với ảnh chuẩn `docs/admin-ui-reference/admin-mobile-reference.png` theo đúng viewport/theme, ưu tiên Gallery (#5) và màn #8–#12; chỉ sửa khác biệt nhìn thấy được, có thể tái hiện.
2. Tiếp tục audit provenance PR #111 theo từng batch từ danh sách file live. PR chứa scope hỗn hợp; census cũ 1,304 paths đã lỗi thời so với live 1,310. Không dùng tổng nhóm cũ như số liệu hiện hành.
3. Đánh dấu mỗi kết quả PASS / FAIL / PARTIAL_NOT_ACCEPTED / BLOCKED / NOT_TESTED / NOT_VERIFIED với SHA và bằng chứng. Tăng % chỉ khi tiêu chí acceptance sản phẩm thật sự đạt.
4. Nếu authenticated Preview yêu cầu quyền truy cập không có, ghi BLOCKED và yêu cầu đúng đường test được cấp phép; tuyệt đối không bypass Access.

## Guardrails
- Chỉ ghi nhánh ADMIN nói trên. Không sửa `main` hoặc website/static branch; giữ PR #111/#108 OPEN, không merge.
- Không deploy Production, không bypass Cloudflare Access, không đọc/ghi secrets.
- Không chạy setup/deploy/migration scripts; không thao tác remote D1/R2, schema hoặc ledger.
- Migration 0009, PRE/PRO migrations, R2 persistence/product-image-save vẫn DEFERRED_BY_OWNER / NOT_VERIFIED; AI grouping bị chặn tới khi có API contract được chủ dự án duyệt.
- Không bịa giá, tồn kho, ảnh, khách hàng, đơn hàng, trạng thái thanh toán hoặc API contracts.

## Câu lệnh một dòng cho chat mới
Tiếp tục SinDarealest Admin từ file START-HERE.md trên GitHub: xác minh PR/HEAD/Actions live, đọc handoff hiện hành, mở artifact #339 để so sánh các màn hình với reference, sau đó audit provenance PR #111 theo batch. Không lặp lỗi timeout cũ đã được run #39811730576 vượt qua; chỉ làm việc trên nhánh ADMIN, cập nhật bằng chứng và handoff sau checkpoint, không merge/deploy/đụng remote D1/R2/secret/Access.
