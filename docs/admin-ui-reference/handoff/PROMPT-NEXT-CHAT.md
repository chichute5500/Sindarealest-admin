# PROMPT NEXT CHAT — SINDAREALEST ADMIN

## LIVE VERIFIED CHECKPOINT — 2026-10-24T15:09:54.221Z

- **Exact tested branch/source SHA:** `dbc951c213c7da453ed3410f91d8eb712c0bc89e`. Validate push [#40104728038](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728038) PASS; isolated Admin Preview Playwright push [#40104728057](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728057) PASS (3 read-only Playwright checks); source/fixture Preview diagnostic push [#40104728097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728097) PASS. Three parallel PR checks on this same SHA also PASS. All six GitHub checks PASS; no Cloudflare Pages deploy check was in that check set.
- **Deployment provenance — BLOCKING MISMATCH, not accepted:** read-only Cloudflare Pages API response during #40104728057 reported the isolated Preview branch alias deployment `d6fe9eb8-0447-4c9f-8aa6-1ae7cd1b1183`, created `2026-10-23T16:36:25.612Z`, with source SHA `863b2d5b0a3f7d92b9b66587980f995184deb2e5`, **not** `dbc951c213c7da453ed3410f91d8eb712c0bc89e`. GitHub compare confirms the reported deployed SHA is an ancestor **226 commits behind** this tested HEAD. Status `REPORTED_SHA_MISMATCH`: Cloudflare-reported metadata only, not an independent served-byte integrity hash. **Do not treat an authenticated URL PASS as latest-code deployment acceptance.** No deployment was performed here. Any new isolated Preview deployment needs explicit owner authorization.
- **Latest exact-SHA visual fixture artifact:** [diagnostic #546, artifact 12563399560](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728097/artifacts/12563399560) from `dbc951c213c7da453ed3410f91d8eb712c0bc89e`: 16 local login screenshots, 120 synthetic fixture screenshot entries, 112 layout metrics, 0 horizontal overflow, 0 fixture backend writes, 0 unexpected API paths, 0 fixture API errors and 0 page errors. Seven fixture console records are expected simulated retry/503 paths. Approved montage exists in the artifact, but **real same-data 12-screen reference parity remains NOT_VERIFIED**.
- **Authenticated Preview GET-only scope:** 7/7 Admin GET routes HTTP 200, catalog 235 records and 527 decoded persisted relative image URLs; orders/customers/warranties/audit feed arrays empty. This is **GET-only**, not authenticated business-write or persistence QA. No remote D1 schema/ledger verification.
- **PR boundaries:** PR #111 OPEN/unmerged, `mergeable_state=clean`; #108 read-only and #112 OPEN/DRAFT untouched. New isolated Playwright workflow path removes the previous add/add conflict with `main`. Never merge/rebase/cherry-pick/force-push or alter storefront, Production, secrets or Cloudflare Access/DNS.
- **Acceptance unchanged:** **50% PROVISIONAL**; all 12 screens **PARTIAL_NOT_ACCEPTED**; approved-reference parity **NOT_VERIFIED**; authenticated business-write/persistence **NOT_TESTED**; remote Preview D1 schema/ledger **NOT_VERIFIED**; Production **NOT_PERFORMED**. The immediate owner-dependent action is explicit approval for an isolated *non-production* Preview deployment if the owner wants latest-code Preview provenance and subsequent real-site acceptance. Do not deploy without that authorization.


Canonical entry point: [START-HERE.md](START-HERE.md). Latest docs-only HEAD `c63def3bffa9c2ab0593aaa2afe3b8e174351fcc` failed Validate #5814 (tests/handoff-integrity.test.mjs:68) because this link was absent; last tested app SHA is `c0c649022e0459c7d23f20ed46f9d750c52892d8` (Validate #5808, read-only Preview #1127 both PASS). Deployed Preview provenance remains NOT_VERIFIED; all 12 screens PARTIAL_NOT_ACCEPTED, progress 50% PROVISIONAL.

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
