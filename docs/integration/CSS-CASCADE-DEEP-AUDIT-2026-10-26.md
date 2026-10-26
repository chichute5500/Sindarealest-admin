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


## EOF markup repair and inactive image-HERO cleanup

The file scan found the final `<style id="sd-unified-icon-system-final">` was not explicitly closed, and `</body></html>` were missing. Added those closing tags (which browsers otherwise imply at EOF) without changing live declarations or the markup for the approved code-only HERO. Removed the completely dead V9.2–V9.4 CSS block, which matched only `#home.hero.wrap` / `.hero-reference-art`, while the only live `#home` is `<section class="sd-code-hero wrap"...>`. No dynamic HERO class mutation exists in the storefront source. CI now protects these closing tags.

**Remaining high-risk HTML/CSS structural debt:** Inside the preceding `<style id="sd-modal-navigation-promise-icons-2026-10-22">`, a literal nested `<style id="sd-catalog-liquid-glass-reference-2026-10-23">` occurs before its next closing tag. HTML raw-text rules mean the nested opening tag is CSS text, not a new stylesheet. Fixing that tag might activate a currently ignored first `:root` rule and alter Owner-approved catalog colours. It was deliberately *not* changed without Chromium screenshot comparison. This prevents claiming the cascade is fully cleaned.

The older counts above are initial static-match baseline, excluding the formerly unterminated final stylesheet; the updated automated report counts the now-closed stylesheet too. Do not interpret previous 326 groups as a total for every final style rule.

## Follow-up: stale V2–V9 image-only HERO CSS (isolated cleanup)

Removed 44,427 characters of legacy image-HERO rules after the non-HERO coarse-pointer/navbar/product-card section. The removed block targeted `#home.hero.wrap`, `.hero-visual`, `.hero-copy`, `.hero-actions` and `.hero-reference-art` / image-HERO descendants; the live section is `#home.sd-code-hero` with `.sdh-*` children. No keyframes or active navbar/product-card selectors were removed. Added a contract test to prevent recreating the legacy image rules. Isolated browser regression remains required; cleanup does not prove the 80ms/300ms theme performance gate.
