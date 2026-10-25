# SINDAREALEST HERO — STRICT VISUAL ACCEPTANCE + NEXT-CHAT HANDOFF (2026-10-25)

> **ABSOLUTE STATUS: VISUAL FAIL — NOT APPROVED, NOT 95%, DO NOT MERGE OR LABEL DESIGN PASS.** User explicitly rejected self-grading via functional CI alone.

## 1. Live code, isolation, exact point of continuation

- Repository: `chichute5500/Sindarealest-admin`.
- Writable isolated branch: `feature/hero-v9-integrated-2026-10-25`.
- PR #115: https://github.com/chichute5500/Sindarealest-admin/pull/115 — DRAFT; integration base `integration/full-site-admin-storefront-2026-10-25`. Branch name includes "v9" for history only; **the current DOM is V11.2 native HTML/CSS**, NOT flattened V9.
- Last audited exact code SHA **before handoff document commit**: `2b13bc9177cf764d1a3e51d72d5e44699baa2df0`. Re-query latest GitHub HEAD before touching files.
- Live isolated test alias: https://hero-v11-native-20261025.sindarealest-admin-preview.pages.dev/
- Verified immutable deployment at audit SHA: https://f5b3a6ba.sindarealest-admin-preview.pages.dev/
- Preview check run #40210282879 PASS: D1/R2 isolation, read-only verification of actual live HTML, real independent assets and no embedded flattened HERO; functional native-browser test run #40210286412 (14/14), integrated QA #40210286420 (3/3). **These are technical passes only; the overall user acceptance gate is still FAIL.**
- Do not touch main / Production, other accepted Admin screens, payment/QR, D1/R2, Storefront unrelated components. Run only fail-closed isolated Preview branch deployment after safety verification.

## 2. Exact visual references — persistent locations (ESSENTIAL)

The images **are not yet committed as source assets to GitHub**; DO NOT pretend GitHub contains them. They are uploaded into the user's persistent ChatGPT **Library**, folder:
`/SinDarealest/HERO-REFERENCE/`.

1. **PRIMARY DESKTOP DESIGN TARGET** — `/SinDarealest/HERO-REFERENCE/REFERENCE-DESKTOP-luxury-red-text.png`; original file in this chat runtime `/mnt/data/wide_elegant_luxury_product_banner_in_a_clean_mi.png`. This contains real approved *visual reference* (red highlighted "Đẳng cấp", premium silk light-blue background, shoe pair at right, blended marble stage, refined serif left copy, cream outlined CTA). The image is **REFERENCE ONLY**, NOT a website asset, NOT allowed in HTML/CSS or public builds.
2. **SECONDARY DESKTOP/MOBILE COMPOSITION GUIDANCE ONLY** — `/SinDarealest/HERO-REFERENCE/REFERENCE-LAYOUT-PC-MOBILE-older-no-red.png`; original `/mnt/data/a_clean_modern_luxury_product_hero_banner_shown_a.png`. This composite has both PC and mobile proportions but is an earlier palette/state. **Red-highlighted typography in primary reference overrides this older image.** Mobile must remain a compact horizontal card, live left copy/right shoes; no vertical stacking. This secondary image is NOT final approval for all details.
3. **CURRENT FAIL — actual PC 1440 browser screenshot** — `/SinDarealest/HERO-REFERENCE/CURRENT-FAIL-PC-1440-V11.png`; original `/mnt/data/hero-v11-2-browser/pc-1440-light.png`.
4. **CURRENT FAIL — actual mobile 390 browser screenshot** — `/SinDarealest/HERO-REFERENCE/CURRENT-FAIL-MOBILE-390-V11.png`; original `/mnt/data/hero-v11-2-browser/mobile-390-light.png`.

For future chat: use `files__list` on the Library folder and `files__read` with images or `files__materialize` for binary image comparison. Container paths from prior chats may no longer mount; the **Library folder is the persistent reference**, not a guessed /mnt/data path. If images unavailable, do NOT fake the comparison or claim 95%. Keep original samples immutable.

## 3. Approved direction and currently visible failures

- Source shoe: real owner supplied transparent PNG `public/images/hero-upload/tb_image_share_1792519964514 (1).png`. Keep shoes exactly (actual dimensions 1200×1600, alpha) and do not substitute a full picture.
- Pedestal source: `public/images/hero-upload/ai-marble-pedestal.webp` (standalone material only).
- Decorative silk: `public/images/hero-rebuild/silk-waves.svg` (actual SVG gradients/paths only). **Current silk is still visibly less dimensional than master image**. Fix via actual CSS/SVG compositing, nuanced lighting/shadows; do not use full-screenshot wallpaper or embedded image masking tricks.
- Current appearance vs master: wrong sophistication and metrics of serif font (especially capital red Đ/đ treatment), silk folds insufficient realism/contrast, pedestal reads as separate element instead of softly merging into ground, shoe-stage contact shadows and shoe scaling/position not locked to reference, copy/CTA type scale and spacing inaccurate. **All these visual dimensions are FAIL** despite valid DOM and responsive function.

