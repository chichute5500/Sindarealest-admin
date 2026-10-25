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

## 7. V14 native layered checkpoint — 2026-10-26 Asia/Ho_Chi_Minh

> **VISUAL FAIL — NOT 95%, NOT OWNER-APPROVED, NO MERGE.** Technical CI success is not design acceptance.

### Source, Preview and safety

- Writable branch only: feature/hero-v9-integrated-2026-10-25. PR #115 remains Draft.
- Exact Preview application SHA before the documentation-only checkpoint: e8497d4f764110007e41fb4797728581d0ce569b. Recheck latest GitHub HEAD before touching any file.
- Verified immutable isolated deployment: https://82f400e8.sindarealest-admin-preview.pages.dev/
- Historic branch alias for the same Preview: https://hero-v11-native-20261025.sindarealest-admin-preview.pages.dev/
- Preview run #40217731968 PASS. D1/R2 independent identities verified before deployment; post-deploy checks proved native HTML, separate PNG shoes, vector stone and decorative-only silk SVG. The deploy target is isolated Admin Pages Preview, not Production.

### Actual completed code work (not visual approval)

1. Removed 392 obsolete HERO CSS selectors. public/index.html now has one isolated authoritative style#sd-hero-component-authority with no new !important overrides. Other accepted Storefront/Admin styling and protections retained.
2. Actual native three-line HTML heading, CSS-only ruby gradient for Đẳng cấp, native description and clickable/keyboard-activated CTA. No composite full-banner bitmap, screenshot hitbox or embedded image masquerading as HTML.
3. Original 1200×1600 owner transparent shoe PNG remains byte-identical and independent: public/images/hero-upload/tb_image_share_1792519964514 (1).png.
4. Independent silk: public/images/hero-rebuild/silk-waves.svg — decorative gradients/paths only. Independent vector marble: public/images/hero-rebuild/marble-shelf-v14.svg — separate top/face, soft fade, curved gold veins, no text or baked composite. Separate localized contact shadows.
5. Actual Chromium HTML screenshots in light+dark at widths 320, 360, 390, 768, 980, 1280, 1440 (14 captures). Additional pixel-alpha QA asserts no opaque shoe PNG pixels cover real description or CTA at any width.
6. At source SHA 723d47e020e32dac447438f3171244ec5ecd422c: Validate #40217448593 PASS; native Chromium #40217452710 PASS; full integration #40217452804 PASS. Later isolated preview workflow also passed.
7. Admin, orders, QR, payment, D1/R2 and protected source hashes remain outside modified application scope. No Production writes, merges or deployments.

### Critical visual items still FAIL

- Marble shelf/top/face: current pale vector stone is still too smooth and distinguishable as a standalone oval compared with naturally veined illuminated stone seamlessly blending into the master image floor. More authentic material and grounded transition required.
- Silk backdrop: current separate gradient vector waves are still smoother and less photographic than the complex billowing satin/ice of the primary master. Need correct shadow/peak/refraction/light variation.
- Native serif: relative proportions improved, but fine high-contrast luxury letterforms, baseline spacing and exact ruby treatment lack objective >=95% reference parity evidence.
- Grounding: transparent shoe and local contact shadows are technically separate and positioned closer, but their optical contact on the natural stone still needs strict side-by-side review.
- Mobile 320/360/390 remains horizontal text-left/shoes-right and has ZERO detected opaque shoe overlap with copy/CTA; it still lacks explicit >=95% visual acceptance.
- Button is real/focusable and passes functional QA; exact premium shape/border/typography remains a visual approval gate.

### Mandatory next action

Open ChatGPT Library /SinDarealest/HERO-REFERENCE/ and the main REFERENCE-DESKTOP-luxury-red-text.png; retrieve latest exact-SHA Chromium screenshot artifact from run #40217452710 (or newer). Compare side-by-side at consistent crop/scale, region by region. Edit ONLY the authoritative HERO CSS and separate artwork, repeat all 14 real-browser screenshots and protection tests; keep Visual FAIL until >95% evidence in every important region AND the user explicitly approves. Preserve PR Draft and no Production deployment.


## 8. V17 rigorously compared checkpoint — 2026-10-26 VN / 2026-10-25 UTC

> **VISUAL FAIL. Objective similarity remains far below 0.95 in EVERY region. Do not describe the HERO as 95%, approved, complete or production ready.** The owner's refusal to reduce the threshold stands. Technical PASS does not override visual FAIL.

### Exact implementation and true browser evidence

- Last exact source + integration workflow commit before this documentation add: `ff901d333983ea6c35f392e2b6948e212aa83e3e`. Requery latest HEAD after doc writes.
- Native Chromium run **[40220877828 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877828)**: all 7 widths (320, 360, 390, 768, 980, 1280, 1440) × light/dark = **14 actual screenshot PNGs**, [artifact 12608909260](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877828/artifacts/12608909260). All original 1200x1600 transparent shoe PNG alpha/contact guards, no description/CTA opaque pixel collisions; scroll overflow zero.
- [Full-site integration run 40220877862 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877862): exact original owner-shoe and protected Admin/Storefront hashes retained. [Validate source 40220872983 — PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220872983). **No Production write / merge / D1/R2 mutation.**
- PR **#115 Draft**, branch `feature/hero-v9-integrated-2026-10-25`.
- **No V17 Preview deployment** was made because V17 is visually FAIL. Existing isolated Preview alias still serves the earlier V14 deployment, not V17: `https://hero-v11-native-20261025.sindarealest-admin-preview.pages.dev/`. Do not mislabel Preview V14 as V17.

