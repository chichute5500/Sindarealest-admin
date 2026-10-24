# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue the project directly in GitHub repository `chichute5500/Sindarealest-admin`. Read this prompt, then verify the live GitHub branch, PR, and Actions state before acting. Do not ask the user to paste history or repeat the prompt. Do not stop after reporting; continue with the next useful safe workstream unless an actual owner-only action is required.

## Live checkpoint — 2026-10-24 12:35 UTC

- Writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- Exact code/test SHA for the latest isolated Admin Preview test: `c0c649022e0459c7d23f20ed46f9d750c52892d8`.
- Validate #5808 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657792
- Isolated Admin Preview Playwright #1127 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657775
- Failed predecessor #1126 (missing `@playwright/test`) was corrected by installing the runner explicitly. Run #1127 passed; this is not an active blocker.
- #1127 checks are read-only and end with an exact feature-branch HEAD guard. They do not deploy.
- **Deployment provenance remains unverified:** the workflow tests `https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/`, but does not establish that the deployed files correspond to `c0c649022e0459c7d23f20ed46f9d750c52892d8`.
- PR #111 OPEN/unmerged, head `c0c649022e0459c7d23f20ed46f9d750c52892d8`, 496 changed files, +46,507 / -224 according to live PR metadata. Keep it open/unmerged. PR #108 read-only. PR #112 open/draft and untouched. Refresh all refs before further writes because API metadata can lag.

## Current acceptance status

- Progress **50% PROVISIONAL**; do not increase without material evidence.
- All 12 screens **PARTIAL_NOT_ACCEPTED**.
- Approved-reference parity **NOT_VERIFIED**.
- Authenticated business-write/persistence QA **NOT_TESTED**.
- Remote Preview D1 schema/ledger **NOT_VERIFIED**.
- Deployed Preview source SHA provenance **NOT_VERIFIED**.
- Production **NOT_PERFORMED**.
- #1127 performed read-only checks; no real business writes were performed.

## Immediate work queue

1. Refresh live branch HEAD, PR #111/#108/#112 state, and latest Actions. Distinguish current branch HEAD from the SHA actually tested and from any docs-only child commit.
2. Inspect #1127's workflow, Playwright spec, logs and artifact. Look for an existing reliable, non-mutating build identifier or deterministic asset provenance mechanism. Do not invent evidence, deploy, alter Cloudflare configuration, or equate a passing URL check with deployment SHA proof.
3. Continue reference-driven acceptance for the 12 Admin screens. Use existing approved reference material and exact-SHA artifacts; fix only concrete reproducible defects using test-first workflow.
4. Keep synthetic fixture checks and GET-only diagnostics explicitly separate from authenticated write/persistence acceptance. Never write to business data just to make tests pass.
5. After each meaningful evidence-backed stage, synchronize the canonical handoff files. Keep progress at 50% until acceptance criteria are genuinely met.

## Mandatory seven operating rules — follow exactly

1. **Parallel work:** split independent, safe investigations/tests into concurrent workstreams when possible; avoid conflicting edits.
2. **Report then continue:** provide a concise evidence-backed report, then immediately continue work. Do not stop because a report was sent.
3. **Blocker handling:** record the exact error/log/SHA, switch to another useful independent task, and do not loop retries without new evidence.
4. **Test-first:** reproduce a concrete bug, add a regression test that fails for the defect, patch, and rerun the relevant tests.
5. **Exact SHA and evidence:** tie each result to exact commit SHA and workflow link. Clearly label fixture-only, GET-only, authenticated business-write, persistence, reference-parity, and deployment-provenance evidence.
6. **Owner action only:** stop/ask only when a real account-owner action is required. Do not ask for a nonexistent “Run workflow” button. No deployment unless the owner explicitly asks.
7. **Isolation and no unsafe writes:** only write to the designated feature branch; preserve PR and production boundaries below.

## Hard guardrails

- Only write to `feature/admin-isolated-handoff-2026-10-20`, and use expected-SHA guarded branch updates. Refresh the branch ref immediately before writing and reject/reconcile a stale expected SHA.
- Every handoff/documentation commit message starts with `[CF-Pages-Skip]`. Verify Actions checks after the commit and stop to investigate if an unexpected Cloudflare Pages deploy check appears.
- PR #111 must remain OPEN/unmerged. PR #108 is read-only; PR #112 must remain untouched/open draft. Do not modify `main`, storefront code, or other branches.
- No merge/rebase/cherry-pick/force-push; no Production deploy; no isolated Preview deploy without explicit owner authorization.
- No remote D1/R2/schema/migration/ledger writes, no secrets changes, no Cloudflare Access/DNS changes, no Access bypass, no setup/deploy scripts that mutate remote systems, and no fake commits.
- Do not fabricate business records, source-SHA provenance, screenshot parity, or QA results.

## Links

- Repository: https://github.com/chichute5500/Sindarealest-admin
- Isolated Admin Preview: https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/
- Validate #5808: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657792
- Admin Preview #1127: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657775
- PR #111: https://github.com/chichute5500/Sindarealest-admin/pull/111
