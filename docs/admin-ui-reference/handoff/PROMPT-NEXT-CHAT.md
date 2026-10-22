# PROMPT NEXT CHAT — SINDAREALEST ADMIN

**Single entry point:** [START-HERE.md](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/handoff/START-HERE.md). The owner should not need to paste project history or a long prompt. Fetch live state before acting.

## Live checkpoint (2026-10-22)
- Repository: `chichute5500/Sindarealest-admin`
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Read-only static branch: `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged.
- PR #111 live metadata: 1,314 changed files; mergeable=false.
- Branch HEAD at checkpoint start: `9ec143a6d0250b4c5949cfaa6e6f6eed01d6748e`. Latest source/test SHA: `105f46b90dc5664dd091493dbd5cea1af7796c44`.
- Source validation [run #39816652373](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652373}) SUCCESS.
- Responsive/theme Playwright and Preview diagnostic [run #39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346) SUCCESS on the same source/test SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`.
- Latest artifact [admin-preview-evidence-344, ID 12441639210](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210) is available. Inspect this artifact; do not fall back to older #339 unless comparing history.
- Product progress **50% PROVISIONAL**. All 12 screens PARTIAL_NOT_ACCEPTED; authenticated business/backend QA NOT_TESTED.
- The `retry-customers` timeout from #39804852604 on old SHA `326526f8...` is historical; later exact-SHA runs passed. Do not repeat it absent new evidence.

## Work to continue — do real work, not a progress-only report
1. Read current `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, and `PR-111-SCOPE-AUDIT.md`.
2. Inspect artifact #344 screenshots and compare against `docs/admin-ui-reference/admin-mobile-reference.png` at matching viewport/theme. Start with Gallery (#5), then screens #8–#12. State exact image filenames and actual differences; do not invent a defect.
3. Refresh PR #111 paginated changed filenames (live count is now 1,314, so old 1,310 census is historical). Audit `functions/`, `migrations/`, `scripts/`, `.github/workflows/`, `public/`, `package.json`; classify inherited vs added/modified and verify against live merge base.
4. Fix the highest-value reproducible safe issue only on the ADMIN branch, add regression coverage, run checks on the exact changed SHA, inspect evidence, and update all relevant handoff files.
5. After every checkpoint fetch live HEAD/PR/Actions again. Report PASS/FAIL/BLOCKED/NOT_TESTED/NOT_VERIFIED truthfully; do not raise product progress for docs or fixture-only wins.

## Safety boundaries
Keep PR #111 and #108 OPEN; no merge, no `main`/static edits, no force-push, no Production deploy. Do not bypass Cloudflare Access or access/expose secrets. Do not run setup/migration/deploy scripts or perform remote D1/R2/schema/ledger operations. Migration 0009, PRE/PRO migrations, R2 persistence and product-image save remain DEFERRED_BY_OWNER. Do not fabricate products, prices, stock, customers, orders, payment status, images, or unapproved API contracts.
