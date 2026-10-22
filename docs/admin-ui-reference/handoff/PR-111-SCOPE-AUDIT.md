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
