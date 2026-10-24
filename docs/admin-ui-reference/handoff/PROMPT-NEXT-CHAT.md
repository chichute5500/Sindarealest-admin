# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub repository `chichute5500/Sindarealest-admin`. Do not ask the user to repeat history or paste context. Start by verifying live state, then continue work in parallel; do not stop after a report unless an actual user action is required.

## Verified checkpoint at 2026-10-24 08:55 UTC

- Allowed writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- Latest application/test SHA: `0469930f6836d5f8d87b155a538e1d68776e3913`.
- Validate #5664 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40079854170
- Admin Preview Playwright #1069 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40079854185
- PR #111 remains OPEN and unmerged. GitHub currently reports `mergeable=true`, `mergeable_state=clean`; base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- QR upload atomicity fix is included: pending-key upsert and audit record are batched; failure cleans only the newly staged R2 object. Test-first regression covers success/failure and active-QR preservation.
- Feature-specific workflow/spec are isolated from `main`: `.github/workflows/deploy-admin-isolated-preview.yml` and `tests/e2e/admin-isolated-preview.spec.js`. The workflow remains pinned to the dedicated `sindarealest-admin-preview` project and the approved feature branch.
- Last read-only diagnostics run #527 passed on older SHA `b6d68ef9cd5ba8e72fcf4c2175e6b7674d039018`; do not attribute its route/catalog/image counts to `0469930f6836d5f8d87b155a538e1d68776e3913` unless rerun/evidence confirms the same SHA.
- Progress stays **50% PROVISIONAL**. All 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## Required operating rules (all seven)

1. Parallelize independent safe workstreams (PR/workflow analysis, source/concurrency audit, UI/reference audit, test/handoff integrity) where practical.
2. Report verified results and immediately continue to the next useful task; do not treat a report as a stopping point.
3. When blocked, cite concrete evidence and switch to independent work; do not retry the same failed route without new evidence.
4. Test-first: add a regression test, observe it fail for the intended reason, then fix and verify green.
5. Tie every claim to exact SHA and run/artifact. Explicitly distinguish local synthetic fixtures and read-only GET tests from authenticated business-write/persistence QA.
6. Stop only when a real user action is necessary. Do not ask the user to find a nonexistent “Run workflow” button; do not request secrets in chat.
7. Follow all safety constraints below.

## Hard guardrails

- Only write to `feature/admin-isolated-handoff-2026-10-20`.
- Keep PR #111 OPEN/unmerged. PR #108 and #112 are read-only.
- Never merge/rebase/cherry-pick/force-push; never edit `main` or storefront branches.
- Never deploy Production, run remote D1/R2 writes or migrations, alter schema/ledger, change Cloudflare Access/secrets/DNS, or bypass Access.
- Do not invent commits just to trigger Preview. A docs-only commit is not application/test evidence.
- Keep the Admin Preview project target `sindarealest-admin-preview`; do not replace it with the shared storefront project.
- Do not change acceptance/progress without direct evidence.

## Immediate next tasks

1. Refresh current live HEAD, PR #111/#108/#112, main comparison and latest workflow runs.
2. Run parallel read-only audits of `functions/api/admin/payment-requests.js`, `payment-transactions.js`, `orders.js`, `warranties.js`, and related race/atomicity tests. Fix only demonstrable issues via test-first changes.
3. Continue reference-driven UI audit using latest available evidence; no speculative visual changes.
4. Verify latest exact-SHA Validate and Preview; if only one passes, document the gap and keep working.
5. Update all canonical handoff files after the next meaningful verified checkpoint, then re-fetch live refs to verify consistency.

## Canonical handoff files

- `docs/admin-ui-reference/handoff/START-HERE.md`
- `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`
- `docs/admin-ui-reference/handoff/LATEST-STATUS.md`
- `docs/admin-ui-reference/handoff/current-status.json`
- `docs/admin-ui-reference/handoff/latest-test-results.json`
- `docs/admin-ui-reference/handoff/12-SCREEN-REFERENCE-AUDIT.md`

Read `START-HERE.md` and both JSON files first. Continue work immediately; do not stop at summarizing.
