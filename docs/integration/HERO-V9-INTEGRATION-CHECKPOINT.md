# HERO V10 — Native web composition, replaces flattened V9 artwork
**Checkpoint:** 2026-10-25 — staging PR #115, no deploy or merge.

## Correction
The previous V9 approach pasted complete reference WebPs in a picture element, visually hid the HTML copy, and placed a transparent CTA hitbox over the baked-in button. That is rejected for a real website. Previous 99.9% full-image pixel parity was misleading and **withdrawn as an acceptance measure**.

This change removes the desktop/mobile full-banner picture and V9 stylesheet. The HERO is now rebuilt from independent live elements:
- A real editable/selectable Vietnamese H1 (three separate spans), with “đẳng cấp” highlighted in red through CSS.
- Readable native description and pill CTA (“Khám phá ngay”), keyboard focus, hover, normal click and hash navigation.
- Original owner-supplied transparent PNG shoes, unchanged blob `c17cc9058ae3008dc662806d21d2cf8f7d83b8a9`, loaded using the original app path/hook.
- The separate original marble podium WebP, unchanged blob `25230efbf4d3c9457dc36ce91b75fbf60f56d157`, softly blended with native CSS lighting/shadows and gradients.
- Horizontal text-left / shoes-right layout on desktop and mobile, with responsive CSS adjustments at 760px, 350px and intermediate widths.
- No full-banner WebP, no background replacement wallpaper, no hidden headline, no invisible CTA.

## Test approach
`tests/hero-render-reference.test.mjs` **now forbids** flattened HERO imagery and hidden typography while verifying original product/pedestal asset headers and CSS/DOM structure.

`scripts/audit-hero-local-v9.mjs` despite its retained compatibility filename now runs the **native** Hero test on seven Chromium widths × two themes. It verifies text visibility, CTA styling and keyboard Enter navigation, independent shoe PNG, podium background, overflow and local screenshots — no false full-image overlay pixel comparison.

## Scope and safety
- Apply only on `feature/hero-v9-integrated-2026-10-25`; PR #115 is DRAFT targeting `integration/full-site-admin-storefront-2026-10-25`.
- Original combined Admin/Storefront product/order/QR/welcome handlers remain unchanged.
- CI is NO-DEPLOY; Production D1/R2, main and other PRs remain untouched.
- Before any deploy, verify isolated Preview bindings and obtain user approval after comparing screenshots with the reference.
