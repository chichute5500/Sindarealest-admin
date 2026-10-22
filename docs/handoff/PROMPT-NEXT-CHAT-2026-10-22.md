# LATEST OVERRIDE — HERO IMAGE TEMPORARILY HIDDEN BY OWNER REQUEST (2026-10-23)

- Owner decision: temporarily remove the Hero image from the visible storefront and finish the Hero image treatment later. This is a deliberate pause, NOT Hero visual acceptance and NOT permission to delete the source asset.
- Implementation commit: `6727ee051f8f9a62bebad9eebc43d5b1cee616c4` changes `public/index.html` so `syncHeroProductImage()` keeps `#heroProductImage` hidden, removes its `src`, and marks `data-product-image-status="temporarily-disabled-owner-request"`. Commit `32d5e3c7bc3054662855eb59ef2604c02a9e4315` updates the source-level parity test for this temporary state.
- Keep the original owner-uploaded source `public/images/hero-upload/tb_image_share_1792519964514 (1).png` and its separate derivative in the repo. Do not delete, overwrite, rename, or map either file to a catalog product. Do not restore obsolete `hero-sd-gl052.png`.
- Existing CSS hides the Hero visual container when the image remains `hidden`, and expands the copy to one column. Verify this on the actual Preview after Actions finishes.
- Next: inspect latest Actions for source tests and Preview deployment on the new HEAD; confirm the image and empty visual frame are both absent in Light and Dark at mobile and desktop, no broken layout/blank reserved box, and no unrelated regression. If tests fail, fix tests/code on this branch only. Do not begin other UI work until owner decides the Hero should be resumed; when resumed, inspect the supplied source/reference carefully and then restore image loading only through an explicit implementation change.
- PR #108 remains OPEN/unmerged. Preview only. No Production, `main`, Admin, backend/API/auth/catalog/SKU/product data, D1/R2, bindings/secrets/DNS/Access, or official logo changes. This temporary removal is NOT an owner PASS; Hero remains paused and unaccepted.

---

# LATEST OVERRIDE — HERO PADDING FIX / LIVE VISUAL GATE STILL OPEN (2026-10-23)

