# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file and PROMPT-NEXT-CHAT.md, verify live GitHub state, then continue unfinished work. Do not ask the owner to paste prior history or repeat the completed B1 audit.

## Canonical handoff
- [Prompt for next chat](PROMPT-NEXT-CHAT.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Live checkpoint (2026-10-23T02:37:02.015Z)
- Repository: chichute5500/Sindarealest-admin.
- PR #111 OPEN/unmerged; branch `feature/admin-isolated-handoff-2026-10-20`; checkpoint HEAD `c5677623d9723f266cda40ba32f18b12ef862f1f`; 394 changed files, +39,201 / -212. Main/base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Application/source SHA `bb001c7d047a94058a6c028a6748e5849a19442b`.
- Validate [#39888898010](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898010) **SUCCESS on exact source SHA**: dependency audit, project integrity and automated tests passed.
- Admin Preview [#39888898083](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898083) **SUCCESS on the same SHA**. Artifact `admin-preview-evidence-359`: 102 PNGs (16 login-shell, 86 read-only fixture screens) and 78 fixture metrics. This does not prove authenticated backend persistence.
- Current HEAD `c5677623d9723f266cda40ba32f18b12ef862f1f` is an evidence-only child of source SHA `bb001c7d047a94058a6c028a6748e5849a19442b`. This handoff update adds documentation only. Check Validate on the new exact HEAD once; do not create metadata-only commits to chase the next SHA.
- PR #108 OPEN/unmerged and read-only; last observed head `051c8db495282abbf5e6a97f332b64d9ff263e1e`, 286 files, +20,545 / -394. Do not write to PR #108, main or the static website branch.

## B1 — PR #111 cleanup/provenance
**B1 cleanup review is COMPLETE for the current 394-file diff.** All changed paths have been classified by category and consumers. No further deletion or API/helper consolidation is supported without new evidence.
- Path census: .github 1; root guide/package 2; data 1; docs 340; functions 24; migrations 2; public 1; scripts 4; tests 19.
- History contains 162 SHA-keyed evidence directories and 328 report/metadata/Preview-diagnostic files plus README. Full screenshot matrices remain in Actions artifacts, not Git history.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate handoff snapshots, stale prompt/static-only artifacts, an unreferenced reference ZIP and the zero-byte viewer. The approved PNG reference and written instructions remain.
- Retained files have documented consumers/purpose: seed-data integrity checks, deployment-guide tests, package checks, active routes, migrations, Admin UI, Preview workflow, integration contract and unique history evidence.
- `normalizeFulfillmentType` is canonical in `functions/_lib.js`; duplicate/unreferenced validators were removed. Payment routes retain distinct authorization, exposure, cache and state-transition contracts.

## Product acceptance remains PARTIAL
- Progress: 50% PROVISIONAL. All 12 screens remain PARTIAL_NOT_ACCEPTED.
- Authenticated backend QA: NOT_TESTED. Remote D1 schema/ledger: NOT_VERIFIED. Production: NOT_PERFORMED.
- Orders and Order detail are not accepted until authorized authenticated workflow evidence exists.
- Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain deferred by owner.

## Next work
1. Fetch live PR #111/#108, main, writable branch HEAD, changed paths and Actions. Verify Validate on the exact current handoff HEAD once.
2. If that run passes, do not create another metadata-only commit just to update its own run pointer.
3. Continue concrete Admin acceptance or fix a newly evidenced defect. Do not repeat the B1 census unless the live diff materially changes.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and #108 open/unmerged.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets changes or Cloudflare Access bypass.
- Do not fabricate business data or invent unapproved API contracts.
