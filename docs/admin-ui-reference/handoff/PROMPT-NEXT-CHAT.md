# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual GitHub work. Read [START-HERE.md](START-HERE.md) first. Verify live state before acting; do not ask the owner to paste history and do not repeat completed B1 cleanup.

Repository: `chichute5500/Sindarealest-admin`

## Checkpoint facts — fetch live again before acting
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- PR #111 checkpoint HEAD: `c5677623d9723f266cda40ba32f18b12ef862f1f`; OPEN/unmerged; 394 changed files, +39,201 / -212. Main/base SHA: `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Application/source SHA: `bb001c7d047a94058a6c028a6748e5849a19442b`.
- Validate [#39888898010](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898010) SUCCESS on exact source SHA. Dependency audit, project integrity and automated tests passed.
- Preview diagnostic [#39888898083](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39888898083) SUCCESS on the same SHA. Artifact `admin-preview-evidence-359` contains 102 PNGs and 78 fixture metrics; this is not authenticated backend acceptance.
- HEAD `c5677623d9723f266cda40ba32f18b12ef862f1f` is an evidence-only child of `bb001c7d047a94058a6c028a6748e5849a19442b`. A handoff-doc commit is being added. Check Validate for the new exact HEAD once, then avoid pointer-chasing commits.
- PR #108 remains OPEN/unmerged and read-only; last observed head `051c8db495282abbf5e6a97f332b64d9ff263e1e`, 286 files, +20,545 / -394. Main SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.

## B1 result — do not repeat unless the diff changes
**B1 cleanup/provenance review is COMPLETE for the current 394-file diff.**
- Path census: docs 340; Functions 24; migrations 2; Admin HTML 1; scripts 4; tests 19; workflow 1; seed data 1; root guide/package 2.
- History: 162 SHA-keyed evidence directories, 328 compact report/metadata/Preview-diagnostic files plus README. Full screenshot matrices live in Actions artifacts.
- Previously removed: 912 generated screenshot PNGs, 10 duplicate snapshots, stale prompts/static-only artifacts, unreferenced ZIP and zero-byte viewer.
- Keep files with documented consumers: approved reference, seed data, deployment guide, active routes, migrations, scripts/tests, workflow, integration contract and unique history evidence.
- Fulfillment helper is canonical in `functions/_lib.js`. Payment routes remain separate because authorization/exposure/cache/state contracts differ.

## Continue the real work
1. Fetch live PR #111/#108, main, branch HEAD, changed paths and recent Actions. Verify Validate on the exact current HEAD once.
2. If the handoff commit passes, continue product acceptance or fix a newly evidenced defect; do not make another metadata-only commit to chase its own run.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until reference comparison and authorized authenticated behavior are evidenced. Orders and Order detail are not accepted.
4. Keep authenticated backend QA NOT_TESTED, remote D1 schema/ledger NOT_VERIFIED, Production NOT_PERFORMED.
5. Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain deferred by owner.

## Non-negotiable boundaries
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Do not write to PR #108, main or the static website branch. Keep both PRs open/unmerged.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy script execution, remote D1/R2 operations, secrets/Access changes or Access bypass.
- No fabricated business data or unapproved API contracts.