This block supersedes older SHA, asset-processing, and preview-status claims below where they conflict. Preserve the historical evidence; do not delete it.

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`. PR #108 remains OPEN and unmerged. Do not merge.
- Current branch HEAD at this update: `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`. This SHA includes a capture-workflow reliability adjustment; Hero app code is from the immediately preceding tested/deployed changes. Source validation and full automated tests PASS at `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`: run https://github.com/chichute5500/Sindarealest-admin/actions/runs/39838207248 (check final status before relying on it).
- Preview deployment PASS at exact SHA `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`: run https://github.com/chichute5500/Sindarealest-admin/actions/runs/39838207235; unique URL https://b6c153d5.sindarealest2.pages.dev/; stable alias https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/. Preview only. Production and `main` remain out of scope.
- Owner-provided source remains `public/images/hero-upload/tb_image_share_1792519964514 (1).png`; it is a standalone Hero presentation asset, not a catalog product/SKU/image relationship. Never overwrite it or restore `public/images/hero-sd-gl052.png`.
- Root cause fixed in `scripts/process-hero-edge.py`: prior code padded alpha, blurred it, then cropped back to original dimensions, recreating a hard straight edge where the platform touched the source canvas. New derivative retains the full transparent padding: source 1200×1600, output 1488×1888, 144 px padding, `output_keeps_transparent_padding: true`. Last processor report SHA-256: source `dab6493ecb782ffeef6c1ade0224390ffe1ba1bdd7d4a95ad6a2889e49f99f83`; derivative `6a260e31c0ce5bbc450c1cd1f953e0b2f01a4f8744ab6b3e60347daceb0461a7`; RGB unchanged. Cache key is `20261023-4`. CSS scales the padded derivative to preserve shoe size (desktop 124%; mobile 130%, max-height 330px) and does not brighten/recolor the shoe.
- The latest visual capture workflow run is https://github.com/chichute5500/Sindarealest-admin/actions/runs/39838207215 (SHA `3c6a6c30864e76c8e2d3afb8c2cac36e282dcce8`). It was still capturing/probing the live Preview at the last checkpoint; check its final status and artifact list. A previous capture job stalled at Chromium installation, so the workflow was adjusted to use `npx playwright install chromium` with a 6-minute step timeout and a SHA-scoped push concurrency group. Do not confuse a local fixture screenshot with a real Preview screenshot.
- **Visual acceptance remains OPEN / NOT PASS until the new live Light and Dark Hero screenshots are opened and checked.** Required checks: no straight right/bottom canvas edge, no horizontal seam, no halo/glow pretending to be edge feather, crisp shoes, appropriate large scale, natural blend on both themes. Automated tests and deploy success are not visual acceptance. The owner has not approved PASS.
- Next: poll run #39838207215, download its artifacts, inspect `section-hero-mobile-light-390x844.png`, `section-hero-mobile-dark-390x844.png`, and desktop Hero screenshots against the reference PNGs in `docs/static-web-reference/`. If the right/bottom cut or seam remains, keep working only on Hero and repeat test → Preview deploy → exact-SHA verification → actual screenshot review. Do not ask the owner to reselect the image.
- After owner explicitly says PASS, mark `OWNER-APPROVED — LOCKED` and never modify the Hero again without explicit authorization. Until then, do not work on unrelated UI.
- Hard boundaries: no production deploy, no `main`, no merge, no Admin branch, no backend/API/auth/product data/SKU mappings, no D1/R2/bindings/secrets/DNS/Access, and no official-logo edits.

---

# NEWEST HANDOFF — HERO EDGE STILL FAILS VISUAL REVIEW (2026-10-23)

Continue existing work; do not ask the owner to repeat context. First read `docs/handoff/CURRENT-STATE.md`, then refresh live branch HEAD, PR #108 and workflow/artifact status.

## Verified starting point
- Repo `chichute5500/Sindarealest-admin`; branch `fix/liquid-glass-audit-2026-10-19`; PR #108 OPEN / DO NOT MERGE.
- Branch HEAD: `e6f49f7b65297be68a0f9472b613a1acd06c866f`.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Exact-SHA Preview deployment ID `53dc3bb4-b6ea-4329-a477-ad2cfb7a2e9c`, concrete URL https://53dc3bb4.sindarealest2.pages.dev/.
- Tests PASS [#39829962279](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962279); Preview deploy PASS [#39829962530](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962530); live visual capture workflow SUCCESS [#39829962409](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962409), artifact [#12449195919](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962409/artifacts/12449195919), `sindarealest-liquid-glass-preview-945`.
- Screenshots already opened: `liquid-glass-preview/live-preview/section-hero-mobile-light-390x844.png` and `section-hero-mobile-dark-390x844.png`. The platform's hard right/lower edges remain visible. Owner rejected the result. **Hero is NOT PASS and NOT OWNER-APPROVED.**
- Source asset: `public/images/hero-upload/tb_image_share_1792519964514 (1).png`; separate processed derivative: `public/images/hero-upload/tb_image_share_1792519964514-blended.png`. It is a standalone Hero presentation image, not product/SKU/catalog data. Do not restore old `hero-sd-gl052.png`.

## Immediate task — do only this
1. Inspect the owner-provided source image, the two original reference PNGs (`docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` and `file_00000000fcb48207a23aeda23caa5eeb.png`) and the exact live artifact before editing.
2. Correct the platform-edge blend based on the actual image silhouette, not guessed polygon coordinates. Existing `PLATFORM` polygon in `scripts/process-hero-edge.py` produced visibly hard/cut edges; do not repeat the same method by arbitrarily increasing its radius. Goal: shoes enlarged and crisp; black crocodile platform fades softly into the page; do not brighten the image, recolor/retouch shoe pixels, or blur the shoes.
3. Keep the original upload unchanged; create/update only a separate derivative if needed. Do not introduce the Hero into catalog/product/SKU data.
4. Run relevant tests, deploy only Preview, verify exact deployed SHA, download/open the fresh live screenshots in Light and Dark, and report the exact evidence. Automated green status is not visual PASS.
5. Give the owner the Preview link and wait for their explicit PASS before doing anything else. Once they say PASS, lock Hero and do not touch it again without explicit authorization.

## Hard boundaries
PR #108 stays OPEN/unmerged. No Production, `main`, Admin, backend/API/auth/business logic, catalog data/mappings, D1/R2, bindings, secrets, DNS, Access, or official-logo changes. Do not start any non-Hero audit work. Keep going after status updates; don't stop at reporting unless genuine permission/trusted-data/user decision is required.

Read the rest of this file for history, but this top block and CURRENT-STATE are authoritative when older notes conflict.

---

# LATEST HANDOFF UPDATE — HERO ASSET REPLACEMENT / RESUME FROM LIVE STATE
**Updated:** 2026-10-22 16:10 UTC  
**This update is newer than all older status notes below. Keep it when editing this file.**

## Current source and verified GitHub state
- Repository: `chichute5500/Sindarealest-admin`
- Work branch: `fix/liquid-glass-audit-2026-10-19`
- Storefront implementation commit before this handoff-doc refresh: `03d05fe78adaab9661ea0960560ea22600d98cae`. Five handoff documents were then updated in docs-only commits; therefore the branch HEAD is newer and MUST be re-read from GitHub before further work.
- PR #108: OPEN, not merged. Keep it open. Do not merge.
- User-supplied standalone Hero image is now referenced as `/images/hero-upload/tb_image_share_1792519964514%20(1).png?v=20261022-4`.
- Previous `public/images/hero-sd-gl052.png` was deleted. The replacement image is a standalone presentation/Hero asset, NOT a catalog image, NOT tied to SKU `SD-GL052`, and must never be sourced/gated by product payload or SKU availability.
- Relevant code/test/doc changes in latest commits include `public/index.html`, `scripts/capture-liquid-glass-preview.mjs`, `scripts/capture-cloudflare-preview.mjs`, `tests/hero-product-sku.test.mjs`, `tests/storefront-reference-parity.test.mjs`, `tests/storefront-html-safety.test.mjs`, and `public/images/hero-upload/README.md`. Re-check actual branch diff before further edits rather than assuming this is the complete changed-file list.

## Latest workflow state (implementation SHA and follow-up handoff-doc commits)
- Source validation / full automated tests: **PASS** for implementation SHA `03d05fe78adaab9661ea0960560ea22600d98cae` — run [39809611368](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39809611368). After the five documentation updates, newer validation runs were in progress at last check: [39810170516](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39810170516) on the latest observed docs commit `ab93da4ce164b7f3a74381d9bf1e9718bb664736`; re-check status before proceeding.
- Cloudflare Pages Preview deploy: **PASS** — run [39809611147](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39809611147). This is a Preview deployment only, not Production.
- Visual preview workflow on implementation SHA: **IN PROGRESS at last check** — run [39809611151](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39809611151). It had passed project tests and migration checks and was installing isolated Chromium; no completed live screenshot artifact or actual visual review was confirmed. Poll it; if it does not cover the latest docs-only HEAD, trigger/rely on a suitable fresh run only after checking workflow conditions.
- Admin Preview Playwright run [39809611190](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39809611190) was pending at last check; do not work on Admin or treat this as a storefront requirement.
- Preview alias to verify: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Do not claim exact deployed runtime SHA, image HTTP success, screenshot coverage, visual parity, or Hero PASS solely from source tests/deploy workflow. Verify deployment metadata and fetch/inspect actual screenshots/artifacts once the visual workflow finishes.

## Mandatory next actions — continue, do not restart
1. Read this latest block and inspect live GitHub HEAD, PR #108, and workflows before changing anything. Handoff-doc commits advanced branch HEAD after implementation SHA `03d05fe78adaab9661ea0960560ea22600d98cae`; never assume the implementation SHA is current HEAD.
2. Poll run 39809611151 until terminal. If it fails, inspect failed step logs, fix only the blocker relevant to Hero capture/verification, commit to the same branch, and rerun required checks. Also check validation run 39810170516 for the latest docs-only HEAD. Do not stop after reporting progress.
3. Verify the Preview deployment metadata and exact runtime SHA. The successful deploy workflow was for implementation SHA `03d05fe78adaab9661ea0960560ea22600d98cae`; docs-only handoff commits followed it. Do not assume those docs commits require a new deployment, but confirm which SHA is actually deployed. Probe the supplied Hero URL and capture real Preview screenshots at required viewports 360×800, 390×844, 768×1024, and 1440×900 in Light and Dark. Distinguish real deployed captures from local fixture captures.
4. Inspect screenshot evidence and compare Hero against original reference PNGs: Light `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`; Dark `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`. Check asset loads, crop/fit, alignment, responsiveness, borders/background, and no blank/old-image state. Do not claim visual PASS until supported by live evidence.
5. Give owner the Preview URL and concise evidence so they can inspect. **Only the owner can approve Hero PASS.** Until explicit owner PASS, work ONLY on Hero and verification; do not start unrelated UI, icons, checkout, catalog, or other audit items.
6. Once owner explicitly says PASS, mark Hero `OWNER-APPROVED — LOCKED` in all handoff files and do not touch it again without explicit authorization.
7. Keep PR #108 open/unmerged. Never touch `main`, Production, DNS, D1/R2, secrets, bindings, Access, Admin branch, backend/API/auth, product data/mappings, or the official logo. No production deployment.

## Owner intent / correction
The owner uploaded this Hero image intentionally and explicitly instructed it to replace the old Hero asset without further debate or image-selection review. Do not ask the owner to reselect or re-approve the asset choice. The only remaining gate is to verify the actual deployed rendering and let the owner judge the visual result.
---
# AUTHORITATIVE HANDOFF OVERRIDE — HERO FIRST / OWNER PASS GATE
**Updated:** 2026-10-22  
**Priority:** This section overrides conflicting older instructions or stale assumptions elsewhere in this document. Do not remove it during future handoffs.

## Non-negotiable workflow
1. Work ONLY on the storefront Hero until the owner explicitly confirms **PASS**. Do not start unrelated visual polish, icon work, checkout/payment, catalog, or other tasks while Hero is awaiting owner approval.
2. Fix the Hero, publish an allowed Preview deployment, verify the exact deployed source SHA, inspect the actual screenshots, then give the owner the Preview URL and evidence. Stop and wait for the owner's explicit PASS. Workflow green, HTTP 200, image load, and no overflow are not equivalent to visual PASS.
3. After owner PASS, mark Hero **OWNER-APPROVED — LOCKED**, record the approved source SHA, deployment, and evidence in handoff docs, and do not modify Hero (asset, DOM, CSS, layout, background blending, image loading behavior, or related tests) without the owner's explicit permission.
4. Before any work, re-check branch HEAD, PR #108 status, latest workflow runs, deployment SHA and artifacts. Historical SHAs below are clues only, never assumed current.
5. Keep PR #108 OPEN. Never merge. Do not deploy Production or change main, DNS, D1/R2 data/config, bindings, secrets, Access, backend/API/auth, Admin, or product identity/data relationships.
6. Do not report files as updated, code as deployed, tests as passed, or the Hero as complete without checking the actual GitHub/Preview evidence. Do not say “100%” while any gate remains open.

## Hero asset — owner-authoritative definition
- Asset: `public/images/hero-sd-gl052.png`
- Canonical image blob SHA previously recorded: `24038214abefdac9ff2451def39f3e5bd9255462`. Re-verify before editing.
- This is a standalone presentation image supplied by the owner. It is NOT a catalog product image, has NO SKU, is NOT tied to catalog records, and must not be treated as product data. It sits alongside presentation/icons, outside the product catalog.
- Preserve its original bytes and pixels exactly. Never delete, hide, replace, redraw, crop, recolor, retouch, mask, filter, or otherwise alter the image itself. Never hide it to evade a visual issue.
- The image must visually blend into the surrounding page background like the supplied reference in both Light and Dark themes. Keeping the original image does NOT mean accepting a bright rectangle/frame that visibly clashes with the page. Inspect the asset's alpha/background and use appropriate surrounding layout/CSS only. Do not ask the owner to make a new transparent image.
- Any old note that says blending is prohibited, that a visible frame is acceptable, or that this presentation image must have a product SKU is superseded and must not be repeated.

## Required source and visual audit
- Light reference: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`
- Dark reference: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`
- Required 8 combinations: 360×800 Light/Dark; 390×844 Light/Dark; 768×1024 Light/Dark; 1440×900 Light/Dark.
- Inspect the effective cascade, not just the first CSS declaration. Audit the Hero DOM, every later CSS override/media query, `.hero`, `.hero-visual`, `#home .hero-visual`, image/caption rules, Light/Dark backgrounds, and `syncHeroProductImage()` including `hidden`, `src`, `onerror`, and any SKU-dependent behavior. Remove the root cause rather than stacking blind overrides.
- Inspect actual captured screenshots against the supplied references. Confirm image visibility and background integration, content/layout, responsive behavior, Light/Dark behavior, console/runtime errors where available, and horizontal overflow. Asset load success alone is not visual parity.
- Make only Hero-scoped changes and the minimum relevant tests/docs needed. Do not disturb the original image asset.

