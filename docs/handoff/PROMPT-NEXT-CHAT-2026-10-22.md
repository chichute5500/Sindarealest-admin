# IMMEDIATE OVERRIDE — 2026-10-22 12:46 UTC

Continue existing work; do not restart or ask the owner to repeat context. Read `docs/handoff/CURRENT-STATE.md` first and refresh live branch HEAD, PR #108, Actions, artifact and Cloudflare deployment metadata.

Current known state:
- Branch `fix/liquid-glass-audit-2026-10-19`; HEAD `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`; PR #108 OPEN and MUST NOT MERGE.
- UI change `d28c663f39b22fa4fa29dafa509ec30234722d73` fixed mobile hero viewport fit/centering in `public/index.html`; follow-up `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50` updated the exact CSS regression assertion.
- Full validation/tests PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951
- Visual audit #39780674947 was IN_PROGRESS at last poll, during Chromium installation. Do not assume it passed or that the screenshot fix is visually accepted. Admin Preview Playwright #39780674999 was pending and is not authorization to edit Admin.
- Prior real screenshot artifact #12426665632 revealed the 390×844 hero image clipped at the right edge. New viewport-fit CSS is intended to fix this, but only accept after opening fresh exact-SHA Preview screenshots.

## Absolute owner asset lock
`public/images/hero-sd-gl052.png` is an owner-supplied standalone presentation asset, not a product, SKU, catalog record, gallery image or database-backed image. Never replace, recreate, retouch, recolour, crop/recompose, remove/key its background, apply filters/masks/blend modes, or alter pixels. Never investigate SD-GL052 in the catalog. Only correct loading/visibility/layout plumbing; the image must be visible independently of catalog/API outcomes. Preserve its file bytes and the official logo.

## Required next actions
1. Poll #39780674947. If complete, download artifact and inspect `section-hero-mobile-light-390x844.png`, mobile Dark, desktop Light/Dark and other viewport hero screenshots. Compare with the supplied source and verify no clipping, effects or asset change.
2. Check deployment verification JSON and require exact deployed/audited SHA match. If screenshot coverage is missing, use only the guarded read-only Preview workflow; never use Production.
3. If visual failure, inspect logs and make the smallest evidence-based correction, then rerun affected tests and Preview audit.
4. Update CURRENT-STATE, TEST-RESULTS and visual audit progress with exact SHA, URLs, artifact and verified findings. Update this prompt last. Keep older notes clearly historical/superseded.
5. Continue autonomously after reporting. Never ask “continue?”. Stop only for genuine user permission/action or unavailable trusted data.

## Scope
Preview/static storefront only. Do not merge PR #108; no Production/main/Admin/backend/API/auth/schema/business logic/catalog/product image mapping/D1/R2/bindings/secrets/DNS/Access changes. QR/payment remains fail-closed; never fabricate payment data or submit real checkout.

---

# NEW CHAT — MANDATORY INCIDENT OVERRIDE (2026-10-22)


You are taking over existing work, not restarting. Read `docs/handoff/CURRENT-STATE.md` first, then fetch live GitHub branch HEAD, PR #108, relevant workflow runs/artifacts, current source, and Cloudflare Preview deployment metadata. Current last-known branch HEAD: `e4bcc7cb978743693077694baddf0801832d0808`; source commit: `fb997b448a80a0bc9f34e75b4a31b7b450951fed`. Refresh rather than assuming these remain current.

**Incident context:** The owner says the assistant removed/deleted the owner-supplied hero image before the lock rule was written. Accept responsibility; do not argue, minimize, or ask the owner to repeat the context. Owner is transferring to a new chat.

**ABSOLUTE HERO ASSET LOCK:** `public/images/hero-sd-gl052.png` is a standalone owner-supplied presentation asset, not a product/SKU/catalog/gallery/database image. It is protected like the official logo. Never replace, recreate, retouch, recolour, crop/recompose, background-key/remove, filter, mask, or alter pixels. Never investigate SKU/catalog linkage. Only fix visibility/loading plumbing so this exact asset appears unchanged and independently of product/API success. Keep original PNG bytes intact.

