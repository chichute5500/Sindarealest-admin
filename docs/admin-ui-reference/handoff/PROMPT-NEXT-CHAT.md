# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual GitHub work on the current live repository. Read [START-HERE.md](START-HERE.md) and this file, then fetch live PR #111/#108 metadata, main SHA, writable branch HEAD and recent Actions before acting. Treat the checkpoint below as historical until re-verified. Do not ask the owner to paste history or repeat completed B1 cleanup.

Repository: `chichute5500/Sindarealest-admin`

## Latest live checkpoint (2026-10-23 03:43 UTC; verify again before action)
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`; HEAD/PR #111 head `6516bda5b21cc748e64d767a3041e36c2b26a822`; `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Prior Validate [#39896046593](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896046593) and Preview [#39896046601](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896046601) FAILED on prior SHA `605ac706b59f166868544ea5719cb75204501631` before Playwright. Both stopped at `tests/handoff-integrity.test.mjs:31`: `testedCommitSha=null` is expected before baseline pass, but test incorrectly required a SHA. Fixed on current HEAD `6516bda5b21cc748e64d767a3041e36c2b26a822`; rerun both workflows and inspect actual Playwright output.
- PR #111 OPEN/unmerged, 400 files (+39434/-212). PR #108 OPEN/unmerged and READ-ONLY at `7b1c201315a6349add55a07e4a561972c392fa98` (287 files). No merge/deploy.
- Screen 10 order fix passed earlier on `4ac7465539e746b7f37517327d7bf9bddcfa3285`. Screen 8 mobile CSS correction remains a candidate because prior Preview did not reach Playwright.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## B1 — complete; don't repeat without new evidence
B1 scope/provenance review is complete. The current diff is 396 files; the two additions after the last census are generated compact Preview evidence (`report.md`, `preview-diagnostics.json`). Current path census: docs 342, functions 24, migrations 2, Admin HTML 1, scripts 4, tests 19, workflow 1, seed data 1, root 2. History has 163 SHA-keyed directories and 330 compact text/JSON evidence files plus README. No further deletion or API consolidation is justified without newly discovered consumer/provenance evidence.

## Continue real work
1. Verify Validate and Admin Preview on the current commit; confirm the nullable `testedCommitSha` assertion passes, then inspect whether Playwright runs and Screen 8 checks pass.
2. Fix only reproducible UI failures; keep Screen 8 unverified until Preview passes. Continue remaining screen acceptance afterward.
3. Authenticated backend QA remains `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Fixture tests do not count as backend evidence.
4. Obtain authorized Preview access before authenticated QA; never bypass Access or change secrets. Migration 0009, PRE/PRO, product-image/R2 and AI image grouping remain deferred by owner.
## Non-negotiable boundaries
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111/#108 OPEN/unmerged. Do not write to PR #108, `main` or the static website branch.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy script execution, remote D1/R2/schema/ledger operations, secret/Access changes or Access bypass.
- No fabricated business data or unapproved API contracts.