## Handoff sequence and stop condition
- Verify the live branch HEAD and open PR before editing. Use the existing branch `fix/liquid-glass-audit-2026-10-19`; PR: https://github.com/chichute5500/Sindarealest-admin/pull/108
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Deploy only through the permitted Preview workflow; verify exact source SHA and inspect resulting screenshots/artifacts.
- Report commit SHA, exact deployment SHA/URL, screenshot/artifact links, tests run, and remaining differences honestly.
- When Preview is ready, ask the owner to inspect and explicitly say PASS. Then STOP. No unrelated work until that PASS.
- After PASS only, write `OWNER-APPROVED — LOCKED` into all handoff records and preserve the approval SHA/evidence. Any subsequent Hero modification requires explicit owner authorization.

## Five-file synchronization rule
At the end of a meaningful handoff, synchronize all of these files without erasing prior valid history:
- `docs/handoff/CURRENT-STATE.md`
- `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md`
- `docs/handoff/HANDOFF.md`
- `docs/handoff/TEST-RESULTS.md`
- `docs/visual-audit-progress-2026-10-19.md`

When updating these documents, preserve existing evidence/history and append a dated state entry rather than replacing older records wholesale. Make the Hero-first gate and the owner-controlled lock explicit in the next-chat prompt. Verify all five files on GitHub after committing; do not claim synchronization until verified.