### Measured screenshot versus original ground truth (strict, not inferred)

Primary owner-approved *visual design target* remains `/SinDarealest/HERO-REFERENCE/REFERENCE-DESKTOP-luxury-red-text.png` in ChatGPT Library, NOT checked into repo. Browser screenshot `pc-1440-light.png` from artifact 12608909260 is the actual DOM/CSS render, never a design export. Reference resized to browser screenshot 1380×677 for same 2:1 hero canvas. RGB, direct structural similarity index **SSIM, windowed via skimage.metrics.structural_similarity(channel_axis=2, data_range=255)**. Region coordinates are fractions `(left, right, top, bottom)` of the exact same canvas:

| Region | Relative crop | V14 baseline | V16 | Current V17 | Required |
|---|---|---:|---:|---:|---:|
| Heading/type | (.07,.50,.11,.60) | .606 | .599 | **.599** | ≥.950 |
| Upper-right satin | (.50,.98,.00,.42) | .795 | .787 | **.787** | ≥.950 |
| Lower silk/floor | (.00,.48,.78,.98) | .748 | .773 | **.794** | ≥.950 |
| Shoes plus stage | (.52,.97,.30,.90) | .356 | .341 | **.328** | ≥.950 |
| Lower marble | (.40,.98,.70,.98) | .448 | .381 | **.418** | ≥.950 |
| CTA | (.07,.33,.65,.92) | .589 | .651 | **.651** | ≥.950 |
| Overall frame | (0,1,0,1) | .622 | .609 | **.615** | ≥.950 |

SSIM is a strict screenshot metric, NOT an arbitrary visual-approval percentage; perceptual and human visual check remain mandatory. It proves that V17 **does not remotely justify a 95% claim**, and even the aggregate measure is slightly below V14. Do not cherry-pick the best region or redefine the target as internal functional test pass.

### Trials, results and precise remaining failures

1. V15 `74aad7aa`/ `5bcb5ee2`: independently authored SVG mineral facets/veins and new layered satin background. True V15 Chromium screenshot showed **cartoonish looping gold lines and evenly spaced vector ribbons**; V15 SSIM worsened globally to .609. **Rejected generated spaghetti-gold lines**.
2. V16 `98d088fc`: reverted gold-squiggle approach; restored V14 marble geometry with localized faceted, branching microfaults, natural grain (all vector only); `089c56fb` refined native desktop headline spacing, actual semantic copy balancing, CTA and horizontal shoe anchoring. V16 technical tests pass but visually FAIL.
3. Tried original preserved `ai-marble-pedestal.webp` as standalone stage layer at `76480c07`; screenshot exposed a **dark navy circular platter**, clearly inconsistent with pale blue/gold reference. **Reverted at `7ff5094a`** after real screenshot; do not repeat.
4. V17 `8b34b1f2` compacted ONLY desktop standalone marble height and repositioned it to match reference floor depth more closely. Actual Chromium compared after `ff901d333`: floor SSIM improved (.773→.794), marble (.381→.418), but shoes-stage (.341→.328) and full frame (.609→.615) remain clearly FAIL.
5. Essential unresolved: reference contains **photorealistic natural satin specular folds, authentic semitranslucent gold-veined stone**, and **a different left-loafer relative height/shape** from the owner's original paired-shoe PNG. Right upright shoe now reasonably aligned but left flat shoe in browser is visibly ~50px too low relative to master after normalization. Do not claim it can be solved by global translation alone. Current V17 stone is still faceted-vector, not the photographed mineral surface; studio lighting and reflection remain wrong.
6. Only permitted solution direction: redesign *separate* background/pedestal art or geometry with high-quality genuine texture/lighting, keep native live heading, copy and working CTA, preserve original shoe source bytes, no baked hero screenshot, no font/button imitation, no accumulated CSS `!important`. If proposing crop/layer of the same owner source image, independently validate genuine DOM assets, contact, photo-copy collision, and all 14 responsive screenshots. Never weaken a test merely to get green.
7. Next strict loop: start from actual V17 14-view artifact and primary master. Fix visual FAIL (especially stage, silk, relative left-shoe geometry); run local browser QA/compare same-sized screenshots and record per-region SSIM & owner-facing screenshot. Any essential region below 0.95 => FAIL. Reconfirm isolated Preview D1/R2 safety before any future *Preview-only* deploy, maintain Draft and no Production.

**Latest owner instruction:** no lowering the original assistant-promised 95–99% quality bar; assistant must inspect its OWN browser renders before presenting. This checkpoint is intentionally FAIL and preserves the truth.
