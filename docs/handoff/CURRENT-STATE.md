# CURRENT STATE — SINDAREALEST2 STATIC STOREFRONT
Updated: 2026-10-23 — owner-confirmed report-then-continue protocol

## Read this file first
**FAIL-CLOSED OVERRIDE:** This file and `TASKS.md` override every pasted/copied prompt and older chat handoff. If any instruction conflicts with the owner decision below, do not perform the conflicting action. In particular, Hero is PAUSED: do not inspect, modify, test, redesign, restore, or change Hero HTML/CSS/assets until the other storefront work is complete or the owner explicitly reopens it.
This is the single current source of truth. Re-fetch GitHub state before acting; never treat a SHA copied into a document as the live branch HEAD.

## Repository / safety
- Repository: `chichute5500/Sindarealest-admin`
- Working branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, NOT MERGED. Never merge unless the owner explicitly changes this instruction.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production is out of scope: no Production deploy, `main`, DNS, D1/R2 data/config, bindings, secrets, Access policy, Admin branch, backend/API/auth/business logic, or product/catalog data changes.

## Owner's latest decision: Hero temporarily hidden — PAUSED BY OWNER
- Owner's latest instruction: leave Hero unchanged for now; return to it only after the other storefront work is completed. This is a pause, NOT visual acceptance/PASS. Do not edit Hero markup/CSS/assets or run Hero-specific redesign during this pause.
- `public/index.html` keeps `#heroProductImage` hidden, removes `src`, and marks `temporarily-disabled-owner-request`.
- Preserve the owner-uploaded source `public/images/hero-upload/tb_image_share_1792519964514 (1).png` and its separate derivative. Do not delete, overwrite, rename, or associate either with a catalog product.
- Do not restore obsolete `hero-sd-gl052.png`. Do not resume Hero design work until the owner asks.
- Future Hero acceptance condition, to revisit only after the other storefront work is complete: no empty frame, reserved blank space, or responsive Light/Dark regression. Do not inspect or change this during the current pause.

## Owner-approved working protocol (2026-10-23)
- Work one acceptance item to completion before switching to the next main item.
- Mandatory report-then-continue: a report is not a stopping point. Immediately perform the next safe action for the same active task. While CI/deploy/capture runs, do independent, non-conflicting preparation/inspection and then inspect the result. Never wait for the owner to say “continue.” Stop only for a genuine owner decision/visual acceptance, missing permission, or a real external blocker; continue independent safe work while blocked.
- Reuse valid checks for unchanged code and run only missing/stale/impacted checks. Never duplicate a workflow or apply a result to a different SHA.
- Keep separate gates for source tests, deployment SHA, live screenshots, and owner visual acceptance.
- Owner-confirmed PASS locks that item until explicit permission to reopen. Do not ask the owner to approve these already-agreed process rules again.