## 4. HARD NON-NEGOTIABLE ACCEPTANCE GATES

**A. No fraudulent artwork:** Never serve the rendered reference image itself, flattened desktop/mobile HERO WebP/PNG, base64/data URI/canvas screenshot, CSS background containing typography/product/CTA, opaque panel hiding native elements, transparent clickable rectangle over drawn CTA, screenshot embedded in SVG via image/foreignObject, or any technique that simulates a full HTML hero via a single picture. Reference image is for comparison ONLY. The real website: h1/span and p native selectable DOM, a[href='#products'] with visible native button text/styles, independent transparent shoe image, independent pedestal art, and purely decorative background SVG/CSS. Browser inspect nodes and network assets to prove.
**B. CSS must NOT be piled up:** Existing `public/index.html` currently contains historical V2–V11 repetitive overrides and `!important` rules. Before final acceptance **refactor/collapse all effective HERO selectors into ONE authoritative component stylesheet or single contiguous isolated block**, preserve unrelated selectors, eliminate conflicting orphaned old hero rules, minimize `!important`, and verify final computed styles/selector collisions across breakpoints. Do not solve each visual failure with another appended CSS block. Run functional and screenshot regression after refactor.
**C. Visual match target:** User mandates **>95% agreement with the approved design, including EVERY critical part**: typography and red treatment, satin folds and lighting, pedestal blended into web, shoes anchored (no floating heels), actual proportions/spacing, CTA styling and readable mobile compact layout. **No self-declared numeric 95% without objective evidence + human visual check.** Browser screenshot/ground-truth pair must share viewport geometry/crop/scale. Use a reliable perceptual metric (SSIM/LPIPS or region metrics) only if truly computed; metric is *additional*, not a loophole. Compare by named regions (typography, silk background, pedestal/contact, shoes, layout, button). Any unresolved critical visual region below target -> **FAIL**, irrespective of aggregate score. If render target cannot be perfectly recreated without source assets, report exact discrepancy; do not game metrics or cut out hard areas.
**D. Strict retry cycle:** Edit -> run source/CI -> launch Chromium at 320, 360, 390, 768, 980, 1280, 1440 (light & dark) -> capture actual HERO screenshot, computed style/DOM proof -> visually compare side-by-side to unmodified primary reference at appropriate viewport -> identify deviations -> refactor/fix -> repeat. Never present source-image rendering as browser screenshot. Never mark completed from CI green alone.
**E. Safety:** no Production, no main merges, no accidental deployments to storefront2 Production or shared D1/R2. Isolated Preview safety preflight and exact deployed-source live HTML inspection required before user review.
**F. Final acceptance:** independent functional/technical PASS; visual 95% per critical region verified and personally reviewed; owner gives explicit approval. Until then overall state FAIL, PR remains Draft.

## 5. Files, tests, and practical first next actions

- HTML/CSS: `public/index.html`; existing native DOM `<section class="hero wrap" id="home">`, `#heroProductImage`, `.hero-pedestal-art`, live h1 and CTA.
- CSS background art: `public/images/hero-rebuild/silk-waves.svg`.
- Native no-deception test: `tests/hero-render-reference.test.mjs`.
- Browser screenshot QA: `scripts/audit-hero-local-v9.mjs` (historical filename, actually tests V11 native).
- Integrated QA workflow: `.github/workflows/full-site-integration-acceptance.yml`; native browser: `.github/workflows/hero-v9-local-visual-qa.yml`; guarded Preview: `.github/workflows/hero-v10-isolated-preview.yml` (historical path names). Avoid accidental push deploy until ready.
- Existing problem: CSS stacks V2–V11 patches. First audit computed style and consolidate; then fix visual issues in measured iterations. Keep code diff scope HERO-only, no approved-portion redesign.
- Generate real screenshot evidence and short per-region comparison report with links/paths, last tested commit, blockers, failures and percentage methodology. Commit reports and NEXT_CHAT prompt to the branch; no false 95% PASS.

## 6. User's latest instruction, faithfully retained

"Yêu cầu tối cao. Mỗi lần làm xong sẽ tự chụp lại đánh giá, chưa đạt trên 95% tự làm lại đến khi hoàn thành. Kiểm tra cấm chồng css gây lỗi, cấm dùng ảnh để lừa." Do not ask the user to re-explain history, and do not make them evaluate obviously unfinished designs. No asynchronous promises; execute real work within each chat and leave a precise checkpoint.
