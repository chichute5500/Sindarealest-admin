# Instructions for AI: use the ADMIN UI reference

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


## Latest handoff update — 2026-10-21 (owner request: update handoff files and prompt)

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