---

# PROMPT FOR THE NEXT CHAT — EXECUTE, DO NOT RESET
You are continuing existing SinDarealest2 work. First read this document and all four other handoff/audit files. Verify current GitHub HEAD, PR #108, latest workflows, Preview deployment and artifacts. Do not ask the owner to repeat context. Follow the AUTHORITATIVE HANDOFF OVERRIDE above exactly.

**Immediate task: Hero only.** Inspect `public/images/hero-sd-gl052.png` as an owner-supplied standalone presentation asset, not catalog data and not a SKU-bound product image. Preserve image bytes/pixels. Make it blend naturally into the page background in Light and Dark using only surrounding layout/CSS. Audit all effective CSS overrides and `syncHeroProductImage()`; do not hide the image, swap it, edit its pixels, or stack unverified CSS overrides.

Compare the actual Preview to:
- Light reference: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`
- Dark reference: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`

Capture/inspect 360×800, 390×844, 768×1024, and 1440×900 in both themes. Verify exact source SHA on the Preview deployment. Continue fixing only Hero until evidence is ready. Then provide the Preview URL, source/deployment SHA, screenshots/artifacts, tests, and any remaining differences; ask the owner to check and STOP. **Do not work on any other task until the owner explicitly says PASS.** After PASS, document `OWNER-APPROVED — LOCKED` in all five handoff files. Never touch Hero again without explicit owner authorization. PR #108 stays open; no merge or Production deploy.
---

