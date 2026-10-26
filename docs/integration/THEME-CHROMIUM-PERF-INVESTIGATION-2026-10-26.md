# SinDarealest — Theme Chromium performance investigation
**Checkpoint:** 2026-10-26. **Repository:** `chichute5500/Sindarealest-admin` / **Branch:** `integration/storefront-locked-on-main-2026-10-26`.

## Release status
PR #118 remains **OPEN/DRAFT**. Do not merge or deploy Production, write Production D1/R2, or declare Theme QA PASS. HERO, Welcome, Material Gallery, Liquid Glass and Admin previously approved by the owner remain unchanged.

## Reproducible failure
- Integrated isolated Preview GitHub run [#40315756996](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40315756996): source/deploy + checkout/Admin pass, browser theme fails because navbar and background begin after ~212ms and complete ~415ms despite `220ms` CSS duration.
- **Strict acceptance gate remains:** transitionstart <=80ms after click; transitionend <=300ms; navbar and background transitionstarts <=40ms apart; CSS actual duration around 220ms; full progress and final colors must match.
- Chromium script `scripts/qa-storefront-theme-material.mjs` uses the original strict gate. It was restored after test-only A/B experiments to avoid adding ~12 extra theme toggles per desktop/mobile to every gated run.

## Parallel independent read-only QA
Added `.github/workflows/theme-chromium-readonly-diagnostic.yml` with a separate concurrency group. It has `contents:read` only; no deploy, no D1/R2 writes, and no Production credentials. Browser headless-shell install uses caching plus dependency fallback. `scripts/qa-theme-frame-scheduler-baseline.mjs` measures a synthetic standalone DOM to distinguish runner scheduling from storefront painting.
- Run [#40319792466](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40319792466): the **minimal browser page** begins an equivalent CSS transition in 7–29ms and finishes ~224–245ms after click. Thus the 80ms/300ms gate is feasible on the same class of runner when the page is light.
- Storefront under the same process usually begins at ~100–265ms, with script time ~1–3ms, recalculation ~20–50ms and heavy paint/frame tasks.

## Browser-only A/B results (not site design changes)
Numbers fluctuate between runs, so no one-row improvement counts as a fix.

| Test-only variant | Representative start measurements | Interpretation |
|---|---|---|
| Original CSS SVG wallpaper | 169/139ms dark/light; other run 212/204ms | Too slow |
| No background texture | 101/101ms; other run 112/145ms | SVG contributes, but not sole cause |
| Same SVG through decoded IMG elements | 126/146ms; other run 87/138ms | Not reliably below 80ms |
| Temporarily disable all glass blur | 115/92ms once; another run 200/169ms | Not stable; blurred UI must remain |
| Temporarily hide every lower section | 78/102ms on one run; another run 186/130ms | Not stable, and could hide visible content |
| Hide only actually offscreen sections | 154/190ms while actual offscreen IDs were products/footer | Did not resolve lag |
| Temporarily hide approved HERO | 126/109ms vs baseline 241/168ms | HERO painting contributes, but hiding it is unacceptable |
| HERO `contain: layout paint` | 143/194ms | No dependable benefit, possible visual clipping |

**Conclusion:** Delayed CSS transition events track compositor/paint workload over the complex full Storefront and timing jitter. The navbar and wallpaper starts are synchronized; JavaScript click handler is not the primary bottleneck. We must not “fix” the test by extending 80ms/300ms, by disabling approved glass/hero content, or by deleting SVG satin art without matching visual proof.

## Safe changes and next engineering work
- Retained CSS cleanup of demonstrably unused legacy image-HERO rules, removed two orphan raster images (~913 KB), audited selector overlap and protected catalog photos.
- Experimental persistent backdrop-blur removal and offscreen content-visibility were **reverted** after they failed reproducible QA.
- Next work: profile composited layers/paint invalidation on **visible** HERO and catalog glass with a real Chrome tracing capture; analyze safe precompositing and on-demand rasterization **with screenshot pixel parity**, then run the strict PC/Mobile Light/Dark matrix on exactly the proposed source SHA.
- A separate nested `<style>` issue in catalog legacy CSS is documented in `docs/integration/CSS-CASCADE-DEEP-AUDIT-2026-10-26.md`; do not enable previously dormant declarations before visual comparison.

**Latest conclusion: NOT RELEASE READY.** No production access needed for these tests.

## Follow-up measurements — compositor trace and root-class isolation

GitHub isolated read-only runs, after the baseline documented above:

- [#40325340438](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40325340438): pre-promoting navbar and backdrop layers via temporary `will-change/translateZ(0)` improves some measurements to **158–180ms start** but does **not** meet 80ms; no change applied to real CSS.
- [#40325760395](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40325760395): CDP tracing found **278 RasterTask events totaling ~248ms**, `UpdateLayoutTree` ~40ms and `Paint` ~19ms, alongside many renderer/GPU tasks. The real transition remained FAIL. Values across threads overlap and must not be summed as a single wall-clock duration.
- [#40326476494](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40326476494): original `1440×1000` viewBox SVG rasterized to lossless PNG *only within Chromium*. Original Dark 286ms/Light 236ms start, lossless raster Dark 171ms/Light 175ms; still FAIL. PNGs were 1.6MB+ each and were **not committed as site assets**. Earlier 216×150 PNG trial was insufficient resolution and discarded.
- [#40326865742](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40326865742): controlled animation of **only the existing wallpaper and navbar** on the *fully loaded Storefront* started after **130ms Dark / 102ms Light**, compared with the **315ms Dark / 210ms Light** full `html.dark` state switch. The test used an isolated `sd-layer-only-dark` CSS class and did **not** change the actual UI or persistent theme preference. This strengthens the conclusion that cascading/restyling *all* themed Storefront elements contributes significantly to the delay, beyond SVG rasterization; even the lighter controlled transition was not reliably <=80ms.

**Do not release or weaken the thresholds.** Browser-only trials are kept behind `SD_THEME_DIAGNOSTIC_VARIANTS` and `SD_THEME_TRACE` and run in a separate read-only workflow. Main release QA remains exactly the strict real-click PC/Mobile 80ms start, 300ms finish, 220ms duration and navbar/background synchronization gate.

Next candidate: prototype a correctly synchronized palette transition with isolated colour layers so that first-frame work does not invalidate all catalog and decoration styles. Require DOM/computed-style parity, screenshot matching for Light/Dark and PC/Mobile, keyboard/touch validation and a passing cold-load Chrome trace before applying to owner-approved site. This is a **proposed engineering direction**, not a verified fix.
