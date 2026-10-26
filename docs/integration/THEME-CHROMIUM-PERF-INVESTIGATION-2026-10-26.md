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