**Known violation to investigate first:** source commit `fb997b4` has hero-specific CSS `filter:drop-shadow(...)` on `#home .hero-visual img` around lines 2413/2438, despite the new absolute lock. Remove only hero-specific visual effects/transforms that change the supplied image's appearance; don't change product image styles globally. Add a regression test proving no image filters/masks/blend/crop/recomposition on the hero and API failure does not hide it. Before patching, inspect history/current source and confirm exact paths. Then run targeted tests, deploy Preview only, verify exact deployed SHA, capture and OPEN real Preview screenshots (360×800 and 1440×900 at minimum, Light/Dark), compare hero against the supplied original. Do not claim success from green CI alone.

Latest evidence: validation #39773486071 PASS; Preview deployment workflow #39773485868 PASS; visual workflow #39773486043 success with artifact `12423387968`, but dedicated guarded live-capture step was skipped. Review the artifact first; do not assume it proves the hero is correct. Links and full boundaries are in CURRENT-STATE.md.

PR #108 must remain OPEN and unmerged. Preview/static storefront only. No Production/main/Admin/backend/API/auth/data/D1/R2/config/secrets/DNS/Access changes. Continue autonomously after reports; only stop for a genuine owner action or permission blocker. No false completion percentages.


## ABSOLUTE HERO ASSET LOCK — OWNER-SUPPLIED IMAGE (2026-10-22)

**The hero image is a standalone owner-provided presentation asset, not a product listing, SKU, catalog record, product-gallery image, or database-backed product image.** The owner personally supplied `/images/hero-sd-gl052.png` for the hero. Treat this asset as protected at the same level as the official brand logo.

- **Do not change it.** Never replace, redraw, regenerate, retouch, recolour, crop/recompose, key/remove its background, apply filters/masks, alter pixels, or substitute another image. Do not run image-processing experiments against it. Keep the original asset file and its bytes intact.
- Do not search the catalog for SD-GL052, validate its SKU, infer product identity, map it to a catalog item, or make hero visibility depend on product/API/catalog success. Its filename does not make it a catalog image; there is no catalog dependency to resolve.
- Only the page's loading/visibility plumbing may be corrected when needed to show this exact owner-supplied file unchanged. On catalog API failure, the hero image must still load and remain visible. Confirm the exact asset URL and image pixels in the actual Preview screenshot before declaring completion.
- If an older note describes hero matte-keying, background removal, sampling edge pixels, or treating hero as a product-image/SKU blocker, that note is superseded by this rule and must not be followed.

# LATEST OVERRIDE — 2026-10-22 11:20 UTC

PR #108 remains OPEN / MUST NOT MERGE. Latest **storefront source** SHA is `dff584114dfd3916219f38b24950e5bf531e2199`; docs-only commits may make current branch HEAD newer. Validation/tests PASS: [#39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097). Preview deploy PASS: [#39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), deployment URL `https://b7858119.sindarealest2.pages.dev/`, alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Latest live visual audit [#39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207) was PENDING with no artifact at last check.

Documentation sync triggered PR validation jobs on each docs-only commit even though docs are excluded from push deploy triggers. Current source evidence is run #39769146097 for source SHA `dff584114dfd3916219f38b24950e5bf531e2199`; do not treat later docs-only HEAD validation runs as new storefront deployments. Minimize future docs commits by batching changes when possible.

Current UI patch replaced a visually ineffective radial edge mask with conditional Dark-mode matte keying: sample 8 edge/corner points from the unchanged owner-supplied hero image; use existing SVG matte filter only when >=6 neutral/light votes pass. Do not accept/reject until you download and inspect the live artifact (Dark 390×844 and 1440×900, plus Light comparison). If rectangle remains or product edges/colour suffer, revert this helper + filter + test assertion; do not stack filters. Full validation passed on source SHA above after two intermediate test failures were repaired (mock image missing `classList`, then stale optional-chain assertion).

Next chat: read CURRENT-STATE first, refresh branch HEAD/PR/run/deployment metadata and audit status, inspect artifact screenshots, update all handoff evidence. Keep product-gallery mapping read-only, preserve hero path, do not merge PR, deploy Production or touch Admin/backend/data/payments.

