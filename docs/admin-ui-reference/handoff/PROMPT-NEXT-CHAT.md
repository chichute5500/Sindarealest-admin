# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual work on GitHub. Read [START-HERE.md](START-HERE.md) first; fetch the live PRs, current branch HEAD and Actions before acting. Do not ask the owner to paste history or repeat already-completed cleanup.

Repository: chichute5500/Sindarealest-admin.

## Checkpoint facts (fetch live again)
- At the start of the latest handoff sync, PR #111 HEAD was b3b71fb925875e9dd8f1b38e71737a2af1bb71b2 (386 files, +38,838/-212; OPEN/unmerged). That snapshot is historical after the current synchronization commit; fetch actual HEAD.
- Application/source Validate [#39847591944](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39847591944) and Admin Preview diagnostic [#39847591916](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39847591916) both PASS on exact source SHA 1674396bec433fb915e3a6b922b9f22436335786. Preview artifact admin-preview-evidence-355 contains 102 PNGs and 78 fixture metrics; it is not authenticated business-data acceptance.
- PR #108 remains OPEN/unmerged/read-only; checkpoint head 3f53e0cf7519ae0c5d0be022657845d5eb0f414b. main/base is 28c768ba26b1d9f7d40e14efac5112526ed1c8b3.

## B1 cleanup disposition
- B1 PR #111 cleanup/provenance review is complete for the current 386-file diff. The 386 paths have been classified by category/consumer; no additional safe deletion or API/helper consolidation was justified.
- Current diff grouping: 332 docs (including 157 SHA-keyed history directories / 319 text-JSON evidence files), 24 Functions files, 2 migrations, 1 Admin HTML, 4 scripts, 19 tests, 1 workflow, 1 data source, and root guide/package files (2).
- Earlier cleanup removed 912 generated screenshot PNGs, 10 duplicate snapshot files, stale prompts/audits and static-only artifacts, unreferenced ZIP and zero-byte viewer. Keep approved PNG reference, data/legacy-products.json, README-DEPLOY.txt, migrations 0008/0009, active routes/tests/scripts and compact historical evidence because consumers or retention policy are documented.
- Fulfillment helper is canonical in functions/_lib.js. Payment endpoints stay separate because authorization/exposure/cache/state-transition contracts differ.

## Continue from here
1. Fetch PR #111/#108, main, branch HEAD, complete changed paths and recent Actions. Inspect exact-head Validate once for the current handoff sync.
2. Do not make another pointer-only commit after that run passes.
3. Work on the remaining Admin acceptance—not another cleanup census. Keep all 12 screens PARTIAL_NOT_ACCEPTED and Orders/Order detail unaccepted until authenticated backend workflows are actually evidenced.
4. Keep remote schema/ledger NOT_VERIFIED, authenticated backend QA NOT_TESTED and Production NOT_PERFORMED. Migration 0009, PRE/PRO, product-image/R2 persistence and AI image grouping remain deferred.

## Non-negotiable safety
- Write only feature/admin-isolated-handoff-2026-10-20. No write to PR #108, main or static website branch. Keep both PRs OPEN/unmerged.
- No merge/rebase/force-push/Production deploy; no setup/migration/deploy scripts or remote D1/R2; no secrets/Access changes or Cloudflare Access bypass.
- No fabricated business data or unapproved API contract.
