# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file, fetch live GitHub state, then continue from unfinished work. Do not ask the owner to paste previous prompts or repeat completed cleanup.

## Canonical documents
- [Next-chat prompt](PROMPT-NEXT-CHAT.md)
- [Master compatibility pointer](../MASTER-PROMPT-AUTO-HANDOFF.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Verified checkpoint when this handoff sync started
- Repository: chichute5500/Sindarealest-admin.
- PR #111 is OPEN/unmerged, branch `feature/admin-isolated-handoff-2026-10-20`. HEAD at checkpoint start: `7fe4d80c900859faf388b0e7dc585adb4350d1fe` (Preview evidence-only child of source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`). Live PR census: 388 changed files (+38,988/-212), base `main` SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. PR API reports `mergeable_state=dirty`; do not merge/rebase/force-push. Fetch live metadata before acting.
- Validate [#39886592981](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886592981) PASS on exact source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`: dependency audit, project integrity and automated tests all succeeded.
- Admin Preview diagnostic [#39886593197](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886593197) PASS on that same source SHA. Artifact `admin-preview-evidence-356` contains 102 PNGs (16 login-shell, 86 read-only fixture screens; 78 fixture metrics), expires 2026-11-06. It is not authenticated backend acceptance.
- Latest source fix: `functions/payment-qr/[key].js` now sets `Cache-Control: no-store` so a previously cached QR does not remain visible for five minutes after deactivation/replacement. `tests/fulfillment-payment-contract.test.mjs` asserts this contract. Both Validate and Preview passed on `1ec3cc72db94f07ce500d4e43830674b39a9eb03`.
- Preview workflow committed evidence-only child `7fe4d80c900859faf388b0e7dc585adb4350d1fe`; it did not change application code. This handoff sync will create a documentation checkpoint. Verify the Validate run on its exact SHA once, then do not create another metadata-only commit just to chase the run pointer.
- PR #108 remains OPEN/unmerged/read-only; branch `fix/liquid-glass-audit-2026-10-19`, checkpoint head `4ff25f02ec8255b98a6db1583c6d473a7c40a0bb`, 286 changed files (+20,509/-394). Main remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.

## B1 — PR #111 cleanup disposition
- B1 cleanup/provenance review is COMPLETE for the current 388-file diff. The changed paths are classified by group and consumer; no further deletion or helper/API consolidation is justified without new evidence.
- Earlier verified cleanup removed 912 generated PNG screenshots, 10 duplicate handoff snapshots, stale prompt/audit material, static-only workflow/script/test artifacts, an unreferenced reference ZIP and the zero-byte `admin-mobile-reference.html`. The approved `admin-mobile-reference.png` and written instructions remain.
- Checkpoint diff groups: docs 334; Functions 24; migrations 2; Admin UI 1; scripts 4; tests 19; workflow 1; data source 1; root deployment guide/package 2.
- History contains 158 SHA-keyed evidence directories and 321 report/metadata/Preview-diagnostic text/JSON files, plus `history/README.md`. No generated screenshot PNGs remain in history.
- `data/legacy-products.json` remains needed: source checks validate its 235 records, image paths, IDs/SKU rules and correspondence to migration 0002; smoke tests exercise the related contract. `README-DEPLOY.txt` is covered by config-integrity tests. Migrations 0008/0009 are schema work, not dead files.
- Payment routes retain distinct authorization, exposure, cache and state-transition responsibilities. `normalizeFulfillmentType` is canonical in `functions/_lib.js`; duplicate/unused payment validators were removed earlier.

## Product acceptance remains PARTIAL
- Overall progress remains 50% PROVISIONAL. All 12 screens remain PARTIAL_NOT_ACCEPTED. Authenticated business/backend QA is NOT_TESTED; remote D1 schema/ledger are NOT_VERIFIED; Production is NOT_PERFORMED.
- Orders and Order detail have source/query/mock-test review only, not authenticated live-data acceptance. Reference-image pixel parity remains NOT_VERIFIED.
- Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain DEFERRED_BY_OWNER.

## Next actions
1. Fetch live PR #111/#108, main, writable branch HEAD, complete changed paths and Actions. Verify Validate on the exact handoff-sync SHA once.
2. If it passes, do not create another pointer-only commit. Continue concrete Admin acceptance work rather than repeating B1 census.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until authenticated behavior and reference comparison are evidenced. Keep Orders and Order detail unaccepted without authenticated backend workflows.
4. PR #111 currently reports `mergeable_state=dirty`; leave it open and do not merge/rebase/force-push unless the owner explicitly authorizes resolution.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Do not write PR #108, `main` or the static website branch. Keep PR #111/#108 OPEN and unmerged.
- No Production deploy, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets changes or Cloudflare Access bypass.
- No fabricated business data or unapproved API contracts. Do not execute deferred work.
