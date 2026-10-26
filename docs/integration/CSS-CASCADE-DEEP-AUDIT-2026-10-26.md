# SINDAREALEST — CSS cascade deep audit — 2026-10-26

Scope: `public/index.html`, `public/admin/index.html`, `public/code-hero.css`, `public/material-gallery.css`. Reviewed source order, duplicate selector+media contexts, duplicate declarations, theme transitions, `!important`, `:has()`, PC/Mobile override layers, and CI safety. Owner-accepted HERO, Welcome, Gallery and Admin visuals are locked.

## Findings — these are potential overlaps, NOT 326 proven visual bugs

| Component | Style blocks | CSS size (characters) | `!important` declarations | `:has()` usages |
| --- | ---: | ---: | ---: | ---: |
| Storefront inline | 22 | 209,951 | 555 | 37 |
| Admin inline | 1 | 110,175 | 86 | 84 |
| HERO stylesheet | 1 | 11,346 | 0 | 0 |
| Material/theme stylesheet | 1 | 3,923 | 27 | 0 |

The initial static cascade pass parsed approximately **2,802 rules**, with **326 repeated selector+condition groups**, **253 groups containing different declarations**, and **22 pairs of exactly repeated rule bodies**. Same-selector repetition is an *audit candidate*; later declarations may be deliberately designed desktop/mobile or Light/Dark calibration. The stylesheet braces were balanced in every inspected file.

High-density areas to preserve/check with Chromium before any further deletion:

- `html.dark .theme-bg--dark` (8 same-context definitions), `.theme-bg--light::after` and `.theme-bg--dark::after` (7 each): intended final pearlescent Light/Dark reference overlays; deletion may change original visual colors.
- `#home.hero.wrap`, `.hero`, and `.hero h1`: historic reference-fit passes coexist with the approved `.sd-code-hero` component; do not remove blindly because reference screenshots and some safeguards use these selectors.
- `.nav-wrap .nav` and `html.dark .nav-wrap .nav`: early base glass and reference background declarations are intentionally finished by the later theme CSS. Check exact computed style, not just whether selector occurs repeatedly.
- `.product-card`, `.glass` and mobile cards: original glass styles coexist with responsive, hover and reduced-motion states. The `html.theme-transitioning` override disables expensive per-card transitions.
- Admin `:root` / `:root[data-admin-theme="dark"]`: repeated variable definitions and screen-specific overrides exist; preserve Owner-approved Admin until a screenshot-based comparison proves a deletion safe.

## Actual cleanup performed

Removed two obsolete declarations in the **original base rules only**: navbar 1.05-second background/border/shadow transition and glass 1-second background/border/color transition. These were superseded by later rules, including the current 0.22-second navbar/background fade and 0.25-second glass fallback. Background colors, gradients, geometry, shadows, blur radius and markup were not changed.

Added `scripts/audit-css-cascade.mjs` to `npm run check`: it scans every inline/external stylesheet, fails on unbalanced braces or reintroduction of the two obsolete transition declarations, and **reports** duplicate selectors/overrides without deleting intentionally layered design CSS.

## Still outstanding

- Chromium frame timing under heavy load was not yet proven within the existing <=80ms start / <=300ms finish gate. The experimental pause of sticky glass backdrop filtering must be measured before retention.
- A full CSS flattening/reorganization is a separate high-risk task because of Owner-approved screenshots and accumulated responsive/variant contracts. No 100% cascade-clean or complete visual PASS claim is authorized from a static scan.
- Isolated Preview only; no Production merge/deploy; no writes to Production D1/R2.
