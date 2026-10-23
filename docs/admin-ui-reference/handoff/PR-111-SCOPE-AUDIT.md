# PR #111 SCOPE / PROVENANCE AUDIT

## Live checkpoint
- Repository: `chichute5500/Sindarealest-admin`.
- PR #111 OPEN/unmerged; branch `feature/admin-isolated-handoff-2026-10-20`; checkpoint HEAD `c5677623d9723f266cda40ba32f18b12ef862f1f`; main/base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- PR API snapshot: **394 changed files, +39,201 / -212**. Re-fetch live state before acting.
- Source/test SHA `bb001c7d047a94058a6c028a6748e5849a19442b`: Validate [#39888898010](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898010) SUCCESS; Preview [#39888898083](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898083) SUCCESS on exact same SHA.
- PR #108 OPEN/unmerged and READ-ONLY; last observed head `051c8db495282abbf5e6a97f332b64d9ff263e1e`; 286 files, +20,545 / -394.

## Changed-path census — 394 paths

| Area | Files | Disposition |
|---|---:|---|
| Documentation and handoff evidence | 340 | Keep canonical docs, integration contract and SHA-keyed evidence; remove only proven stale duplicates/empty artifacts |
| Pages Functions | 24 | Keep active handlers/shared helpers; no consumer evidence supports further safe deletion |
| Database migrations | 2 | Keep schema migrations 0008 and 0009 |
| Admin UI | 1 | Keep `public/admin/index.html` |
| Scripts | 4 | Keep package-driven checks and deployment/setup tooling; do not execute deployment/setup scripts |
| Tests | 19 | Keep automated tests and Playwright specs invoked by workflow |
| Workflow | 1 | Keep Admin Preview diagnostic workflow |
| Seed data | 1 | Keep `data/legacy-products.json`; checks validate 235 entries, images, IDs/SKU and migration seed correspondence |
| Root guide/package | 2 | Keep `README-DEPLOY.txt` (test consumer) and `package.json` (scripts/dependencies) |

## Evidence retention
- History contains **162 SHA-keyed directories and 328 report/metadata/Preview-diagnostic text/JSON files**, plus `history/README.md`.
- Full screenshot matrices remain in Actions artifacts, not Git. Retain compact success/failure evidence with exact source SHA and run IDs.
- Earlier cleanup removed 912 generated historical PNGs and 10 duplicate/stale handoff snapshots; the approved `admin-mobile-reference.png` and written instructions remain.

## Code/provenance decisions
- `normalizeFulfillmentType` is canonical in `functions/_lib.js`; duplicate definition and unreferenced payment validators were removed earlier.
- `data/legacy-products.json` has active integrity-check/test consumers. `README-DEPLOY.txt` is read by configuration-integrity tests.
- Migrations 0008/0009 are schema work, not dead files.
- Payment endpoints have distinct authorization, exposure, cache and state-transition responsibilities. No consolidation is supported without changing contracts.
- Public QR route/cache behavior passed on source SHA `bb001c7d047a94058a6c028a6748e5849a19442b`: active key returns 200/no-store; deactivated/replaced key returns 404.

## B1 conclusion
**B1 cleanup/provenance review is COMPLETE for the current 394-file diff.** Reopen only if the live diff materially changes or new consumer evidence identifies an unused file. Overall Admin acceptance remains PARTIAL: 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.

## Deferred and prohibited
Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain deferred by owner. No merge, Production deployment, setup/migration/deploy script execution, remote D1/R2/schema/ledger operation, secrets change or Cloudflare Access bypass.
