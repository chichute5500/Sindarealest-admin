# TEST RESULTS — EXACT-SHA EVIDENCE

> Current branch/next steps: [CURRENT-STATE.md](CURRENT-STATE.md). Never treat a result for one SHA as a PASS for another.

## Newer observation-only artifact — 2026-10-22 10:29 UTC

- Run [#39762445821](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821), artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837): the visual-preview job completed successfully and its live capture JSON reports 128 screenshots, 8/8 viewport/theme pairs, 13 route checks, zero failed requests/hard failures.
- **Do not record this as an exact-SHA PASS.** Its `deployment-verification.json` has `passed:false`, status `DEPLOYMENT_METADATA_UNVERIFIED`, expected commit `e916ce590b6dbd720dca51405097d20333ce649b`, observed deployment commit `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. The screenshots remain useful for visual inspection; only the earlier run #39760903036 / artifact #12418615814 is exact-SHA-verified for SHA `fc406599e04475e232fad790efd03d46979a5a20`.
- Manual review of artifact #12418823837 confirmed a “Tuyển chọn 25” image/gallery consistency issue: image 01/19 is a black high-top pair and image 02/19 is a visibly different green/white sneaker. This is a catalog/image-mapping issue and was not changed. Gallery navigation passing does not establish product-image consistency.
- The icon boards `Icon.png` and `Chitiet.png` were opened and compared with sampled live home/detail states. Sampled SVG-style icons and blue pressed-state tint align broadly with the palette; exhaustive icon parity remains IN_PROGRESS.

## Latest verified checkpoint (2026-10-22 UTC)

- Branch/PR HEAD changes with documentation-only commits; fetch live HEAD before work. Latest verified storefront source/deployed/audited SHA: `fc406599e04475e232fad790efd03d46979a5a20`.
- Validate/tests [#39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928): reported PASS.
- Admin Preview read-only smoke [#39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960): PASS; read-only only.
- Live Preview verification/audit [#39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036): SUCCESS. Logs confirm `VERIFIED_PREVIEW_DEPLOYMENT`, branch and exact SHA match.
- Artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814): local fixture PASS (58 screenshots; 235 fixtures; 20 responsive cases; 103 interaction checks; zero recorded errors/hard failures) and live Preview PASS (128 screenshots; 8/8 viewport/theme pairs; 13 route checks; zero failed requests/hard failures).
- Archive comparison remains `COMPLETE_NEEDS_VISUAL_REVIEW`. Manual screenshot comparison is still required; do not equate machine PASS with visual parity.
- Docs-only commits do not deploy storefront code because `docs/**` is ignored by the Preview push trigger.

## Last fully documented live audit (historical evidence)
- Audited source SHA: `78b0a673a610501bfa4048df0ed614ff48246f97`
- Workflow: [run #39756327625](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625)
- Artifact: [#12416207670](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625/artifacts/12416207670)
- Recorded coverage: 128 Preview screenshots; 8/8 viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900 in Light/Dark); reported zero responsive overflow, console/page/HTTP/request/image errors and zero hard failures.
- Gallery arrow press: 4/4 PASS in detail/fullscreen gallery in Light/Dark; vertical center shift <=1px, subtle press scale and correct Next/Previous restoration.
- Fly-to-cart: 6/6 PASS; animation edge cases 2/2 PASS.
- These results apply to the SHA above only. A green result is not a substitute for inspecting screenshot images.

## Regression rules
- Do not rerun unaffected PASS suites.
- Rerun tests when the changed code/test definition intersects their coverage, the deployed environment changes, or an exact-SHA requirement demands new evidence.
- Record each result with commit SHA, workflow URL, conclusion, environment and artifact.
- Distinguish `PASS`, `FAIL`, `BLOCKED`, `UNVERIFIED` and `NOT TESTED`; do not turn unknown into PASS.
