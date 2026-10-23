# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual work on GitHub. Read [START-HERE.md](START-HERE.md) first; fetch the live PRs, current branch HEAD and Actions before acting. Do not ask the owner to paste history or repeat completed cleanup.

Repository: chichute5500/Sindarealest-admin.

## Checkpoint facts (fetch live again)
- At the start of this handoff sync, PR #111 HEAD was `7fe4d80c900859faf388b0e7dc585adb4350d1fe`, an evidence-only child of application source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`. PR census at checkpoint: 388 files, +38,988/-212; OPEN/unmerged; `mergeable_state=dirty`. Do not merge/rebase/force-push.
- Validate [#39886592981](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886592981) and Admin Preview [#39886593197](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39886593197) both PASS on exact source SHA `1ec3cc72db94f07ce500d4e43830674b39a9eb03`. Preview artifact `admin-preview-evidence-356` contains 102 PNGs and 78 fixture metrics; it does not prove authenticated business-data persistence.
- The concrete code fix on that SHA changes the public QR image route cache header to `no-store` and adds a contract assertion. The source Validate and Preview workflow both passed.
- PR #108 remains OPEN/unmerged/read-only; checkpoint head `4ff25f02ec8255b98a6db1583c6d473a7c40a0bb`, 286 files (+20,509/-394). Main SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.

## B1 cleanup disposition
- B1 PR #111 cleanup/provenance review is complete for the current 388-file diff; all changed paths are classified by category/consumer and no further safe deletion/API consolidation is justified.
- Diff grouping: 334 docs (158 SHA-keyed history directories / 321 evidence text/JSON files plus README), 24 Functions, 2 migrations, 1 Admin HTML, 4 scripts, 19 tests, 1 workflow, 1 data source and 2 root guide/package files.
- Earlier cleanup removed 912 generated screenshot PNGs, 10 duplicate snapshots, stale prompts/audits and static-only artifacts, unreferenced ZIP and zero-byte viewer. Keep the approved PNG reference, data seed, deployment guide, migrations 0008/0009, active routes/tests/scripts and unique compact historical evidence.
- Fulfillment helper is canonical in `functions/_lib.js`. Payment endpoints remain separate because authorization/exposure/cache/state-transition contracts differ.

## Continue from here
1. Fetch PR #111/#108, main, branch HEAD, complete changed paths and recent Actions. Verify Validate on the exact handoff-sync SHA once.
2. Do not make another pointer-only commit after that run passes.
3. Continue remaining Admin acceptance work. Keep all 12 screens PARTIAL_NOT_ACCEPTED and Orders/Order detail unaccepted until authenticated backend workflows and reference comparison are evidenced.
4. Keep authenticated backend QA NOT_TESTED, remote schema/ledger NOT_VERIFIED, Production NOT_PERFORMED. Migration 0009, PRE/PRO, product-image/R2 persistence and AI image grouping remain deferred.
5. PR #111 reports `mergeable_state=dirty`. Do not merge/rebase/force-push; record it and wait for explicit authorization before resolving.

## Non-negotiable safety
- Write only `feature/admin-isolated-handoff-2026-10-20`. No writes to PR #108, main or static website branch. Keep both PRs OPEN/unmerged.
- No Production deploy, setup/migration/deploy scripts, remote D1/R2, secrets/Access changes or Cloudflare Access bypass.
- No fabricated business data or unapproved API contract.
