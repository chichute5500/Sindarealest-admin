# SinDarealest — Audit checkpoint, 31 October 2026

> Status: PARTIALLY COMPLETE. Preview deployed to an independently validated Cloudflare Pages project. Never merge or deploy to storefront production without Owner approval. Runtime scores from **first** measurement; final rerun with product-card readiness is required.

- Repo: `chichute5500/Sindarealest-admin`
- Branch: `fix/audit-2026-10` — PR #159 (DRAFT, **unmerged**)
- Baseline tag: `before-audit` → `cca1ff9be2ab7de4d89702f6dabf80d9bf3c7657`
- Confirmed Preview alias: `https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev`
- Before GitHub Actions run: `41195944418` / artifact `storefront-audit-before`
- First After run: `41195998051` / artifact `storefront-audit-after`
- Latest Preview CI: rerun on every `public/**`, `functions/**`, `tests/**` change. No production write, no production deploy.

## What is fixed/partially fixed

| Group | Work | Status | Rationale |
| --- | --- | --- | --- |
| A | Consistent home/catalog title, OpenGraph/Twitter, canonical, catalog OG image alt | Fixed (source + route tests) | Existing middleware retained and corrected |
| A | Organization schema on root; existing detail Product JSON-LD | Partial | Root Organization enabled; catalog/home product cards still not fully SSR/SSG |
| A | Show Welcome only once per tab and bypass deep-link/reduced motion | Fixed (CI) | Session-based first-paint guard |
| A | Hide 01/01 gallery controls for single image | Fixed (source), browser single-image state not fully QA | Dynamic image count checks |
| A | Guest/cloud/loading/error wording for account address; '0 đơn hàng' | Fixed (source) | Avoid conflicting sync claims |
| A | Vietnamese captions, consistent collection anchor, complete heading | Fixed (source) | Retain existing design |
| A | Mixed-price subtotal label | Fixed (source); checkout E2E pending | Do not count products awaiting quote as priced |
| A | 2-level province/ward API cache (24h), timeout and Retry UI | Fixed (source); API-error browser test pending | No PII stored in cache |
| A | Unknown non-API HTML route HTTP 404 | Fixed (live Preview HTTP 404) | Existing SPA fallback no longer masks missing URLs |
| A | Phone-only order/warranty lookup verification | NOT fixed | IP-hash rate limit existed, but phone possession/Turnstile challenge still requires security decision and safe testing |
| B | Zalo CTA wording, account terminology, design theme-color | Fixed (source) | CSS tokens/design mostly preexisting; full visual token refactor not done |
| C | Gallery pauses when offscreen; releases timer | Fixed (source) | IntersectionObserver |
| C | Theme overlay only first switch/session, shorter fade; reduced motion | Fixed (source); real Android interaction needs QA | Avoid >1s full-screen overlay |
| C | Image srcset/sizes, font subset, large-area GPU material, FPS | PARTIAL | Do not redesign owner-PASS glass or overclaim improvements without controlled visual comparison |
| D | Lighthouse + screenshots on two main pages × mobile/desktop/5 widths × dark/light | Performed, first-run artifacts available | A new capture waits for actual cards to render |
| D | Checkout 3 steps, Google login/logout, real writes, all modals and memory leaks | NOT VERIFIED | Never exercise production customer data; isolated fake-data E2E not completed |

## First-run Lighthouse: unadjusted measurements

These scores are **not equivalent A/B comparisons**, because production API returned **260** public products while isolated Preview returned **218** (verified by separate GET-only CI run). The first Preview screenshot was also taken before product cards rendered. The Preview is explicitly non-crawlable (SEO audit `is-crawlable` fails by design).

| Route / profile | Performance before → first After | Accessibility | Best Practices | SEO | LCP before → after | CLS before → after | TBT before → after |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / mobile | 27 → 92 | 96 → 96 | 100 → 100 | 100 → 69* | 23.62s → 1.70s | 0.88 → 0 | 952ms → 169ms |
| / desktop | 100 → 56 | 96 → 96 | 100 → 100 | 100 → 69* | 0.47s → 3.50s | 0.02 → 1.00 | 15ms → 0ms |
| /sanpham mobile | 72 → 66 | 96 → 96 | 100 → 100 | 100 → 69* | 22.96s → 24.07s | 0 → 0 | 18ms → 14ms |
| /sanpham desktop | 79 → 100 | 96 → 96 | 100 → 100 | 100 → 69* | 3.96s → 0.37s | 0.03 → 0 | 0ms → 0ms |

* SEO deficit is from Preview `is-crawlable`/robots disallow, not necessarily a production SEO regression; do not remove Preview noindex.

First-run CPU 4× / Fast4G-like 390px `requestAnimationFrame` scroll sample:
- Home minimum FPS: 10.0 → 59.5; average 59.6 → 59.9.
- Catalog minimum FPS: 8.6 → 59.5; average 59.2 → 59.9.
- Long tasks >50ms count: home 3 → 1, catalog 2 → 1.
- This FPS sample is **not validated as comparable** until both environments display the same product set and the same interaction sequence.

## Risk and gate

1. **High** — D1 preview/production datasets differ (260 vs 218 public products), making layout/performance comparisons uncontrolled and any Preview checkout against a missing product invalid. No production D1/KV/R2 was mutated; do not clone customer/order data.
2. **High** — Phone-number-based warranty/order lookup still lacks proof of phone possession; rate limits and masking do not provide that. Turnstile or verified one-time code needs integration and secret management on Preview.
3. **Medium** — SSR/SSG collection HTML and Product JSON-LD for listing pages are unfinished. D1 query quota makes naive per-request SSR costly; compare safe build-time snapshot vs cache-backed edge rendering before selecting.
4. **Medium** — First-run Lighthouse has worse desktop/home and mobile/catalog numbers; do not call the changes performance-PASS or merge. Remeasure when product cards are actually rendered. Do not rollback solely due different Preview catalog/noindex.
5. **Pending** — Google OAuth E2E, test-data checkout submission/cleanup, address offline/failure test, memory leak/console scan at 20 modal cycles, keyboard WCAG AA, all specific route screenshots and actual INP.

**Verified safety**: `before-audit` tag exists; draft PR is not merged; Cloudflare Preview deployment gate compared distinct project IDs and Preview vs production D1 IDs, validated Preview R2 bindings, and ran `npm run check && npm test` before deploying. No production deployments or customer-data writes were run.
