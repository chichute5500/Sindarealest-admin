# SinDarealest — CSS & static asset audit (2026-10-26)

Scope: integration branch only, PR #118 stays OPEN/DRAFT. Owner approved the revised HERO. Never merge or deploy Production without authorization.

## Verified findings
- The public homepage contains 22 inline style blocks, approximately 213 KB; multiple historical CSS overrides remain.
- Four stale global theme-transitioning selectors (1.15s, 0.25s and 0.22s, including costly shadow/blur) were removed; the authoritative 0.22s navbar/background rules are retained in material-gallery.css.
- Chromium theme QA now records real elapsed times, frame timing, long tasks and transition starts; 300ms completion requirement and synchronization checks are not relaxed.
- All 12 real crocodile-leather photographs in gallery.json are preserved.
- Two orphaned raster assets from the abandoned image HERO were removed: hero-sneaker-light.png (490137 bytes) and hero-sneaker-dark.png (423008 bytes), total 913145 bytes. No runtime source references them.
- A read-only CI asset audit checks live references, protected images, missing assets and obsolete theme selectors.
- 526 hashed product webp images may be referenced through dynamic catalog/D1, and 422 historical QA files are evidence; these remain intact.

## Follow-up / limits
- Old inactive #home.hero.wrap rules exist in historical inline blocks; deleting wholesale could break prior Owner visual contracts. Do not guess that every repeated CSS selector is redundant.
- Technical PASS of one Chromium run is not proof of all physical-device performance conditions. Preserve the intermittent theme bug history and measure under load.
- D1/R2 Production and payment systems must never be written by test runs; no Production release approval.