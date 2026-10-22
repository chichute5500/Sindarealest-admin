# VERIFIED LIVE PREVIEW AUDIT — 2026-10-22 13:24:55 UTC

**This evidence supersedes earlier notes that run #39780674947 lacked exact-SHA certification.** Keep PR #108 OPEN and unmerged.

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`; PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, merged=false at verification.
- Audited/deployed source SHA: `38cdde70ae2edf69295232688928bbb9e68f3b3f`. This source commit adds only a regression test to `tests/storefront-reference-parity.test.mjs`; `public/index.html` and `public/images/hero-sd-gl052.png` were not changed in this commit.
- Validation/full tests: PASS — [run #39786010003](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786010003).
- Cloudflare Preview deployment: PASS — [run #39786010114](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786010114); concrete URL https://b64b8055.sindarealest2.pages.dev/; stable alias https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Guarded live visual audit: SUCCESS — [run #39786009865](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786009865); artifact [#12428643812 — sindarealest-liquid-glass-preview-880](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786009865/artifacts/12428643812), 58,476,756 bytes, SHA-256 `9e62038c9ccb8851ec4ac0abee336512fe9cc38dfd739fc8076c5ab932ab5725`.
- Formal deployment verification: `passed=true`, `status=VERIFIED_PREVIEW_DEPLOYMENT`. Cloudflare deployment ID `b64b8055-c77e-420f-8d45-0e3b86cc17cd`, environment `preview`, branch matches expected, full `commitHash=38cdde70ae2edf69295232688928bbb9e68f3b3f` equals full `expectedCommitSha`. Verification time: `2026-10-22T13:22:44.842Z`.
- Live audit JSON: `sourceKind=cloudflare-pages-preview-live-read-only`, `sourceCommit=38cdde70ae2edf69295232688928bbb9e68f3b3f`, `captureCompleted=true`, `passed=true`. It records 128 genuine live Preview screenshots; 8/8 viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900 in Light/Dark); 13 route checks; 69 section target checks; 8/8 hero image checks PASS; 0 horizontal overflow, console errors, page errors, HTTP errors, failed requests, broken images, hard failures or read-only violations. Startup coverage: 20 frames, 4 videos, 0 violations. The separate local fixture audit contains 58 screenshots and is not live proof.
- Actual artifact ZIP was downloaded, SHA-256 recomputed locally and matched GitHub's artifact digest. Manually opened hero section mobile Light/Dark 390×844, desktop Light/Dark 1440×900 and full viewport captures mobile 360×800 and 390×844, tablet 768×1024, desktop 1440×900 in both themes. Also opened benefits/order, account drawer, cart-with-item, checkout form, Dark 404, official icon reference boards `Icon.png` and `Chitiet.png`, and the “Tuyển chọn 25” image 01/19 vs 02/19 captures.
- Hero viewport-fit observation: PASS in all 8 viewport/theme checks. The dedicated owner-provided PNG `public/images/hero-sd-gl052.png` remains standalone presentation media, not catalog/SKU/product API content. Git blob SHA remains `24038214abefdac9ff2451def39f3e5bd9255462`; a regression test now locks this exact Git blob SHA. The PNG pixels/file were not changed. In Dark mode its original bright gray/white field remains visible by design; do not “fix” it with filters/masks/blending.
- Remaining findings: full visual parity and full icon parity remain OPEN. Confirmed catalog/data blocker: “Tuyển chọn 25” image 01/19 shows black high-top boots while image 02/19 shows a different green/white sneaker at route `/sanpham/sneaker/sneakers-33-48`. Do not change or hide the catalog image mapping in the UI branch; escalate to the trusted mapping owner.
- QR/order payment remains fail-closed pending trusted backend confirmation/configuration. The checkout form was captured with `submitted=false`; no real order or payment was submitted.
- The next documentation-only commit may advance branch HEAD beyond audited source SHA. Since the changed paths are only `docs/**`, do not treat the newer docs HEAD as a new storefront source/deployment; keep the deployed/audited source SHA above explicitly recorded. PR #108 MUST remain OPEN. Do not touch Production/main/Admin/backend/API/auth/catalog mapping/D1/R2/bindings/secrets/DNS/Access or alter the strict exact-SHA guard.

## Test trace note
An initial attempt at the hero PNG Git-blob regression assertion on intermediate SHA `363a54330eb6d7fa40da98089cb7bf1018647bc8` failed because the Git blob header was escaped incorrectly. It was corrected at `38cdde70ae2edf69295232688928bbb9e68f3b3f`; on the current source SHA both the visual workflow project test step and the dedicated CI/full-test run pass. Do not treat that superseded intermediate failure as a current test failure.
# TEST RESULTS OVERRIDE — VISUAL WORKFLOW #39780674947 (2026-10-22)

This section supersedes older statements that the specified audit is still in progress. Validation/deploy evidence and screenshot-observation evidence are distinct, and the metadata-gate failure must remain explicit.

# VERIFIED AUDIT OVERRIDE — 2026-10-22, after run #39780674947

**This is newer than the 12:46 UTC checkpoint below. Refresh the branch tip after this docs-only commit. PR #108 stays OPEN and MUST NOT MERGE.**

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`; PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 (fetched state: open, merged=false).
- **Storefront source under audit:** `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`. UI/layout commit: `d28c663f39b22fa4fa29dafa509ec30234722d73`. Branch tip before this documentation sync: `ebdd5e657c317490ce7747056ffa37be8c65ab0c` (docs-only).
- **Validate/full npm test:** PASS for source SHA `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`, run [#39780674913](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913).
- **Preview deploy job:** PASS, run [#39780674951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951). Stable Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- **Visual run:** [#39780674947](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947), completed `success`; artifact [#12426937018 — sindarealest-liquid-glass-preview-878](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947/artifacts/12426937018), 58,399,888 bytes; SHA-256 `3614fae8cb3d56d6da0a91414bc31d31e7d855f5cbeb7bef8fae9355301bb937`. The artifact was downloaded and unpacked locally.
- Live audit JSON `live-preview/visual-audit.json`: `sourceKind=cloudflare-pages-preview-live-read-only`, `sourceCommit=96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`, 128 real Preview screenshots, 8/8 required viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900; Light/Dark), 13 route checks, 69 section target checks, 8/8 hero image checks PASS, horizontal overflow=0, console/page/HTTP errors=0, failed requests=0, broken images=0, hard failures=0, read-only violations=0. Startup evidence: 20 frames, 4 videos, 0 violations. Local fixture audit is reported separately and is not live proof.
- **Important strict-gate result: NOT VERIFIED.** `deployment-verification.json` is `passed=false`, `status=DEPLOYMENT_METADATA_UNVERIFIED`: expected deployed SHA `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`; Cloudflare's live Preview alias metadata returned deployment `4d253553-c5b3-481c-989c-316657276ec5`, URL `https://4d253553.sindarealest2.pages.dev`, branch `fix/liquid-glass-audit-2026-10-19`, successful Preview stage, but commit `ebdd5e657c317490ce7747056ffa37be8c65ab0c` (docs commit “docs(handoff): record hero viewport fix and pending visual audit”). Thus the dedicated gated steps “Verify actual Cloudflare Pages deployment before manual capture/archive”, “Capture live Cloudflare Pages Preview (read-only)” and related archive steps were SKIPPED. The 128 screenshots came from the separate read-only live Preview probe and are genuine live captures, but this run is **not an exact-SHA-certified audit**.
- The commit comparison `96bb6eb...` → `ebdd5e657c317490ce7747056ffa37be8c65ab0c` returned exactly four changed paths, all handoff/evidence docs; no storefront source. The `public/index.html` blob SHA is identical at both commits: `51c9c8487bc9b628bb6c4a41420fbec1ec7e17e1`. The protected hero asset blob SHA is identical at `39652e9...`, `d28c663...`, `96bb6...` and `ebdd5e657c317490ce7747056ffa37be8c65ab0c`: `24038214abefdac9ff2451def39f3e5bd9255462`. This supports visual observation of the same storefront source, **but does not override the strict metadata gate**.
- **Manual screenshots actually opened** from `liquid-glass-preview/live-preview/`: `section-hero-mobile-light-390x844.png`, `section-hero-mobile-dark-390x844.png`, `section-hero-desktop-light-1440x900.png`, `section-hero-desktop-dark-1440x900.png`; full viewport captures `home-mobile-light-360x800-viewport.png`, `home-mobile-dark-360x800-viewport.png`, `home-mobile-light-390x844-viewport.png`, `home-mobile-dark-390x844-viewport.png`, `home-tablet-light-768x1024-viewport.png`, `home-tablet-dark-768x1024-viewport.png`, `home-desktop-light-1440x900-viewport.png`, `home-desktop-dark-1440x900-viewport.png`. Also opened representative benefits/order/catalog, account drawer, cart-with-item, checkout form and Dark 404 captures.
- **Hero result:** observational visual review PASS for viewport fit: image loads visibly and remains inside the viewport at 360/390 mobile, 768 tablet and 1440 desktop, Light/Dark; no right-edge clipping was seen and live audit reports zero horizontal overflow. The entire supplied image/backdrop remains visible. This is not yet the formal exact-SHA PASS because of the metadata mismatch. Current final hero CSS at `public/index.html` uses `object-fit:contain`, full centering, no padding and explicit `filter:none`, mask/clip-path none, `mix-blend-mode:normal`, `opacity:1`, `transform:none`; `tests/storefront-reference-parity.test.mjs` has regression assertions for the asset lock. Do not add an image effect or alter the PNG.
- **No storefront source changes were necessary in this review.** Do not change `public/index.html` merely to chase metadata. Next useful acceptance task is to arrange a new guarded audit run where the Cloudflare Preview metadata SHA equals the audited HEAD for the entire capture window; the available GitHub connector does not expose workflow_dispatch, so do not claim that gate passed if it cannot be triggered. Keep the mismatch explicitly visible.
- Other outstanding scope blockers: the recorded “Tuyển chọn 25” gallery has inconsistent shoe designs across images 01/19 and 02/19; product/catalog image mapping is out of scope and must remain unchanged. Full ICON-PARITY is not yet accepted. QR/payment remains fail-closed pending trusted backend confirmation/configuration; never submit checkout or send money.
- Completion: hero viewport-fit evidence gates **7/8 satisfied (~88%)**; the remaining gate is exact deployed/audited SHA metadata. This is a narrowly defined hero-checkpoint percentage, **not a declaration of full-site completion**. Overall visual/icon parity and trusted catalog/payment dependencies remain OPEN; do not claim 100%.

---

## Test/review classification

- Validation/full test suite: **PASS**, exact source SHA `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`, run #39780674913.
- Preview deploy job: **PASS**, run #39780674951.
- Live read-only visual captures and machine audit: **PASS as observations** for source commit recorded by capture `96bb6...`; no live overflow/console/page/HTTP/request/image errors in captured cases.
- Exact Cloudflare deployment-to-audited SHA gate: **FAIL / UNVERIFIED** in run #39780674947; expected `96bb6...`, observed `ebdd5e6...`; dedicated guarded capture/archive steps skipped. Do not upgrade this to exact-SHA PASS just because the content comparison is docs-only.
- Human hero fit review: **PASS observationally** for mobile 360/390, tablet 768 and desktop 1440 in Light/Dark; no clip observed in screenshots listed above. Formal exact-SHA acceptance remains **PENDING**.
- Protected hero bytes: unchanged blob `24038214abefdac9ff2451def39f3e5bd9255462`; current image styles explicitly disable filters, masks, clip path, blend, opacity change and transforms.

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
