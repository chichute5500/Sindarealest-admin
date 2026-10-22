# START HERE — SINDAREALEST ADMIN

**Điểm vào duy nhất cho chat mới.** Mở file này trước; không yêu cầu chủ dự án dán lại lịch sử hoặc prompt dài.

## Liên kết chuẩn
- [Prompt bàn giao chat mới — PROMPT-NEXT-CHAT.md](PROMPT-NEXT-CHAT.md)
- [Master prompt — MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md)
- [Trạng thái kiểm thử gần nhất — latest-test-results.json](latest-test-results.json)
- [Trạng thái tổng hợp — current-status.json](current-status.json)
- [Báo cáo hiện trạng — LATEST-STATUS.md](LATEST-STATUS.md)
- [Audit 12 màn hình](12-SCREEN-REFERENCE-AUDIT.md) · [Audit phạm vi PR #111](PR-111-SCOPE-AUDIT.md)
- [Chính sách lưu lịch sử kiểm thử](history/README.md)

## Checkpoint đã xác minh qua GitHub API
- Repo: `chichute5500/Sindarealest-admin`; chỉ được ghi vào nhánh `feature/admin-isolated-handoff-2026-10-20`.
- PR #111 trước lần đồng bộ handoff này: HEAD `d49c09c582be2e8dad2d501347415581abbe01d5`, OPEN/unmerged, 385 changed paths (+38756/−211), mergeable=false; base `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- PR #108: OPEN/unmerged, READ-ONLY, live HEAD `ae2a46506a1b1f4db9dea5bd9131e71bf4fd5f86`; không ghi vào nhánh này.
- Source validation + tests #39840693024 và Admin Preview diagnostics #39840692976 PASS trên source SHA `2eb6e7e9d6b1cf15002a7d67e299c713a4d32118`. Artifact `admin-preview-evidence-352`: 102 PNGs (16 login shell, 86 read-only fixture screens), 78 fixture metrics.
- Workflow tự lưu compact evidence và chuyển HEAD sang `d49c09c582be2e8dad2d501347415581abbe01d5`. Exact-SHA validation cho HEAD mới này hiện **NOT_VERIFIED**.
- Census trước handoff sync: 385 changed paths; .github 1, root 2, data 1, docs 331, functions 24, migrations 2, public 1, scripts 4, tests 19. Giữ 318 per-run history records; không xóa chỉ vì blob trùng nếu chưa chứng minh vi phạm chính sách lưu lịch sử.
- Đã dọn 912 PNG sinh tự động, 10 snapshot handoff trùng, prompt/static audit lỗi thời, workflow/script chỉ dành cho web tĩnh, ZIP không được tham chiếu; giữ ảnh tham chiếu chuẩn và HTML viewer. `public/index.html` khớp `main`; chỉ giữ `public/admin/index.html` trong phạm vi Admin.
- Tiến độ sản phẩm vẫn **50% PROVISIONAL**; 12 màn hình PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED.

## Required operating sequence
1. Fetch live PR #111 and #108, branch HEAD, merge base and recent Actions. Treat every SHA/count in these docs as a checkpoint, not live truth.
2. Read `current-status.json`, `latest-test-results.json`, this file, `LATEST-STATUS.md`, the 12-screen audit and PR scope audit. Read actual failing logs for new failures.
3. Continue from the first unresolved safe task. Do not repeat the historical retry-customers timeout on SHA `326526f8...`; exact later source/UI run #39816652346 passed.
4. Make minimal ADMIN-only source changes, add regression coverage, and run checks on the exact SHA. No fabricated defect or unverified product data.
5. After a checkpoint, sync all relevant handoff files in one atomic Git tree/commit where possible; read them back and refetch live HEAD/PR/Actions. Do not call a queued/running run PASS.

## Guardrails
- Keep PR #111 and PR #108 OPEN/unmerged. No `main` or static-branch writes, no merge, force-push or Production deploy.
- Never bypass Cloudflare Access; do not retrieve/expose/change secrets.
- Do not run setup, migration or deploy scripts; do not operate remote D1/R2/schema/ledger.
- Migration 0009 and PRE/PRO migrations, R2 persistence and product image save are DEFERRED_BY_OWNER. AI grouping requires an owner-approved API/UX contract.
- Do not fabricate products, prices, stock, images, customers, orders, payment status or APIs.

## PR #111 cleanup checkpoint — 2026-10-23
- Cleanup validated by source/test workflow #39836967488 on exact cleanup SHA `dcd5f1c2ae45d1c0ae22d49838757ec1ada69d7a` (SUCCESS). The subsequent handoff-note commit, if any, requires its own exact-SHA validation.
- Removed the out-of-scope static-site audit report `docs/visual-audit-progress-2026-10-19.md` and superseded `handoff/PROMPT-COMPLETENESS-AUDIT.md`.
- Consolidated `MASTER-PROMPT-AUTO-HANDOFF.md` into a compatibility pointer to START-HERE; shortened PROMPT-NEXT-CHAT to a current-state-first continuation prompt.
- Live PR #111 census at this checkpoint: 404 changed paths; 340 under `docs`, of which 326 are retained per-run history records. Historical text/JSON evidence and the approved UI reference remain; generated screenshot matrices are stored in Actions artifacts, not the PR diff.
- PR #111 remains OPEN/unmerged. The static website PR #108 remains OPEN/unmerged and read-only. Do not treat these counts or SHA as current after subsequent commits; fetch live GitHub state first.
