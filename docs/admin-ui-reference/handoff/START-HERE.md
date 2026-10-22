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
- PR #111 OPEN/unmerged, HEAD `5b9764b3f6b023537551a49d87ec16ef325bf76d`, **391 changed paths** (+38,984 / −251), mergeable=false.
- PR #108 OPEN/unmerged, READ-ONLY; nhánh `fix/liquid-glass-audit-2026-10-19`, HEAD `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`, 291 changed paths. Do not edit this branch.
- Cleanup since the original 1,315-path census: removed 912 generated historical PNGs; removed 10 duplicate legacy handoff snapshots; removed the obsolete prompt-completeness audit and out-of-scope static-site audit; removed the static-only Liquid Glass preview workflow and its dedicated capture script; restored `public/index.html` to the exact `main` blob so it no longer appears in PR #111's diff.
- Current PR census: .github 1; README-DEPLOY.txt 1; data 1; docs 330; functions 24; migrations 2; package.json 1; public 1; scripts 4; tests 26. The approved `admin-mobile-reference.png` and compact per-run test evidence remain. No generated screenshot matrices remain in history.
- Last known successful full source/UI evidence is run #39816652346 on SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`; this is historical, not a validation of the current HEAD. The current cleanup HEAD has no confirmed matching successful Actions run/status in the available lookup.
- Product progress stays **50% PROVISIONAL**; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated business/backend QA NOT_TESTED.

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
