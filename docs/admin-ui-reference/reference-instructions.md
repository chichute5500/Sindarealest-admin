# Instructions for AI: use the ADMIN UI reference

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T16:32:00+07:00

- **ADMIN branch HEAD trước commit bàn giao này:** `06e679cb8502a1e657331d6b6fd204dcc86b91c9`; source-code commit gần nhất được kiểm tra là `d1047c6e898a5995295f8ce7e6191674207c4fe3`. Không được gộp nhầm source SHA với evidence/docs-only HEAD.
- **Validate Source** [#39755520563](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39755520563) **SUCCESS** trên `d1047c6e898a5995295f8ce7e6191674207c4fe3`.
- **Admin Preview diagnostic smoke test** [#39755520573](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39755520573) **FAIL** trên cùng `d1047c6e898a5995295f8ce7e6191674207c4fe3`, bước lỗi: `Capture real source screenshots across responsive and theme matrix`. Chưa xác minh được nguyên nhân gốc ở checkpoint này; không gọi đây là Preview PASS. Cần mở job log và sửa assertion/implementation dựa vào lỗi cụ thể, không nới lỏng kiểm tra.
- **Thay đổi UI mới nhất:** custom checkbox SKU xác minh (focus-visible, light/dark, reduced-motion) và Playwright assertion checked/unchecked. Lần Preview trước đó #39754867245 fail vì assertion so màu với CSS custom property `--accent` không tồn tại tại root; đã sửa màu explicit theo theme. Nhưng run mới #39755520573 vẫn FAIL nên thay đổi checkbox chưa được chấp nhận cho đến khi log mới được đọc và test xanh.
- **Kết quả đã xác minh trước đó, không phải trạng thái CI mới:** artifact [admin-preview-evidence-300 / 12413849768](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39753005347/artifacts/12413849768), source SHA `4ba76894734e3cc83615f0d91eb7663bcb0b25d4`, 99 PNG/75 metrics và 20/20 scroll-to-end geometry checks PASS trên 5 màn, 2 viewport, 2 theme. Không dùng artifact cũ để tuyên bố source hiện tại đã đạt Preview.
- **Tiến độ giữ 50%.** Screen #3 PARTIAL/NOT ACCEPTED; 12-screen visual parity NOT ACCEPTED; authenticated backend/business QA NOT TESTED; AI grouping #11 BLOCKED chờ contract được duyệt; R2 image save và PRE/PRO migration DEFERRED_BY_OWNER.
- **PR #111 ADMIN và PR #108 static vẫn OPEN/unmerged.** Chỉ nhánh ADMIN; không sửa main/static, không merge, không deploy Production, không bypass Access/secrets, không ghi D1/R2 hoặc chạy migration thật.
------


## CURRENT VERIFIED CHECKPOINT — 2026-10-22T15:52:00+07:00

- ADMIN branch HEAD: `dcb60b39d5813b82fabeab0f390826e558e7e676` (evidence-only descendant); exact source/test SHA: `78b87d71f82090cb7399a68207ef436a200d3c9f`.
- Validate Source [#39750503800](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39750503800) **SUCCESS** and Preview/Playwright [#39750503783](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39750503783) **SUCCESS** on the exact source/test SHA.
- Artifact [admin-preview-evidence-299 / 12413611086](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39750503783/artifacts/12413611086): 99 PNGs (16 login + 83 fixtures), 75 metrics; matrix passed eight viewports in light/dark.
- Preview is `PASS_LOGIN_CSS_SIGNATURE` only, not real authenticated backend/business QA. 12-screen parity NOT ACCEPTED; backend QA NOT TESTED; AI grouping #11 BLOCKED; R2 image save and PRE/PRO migrations DEFERRED_BY_OWNER.
- Progress remains **50%**. Only ADMIN branch; PR #111/#108 OPEN/unmerged; no main/static edits, Production deployment, Access/secrets bypass, or remote D1/R2/schema/migration writes.
- The dated status block below is historical. Always fetch live HEAD and workflow runs before editing.

## Goal
Redesign and audit the SinDarealest ADMIN interface to align with the approved mobile visual reference while preserving existing business logic, API contracts, authentication and backend behavior. The public/static website is being developed by a separate AI and must not be overwritten.

## Repository and branch isolation — mandatory
- Repository: `chichute5500/Sindarealest-admin`.
- Protected static website branch: `fix/liquid-glass-audit-2026-10-19`.
- ADMIN work branch: `feature/admin-isolated-handoff-2026-10-20`.
- Before any edit, verify the current branch, HEAD SHA, `git status`, remote and uncommitted changes. Edit/commit only on the ADMIN branch.
- The ADMIN branch was created from the static branch at the time of separation. This is a starting point only; it is not permission to edit static-site files.
- Do not commit to the static branch or `main`; do not force-push, auto-merge, cherry-pick or deploy.
- Do not automatically sync new static-site commits into the ADMIN branch. Compare SHAs/diffs and request explicit direction before syncing.
- If the current branch is wrong or uncommitted changes could be overwritten, stop risky Git operations and report the blocker. Never reset, stash, revert or discard someone else's work blindly.

## Protected scope
- Work on ADMIN routes/components/styles and ADMIN-specific tests.
- Do not redesign or change the public storefront, homepage, public product cards/detail, cart/checkout, public navbar/footer, Liquid Glass background/effects, public theme system, typography or public responsive layout.
- If a file is shared between ADMIN and the public site, document the dependency and impact before changing it. Prefer an ADMIN-only adapter/component. If safe isolation is not possible, mark the task BLOCKED and continue independent work.
- Shared API/auth/D1/R2/Workers code may be changed only when necessary, after recording rationale, expected impact, test plan and rollback approach. Do not change schema, secrets, bindings, production data or Cloudflare configuration without separate explicit authorization.

## Required workflow
1. Open `admin-mobile-reference.png` first. The standalone `admin-mobile-reference.html` is an alternate viewer.
2. Inspect the current ADMIN implementation and identify framework, routes, components, styles, API calls, authentication, and D1/R2/Workers integrations before editing.
3. Preserve all existing functions and backend contracts. UI changes must not silently remove features, alter schemas, weaken authentication, or change API semantics.
4. Follow the reference's luxury-minimalist liquid-glass direction and pale ice-blue/pearl palette. Suggested starting colors: background `#eaf3fb`, navy text `#142a3c`, blue accent `#5c91b9`. Treat these as design guidance, not permission to replace brand assets arbitrarily.
5. Prioritize Android/mobile layouts, responsive behavior, Vietnamese diacritics, readable contrast, rounded surfaces, consistent spacing, clear pressed/focus states, and both light/dark modes.
6. Test actual working flows, including login/logout, product CRUD, price visibility, image handling, orders, customers, warranty/support, settings, backup/restore, and logs wherever these features exist. Do not invent missing features or data.
7. Capture real screenshots of the running test ADMIN at matching viewport sizes. Compare them against the reference, fix meaningful differences, and repeat.
8. Run available lint, type-check, build, and automated tests. Report exact commands and results; never mark unrun tests as passing.
9. After every complete edit-test-screenshot-comparison iteration, update status, JSON results and history on the ADMIN branch, then verify the commit.
10. Before final report, inspect the full diff and ensure no accidental public-site or unrelated changes are included.

## Completion report
For every task, mark PASS, FAIL, BLOCKED, or NOT TESTED; include evidence, file paths, test results, known limitations, and exact commit SHA. Clearly state that no merge to the static website branch/main and no Cloudflare production deployment occurred.


## Historical handoff checkpoint — 2026-10-21 (superseded by current checkpoint above)

### Current verified state
- Work is restricted to `feature/admin-isolated-handoff-2026-10-20` in `chichute5500/Sindarealest-admin`. Current application/test SHA remains `45f630e99cfd1dd047c234f0fb42fa197d9bc978`; gallery CSS source commit `1fb56f7b5773876c581847bf44abbef1c5c16a67`; regression test commit `45f630e99cfd1dd047c234f0fb42fa197d9bc978`.
- GitHub Actions run [#157](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39615192697) and [#158](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39615417216) were observed as successful on their exact respective SHAs. Checks: `npm run check`, `npm test`, local Playwright responsive/theme screenshot suite and configured Preview diagnostic. This does not mean authenticated backend flows or all 12 reference-screen groups are accepted.
- Latest UI iteration: mobile product gallery gives the first image a full-row cover treatment; CSS contract tests cover mobile fit, narrow-screen fallback, dark theme and accessible reorder control. Artifact #158 includes 59 source/fixture screenshots (16 login shell, 43 synthetic read-only module views) and 36 fixture metrics. This is fixture/screenshot evidence, not authenticated real-data QA.
- **Overall progress remains 48%.** All-12-screen visual parity: NOT ACCEPTED. Authenticated business/backend flows: NOT TESTED. Real product image upload/save: DEFERRED_BY_OWNER / NOT VERIFIED.
- Read-only PR review: PR [#111](https://github.com/chichute5500/Sindarealest-admin/pull/111) OPEN/UNMERGED, base main, mixed scope including admin UI, storefront `public/index.html`, API Functions, migrations and setup/deploy scripts; not merge-ready. PR [#108](https://github.com/chichute5500/Sindarealest-admin/pull/108) remains OPEN/UNMERGED. Re-fetch live PR metadata and file list before making any scope claim; handoff edits alter PR diff statistics.
- Source-only payment review found a possible deployment-readiness mismatch: `scripts/setup-cloudflare.mjs` does not reference migration 0009, and `scripts/deploy-cloudflare.mjs` does not preflight the 0009 payment fields/tables although payment routes use them. This is a **potential blocker, not proof of a missing remote migration**. No remote D1 schema read/write, SQL, migration, setup script, R2 action or deployment was performed.
- QR/payment source routes were inspected read-only; their source-level contracts include admin auth, pending-only QR upload/explicit activation, server-derived payment amounts, confirmed price/terms and token-scoped public payment. Existing tests use source assertions/mocked D1, not live backend proof. A known static-website integration gap remains documented; do not patch the website branch from this admin branch.
- Product image-save and PRE/PRO migration issues remain explicitly deferred by the owner.

### Immediate next work
1. Re-fetch the live branch HEAD, PR #111/#108 metadata and latest Actions; distinguish code SHA from docs-only handoff commits.
2. Continue the 12-screen visual reference audit, prioritizing mobile product gallery, image controls, accessible names/focus/keyboard, reduced-motion and narrow screens. Mark each screen PASS/FAIL/BLOCKED/NOT TESTED with screenshot evidence.
3. Continue read-only semantic PR #111 review. Identify unrelated website/API/migration/setup/deploy scope and concrete security/behavior risks; do not merge, retarget, split or edit other branches without authorization.
4. For every application-source change, run CI against that exact SHA and verify run conclusion before claiming PASS. Update `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-COMPLETENESS-AUDIT.md`, `PROMPT-NEXT-CHAT.md`, `START-HERE.md`, `MASTER-PROMPT-AUTO-HANDOFF.md`, `reference-instructions.md`, and the QR/payment contract when relevant.
5. If any owner action is required, ask only for that exact action. Otherwise continue autonomously.

### Safety boundaries — mandatory
- Only work on `feature/admin-isolated-handoff-2026-10-20`; never edit `main` or the static website branch.
- No merge/cherry-pick/force-push; no Production deploy.
- No secrets/Cloudflare Access changes or bypass; no remote D1/R2 operations; do not execute setup/migration scripts; do not use TinyFish.
- Do not resume product image-save or PRE/PRO migration work unless the owner explicitly reauthorizes it.


## Latest verified checkpoint — 2026-10-21 21:45 ICT

- Mobile product gallery footer alignment was fixed in `public/admin/index.html` (source commit `cc77869873c2f5b4b2d1118dc60c0d88413eb218`), with a Playwright geometry regression test (`a2c6bd4b867c0b23ef5d026a1cff99b3c2e8123e`) and CSS contract assertions (`5f73373094ba71f467374e8b026bbfc3c5059fec`).
- Exact tested tree `a999bfdc529ea38c5309ebfbff33a45c6779c10b`: [Validate #3905](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39618556696) and [Preview diagnostics #162](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39618556737) both PASS. Run #162's evidence artifact is `admin-preview-evidence-162` (ID `12354480678`); review `product-gallery__390x844__light.png` and dark counterpart. Footer now reaches the dialog edge; the final gallery image sits above it.
- Still not accepted: all-12-screen visual parity. The approved product-image screen has a horizontal thumbnail rail and richer image-status controls that the current grid/card layout does not yet match. Continue this comparison rather than marking visual completion from passing CSS tests.
- Authenticated backend QA remains NOT TESTED. Real product image upload/save and PRE/PRO migrations remain DEFERRED_BY_OWNER / NOT VERIFIED. QR/payment source audit is source-only; the public static consumer gap remains the static branch's responsibility. Deployment scripts' migration-0009 coverage risk is documented; do not execute setup/deploy/migration scripts or perform remote D1/R2 operations.
- PR #111 remains OPEN/UNMERGED and mixed-scope (1,112 changed paths); PR #108 remains OPEN/UNMERGED (269). Progress remains 48%. Only ADMIN branch; no merge, Production deploy, main/static branch edits, secrets/Access changes/bypass, remote D1/R2 operations, or TinyFish.


## Accessibility verification update — 2026-10-21

- Reduced-motion E2E is now browser-verified on source/test SHA `131d6f395a94ef82b8d1d827fb5f000ab92df60e`, run [#39629076142](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39629076142). The test emulates `prefers-reduced-motion: reduce`, serves synthetic GET-only fixtures, rejects all mutation requests and checks selected interactive layers' transition/animation durations and scroll behavior.
- A prior failure was traced to Playwright selectors that incorrectly assumed dashboard elements were nested under `#main`; the rendered source injects these elements into `#appView`. Test selectors were corrected and the exact-SHA browser suite passed. No app CSS/business code was changed for that fix.
- This is a focused accessibility audit, not full visual acceptance. Continue measuring keyboard/focus behavior, target sizes, theme contrast, reduced-motion across additional modules, and reference parity separately. Do not label all 12 screen families PASS based on this one E2E test.
- Current acceptance remains: 12-screen parity NOT ACCEPTED; authenticated real backend NOT TESTED/BLOCKED BY ACCESS; image-save and PRE/PRO migration DEFERRED_BY_OWNER. Overall progress remains 48%.


## Product editor keyboard verification — 2026-10-21

- Exact-SHA Playwright run [#39630533169](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39630533169) on source/test SHA `32c1f28662e7240353b0eda2f5daeaf22359257e` passed. The product-editor tablist test covers ArrowLeft/ArrowRight and Home/End, asserting focus placement and `aria-selected` state.
- The same 3-test static baseline passed dialog focus trapping/restoration, reduced-motion checks, source screenshot matrix and configured Preview login CSS signature. Fixture/API data is synthetic/read-only.
- This remains PARTIAL accessibility evidence, not global acceptance: continue testing focus/name/target sizing screen-by-screen and keep all-12-screen visual parity NOT ACCEPTED until direct reference comparisons pass.


## QR settings accessibility and guard verification — 2026-10-21

- Browser test [#39632306588](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39632306588) on exact source/test SHA `0b9e8a2f6a734ef328726c9c80e8e0e56328ce55` passed a synthetic/read-only Settings QR check. It verifies bank controls, accessible scan-verification checkbox, inactive-state deactivate disablement, and the unsaved bank details guard. No non-GET API call is allowed by the fixture router.
- The first attempt failed only because the test reused a warning message between responsive variants. The test now navigates away and returns to Settings before each variant; retry passed without application source changes.
- This adds partial evidence for QR settings UI and guard behavior only. Do not claim real QR upload, bank-account validation, payment ledger, authenticated backend, or cross-branch runtime acceptance from these fixture screenshots. Overall progress remains 48%; full 12-screen parity remains NOT ACCEPTED.


## Order payment readiness and backup controls — 2026-10-21

- Exact Playwright source/test SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff` passed in [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359); source CI [#39633278598](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278598) also passed.
- Order fixture confirms payment request and receipt controls stay disabled while price/terms are unconfirmed. Backup/restore fixture checks the export button, JSON restore input and confirmation disclosure without invoking an operation. All API mutation requests are blocked by fixture route.
- Artifact #192 ID `12360132558`: 63 source/fixture PNGs, 39 metrics, no errors or attempted writes. This is a targeted UI safety check; do not treat it as authenticated business-flow QA or visual acceptance of the whole 12-screen reference.


## Warranty screen reference follow-up — 2026-10-21 16:47 UTC

- Tested source/test SHA `f2df0a923080135c5fe92ee2021c76137305699c`: Validate Source #39637611840 PASS; Admin Preview/Playwright #39637611768 SUCCESS. Artifact #197 (ID 12362111591) includes 63 source/fixture PNGs and 39 metrics, with no recorded browser/console/request/HTTP errors or attempted writes.
- Reference screen #9 was actually viewed alongside 390×844 light/dark and 1280×800 light captures. The warranty screen now has list-first search/filter, accessible issue disclosure and a one-line mobile order ID. Reference-card thumbnails and customer/date detail composition remain a visual gap; status PARTIAL only.
- Synthetic source fixture, not authenticated backend QA. Do not fabricate thumbnails. All-12-screen parity remains NOT ACCEPTED; product-image-save and PRE/PRO migrations remain DEFERRED_BY_OWNER.
