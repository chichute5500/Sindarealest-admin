# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử. Luôn fetch live PR #111/#108, branch HEAD, merge base, changed paths và Actions trước khi thao tác.

Repository: `chichute5500/Sindarealest-admin`.

## Last verified checkpoint
- PR #111 was OPEN/unmerged at pre-sync HEAD `30fece366e559073f6c664f6ed0459712c1b0a84`, 385 changed paths (+38848/−211), mergeable=false. Exact-SHA Validate [#39842366701](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842366701) passed `npm run check` + `npm test` on that SHA.
- Current handoff-only HEAD after syncing status/audit is `976e72d2ec10e9ead74a4c3275b8569d52a4f525`; Validate run [#39842755681](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842755681) was IN_PROGRESS at last fetch. Refetch exact-SHA Actions before claiming current HEAD PASS.
- Preview matrix and diagnostics pass on product/UI source SHA `2eb6e7e9d6b1cf15002a7d67e299c713a4d32118` (102 PNGs, 78 fixture metrics); evidence is synthetic/read-only, not authenticated backend acceptance.
- B1 remains PARTIAL, not complete. The reviewed payment and core handler slices showed no additional safe deletion/merge proven; endpoint auth boundaries differ. Remote migration/application remains owner-deferred.
- Product progress 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production deployment NOT PERFORMED.


## Next task
1. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md` and `history/README.md`; fetch live state first.
2. Continue provenance review of remaining runtime/API/migration/setup/workflow files. Delete only files proven unused and without safety/audit value; preserve required Admin/payment contracts and owner-deferred boundaries.
3. Do not edit `public/index.html`, `main`, PR #108 or the static branch. Keep PR #111 and #108 OPEN/unmerged.
4. No merge, force-push, Production deploy, Cloudflare Access bypass, secret access, remote D1/R2/schema/ledger operations, or setup/migration/deploy scripts. Migration 0009, PRE/PRO and R2/product-image save remain DEFERRED_BY_OWNER; AI grouping requires an owner-approved API/UX contract.
5. After each checkpoint, synchronize the handoff, read it back, refetch HEAD/PR/Actions and continue working. Do not increase progress without acceptance evidence.

## Live checkpoint — 2026-10-23
- PR #111 HEAD: `ae7e915d7de15f4f0a03f59d1caaad39fc6a9231`, OPEN/unmerged, 385 changed paths (+38,879/−211), mergeable=false. Exact-SHA Actions/status lookup returned no runs/checks; validation is NOT_VERIFIED.
- PR #108 remains OPEN/unmerged and read-only. No changes to PR #108, `main`, or the static website branch.
- Reconciled one stale instruction in `reference-instructions.md`: current PR #111 changed-path census does not include `public/index.html`; `public/admin/index.html` is the ADMIN UI source. Always re-fetch the live file list.
- Provenance review: `tests/e2e/admin-static-baseline.spec.js` is invoked directly by `.github/workflows/admin-preview-diagnostics.yml`; `tests/e2e/admin-preview.spec.js` is conditionally invoked by the same workflow. Both are live dependencies and must not be deleted. `playwright.config.js` was not found at this branch ref, but that alone is not grounds to remove configuration references without reviewing package/runner defaults.
- B1 cleanup of previously identified generated screenshots and stale handoff snapshots remains complete. Full provenance review remains PARTIAL; no speculative deletion or merge.
- Product progress 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production deployment NOT_PERFORMED.
