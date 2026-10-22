# TEST & VISUAL AUDIT EVIDENCE INDEX
Updated: 2026-10-23

This is the single index for test, deployment and visual-audit evidence. Repeated run-by-run narratives were consolidated here. Old artifacts remain accessible from GitHub Actions; a PASS applies only to its exact SHA.

## Current acceptance
- Owner requested that the Hero image be temporarily hidden. This is a pause, not visual acceptance.
- Required state: `#heroProductImage` exists, is hidden, has no `src`, has status `temporarily-disabled-owner-request`, and its `.hero-visual` frame collapses with no blank reserved area.
- Before the current consolidation batch, Actions failed because `tests/storefront-html-safety.test.mjs` still required the old visible Hero image:
  - [Source/tests #39840595749](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39840595749) — failed at `tests/storefront-html-safety.test.mjs:26`.
  - [Preview deploy #39839970275](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39839970275) — blocked by the same assertion.
  - [Visual preview #39839970322](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39839970322) — blocked by the same assertion.
- The test/audit expectations are being aligned with the owner's hidden-Hero decision. Do not call this fixed until fresh Actions on the new HEAD pass and deployed Preview SHA is verified.

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

## Evidence rules
- Source tests, Preview deployment, deployment SHA, live screenshot capture and human visual acceptance are separate gates.
- Local fixtures are not live Preview evidence.
- Old PASS records prove only the exact historical SHA shown.
- Required viewport/theme matrix: 360×800, 390×844, 768×1024, 1440×900, each Light and Dark.
- Preserve screenshots/artifacts in Actions; never claim visual acceptance merely because a workflow is green.
- PR #108 stays OPEN/unmerged; Preview only. No Production/main/Admin/backend/catalog/D1/R2/secrets/bindings/DNS/Access changes.
