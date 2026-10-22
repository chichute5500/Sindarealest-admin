# VISUAL AUDIT PROGRESS — SINDAREALEST2

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
