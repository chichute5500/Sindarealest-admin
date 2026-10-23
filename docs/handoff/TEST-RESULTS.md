# TEST & VISUAL AUDIT EVIDENCE INDEX
Updated: 2026-10-23 — handoff protocol reconciled

This is the single index for test, deployment and visual-audit evidence. Repeated run-by-run narratives were consolidated here. Old artifacts remain accessible from GitHub Actions; a PASS applies only to its exact SHA.

## Automation efficiency — applied 2026-10-23
- Workflow-only commit: `51e6f937b56c9c8ff04f4bbfd82298c3f8307d02`; source integrity, dependency audit and full test suite PASS — [run #39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405).
- Workflow files changed: `.github/workflows/ci.yml`, `admin-preview-playwright.yml`, `deploy-storefront-preview.yml`, `liquid-glass-visual-preview.yml`.
- Docs/README-only commits skip full source CI; workflow-only commits do not deploy or launch the expensive visual capture; Admin Preview smoke is manual-only. New commits supersede stale full validation and ordinary visual-review runs. Start/end archive jobs remain serialized separately and are not auto-cancelled.
- The latest successful Preview deployment evidence before this workflow-only commit is [#39842480998](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480998), SHA `33e09dd2bce4c4be1df23c65a47d93217d2153b7`; related Liquid Glass audit [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928) used that SHA. This is not fresh confirmation of the currently served alias, nor human visual acceptance.

## Current acceptance
- Owner requested the Hero image be temporarily hidden. This is a pause, not visual acceptance.
- Required hidden state: `#heroProductImage` exists, is hidden, has no `src`, carries status `temporarily-disabled-owner-request`, and the `.hero-visual` frame collapses with no blank reserved area.
- Code SHA `697c434f7e0c0408bcc7e2049cd660a2fb642d91`:
  - Source validation/tests PASS: [#39841739503](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39841739503).
  - Cloudflare Pages Preview deploy PASS: [#39841739555](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39841739555). Deployment log reports alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev` and URL `https://307f4e2c.sindarealest2.pages.dev`.
  - Visual local-fixture [#39841739442](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39841739442) and read-only Admin Preview smoke [#39841739471](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39841739471) remained `in_progress` at the last status read; do not label these PASS without final status and artifact inspection.
- The subsequent commits up to `7df19eb8c5a0a6cbdc76886b630905c89cf9c466` only update handoff/reference documentation. Latest HEAD Actions must still be checked after this batch.
- Previous failure was a stale assertion requiring the Hero to remain visible:
  - [Source/tests #39840595749](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39840595749).
  - [Preview deploy #39839970275](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39839970275).
  - [Visual preview #39839970322](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39839970322).
  Those failures were addressed by aligning the source test contract with the owner-requested hidden state.

## Historical exact-SHA evidence (not current proof)
| Gate | Run | SHA / limitation |
|---|---|---|
| Full validation and tests | [#39838207248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39838207248) PASS | `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`; before Hero was hidden |
| Preview deployment | [#39838207235](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39838207235) PASS | Same historical SHA; not current hidden-Hero build |
| Earlier validation | [#39829962279](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962279) PASS | `e6f49f7b65297be68a0f9472b613a1acd06c866f`; before Hero was hidden |
| Earlier Preview deployment | [#39829962530](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962530) PASS | Same historical SHA |
| Earlier visual review | [#39829962409](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962409) | Owner rejected visible Hero due to hard/cut edges; not a PASS |
| Earlier 128-screenshot live audit | [#39789189878](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189878) | SHA `38cdde70ae2edf69295232688928bbb9e68f3b3f`; predates current changes |
| Earlier full test suite | [#39789189790](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189790) PASS | Same historical SHA |
| Earlier Preview deployment | [#39789189767](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189767) PASS | Same historical SHA |

## Working-efficiency protocol (owner-approved 2026-10-23)
- The active task is singular; use parallel time only for independent, non-conflicting checks/preparation while an existing CI/deploy/capture is running.
- Do not duplicate workflows or treat a run as validating code committed after its tested SHA.
- Reuse PASS evidence only when the exact relevant source/scope is unchanged; otherwise rerun the smallest impacted checks.
- Reporting does not end work. Continue until owner acceptance or a genuine owner-dependent blocker.
- These are process rules, not new test evidence; they do not change any historical PASS/PENDING status.

## Latest artifact inspection — 2026-10-23
- Downloaded and inspected artifact [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928), artifact ID `12453971973`.
- The local static fixture audit itself reports `passed: true`, `hardFailures: []`, and zero console/page/HTTP errors. These screenshots are from `http://127.0.0.1:4173`, not the live Cloudflare Preview.
- Its `deployment-verification.json` reports `DEPLOYMENT_METADATA_UNVERIFIED`: expected SHA `33e09dd2bce4c4be1df23c65a47d93217d2153b7`, matched deployment SHA `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d`. Comparing these commits confirms the difference was docs-only (`docs/MASTER_PROMPT_HANDOFF_ADMIN_PREVIEW_2026-10-20.md` and `docs/handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md`), but the metadata gate correctly refused to claim an exact-SHA live capture.
- Source review confirms the hidden-Hero path already removes the image source, marks `temporarily-disabled-owner-request`, collapses the visual frame, and includes a CSS rule to use one column; the existing regression test checks the single-column fallback and frame collapse. No source change was made based solely on interpreting local-fixture whitespace as a confirmed defect.
- Remaining gate: fresh actual Preview screenshot evidence plus owner visual acceptance. The public web viewer could not access the Preview URL, so do not claim live visual PASS from this artifact.

## Report-then-continue protocol — 2026-10-23
- Owner explicitly requires work to continue after each progress report. This is a workflow rule, not test evidence.
- During waits, inspect independent source/tests/artifacts without editing the same behavior being validated; resume result review when the run completes.
- A report never upgrades a result to PASS. Each gate remains tied to its exact SHA and evidence.

## Evidence rules
- Source tests, Preview deployment, deployment SHA, live screenshot capture and human visual acceptance are separate gates.
- Local fixtures are not live Preview evidence.
- Old PASS records prove only the exact historical SHA shown.
- Required viewport/theme matrix: 360×800, 390×844, 768×1024, 1440×900, each Light and Dark.
- Preserve screenshots/artifacts in Actions; never claim visual acceptance merely because a workflow is green.
- PR #108 stays OPEN/unmerged; Preview only. No Production/main/Admin/backend/catalog/D1/R2/secrets/bindings/DNS/Access changes.


## Session recheck — 2026-10-23 (before evidence-only handoff commit)
- Live branch HEAD checked: `3f53e0cf7519ae0c5d0be022657845d5eb0f414b`; PR #108 remained OPEN and unmerged. The HEAD commit only updated `docs/visual-audit-progress-2026-10-19.md`.
- Relevant source/test blobs are unchanged between the checked HEAD, the successful Preview deployment source `33e09dd2bce4c4be1df23c65a47d93217d2153b7`, and the alias-matched deployment SHA `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d` recorded by the last available Cloudflare metadata artifact: HTML blob `d54ed03b0f40e70d02582ab3731e708b25198ffd`; product-card test blob `93999e16efc0be106f8123b124a56806563ef711`; reference-parity test blob `c693c96e7c35cda49df820635f1df4f2fc0961d7`; capture-script blob `0619bda4a7573b8bd0de23820f300b6a8af1b3e9`.
- Source/test workflow [#39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405) completed SUCCESS on `51e6f937b56c9c8ff04f4bbfd82298c3f8307d02`. The later HEAD movement is documentation-only, so storefront code did not change after that validation.
- Inspected visual artifact [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928), artifact ID `12453971973`: local fixture audit passed with no hard failures and no console/page/HTTP/failed-request errors. It is not a live Preview capture. Its deployment metadata gate failed closed because the matched alias deployment SHA was `d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d`, not expected `33e09dd2bce4c4be1df23c65a47d93217d2153b7`.
- Reviewed local-fixture screenshots for non-Hero product grid, cart, checkout, order process, and contact/warranty. No specific visual defect was evidenced; no UI/source changes were made. Remaining gate: an exact-SHA live Preview screenshot plus owner visual acceptance. Current web/container routes could not fetch the Preview alias; do not infer that Preview itself is down.
- Current active item is BLOCKED on real Preview evidence or a concrete owner-observed discrepancy. Do not resume Hero and do not make speculative visual edits.

## External Preview access probe — 2026-10-23

- Read-only external browser fetch of https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ returned a Cloudflare Access authentication page with title "Sign in ・ Cloudflare Access" and heading "Log in to sindarealest2 - Cloudflare Pages". This is an authenticated-access boundary for that browser route; it is not proof of an outage. No Access bypass was attempted.
- Workflow [#39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928) logs confirm the local static fixture audit passed (58 screenshots, 235 fixture products, 20 responsive cases, 101 interaction checks; overflow=0; console/page/HTTP errors=0; hard failures=0). The same job refused exact-SHA live screenshot archiving because the expected source was 33e09dd2bce4c4be1df23c65a47d93217d2153b7 but the alias-matched deployment reported SHA d39860cd92dd50cf8bf05fffc3b79eeef3e3e54d.
- Source/test PASS remains scoped to [#39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405), SHA 51e6f937b56c9c8ff04f4bbfd82298c3f8307d02. Subsequent branch commits checked before this evidence update are documentation-only; re-fetch live HEAD before relying on any copied SHA.
- Reviewed local screenshots for non-Hero sections only to look for a concrete discrepancy. No actionable defect was supported, so no UI source was changed. Live Preview screenshot evidence and owner visual acceptance remain PENDING. Existing full visual workflow includes Hero coverage and must not be run while Hero is paused; next live capture must stay non-Hero-only and use authorized access plus exact-SHA deployment verification.

## Continued non-Hero static markup audit — 2026-10-23

Read-only static review of current `public/index.html` (blob `d54ed03b0f40e70d02582ab3731e708b25198ffd`) after confirming PR #108 is still OPEN/unmerged:
- 22 image tags; none missing an `alt` attribute. Eleven have empty alt text; those correspond to decorative branding/watermark, hidden/dynamic product images, or a next-frame image marked `aria-hidden`; static scan alone cannot prove the runtime accessible name for every dynamic product image.
- 63 static button elements; no button was found with both an empty text body and no `aria-label`/title. 4 forms were found; each form's submit button explicitly declares `type="submit"`.
- No empty `href="#"` anchors or anchors without an `href` were found. The static heading scan found no heading-level jumps.
- The simplistic duplicate-ID scan flagged the literal template placeholder `${escapeHtml(id)}` from generated markup, so that result is not treated as a confirmed duplicate runtime DOM ID.
- This is a static source check, not a browser/axe audit and not visual PASS. It found no substantiated non-Hero defect to fix; storefront source remains unchanged. Preview still requires authorized access and exact-SHA proof.


## Latest session evidence — 2026-10-23

- PR #108 remains OPEN/unmerged. Code HEAD for the latest validation was `0f7151a95391fbe55c59d6c426b458f6e075d7ce`.
- Commit `8b576e0f6c6ee07eebc24ef54cd4db5812241d79` fixes fullscreen gallery image accessibility: the shown image receives product-specific alt text, while the inactive preloaded layer is excluded from assistive technology. Regression assertions were added to `tests/detail-gallery-integrity.test.mjs`.
- Commit `0f7151a95391fbe55c59d6c426b458f6e075d7ce` adds a guard to the comprehensive visual workflow because it covers Hero. Manual Hero authorization defaults to false; push-triggered runs require an explicit approval marker.
- Source/test validation run #39890961293 PASS at SHA `0f7151a95391fbe55c59d6c426b458f6e075d7ce`. Preview deploy run #39890961316 PASS at the same SHA. Neither is visual PASS.
- Guard verification run #39890961242 SKIPPED as intended at `0f7151a`. Earlier run #39890856540 at `8b576e0` was cancelled; job records show local fixture capture cancelled and live capture/deployment verification skipped. There is no evidence it completed a 128-image live capture.
- Exact-SHA live non-Hero screenshots and owner visual acceptance remain PENDING. The previous browser route showed Cloudflare Access sign-in; use authorized access only. Local fixture screenshots are not live Preview evidence.
- Hero remains PAUSED BY OWNER. No Hero markup/CSS/assets were edited; do not restore `hero-sd-gl052.png` or run comprehensive capture while paused. No merge or Production deployment occurred.


## Verified non-Hero order-section live capture — 2026-10-23
- Branch HEAD at capture: `cb8901b7218964e0609b5048a9ea28bfb52c42f7`; PR #108 remained OPEN and unmerged.
- Source/test CI PASS on that exact SHA: [run #39894447637](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447637).
- Isolated live order-section capture succeeded: [run #39894447648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447648); commit status `non-hero-order-live-preview-capture: success`.
- Cloudflare Pages read-only metadata verified the alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/` resolves to Preview deployment `148c3208-1b1d-4182-81ba-0058ec7e0c0f`, deployed SHA `cb8901b7218964e0609b5048a9ea28bfb52c42f7`, branch `fix/liquid-glass-audit-2026-10-19`, successful deploy stage. Exact source SHA match: true.
- Artifact: [8 live order-section screenshots and manifest](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39894447648/artifacts/12476071825) — mobile 360/390, tablet 768, desktop 1440; Light/Dark; element-only selector `section.section.wrap#order`. Exactly four expanded process cards. No Hero capture.
- Manifest: `captureCompleted: true`, `CAPTURED_AWAITING_OWNER_VISUAL_ACCEPTANCE`, zero runtime errors, zero same-origin HTTP errors, zero read-only violations, no Access block. Cloudflare Insights requests were blocked by the external-read allowlist and are recorded as blocked external requests.
- Owner visual acceptance remains **PENDING**. Capture success is not visual acceptance/PASS; owner review is required before this section can be marked PASS/LOCKED.
- Earlier run #39894291884 failed before capture due a selector assertion mismatch (`section.section.wrap#order` versus `#order`); commit `cb8901b` corrected the assertion, and run #39894447648 succeeded.


## Owner visual acceptance — order-step heading typography — 2026-10-23

Owner explicitly confirmed PASS for the order-step heading readability change. This narrow item is PASS/LOCKED. Source/test CI and Preview deployment passed at commit `c8a14685efa3fbfa12475fe895405b5999489329`: [CI #39895567918](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895567918), [Preview deploy #39895567897](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895567897). PR #108 remains open and unmerged; no Production deployment. Hero remains paused and untouched. Do not treat this owner acceptance as approval of other sections.


## Regression fix — nested product detail dialog — 2026-10-23

- Final tested SHA: `bc1a631d5ca82995b3a772da9bc26a4e8f241309`.
- [Source/test CI PASS #39897235441](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897235441); [Preview deploy PASS #39897235447](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897235447). Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ . Deployment completed and verified against exact branch commit; Production branch remains `main`.
- Fix: one modal dialog container for product detail; inner panel no longer declares a nested `role=dialog`. Regression test checks the outer overlay semantics and inner panel structure.
- Order capture evidence is from earlier SHA `72cb5b365c5f7d6438e6ad0a37df43ba0142c1fc`, exact source/deployed match, 8 screenshots; later commit changed test file only, so storefront markup is identical. Do not claim the product-detail dialog itself has live visual capture or owner acceptance.
- Owner acceptance for the narrow order-step heading typography is PASS/LOCKED. Broader order section acceptance remains pending. Hero remains paused.

## Latest verified update — 2026-10-23

- Fixed narrow-phone order-section CTA overlap: at widths ≤380px, `#order` reserves `calc(88px + env(safe-area-inset-bottom))` beneath its content so the fixed mobile navigation no longer covers “Cam kết hậu mãi” / Zalo CTA in the 360px dark-mode capture. Added a regression assertion in `tests/storefront-operations.test.mjs`; the owner-locked heading typography was not modified.
- Final tested/deployed SHA: `d2123c60203cba768ac91555262707139f24f5c7`. CI [#39899622059](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899622059) PASS; Preview deployment [#39899622020](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899622020) PASS. Live Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ .
- Live non-Hero capture [#39899486321](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899486321), artifact [#12477679857](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39899486321/artifacts/12477679857), captured source/deployment SHA `08017a955fa42081e59457397b210a26b6038f6d`. Final SHA `d2123c6` differs only in the test file, and the public HTML is unchanged. Eight captures succeeded; zero runtime and same-origin HTTP errors; CTA clear in 360px Light/Dark screenshots.
- Do not treat screenshot success as owner acceptance: broader order-section visual acceptance is still pending. Hero remains paused; the order-step heading remains owner PASS/LOCKED. PR #108 must stay open/unmerged; Preview only. Continue only after the required owner review for this acceptance item, while keeping Hero untouched.
