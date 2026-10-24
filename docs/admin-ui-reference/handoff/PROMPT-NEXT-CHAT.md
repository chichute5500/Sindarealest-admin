# PROMPT NEXT CHAT — SINDAREALEST ADMIN

## VERIFIED QA ACCEPTANCE UPDATE — 2026-10-24T16:26:00Z

- **Overall acceptance progress: 50% PROVISIONAL** (unchanged). All 12 screens `PARTIAL_NOT_ACCEPTED`; approved-reference pixel/same-data parity `NOT_VERIFIED`; Production `NOT_PERFORMED`. CI and screenshot capture success alone do not constitute visual or full business acceptance.
- **Exact feature test SHA:** `d13dd92b75a392acf7cae3eddf1df971a86b9b62`. All six latest workflows on this SHA PASS: Validate (push and PR), PR Admin Preview Playwright, PR isolated Preview Playwright, source+fixture diagnostic, and owner-approved synthetic D1 QA with cleanup. PR #111 remains OPEN/unmerged; #108 read-only; #112 OPEN/DRAFT untouched. No new Cloudflare Pages deploy check was observed for the QA commit.
- **Isolated Preview deployed application SHA:** `564ea556e6dee745eaaa491ee033a2a8cfbb595c`, [owner-approved deploy #40106880423](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40106880423) PASS and [post-deploy Cloudflare metadata check #40107164294](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40107164294) `REPORTED_SHA_MATCH`. Changes since deployed SHA are QA workflows/tests/scripts and handoff documentation, not `public/` or `functions/`; do not imply a new deployment of the QA-only HEAD.
- **48/48 authentic Preview screens captured:** [strict QA run #40111072318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40111072318), artifact 12566034958. Verified all 12 screens at 390×844 light/dark and 1280×800 light/dark. Each of 4 matrices records 12/12 `CAPTURED_NOT_ACCEPTED`; 0 document-level horizontal overflow, 0 measured unlabeled interactives in scanned main content. This is layout/capture evidence, NOT exact approved-reference parity.
- **Product business-write partial acceptance:** [owner-authorized QA run #40111472681](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40111472681), artifact [12566487432](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40111472681/artifacts/12566487432) PASS. One run-owned QA product was changed using authenticated Admin `PUT /api/admin/products/:id`; subsequent authenticated GET and isolated D1 direct readback verified updated title, integer price and stock. This is **PRODUCT_WRITE_PERSISTENCE_QA_PASS**, not orders/ledger/warranty/backup acceptance.
- **Cleanup proven in final artifact:** The final manifest for QA #40111472681 persists `authenticatedAdminSaveVerified=true`, `d1ReadbackVerified=true`, `cleanupVerified=true`, `failures=[]`. Seven run-owned QA record IDs were deleted and found absent after cleanup in both primary and final-best-effort cleanup steps; no real customer/payment records overwritten. The earlier fixture runs #40109162506 and #40110305263 also verified zero remaining QA rows.
- **Remote Preview D1 schema/ledger shape read-only verified:** [workflow #40110704947 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40110704947), artifact 12566007654. Preview D1 binding distinct from two Production bindings; 9 relevant tables and selected required columns verified with `PRAGMA table_info`, including payment request and transaction ledgers. Run-owned QA product and audit entry from #40110305263 were absent. This does **not** verify actual payment transactions, bank receipts, migration-history ledger records, or back-office refunds.
- **Visual-reference acceptance blockers:** Reference montage shows different sample data and an email/phone + password mock login, while live Admin intentionally uses password-only authentication; screen 2 example revenue graph vs live empty truthful state, plus density/layout differences on several screens. Do not fabricate example sales, replace real product content with fixture placeholders, change authentication contracts or mark parity PASS merely because all screens render.
- **Still untested:** authenticated order status/price business-write persistence, customer and warranty lifecycle writes, receipt/refund ledger scenarios, backup/restore destructive workflow, and same-data approved-reference visual parity. No Production deployment, merge, Cloudflare config/secrets change, remote schema migration, R2 write or real financial transaction was performed.


## LIVE 12-SCREEN QA CHECKPOINT — 2026-10-24T15:56:46Z

- **Exact QA/test SHA:** `996d1208b9529a714e9f46de4dedd5905e7eea6e`; deployed `public/` + `functions/` app remains owner-approved `564ea556e6dee745eaaa491ee033a2a8cfbb595c`. GitHub comparison confirms no app/function changes; only QA workflows/scripts/tests plus historical docs differ.
- **Isolated database preflight:** [read-only #40108515818](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40108515818) established `ISOLATED_DB_BINDING_VERIFIED`; Preview D1 differs from both storefront Production D1 and Preview project Production D1. No database IDs disclosed or Cloudflare configuration modified.
- **Owner-approved synthetic live QA:** [run #40109162506 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40109162506), [artifact 12565629211](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40109162506/artifacts/12565629211). **48/48 full-page browser screenshots captured**: all 12 actual authenticated Preview screens at 390×844 and 1280×800, both light and dark. Each of 4 screen tests PASSED. 0 document-level horizontal overflow observations, 0 visibly unlabeled interactive elements in scanned main areas, 0 Admin business mutation requests from browser capture.
- **Synthetic D1 fixture lifecycle:** seven run-owned QA records (hidden product, test customer, test order, order item, warranty, claim and audit row) inserted only into the independently isolated Preview DB, read via the actual Admin UI, then deleted by exact QA IDs in reverse dependency order. **Verified 0 run-owned rows remaining in all seven tables**, twice; QA cleanup artifact says `cleanupVerified=true`, `failures=[]`. There were no test payment-ledger records or R2 uploads. The QA records were NOT real customer orders/payments; no user business records were overwritten. Authenticated Admin API **business-write/persistence acceptance is still NOT_TESTED**: this cycle seeds directly into isolated D1 and verifies browser reads/cleanup, not Admin save/payment operations.
- **Visual review:** Approved reference `docs/admin-ui-reference/admin-mobile-reference.png` vs 390×844 live screenshots shows design differences: the reference login has email/phone, remember/forgot UI whereas deployed login uses an intentional password-only auth contract; reference emphasizes navy monogram/card imagery while deployed build uses a gold monogram and denser catalog controls; reference revenue chart has sample values but deployed dashboard shows a truthful no-verified-revenue empty state. Synthetic text/image contents and reference mock phone frames are NOT same-data pixel parity evidence. Do not silently change auth/business truth to match mockup. Screens 1–12 remain `PARTIAL_NOT_ACCEPTED`, parity `NOT_VERIFIED`.
- **Non-blocking visual-capture limitation:** a transient `Đăng nhập thành công` toast overlays part of early screenshots; cleaner screenshot timing should be tested without changing business UI.
- **PR/production:** #111 OPEN/unmerged; #108 read-only; #112 draft untouched; no merge/rebase/Production deploy. No further isolated Preview deploy performed here. **Progress remains 50% PROVISIONAL**. Next safe work: deterministic screenshot clean-up and targeted same-data reference checks; then guarded authenticated business-write/persistence QA on isolated D1 using run-owned IDs and compulsory cleanup, without treating test data as real transactions.


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
