## Live checkpoint — 2026-10-24 03:35 UTC

- **Current source/test HEAD:** `83e5c865e756a9df87c877380d4c506ae85ed8e5` on `feature/admin-isolated-handoff-2026-10-20`; PR #111 is OPEN/unmerged and points to this exact SHA.
- **Validate #5579: PASS** on exact SHA `83e5c865e756a9df87c877380d4c506ae85ed8e5`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682257
- **Admin Preview #503: PASS** on the same exact SHA; exact-HEAD guard passed: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682268. Artifact #503 (133 PNGs; expires 2026-11-07): https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682268/artifacts/12546093261
- **Screen 7 regression resolved:** Preview #502 reproduced the timeline overlapping the fixed action row at 390×844 (timeline bottom 715.64px; action row top 710px). The fix compacted the timeline spacing. Preview #503 now passes the Playwright matrix; the captured 390×844 screenshot shows Timeline above the fixed action row with spacing, and metadata reports 0 page errors, 0 console errors, 0 failed requests and 0 HTTP errors.
- **Fixture boundary:** the screenshot matrix uses synthetic UI-ONLY fixture data and blocks non-GET requests. It proves local rendering/regression behavior, not authenticated business writes, real customer data, remote D1 schema/ledger state or Production behavior. The deployed diagnostic only verifies the login CSS signature.
- **Live refs:** `main` = `227622d3e3b7c75724ffa1775b193da71089269a`; PR #111 OPEN/unmerged at `83e5c865e756a9df87c877380d4c506ae85ed8e5`; PR #108 OPEN/unmerged/read-only at `9cdcdfc5096e6b5efd2e5f4c74520f8c8d6049a0`; PR #112 OPEN/unmerged/draft at `87b794996aa9be065fb27616de4b1b1e69e8e94e`.
- **Progress and acceptance unchanged:** 50% PROVISIONAL; all 12 screens `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

### Continue next
1. Refresh branch HEAD, PR #111/#108/#112 and Actions after this docs-only handoff commit; the source/test Preview evidence above belongs only to `83e5c865e756a9df87c877380d4c506ae85ed8e5`.
2. Continue the remaining reference-driven screen audit. Patch only a concrete reproduced mismatch, add a regression test first, then Validate and Preview the exact same source/test SHA.
3. Continue independent read-only order/payment invariants and CI/security audits; do not repeat the completed broad admin-route auth scan without new evidence.
4. Authenticated business workflows still require an authorized Preview path. Never bypass Cloudflare Access or change secrets; continue safe fixture/static checks if access is unavailable.

### Seven mandatory rules and safety boundaries
1. Parallelize independent safe workstreams; one blocker must not stop the others.
2. Report verified progress, then continue working; do not stop after reporting.
3. State blockers with evidence and switch streams; do not repeat an action without new evidence.
4. Test-first: reproduce a concrete bug, add a failing regression test, then patch.
5. Tie every result to its exact SHA; distinguish synthetic fixtures from authenticated backend evidence.
6. Stop only for a genuine owner action; do not ask about nonexistent “Run workflow” controls.
7. Preserve isolation: write only to `feature/admin-isolated-handoff-2026-10-20`; no merge/rebase/cherry-pick/force-push; no Production deploy; no Cloudflare Access/secrets/DNS changes or bypass; no remote D1/R2/schema/ledger/business writes or migration/seed/import/setup scripts; do not modify `main`, storefront branches, PR #108 or #112; keep PR #111 open/unmerged; never weaken exact-HEAD guard or create dummy source commits.

---

## Live handoff checkpoint — 2026-10-24 02:35 UTC

- **Verified writable branch HEAD:** `badbdf091b0fdf716a5f64a74e626694147ba95e` on `feature/admin-isolated-handoff-2026-10-20`. Live branch and PR #111 head matched at checkpoint.
- **Latest Validate #5567: SUCCESS on exact HEAD** `badbdf091b0fdf716a5f64a74e626694147ba95e`; workflow [run #5567](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40054728143). All steps passed, including dependency audit, project integrity and automated tests. This is a docs-only commit; it does not replace source/test Preview evidence.
- **Latest source/test SHA:** `ab0343f963f0f113dc6c88a601c5499ebe15d592`. Validate [#5565](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201672) and Admin Preview [#498](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201632) both SUCCESS on that exact SHA; Preview exact-HEAD guard passed. Artifact [#498](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201632/artifacts/12544236677) was inspected: Product Editor and Product Gallery mobile footer labels show compact `Xóa`, `Hủy`, `Lưu`; no obvious horizontal overflow at 390×844.
- **Latest documentation sync:** this checkpoint updates all six canonical handoff files. Preserve the distinction between current docs HEAD `badbdf091b0fdf716a5f64a74e626694147ba95e` and Preview-verified source/test SHA `ab0343f...`.
- **Live refs:** `main` = `227622d3e3b7c75724ffa1775b193da71089269a`; PR #111 OPEN/unmerged at current branch HEAD; PR #108 OPEN/unmerged/read-only; PR #112 OPEN/unmerged/draft. No merges, deployments, or writes to protected branches.
- **Progress:** 50% PROVISIONAL. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; authenticated backend/business write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

### Next chat — start here, then continue without waiting
1. Recheck live branch HEAD, `main`, PR #111/#108/#112, and latest Actions before using this snapshot.
2. Keep work on independent safe workstreams in parallel. Continue reference-driven comparison of remaining screen elements, using artifact #498 and approved reference assets; only change source after reproducing a concrete mismatch and adding a failing regression test first.
3. Inspect the newest exact-SHA evidence before making any claim. Docs-only SHA `badbdf091b0fdf716a5f64a74e626694147ba95e` has Validate #5567 PASS; Preview evidence applies to source/test SHA `ab0343f...`, not the docs SHA.
4. Continue read-only security/route/test audits where independent; do not repeat already-completed B1 cleanup/provenance or the footer-label fix without new evidence.
5. If authenticated Preview access is unavailable, record the exact limitation and keep moving on safe fixture/source/reference work. Never ask the owner to bypass Access or change secrets. Stop for owner action only when the next necessary step genuinely requires their account interaction.

### Seven mandatory operating rules
1. Parallelize independent safe workstreams; one blocked stream must not stop others.
2. Report verified progress and then continue working; do not stop after reporting.
3. When blocked, state cause/evidence and switch streams; do not repeat the same action without new evidence.
4. Test first: reproduce a concrete bug, add a regression test, observe failure, then patch source.
5. Tie evidence to exact SHA; never transfer PASS from an old SHA to a new HEAD, and distinguish synthetic fixtures from authenticated backend evidence.
6. Stop only when a real owner action is required; do not ask about nonexistent UI controls or “Run workflow”.
7. Preserve all isolation and safety boundaries below.

### Non-negotiable safety boundaries
- Write only to `feature/admin-isolated-handoff-2026-10-20`; use expected-SHA/fast-forward updates only.
- Never merge/rebase/cherry-pick/force-push/sync PRs; never deploy Production.
- Do not alter Cloudflare Access, secrets, DNS, or bypass Access.
- Do not write remote D1/R2/schema/payment ledger/business data; do not run migration, seed, import, or setup scripts.
- Do not modify `main`, storefront branches, PR #108 or PR #112; keep PR #111 OPEN/unmerged.
- Never weaken the exact-HEAD guard or create dummy source commits to trigger Preview.

---

# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub. Do not ask the user to repeat history. Read this prompt and `docs/admin-ui-reference/handoff/START-HERE.md`, then verify live state before relying on the checkpoint.

## Latest checkpoint — 2026-10-24 09:20 ICT

- **Writable branch / exact current source HEAD:** `feature/admin-isolated-handoff-2026-10-20`, `ab0343f963f0f113dc6c88a601c5499ebe15d592`.
- **Validate #5565:** [SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201672) on exact SHA `ab0343f963f0f113dc6c88a601c5499ebe15d592`.
- **Preview #498:** [SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201632) on the same exact SHA. Exact-HEAD guard logged tested SHA = current branch SHA. Artifact [#498](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40053201632/artifacts/12544236677) is available and was downloaded/inspected.
- **Latest UI correction:** reproduced compact footer-label mismatch on predecessor SHA `36306c83d70f1b4b0636360f205245e2f335a61e` (expected visible “Xóa”, received “Xóa sản phẩm”). Fixed `public/admin/index.html` to display “Xóa” / “Lưu”, retain descriptive accessible names, and announce “Đang lưu sản phẩm” during save. Added static contract assertions in `tests/admin-liquid-glass-contract.test.mjs`. Preview #498 screenshot at 390×844 shows compact footer controls without horizontal overflow.
- **Preview read-only evidence:** authenticated Admin GET route contract checks passed 7/7 with HTTP 200; catalog response contained 235 products and image decode check passed. `nonReadOnlyRequests: []`. No business write, persistence acceptance, remote schema/ledger validation, or Production action was performed. These GET checks do not establish exact approved-reference parity.
- **Current live main:** `227622d3e3b7c75724ffa1775b193da71089269a`. PR #111 remains OPEN/unmerged with head `ab0343f963f0f113dc6c88a601c5499ebe15d592`; PR #108 remains OPEN/unmerged; PR #112 remains OPEN/unmerged/draft. No PR state or base branch was changed.
- **Acceptance remains:** 12 screens `PARTIAL_NOT_ACCEPTED`; exact visual parity `NOT_VERIFIED`; authenticated backend/business write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`; progress **50% PROVISIONAL**.
- **Next:** this handoff-only commit will not trigger Preview by path filter. Verify Validate on the new docs HEAD, keep the source/test HEAD above as the latest Preview-verified SHA, then continue A–E independently. Do not create dummy source commits or weaken exact-HEAD guard.

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
