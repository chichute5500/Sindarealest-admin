# TEST & VISUAL AUDIT EVIDENCE INDEX
Updated: 2026-10-23

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

## Evidence rules
- Source tests, Preview deployment, deployment SHA, live screenshot capture and human visual acceptance are separate gates.
- Local fixtures are not live Preview evidence.
- Old PASS records prove only the exact historical SHA shown.
- Required viewport/theme matrix: 360×800, 390×844, 768×1024, 1440×900, each Light and Dark.
- Preserve screenshots/artifacts in Actions; never claim visual acceptance merely because a workflow is green.
- PR #108 stays OPEN/unmerged; Preview only. No Production/main/Admin/backend/catalog/D1/R2/secrets/bindings/DNS/Access changes.
