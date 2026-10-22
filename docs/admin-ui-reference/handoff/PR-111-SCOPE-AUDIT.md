# PR #111 — READ-ONLY SCOPE AND DEPLOYMENT READINESS AUDIT

**Checked:** 2026-10-22T18:50:41+07:00  
**PR #111:** [OPEN / unmerged]( https://github.com/chichute5500/Sindarealest-admin/pull/111 )  
**ADMIN HEAD at audit:** `5497d4d3b51d32064a9a993e0f891ca672c543c1`  
**Protected static PR #108:** [OPEN / unmerged](https://github.com/chichute5500/Sindarealest-admin/pull/108), latest observed head `fb997b448a80a0bc9f34e75b4a31b7b450951fed`.

## 1. Live changed-file census

GitHub's PR file-list endpoint returned **1,285 paths**.

| Top-level path | Count |
|---|---:|
| `docs/` | 1,222 |
| `tests/` | 25 |
| `functions/` | 24 |
| `scripts/` | 5 |
| `.github/` | 2 |
| `migrations/` | 2 |
| `public/` | 2 |
| `data/` | 1 |
| `package.json` | 1 |
| `README-DEPLOY.txt` | 1 |
| **Total** | **1,285** |

By extension: PNG 913, MD 155, JSON 154, MJS 28, JS 26, HTML 3, YML 2, SQL 2, TXT 1, ZIP 1.

## 2. Provenance: inherited static files vs changes after the fork point

GitHub comparison between ADMIN and the current static branch gives **merge base** `a3834fed3eb1c012b188d7c95d14ec3d15e3969f` (commit `Link prompt completeness audit from handoff start page`, 2026-10-19 19:06:41 UTC). At comparison time the branches were diverged: ADMIN was 890 commits ahead of static and static 915 commits ahead of ADMIN. Do not sync/merge them as a routine update.

Path histories show these files' last relevant commits were **before the merge base**:
- `public/index.html`: `a9456c3071bf` (2026-10-19 08:32:59 UTC).
- `.github/workflows/liquid-glass-visual-preview.yml`: `fa084dd8a6b2` (2026-10-19 00:35:38 UTC).
- `scripts/setup-cloudflare.mjs`: `e5bd3821cdd8` (2026-10-19 05:44:14 UTC).
- `scripts/deploy-cloudflare.mjs`: `5e8bda2394c0` (2026-10-19 05:37:01 UTC).

**Conclusion:** these specific storefront/workflow/setup/deploy paths appear inherited at the fork point, not evidence of recent post-split ADMIN edits. They still appear in the PR diff against `main`, so merging #111 would include them. Do not remove them blindly.

Files added/changed after the merge base include:
- `migrations/0009_fulfillment_and_manual_payments.sql` (commit `24181fd2fb16`, 2026-10-21).
- `functions/api/admin/payment-requests.js` (feature commits 2026-10-21).
- `functions/api/admin/payment-transactions.js` (commit `d3fa9b85be20`, 2026-10-21).
These are Admin/payment/fulfillment backend changes and need focused contract/schema/deploy review, independent of visual UI checks.

## 3. Potential migration/setup/deploy readiness blocker — source-only

The new payment routes query `order_payment_requests`, `order_payment_transactions`, `fulfillment_type` and `payment_terms_confirmed_at`, which migration `0009_fulfillment_and_manual_payments.sql` defines. Read-only source inspection found **no reference/preflight for migration 0009 or its new schema** in:
- `scripts/setup-cloudflare.mjs`
- `scripts/deploy-cloudflare.mjs`

`scripts/check-migrations.mjs` does exercise migration 0009 using a **temporary local D1** test, which proves local migration/test behavior only. It does not establish the schema state of a configured remote database.

**Status: POTENTIAL_BLOCKER_NOT_VERIFIED.** No remote D1 schema query, setup/deploy script, migration or write was run. Do not claim remote schema is missing. Before merge/release, review a safe fail-closed preflight and regression tests within authorized source scope. Do not add an automatic remote migration or execute one without separate authorization.

## 4. Validation and next actions
- [Validate ADMIN HEAD #39773285617](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773285617): SUCCESS on exact SHA `5497d4d3b51d32064a9a993e0f891ca672c543c1`.
- [Preview #39767851318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318): SUCCESS on visual source SHA `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`; [artifact #311](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318/artifacts/12420678829) is fixture/read-only.
- PR #111 is not merge-ready. Keep #111/#108 OPEN/unmerged and preserve branch isolation.

Next: finish Product list #3 comparison as the higher-priority UI task; then review the 0009 fail-closed preflight/test gap and continue per-screen parity. All source/DB operations remain subject to current safety boundaries.
