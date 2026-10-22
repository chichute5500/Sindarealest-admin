# SinDarealest2 — CURRENT STATE
Updated: 2026-10-22 11:20 UTC. Read this file first in every new chat.

## Latest active work checkpoint — 2026-10-22 11:16 UTC

- PR #108 is OPEN / NOT MERGED. Current storefront-source candidate SHA: `dff584114dfd3916219f38b24950e5bf531e2199`; docs-only handoff commits after this point may move branch HEAD without changing deployed storefront source. At the time of this last refresh, latest docs-only tip was `823032a52ed7d5d164abfa34f67dc5cb526842e0`; this final CURRENT-STATE commit will advance the docs tip again, so re-fetch branch HEAD before any source work.
- Validation + full `npm test` **PASS for source SHA `dff584114dfd3916219f38b24950e5bf531e2199`**: [run #39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097).
- Preview deployment **PASS** for requested source SHA `dff584114dfd3916219f38b24950e5bf531e2199`: [run #39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), deployment URL `https://b7858119.sindarealest2.pages.dev/`, stable Preview alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Treat as deploy job evidence; still require the visual audit's deployment metadata gate before calling a fresh screenshot audit exact-SHA verified.
- Live visual audit for this source SHA: [run #39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207). At 11:19 UTC it was IN_PROGRESS at isolated Chromium installation and had no artifact. Refresh status before acting.
- Documentation-only commits after source SHA `dff584114dfd3916219f38b24950e5bf531e2199` spawned PR validation runs on the newer docs-only HEADs, despite docs being ignored by push deployment triggers. These are not new storefront deploys. Exact current-source test evidence remains run #39769146097. Batch future handoff edits where possible to avoid needless full-suite churn.
- Latest UI change replaces the rejected radial edge mask with a conditional Dark-mode matte key: the same owner-provided `/images/hero-sd-gl052.png?v=20261022-1` is sampled at 8 image-edge/corner points; existing gallery SVG filter is applied only after at least 6 neutral near-white votes. No source URL, image pixels, product mapping, catalog data or backend code is changed by this effect. **Visual acceptance is pending until new Preview screenshots are actually opened.**
- Regression history: radial feather version did not visibly remove the rectangular matte and was superseded. Two subsequent intermediate test failures were traced to (a) fake image objects in `storefront-html-safety.test.mjs` lacking `classList`, then (b) an assertion expecting non-optional `classList.toggle`; guards and assertion were corrected. Do not transfer those failed intermediate results to the current SHA; current validation run above is PASS.
- Admin Preview Playwright for this source SHA: [run #39769146129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146129); refresh status. No Admin source was intentionally edited; the workflow is a repository-wide check.
- Keep VISUAL-PARITY / ICON-PARITY open. Do not touch the confirmed “Tuyển chọn 25” product-gallery mapping; that remains a trusted-catalog dependency.

## Latest visual-review checkpoint — 2026-10-22 10:35 UTC

- Live GitHub state at this review: branch and PR #108 HEAD `666ac0e65b81317d232ae526d3327e498a8b3f76`; PR #108 remains OPEN and NOT MERGED. Comparing `e916ce590b6dbd720dca51405097d20333ce649b` to this HEAD shows 19 commits ahead; changed files are documentation/report files only, no storefront source.
- Newer screenshot artifact: workflow run [#39762445821](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821), artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837). It contains 128 real Preview captures, all 8 viewport/theme pairs, 13 route checks, zero recorded hard failures/failed requests, plus fresh copies of both mobile references and both icon boards.
- **Exact-deployment verification did not pass for that artifact.** `deployment-verification.json` says `DEPLOYMENT_METADATA_UNVERIFIED`: expected `e916ce590b6dbd720dca51405097d20333ce649b`, while the Preview alias metadata returned deployment `3e174ea2-9b58-4801-9f98-f8f941280cc0` with commit `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. The screenshot artifact is suitable for observational visual review because the intervening commits compare as docs-only, but it is **not** a new exact-SHA verification. The last exact-SHA-verified live audit remains run [#39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036), artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814), SHA `fc406599e04475e232fad790efd03d46979a5a20`.
- Actual screenshots inspected: home across 360×800, 390×844, 768×1024 and 1440×900 in Light/Dark; first-paint splash; six benefit tiles; mobile product detail/gallery and next-image state; icon pressed state in Light/Dark; account, cart-with-item, checkout form, Zalo CTA, footer/contact and 404. The owner-supplied `/images/hero-sd-gl052.png` is present. The icon boards `Icon.png` and `Chitiet.png` were opened from the artifact; the sampled home/detail controls use outlined icon artwork and the favorite pressed tint is consistent with the blue/navy reference palette. This is not a claim that every icon state is fully accepted.
- **Confirmed gallery mismatch, read-only:** `/sanpham/sneaker/sneakers-33-48`, title “Sneaker da cá sấu – Tuyển chọn 25”. Screenshot `product-detail-modal-direct-open-mobile-light-390x844.png` shows black high-top boots as image 01/19; `product-gallery-next-mobile-light-390x844.png` shows a visibly different green/white sneaker as image 02/19, and the visible thumbnails span different shoe designs. The automated `galleryNext: PASS` only proves navigation works, not image-to-product consistency. Product/image mapping is locked by scope, so do not edit it or hide the mismatch as a UI workaround; record as a trusted-catalog/mapping dependency.
- No storefront code was changed in this review. The confirmed gallery issue cannot be corrected inside the present no-mapping-change scope. Keep visual parity and icon parity OPEN; do not claim 100%. Planning estimate remains 88% unless the evidence-backed work scope is recalculated.


## Startup first-paint evidence — run #39762445821 (2026-10-22)

- Inspected the four captured startup videos in artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837): 360×800 and 390×844, Light and Dark. Each video is approximately 1.08–1.16 seconds.
- Parsed `live-preview/visual-audit.json`: `firstPaintCoverageComplete=true`, `firstPaintVideoCoverageComplete=true`, `firstPaintFrameCount=20`, `firstPaintViolationCount=0`, `firstPaintVideoCount=4`. Across the four startup timelines there are 107 recorded samples; all have `violation=false`. While the welcome splash owns the screen, the bottom navigation and account drawer are recorded as not visible. No account flash or bottom-toolbar overlap was captured in these runs.
- **Evidence limit:** the artifact's deployment metadata check failed because it expected `e916ce590b6dbd720dca51405097d20333ce649b` but Cloudflare reported `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. Commit comparison shows the seven intervening commits touched documentation only, no storefront code; thus this is strong observational evidence for the same storefront source, but not a new exact-SHA-verified audit. Keep the startup issue as `PASS — captured runs only; device-specific report not disproved`, and do not rerun without new contrary evidence or a new source/environment.


## Source of truth
- Repository: https://github.com/chichute5500/Sindarealest-admin
- Work branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, DO NOT MERGE.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Branch HEAD is intentionally not frozen in this file: the documentation cleanup adds docs-only commits. Fetch the branch and PR #108 HEAD live before every new work session; distinguish branch HEAD from deployed storefront SHA and audited SHA.
- Latest verified storefront source, deployed Preview and audited SHA: `fc406599e04475e232fad790efd03d46979a5a20`.
- Latest live audit [run #39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036) SUCCESS; logs confirm `VERIFIED_PREVIEW_DEPLOYMENT` with exact branch and SHA match.
- Latest artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814): live Preview PASS, 128 screenshots, 8/8 viewport/theme pairs, 13 route checks, zero failed requests/hard failures. Archive comparison remains `COMPLETE_NEEDS_VISUAL_REVIEW`, so visual parity is not yet complete.
- Validate/tests [#39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928) reported PASS; Admin Preview read-only smoke [#39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960) reported PASS.
- Docs-only commits are excluded from Preview deploy/live-capture push triggers by workflow `paths-ignore: docs/**`. A docs-only handoff commit must not be presented as a new deployed storefront.

## Latest live run refresh (2026-10-22 UTC)
- HISTORICAL: branch/PR head was `99eadd224de1da319598998028ebdcdfda4d495a` before later documentation-only commits. Current verified head at this refresh is `666ac0e65b81317d232ae526d3327e498a8b3f76`; fetch again before acting.
- HISTORICAL at prior refresh: run #39762445821 was IN_PROGRESS. It has since completed; see the Latest visual-review checkpoint above. Its screenshot artifact is observational only because the artifact's deployment metadata did not match the expected SHA.
- CI [#39762468528](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762468528) passed for `2bd71f55d1c473852d9bfe5f39b701943ce464d0`; current HEAD advanced later via docs-only edits. The next chat must refresh CI and deployment status rather than transfer this PASS to the current HEAD.
- Root-level `AUDIT-REPORT-2026-10-17.md`, `UPGRADE-REPORT.md`, and `INTEGRITY-REPORT.md` now carry historical-report banners. They remain for traceability, not as current storefront handoff.

## Documentation cleanup checkpoint (2026-10-22)
- Canonical handoff order: this file → `HANDOFF.md` → `TEST-RESULTS.md` → `TASKS.md` → visual audit plan → [canonical new-chat prompt](PROMPT-NEXT-CHAT-2026-10-22.md).
- Dated prompts `PROMPT-NEXT-CHAT-2026-10-20.md`, `PROMPT-NEXT-CHAT-2026-10-21.md`, and `docs/prompts/NEXT-CHAT-PROMPT-2026-10-21-STATIC-WEB.md` are marked HISTORICAL; REV2/REV3 already direct readers to the canonical prompt. The master prompt now starts with an override saying old embedded checkpoints are historical only.
- `docs/website-screenshots/README.md` no longer presents the old blocked-Access/local-fixture run as current project status; it distinguishes the before/after screenshot archive from real live Preview audit artifacts.
- This is a targeted handoff cleanup, not a claim that every historical report in the repository is current. Old audit reports and packaging/deployment READMEs are retained for historical context; never use them to override this file or the current code/config. If a task depends on one, compare it against current code and platform metadata.
- After the documentation-only edits, fetch the live branch HEAD and PR head again. Documentation changes do not imply a new storefront deploy because `docs/**` is excluded from the Preview push trigger.

## Non-negotiable scope
- Storefront public UI only: HTML/CSS/JS, layout, icons, effects, responsive behavior and visual parity.
- Never merge PR #108; never deploy Production or change `main`, DNS, Admin branch/code, backend/API/auth/schema/business logic, product/catalog/SKU/price/image mappings, D1/R2, bindings, secrets or Access policy.
- Never submit a real checkout or test money transfers.
- Keep QR checkout fail-closed until trusted backend confirmation and receiver/payment configuration exist. Never fabricate QR, amount or paid status.
- The owner-supplied hero `/images/hero-sd-gl052.png` is settled and must remain visible. Do not search the catalog for SKU SD-GL052, hide, replace or delete this asset.

## Verified facts vs open work
- The prior live audit SHA `78b0a673a610501bfa4048df0ed614ff48246f97` / run #39756327625 / artifact #12416207670 is historical; the newer exact-SHA audit is run #39760903036 / artifact #12418615814 for `fc406599e04475e232fad790efd03d46979a5a20`.
- Gallery arrow press: 4/4 PASS in that audit (detail/fullscreen, Light/Dark; vertical center shift <=1px; press scale ~0.97; Next/Previous returns to original image).
- Fly-to-cart: 6/6 PASS and animation edge cases 2/2 in that audit. Preserve animation capture behavior; do not reopen without new contrary evidence.
- Visual parity is NOT complete. Must inspect real screenshots against `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` and `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Icon redesign is NOT declared complete. Both `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png` were freshly opened from artifact #12418823837 and compared with sampled live Preview home/detail states on 2026-10-22; sampled icons broadly align, but remaining icon contexts and exact-SHA capture are still required.
- “Tuyển chọn 25” gallery has a CONFIRMED visible image inconsistency in artifact #12418823837 (image 01/19 black boots; image 02/19 different green/white sneaker). Do not modify product/image mapping without trusted catalog evidence and authorization; retain as a scope-locked dependency.
- Six Liquid Glass tiles must have three glass layers; do not blur the whole page. Review satin folds, header/logo/hero, trust section, catalog/search/cards, product detail/gallery, cart/account/checkout, Zalo, footer and 404 in all 8 viewport/theme pairs.
- Approximate progress: 88% remains a planning estimate only, not an audit score. The actual screenshot review now covers the 8 home viewport/theme pairs and key states; visual and icon parity remain open.

## Required viewport/theme matrix
360×800, 390×844, 768×1024, 1440×900 × Light and Dark = 8 combinations.

## Next actions (in order)
1. Refresh branch HEAD and PR #108 after this documentation-only update. PR must remain OPEN and unmerged. Separate docs HEAD from storefront source SHA `dff584114dfd3916219f38b24950e5bf531e2199`.
2. Check [validation #39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097), [Preview deploy #39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), [Admin Playwright #39769146129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146129) and especially [live visual audit #39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207). Wait until audit ends, download and open the artifact screenshots, and confirm deployed/source/audited SHA before acceptance.
3. Specifically compare hero Dark-mode matte at 390×844 and 1440×900, and also check Light mode to ensure the conditional filter is inactive where not verified. If the matte still looks rectangular or any shoe edge/colour is damaged, revert only the new hero matte helper/filter and its test rather than stacking more filters.
4. Keep VISUAL-PARITY and ICON-PARITY open; preserve the official logo and supplied hero `/images/hero-sd-gl052.png`. Startup splash/account-flash issue has 4 videos and 107 timeline samples with 0 captured violations in artifact #12418823837; do not repeat unless contrary evidence appears.
5. Keep PRODUCT-GALLERY-25 as a confirmed read-only mismatch. Do not change product/catalog/image mappings; correction requires trusted catalog data and authorization outside this scope.
6. After any future UI code change: run affected tests, deploy Preview, verify exact deployment SHA, run live audit, inspect artifact images, then update evidence docs. QR/payment stays fail-closed; no real checkout/payment tests.
## Canonical document rules
- This file is the single current-state summary. Other handoff docs should link here and retain only evidence/history they uniquely own.
- Never copy an old SHA or percentage forward without re-verifying it.
- Keep the latest checkpoint at the top; label older entries HISTORICAL/SUPERSEDED, never let them conflict with current facts.
- Test results are scoped to exact SHA, test suite, environment and artifact. Do not rerun unaffected PASS tests.
