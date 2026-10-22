## Latest hero viewport-fit checkpoint — 2026-10-22 12:46 UTC

- Real screenshot review of artifact #12426665632 (run #39779375984, SHA `39652e9fba71e82ccb0cfef682cf88701a00f3f5`) found the supplied hero presentation asset visibly clipped at the right edge on mobile 390×844. This was a confirmed visual failure.
- UI commit `d28c663f39b22fa4fa29dafa509ec30234722d73` adjusts only mobile hero layout: the image row spans viewport width, the image is centered, and its maximum width is `calc(100vw - 22px)`. Follow-up `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50` aligns the regression assertion with the intended CSS.
- Source validation/full tests PASS: [#39780674913](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913). Preview deployment PASS: [#39780674951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951).
- Fresh visual workflow [#39780674947](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947) was still in progress at last poll; no fresh screenshots have been opened. Therefore hero-fit fix remains **PENDING VISUAL VERIFICATION**.
- Preserve `public/images/hero-sd-gl052.png` byte-for-byte. It is an owner-provided standalone presentation asset, not a catalog product. No image filters, masks, blending, cropping, replacements or catalog lookups are allowed. Only display/layout CSS is in scope.
- Next: poll workflow, inspect actual mobile Light/Dark and desktop Light/Dark screenshots, confirm deployment SHA, then record exact artifact filenames and whether clipping is resolved. Do not claim overall visual parity complete.

---

## Latest UI experiment — 2026-10-22 11:16 UTC

- Dark-mode hero matte: an initial radial edge mask did not remove the visible rectangle and was superseded. Current source SHA `dff584114dfd3916219f38b24950e5bf531e2199` removes that mask and samples 8 near-edge pixels from the owner-provided hero asset; only if at least 6 are neutral/light does it enable the existing display-only SVG matte filter for the Dark hero. The image URL and pixels/catalog mapping are untouched.
- Current source validation/tests PASS: [#39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097). Preview deploy PASS: [#39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), concrete URL `https://b7858119.sindarealest2.pages.dev/`.
- Fresh live audit [#39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207) is pending; no screenshot artifact available at the last poll. Do not declare the matte successful until actual 390×844 and 1440×900 Dark screenshots plus Light controls are opened.
- Two intermediate test failures were repaired before current validation passed: test fake image lacks `classList`, so calls now use optional guards; assertion was updated for optional-chain `classList.toggle`. Do not repeat earlier failures as current state.
- Decision rule: if the rectangle remains or the shoe silhouette/colour is affected, revert only `syncHeroBackgroundKey`, its Dark-mode filter rule, and the corresponding parity assertion, then re-run validation. Do not layer another blind filter.


# VISUAL AUDIT PROGRESS — SINDAREALEST2

## Startup video review — observational evidence

## Startup first-paint evidence — run #39762445821 (2026-10-22)

- Inspected the four captured startup videos in artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837): 360×800 and 390×844, Light and Dark. Each video is approximately 1.08–1.16 seconds.
- Parsed `live-preview/visual-audit.json`: `firstPaintCoverageComplete=true`, `firstPaintVideoCoverageComplete=true`, `firstPaintFrameCount=20`, `firstPaintViolationCount=0`, `firstPaintVideoCount=4`. Across the four startup timelines there are 107 recorded samples; all have `violation=false`. While the welcome splash owns the screen, the bottom navigation and account drawer are recorded as not visible. No account flash or bottom-toolbar overlap was captured in these runs.
- **Evidence limit:** the artifact's deployment metadata check failed because it expected `e916ce590b6dbd720dca51405097d20333ce649b` but Cloudflare reported `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. Commit comparison shows the seven intervening commits touched documentation only, no storefront code; thus this is strong observational evidence for the same storefront source, but not a new exact-SHA-verified audit. Keep the startup issue as `PASS — captured runs only; device-specific report not disproved`, and do not rerun without new contrary evidence or a new source/environment.


## Manual screenshot review — 2026-10-22 10:35 UTC

- Opened both original reference PNGs, both icon boards, and the observational capture artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837). Home screenshots were visually checked at 360×800, 390×844, 768×1024 and 1440×900 in Light/Dark. Key states sampled: startup splash, benefits, product detail/gallery, favorite pressed in both themes, account, cart-with-item, checkout form, contact/Zalo and 404.
- Artifact machine summary: 128 live screenshots, 8/8 pairs, 13 routes, zero recorded failed requests/hard failures. However `deployment-verification.json` failed exact-SHA verification: expected `e916ce590b6dbd720dca51405097d20333ce649b`, observed Preview commit `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. This artifact is real visual evidence, **not exact-SHA acceptance**.
- Icon comparison: sampled line icons/pressed favorite tint broadly follow the light-blue/navy palette. Keep ICON-PARITY open; no UI code change was justified by the sampled icon states alone. Preserve the official logo asset as-is.
- Confirmed issue, route `/sanpham/sneaker/sneakers-33-48`: `product-detail-modal-direct-open-mobile-light-390x844.png` shows black high-top boots at image 01/19, while `product-gallery-next-mobile-light-390x844.png` shows a different green/white sneaker at image 02/19. Do not modify product/catalog/image mapping in this UI-only scope; mark as a trusted catalog/mapping blocker. Gallery navigation PASS is not image-consistency PASS.
- The owner-supplied hero `/images/hero-sd-gl052.png` loads. In Dark screenshots the image has a bright gray field behind the shoes, reducing contrast versus the dark reference; no speculative blend/filter was applied because the background appears tied to the supplied asset and a filter could alter product appearance. Keep this as an open visual difference while preserving the asset.
- Latest exact-SHA-verified audit remains run #39760903036 / artifact #12418615814 / SHA `fc406599e04475e232fad790efd03d46979a5a20`. New run #39762445821 is later but fails the deployment-SHA gate.

## Latest machine-verified run — 2026-10-22 UTC
- Live Preview workflow: [#39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036) — SUCCESS.
- Exact verified deployed/audited SHA: `fc406599e04475e232fad790efd03d46979a5a20`.
- Artifact: [#12418615814 — sindarealest-liquid-glass-preview-853](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814).
- Machine coverage: 128 live Preview screenshots, 8/8 viewport/theme pairs, 13 route checks, zero failed requests/hard failures. Local fixture audit separately reports 58 screenshots and is NOT live proof.
- Archive comparison is `COMPLETE_NEEDS_VISUAL_REVIEW`: manual visual inspection remains required; do not call visual parity complete based on workflow status alone.

Current summary: [docs/handoff/CURRENT-STATE.md](handoff/CURRENT-STATE.md). This file tracks the audit plan and open visual acceptance criteria; current SHA/run facts must be read from the canonical summary.

## Required reference set
- Mobile Light: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`
- Mobile Dark: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`
- Icon board: `docs/icon-assets/Icon.png`
- Detail icon board: `docs/icon-assets/Chitiet.png`

## Required capture matrix
- Viewports: 360×800, 390×844, 768×1024, 1440×900.
- Themes: Light and Dark at every viewport (8 combinations).
- Capture and inspect real Preview screenshots; local fixtures are not live proof.

## Visual acceptance checklist
- [ ] Open latest live artifact and inspect screenshots for all 8 viewport/theme combinations.
- [ ] Compare header, official logo, menu and owner-approved hero asset.
- [ ] Confirm the six Liquid Glass tiles have three glass layers and no page-wide blur.
- [ ] Compare satin-fold lighting and contrast in both themes.
- [ ] Compare the trust/order section and all promise/service icons with both icon reference boards; SVGs should have consistent stroke, size, alignment and theme color. Text glyphs such as `◇`, `✧`, `◷`, `✓`, `✦` are not accepted as finished icon replacements without comparison.
- [ ] Review catalog, search, cards, product detail, gallery main image/thumbnails and “Tuyển chọn 25”.
- [ ] Review cart, account drawer, checkout, Zalo CTA, footer and real 404 in Light/Dark.
- [ ] Record every mismatch with route, viewport, theme, screenshot filename and exact visual difference.
- [ ] For each confirmed mismatch, make the smallest fix and run only affected tests; then deploy Preview, verify exact deployed SHA, run the relevant live audit and inspect the new artifact.

## Confirmed prior interaction evidence (historical; exact SHA only)
- Gallery press: 4/4 PASS and fly-to-cart: 6/6 PASS + 2 animation-edge PASS in audit #39756327625 for SHA `78b0a673a610501bfa4048df0ed614ff48246f97`.
- Full artifact: [#12416207670](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625/artifacts/12416207670).
- Do not treat that historical audit as proof for later commits. Check the newest workflow/artifact first.

## Known non-visual dependency
QR/payment remains fail-closed until trusted backend order confirmation and receiver/payment configuration are available. This is not permission to fabricate QR data or modify backend/Admin in this task.
