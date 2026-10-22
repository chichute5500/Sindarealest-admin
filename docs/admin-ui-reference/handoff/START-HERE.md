# START HERE — SINDAREALEST ADMIN

**This is the single entry point for every new chat. Do not ask the owner to paste old prompts or repeat project history.**

## First actions (mandatory)
1. Fetch live PR #111, PR #108, branch HEAD and GitHub Actions. Treat this file as a map, not a substitute for live checks.
2. Read `current-status.json` and `latest-test-results.json`; then read `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, and `PR-111-SCOPE-AUDIT.md`.
3. Inspect the existing failed Preview run before dispatching any new run. Continue real work after a short checkpoint; do not stop after reporting.
4. After every meaningful change, validate the exact code SHA and update the handoff files. Keep status files consistent with each other.

## Live checkpoint recorded 2026-10-22
- Repository: `chichute5500/Sindarealest-admin`
- Only writable branch: `feature/admin-isolated-handoff-2026-10-20`
- PR #111: OPEN/unmerged. Previously observed HEAD before handoff-only commits: `4d6dab2f56d4dec53955c300e8ea477062fd2587`; handoff commits have advanced it since, so fetch live HEAD before acting.
- PR #108: OPEN/unmerged and read-only for this task; fetch its live HEAD before acting.
- Product/code-test SHA: `326526f8f74172ae0aea7fa37739c9a8e8f513ec` (different from documentation-only branch HEAD).
- Progress: **50% PROVISIONAL**. Documentation changes do not increase product progress.
- Source validation [run 39804852564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852564): completed SUCCESS on code/test SHA `326526f8...`.
- Preview workflow [run 39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604): overall FAILURE because local Playwright test timed out waiting for `[data-action="retry-customers"]` at `tests/e2e/admin-static-baseline.spec.js:1940`; the deployed Preview diagnostic step itself was SUCCESS. Evidence artifact: [admin-preview-evidence-336](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604/artifacts/12437154740).
- Older Preview [run 39802525217](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39802525217): CANCELLED. Do not describe it as running or pending.

## Immediate next task
Inspect artifact 12437154740 and test `tests/e2e/admin-static-baseline.spec.js` around line 1940. Establish whether the retry button is missing because the fixture setup is wrong or the UI regressed before changing code. Fix only verified ADMIN issues on the writable branch and validate the resulting code SHA. Continue review of screens #8–#12 and PR #111 changed-file provenance.

## Guardrails
- Keep PR #111 and #108 open/unmerged. Never write to `main` or the website/static branch.
- No Production deployment, Cloudflare Access bypass, secrets access/exposure, or remote D1/R2/setup/migration operations.
- No fabricated product/customer/order/pricing/stock/image data or unapproved API contracts.
- Do not mark PASS without exact-SHA evidence. A source CI pass is not authenticated backend QA or full screen acceptance.
- If a tool/action is blocked, state exactly what could not be changed; never claim an update that did not commit.

## One-line command for future chats
`Continue SinDarealest Admin from this START-HERE file: fetch live PR/branch/Actions, read the current status and test evidence, inspect the known Preview failure, then continue real work on the permitted ADMIN branch. Do not ask me to paste old prompts or repeat completed work; update all handoff files after checkpoints.`