## Verified mobile hero follow-up — 2026-10-22 (exact-SHA audit)

- Latest verified source/deployment SHA: `ca233f279169aef33b7f5a0cb712816738f98ed7`.
- Follow-up docs-only commit (previously reported): `b7e5b12b10d3c3b0c1af8e04fde2d44669b8f739`. Re-check branch HEAD before continuing; this commit is not the deployed source SHA.
- CI/full validation PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189790
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189767
- Guarded live Preview audit PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189878
- Artifact #12429813463: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189878/artifacts/12429813463; name `sindarealest-liquid-glass-preview-883`; SHA-256 `84c67928a338f16b0b287a7515f2f5ed956684d0db16c43d54b9a83372cfbb49`.
- Deployment ID `0514a4f0-0be4-4769-a31a-39c2315ba081`; Cloudflare metadata `commitHash` and `expectedCommitSha` both equal `ca233f279169aef33b7f5a0cb712816738f98ed7`; alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Live audit: `passed=true`, `captureCompleted=true`; 128 Preview screenshots, 8 viewport/theme audits, 13 route checks, 69 section checks; hero image checks 8/8 PASS; no horizontal overflow, console/page/HTTP errors, failed requests, broken images, read-only violations or hard failures.
- Real artifact screenshots opened: `home-mobile-light-390x844-viewport.png` and `home-mobile-dark-390x844-viewport.png`. Mobile hero copy and image now sit side by side; CSS retains `object-fit:contain` and does not apply image processing. Screenshot spot-check does not prove full-site visual parity.
- Hero image must remain the owner-provided standalone presentation asset, not a catalog item. PNG unchanged, blob SHA `24038214abefdac9ff2451def39f3e5bd9255462`. Never replace, retouch, crop/recompose, recolor, mask, blend, filter or recreate it. Official logo remains protected.
- Changed on audited source: `public/index.html` mobile hero CSS; `tests/storefront-reference-parity.test.mjs`, `tests/product-card-liquid-glass.test.mjs`, `tests/hero-product-sku.test.mjs` assertions updated for side-by-side layout while preserving image integrity guards. Do not loosen exact-SHA audit.
- Pixel-diff/archive flow was skipped by the current workflow push path. Do not claim a new archived pixel-diff comparison.
- Still OPEN: complete visual parity and icon parity; catalog mapping discrepancy in “Tuyển chọn 25” (image 01/19 black high-top boots vs 02/19 different green/white sneaker) must go to authorized data owner; QR checkout remains fail-closed until trusted backend confirmation. No real checkout/payment submitted.
- Guardrails: PR #108 remains OPEN and unmerged. No Production/main/Admin/backend/API/auth/catalog mapping/D1/R2/bindings/secrets/DNS/Access changes.

---

# NEXT CHAT — VERIFIED MOBILE HERO FOLLOW-UP

Continue existing work. Read CURRENT-STATE first. Do not restart, merge PR #108, or repeat unaffected PASS tests.

# VERIFIED MOBILE HERO FOLLOW-UP — 2026-10-22

