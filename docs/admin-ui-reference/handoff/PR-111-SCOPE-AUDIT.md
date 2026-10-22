> **LIVE HANDOFF UPDATE — 2026-10-22 (last verified poll).** Current documentation HEAD before this update: `e93b2384c89513c0911ef019153de28198f4e2b4`. PR #111 remains OPEN/unmerged and matches ADMIN branch. PR #108 remains OPEN/unmerged; latest observed static PR head `f291209565dbc49d78a0b3a387d00be0c754df45`. Overall progress remains **50% PROVISIONAL**.
>
> **Active run:** [Preview diagnostic #39790514765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514765) is still `IN_PROGRESS` for source SHA `df819968a1b3b561bba00abde4fe3432adaa8b39` (NOT current docs HEAD). Latest poll: job `119865005259`, step “Install Chromium for Playwright” still in progress; no artifacts returned. Do not infer success/failure from elapsed time, and do not treat this as evidence for the docs HEAD.
>
> **Source validation:** [#39790514805](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514805) was SUCCESS on `df819968a1b3b561bba00abde4fe3432adaa8b39`, not later docs-only HEADs. State the tested SHA exactly; do not say the current docs HEAD was tested unless a workflow confirms it.
>
> **Recent code changes:** [`9209ac3`](https://github.com/chichute5500/Sindarealest-admin/commit/9209ac398636e2187beb2731359ae9c205901157) fixes navigation collection iteration. [`df81996`](https://github.com/chichute5500/Sindarealest-admin/commit/df819968a1b3b561bba00abde4fe3432adaa8b39) updates Order detail E2E to select the visible responsive detail button and updates the contract assertion. Current Playwright result is unresolved.
>
> **Screen audit:** #6 Orders = `PARTIAL_NOT_ACCEPTED` (3 UI-only fixtures; no live backend data or multi-page pagination proof). #7 Order detail = `NOT VERIFIED` until run logs and screenshot artifacts are inspected. Do not mark either PASS based on unit tests or fixture screenshots alone.
>
> **Next chat MUST start by polling** run #39790514765: run status, jobs/steps, logs, artifacts. If it remains stuck at Chromium installation, diagnose workflow/dependency/cache behavior from logs; do not blindly queue duplicate runs. If completed, inspect screenshots and report per-screen evidence. Then continue remaining screen and PR #111 provenance audits.
>
> **Safety:** PR #111/#108 stay OPEN/unmerged. No main/static branch writes, Production deploy, Access bypass, secrets, setup/deploy/migrations, or remote D1/R2 access. Use expected-SHA updates and read back every handoff write.

> **LIVE CHECKPOINT — supersedes all older SHA/run snapshots below (2026-10-22 21:00 +07).** ADMIN branch HEAD: `df819968a1b3b561bba00abde4fe3432adaa8b39`. PR #111 OPEN/unmerged and matches this HEAD. PR #108 OPEN/unmerged; latest observed static HEAD `f291209565dbc49d78a0b3a387d00be0c754df45`. Progress stays **50% PROVISIONAL**.
>
> - Source validation [#39790514805](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514805) = SUCCESS on exact HEAD `df819968a1b3b561bba00abde4fe3432adaa8b39`.
> - Preview diagnostic [#39790514765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39790514765) = IN_PROGRESS on exact HEAD `df819968a1b3b561bba00abde4fe3432adaa8b39`; last observed step was Chromium install. Screenshot matrix and Preview diagnosis pending; no artifact available at that poll. Do not mark visual QA PASS.
> - Fixes since earlier checkpoints: [`9209ac3`](https://github.com/chichute5500/Sindarealest-admin/commit/9209ac398636e2187beb2731359ae9c205901157) restores nav collection iteration; [`df81996`](https://github.com/chichute5500/Sindarealest-admin/commit/df819968a1b3b561bba00abde4fe3432adaa8b39) updates Order detail E2E to choose the visible responsive button. Source CI is green; E2E/visual result still pending.
> - #6 Orders remains PARTIAL_NOT_ACCEPTED (3 UI-only fixtures; no live backend or multi-page pagination proof). #7 Order detail NOT VERIFIED pending this run's logs and screenshot artifact.
> - **First action next chat:** poll run #39790514765, jobs/steps/logs/artifacts to completion. Only then review screenshots and update screen statuses. Do not repeat old #3/#4 geometry without a new failure/state.

# PR #111 — READ-ONLY SCOPE AND DEPLOYMENT READINESS AUDIT

**Checkpoint:** 2026-10-22T20:00:23.859+07:00
**Pre-write ADMIN HEAD:** c002a34d0df955e4d804615f665d6ae5bedc4072
**PR #111:** OPEN/unmerged, base main. **Protected PR #108:** OPEN/unmerged, snapshot head ebdd5e657c317490ce7747056ffa37be8c65ab0c. This file is updated only on the ADMIN branch.

## 1. Live file census
PR #111 currently reports 1,298 changed paths.

| Top-level path | Count |
|---|---:|
| .github/ | 2 |
| README-DEPLOY.txt | 1 |
| data/ | 1 |
| docs/ | 1,235 |
| functions/ | 24 |
| migrations/ | 2 |
| package.json | 1 |
| public/ | 2 |
| scripts/ | 5 |
| tests/ | 25 |
| **Total** | **1,298** |

Extensions: PNG 913, MD 165, JSON 157, MJS 28, JS 26, HTML 3, YML 2, SQL 2, TXT 1, ZIP 1.

Live compare from static HEAD ebdd5e657c317490ce7747056ffa37be8c65ab0c to ADMIN HEAD c002a34d0df955e4d804615f665d6ae5bedc4072: DIVERGED, ADMIN ahead 931, static ahead 926, merge base a3834fed3eb1c012b188d7c95d14ec3d15e3969f. Compare URL: https://github.com/chichute5500/Sindarealest-admin/compare/ebdd5e657c317490ce7747056ffa37be8c65ab0c...c002a34d0df955e4d804615f665d6ae5bedc4072. This is a snapshot, not a permanent value; re-fetch refs before another write.

## 2. Ancestry versus later edits
Paths with ancestry before the split point include public/index.html, .github/workflows/liquid-glass-visual-preview.yml, scripts/setup-cloudflare.mjs and scripts/deploy-cloudflare.mjs. The setup/deploy files still contain post-split ADMIN changes; inherited file origin does not make every current line inherited. Never blind-revert because a path is present in the diff against main.

Post-split changes reviewed:
- Setup 0009 gate: ca06ac02253644ed0290c5bca343c33a872010d0; current blob ec1c614048b84657ef8824d865dda42f0c8341fe.
- Deploy 0009 gate: 6ad36a5bbb3b7ffb5ee2f90d5df0eb4d47c75972; current blob 9a1e30c770527f27f20210b9ceb98ca25244f771.
- Regression checks: 305fc139c22d682b4b6882af18d6d79836887cc7; current test blob 45c292c45f445628f5d36e02acfc54ac123f837d.
- Migration 0009 was introduced in 75a60f760e01341c6e4cc02faec1f53642ebe94e and later amended in 24181fd2fb166bc13fb7840d77cb53cefa30035a.
- Payment request route: 2045892129184ea62d203c1f6578ad33683cbd6a adds rejection for unpriced order lines; 0f197e8d1892c7635ae4b953ec25b94f6bce63f6 fails closed if the active QR asset is missing.
- Transaction route: d3fa9b85be20d832cbf24678dd7f3c7d862c1e64 adds the atomic net-refund guard.
- Full per-path provenance for all 1,298 paths remains IN PROGRESS.

## 3. Migration 0009 / setup-deploy sequencing
Migration 0009 adds conservative unclassified fulfillment defaults, payment-term confirmation fields, an order capability-token hash and payment-request/payment-transaction ledger tables with constraints/indexes.

Both setup and deploy source include read-only SELECT ... LIMIT 0 schema checks for 0009 columns/tables. Current tests/config-integrity.test.mjs asserts the required queries, no automatic migration 0009 execution and the preflight order. Validate #4737 passed npm run check and npm test on the preceding exact source HEAD 368b3f26911f47f12cdb7ab6f300ad359283b9cc: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780791597.

**Critical setup caveat:** scripts/setup-cloudflare.mjs reaches the 0009 preflight only after remote migration commands 0001 and 0003–0008. The 0009 queries are read-only and block seed/Pages deployment, but the full setup script is not read-only and may already have changed schema before a missing-0009 error. Do NOT execute setup, deploy or migration in this task.

Remote D1 schema/migration ledger are NOT VERIFIED. Temporary local D1 checks cannot prove remote readiness. Migration 0009 stays DEFERRED_BY_OWNER.

## 4. Payment API source review
Payment-request handlers require Admin authentication, reject client-provided amount, require confirmed pricing/terms, validate item totals, reject unpriced/mixed/unclassified fulfillment and invalid active QR. Amounts are server-derived: 30% made-to-order deposit, 100,000 VND in-stock deposit, total for full payment, ledger-calculated balance.

Payment-transaction handler validates amounts/references, rejects duplicates, blocks receipts on cancelled/unconfirmed orders, caps refunds at verified net receipts and rechecks the amount in the atomic D1 batch. Status/audit updates require successful ledger insertion. Local route tests cover refund races and fail-closed cases; they are not authenticated remote backend QA.

## 5. Workflow and evidence limits
- [Validate #4737](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780791597) passed npm run check and npm test on 368b3f26911f47f12cdb7ab6f300ad359283b9cc.
- [Preview run #316](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707) and [artifact ID 12426370257](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778678707/artifacts/12426370257) use SHA 305fc139c22d682b4b6882af18d6d79836887cc7. Logs record 3 local Playwright tests and 2 limited Preview smoke tests passed; not exact HEAD or full 12-screen/business QA.
- admin-preview-diagnostics.yml pins checkout to github.sha and avoids persisting stale evidence if branch HEAD moved. contents:write exists for committing evidence; least-privilege review remains open.
- An older #315 failure at ca06ac0 was an earlier assertion-order regression; later test updates and exact-HEAD check/test evidence pass.
- No Production deploy, remote D1/R2 query/write, setup or migration was performed.

## 6. Findings / next actions
Confirmed: exact-source check and unit tests passed on the recorded pre-write HEAD; 0009 preflight and ordering guards exist; payment route safeguards have local test coverage. Not verified: remote schema/ledger, exact-current-HEAD responsive/Preview, authenticated business-module QA, complete PR ancestry and all 12 screen acceptances.

Next safe work: audit Orders #6 and Order detail #7 independently, continue remaining screens and PR path provenance. Keep both PRs OPEN/unmerged. No main/static edits, Production, Access bypass, secrets, remote D1/R2, setup/deploy/migration. AI grouping BLOCKED; R2 image save and PRE/PRO migrations DEFERRED_BY_OWNER.


## Live verification addendum — 2026-10-22T20:25:00+07:00
- PR #111 head confirmed as `78697c759185e04f58cdf2ac629fdb368204a3b8`, OPEN/unmerged. Source workflow #39785571172 SUCCESS on exact HEAD.
- Preview workflow #39784873281 remains in progress on parent SHA `340f50d6...`; final browser/Preview results are not current-head evidence.
- No migration, remote D1/R2 write, setup/deploy script, Production deployment or Access bypass was performed. Migration 0009 remains DEFERRED_BY_OWNER; PRE/PRO migrations and R2 save remain deferred; AI image grouping remains blocked pending approved contract.
- PR scope audit is not complete merely because source CI is green. Continue reviewing migration/API/deploy diffs and inherited commits; do not revert blindly.