---

# LATEST OVERRIDE — 2026-10-22 10:35 UTC

Before any further source action, fetch branch HEAD and PR #108 again; the HEAD at review start was `7455b50179f3fa0babebab84266b67a53b8b6231`, and this handoff-only update may advance it. PR #108 stays OPEN and MUST NOT MERGE.

Newer artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837) contains 128 real Preview screenshots and both icon/reference boards, but deployment verification FAILED: expected `e916ce590b6dbd720dca51405097d20333ce649b`, observed deployed commit `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. Use the images for visual observation only. The last exact-SHA-verified audit remains run #39760903036 / artifact #12418615814 / SHA `fc406599e04475e232fad790efd03d46979a5a20`.

Manual review has confirmed a “Tuyển chọn 25” gallery inconsistency: image 01/19 shows black high-top boots, image 02/19 a different green/white sneaker; evidence filenames are in the visual audit note. Do not change or hide product/image mappings under this UI-only scope. Both Icon.png and Chitiet.png were freshly opened; sampled icons look broadly aligned, but ICON-PARITY stays open. The provided `/images/hero-sd-gl052.png` remains visible and untouched.

Startup capture work is no longer an open repeat task: artifact #12418823837 includes 4 welcome-startup videos (360/390 px, Light/Dark), 107 timeline samples and 0 first-paint violations. Bottom nav/account drawer stay hidden while welcome owns the screen in captured runs. Deployment metadata SHA mismatch means observational, not exact-SHA proof; do not rerun this unless new contrary evidence or a source/environment change appears.

Next: refresh current SHA/deployment metadata; continue only safe evidence-backed UI work; keep visual/icon parity open; never merge PR, touch Production/main/Admin/backend/product mappings or submit checkout/payment. Read CURRENT-STATE.md as source of truth.

---

# PROMPT CHAT MỚI — SINDAREALEST2
Updated 2026-10-22. This prompt replaces older instructions that conflict with the canonical current-state file.

You are continuing existing work, not restarting. First read `docs/handoff/CURRENT-STATE.md`, then inspect current GitHub branch HEAD and PR #108. Read `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/handoff/TASKS.md`, `docs/visual-audit-progress-2026-10-19.md`, and relevant icon-system docs. Confirm actual current run/deployment status; do not rely on stale pasted SHAs. Latest known live run #39760903036 succeeded for exact SHA `fc406599e04475e232fad790efd03d46979a5a20`, artifact #12418615814; check if a newer run exists.

## Work rules
- Keep working after every report; do not stop to ask “continue?”.
- Never repeat already-PASS tests unless code, environment, test definition or evidence requires it.
- Diagnose failures from logs, fix the smallest cause, rerun affected checks and verify.
- Distinguish branch HEAD, deployed Preview SHA and audited SHA.
- Open real screenshots; workflow PASS/JSON alone does not prove visual parity.
- After meaningful work, update current-state and evidence docs, then automatically do the next useful action.
- Stop only if a user permission/action/decision or unavailable trusted data is genuinely required.

## Scope lock
Repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN and MUST NOT MERGE. Preview only. No Production/main, Admin, backend/API/auth/schema/business logic, product data/SKU/price/image mapping, D1/R2, bindings, secrets, DNS or Access changes. No real checkout or money transfer.

Keep `/images/hero-sd-gl052.png` visible. Do not reopen the old SKU blocker. QR/payment stays fail-closed pending trusted backend confirmation/configuration.

## Immediate task
Follow the ordered next actions in `docs/handoff/CURRENT-STATE.md`: verify current HEAD and check for later runs; inspect actual live screenshots against both original references and inspect `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png`; review “Tuyển chọn 25” gallery consistency without changing product mapping; make only evidence-backed UI fixes.

For each fix: identify route/viewport/theme and screenshot → minimal patch → relevant tests → Preview deploy → verify exact deployment SHA → live audit → inspect artifact → update handoff. Do not claim 100% completion while visual differences remain.