- Current storefront source/deployment SHA: `ca233f279169aef33b7f5a0cb712816738f98ed7`.
- CI/full project validation PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189790
- Cloudflare Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189767
- Guarded live Preview audit PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189878
- Artifact #12429813463: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39789189878/artifacts/12429813463 ; name `sindarealest-liquid-glass-preview-883`; SHA-256 `84c67928a338f16b0b287a7515f2f5ed956684d0db16c43d54b9a83372cfbb49`.
- Deployment metadata is exact: Preview deployment `0514a4f0-0be4-4769-a31a-39c2315ba081`, commitHash and expectedCommitSha both `ca233f279169aef33b7f5a0cb712816738f98ed7`, alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`.
- Live audit JSON: `passed=true`, `captureCompleted=true`, sourceCommit matches exact SHA; 128 live Preview screenshots; 8 viewport/theme audits; 13 route checks; 69 section checks; 8/8 hero image checks PASS; zero overflow, console/page/HTTP errors, failed requests, broken images, read-only violations, or hard failures.
- Opened real screenshots `home-mobile-light-390x844-viewport.png` and `home-mobile-dark-390x844-viewport.png` from the downloaded artifact. At 390×844 the hero now places copy on the left and the untouched owner-supplied shoe image on the right; the image is visible in its full rectangular frame without CSS crop/filter/mask. Desktop/tablet/mobile captures exist in the artifact; visual spot checks are not a declaration of full-site parity.
- Source changes on this SHA: mobile hero CSS uses two columns; two legacy regression tests were updated to assert the new layout while retaining image integrity/no-filter/no-overlay checks. The hero PNG was not changed; required blob remains `24038214abefdac9ff2451def39f3e5bd9255462`. Official logo remains unchanged.
- Important distinction: local fixture audit is separate from live Preview proof. Steps 17–21 (archive/pixel-diff flow) were skipped by the workflow's current push path; live capture and upload completed successfully, so do not claim a new archived pixel-diff comparison.
- Confirmed unresolved catalog-data mismatch: “Tuyển chọn 25” gallery image 01/19 is black high-top boots while 02/19 is a different green/white sneaker. Do not alter catalog mapping in this UI branch; escalate to trusted mapping owner.
- QR checkout remains fail-closed; no real order/payment was submitted. Full visual parity and icon parity remain OPEN. PR #108 must remain OPEN and unmerged; no Production/main/Admin/backend/API/auth/catalog/D1/R2/bindings/secrets/DNS/Access changes.


---

# NEXT CHAT OVERRIDE — EXACT-SHA LIVE AUDIT COMPLETED (2026-10-22)

# VERIFIED LIVE PREVIEW AUDIT — 2026-10-22 13:24:55 UTC

**This evidence supersedes earlier notes that run #39780674947 lacked exact-SHA certification.** Keep PR #108 OPEN and unmerged.

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`; PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, merged=false at verification.
- Audited/deployed source SHA: `38cdde70ae2edf69295232688928bbb9e68f3b3f`. This source commit adds only a regression test to `tests/storefront-reference-parity.test.mjs`; `public/index.html` and `public/images/hero-sd-gl052.png` were not changed in this commit.
- Validation/full tests: PASS — [run #39786010003](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786010003).
- Cloudflare Preview deployment: PASS — [run #39786010114](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786010114); concrete URL https://b64b8055.sindarealest2.pages.dev/; stable alias https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Guarded live visual audit: SUCCESS — [run #39786009865](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786009865); artifact [#12428643812 — sindarealest-liquid-glass-preview-880](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39786009865/artifacts/12428643812), 58,476,756 bytes, SHA-256 `9e62038c9ccb8851ec4ac0abee336512fe9cc38dfd739fc8076c5ab932ab5725`.
- Formal deployment verification: `passed=true`, `status=VERIFIED_PREVIEW_DEPLOYMENT`. Cloudflare deployment ID `b64b8055-c77e-420f-8d45-0e3b86cc17cd`, environment `preview`, branch matches expected, full `commitHash=38cdde70ae2edf69295232688928bbb9e68f3b3f` equals full `expectedCommitSha`. Verification time: `2026-10-22T13:22:44.842Z`.
- Live audit JSON: `sourceKind=cloudflare-pages-preview-live-read-only`, `sourceCommit=38cdde70ae2edf69295232688928bbb9e68f3b3f`, `captureCompleted=true`, `passed=true`. It records 128 genuine live Preview screenshots; 8/8 viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900 in Light/Dark); 13 route checks; 69 section target checks; 8/8 hero image checks PASS; 0 horizontal overflow, console errors, page errors, HTTP errors, failed requests, broken images, hard failures or read-only violations. Startup coverage: 20 frames, 4 videos, 0 violations. The separate local fixture audit contains 58 screenshots and is not live proof.
- Actual artifact ZIP was downloaded, SHA-256 recomputed locally and matched GitHub's artifact digest. Manually opened hero section mobile Light/Dark 390×844, desktop Light/Dark 1440×900 and full viewport captures mobile 360×800 and 390×844, tablet 768×1024, desktop 1440×900 in both themes. Also opened benefits/order, account drawer, cart-with-item, checkout form, Dark 404, official icon reference boards `Icon.png` and `Chitiet.png`, and the “Tuyển chọn 25” image 01/19 vs 02/19 captures.
- Hero viewport-fit observation: PASS in all 8 viewport/theme checks. The dedicated owner-provided PNG `public/images/hero-sd-gl052.png` remains standalone presentation media, not catalog/SKU/product API content. Git blob SHA remains `24038214abefdac9ff2451def39f3e5bd9255462`; a regression test now locks this exact Git blob SHA. The PNG pixels/file were not changed. In Dark mode its original bright gray/white field remains visible by design; do not “fix” it with filters/masks/blending.
- Remaining findings: full visual parity and full icon parity remain OPEN. Confirmed catalog/data blocker: “Tuyển chọn 25” image 01/19 shows black high-top boots while image 02/19 shows a different green/white sneaker at route `/sanpham/sneaker/sneakers-33-48`. Do not change or hide the catalog image mapping in the UI branch; escalate to the trusted mapping owner.
- QR/order payment remains fail-closed pending trusted backend confirmation/configuration. The checkout form was captured with `submitted=false`; no real order or payment was submitted.
- The next documentation-only commit may advance branch HEAD beyond audited source SHA. Since the changed paths are only `docs/**`, do not treat the newer docs HEAD as a new storefront source/deployment; keep the deployed/audited source SHA above explicitly recorded. PR #108 MUST remain OPEN. Do not touch Production/main/Admin/backend/API/auth/catalog mapping/D1/R2/bindings/secrets/DNS/Access or alter the strict exact-SHA guard.

Continue existing work from the current-state and latest verified GitHub data above; do not restart, ask for a recap, or repeat unaffected PASS tests. The next useful task is systematic remaining visual/icon parity review, only evidence-backed static UI fixes, and documenting external blockers without changing protected data/assets.

---

# NEXT-CHAT OVERRIDE — USE POST-AUDIT EVIDENCE (2026-10-22)

Continue the existing work; do not restart. Read `docs/handoff/CURRENT-STATE.md` first, then refresh live branch HEAD, PR #108, validation/deploy/visual workflow results and current Cloudflare Preview metadata before making any new code change.

# VERIFIED AUDIT OVERRIDE — 2026-10-22, after run #39780674947

**This is newer than the 12:46 UTC checkpoint below. Refresh the branch tip after this docs-only commit. PR #108 stays OPEN and MUST NOT MERGE.**

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`; PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 (fetched state: open, merged=false).
- **Storefront source under audit:** `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`. UI/layout commit: `d28c663f39b22fa4fa29dafa509ec30234722d73`. Branch tip before this documentation sync: `ebdd5e657c317490ce7747056ffa37be8c65ab0c` (docs-only).
- **Validate/full npm test:** PASS for source SHA `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`, run [#39780674913](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913).
- **Preview deploy job:** PASS, run [#39780674951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951). Stable Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- **Visual run:** [#39780674947](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947), completed `success`; artifact [#12426937018 — sindarealest-liquid-glass-preview-878](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947/artifacts/12426937018), 58,399,888 bytes; SHA-256 `3614fae8cb3d56d6da0a91414bc31d31e7d855f5cbeb7bef8fae9355301bb937`. The artifact was downloaded and unpacked locally.
- Live audit JSON `live-preview/visual-audit.json`: `sourceKind=cloudflare-pages-preview-live-read-only`, `sourceCommit=96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`, 128 real Preview screenshots, 8/8 required viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900; Light/Dark), 13 route checks, 69 section target checks, 8/8 hero image checks PASS, horizontal overflow=0, console/page/HTTP errors=0, failed requests=0, broken images=0, hard failures=0, read-only violations=0. Startup evidence: 20 frames, 4 videos, 0 violations. Local fixture audit is reported separately and is not live proof.
- **Important strict-gate result: NOT VERIFIED.** `deployment-verification.json` is `passed=false`, `status=DEPLOYMENT_METADATA_UNVERIFIED`: expected deployed SHA `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`; Cloudflare's live Preview alias metadata returned deployment `4d253553-c5b3-481c-989c-316657276ec5`, URL `https://4d253553.sindarealest2.pages.dev`, branch `fix/liquid-glass-audit-2026-10-19`, successful Preview stage, but commit `ebdd5e657c317490ce7747056ffa37be8c65ab0c` (docs commit “docs(handoff): record hero viewport fix and pending visual audit”). Thus the dedicated gated steps “Verify actual Cloudflare Pages deployment before manual capture/archive”, “Capture live Cloudflare Pages Preview (read-only)” and related archive steps were SKIPPED. The 128 screenshots came from the separate read-only live Preview probe and are genuine live captures, but this run is **not an exact-SHA-certified audit**.
- The commit comparison `96bb6eb...` → `ebdd5e657c317490ce7747056ffa37be8c65ab0c` returned exactly four changed paths, all handoff/evidence docs; no storefront source. The `public/index.html` blob SHA is identical at both commits: `51c9c8487bc9b628bb6c4a41420fbec1ec7e17e1`. The protected hero asset blob SHA is identical at `39652e9...`, `d28c663...`, `96bb6...` and `ebdd5e657c317490ce7747056ffa37be8c65ab0c`: `24038214abefdac9ff2451def39f3e5bd9255462`. This supports visual observation of the same storefront source, **but does not override the strict metadata gate**.
- **Manual screenshots actually opened** from `liquid-glass-preview/live-preview/`: `section-hero-mobile-light-390x844.png`, `section-hero-mobile-dark-390x844.png`, `section-hero-desktop-light-1440x900.png`, `section-hero-desktop-dark-1440x900.png`; full viewport captures `home-mobile-light-360x800-viewport.png`, `home-mobile-dark-360x800-viewport.png`, `home-mobile-light-390x844-viewport.png`, `home-mobile-dark-390x844-viewport.png`, `home-tablet-light-768x1024-viewport.png`, `home-tablet-dark-768x1024-viewport.png`, `home-desktop-light-1440x900-viewport.png`, `home-desktop-dark-1440x900-viewport.png`. Also opened representative benefits/order/catalog, account drawer, cart-with-item, checkout form and Dark 404 captures.
- **Hero result:** observational visual review PASS for viewport fit: image loads visibly and remains inside the viewport at 360/390 mobile, 768 tablet and 1440 desktop, Light/Dark; no right-edge clipping was seen and live audit reports zero horizontal overflow. The entire supplied image/backdrop remains visible. This is not yet the formal exact-SHA PASS because of the metadata mismatch. Current final hero CSS at `public/index.html` uses `object-fit:contain`, full centering, no padding and explicit `filter:none`, mask/clip-path none, `mix-blend-mode:normal`, `opacity:1`, `transform:none`; `tests/storefront-reference-parity.test.mjs` has regression assertions for the asset lock. Do not add an image effect or alter the PNG.
- **No storefront source changes were necessary in this review.** Do not change `public/index.html` merely to chase metadata. Next useful acceptance task is to arrange a new guarded audit run where the Cloudflare Preview metadata SHA equals the audited HEAD for the entire capture window; the available GitHub connector does not expose workflow_dispatch, so do not claim that gate passed if it cannot be triggered. Keep the mismatch explicitly visible.
- Other outstanding scope blockers: the recorded “Tuyển chọn 25” gallery has inconsistent shoe designs across images 01/19 and 02/19; product/catalog image mapping is out of scope and must remain unchanged. Full ICON-PARITY is not yet accepted. QR/payment remains fail-closed pending trusted backend confirmation/configuration; never submit checkout or send money.
- Completion: hero viewport-fit evidence gates **7/8 satisfied (~88%)**; the remaining gate is exact deployed/audited SHA metadata. This is a narrowly defined hero-checkpoint percentage, **not a declaration of full-site completion**. Overall visual/icon parity and trusted catalog/payment dependencies remain OPEN; do not claim 100%.

---

## Required next action

The screenshots provide visual-observation PASS for the hero fix, but strict deployment metadata verification failed because the audit's expected SHA was `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50` and the alias returned docs-only SHA `ebdd5e657c317490ce7747056ffa37be8c65ab0c`. Compare full hashes, not only short prefixes. If workflow_dispatch is available through an authorized path, run a guarded read-only audit after a completed deployment of the exact selected branch HEAD and check its resulting artifact; available GitHub connector tools may not expose dispatch. Never weaken/remove the exact-SHA guard just to green the workflow.

## Absolute hero asset lock

`public/images/hero-sd-gl052.png` is the owner's standalone presentation asset, unrelated to catalog/SKU/product/API data. Its Git blob hash was unchanged in the reviewed commits: `24038214abefdac9ff2451def39f3e5bd9255462`. Never replace, regenerate, retouch, recolour, crop/recompose, remove background, filter, mask, blend or alter pixels. Only fix layout/loading/visibility plumbing around it. Do not search the catalog for SD-GL052. Preserve the official logo exactly.

## Scope and continuing work

Keep PR #108 OPEN and unmerged. Preview/static storefront only. Do not touch Production/main, Admin source, backend/API/auth, product records/mappings, D1/R2, bindings/secrets, DNS or Access policy. No real checkout/payment. QR/payment stays fail-closed. Do not repeat unaffected PASS suites.

Remaining documented items: exact-SHA live audit gate; complete visual/icon parity; catalog mapping inconsistency for “Tuyển chọn 25” (do not edit mapping); trusted backend confirmation/configuration required for QR. Update the current-state/test/evidence docs after new proof.# IMMEDIATE OVERRIDE — 2026-10-22 12:46 UTC

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
