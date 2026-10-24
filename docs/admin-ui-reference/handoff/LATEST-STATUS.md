# LATEST STATUS — SINDAREALEST ADMIN

## POST-DEPLOY VERIFIED CHECKPOINT — 2026-10-24T15:31:44.461Z

- **Owner-approved isolated Admin Preview deployment succeeded.** Approved source SHA: `564ea556e6dee745eaaa491ee033a2a8cfbb595c`. [Deployment workflow run #40106880423](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40106880423) PASS; exact project `sindarealest-admin-preview`, branch `feature-admin-isolated-handoff-2026-10-20`, alias `https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/`. This was **Preview only**, not production.
- **Independent post-deploy Cloudflare API metadata matched approved SHA.** [Read-only post-deployment QA run #40107164294](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40107164294) PASS; `REPORTED_SHA_MATCH` with `expectedSha=564ea556e6dee745eaaa491ee033a2a8cfbb595c` and `observedSha=564ea556e6dee745eaaa491ee033a2a8cfbb595c`, deployment ID `7a8c3d73-c348-4adf-8560-cb90bcac19a8` created `2026-10-24T15:26:05.106Z`. Artifact [12565002920](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40107164294/artifacts/12565002920) records sanitized metadata and Playwright report. **Evidence scope:** Cloudflare's deployment metadata, not an independent byte-level digest of served assets.
- **Authenticated read-only browser QA after deploy:** Playwright 3/3 PASS; 7/7 Admin GET API routes HTTP 200; 235 products, 527 persisted relative image URLs decoded; no product mutation requests or non-read-only Admin requests; orders/customers/warranties/audit feed arrays empty. This is **GET-only**, not authenticated business-write persistence testing.
- **Source equivalence:** GitHub comparison of deployed SHA `564ea556e6dee745eaaa491ee033a2a8cfbb595c` to latest pre-handoff feature SHA `a3a75b6302e0d960f5e61ebd2ed2b00754ba30d2` shows only two temporary `.github/workflows/` files added, no `public/`, `functions/` or application changes. The temporary one-shot deploy/QA workflows are removed by the next documentation cleanup commit. No further deployment is authorized implicitly by this cleanup.
- **Acceptance boundary unchanged:** progress **50% PROVISIONAL**, 12 screens **PARTIAL_NOT_ACCEPTED**, approved-reference visual parity **NOT_VERIFIED**, authenticated business-write/persistence **NOT_TESTED**, remote Preview D1 schema/ledger **NOT_VERIFIED**, Production **NOT_PERFORMED**. PR #111 stays OPEN/unmerged; PR #108 read-only; PR #112 OPEN/DRAFT untouched. No merge/rebase/cherry-pick/force-push, Cloudflare config or secrets changes, or D1/R2 business writes.


## LIVE VERIFIED CHECKPOINT — 2026-10-24T15:09:54.221Z

- **Exact tested branch/source SHA:** `dbc951c213c7da453ed3410f91d8eb712c0bc89e`. Validate push [#40104728038](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728038) PASS; isolated Admin Preview Playwright push [#40104728057](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728057) PASS (3 read-only Playwright checks); source/fixture Preview diagnostic push [#40104728097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728097) PASS. Three parallel PR checks on this same SHA also PASS. All six GitHub checks PASS; no Cloudflare Pages deploy check was in that check set.
- **Deployment provenance — BLOCKING MISMATCH, not accepted:** read-only Cloudflare Pages API response during #40104728057 reported the isolated Preview branch alias deployment `d6fe9eb8-0447-4c9f-8aa6-1ae7cd1b1183`, created `2026-10-23T16:36:25.612Z`, with source SHA `863b2d5b0a3f7d92b9b66587980f995184deb2e5`, **not** `dbc951c213c7da453ed3410f91d8eb712c0bc89e`. GitHub compare confirms the reported deployed SHA is an ancestor **226 commits behind** this tested HEAD. Status `REPORTED_SHA_MISMATCH`: Cloudflare-reported metadata only, not an independent served-byte integrity hash. **Do not treat an authenticated URL PASS as latest-code deployment acceptance.** No deployment was performed here. Any new isolated Preview deployment needs explicit owner authorization.
- **Latest exact-SHA visual fixture artifact:** [diagnostic #546, artifact 12563399560](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40104728097/artifacts/12563399560) from `dbc951c213c7da453ed3410f91d8eb712c0bc89e`: 16 local login screenshots, 120 synthetic fixture screenshot entries, 112 layout metrics, 0 horizontal overflow, 0 fixture backend writes, 0 unexpected API paths, 0 fixture API errors and 0 page errors. Seven fixture console records are expected simulated retry/503 paths. Approved montage exists in the artifact, but **real same-data 12-screen reference parity remains NOT_VERIFIED**.
- **Authenticated Preview GET-only scope:** 7/7 Admin GET routes HTTP 200, catalog 235 records and 527 decoded persisted relative image URLs; orders/customers/warranties/audit feed arrays empty. This is **GET-only**, not authenticated business-write or persistence QA. No remote D1 schema/ledger verification.
- **PR boundaries:** PR #111 OPEN/unmerged, `mergeable_state=clean`; #108 read-only and #112 OPEN/DRAFT untouched. New isolated Playwright workflow path removes the previous add/add conflict with `main`. Never merge/rebase/cherry-pick/force-push or alter storefront, Production, secrets or Cloudflare Access/DNS.
- **Acceptance unchanged:** **50% PROVISIONAL**; all 12 screens **PARTIAL_NOT_ACCEPTED**; approved-reference parity **NOT_VERIFIED**; authenticated business-write/persistence **NOT_TESTED**; remote Preview D1 schema/ledger **NOT_VERIFIED**; Production **NOT_PERFORMED**. The immediate owner-dependent action is explicit approval for an isolated *non-production* Preview deployment if the owner wants latest-code Preview provenance and subsequent real-site acceptance. Do not deploy without that authorization.


**Updated:** 2026-10-24T12:35:00Z UTC  
**Branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Code/test SHA:** `c0c649022e0459c7d23f20ed46f9d750c52892d8`  
**PR #111:** OPEN / unmerged

## Latest evidence

| Check | Result | Exact SHA / link |
|---|---|---|
| Validate source and tests | PASS | `c0c649022e0459c7d23f20ed46f9d750c52892d8` — [#5808](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657792) |
| Isolated Admin Preview Playwright, read-only | PASS | `c0c649022e0459c7d23f20ed46f9d750c52892d8` — [#1127](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40093657775) |
| Earlier Preview runner setup | Failed, resolved | [#1126](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40091858514) failed because `@playwright/test` was missing; explicit installation added and #1127 passed |

#1127 passed repository/branch guard, dependency install, source validation, regression tests, Playwright runner and Chromium installation, read-only isolated Preview tests, final branch SHA guard and evidence upload. The companion Validate workflow passed on the same SHA.

## Explicit limitations

- Passing Preview URL check **does not prove deployment source SHA**; deployed-source provenance is NOT_VERIFIED.
- All 12 screens remain **PARTIAL_NOT_ACCEPTED**.
- Approved-reference parity: **NOT_VERIFIED**.
- Authenticated business-write/persistence QA: **NOT_TESTED**.
- Remote Preview D1 schema/ledger: **NOT_VERIFIED**.
- Production deployment: **NOT_PERFORMED**.
- #1127 was read-only; it did not perform real business writes.

## Progress

**50% PROVISIONAL — unchanged.** Increase only when an acceptance criterion is completed with evidence tied to the exact tested SHA. Do not count historical screenshots or fixture-only results as live parity evidence.

## Next

1. Inspect #1127 logs/artifact and spec for a reliable non-mutating deployed-build identity check.
2. Continue approved-reference screen acceptance; test-first for reproducible defects.
3. Preserve branch isolation, update all handoff files after evidence-backed stages, and continue work after reporting.

## Guardrails

Only write to `feature/admin-isolated-handoff-2026-10-20`; PR #111 stays open/unmerged; PR #108 is read-only; PR #112 untouched. No merge/rebase/cherry-pick/force-push, no Production or unapproved Preview deploy, no remote D1/R2/schema/ledger writes or migrations, no secrets/Access/DNS changes, and no Access bypass. Commit messages must start with `[CF-Pages-Skip]`.

---

# POST-CI LIVE HANDOFF — 2026-10-24 10:41 UTC

**Verified code/test checkpoint:** `2f2c631c328d3658c0911a9066b39d0d513ff0b9` on `feature/admin-isolated-handoff-2026-10-20`. Live `main` ref is `227622d3e3b7c75724ffa1775b193da71089269a`. PR #111 is OPEN/unmerged, and its HEAD matches the feature branch. PR API currently reports base ref `main` with base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`, while the live `main` ref is `227622d3e3b7c75724ffa1775b193da71089269a`; comparing the commits shows `28c768ba26b1d9f7d40e14efac5112526ed1c8b3` is one commit behind `main`. Treat this as stale/inconsistent PR base metadata, not a verified main-ref change. Do not merge/rebase; refresh API state before any future PR-level decision.

## Exact-SHA validation

- Validate #5769 PASS on `2f2c631c328d3658c0911a9066b39d0d513ff0b9`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086638501
- Validate #5770 PASS on `2f2c631c328d3658c0911a9066b39d0d513ff0b9`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086641043
- Admin Preview Playwright #1114 PASS on `2f2c631c328d3658c0911a9066b39d0d513ff0b9`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086641087
- Read-only diagnostic #538 PASS on `2f2c631c328d3658c0911a9066b39d0d513ff0b9`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086638472
- Artifact `admin-preview-evidence-538`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086638472/artifacts/12556733771
- The diagnostic authenticated to the configured isolated Preview and made only GET requests: 7/7 admin endpoints returned HTTP 200, catalog 235 products, 527 persisted image URLs decoded, no product mutations, no non-read-only requests, and the exact feature-branch HEAD guard passed. Local Playwright source/fixture matrix passed. These results do **not** prove business-write persistence or full approved-reference parity.
- All current check-runs on this source/test SHA are PASS; the commit message starts with `[CF-Pages-Skip]` and the check set contains no Cloudflare Pages deployment check.

## Screen 7 refund UI — test-first finding and fix

- Regression-only commit `1708edf55395fc525e2ea37a386d49da5583f264` deliberately failed at the new contract assertion because Order Detail had no refund-recording action: Validate #5765 https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086054034. Diagnostic #536 stopped at the same failing test and did not execute Preview GET checks: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40086054024.
- The Order Detail payment disclosure now includes a form to **record an already-transferred refund** in the verified ledger. The UI explicitly warns that it does not send money. It requires a bank statement transaction reference, limits amount to remaining net verified receipts, rejects malformed/non-positive balances, requires explicit confirmation, and posts `direction: "refunded"` to the existing API.
- Fixture-only Playwright checks verify the refund form is disabled for an order with no receipts and enabled for `UI-ONLY-ORDER-3` (net receipts 7,800,000 VND). An over-limit fixture input is rejected locally with zero write requests. No actual refund, transaction, or business write was performed. Existing API atomic over-refund guard remains authoritative.
- Screen 7 remains `PARTIAL_NOT_ACCEPTED`: its controls passed automated fixture checks, but authenticated ledger mutation/persistence and approved-reference parity remain untested.

## Read-only workflow and visual review

- Concurrency review still finds no additional reproducible defect in QR request creation, receipt/refund ledger guards, order repricing/cancellation, warranty issuance, and claim-token consumption.
- Screen 5 source has a featured cover image and horizontally scrolling mobile thumbnail rail; artifact fixture appearance differs from the approved montage, but synthetic fixture data cannot prove live parity. Keep all 12 screens `PARTIAL_NOT_ACCEPTED`.
- The recorded unwanted Preview in Pages project `sindarealest2` was caused by commit `7f8d27895d61ded5e36f9358ad6f5ff830dd3e02` missing `[CF-Pages-Skip]`; the incident is preserved below. Follow-up commits use that prefix. No Cloudflare settings, DNS, Access, secrets or Production workflow were changed.

## Acceptance boundary — unchanged

- Progress: **50% PROVISIONAL**.
- All 12 screens: **PARTIAL_NOT_ACCEPTED**.
- Approved-reference parity: **NOT_VERIFIED**.
- Authenticated business-write/persistence QA: **NOT_TESTED**.
- Remote Preview D1 schema/ledger: **NOT_VERIFIED**.
- Production: **NOT_PERFORMED**.


## Operational finding — unintended primary-project Preview deploy

- On docs-only commit `7f8d27895d61ded5e36f9358ad6f5ff830dd3e02`, a GitHub check named **Cloudflare Pages** reported **Deployed successfully** and provided only Preview URLs: `https://48dbe193.sindarealest2.pages.dev` and branch alias `https://feature-admin-isolated-hando.sindarealest2.pages.dev`. Check detail/deployment ID: `48dbe193-503b-4926-ad56-73247acd7a8c`. This is a Preview deployment in Pages project `sindarealest2`, not the isolated project `sindarealest-admin-preview`; the check does not say Production and no Production workflow/configuration was invoked or changed.
- Cause identified in our workflow: the docs-only commit message omitted `[CF-Pages-Skip]`. A prior ADMIN commit `5ef5fa3d4867cd69a38df1805c91362e16fde335` had that prefix and its check-run set did not include a Cloudflare Pages deployment check; use `[CF-Pages-Skip]` at the start of future commit messages on this branch and verify checks after each commit.
- Do not change Cloudflare settings, Access, DNS or secrets to resolve this. This note records an unintended Preview side effect only; no Production deployment is reported. No `public/index.html` or shared storefront file was changed by the current handoff commits.


# LIVE HANDOFF UPDATE — 2026-10-24 10:00 UTC

**Verified source/test checkpoint:** branch `feature/admin-isolated-handoff-2026-10-20` was at `66bdd5e0ba5f41daa1de49c46f485e5042edb831` before this docs-only sync; PR #111 is OPEN/unmerged, live `main` ref is `227622d3e3b7c75724ffa1775b193da71089269a`. This commit updates handoff files only; refresh live branch/PR/Actions HEAD before the next operation.

- **QR-payment race fixed test-first.** Regression-only commit `de95760eafc4740ffb20a66b283b71b2c57290b7` made Validate #5756 fail precisely: payment-request creation returned HTTP 201 instead of expected 409 when QR/account settings rotated between preflight and write. Fix + test commit `66bdd5e0ba5f41daa1de49c46f485e5042edb831` adds atomic checks for active status, QR key, bank name, account number and account name at INSERT. Validate #5758 PASS and Admin Preview Playwright #1108 PASS on the exact same source/test SHA.
- **Read-only Preview diagnostic PASS on the same SHA:** [run #535](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565); [artifact admin-preview-evidence-535](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565/artifacts/12556296498). The workflow's exact-HEAD guard passed. Authenticated dashboard/product UI and 7/7 GET-only admin endpoints returned expected responses; catalog reported 235 products and all 527 stored image URLs decoded. No product mutation requests were sent. Orders, customers, warranties and audit-log arrays were empty.
- **Screenshot evidence:** artifact contains 16 source login captures (8 viewports × light/dark) and 120 synthetic UI-fixture screenshot entries (116 unique module captures), plus 112 UI fixture metrics and the approved mobile-reference collage. The source/login and fixture captures reported no horizontal overflow; the fixture browser recorded seven expected simulated HTTP 503 retry-path console entries, with zero page errors/API fixture errors and zero attempted writes/unexpected paths. This is source/fixture evidence, not authenticated end-to-end parity proof.
- **Reference comparison:** visually inspected the approved 12-screen montage and current source fixture contact sheet. The product-gallery fixture still uses synthetic placeholders/grid thumbnails versus the reference's image-led view and horizontal thumbnail rail; fixtures cannot establish actual live data presentation. Keep all 12 screens PARTIAL_NOT_ACCEPTED and parity NOT_VERIFIED.
- **Acceptance unchanged:** 50% PROVISIONAL; authenticated business-write/persistence QA NOT_TESTED; remote Preview D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED. No remote writes, migration, deploy, merge or PR base change occurred.

## Canonical handoff
Read `docs/admin-ui-reference/handoff/START-HERE.md` first, then `PROMPT-NEXT-CHAT.md`. Fetch live state before acting; source/test SHA and documentation-only branch HEAD must remain distinct.

---

# LIVE HANDOFF UPDATE — 2026-10-24 09:41 UTC

**Checkpoint semantics:** PR #111 HEAD at this checkpoint was `5f7a9d94858a02faaea003e2a9ea6386d507121f`, a documentation-only snapshot. The latest application/source-test SHA remains `cf340b686e0974ac5602b6ef4594c00e477c8932`; always refresh live PR metadata before further work.

- Validate #5688 PASS on application/source-test SHA `cf340b686e0974ac5602b6ef4594c00e477c8932`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623892
- Admin Preview Playwright #1077 PASS on that same application/source-test SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623888
- Handoff metadata correction: `handoffSync.entryPoint` and `handoffSync.nextChatPrompt` restored; Validate #5733 PASS and Admin Preview Playwright #1097 PASS on docs-only SHA `5f7a9d94858a02faaea003e2a9ea6386d507121f`.
- PR #111 remains OPEN/unmerged. Progress 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; reference parity NOT_VERIFIED; authenticated business-write QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
- Source change at `cf340b686e0974ac5602b6ef4594c00e477c8932`: order-item updates guard against pending QR payment requests during cancellation. Automated checks pass; business-write persistence and visual parity remain unproven.

---
# VERIFIED HANDOFF CHECKPOINT — 2026-10-24 09:00 UTC

**Repository:** `chichute5500/Sindarealest-admin`  
**Writable branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Latest verified branch HEAD:** `d5f4b06a28d0a682891580b5e646a3bc064fd68a` (documentation-only handoff sync)  
**Application/source-test SHA:** `0469930f6836d5f8d87b155a538e1d68776e3913`  
**Validate #5666:** PASS — [run 40080139131](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40080139131)  
**Admin Preview Playwright #1070:** PASS — [run 40080139090](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40080139090)  
**PR #111:** OPEN, unmerged; GitHub reports `mergeable=true`, `mergeable_state=clean`. Do not merge.

## What changed and is verified

1. QR upload partial-write risk fixed test-first: pending QR pointer and audit row are committed in one D1 batch; if persistence fails, cleanup removes only the newly staged random R2 object. Regression checks success/failure and preserves active QR.
2. Feature-only deploy workflow renamed to `.github/workflows/deploy-admin-isolated-preview.yml`; it remains pinned to `sindarealest-admin-preview` and the approved feature branch.
3. Feature-only E2E spec renamed to `tests/e2e/admin-isolated-preview.spec.js`; `.github/workflows/admin-preview-diagnostics.yml` invokes it. Shared `main` workflow/spec are untouched.
4. Earlier red CI runs were investigated. The “old file must not exist” assertions were invalid in the merged PR tree because `main`'s versions legitimately exist there. Those stale assertions were removed; current Validate and Preview Playwright pass.
5. PR #111 now reports clean/mergeable with no overlapping changed paths against the currently changed paths on `main`. The branch remains 7 commits behind and 1,675 ahead; do not rebase or merge under the project rules.

## Acceptance limits — do not inflate

- Progress remains **50% PROVISIONAL**.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; approved-reference parity `NOT_VERIFIED`.
- Authenticated business-write/persistence QA: `NOT_TESTED`.
- Remote Preview D1 schema/ledger: `NOT_VERIFIED`.
- Production: `NOT_PERFORMED`.
- Prior live read-only Preview evidence (older exact SHA) checked 7/7 Admin GET routes HTTP 200, 235 products and 527 image URLs decoded; do not attribute those older diagnostics to SHA `d5f4b06a28d0a682891580b5e646a3bc064fd68a` without a new diagnostic run.
- Unit tests, synthetic fixture screenshots, Playwright, and read-only GET checks are not proof of real business writes.

## Mandatory safety rules

- Write only to `feature/admin-isolated-handoff-2026-10-20`.
- PR #111 remains OPEN/unmerged. PR #108 and #112 are read-only.
- No merge/rebase/cherry-pick/force-push; no edits to `main` or storefront branches.
- No Production deployment, remote D1/R2 writes, migrations/schema/ledger changes, secrets, Cloudflare Access or DNS changes; never bypass Access.
- Test-first for source fixes; exact SHA for every result; separate local fixtures/read-only GETs from authenticated business-write QA.
- Parallelize independent safe work. Report verified outcomes and continue; stop only for actual user action. Do not ask for nonexistent “Run workflow” button.
- No fake commits to trigger Preview. Docs-only commits are not source changes.

## Continue immediately — no user action currently needed

1. Parallel stream A: read-only review of payment/order/warranty concurrency and failure paths. Find a reproducible defect before changing code.
2. Parallel stream B: compare approved reference and latest artifact screenshots at matching viewports/themes. Do not claim pixel parity unless directly checked.
3. Parallel stream C: keep reviewing PR #111 checks/branch-only workflow isolation without merging/rebasing.
4. If source changes, add/reproduce regression first and require Validate + Preview on exact same application SHA. Verify exact-HEAD guard.
5. Keep progress and acceptance statuses unchanged until evidence justifies an update.

**Entry point:** `docs/admin-ui-reference/handoff/START-HERE.md`  
**Next-chat prompt:** `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`

---
# VERIFIED HANDOFF CHECKPOINT — 2026-10-24 08:55 UTC

**Repository:** `chichute5500/Sindarealest-admin`  
**Writable branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Latest application/test SHA:** `0469930f6836d5f8d87b155a538e1d68776e3913`  
**Validate #5664:** PASS — [run 40079854170](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40079854170)  
**Admin Preview Playwright #1069:** PASS — [run 40079854185](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40079854185)  
**PR #111:** OPEN, unmerged, GitHub reports `mergeable=true`, `mergeable_state=clean`; head `0469930f6836d5f8d87b155a538e1d68776e3913`, base `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.

## Work completed since previous checkpoint

1. Fixed the QR upload partial-write risk: pending QR pointer and audit row are committed in one D1 batch; if persistence fails, only the newly staged random R2 object is cleaned up. Test-first regression covers success/failure and preservation of the active QR.
2. Isolated feature-only workflow paths to avoid clobbering files with different intent on `main`:
   - Deployment workflow: `.github/workflows/deploy-admin-isolated-preview.yml`, pinned to `sindarealest-admin-preview` and exact approved branch.
   - Feature E2E spec: `tests/e2e/admin-isolated-preview.spec.js`; diagnostics invoke this file.
   - `main`'s shared workflow/spec remain untouched. The earlier test failures were investigated; one was a stale assertion about the merged PR tree, not a source defect.
3. Current head `0469930f6836d5f8d87b155a538e1d68776e3913` passes Validate #5664 and Admin Preview Playwright #1069. Earlier read-only diagnostics #527 passed on SHA `b6d68ef9cd5ba8e72fcf4c2175e6b7674d039018`; that evidence is **not** falsely attributed to the current SHA unless the newer run confirms it.

## Acceptance boundary — unchanged

- Progress: **50% PROVISIONAL**.
- All 12 screens: `PARTIAL_NOT_ACCEPTED`; approved-reference parity: `NOT_VERIFIED`.
- Authenticated business-write/persistence QA: `NOT_TESTED`.
- Remote D1 schema/ledger: `NOT_VERIFIED`.
- Production: `NOT_PERFORMED`.
- Do not treat fixture screenshots, unit tests or read-only GET checks as proof of business writes.

## Mandatory safety and operating rules

- Only write to `feature/admin-isolated-handoff-2026-10-20`.
- Keep PR #111 open/unmerged. PR #108 and #112 are read-only.
- No merge/rebase/cherry-pick/force-push; no changes to `main` or storefront branches.
- No Production deployment, remote D1/R2 writes, schema/migrations, secrets, Cloudflare Access or DNS changes; never bypass Access.
- Parallelize independent safe streams. When a stream is blocked, record evidence and switch to another useful stream. Report verified outcomes and continue; stop only for an actual user action requirement.
- Test-first for source fixes; tie evidence to exact SHA and separate local fixtures/read-only GETs from authenticated business-write QA.
- Do not create fake commits to trigger Preview. Docs-only commits are not new tested application SHAs.

## Next actions for the next chat

1. Refresh branch HEAD, `main`, PR #111/#108/#112 and recent Actions before making claims.
2. Continue independent read-only audit of admin payment/order/warranty concurrency and error paths; only make a fix after a reproducible defect plus regression test.
3. Continue approved-reference screen-by-screen visual/interaction comparison using the newest available Preview evidence; do not claim parity without direct reference comparison.
4. If source changes, require test-first red/green and exact-SHA Validate + Preview; check that the workflow's exact-HEAD guard did not reject the run.
5. Keep PR #111 open/unmerged and do not change deployment targets from `sindarealest-admin-preview`.

**No user action is currently required. Continue working rather than waiting for a new prompt.**

---
# VERIFIED CHECKPOINT — 2026-10-24 07:35 UTC

**Repo:** `chichute5500/Sindarealest-admin`  
**Writable branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Latest application/test SHA:** `b6d68ef9cd5ba8e72fcf4c2175e6b7674d039018`

## Exact-SHA validation
- Validate #5646: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40074512151
- Admin Preview Playwright #1062: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40074512187
- Admin Preview diagnostics #527: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40074508692
- All three runs completed on the exact same SHA `b6d68ef9cd5ba8e72fcf4c2175e6b7674d039018`.
- Evidence artifact: [admin-preview-evidence-527](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40074508692/artifacts/12551859359)

## PR conflict resolution
- PR #111 is OPEN, unmerged; GitHub reports `mergeable=true`, `mergeable_state=clean`.
- No overlap remains between the PR's changed paths and the four files currently changed on `main`.
- To avoid overwriting `main`'s unrelated Pages workflow and E2E spec, feature-only paths are now:
  - `.github/workflows/deploy-admin-isolated-preview.yml` (pins `sindarealest-admin-preview`, guards the approved feature branch)
  - `tests/e2e/admin-isolated-preview.spec.js` (pins the isolated Preview host)
- `.github/workflows/admin-preview-diagnostics.yml` invokes the isolated spec and is triggered when the isolated deployment workflow changes. The test checks this contract.
- Previous failures on SHA `e54af7f...` were test assertion errors caused by checking absence of main's base-tree files; the stale absence assertions were removed. Current exact-SHA runs pass.

## Verified Preview scope
- Diagnostic signature: `PASS_LOGIN_CSS_SIGNATURE`.
- Authenticated read-only GET checks: 7/7 routes HTTP 200 (session, orders, customers, warranties, audit logs, settings, payment QR).
- Catalog: 235 products; 527 relative product image URLs decoded; pagination/search/category/publication filters and detail editor passed.
- Product mutation requests: none; Admin API mutation requests: none.
- Playwright smoke checks: 3 passed. Evidence is from an authenticated read-only Preview session.

## Boundaries / remaining work
- Authenticated business-write/persistence QA: `NOT_TESTED`.
- Remote Preview D1 schema/ledger verification: `NOT_VERIFIED`.
- Approved reference parity: `NOT_VERIFIED`.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`.
- Progress remains **50% PROVISIONAL**; Production remains `NOT_PERFORMED`.
- Do not merge/rebase/cherry-pick, force push, write to `main`/storefront, deploy Production, alter Cloudflare Access/secrets/DNS, or write remote D1/R2. No fake commits.

## Continue immediately
1. Continue read-only source/concurrency audit and reference-driven UI comparison; change application code only for a reproduced issue with a regression test.
2. Preserve the isolated deployment and E2E paths. Do not run the manual isolated deploy without a supported dispatch action and clear need.
3. Keep PR #111 open/unmerged until project acceptance criteria are met.

**Entry point:** `docs/admin-ui-reference/handoff/START-HERE.md`  
**Next-chat prompt:** `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`

---
# CURRENT VERIFIED CHECKPOINT — 2026-10-24 07:11 UTC

**Repository:** `chichute5500/Sindarealest-admin`  
**Writable branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Exact source/test SHA:** `e55088d89632ff84ec68715cdee3ef64c1a9e964`  
**Validate #5636:** PASS — [run 40072885703](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40072885703)  
**Admin Preview #521:** SUCCESS on the same SHA — [run 40072885497](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40072885497)  
**Evidence artifact:** [admin-preview-evidence-521](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40072885497/artifacts/12552355429)

## Verified code and tests

1. **QR upload atomicity:** new test-first regression failed on SHA `2b274f8054f93a3506c6d5e7e0a94220aaafe2ec`; CI #5634 and Preview #520 showed the handler performed zero D1 batches and the pointer/audit were separate writes. Fix on the tested SHA `e55088d89632ff84ec68715cdee3ef64c1a9e964` uses one D1 batch for the pending-key upsert plus audit record, and deletes only the just-staged random R2 object if that batch fails. Regression checks both success and failure paths; active QR key/status must stay unchanged on failure.
2. **QR activation race guard:** existing QR activation uses a compare-and-swap on pending key and bank-draft snapshot; follow-on settings/audit writes are guarded by `changes()=1`. A local SQLite simulation verified stale pending key changes cause zero follow-on writes, while unchanged valid state activates successfully. This is a local simulation, not remote D1 access.
3. **Warranty issuance race:** atomic warranty insert rechecks the order remains `completed` at write time.
4. **Screen 7 narrow phone layout:** Playwright previously reproduced the primary order button at 28.7px on 320px; the narrow CSS and regression assertions are retained.

## Live Preview evidence and boundaries

- Exact-SHA Validate and Preview both pass on `e55088d89632ff84ec68715cdee3ef64c1a9e964`.
- Preview local source screenshot matrix: 16 source screenshots, 120 synthetic UI-fixture screenshots, 112 fixture layout metrics; source page errors, source console errors, failed requests and HTTP errors are zero. Fixture tests use synthetic IDs and block all non-GET requests; seven fixture console entries are expected from simulated retry-path failures.
- Deployed diagnostic result: `PASS_LOGIN_CSS_SIGNATURE`. Read-only authenticated Preview checks returned HTTP 200 for all 7 Admin GET routes: session, orders, customers, warranties, audit logs, settings and payment QR. Product list: 235 rows; 527 relative image URLs decoded; pagination, search/category/publication filters and detail editor passed. No business mutation requests were sent.
- **No real business-write/persistence test is claimed.** Remote D1 schema/ledger remains `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`.
- Overall progress remains **50% PROVISIONAL**. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; approved-reference parity remains `NOT_VERIFIED`; Production remains `NOT_PERFORMED`.

## PR #111 blocker

PR #111 remains **OPEN and unmerged**. Its branch is seven commits behind current `main`; the independently added `.github/workflows/deploy-admin-feature-preview.yml` exists on both sides with incompatible deployment targets: the feature version pins `sindarealest-admin-preview`, whereas `main` targets `sindarealest2`. Do not replace one with the other, merge/rebase/cherry-pick, force-push, or write to `main`/storefront. Conflict resolution remains read-only until a branch-only solution is validated and verified.

## Continue immediately

1. Keep working on independent read-only PR/conflict analysis and reference-driven Admin screen comparison using artifact #521; make no speculative visual changes.
2. Continue test-first source reviews for concurrency/error paths and run exact-SHA Validate + Preview after any source change.
3. Preserve all safety rules: no production deploy, remote D1/R2 writes or migrations, secrets/Access/DNS changes, or Access bypass. Do not make a docs-only commit while a Preview exact-HEAD guard is in progress.

**Single entry point:** `docs/admin-ui-reference/handoff/START-HERE.md`  
**Next-chat instructions:** `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`

---
## LIVE HANDOFF — 2026-10-24 04:32 UTC

**Current branch HEAD:** `f085698531ae413f311d1a01336f1cfc8059ab4c` on `feature/admin-isolated-handoff-2026-10-20`. PR #111 is still OPEN and unmerged at this SHA. This checkpoint is based on live GitHub reads.

### Latest exact-SHA CI evidence
- **Validate #5589: PASS** on `f085698531ae413f311d1a01336f1cfc8059ab4c`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40062404344. Repository checks and automated tests passed.
- **Admin Preview #508: FAIL** on that same `f085698531ae413f311d1a01336f1cfc8059ab4c`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40062404311. The failure is isolated to Playwright screenshot-matrix capture: `expect(locator).toBeVisible()` for `#backdrop` expected visible, but actual state was hidden after a 5-second timeout; one test failed. Do not describe Preview #508 as passing.
- Preview #508 artifact is available: [admin-preview-evidence-508]( https://github.com/chichute5500/Sindarealest-admin/actions/runs/40062404311/artifacts/12548301227 ). The run passed exact-branch guard, checked out the exact SHA, passed repo checks/tests, passed deployed read-only ADMIN GET diagnostic for `/api/admin/session`, `orders`, `customers`, `warranties`, `audit-logs`, `settings`, and `payment-qr`, recorded no non-read-only requests, passed the final exact-HEAD guard, and uploaded the artifact. The failure occurred in the local screenshot matrix, not in those read-only API checks.
- Prior known-good source/test evidence remains **Validate #5579 + Preview #503 PASS** on `83e5c865e756a9df87c877380d4c506ae85ed8e5`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682268. This is a different, older SHA and must not be applied to current HEAD.
- **Immediate next action:** inspect artifact #508 and the failing Playwright assertion; reproduce why `#backdrop` is hidden at the relevant test step. Add/adjust a regression test only after establishing expected UI behavior. Do not blindly change source or loosen the assertion. If it is an intentional state transition, encode that explicitly; otherwise fix the reproduced defect and rerun Validate + Preview on the exact same source/test SHA.

### Live branch / PR state
- `main`: `227622d3e3b7c75724ffa1775b193da71089269a`.
- PR #111: OPEN, unmerged, HEAD `f085698531ae413f311d1a01336f1cfc8059ab4c`.
- PR #108: OPEN, unmerged, read-only; current HEAD `371dd14067903947e47305c02961fca4b3dd1655`.
- PR #112: OPEN, unmerged, draft; HEAD `87b794996aa9be065fb27616de4b1b1e69e8e94e`.

### Acceptance status — unchanged
- Overall progress: **50% PROVISIONAL**.
- 12 screens: `PARTIAL_NOT_ACCEPTED`.
- Exact approved-reference parity: `NOT_VERIFIED`.
- Authenticated backend/business-write QA: `NOT_TESTED` (Preview read-only GET checks do not count as write QA).
- Remote D1 schema/ledger: `NOT_VERIFIED`.
- Production: `NOT_PERFORMED`.

### Seven mandatory operating rules
1. Parallelize independent safe workstreams; one blocker must not stop other work.
2. Report verified progress and continue working after the report.
3. State blockers with evidence and switch streams; do not repeat actions without new evidence.
4. Test-first: reproduce a concrete defect, establish/add a regression test, then patch.
5. Tie every result to its exact SHA; separate fixtures, read-only API diagnostics, and authenticated business writes.
6. Stop only for genuine account-owner action; never ask for a nonexistent “Run workflow” control.
7. Preserve isolation: write only to `feature/admin-isolated-handoff-2026-10-20`; no merge/rebase/cherry-pick/force-push; no Production deploy; no Cloudflare Access/secrets/DNS changes or bypass; no remote D1/R2/schema/ledger/business writes or migration/seed/import/setup scripts; do not modify `main`, storefront branches, PR #108 or #112; keep PR #111 open/unmerged; never weaken the exact-HEAD guard or create dummy source commits.

### Continue next
1. Download/inspect artifact #508; locate the Playwright test that expected `#backdrop` visible and read the adjacent test/setup code.
2. Determine whether hidden backdrop is expected due to panel navigation or is a real regression; prove with a focused test before touching source.
3. Run independent read-only security/order/payment review in parallel; avoid repeating the already-completed broad route-auth scan.
4. Update these handoff files after new evidence and keep source/test SHA distinct from any docs-only handoff commit.

---

## Live checkpoint — 2026-10-24 03:41 UTC

- **Verified docs HEAD:** `fcc623e2ce281b3e7e2be823d3aeda52fec47a9d` on `feature/admin-isolated-handoff-2026-10-20`; PR #111 is OPEN/unmerged at this SHA. This checkpoint precedes the next docs-only handoff sync.
- **Validate #5582: PASS** on exact docs HEAD `fcc623e2ce281b3e7e2be823d3aeda52fec47a9d`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40059284669. Repository integrity, dependency audit and automated tests passed.
- **Source/test Validate #5579 and Admin Preview #503: PASS** on exact source/test SHA `83e5c865e756a9df87c877380d4c506ae85ed8e5`; Preview exact-HEAD guard passed: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682268. Artifact #503 (133 PNGs): https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058682268/artifacts/12546093261
- **Screen 7 regression resolved:** Preview #502 reproduced timeline overlap at 390×844 (timeline bottom 715.64px; fixed action row top 710px). Compact timeline spacing fixed it; Preview #503 passed. Inspected screenshot shows Timeline above the fixed action row.
- **Artifact diagnostics:** login capture metadata has 0 page/console/failed-request/HTTP errors. The synthetic UI fixture matrix has 0 page errors, 0 horizontal overflow across 112 metrics, 0 unexpected API paths and 0 attempted writes; it also records 7 expected simulated HTTP 503 retry-path console entries. These fixtures do not prove authenticated business writes, real customer data, remote D1 schema/ledger state or Production behavior. Deployed diagnostic remains limited to the login CSS signature.
- **Live refs at this checkpoint:** `main` = `227622d3e3b7c75724ffa1775b193da71089269a`; PR #111 OPEN/unmerged at `fcc623e2ce281b3e7e2be823d3aeda52fec47a9d`; PR #108 OPEN/unmerged/read-only at `9cdcdfc5096e6b5efd2e5f4c74520f8c8d6049a0`; PR #112 OPEN/unmerged/draft at `87b794996aa9be065fb27616de4b1b1e69e8e94e`.
- **Progress/acceptance unchanged:** 50% PROVISIONAL; all 12 screens `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

### Continue next
1. Refresh live branch HEAD, main, PR #111/#108/#112 and Actions after this docs-only sync. Keep docs HEAD `fcc623e2ce281b3e7e2be823d3aeda52fec47a9d` distinct from source/test Preview SHA `83e5c865e756a9df87c877380d4c506ae85ed8e5`.
2. Continue the remaining reference-driven screen audit; only patch concrete reproducible mismatches, test first, then Validate and Preview the same exact source/test SHA.
3. Continue independent read-only order/payment invariants and CI/security checks; do not repeat the completed broad admin-route auth scan without new evidence.
4. Authenticated business workflows require an authorized Preview path. Never bypass Cloudflare Access or change secrets; continue safe fixture/static work if access is unavailable.

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
---

## Latest checkpoint — 2026-10-24 08:24 ICT

- Repository: `chichute5500/Sindarealest-admin`; writable branch: `feature/admin-isolated-handoff-2026-10-20`. Live branch HEAD at checkpoint start: `94669674ab0d5e635ac47026ef3c98d362e63002` (docs-only handoff commit); source/test SHA: `0c441375a212c73ce56f16d4f9673e44c1b8260f`. Latest source UI commit before the test-only correction: `6a31cb31d996a8937923d552421674f29d5c14d9`.
- Validate [#5540](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413343) **SUCCESS** on exact source/test SHA `0c441375a212c73ce56f16d4f9673e44c1b8260f`; Validate [#5541](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049531482) **SUCCESS** on exact docs-only checkpoint HEAD `94669674ab0d5e635ac47026ef3c98d362e63002`.
- Admin Preview [#493](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302) ended **FAILURE at the exact-HEAD guard**, because the branch advanced from tested SHA `0c441375a212c73ce56f16d4f9673e44c1b8260f` to docs-only HEAD `94669674ab0d5e635ac47026ef3c98d362e63002` while the run was in progress. Screenshot capture and read-only diagnostic steps completed; artifact [#493](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302/artifacts/12543031534) was uploaded. No Preview success is attached to the current docs-only HEAD.
- Artifact #493 was downloaded and inspected: 133 PNGs (16 source/login captures + 120 UI-fixture capture entries), 112 fixture metrics, zero horizontal overflow, zero source page/console/request/HTTP errors, zero fixture page/API errors, zero attempted writes and unexpected API paths; seven fixture console HTTP 503 entries. Screen 7 order detail shows Timeline after the product list at 390×844, using synthetic UI-only data. This is fixture evidence, not approved-reference acceptance.
- The same Preview run's read-only deployed diagnostics passed 7/7 authenticated Admin GET routes; catalog check saw 235 products and 527 decoded image URLs. Orders/customers/warranties/audit-log arrays were empty; no business-write or persistence acceptance.
- PR [#111](https://github.com/chichute5500/Sindarealest-admin/pull/111) is open/unmerged, mergeable=false, head `94669674ab0d5e635ac47026ef3c98d362e63002` at checkpoint start. PR [#108](https://github.com/chichute5500/Sindarealest-admin/pull/108) is open/unmerged/read-only, mergeable=false, head `330249ecd1c64bd4e4bc0cdcccf4deb495db39be`. Main remains `227622d3e3b7c75724ffa1775b193da71089269a`.
- **Acceptance unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Progress remains **50% PROVISIONAL**.
- This snapshot is captured before the docs-only checkpoint sync. After the final handoff commit, refresh live HEAD, PR metadata and Actions. Do not merge, deploy Production, change Cloudflare Access/secrets, mutate D1/R2, or run migrations.


---
---

## HISTORICAL CHECKPOINT — 2026-10-24 03:42 ICT (superseded by verified checkpoint above)

### State and exact-SHA verification
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`. Live HEAD at checkpoint: `448e7d2b5840825e36c3215071260983badb9e39`. `main`: `227622d3e3b7c75724ffa1775b193da71089269a`. PR #111 OPEN/unmerged at this HEAD; PR #108 OPEN/unmerged/read-only at `62e83c29933c4d578065236e8df9cf0b21ece0ce`. Both PRs still target base SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- [Validate #40020808865](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020808865) **SUCCESS** on exact SHA `448e7d2b5840825e36c3215071260983badb9e39`.
- [Admin Preview #40020809121](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020809121) is **IN PROGRESS / NOT YET VERIFIED** on the same SHA. Last observed job: `Install Chromium for Playwright`, 7 of 15 steps completed, no failed steps reported. Do not claim Preview PASS until final conclusion is SUCCESS and its exact-HEAD guard/artifact are inspected.
- Earlier Preview #40020318042 succeeded on test-only assertion commit `5bac87cb0f4c1eeec9db9251de7c651a5a1aa9f6`; artifact [469](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020318042/artifacts/12530930535) was inspected. Warranty screenshot in artifact #465 showed a stale success toast covering content; screenshot in artifact #469 did not show the toast. The harness now (a) asserts the toast is not shown before the Screen 9 warranty screenshot, and (b) always removes the fixture toast's `show` class after measuring toast layout, rather than restoring a prior visible state. Latest assertion+cleanup commit is `448e7d2b5840825e36c3215071260983badb9e39`. The assertion passed in the earlier test-only Preview run; final validation for cleanup commit is still pending Preview completion.
- Static read-only Backup/Restore audit: `functions/api/admin/backup.js` has GET handler and admin auth; `functions/api/admin/restore.js` has POST handler, admin auth, record-count limit, and destructive delete/write logic. No endpoint was invoked; no export/import, mutation, migration, or business-data test was run. Screen 11 remains unaccepted.
- Evidence remains limited to synthetic UI fixtures/read-only static review. The Preview diagnostic is not authenticated business/backend QA.

### Parallel workstreams — completed and ongoing
1. **Screen 12 mobile regression:** test-first reproduction: first activity card bottom 778px vs fixed-nav top 564px; title-only CSS attempt still bottom 723px. Targeted filter-stack compaction at `7a57dfa634151ece49d3eb7cb7b2f31cf8f19628` passed Validate #40018955519 and Preview #40018955530 on the same SHA; artifact #467 inspected and showed multiple activity records above navigation. No acceptance-status upgrade.
2. **Screen 9 warranty fixture-state leakage:** inspected artifact #465 (toast visible) and #469 (toast absent); added a regression assertion, then corrected harness cleanup to make toast state deterministic after its position check. Validate #40020808865 passes on `448e7d2b5840825e36c3215071260983badb9e39`; Preview #40020809121 still running. This is screenshot/test-harness hygiene, not proof of a live warranty defect.
3. **Backup/Restore safety audit:** static code only; GET export handler vs POST restore handler reviewed. Restore includes destructive operations, so do not call it in this environment. No writes performed.
4. **Workflow/branch integrity:** checked current branch HEAD, live `main`, PR #111 and PR #108; no merge/rebase/force-push. Keep isolated feature branch.
5. **Reference and capture evidence:** inspected screenshot artifacts #465 and #469 and maintained evidence boundaries; fixtures do not prove real backend behavior.
6. **Handoff synchronization:** updating all six canonical files in one docs-only commit. Recheck live branch and workflow outcomes after this docs commit; docs-only child SHA will differ from the tested source SHA.

### Next actions
- Refresh Validate #40020808865 and Preview #40020809121. If Preview succeeds, inspect its new artifact and confirm exact-HEAD guard on `448e7d2b5840825e36c3215071260983badb9e39`; if it remains stalled/fails, inspect job logs and resolve the runner issue without relaxing checks.
- Continue multi-track read-only reference audit on the next reproducible unaccepted screen. No speculative CSS: reproduce first and add regression coverage before any source fix.
- Preserve all seven operational rules below exactly. Keep all 12 screens `PARTIAL_NOT_ACCEPTED`; exact visual parity `NOT_VERIFIED`; authenticated backend/business QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. The 50% progress estimate remains provisional, not an acceptance percentage.


## VERIFIED HANDOFF UPDATE — 2026-10-24 ICT — Screen 12 narrow-mobile layout verified

- **Exact source/test SHA:** `7a57dfa634151ece49d3eb7cb7b2f31cf8f19628` on `feature/admin-isolated-handoff-2026-10-20`. [Validate #40018955519](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018955519) **PASS** and [Admin Preview #40018955530](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018955530) **SUCCESS** on that exact same SHA; Preview's exact-HEAD guard passed.
- **Test-first evidence:** test-only run #40017740376 measured the first activity card bottom at **778px** versus fixed navigation top **564px**. Heading-only CSS on `ef8febc2ac8df0e60830f6935ef9eddd9917a0c6` still measured **723px**. The follow-up filter-stack compaction at `7a57dfa634151ece49d3eb7cb7b2f31cf8f19628` passes the same regression.
- **Artifact inspected:** [admin-preview-evidence-467](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018955530/artifacts/12529347836) (artifact ID `12529347836`): 132 capture PNGs plus the approved reference PNG, 120 UI-fixture capture entries, 116 distinct module screenshots and 112 metrics. Opened `activity-log__320x640__light.png`: multiple activity cards are visible above the fixed navigation; no horizontal overflow was reported.
- **Evidence boundary:** synthetic, read-only UI fixtures; zero attempted writes and zero unexpected API paths. Remote diagnostic is `PASS_LOGIN_CSS_SIGNATURE` only, not authenticated business/backend acceptance. No business data writes, seed/import, migration, or Production deploy.
- **Live refs at checkpoint start:** branch/test SHA `7a57dfa634151ece49d3eb7cb7b2f31cf8f19628`; live `main` SHA `227622d3e3b7c75724ffa1775b193da71089269a`; PR #111 OPEN/unmerged; PR #108 OPEN/unmerged/read-only at `11a35b0d01eff46463675ee39ce80fc4465a655c`. Both PRs still report base `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Do not rebase/merge.
- **Acceptance unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact parity `NOT_VERIFIED`; authenticated business/backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. The 50% estimate remains provisional.
- **Next:** fix Screen 9 *fixture-capture state leakage*. The warranty screenshot still contains a stale successful-retry toast because the capture helper restores the prior visible-toast state. Add a regression assertion first, then clear only the synthetic toast before capture; rerun exact-SHA Validate + Preview and inspect the artifact. This is artifact hygiene, not a live warranty/backend defect. Do not repeat Screen 12, Screen 10, concurrency, B1 cleanup or seed/import work.
---

# Historical checkpoint — Screen 10 layout work before exact-SHA compact-copy fix

## Verified live repository state

- Repository: `chichute5500/Sindarealest-admin`
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`
- HEAD at handoff sync start: `3341bc3d89652fc753a826d082c0a5e5bdf3db80` — commit message: `[CF-Pages-Skip] fix(admin): compact Screen 10 watermark controls`.
- PR #111: OPEN, unmerged, `mergeable=false`, 489 changed files; base `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Do not merge or attempt cleanup by rebasing.
- Validate run [#40010281084](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40010281084): **SUCCESS** on exact HEAD `3341bc3d89652fc753a826d082c0a5e5bdf3db80`.
- Admin Preview diagnostic run [#40010281144](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40010281144): **IN_PROGRESS** on exact HEAD at sync. Re-fetch status/jobs/artifacts before relying on it. Preview acceptance is NOT verified until this run finishes and evidence is inspected.
- Previous run #40009827236 failed on SHA `0c1b97432a9afbd87c3c9a5c0e2276f6e7807a9d`; inspect its exact failed step only if needed to prevent repeating that issue. Do not label the current HEAD failed based on an older SHA.
- Latest source work: commit `147f677` began Screen 10 settings/reference alignment. Follow-up commits `0c1b974` and `3341bc3` iteratively corrected test assumptions and compacted watermark controls. Earlier tests failed on incorrect assumptions about labels/heading; logs identified the mismatch. Verify the latest test and live UI evidence instead of assuming the CSS is accepted.
- Current Screen 10 scope: align the reference-facing settings headings/copy; compact only the `.website-settings` layout at mobile widths; preserve save handlers and unrelated settings/backup UI. Regression tests assert expected headings and that watermark controls remain above the fixed mobile navigation at 390×844 light theme.
- This does **not** establish full visual parity or authenticated settings persistence. No settings were saved remotely, no business data written, no production deploy.

## Next actions for the next chat

1. Re-fetch branch HEAD, PR #111/#108 status, and latest Actions; do not assume the checkpoint SHA is still HEAD.
2. Inspect run #40010281144 to completion: jobs, step logs, artifact availability. Confirm exact `head_sha` equals the tested source SHA; download/inspect Screen 10 screenshots at 390×844 light and other tested viewports/themes. If the run fails, read the exact log and add a focused regression test before any further fix.
3. Check the actual Screen 10 screenshot against `docs/admin-ui-reference/admin-mobile-reference.png`; ensure the compact CSS affects only `.website-settings`, the price toggle state/copy is reference-aligned, and watermark controls are reachable above mobile navigation.
4. If Screen 10 passes, continue the next unaccepted screen only where an actual reproducible mismatch can be shown. Avoid speculative CSS and don't repeat already-passed checks without new evidence.
5. Update the three handoff files together after the next meaningful verified checkpoint. Keep the seven rules below verbatim.

## Acceptance truth

- Screen 10: source/test changes exist; current latest Preview run is pending at this checkpoint; visual acceptance is **NOT VERIFIED** until artifact inspection.
- All 12 reference screens: **PARTIAL_NOT_ACCEPTED**; exact reference parity: **NOT_VERIFIED**.
- Authenticated backend/business QA and settings persistence: **NOT_TESTED**.
- Production deployment: **NOT PERFORMED**.

## Isolation boundaries

- Keep `main` at its existing base; do not modify `main`.
- Do not change storefront project `sindarealest2`, storefront branch `fix/liquid-glass-audit-2026-10-19`, or shared `CLOUDFLARE_PAGES_PROJECT`.
- Dedicated Admin Preview target: `sindarealest-admin-preview`; dedicated D1: `sindarealest-admin-preview-db`. Never attach Production/AI Preview databases or copy production credentials.
- Do not merge PR #111/#108/#112, force-push, deploy Production, run seed/import/migrations/setup/deploy scripts, mutate remote D1/R2/schema/ledger, alter Access/secrets/DNS, or bypass Access.
- Synthetic fixture screenshots only prove the local UI fixture. Do not claim business/backend acceptance from them.


## Quy tắc vận hành bắt buộc

1. Không chờ CI/deploy một cách thụ động: trong thời gian chờ, rà soát độc lập ở khu vực an toàn; sau đó quay lại kiểm tra kết quả thực tế.
2. Báo cáo xong tự động làm tiếp; không coi việc báo cáo là lý do dừng công việc.
3. Chỉ sửa khi tìm thấy lỗi cụ thể có thể tái hiện; bổ sung kiểm thử hồi quy trước khi sửa.
4. Trước khi kết luận, kiểm tra SHA chính xác, CI, Preview và bằng chứng triển khai. Không suy diễn PASS khi chưa có bằng chứng.
5. Chỉ dừng khi thực sự cần chủ tài khoản kiểm tra, quyết định mở khóa hoặc thao tác trên thiết bị/tài khoản.
6. Nếu một đầu việc bị chặn, tiếp tục các đầu việc an toàn, độc lập khác.
7. Giữ nguyên mọi giới hạn cô lập đã nêu trong handoff; không triển khai Production, không ghi dữ liệu nghiệp vụ, không chạy seed/import lại, không in secret.

## CURRENT HANDOFF — 2026-10-24 — Product catalog visible in isolated Admin Preview; continue runtime verification

**User confirmation:** the user has now confirmed that products are visible in Admin Preview. Treat the “0 products” UI symptom as resolved for the current observed session; do not repeat seed/import or ask the user to re-check the same thing. This confirms the visible product list only, not full CRUD, images, login/session stability, or backend acceptance.

- **Dedicated Preview:** `sindarealest-admin-preview`; stable alias `https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/`; dedicated D1 `sindarealest-admin-preview-db`, UUID `573ad702-05fc-405e-8ef3-0cf2e7fea98d`. Do not attach production/shared resources.
- **Latest successful deploy evidence known:** [Actions run #39988045568](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39988045568), SHA `22e16f88c2e61d42007d40ba20732fd1b47fcfec`, deployment `d6fe9eb8-0447-4c9f-8aa6-1ae7cd1b1183`. Verify current live run/alias before relying on this as latest.
- **Seed guard result:** [run #39991459897](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39991459897) deliberately stopped before import because the isolated D1 already had `235` products (guard expected exactly zero). It verified the dedicated D1 name/UUID and seed source count (235); import and post-import steps were skipped. This run did not change the database. Do not rerun/import or modify seed workflow just to turn its red X green. The user's current confirmation that products are visible supersedes the earlier UI symptom.
- **Do next:** inspect live API/UI behavior read-only first: product list GET, pagination/filters, image URL loading, and whether detail/edit screens load. Only make a targeted fix if a reproducible defect is found; add a regression test and run source validation plus isolated Preview on the exact tested SHA. Update this handoff after the next verified checkpoint.
- **Isolation/safety:** do not change shared `CLOUDFLARE_PAGES_PROJECT`, storefront project `sindarealest2`, storefront branch `fix/liquid-glass-audit-2026-10-19`, or `main`; do not merge PR #111/#108/#112. Never use production D1 `sindarealest-db` UUID `f6c208a1-052a-445c-a3b7-a442783f9bd3` or AI Preview DB UUID prefix `6f444e33-`. Do not request or print secrets. No shared storefront R2; dedicated R2 was not created. Do not load `0002_seed_products.sql` again without explicit review/approval.
- **Legacy UI acceptance remains separate:** all 12 reference screens still `PARTIAL_NOT_ACCEPTED`; exact visual parity `NOT_VERIFIED`; authenticated business/backend QA was not proven by synthetic screenshots. Product visibility does not close those acceptance gates.

---

## CURRENT HANDOFF — 2026-10-23 16:10 UTC — Isolated Admin Pages project is deployed, but not configured for backend

**Important correction for next chat:** The newly created Cloudflare Pages project is not ready for Admin login. Do not mistake a successful static deployment or a green source-validation workflow for a configured Admin environment. The user explicitly wants a new, separate Admin Preview and requires all existing storefront projects/branches/settings to remain unchanged.

- **Isolation boundaries:** storefront production branch `main`, storefront development branch `fix/liquid-glass-audit-2026-10-19`, and existing Pages project `sindarealest2` must not be changed. Do not change the shared repository variable `CLOUDFLARE_PAGES_PROJECT`; the storefront Preview workflow uses it and the latest run [#39979850588](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39979850588) succeeded on the storefront fix branch.
- **Separate Admin project:** `sindarealest-admin-preview`. Dedicated deploy workflow on branch `fix/admin-preview-project-target` hardcodes this project name and guards it, rather than using the shared Pages project variable. Last recorded successful deployment run [#39978278058](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39978278058); deployment URL `https://85f6130c.sindarealest-admin-preview.pages.dev/`; stable branch alias observed in Cloudflare `https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/`. Use the branch alias for stable test configuration, but verify it still resolves before relying on it.
- **Confirmed current failure:** [Admin Preview Playwright run #39979890884](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39979890884) fails after the login page loads. Its server response is explicit: `503 /api/admin/session` and `503 /api/admin/login`, message `Dịch vụ dữ liệu chưa được cấu hình. Hãy gắn D1 binding tên DB.` Therefore the new Pages project currently lacks D1 binding named `DB`. This is a Cloudflare project configuration gap, not a Playwright selector problem.
- **Other required project configuration:** inspect the new project's Preview bindings/secrets independently. Admin code expects D1 `DB`, R2 bucket `IMAGES` (and optionally `ORIGINALS`), and secrets `ADMIN_PASSWORD` (minimum 12 chars) and `SESSION_SECRET` (minimum 32 chars). Do not copy or attach Production data/credentials to Preview by assumption. Before connecting a database, identify/create a separate Preview D1 database and verify schema state. Do not run migrations, setup scripts, or remote writes until authorized and a safe isolated database is confirmed.
- **Workflow branch warning:** `.github/workflows/deploy-admin-feature-preview.yml` on `feature/admin-isolated-handoff-2026-10-20` still references shared `${{ vars.CLOUDFLARE_PAGES_PROJECT }}` and guards for `sindarealest2`; do NOT dispatch that workflow for Admin. Use only the dedicated workflow on `fix/admin-preview-project-target`, which hardcodes `sindarealest-admin-preview`. PR #112 remains separate/open and must not be merged blindly. Existing storefront workflow and shared variable must remain untouched.
- **Do next, without asking user to repeat context:** (1) inspect live PR #112/head/workflow and verify the new project's current deployment/API metadata; (2) see whether available authorized Cloudflare API credentials can inspect the new project's bindings/settings without exposing secrets; (3) if possible, configure only the isolated Admin Preview project's dedicated bindings and secrets, and create/verify an isolated D1 DB only if supported and safe; (4) run Admin Preview Playwright again and record evidence. If Cloudflare API permissions cannot configure bindings, report the single exact owner action required and stop only at that permission boundary. Do not modify the storefront shared variable, `main`, or `fix`.
- **Current run status:** source/test validation workflow run [#39979890753](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39979890753) PASS; remote Admin smoke test FAIL for missing `DB`. The login page itself opens, but Admin backend/login is not functional.
- **Existing Admin UI handoff acceptance remains:** all 12 reference screens `PARTIAL_NOT_ACCEPTED`; exact visual parity `NOT_VERIFIED`; authenticated business/backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. This isolated deployment issue does not replace the prior UI acceptance work.

---

# LATEST STATUS — SinDarealest Admin

## Current checkpoint — 2026-10-23 12:43 UTC — Preview 423 verified; Screens 4/5/7 reviewed

- **Live state at sync start:** branch `feature/admin-isolated-handoff-2026-10-20` HEAD `4d44e397d892a3e3d4ec1d8a2ee75903a4a52e19`; this is an evidence-only child of tested SHA `7f5df6bb63a264a495c1f76517861496e3cc3643`. The six-file checkpoint update is documentation-only; no app-source change is being claimed.
- **Exact-SHA verification:** [Validate #39953114181](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39953114181) PASS and [Admin Preview #39953114180](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39953114180) PASS on the same SHA `7f5df6bb63a264a495c1f76517861496e3cc3643`. Preview job, repository checks, automated tests, Chromium setup, responsive/theme capture, diagnostic, and artifact upload all completed successfully.
- **Artifact inspected:** [admin-preview-evidence-423](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39953114180/artifacts/12501226741) has 132 PNG screenshots (16 login-shell entries plus 120 fixture capture entries) and 112 fixture metrics. Main report page/console/request/HTTP errors are all zero; the fixture audit has seven expected simulated HTTP 503 retry-path console entries, with fixture API errors, unexpected paths, and attempted writes all zero.
- **Preview diagnostic boundary:** `PASS_LOGIN_CSS_SIGNATURE` only. These are local screenshots with synthetic, read-only UI fixtures; no authenticated business/backend workflow was tested.
- **Screens 4/5/7 review:** Screen 4's `SKU chính thức` placeholder fits the 320px field in the capture from existing source/test change `efb4935`. Screen 5's responsive fixture screenshots/metrics show the featured cover and horizontal thumbnail rail; a short viewport crop alone is not evidence that lower controls are inaccessible. Screen 7 shows stacked order/detail cards with the remainder available by scrolling; fixture values and actions do not prove live order behavior. No *new* reproducible source defect was confirmed, so no speculative CSS or business-data change was made.
- **Acceptance is unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact visual parity `NOT_VERIFIED`; authenticated backend/business QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. R2/product image persistence, migration 0009, PRE/PRO, and AI image grouping remain deferred.
- **PR / safety state:** PR #111 OPEN/unmerged on this branch; PR #108 OPEN/unmerged and read-only; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge, rebase, force-push, Production deployment, Cloudflare Access/settings/secrets/DNS changes, or remote D1/R2/schema/ledger write.
- **Next:** continue reference-driven inspection of remaining screen discrepancies, prioritize a repeatable visual/interaction mismatch with targeted regression coverage, then run Validate + Preview on its exact source/test SHA. Obtain an owner-authorized authenticated Preview path for backend QA; do not bypass Access.

## Current checkpoint — 2026-10-23 11:42 UTC — Screen 12 unread badge capture corrected; Validate and Preview pass

- **Live state:** branch `feature/admin-isolated-handoff-2026-10-20` HEAD at checkpoint start is `ab61a99d138380aa21642e9873446c3c442f418b`, an Actions evidence child after tested commit `6de79a88579d4798efba518f97c63cb150452bbd`. PR #111 remains OPEN/unmerged; PR #108 remains OPEN/unmerged and read-only. No merge, rebase, force-push, Production deployment, or writes to `main`/the static website branch.
- **Finding and fix:** approved reference Screen 12 shows an unread-notification badge. The source UI already calculates unread notifications; the screenshot test had marked them read before capturing, so the artifact falsely omitted the badge. Commit [`6de79a8`](https://github.com/chichute5500/Sindarealest-admin/commit/6de79a88579d4798efba518f97c63cb150452bbd) resets the synthetic local read state after behavior assertions and leaves the tab in the reference-relevant unread state before capture. This is test-only; no application source/business data/API/database changed.
- **Exact-SHA verification:** [Validate #39947460591](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39947460591) PASS and [Preview #39947460554](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39947460554) PASS on `6de79a88579d4798efba518f97c63cb150452bbd`. Artifact [admin-preview-evidence-417](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39947460554/artifacts/12499200648) contains 132 PNGs and 112 fixture metrics. The 390×844 light screenshot now shows the unread badge with synthetic fixture count 5; it does not claim the reference's real count of 3 or any authenticated business state.
- **Acceptance boundary unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Deployed diagnostic is `PASS_LOGIN_CSS_SIGNATURE` only.
- **Next:** continue comparing remaining screen screenshots against the approved reference; only fix reproducible issues, verify on exact SHA, and update handoff after meaningful work. Keep all safety boundaries.


## Current checkpoint — 2026-10-23 11:24 UTC — Mobile activity-log density refinement; Validate and Preview pass

- **Live state:** branch `feature/admin-isolated-handoff-2026-10-20` HEAD is `f7f46e48856cd292ae012e2075da2625e99ff152` (Actions evidence child after tested source/test commit `ff807aa4e3175e61d4d001c84b4bb815cd11388c`). PR #111 is OPEN/unmerged and points to the live branch; PR #108 remains OPEN/unmerged and read-only. No merge, rebase, force-push, or writes to `main`/the static website branch.
- **UI change:** commit [`ff807aa`](https://github.com/chichute5500/Sindarealest-admin/commit/ff807aa4e3175e61d4d001c84b4bb815cd11388c) tightened mobile activity-log filter labels and card spacing, added a two-line description clamp, and added Playwright height assertions for mobile controls/cards. The screenshot at 390×844 light theme shows the activity log and five visible/partly visible audit cards without horizontal page overflow. This is synthetic/read-only fixture content, not proof of authenticated business data.
- **Exact-SHA checks:** [Validate #39945405222](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39945405222) PASS and [Preview #39945405006](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39945405006) PASS on `ff807aa4e3175e61d4d001c84b4bb815cd11388c`. Artifact [admin-preview-evidence-415](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39945405006/artifacts/12497727381) contains 132 PNGs and 112 fixture metrics. Deployed diagnostic is `PASS_LOGIN_CSS_SIGNATURE` only; it does not establish authenticated backend QA.
- **Acceptance remains incomplete:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- **Next:** continue the remaining screen-by-screen reference comparison using the newest artifact and approved `admin-mobile-reference.png`; fix only reproducible mismatches, rerun exact-SHA checks, then synchronize all five handoff files again. Keep the guardrails below.


## Current checkpoint — 2026-10-23 11:03 UTC — Mobile activity-log test corrected; Validate and Preview pass

- **Live GitHub state:** PR #111 remains OPEN/unmerged. At checkpoint start, branch HEAD was evidence-only Actions child `690b03731f534fa572f93462f11e3774f13a75bf`, whose parent is the tested source/test commit [`f1fdd19`](https://github.com/chichute5500/Sindarealest-admin/commit/f1fdd19db4d6aa87465d25274d27adfa60f558f9). PR #108 remains OPEN, read-only and unmerged; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Do not merge either PR or modify `main`/the static-website branch.
- **Failure diagnosed and corrected:** Preview run [#39940756073](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39940756073) failed because the mobile test measured `#activityLogSearch` while the advanced filters were deliberately collapsed, so the hidden element returned width 0. Commit [`f1fdd19`](https://github.com/chichute5500/Sindarealest-admin/commit/f1fdd19db4d6aa87465d25274d27adfa60f558f9) moves the width assertion to after the mobile filters are expanded. This commit changes the test only; no ADMIN application source, business logic, API, business data or database changed.
- **Exact-SHA Validate:** [run #39943070380](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39943070380) **SUCCESS** on `f1fdd19db4d6aa87465d25274d27adfa60f558f9`; dependency audit, project integrity and automated tests passed.
- **Exact-SHA Preview:** [run #39943070469](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39943070469) **SUCCESS** on the same SHA. Artifact [`admin-preview-evidence-411` (#12496308590)](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39943070469/artifacts/12496308590) contains the responsive/theme source evidence: 133 PNG files (16 login-shell capture entries, 120 fixture-screen capture entries, with overlapping filenames), 112 fixture metrics; metadata reports 0 page errors, 0 console errors, 0 failed requests and 0 HTTP errors. The mobile activity-log screenshots at 320×640 and 390×844 were inspected; advanced search is collapsed by default on mobile, as intended.
- **Remote Preview boundary:** deployed diagnostic is `PASS_LOGIN_CSS_SIGNATURE` only. This confirms the deployed login-shell CSS signature, not authenticated access to business modules or persistence. Authenticated business/backend QA remains `NOT_TESTED`; the historical Cloudflare Access root cause remains `UNCONFIRMED`. No Access policy or secret was changed.
- **Acceptance boundary remains unchanged:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact approved-reference parity `NOT_VERIFIED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Migration 0009, PRE/PRO migrations, product-image/R2 persistence and AI image grouping remain deferred by owner.
- **Next actions:** continue visual comparison against the approved reference and fix only reproducible ADMIN-specific differences; obtain an authorized authenticated Preview path before business-workflow QA. Do not bypass Cloudflare Access. Keep PR #111/#108 open and unmerged; no rebase/force-push, Production deployment, remote D1/R2/schema/ledger writes, migrations/setup/deploy scripts, or writes to `main`/the static website.
## Historical checkpoint — 2026-10-23 08:44 UTC — Localize audit-log actor label and verify exact SHA

- **Live state at checkpoint start:** PR #111 is OPEN/unmerged. Its branch HEAD is evidence-only Actions child `79554d75556664527ca41cf9bd6d334429b41305` (commit: [79554d7](https://github.com/chichute5500/Sindarealest-admin/commit/79554d75556664527ca41cf9bd6d334429b41305), created by Preview run #39925598940 to persist evidence), whose parent is the exact source/test commit `3290febb0e894e02988f2e9987d4ecb0c0ad6924`. Do not treat the evidence child or the handoff-only commit that follows as a separate application-code test SHA.
- **Source change:** [`3290febb`] (https://github.com/chichute5500/Sindarealest-admin/commit/3290febb0e894e02988f2e9987d4ecb0c0ad6924) changes the dashboard recent-activity table and dedicated audit-log table labels from English `Actor` to Vietnamese `Người thực hiện`, and updates the matching Playwright and contract-test expectations. No business logic, API, business data, or database was changed.
- **Exact-SHA validation:** CI [#39925598976](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39925598976) PASS on `3290febb0e894e02988f2e9987d4ecb0c0ad6924` (dependency audit, project-integrity validation, automated tests). Preview [#39925598940](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39925598940) PASS on the same exact SHA: repository checks, automated tests, Chromium setup, local read-only responsive/theme screenshot matrix, deployed Preview diagnostic, evidence persistence, artifact upload all succeeded.
- **New artifact:** [admin-preview-evidence-401 #12489985219](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39925598940/artifacts/12489985219) belongs to exact tested source/test SHA `3290febb0e894e02988f2e9987d4ecb0c0ad6924`; SHA-256 `3c7d80303ed30e49769eb8cb0e456c5d5b35f276612b3b1fd20eb49af71011a4`. Evidence reports 133 generated PNGs (16 login-shell capture entries, 120 fixture capture entries, including overlapping views) and 112 fixture metrics. Directly inspected `activity-log__390x844__light.png` and `activity-log__320x640__light.png`: the new “Người thực hiện” label renders in the mobile activity row; tested viewport metrics report no horizontal overflow.
- **Evidence boundary:** artifact uses synthetic `UI-ONLY` fixtures and a stubbed local session; all non-GET fixture requests are blocked. Top-level Playwright report: 0 page errors, 0 console errors, 0 failed requests, 0 HTTP errors. The fixture visual audit has 7 expected simulated HTTP 503 retry-path console entries; fixture API errors=0, attempted writes=0, unexpected API paths=0. Deployed Preview status is `PASS_LOGIN_CSS_SIGNATURE` only; this does **not** prove a real authenticated session, business workflow, persistence, or backend health.
- **Live PR/base verification:** PR #111 OPEN/unmerged, HEAD-at-checkpoint-start `79554d75556664527ca41cf9bd6d334429b41305`; PR #108 OPEN/unmerged and read-only, live head `c5198a82b6d2f3bcdbda70a7a3cd5febfb0ff807`; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. The new handoff sync commit is docs-only and not an independently tested source SHA.
- **Acceptance remains PARTIAL:** all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated business/backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Historical `BLOCKED_CLOUDFLARE_ACCESS` root cause remains **UNCONFIRMED** because the exact failed-run logs and matching hostname/time Access event are not available.
- **Next execution:** continue reference-driven acceptance on still-unaccepted screens, fix only an observable/reproducible defect with a matching test, inspect evidence from the exact source SHA, and keep all five handoff files synchronized. Do not repeat the completed B1 cleanup or the actor-label fix. Obtain an owner-authorized authenticated Preview path before backend QA; do not bypass Access, mutate Cloudflare controls, write remote D1/R2/schema/ledger, run migrations/setup/deploy scripts, or deploy Production. Keep PRs #111/#108 open and do not change `main` or the static-website branch.

## Historical checkpoint — 2026-10-23 08:23 UTC — Reconcile live HEAD and exact-SHA validation
- Live branch HEAD at verification: `8e7914b7754ec4a80cde535ccee041636a256c9f`, an **evidence-only Actions child** titled `test(admin): save Playwright evidence for 7631f1badaf7`. It updates handoff/test-evidence pointers and records the previous run; it is not a new application-source change.
- Latest full Preview workflow located on this branch: [run #39923533998](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39923533998), successful on exact source/test SHA `7631f1badaf774fc35616fc21445e94af0bca027` (the parent of current evidence child). Reported `npm run check`, `npm test`, local Playwright responsive/theme matrix and deployed Preview diagnostic all passed. Artifact: [admin-preview-evidence-395](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39923533998/artifacts).
- Artifact evidence summary: 132 generated PNGs (16 login-shell + 120 fixture capture entries, including 116 distinct module screenshots), 112 fixture metrics; local source/read-only fixture only. No browser/page errors, failed requests, HTTP errors, attempted writes, or unexpected API paths reported. Preview diagnostic is reported as success, but this does not prove authenticated business workflows or persistence.
- Investigated failed run [#39922187009](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39922187009): failure was in the repository-check step before Playwright/Preview ran. Exact log error: `SyntaxError: Invalid regular expression: /opened\\.type === 'blocked'\\)\\s*test\\.skip/: Unmatched ')'`. The regression-guard regex was corrected later; run #39922500963 then passed on exact code/test SHA `8cfe44b896eefbf6f5fb0365fa51c78b2b6f5ba7`, and run #39923533998 passed on `7631f1b...`.
- Important distinction: current branch HEAD `8e7914b...` is evidence-only and has not been established as a separately tested source SHA. Latest full workflow validated its parent `7631f1b...`; do not state that the exact current HEAD itself was independently tested.
- Historical `BLOCKED_CLOUDFLARE_ACCESS` root cause remains **UNCONFIRMED**. The latest Preview succeeded, so it did not reproduce that incident. Need the exact failed run and matching Cloudflare Access event hostname/time to diagnose; do not alter Access policy, secrets, DNS, or bypass controls.
- Live PR state rechecked: PR #111 OPEN/unmerged; PR #108 OPEN/unmerged and read-only; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge, production deployment, or remote D1/R2/schema changes.
- Product acceptance remains unchanged: all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- Next: continue real screen acceptance using the newest Preview artifact and approved reference, fix only reproducible defects, and keep the next checkpoint synchronized across all handoff files. Do not repeat B1 cleanup/provenance audit without new evidence.

## Previous checkpoint — 2026-10-23 08:12 UTC — Preview Access diagnostic correction
- Fixed false-success risk in remote Preview smoke tests: both Cloudflare Access-blocked branches in `tests/e2e/admin-preview.spec.js` now throw an explicit `BLOCKED_CLOUDFLARE_ACCESS` error instead of `test.skip()`. Commit: [7cc707c](https://github.com/chichute5500/Sindarealest-admin/commit/7cc707c6d1ac9d201fffb4daa292a24e6fef3b5c).
- Fixed workflow report precedence so `deployedPreview` prioritizes a recorded Access block instead of trusting the Playwright process exit alone. Commit: [30b9f33](https://github.com/chichute5500/Sindarealest-admin/commit/30b9f33d414fa51639ad979bbb2e4561cef3308b).
- Added handoff-integrity regression assertions and corrected their regex patterns. Commit: [8cfe44b](https://github.com/chichute5500/Sindarealest-admin/commit/8cfe44b896eefbf6f5fb0365fa51c78b2b6f5ba7). Live file reread confirms: no old blocked-`test.skip` branch; two explicit blocked errors; workflow status prioritizes Access-blocked state.
- Validation run [#39922500963](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39922500963) succeeded on exact tested code SHA `8cfe44b896eefbf6f5fb0365fa51c78b2b6f5ba7`: repository checks, automated tests, local source screenshot matrix, and deployed Preview diagnostic all succeeded. Artifact [admin-preview-evidence-390](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39922500963/artifacts/12488445570). Remote Preview log shows target `feature-admin-isolated-hando.sindarealest2.pages.dev/admin/`, `PASS_LOGIN_CSS_SIGNATURE`, and `2 passed`; no Access block was reproduced in this run.
- Evidence-only Actions commit: [1673508](https://github.com/chichute5500/Sindarealest-admin/commit/167350883c23e8a42612c6ac4d9c69515018d9ce). It updates evidence for tested SHA `8cfe44b...`; it is not a new application-code test SHA.
- Root cause of the older `BLOCKED_CLOUDFLARE_ACCESS` event remains **UNCONFIRMED**. Current successful Preview does not establish why a past run was blocked. Need logs from the exact failing run and matching Cloudflare Access events/hostname/time; do not infer from successful events on a different hostname.
- Scope remains unchanged: no Cloudflare policy/secrets/DNS changes, no Access bypass, no Production deployment, no merge, no remote D1/R2/schema changes. PR #111 remains open/unmerged; PR #108 is read-only; `main` unchanged. Product acceptance remains all 12 screens `PARTIAL_NOT_ACCEPTED`, exact reference parity `NOT_VERIFIED`, authenticated backend QA `NOT_TESTED`, remote D1 `NOT_VERIFIED`, Production `NOT_PERFORMED`.

## Previous checkpoint — 2026-10-23 07:01 UTC
- **Screen 12 mobile display bug fixed:** mobile audit-log table cells had existing `data-label` values but the shared mobile `td::before` rule rendered empty content. Updated `public/admin/index.html` to render `content: attr(data-label)` for `.activity-log-table` cells up to 680px, and added a Playwright assertion for all five labels: Time, Action, Entity, Actor, Details (Vietnamese UI labels: `Thời điểm`, `Thao tác`, `Đối tượng`, `Actor`, `Chi tiết`). No business data/API behavior changed.
- Source/test commit: `fa6937fea1a269a6b40de0e7f136ab969bd70a14` ([commit](https://github.com/chichute5500/Sindarealest-admin/commit/fa6937fea1a269a6b40de0e7f136ab969bd70a14)). Admin Preview workflow [#39914870835](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39914870835) **SUCCESS on the exact source/test SHA**; its dependency/project checks, `npm run check`, `npm test`, and responsive/theme Playwright matrix passed. Artifact [admin-preview-evidence-385](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39914870835/artifacts/12484820528) contains the new screenshots and test evidence. The 390×844 light screenshot confirms all five field labels are visible.
- Evidence-only child at checkpoint: `3f1b9f28d3f4b92600d752ab3de173c81940e0b0`. Workflow persisted the run report/diagnostics under `docs/admin-ui-reference/handoff/history/fa6937fea1a2/`; it does not represent another application change.
- Review scope also revisited Screens 4 (Product editor), 5 (Gallery), and 7 (Order detail) in artifact 384. No additional reproducible defect was confirmed from those screenshots; synthetic/unknown product, customer and order fields must remain unknown rather than being fabricated. Gallery's earlier responsive reachability and footer assertions remain covered.
- Deployed Preview diagnostic passed **only** the login CSS signature; it does not establish authenticated module workflows or backend persistence. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- Live safety boundary: PR #111 OPEN/unmerged at evidence child `3f1b9f28d3f4b92600d752ab3de173c81940e0b0`; PR #108 OPEN/unmerged/read-only at `44baa3926bf6acca0110689ce440e7da101047ed`; `main` remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. No merge or deployment.


## Previous checkpoint — 2026-10-23 06:26 UTC (superseded above)
- Validate [#39911090605](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090605) **SUCCESS** on exact source/test SHA `f2a3bee28523cc0ecb541a17b095c80acb2a4b31`: dependency audit, project integrity, `npm run check`, and `npm test` all PASS.
- Admin Preview [#39911090568](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568) **SUCCESS** on the same SHA. Responsive/theme matrix PASS. Artifact [admin-preview-evidence-383](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39911090568/artifacts/12482517911) records 132 generated PNGs (16 login + 116 distinct module screenshot files; 120 module capture entries) and 112 fixture metrics. All document horizontal-overflow metrics are false; page errors 0, failed requests 0, HTTP errors 0, attempted writes 0, unexpected API paths 0. Seven expected HTTP 503 console entries are from synthetic read-only retry tests.
- Deployed Preview diagnostic returned `PASS_LOGIN_CSS_SIGNATURE` only; it does not prove authenticated business workflows. Preview evidence is local source + synthetic/read-only fixture coverage.
- The two failing 360×800 checks were overstrict assumptions that the rail must overflow even when thumbnails fit. Both were corrected in tests only; no UI CSS was changed and the existing 320px scroll requirement remains.
- PR #111 OPEN/unmerged; PR #108 OPEN/unmerged/read-only at `97153b5351fadc0169205db20e3049a219f0bf7c`; `main` unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. B1 cleanup/provenance audit COMPLETE.
- Product acceptance is unchanged: all 12 screens `PARTIAL_NOT_ACCEPTED`; exact reference parity `NOT_VERIFIED`; authenticated backend QA `NOT_TESTED`; remote D1 `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## Historical source/Preview checkpoint


## Historical source/Preview checkpoint

## Historical source/Preview checkpoint — 2026-10-23 04:07 UTC (superseded above)
- Application source/test SHA: `000d3d84a9cf8c63144388f80879b5cc1439d161`.
- Validate [#39898454195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454195) **SUCCESS on exact SHA**; Admin Preview [#39898454274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274) **SUCCESS on that same SHA**.
- Artifact [admin-preview-evidence-369](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274/artifacts/12478285219) records 132 unique generated screenshot PNGs (16 login-shell + 116 distinct module PNGs), 120 module capture entries, 112 fixture metrics; ZIP includes the approved reference PNG. Expanded 320×640 / 360×800 mobile coverage passed alongside 390×844 and 1280×800 checks; measured fixture screens showed no horizontal overflow.
- Preview run first found a reproducible Screen 9 defect on prior SHA `640c100a9bdffbc6c2d30fb961cbe97145972151`: toast/nav gap was 6 px (bottom 558, nav top 564) while the test required at least 8 px. CSS offset changed from 82 to 84 px plus safe-area inset; the new exact-SHA run passed. Seven console log entries are expected from simulated 503 endpoint-failure/retry fixture paths; page errors and attempted writes: zero.
- Preview diagnostic reports `PASS_LOGIN_CSS_SIGNATURE` only. Screenshots use synthetic read-only fixtures and do not prove authenticated business persistence. The approved reference PNG was opened from the artifact for qualitative comparison, but full pixel parity remains **NOT_VERIFIED**.
- Live refs at this checkpoint: branch HEAD evidence child `1596bbd07c2257f19ecad9b2f77a7a45e9161cd0`; `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`; PR #111 OPEN/unmerged, 406 files (+39,536/-212), mergeable state `dirty`; PR #108 OPEN/unmerged/read-only, head `63079aabf853d6b4d492942020a71603754046d8`, 287 files. No merge or Production deployment.

## Concrete UI changes verified
- Screen 8 mobile customer card: added compact identity/order summary and details disclosure; fixed CSS specificity so desktop identity remains hidden on mobile. Playwright passed on `cd432ecd775129ee652bd0e127cfcea24e5d9e57`.
- Screen 9 mobile toast clearance: corrected the narrow-screen bottom offset from 82 px to 84 px plus safe-area inset after Playwright measured only 6 px clearance at 320×640. Validate and Preview passed on exact source/test SHA `000d3d84a9cf8c63144388f80879b5cc1439d161`; 320×640 and 360×800 are now included in the broader fixture matrix. This is layout evidence only; warranty backend actions remain untested.
- Screen 10 settings order: public price → welcome page → watermark → QR payment panel; earlier Validate/Preview passed on exact SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`.
- Screen 11 Backup/Restore is a dedicated route with desktop/mobile navigation; earlier Validate/Preview passed on exact SHA `5ba5bf69b71e3512491ece4023c886c056ced4fc`. Real export/import remains untested.

## B1 — complete
PR #111 provenance/cleanup review remains complete. No further deletions or API consolidation without new consumer evidence.

## Acceptance boundary
- All 12 screens: `PARTIAL_NOT_ACCEPTED`.
- Authenticated backend QA: `NOT_TESTED`.
- Remote D1 schema/ledger: `NOT_VERIFIED`.
- Exact reference-image parity: `NOT_VERIFIED`.
- Production deployment: `NOT_PERFORMED`.
- Migration 0009, PRE/PRO migrations, product-image/R2 persistence and AI image grouping: `DEFERRED_BY_OWNER`.

## Next actions
1. Continue remaining screen acceptance using artifact 367 and the approved reference where direct comparison is possible; fix only reproducible differences.
2. Obtain an authorized authenticated Preview path before testing persisted business workflows. Never bypass Cloudflare Access.
3. Keep all 12 screens PARTIAL_NOT_ACCEPTED until full behavior/reference evidence supports acceptance.
4. No merge/rebase/force-push, Production deploy, remote D1/R2/schema/ledger operations, or writes to PR #108/`main`.

## Kết quả kiểm thử tự động gần nhất

- Tested commit: 65aab3111d3f6fb752feafe1bff51b30bc48cb92
- Run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40002022790
- npm run check: PASS
- npm test: PASS
- Local source Playwright matrix: PASS; 132 real PNGs captured in artifact admin-preview-evidence-443 (not committed to Git).
- Deployed Preview: success.
- Source screenshot matrix: 132 real PNGs; login shell: 16; read-only fixture module screens: 120; fixture metrics: 112.
- Fixture screens use synthetic/read-only data and do not prove authenticated business-data workflows; those remain NOT TESTED.
- Production deployment: NOT PERFORMED.


# CURRENT VERIFIED CHECKPOINT — 2026-10-24

**Allowed branch:** `feature/admin-isolated-handoff-2026-10-20`  
**Exact source/test SHA:** `cac4999611feacecf80e9e980a8ace0dd45e6f3d`  
**Validate #5625:** PASS — [run 40070858136](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070858136)  
**Admin Preview #517:** SUCCESS on the same SHA — [run 40070858169](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070858169)  
**Screenshot artifact:** [admin-preview-evidence-517](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070858169/artifacts/12551172629)

## Verified changes in this checkpoint

1. **Warranty concurrency guard:** test-first regression reproduced a race where an order could change from `completed` between the preflight read and issuance. The atomic `INSERT` now rechecks `orders.status='completed'`. Regression test, `npm run check`, and `npm test` pass. Earlier exact-source evidence: Validate [40070485935](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070485935) and Preview [40070485982](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070485982), SHA `0d4eb3a8f5611ed1e712bba295598a021a6f4137`.
2. **Screen 7 at 320×640:** a test-only commit reproduced primary action width `28.6875px` with the secondary action taking `235.3125px` ([failing Preview run 40070706843](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070706843)). The narrow-width CSS now allocates a minimum width to “Cập nhật” and wraps the secondary action. The exact-SHA test and screenshot matrix pass on `cac4999611feacecf80e9e980a8ace0dd45e6f3d`; artifact 517 was downloaded and `order-detail__320x640__light.png` visually inspected.

## Scope and acceptance limits

- Authenticated Preview **read-only** checks: 7/7 Admin GET routes returned HTTP 200. Product list: 235 products; 527 relative image URLs decoded; list pagination, filters, and product detail/editor loading passed. No product mutations or Admin writes were made by the diagnostic.
- The screenshot matrix and fixtures are local/synthetic UI evidence. Orders, customers, warranties and audit-log responses were empty in the live read-only check. No authenticated business-write/persistence QA is claimed; remote D1 schema/ledger remains unverified.
- Progress remains **50% PROVISIONAL**. All 12 reference screens remain `PARTIAL_NOT_ACCEPTED`; approved-reference parity `NOT_VERIFIED`; authenticated business-write QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.
- PR #111 stays OPEN/unmerged and GitHub reports it is not mergeable yet. PR #108 is read-only; PR #112 remains separate/draft. Do not merge, rebase, cherry-pick, force-push, modify `main`/storefront, run remote D1 writes/migrations, or deploy Production. Never alter Cloudflare Access, secrets or DNS.

## Continue immediately

1. Continue the next independent reference-driven UI audit using artifact 517; only add a fix after a reproducible discrepancy and regression test.
2. Keep PR #111 conflict analysis read-only until a safe, branch-isolated resolution is demonstrable; do not merge/rebase to clear the “dirty” state.
3. Continue read-only checks and report business-write QA as blocked/not tested until an explicitly authorized safe test path exists.

This checkpoint supersedes stale status/next-step text below; historical records remain for traceability.

---
