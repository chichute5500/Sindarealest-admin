# PR #111 SCOPE / PROVENANCE AUDIT

## Live checkpoint — 2026-10-24 10:48 UTC
- Repository: `chichute5500/Sindarealest-admin`.
- Feature branch HEAD: `40badfd95a100bc8124b4252eb042ceb03eadc6b`; live `main` ref: `227622d3e3b7c75724ffa1775b193da71089269a`.
- PR #111: [OPEN/unmerged](https://github.com/chichute5500/Sindarealest-admin/pull/111); head matches feature branch; base ref `main`; API base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`; current PR API diff snapshot: **494 files, +46349 / -223**.
- **Base metadata discrepancy:** live `main` is one commit ahead of PR API base SHA. Do not merge/rebase; refresh live refs and inspect the PR diff before any PR-level decision. PR API currently reports mergeable/clean, but that is not permission to merge.
- PR #108 remains OPEN/unmerged and READ-ONLY; PR #112 remains OPEN/draft and must not be edited.
- This document's categorized census below is a **historical snapshot** from an earlier 394-path diff, not a current breakdown of the live 494-path diff. Do not treat those old category counts as current; recompute from live PR file pages before using them for a new cleanup decision.

## Changed-path census — 394 paths (historical snapshot; not current live PR diff)

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
