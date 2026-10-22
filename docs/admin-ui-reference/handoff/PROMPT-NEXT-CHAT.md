# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Bắt đầu từ [START-HERE.md](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/handoff/START-HERE.md); chủ dự án không cần dán lại history.

## Bằng chứng
- Source/test SHA `4b2220d510a906882e4309df6969c0c43514c421`: Validate [#39813340342](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340342) PASS; Preview [#39813340309](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309) PASS.
- [Artifact #12439794397 / admin-preview-evidence-340](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397): 102 PNGs, 78 fixture metrics.
- Mobile toast/nav overlap đã sửa và geometry-test PASS; screenshot `warranties-responsive__320x640__light.png`.
- Timeout retry-customers, CSS assertion `display:block` và screenshot Activity Log lúc còn loading là lỗi test harness cũ đã được sửa. Đừng lặp điều tra nếu run mới không tái hiện.
- 12 screens vẫn PARTIAL_NOT_ACCEPTED; deployed Preview diagnostic chỉ xác nhận CSS selector login, authenticated backend NOT_TESTED.

## Việc tiếp tục
1. Fetch live PR #111/#108, HEAD, Actions. Chỉ nhánh ADMIN được ghi; hai PR giữ OPEN/unmerged.
2. Đọc các handoff JSON/Markdown và screen audit.
3. So artifact #340 với reference đúng viewport/theme; ưu tiên Gallery #5 rồi #8–#12, ghi bằng chứng trước khi sửa.
4. Tiếp tục provenance audit của 1,310 changed paths; không dùng ahead/behind cũ nếu chưa tính lại từ live refs.
5. Đồng bộ status JSON, test results, LATEST-STATUS, START-HERE, prompts và audits trong **một atomic commit/checkpoint**; không ghi trong lúc Preview đang lưu artifact.

## Safety
Không merge, không `main`/static writes, Production deploy, Access bypass, secrets access/exposure, remote D1/R2 writes hay setup/migration/deploy scripts. Không tạo dữ liệu kinh doanh giả hoặc API contract chưa duyệt. Authenticated QA cần Preview access được ủy quyền; nếu thiếu thì ghi BLOCKED.
