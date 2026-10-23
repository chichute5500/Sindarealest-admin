# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file and PROMPT-NEXT-CHAT.md. Before acting, fetch live GitHub PR #111/#108 metadata, main SHA, writable branch HEAD and recent Actions; treat the checkpoint below as historical until re-verified. Then continue unfinished work without asking the owner to paste prior history or repeating completed B1 cleanup.

## Canonical handoff
- [Prompt for next chat](PROMPT-NEXT-CHAT.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Live checkpoint (2026-10-23 03:43 UTC; re-fetch before action)
- Writable branch / PR #111 HEAD: `6516bda5b21cc748e64d767a3041e36c2b26a822`. Prior Validate [#39896046593](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896046593) and Preview [#39896046601](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896046601) **FAILED on prior SHA `605ac706b59f166868544ea5719cb75204501631` before the UI screenshot matrix**. Root cause: `tests/handoff-integrity.test.mjs:31` rejected `testedCommitSha=null`, correct when the baseline has not passed. That test is now fixed at current HEAD `6516bda5b21cc748e64d767a3041e36c2b26a822`; verify new exact-SHA runs before claiming success.
- PR #111 remains OPEN/unmerged, 400 files (+39434 / -212), base `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge action.
- PR #108 remains OPEN/unmerged/read-only at head `7b1c201315a6349add55a07e4a561972c392fa98` (287 files); do not write there. `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Screen 10 settings order passed earlier on source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`. Screen 8 mobile CSS correction remains unverified because the prior Preview skipped Playwright.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## B1 — PR #111 cleanup/provenance
**B1 audit remains complete.** The two new files since the 394-path cleanup census are compact Preview evidence (`report.md` and `preview-diagnostics.json`), not a reason to reopen file deletion or API consolidation.
- Current path census: .github 1; root 2; data 1; docs 342; functions 24; migrations 2; public 1; scripts 4; tests 19 (396 total).
- History now contains 163 SHA-keyed run directories and 330 compact report/metadata/Preview-diagnostic text/JSON files plus the README policy. Raw screenshot matrices stay in Actions artifacts.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and the zero-byte viewer HTML.
- Keep active consumers and distinct payment contracts. `normalizeFulfillmentType` is canonical in `functions/_lib.js`. No further deletions or route/helper merges without new evidence.

## Next actions
1. Verify Validate and Admin Preview on the current handoff commit; inspect exact-SHA result.
2. Confirm Playwright actually runs and Screen 8 mobile customer assertions pass; fix only reproducible failures.
3. Continue remaining screen acceptance; exact reference parity remains NOT_VERIFIED and all 12 screens remain PARTIAL_NOT_ACCEPTED.
4. Obtain authorized authenticated Preview access before persistence QA. Never bypass Cloudflare Access or substitute fixtures for backend evidence.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
