# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub. Do not ask the user to repeat history. Read this prompt and `docs/admin-ui-reference/handoff/START-HERE.md`, then verify live state before relying on the checkpoint.

## Latest checkpoint — 2026-10-24 08:53 ICT

- **Writable branch at checkpoint start:** `feature/admin-isolated-handoff-2026-10-20`, HEAD `3ba0005ea3f896a06ac573f32f975d231d081835`. Validate [#5552](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40051237976) **SUCCESS on that exact SHA**. The run's `validate` job completed successfully.
- **Live `main`:** `227622d3e3b7c75724ffa1775b193da71089269a`. Compared with the previous PR base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`, `main` is one commit ahead, adding `.github/workflows/deploy-admin-feature-preview.yml`. PR #111 and #108 still report the older base SHA; do not sync, merge, rebase, or update those branches.
- **Latest source/test SHA:** `0c441375a212c73ce56f16d4f9673e44c1b8260f`; Validate [#5540](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413343) **SUCCESS on that exact SHA**.
- **Preview #493:** [run](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302) ended **FAILURE only at the exact-HEAD guard**, after the source/test and screenshot checks had completed; the log says the feature branch moved during capture. [Artifact #493](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302/artifacts/12543031534) was downloaded and inspected: 133 PNG files including the approved reference image, 132 screenshot captures, 120 synthetic-fixture capture entries, and 112 fixture metrics; no horizontal overflow, source page/console/request/HTTP errors, fixture page/API errors, attempted writes, or unexpected API paths. Seven console HTTP 503 entries are deliberately simulated retry fixtures. The remote diagnostic reports only `PASS_LOGIN_CSS_SIGNATURE` and 7/7 authenticated read-only Admin GET routes; this is not a Preview exact-HEAD PASS, exact reference parity, business-write QA, or persistence acceptance.
- **UI/reference stream:** Compared artifact #493 Screens 4 (Product Editor), 5 (Product Gallery), and 7 (Order Detail) at 390×844 light against the approved composite. Differences visible in fixture data/images are not sufficient evidence of a source defect; no new CSS/source patch was made. Do not repeat Screen 9/12 work without new evidence.
- **Source/test and API/security streams:** Static review of protected Admin handlers, session middleware, method handlers and relevant regression tests found no missing `requireAdmin` call in the protected handlers inspected. Login/logout are intentional exceptions. No live mutation or business-data write was performed. This static pass is not authenticated business-flow acceptance.
- **PR state:** #111 OPEN/unmerged (head `3ba0005ea3f896a06ac573f32f975d231d081835`); #108 OPEN/unmerged/read-only; #112 OPEN/unmerged/draft. Keep all three open and unchanged.
- **Acceptance/progress unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; authenticated backend/business QA `NOT_TESTED` (read-only GET diagnostics only); remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`; overall progress **50% PROVISIONAL**.
- **Next:** refresh live HEAD/main/PR/Actions after this handoff-only commit and confirm its Validate run. Continue A–E in parallel. A docs-only commit must not be treated as a Preview trigger; do not create dummy source commits or weaken the exact-HEAD guard. Change source only after a concrete defect is reproduced and a regression test fails first.
## Mandatory seven operating rules

1. Work in parallel: run independent safe workstreams concurrently; one blocked stream must not stall the others.
2. Report and continue: a progress report is not a stopping point; resume safe independent work after reporting.
3. Blocked means switch streams: state blocker and evidence; do not repeat an action without new evidence.
4. Test first: fix only a concrete reproducible regression. Add/adjust a regression test and show it fails for the relevant reason before source fix.
5. Exact evidence only: tie claims to exact SHA, Actions, Preview and inspected artifact. Never apply an older SHA PASS to current HEAD. Distinguish fixtures from authenticated backend evidence.
6. Stop only for genuine owner action: stop only when account/device access, an owner decision or authorized action is required. Do not ask the user to hunt for a nonexistent “Run workflow” button.
7. Preserve isolation: no merge/rebase/cherry-pick/force-push/sync; no Production deploy; no Access/secrets/DNS changes or bypass; no remote D1/R2/schema/ledger/business writes; no migration/seed/import/setup scripts; do not modify main, storefront branches, PR #108 or #112. Keep PR #111 open.

## Parallel workstreams

- A — UI/reference: continue reference-driven audit of unaccepted screens, starting with Screens 4/5/7 only if a specific mismatch is demonstrated. Do not repeat verified Screen 12 or Screen 9 fixture work without new evidence.
- B — Regression/source: inspect an independent source/test area for a concrete defect. Reproduce test-first; avoid speculative CSS/business logic.
- C — API safety: static/read-only audit of Admin endpoints and route contracts. Never invoke destructive endpoints or write data.
- D — CI/Preview: inspect exact run status/logs while other streams continue. Preview watches `public/admin/**`, `functions/**`, `migrations/**`, `scripts/**`, `tests/**`, `package.json`, and its own workflow. Docs-only commits do not trigger Preview. Do not weaken the exact-HEAD guard or create dummy source commits.
- E — handoff/integrity: keep all six canonical handoff files current, preserve all seven rules, and verify entry-point/prompt links.

## Required next steps

1. Refresh branch HEAD, main, PR #111/#108/#112 and Actions before making claims.
2. Inspect latest exact-SHA Validate jobs and latest available Preview run/artifact. If no Preview exists for current source/test SHA, state that clearly and continue independent work.
3. Keep source/test and docs checkpoints separate. Do not make a docs-only commit while Preview exact-HEAD guard is running.
4. For a source fix, show test failure first, then fix; push only to allowed branch and inspect exact-SHA Validate/Preview evidence.
5. Update handoff after a meaningful verified checkpoint, then refresh live refs again.

## Canonical handoff files

- `docs/admin-ui-reference/handoff/START-HERE.md`
- `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`
- `docs/admin-ui-reference/handoff/LATEST-STATUS.md`
- `docs/admin-ui-reference/handoff/current-status.json`
- `docs/admin-ui-reference/handoff/latest-test-results.json`
- `docs/admin-ui-reference/handoff/12-SCREEN-REFERENCE-AUDIT.md`

Do not upgrade acceptance based on fixture screenshots/source validation alone. Exact reference parity NOT_VERIFIED; authenticated business/backend QA NOT_TESTED; remote D1 NOT_VERIFIED; Production NOT_PERFORMED. Keep progress at 50% PROVISIONAL until evidence supports revision.