## Latest branch / workflow evidence (exact SHA only)
- Latest code/workflow-changing commit: `51e6f937b56c9c8ff04f4bbfd82298c3f8307d02`. It changes only four workflow files under `.github/workflows/`; the subsequent handoff refresh is documentation-only. Always re-fetch the live branch HEAD before acting; do not infer it from this file.
- Source integrity, dependency audit and full automated tests: PASS on this exact SHA — [run #39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405).
- The workflow-only push correctly triggered source validation only. Preview deploy, live screenshot capture and Admin smoke were not launched by this commit; do not claim the current HEAD is deployed or visually accepted.
- Latest recorded successful Preview deploy before this workflow-only commit: [run #39842480998](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480998), SHA `33e09dd2bce4c4be1df23c65a47d93217d2153b7`. Related Liquid Glass audit: [run #39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928), same SHA. These old results do not replace a fresh check of the alias/deployment metadata or human inspection of screenshots.
- Workflow trigger optimization is now applied: docs/root README-only changes skip full CI; workflow-only changes skip deploy and expensive visual capture; Admin Preview smoke is manual-only; stale source-test and ordinary visual-review runs are superseded by newer work. Deliberate start/end screenshot archives stay in a separate serialized concurrency group and are not automatically cancelled.
- Previous runs showed rapid stale-commit churn, including cancelled Admin smoke runs such as [#39842480951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480951) and [#39842289407](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842289407). These are historical evidence of the inefficiency, not current failures.

## Latest owner decision (2026-10-23)
- Owner confirmed Hero must remain untouched temporarily; resume Hero only after completing the other storefront work. `TASKS.md` now puts non-Hero visual-audit work next. This owner decision supersedes any older instruction to verify/adjust the hidden-Hero layout immediately.

## Latest evidence review (2026-10-23)
- Inspected artifact `12453971973` from visual workflow [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928). Local fixture audit passed with no hard failures, but it is not live Preview evidence.
- The artifact's live deployment metadata check failed closed: expected `33e09dd2bce4c4be1df23c65a47d93217d2153b7`, matched deployment `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d`. The compare shows only two documentation files changed between these SHAs; nevertheless, no exact-SHA live screenshot was accepted by that run.
- Current source already includes the hidden-image status, no-src behavior, collapsed visual frame, single-column fallback and regression assertions. Do not make another CSS change based only on the local screenshot without verified evidence of a real layout defect.
- The Preview URL could not be opened through the available web viewer. Actual live Preview visual evidence and owner acceptance remain pending.


## Follow-up real Preview access probe — 2026-10-23

- Pre-update branch recheck: PR #108 was OPEN/unmerged at HEAD 4ff25f02ec8255b98a6db1583c6d473a7c40a0bb; that commit changes only handoff documentation. The last code/workflow-changing commit remains 51e6f937b56c9c8ff04f4bbfd82298c3f8307d02; source/test evidence must still be interpreted by its exact SHA.
- A read-only external browser fetch of the Preview alias returned a Cloudflare Access sign-in page (title "Sign in ・ Cloudflare Access", heading "Log in to sindarealest2 - Cloudflare Pages") rather than storefront content. This proves the unauthenticated browser path is Access-gated; it does not prove the Preview deployment is down. No authentication bypass was attempted.
- Existing screenshot workflow [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928) passed its local fixture only (58 screenshots, 235 fixture products, 20 responsive cases, 101 interaction checks; zero overflow/console/page/HTTP errors, no hard failures). Its deployment-verification step failed closed: expected 33e09dd2bce4c4be1df23c65a47d93217d2153b7, while the alias-matched deployment reported d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d; real Preview screenshot capture/archiving did not pass.
- Reviewed the available local non-Hero captures for the home viewport, product grid, order-assurance/process, and relevant product/contact sections. No concrete non-Hero visual defect is substantiated by this fixture evidence, so no storefront source/CSS was changed.
- Next action: use an authorized Preview-only access path and verify the exact deployed branch/SHA before capturing non-Hero sections. Do not bypass Access. The existing comprehensive visual workflow requires Hero coverage; do not run that full capture while Hero is paused. If an authorized non-Hero-only capture cannot be run, continue source/test review outside Hero without speculative UI changes.


Continued safe work after the Preview access blocker: completed a read-only static markup/accessibility-oriented scan of the current storefront source outside any Hero editing. It found no confirmed non-Hero defect, so no storefront code was changed. Details and limits are recorded in TEST-RESULTS.md. This does not replace authorized live Preview capture or owner visual acceptance.

## Session recheck — 2026-10-23 (snapshot before evidence update)

- PR #108 remained OPEN and unmerged. The branch HEAD at this recheck was `3f53e0cf7519ae0c5d0be022657845d5eb0f414b`, a documentation-only handoff-pointer commit. Re-fetch the live HEAD before future changes.
- Blob SHA for `public/index.html` is `d54ed03b0f40e70d02582ab3731e708b25198ffd` at current HEAD, successful Preview-deploy source `33e09dd2bce4c4be1df23c65a47d93217d2153b7`, and the alias-matched deployment SHA `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d` recorded in artifact `12453971973`. `tests/product-card-liquid-glass.test.mjs`, `tests/storefront-reference-parity.test.mjs`, and `scripts/capture-liquid-glass-preview.mjs` also have identical blob SHAs at those refs. The commit-SHA mismatch is not evidence that the storefront HTML changed.
- The latest source-and-tests workflow available for this branch is [run #39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405), PASS on `51e6f937b56c9c8ff04f4bbfd82298c3f8307d02`. The subsequent branch HEAD change was documentation-only; no storefront-source/test file changed.
- Artifact [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928), artifact `12453971973`, reports local-fixture `passed: true`, `hardFailures: []`, and no console/page/HTTP/failed-request errors. Screenshots are from `http://127.0.0.1:4173`, not the live Preview. The deployment check embedded in that artifact failed closed: it expected `33e09dd2bce4c4be1df23c65a47d93217d2153b7` but matched deployment SHA `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d`.
- Local-fixture captures for non-Hero product grid, cart, checkout, order process, and contact/warranty were reviewed. No concrete non-Hero visual defect is supported by that artifact, so no storefront source/CSS was changed. Exact-SHA live screenshot evidence and owner visual acceptance remain PENDING. The web viewer could not fetch the Preview alias and the container network could not resolve it; that is an inspection-path limitation, not evidence that the site is down.

## Immediate next actions
1. Re-fetch current HEAD, PR #108, Actions and Cloudflare deployment metadata before any new source change.
2. Keep Hero paused and untouched; preserve its owner-uploaded source/derivative.
3. Continue the next unfinished non-Hero storefront section from current source/tests/evidence. Identify a concrete issue before editing; complete one section at a time and run only impacted checks. After each report, keep executing rather than waiting for another instruction. Never deploy Production or touch Admin/backend/catalog data.
4. Before handoff, reconcile `CURRENT-STATE.md`, `TASKS.md`, the active prompt and the visual-audit pointer; archive obsolete instructions instead of leaving contradictory active directions.

## Evidence rules
- Source tests, deploy, deployment SHA, live screenshot capture and human visual acceptance are separate gates.
- PASS must be tied to exact relevant SHA/deployment. Automated tests alone do not prove visual acceptance.
- Preserve historical evidence, but never treat old SHAs, run IDs, URLs, blockers or percentages as current.

## Minimal read order
1. `docs/handoff/CURRENT-STATE.md` (this file)
2. `docs/handoff/TASKS.md` (active task ledger)
3. `docs/handoff/DECISIONS.md` only for relevant owner/scope decisions
4. `docs/handoff/TEST-RESULTS.md` for specific evidence
5. `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md` only when a new-chat prompt is needed

Files labelled historical/archived are context, not active instructions.


Latest verified handoff (2026-10-23): PR #108 remains OPEN/unmerged. Source/test and Preview deployment passed at `0f7151a95391fbe55c59d6c426b458f6e075d7ce`; the full visual workflow is guarded and was skipped. Gallery accessibility fix and Hero capture guard are committed. Live non-Hero screenshots and owner visual acceptance remain pending. Hero remains paused.


## Verified non-Hero order-section live capture — 2026-10-23
- Branch HEAD at capture: `cb8901b7218964e0609b5048a9ea28bfb52c42f7`; PR #108 remained OPEN and unmerged.
- Source/test CI PASS on that exact SHA: [run #39894447637](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447637).
- Isolated live order-section capture succeeded: [run #39894447648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447648); commit status `non-hero-order-live-preview-capture: success`.
- Cloudflare Pages read-only metadata verified the alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/` resolves to Preview deployment `148c3208-1b1d-4182-81ba-0058ec7e0c0f`, deployed SHA `cb8901b7218964e0609b5048a9ea28bfb52c42f7`, branch `fix/liquid-glass-audit-2026-10-19`, successful deploy stage. Exact source SHA match: true.
- Artifact: [8 live order-section screenshots and manifest](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447648/artifacts/12476071825) — mobile 360/390, tablet 768, desktop 1440; Light/Dark; element-only selector `section.section.wrap#order`. Exactly four expanded process cards. No Hero capture.
- Manifest: `captureCompleted: true`, `CAPTURED_AWAITING_OWNER_VISUAL_ACCEPTANCE`, zero runtime errors, zero same-origin HTTP errors, zero read-only violations, no Access block. Cloudflare Insights requests were blocked by the external-read allowlist and are recorded as blocked external requests.
- Owner visual acceptance remains **PENDING**. Capture success is not visual acceptance/PASS; owner review is required before this section can be marked PASS/LOCKED.
- Earlier run #39894291884 failed before capture due a selector assertion mismatch (`section.section.wrap#order` versus `#order`); commit `cb8901b` corrected the assertion, and run #39894447648 succeeded.


## Owner acceptance — order-step heading readability — 2026-10-23

- Owner explicitly confirmed **PASS** for the requested order-step heading typography update. This narrow item is now **PASS/LOCKED**; do not alter it without explicit owner permission.
- CSS change in `public/index.html`: order-step headings use `font-weight:600` and desktop `15.5px`; tablet/mobile heading sizes were increased by one size step, including narrow-phone override. Regression expectations were updated in `tests/order-trust-layout.test.mjs`.
- Verified branch HEAD and PR #108 head at acceptance: `c8a14685efa3fbfa12475fe895405b5999489329`; PR remains OPEN/unmerged.
- Source/test CI PASS: [run #39895567918](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895567918). Preview deployment PASS: [run #39895567897](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895567897). Preview URL: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ . No Production deployment or merge.
- This owner PASS applies only to order-step heading typography. It does not automatically accept the whole order section or any other section. Hero remains PAUSED BY OWNER and untouched.
- Next action: inspect the next unfinished non-Hero storefront section from current source/tests/evidence. Establish a concrete discrepancy before editing; run targeted checks and re-verify the exact Preview deployment SHA before claiming visual evidence.


## Verified storefront audit update — 2026-10-23

- Current source HEAD: `bc1a631d5ca82995b3a772da9bc26a4e8f241309`; PR #108 remains OPEN/unmerged. Source/test CI PASS: [run #39897235441](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897235441). Preview deployment PASS: [run #39897235447](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897235447). Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ . Deployment log confirms the correct Pages project, Production branch `main`, target fix branch, and successful Preview deployment of this exact SHA. No Production deployment.
- Non-Hero source fix: `public/index.html` now assigns the product-detail modal semantics to the outer `#productOverlay` only; the inner `.detail-modal` is a visual panel, not a second nested dialog. Added a focused regression assertion in `tests/storefront-accessibility-contract.test.mjs`. A redundant escaped assertion was removed in a follow-up test-only commit; final CI and Preview deployment passed at `bc1a631d5ca82995b3a772da9bc26a4e8f241309`.
- Live screenshots: [run #39896962874 and artifact](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39896962874/artifacts/12477450904) captured 8 screenshots of `section.section.wrap#order` at SHA `72cb5b365c5f7d6438e6ad0a37df43ba0142c1fc`, with exact source/deployed SHA match. The only later change through current HEAD is removal of two redundant test lines; storefront HTML is unchanged between those SHAs. Treat the capture as evidence for the unchanged order section only, not a visual capture of the product-detail dialog. Owner visual acceptance for the broader order section remains pending; the narrow order-step heading typography remains PASS/LOCKED by owner.
- The isolated/full visual workflow is intentionally SKIPPED by its Hero-safety guard; no Hero capture was run. Hero remains PAUSED BY OWNER. No merge, no Production deployment, and no Admin/backend/API/auth/catalog/data/DNS/secrets/bindings changes.
- Next action: continue audit of another unfinished non-Hero storefront area, inspect existing source/tests/evidence first, identify a concrete defect, change one item at a time, test, deploy Preview only, verify exact SHA, and update this handoff. Do not re-edit the product dialog fix or owner-locked order heading without new evidence/permission.

## Verified narrow-mobile order CTA clearance — 2026-10-23

- Concrete visual defect: the non-Hero order section's “Cam kết hậu mãi” / Zalo CTA was partly obscured by the fixed mobile bottom navigation in the 360px dark-mode live Preview capture.
- Fix in `public/index.html`: at `max-width:380px`, reserve `calc(88px + env(safe-area-inset-bottom))` bottom padding for `#order`. The owner-locked order-step heading typography was not changed. Hero markup/CSS/assets were not edited by this fix.
- Added a regression assertion to `tests/storefront-operations.test.mjs` for the narrow-mobile clearance rule.
- Final source/test SHA: `d2123c60203cba768ac91555262707139f24f5c7`. CI PASS [#39899622059](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899622059); Preview deploy PASS [#39899622020](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899622020). Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ .
- Exact-SHA non-Hero capture at source/deployed SHA `08017a955fa42081e59457397b210a26b6038f6d`: [run #39899486321](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899486321), artifact [#12477679857](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899486321/artifacts/12477679857). All 8 Light/Dark captures completed with no runtime or same-origin HTTP errors. Screenshots show the CTA clear of the fixed nav at 360px in both themes. Commit `d2123c6` differs from capture SHA `08017a9` only in the test file; `public/index.html` is identical, and the latest Preview deploy passed at `d2123c6`.
- The first attempt at `08017a9` had a malformed test assertion; it was corrected in `d2123c6`, and the final CI/deploy both pass. Do not cite the failed first-attempt CI/deploy as current status.
- This is capture evidence, **not owner visual acceptance**. Broader order-section acceptance remains pending. Hero remains paused. PR #108 remains open/unmerged; Preview only.


## Verified continuation — 2026-10-23 04:29 UTC

- Latest source change: `82fe8a3d41289ca308748bd7a7f326737326f457` (`fix(a11y): label catalog search input`). Catalog search now has an explicit accessible name independent of placeholder; regression assertion added in `tests/storefront-operations.test.mjs`.
- CI PASS: [run #39900425348](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39900425348). Preview deployment PASS at exact source SHA: [run #39900425331](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39900425331). Deployment URL `https://1142d16c.sindarealest2.pages.dev`; alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev`.
- Current-SHA non-Hero order-only screenshot run [#39900425363](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39900425363) is still in progress at Chromium installation; no artifact yet, so no new visual claim. Previous owner acceptance remains pending.
- PR #108 remains OPEN/unmerged. Hero remains PAUSED BY OWNER; no Hero inspection/edit/capture, no merge, no Production deployment. After capture completes, inspect artifact and exact deployed SHA, then continue safe source-first audit outside Hero.
