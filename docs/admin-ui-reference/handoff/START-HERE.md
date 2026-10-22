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
- Repo: `chichute5500/Sindarealest-admin`; nhánh được phép ghi: `feature/admin-isolated-handoff-2026-10-20`.
- PR #111 OPEN/unmerged, HEAD trước lần đồng bộ bàn giao này `61d68b3f05ae349755e6807843e9aa83bd5f01ba`; **390 changed paths** (census đã đối chiếu danh sách tên file; metadata diff của GitHub được refetch sau commit), mergeable=false.
- PR #108 OPEN/unmerged và READ-ONLY: nhánh `fix/liquid-glass-audit-2026-10-19`; không ghi vào nhánh này.
- Đã bỏ 912 PNG kiểm thử sinh tự động; 10 snapshot bàn giao trùng; prompt-completeness audit cũ; báo cáo audit của static site; workflow Liquid Glass chỉ chạy cho nhánh static và script capture riêng; ZIP tham chiếu không được tài liệu nào liên kết. Giữ PNG tham chiếu chuẩn và HTML viewer được README mô tả.
- `public/index.html` được trả về đúng blob trên `main` nên không còn trong diff PR #111. Chỉ giữ `public/admin/index.html` cho giao diện Admin.
- Bằng chứng kiểm thử gọn theo từng SHA vẫn được giữ; không còn PNG matrix trong history. PR hiện còn các mã nguồn, API, migrations, tests, workflow Admin, cấu hình và tài liệu cần cho Admin.
- CI của HEAD mới nhất chưa được xác minh thành công. Lần chạy UI đầy đủ PASS gần nhất là #39816652346 trên SHA cũ `105f46b90dc5664dd091493dbd5cea1af7796c44`; không gán PASS đó cho HEAD mới.
- Tiến độ sản phẩm vẫn **50% PROVISIONAL**; 12 màn hình PARTIAL_NOT_ACCEPTED; QA backend đã xác thực NOT_TESTED.

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
