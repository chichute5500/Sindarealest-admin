# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Use the repository handoff as the source of truth. The owner should not need to paste this long prompt again; the one-line command is in [START-HERE.md](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/handoff/START-HERE.md).

## Mandatory first steps
1. Fetch live PR #111, PR #108, branch HEAD, and Actions status. Do not rely on SHAs or statuses in old chat messages.
2. Read `docs/admin-ui-reference/handoff/current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, and `PR-111-SCOPE-AUDIT.md` from the current ADMIN branch.
3. Inspect Preview workflow [#39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604). Overall workflow failed because local Playwright timed out waiting for `[data-action="retry-customers"]` at `tests/e2e/admin-static-baseline.spec.js:1940`; deployed Preview diagnostic step itself passed. Inspect [artifact 12437154740](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604/artifacts/12437154740) before editing. Older run [#39802525217](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39802525217) is CANCELLED.
4. Continue real work after a brief Vietnamese checkpoint; do not stop after reporting. Do not rerun tests that already passed on identical code unless a concrete reason exists.
5. After each meaningful checkpoint, synchronize current-status.json, latest-test-results.json, LATEST-STATUS.md, START-HERE.md, PROMPT-COMPLETENESS-AUDIT.md and this prompt; reread them and verify links/statuses agree.

## Current checkpoint
- Repository: `chichute5500/Sindarealest-admin`
- Only writable branch: `feature/admin-isolated-handoff-2026-10-20`
- PR #111 OPEN/unmerged; PR #108 OPEN/unmerged and read-only. Fetch live states/heads.
- Previously observed branch HEAD before handoff-only commits: `4d6dab2f56d4dec53955c300e8ea477062fd2587`; fetch live HEAD because subsequent documentation commits advanced it.
- Product/code-test SHA: `326526f8f74172ae0aea7fa37739c9a8e8f513ec`.
- Source CI [#39804852564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852564): SUCCESS on code-test SHA.
- Preview [#39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604): COMPLETED FAILURE; inspect logs/artifacts.
- Progress: 50% PROVISIONAL; docs-only commits do not raise it.
- Screens #1–#12 remain PARTIAL_NOT_ACCEPTED until exact evidence supports acceptance. Prioritize #8–#12 and PR provenance audit.

## Guardrails
- Only write ADMIN branch. Keep #111/#108 open and unmerged. No main/static edits or Production deploy.
- No Cloudflare Access bypass, secret access/exposure, or remote D1/R2/setup/migration operations.
- No invented business data or unapproved API contracts. Never claim PASS without exact-SHA evidence.
