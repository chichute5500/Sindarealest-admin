## Latest hero viewport-fit checkpoint — 2026-10-22 12:46 UTC

- UI source commit: `d28c663f39b22fa4fa29dafa509ec30234722d73`. Follow-up test commit / current HEAD at this checkpoint: `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`.
- Validation and complete `npm test`: **PASS** for `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`: [run #39780674913](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913).
- Preview deployment: **PASS**: [run #39780674951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951). Alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Visual audit: [run #39780674947](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947) was **IN_PROGRESS** during Chromium installation at last poll. No final artifact/result had been reviewed; visual acceptance is **PENDING**.
- Reason for change: artifact [#12426665632](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39779375984/artifacts/12426665632) showed the owner-supplied hero presentation image clipped off the right side at mobile 390×844. Commit `d28c663` changed only hero mobile layout CSS and its parity test; commit `96bb6eb` corrected the hero contract assertion to match the viewport-width/centered CSS. Original PNG was not edited.
- Required acceptance: open new artifact screenshots and check mobile 360×800/390×844 plus desktop 1440×900 in Light and Dark. Confirm the image fits fully, is centered, and remains visually unchanged. Check deployment metadata for exact SHA. Do not infer visual PASS from source tests or deploy status.

---

# TEST RESULTS — EXACT-SHA EVIDENCE

## Latest UI patch verification — 2026-10-22 11:16 UTC

- **Source SHA:** `dff584114dfd3916219f38b24950e5bf531e2199`.
- **Validation and complete npm test:** PASS in [run #39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097).
- **Preview deploy:** PASS in [run #39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975); deployment alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`, concrete deployment URL `https://b7858119.sindarealest2.pages.dev/`. Visual audit must still confirm deployment metadata before its captures count as exact-SHA evidence.
- **Live visual audit:** [run #39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207) was PENDING at last check; no artifact yet. This is the next acceptance gate.
- UI patch: removed rejected radial CSS mask, added `syncHeroBackgroundKey` that samples 8 neutral-light edge/corner points from the supplied hero image and applies the existing gallery white-matte SVG filter in Dark mode only when at least 6 votes pass. Same source path remains `/images/hero-sd-gl052.png?v=20261022-1`; image/product mapping is unchanged.
- Intermediate failures are historical: the first new test failed because its mocked image lacks `classList`; after defensive optional guards, the next failed because the test expected non-optional `classList.toggle`. The test was corrected to the optional-chain implementation; current validation at run #39769146097 passed. Do not treat these intermediate SHAs as accepted.
- Do not claim visual improvement until artifact screenshots are opened. Check hero Dark at 390×844 and 1440×900 and Light mode; if matte remains rectangular or shoe edges/colour are damaged, revert only this hero matte helper/filter and assertion.


> Current branch/next steps: [CURRENT-STATE.md](CURRENT-STATE.md). Never treat a result for one SHA as a PASS for another.

## Startup first-paint capture — observational, not exact-SHA verified

## Startup first-paint evidence — run #39762445821 (2026-10-22)

- Inspected the four captured startup videos in artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837): 360×800 and 390×844, Light and Dark. Each video is approximately 1.08–1.16 seconds.
- Parsed `live-preview/visual-audit.json`: `firstPaintCoverageComplete=true`, `firstPaintVideoCoverageComplete=true`, `firstPaintFrameCount=20`, `firstPaintViolationCount=0`, `firstPaintVideoCount=4`. Across the four startup timelines there are 107 recorded samples; all have `violation=false`. While the welcome splash owns the screen, the bottom navigation and account drawer are recorded as not visible. No account flash or bottom-toolbar overlap was captured in these runs.
- **Evidence limit:** the artifact's deployment metadata check failed because it expected `e916ce590b6dbd720dca51405097d20333ce649b` but Cloudflare reported `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. Commit comparison shows the seven intervening commits touched documentation only, no storefront code; thus this is strong observational evidence for the same storefront source, but not a new exact-SHA-verified audit. Keep the startup issue as `PASS — captured runs only; device-specific report not disproved`, and do not rerun without new contrary evidence or a new source/environment.


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
