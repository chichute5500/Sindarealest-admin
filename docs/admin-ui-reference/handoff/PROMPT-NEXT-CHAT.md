# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub. Do not ask the user to repeat history. Read this prompt and `docs/admin-ui-reference/handoff/START-HERE.md`, then verify live state before relying on the checkpoint.

## Latest checkpoint — 2026-10-24 08:39 ICT

- Writable branch `feature/admin-isolated-handoff-2026-10-20`, HEAD at checkpoint start `381065514663a2c57a9d6d6ca95880b835894bdc`; `main` remains `227622d3e3b7c75724ffa1775b193da71089269a`. This is a docs-only handoff update; refresh live refs after it.
- Validate #5551 **SUCCESS on exact docs HEAD**: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40051041487 (`381065514663a2c57a9d6d6ca95880b835894bdc`).
- Latest source/test SHA `0c441375a212c73ce56f16d4f9673e44c1b8260f`; Validate #5540 **SUCCESS** on that exact SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413343.
- Preview #493 on that source/test SHA **FAILED at the exact-HEAD guard** because the branch moved during capture; do not call it PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302. Artifact #493 inspected: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302/artifacts/12543031534 — 133 PNGs, 120 synthetic fixture capture entries, 112 metrics; zero horizontal overflow, source page/console/request/HTTP errors, fixture page/API errors, attempted writes or unexpected API paths; seven expected simulated fixture HTTP 503 console entries. Read-only diagnostics passed 7/7 Admin GET routes; catalog check saw 235 products / 527 decoded image URLs. This is not authenticated business-write/persistence acceptance or exact-reference parity.
- Previous Preview #490 succeeded on older SHA `739b862ebbf3f74d0bfee7cc9025cc0a632a9f7f`; it does not validate the newer source/test SHA.
- PR #111 OPEN/unmerged; #108 OPEN/unmerged/read-only; #112 OPEN/unmerged/draft. Keep them open. All 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend/business QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`; progress 50% PROVISIONAL.
- Next: refresh live HEAD/Actions after this docs-only sync, then continue parallel safe reference audit, test-first regression review, and static API audit. Docs-only commits do not trigger Preview; do not create dummy source/test commits or weaken the exact-HEAD guard.
- Safety: no merge/rebase/cherry-pick/force-push/sync; no Production deploy; no Access/secrets/DNS changes or bypass; no remote D1/R2/schema/ledger/business writes; no migration/seed/import/setup scripts; do not modify `main`, storefront branches, PR #108 or #112.

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
