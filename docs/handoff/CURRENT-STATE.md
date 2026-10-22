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

## LATEST OVERRIDE — HERO EDGE REVIEW / OWNER REJECTED VISUAL RESULT (2026-10-23)

**This is the newest checkpoint. It overrides older asset names, SHAs, and claims of visual progress below wherever they conflict. Do not erase prior evidence/history.**

- Repo: `chichute5500/Sindarealest-admin`; branch: `fix/liquid-glass-audit-2026-10-19`; PR #108 remains OPEN and unmerged: https://github.com/chichute5500/Sindarealest-admin/pull/108.
- Live branch HEAD verified from GitHub commits endpoint: `e6f49f7b65297be68a0f9472b613a1acd06c866f`, message `[capture-review] Verify feathered Hero edge on Preview`.
- Current user-provided standalone Hero source: `public/images/hero-upload/tb_image_share_1792519964514 (1).png`. It is presentation-only, NOT a product, SKU, catalog image, or product-data dependency. A separate generated derivative is `public/images/hero-upload/tb_image_share_1792519964514-blended.png`; the source file remains present and unchanged by the processing script. Do not restore the obsolete `public/images/hero-sd-gl052.png`.
- Current Preview deployment is exact-SHA verified: deployment ID `53dc3bb4-b6ea-4329-a477-ad2cfb7a2e9c`, URL https://53dc3bb4.sindarealest2.pages.dev/, stable alias https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/. Cloudflare metadata `commitHash` and `expectedCommitSha` both equal `e6f49f7b65297be68a0f9472b613a1acd06c866f`.
- Validation + automated tests PASS for this SHA: [run #39829962279](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962279). Preview deployment PASS: [run #39829962530](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962530). Visual capture/audit workflow SUCCESS: [run #39829962409](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962409), artifact [#12449195919 — sindarealest-liquid-glass-preview-945](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39829962409/artifacts/12449195919). Artifact includes actual live Preview screenshots and deployment-verification.json; deployment check says `VERIFIED_PREVIEW_DEPLOYMENT`.
- Actual live screenshots were downloaded and opened: `section-hero-mobile-light-390x844.png` and `section-hero-mobile-dark-390x844.png`. **Visual result is NOT PASS.** The crocodile platform still has conspicuous hard straight/cut edges on the right and lower sides; the current polygon-based platform-alpha mask has not achieved the supplied sample's soft blend. The user reacted negatively (“Như cứt”), so do not present this version as finished or ask the user to approve it.
- Honest distinction: automated source/tests, deploy, and screenshot capture all PASS; the design/visual acceptance gate FAILS / remains OPEN. User has NOT said Hero PASS. Do not mark it locked.
- Immediate next task for the new chat: stay Hero-only. Re-open the owner-provided source image, latest artifact screenshots and original reference PNGs; inspect the actual platform silhouette before changing anything. The current hand-authored `PLATFORM` polygon in `scripts/process-hero-edge.py` is not accurate enough and must not be blindly widened/adjusted again. Determine a pixel-grounded edge treatment that fades the black crocodile platform into the page while preserving shoe sharpness and not brightening/recoloring the image. Verify on real Preview screenshots in Light and Dark before reporting. Keep the original uploaded source bytes intact; any derivative must be separate and must never enter product/catalog data.
- Preview only. Do not merge PR #108; do not touch Production, `main`, Admin, backend/API/auth, product data/SKU/image mappings, D1/R2, bindings, secrets, DNS, Access, or the official logo. Do not start other visual tasks before the owner explicitly approves Hero.
- After the next meaningful change, run affected tests, deploy Preview, verify exact SHA, inspect artifact screenshots, and update all five handoff documents. Keep the owner in control of PASS; after explicit owner PASS, mark `OWNER-APPROVED — LOCKED` and never change Hero without explicit authorization.

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

## State update — 2026-10-22
The owner has explicitly directed that Hero be completed first, presented for visual verification, and left untouched after owner PASS. At this point, do not infer Hero is fixed or approved: inspect current source and fresh Preview evidence. The hero-first owner-PASS gate remains open until the owner says PASS. This documentation update itself does not alter storefront code or deploy anything.

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

## CURRENT OPERATING STATE
- Last verified storefront/source SHA is above; the upcoming handoff-docs sync is docs-only.
- Source code changes are not currently justified by the fresh visual audit. Next work is a deliberate reference-by-reference visual/icon parity review, fixing only proven UI mismatches, and reporting the “Tuyển chọn 25” mapping issue without changing it.
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
# LATEST OVERRIDE — 2026-10-22 12:46 UTC

This block supersedes older SHA/status claims below wherever they conflict. PR #108 remains OPEN and MUST NOT MERGE.

- Repository/branch: `chichute5500/Sindarealest-admin` / `fix/liquid-glass-audit-2026-10-19`.
- Current branch HEAD: `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50` (test-only follow-up to the UI commit below). PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108
- UI source commit: `d28c663f39b22fa4fa29dafa509ec30234722d73` — hero mobile viewport fit/centering, only `public/index.html` and its matching regression assertion changed.
- Current validation + full `npm test`: PASS for HEAD `96bb6ebd3067689d5652fa4a4823ff2bb3b60d50`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674913
- Preview deploy: PASS for the same HEAD: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674951. Stable alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Visual workflow: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39780674947 was still IN_PROGRESS at the last check (Chromium installation). No artifact for this SHA had yet been reviewed. Admin Preview Playwright #39780674999 was PENDING; it is a repository check only, not permission to modify Admin.
- Earlier artifact #12426665632 for SHA `39652e9fba71e82ccb0cfef682cf88701a00f3f5` exposed a real mobile issue: at 390×844 the hero presentation image extended beyond the right edge. Do not claim that issue fixed until screenshots from the new SHA are opened. Commit `d28c663` sets the mobile image row to viewport width, centers it, and limits the image to `calc(100vw - 22px)`; the test assertion was aligned on `96bb6eb`. Exact visual acceptance remains PENDING.
- Critical asset lock: `public/images/hero-sd-gl052.png` is an owner-supplied standalone presentation asset, NOT a catalog/SKU/product image. Never replace, crop, filter, mask, blend, recolour, retouch, edit pixels, or search the catalog for SD-GL052. Only HTML/CSS visibility/layout plumbing is in scope. Current layout patch does not edit the PNG. Keep it visible independently of product API/catalog state.
- No Production deploy, merge, `main`, Admin source, backend/API/auth, catalog/data/image mappings, D1/R2, bindings/secrets, DNS or Access policy changes. Do not submit checkout/payment.
- Next required action: poll visual workflow #39780674947; after it finishes download/open the actual live Preview hero screenshots for mobile 360/390 and desktop, Light and Dark; inspect that the full image fits without clipping and original image appearance is unchanged. Verify deployment metadata matches the audited SHA. If the visual workflow fails, inspect logs and fix the smallest cause. Then update this file, TEST-RESULTS, visual audit progress, and this prompt with final evidence. Do not stop at green CI status or claim 100%.

---

# URGENT HANDOFF OVERRIDE — 2026-10-22 (latest verified)


**This override supersedes older timestamps and status claims below wherever they conflict. Re-fetch branch HEAD and deployment metadata before source work.**

- Repository: `chichute5500/Sindarealest-admin`; branch: `fix/liquid-glass-audit-2026-10-19`; PR #108 is OPEN and MUST NOT be merged: https://github.com/chichute5500/Sindarealest-admin/pull/108
- Verified branch HEAD at handoff: `e4bcc7cb978743693077694baddf0801832d0808` (docs-only commit). Latest code-bearing source commit: `fb997b448a80a0bc9f34e75b4a31b7b450951fed`. Do not confuse branch HEAD, source SHA, deployed SHA, and audited SHA.
- Source validation/test workflow #39773486071: PASS for source SHA `fb997b448a80a0bc9f34e75b4a31b7b450951fed`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773486071
- Preview deploy workflow #39773485868: PASS for that source SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773485868. Alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ . Workflow success alone does not prove the hero looks correct.
- Visual workflow #39773486043: job conclusion SUCCESS, artifact `12423387968` (`sindarealest-liquid-glass-preview-873`, ~59.8 MB): https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773486043 . Local fixture audit passed. Live Preview probe/capture step succeeded, but the dedicated guarded “Capture live Cloudflare Pages Preview” step was SKIPPED; **do not call this a completed human visual audit or claim hero is correct until screenshots are opened and reviewed against the exact deployed SHA**.

## Critical incident / immediate next task — hero image

The owner states the assistant deleted/removed the supplied hero image during earlier work, before the protection rule was documented. Acknowledge this as an assistant-caused regression in process; do not make the owner re-explain it. The owner has ended work with this assistant and is moving to a new chat. Do not ask the owner to continue in this chat.

Absolute lock: `/images/hero-sd-gl052.png` is an owner-supplied standalone presentation asset, conceptually protected like the official logo. It is NOT a catalog item, SKU, product gallery, or database-backed image. Never search/validate/map SD-GL052 in the catalog. Never replace, redraw, regenerate, retouch, recolour, crop/recompose, remove/key its background, apply filters/masks, or alter pixels. Keep its file bytes unchanged. Only correct HTML/JS/CSS visibility/loading plumbing so the exact file displays unchanged, independently of product API/catalog outcomes.

**Known source issue at `fb997b4`:** `syncHeroProductImage()` directly assigns `/images/hero-sd-gl052.png?v=20261022-1` and unhides it, but hero-specific CSS still applies `filter:drop-shadow(...)` to `#home .hero-visual img` (around lines 2413 and 2438 in that source). This visually alters the protected asset and violates the new lock. Do not edit blindly: next chat must inspect current branch/source and remove only hero-image effects/transforms (not general product image styles), then add a regression assertion that hero image itself has no filter/mask/blend/crop/recomposition, asset URL is independent of catalog/API, and catalog failure cannot hide it. Do not alter the PNG bytes.

The workflow test being green does not mean the image is correct. Fetch artifact `12423387968`, inspect live Preview screenshots for mobile/desktop and Light/Dark, verify exact deployment SHA, and compare the image visually with the owner-supplied original. If no exact live capture is present, run a guarded read-only Preview capture only after verifying deployment SHA. No production changes.

## Scope and non-negotiable boundaries

- Preview/static storefront only. Never merge PR #108; do not touch `main`, Production, Admin branch, backend/API/auth/business logic, product data/mappings, D1/R2, bindings, secrets, DNS, or Access policy.
- Preserve the official logo exactly. Do not mutate product image mappings to hide mismatches. QR/payment remains fail-closed.
- Required viewport/theme audit: 360×800, 390×844, 768×1024, 1440×900 in Light and Dark; home/header/hero, “Phong cách đẳng cấp từ da cá sấu”, six Liquid Glass tiles, “Đặt hàng an tâm”, product grid/search/detail/gallery/cart/account/checkout/Zalo/footer/404.
- Report truthful PASS/FAIL/PENDING with SHA and evidence. No “100%” claims while any visual check is pending. Keep working autonomously in the new chat; do not repeat unaffected PASS tests.


## ABSOLUTE HERO ASSET LOCK — OWNER-SUPPLIED IMAGE (2026-10-22)

**The hero image is a standalone owner-provided presentation asset, not a product listing, SKU, catalog record, product-gallery image, or database-backed product image.** The owner personally supplied `/images/hero-sd-gl052.png` for the hero. Treat this asset as protected at the same level as the official brand logo.

- **Do not change it.** Never replace, redraw, regenerate, retouch, recolour, crop/recompose, key/remove its background, apply filters/masks, alter pixels, or substitute another image. Do not run image-processing experiments against it. Keep the original asset file and its bytes intact.
- Do not search the catalog for SD-GL052, validate its SKU, infer product identity, map it to a catalog item, or make hero visibility depend on product/API/catalog success. Its filename does not make it a catalog image; there is no catalog dependency to resolve.
- Only the page's loading/visibility plumbing may be corrected when needed to show this exact owner-supplied file unchanged. On catalog API failure, the hero image must still load and remain visible. Confirm the exact asset URL and image pixels in the actual Preview screenshot before declaring completion.
- If an older note describes hero matte-keying, background removal, sampling edge pixels, or treating hero as a product-image/SKU blocker, that note is superseded by this rule and must not be followed.

# SinDarealest2 — CURRENT STATE
Updated: 2026-10-22 — hero asset lock clarified; refresh live evidence before further source changes.

## Latest active work checkpoint — 2026-10-22 11:16 UTC

- PR #108 is OPEN / NOT MERGED. Current storefront-source candidate SHA: `dff584114dfd3916219f38b24950e5bf531e2199`; docs-only handoff commits after this point may move branch HEAD without changing deployed storefront source. At the time of this last refresh, latest docs-only tip was `823032a52ed7d5d164abfa34f67dc5cb526842e0`; this final CURRENT-STATE commit will advance the docs tip again, so re-fetch branch HEAD before any source work.
- Validation + full `npm test` **PASS for source SHA `dff584114dfd3916219f38b24950e5bf531e2199`**: [run #39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097).
- Preview deployment **PASS** for requested source SHA `dff584114dfd3916219f38b24950e5bf531e2199`: [run #39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), deployment URL `https://b7858119.sindarealest2.pages.dev/`, stable Preview alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Treat as deploy job evidence; still require the visual audit's deployment metadata gate before calling a fresh screenshot audit exact-SHA verified.
- Live visual audit for this source SHA: [run #39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207). At 11:19 UTC it was IN_PROGRESS at isolated Chromium installation and had no artifact. Refresh status before acting.
- Documentation-only commits after source SHA `dff584114dfd3916219f38b24950e5bf531e2199` spawned PR validation runs on the newer docs-only HEADs, despite docs being ignored by push deployment triggers. These are not new storefront deploys. Exact current-source test evidence remains run #39769146097. Batch future handoff edits where possible to avoid needless full-suite churn.
- Latest UI change replaces the rejected radial edge mask with a conditional Dark-mode matte key: the same owner-provided `/images/hero-sd-gl052.png?v=20261022-1` is sampled at 8 image-edge/corner points; existing gallery SVG filter is applied only after at least 6 neutral near-white votes. No source URL, image pixels, product mapping, catalog data or backend code is changed by this effect. **Visual acceptance is pending until new Preview screenshots are actually opened.**
- Regression history: radial feather version did not visibly remove the rectangular matte and was superseded. Two subsequent intermediate test failures were traced to (a) fake image objects in `storefront-html-safety.test.mjs` lacking `classList`, then (b) an assertion expecting non-optional `classList.toggle`; guards and assertion were corrected. Do not transfer those failed intermediate results to the current SHA; current validation run above is PASS.
- Admin Preview Playwright for this source SHA: [run #39769146129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146129); refresh status. No Admin source was intentionally edited; the workflow is a repository-wide check.
- Keep VISUAL-PARITY / ICON-PARITY open. Do not touch the confirmed “Tuyển chọn 25” product-gallery mapping; that remains a trusted-catalog dependency.

## Latest visual-review checkpoint — 2026-10-22 10:35 UTC

- Live GitHub state at this review: branch and PR #108 HEAD `666ac0e65b81317d232ae526d3327e498a8b3f76`; PR #108 remains OPEN and NOT MERGED. Comparing `e916ce590b6dbd720dca51405097d20333ce649b` to this HEAD shows 19 commits ahead; changed files are documentation/report files only, no storefront source.
- Newer screenshot artifact: workflow run [#39762445821](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821), artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837). It contains 128 real Preview captures, all 8 viewport/theme pairs, 13 route checks, zero recorded hard failures/failed requests, plus fresh copies of both mobile references and both icon boards.
- **Exact-deployment verification did not pass for that artifact.** `deployment-verification.json` says `DEPLOYMENT_METADATA_UNVERIFIED`: expected `e916ce590b6dbd720dca51405097d20333ce649b`, while the Preview alias metadata returned deployment `3e174ea2-9b58-4801-9f98-f8f941280cc0` with commit `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. The screenshot artifact is suitable for observational visual review because the intervening commits compare as docs-only, but it is **not** a new exact-SHA verification. The last exact-SHA-verified live audit remains run [#39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036), artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814), SHA `fc406599e04475e232fad790efd03d46979a5a20`.
- Actual screenshots inspected: home across 360×800, 390×844, 768×1024 and 1440×900 in Light/Dark; first-paint splash; six benefit tiles; mobile product detail/gallery and next-image state; icon pressed state in Light/Dark; account, cart-with-item, checkout form, Zalo CTA, footer/contact and 404. The owner-supplied `/images/hero-sd-gl052.png` is present. The icon boards `Icon.png` and `Chitiet.png` were opened from the artifact; the sampled home/detail controls use outlined icon artwork and the favorite pressed tint is consistent with the blue/navy reference palette. This is not a claim that every icon state is fully accepted.
- **Confirmed gallery mismatch, read-only:** `/sanpham/sneaker/sneakers-33-48`, title “Sneaker da cá sấu – Tuyển chọn 25”. Screenshot `product-detail-modal-direct-open-mobile-light-390x844.png` shows black high-top boots as image 01/19; `product-gallery-next-mobile-light-390x844.png` shows a visibly different green/white sneaker as image 02/19, and the visible thumbnails span different shoe designs. The automated `galleryNext: PASS` only proves navigation works, not image-to-product consistency. Product/image mapping is locked by scope, so do not edit it or hide the mismatch as a UI workaround; record as a trusted-catalog/mapping dependency.
- No storefront code was changed in this review. The confirmed gallery issue cannot be corrected inside the present no-mapping-change scope. Keep visual parity and icon parity OPEN; do not claim 100%. Planning estimate remains 88% unless the evidence-backed work scope is recalculated.


## Startup first-paint evidence — run #39762445821 (2026-10-22)

- Inspected the four captured startup videos in artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837): 360×800 and 390×844, Light and Dark. Each video is approximately 1.08–1.16 seconds.
- Parsed `live-preview/visual-audit.json`: `firstPaintCoverageComplete=true`, `firstPaintVideoCoverageComplete=true`, `firstPaintFrameCount=20`, `firstPaintViolationCount=0`, `firstPaintVideoCount=4`. Across the four startup timelines there are 107 recorded samples; all have `violation=false`. While the welcome splash owns the screen, the bottom navigation and account drawer are recorded as not visible. No account flash or bottom-toolbar overlap was captured in these runs.
- **Evidence limit:** the artifact's deployment metadata check failed because it expected `e916ce590b6dbd720dca51405097d20333ce649b` but Cloudflare reported `5f1be31d3b2d1c1f01b7352071186ac32e5af0a1`. Commit comparison shows the seven intervening commits touched documentation only, no storefront code; thus this is strong observational evidence for the same storefront source, but not a new exact-SHA-verified audit. Keep the startup issue as `PASS — captured runs only; device-specific report not disproved`, and do not rerun without new contrary evidence or a new source/environment.


## Source of truth
- Repository: https://github.com/chichute5500/Sindarealest-admin
- Work branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, DO NOT MERGE.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Branch HEAD is intentionally not frozen in this file: the documentation cleanup adds docs-only commits. Fetch the branch and PR #108 HEAD live before every new work session; distinguish branch HEAD from deployed storefront SHA and audited SHA.
- Latest verified storefront source, deployed Preview and audited SHA: `fc406599e04475e232fad790efd03d46979a5a20`.
- Latest live audit [run #39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036) SUCCESS; logs confirm `VERIFIED_PREVIEW_DEPLOYMENT` with exact branch and SHA match.
- Latest artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814): live Preview PASS, 128 screenshots, 8/8 viewport/theme pairs, 13 route checks, zero failed requests/hard failures. Archive comparison remains `COMPLETE_NEEDS_VISUAL_REVIEW`, so visual parity is not yet complete.
- Validate/tests [#39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928) reported PASS; Admin Preview read-only smoke [#39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960) reported PASS.
- Docs-only commits are excluded from Preview deploy/live-capture push triggers by workflow `paths-ignore: docs/**`. A docs-only handoff commit must not be presented as a new deployed storefront.

## Latest live run refresh (2026-10-22 UTC)
- HISTORICAL: branch/PR head was `99eadd224de1da319598998028ebdcdfda4d495a` before later documentation-only commits. Current verified head at this refresh is `666ac0e65b81317d232ae526d3327e498a8b3f76`; fetch again before acting.
- HISTORICAL at prior refresh: run #39762445821 was IN_PROGRESS. It has since completed; see the Latest visual-review checkpoint above. Its screenshot artifact is observational only because the artifact's deployment metadata did not match the expected SHA.
- CI [#39762468528](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762468528) passed for `2bd71f55d1c473852d9bfe5f39b701943ce464d0`; current HEAD advanced later via docs-only edits. The next chat must refresh CI and deployment status rather than transfer this PASS to the current HEAD.
- Root-level `AUDIT-REPORT-2026-10-17.md`, `UPGRADE-REPORT.md`, and `INTEGRITY-REPORT.md` now carry historical-report banners. They remain for traceability, not as current storefront handoff.

## Documentation cleanup checkpoint (2026-10-22)
- Canonical handoff order: this file → `HANDOFF.md` → `TEST-RESULTS.md` → `TASKS.md` → visual audit plan → [canonical new-chat prompt](PROMPT-NEXT-CHAT-2026-10-22.md).
- Dated prompts `PROMPT-NEXT-CHAT-2026-10-20.md`, `PROMPT-NEXT-CHAT-2026-10-21.md`, and `docs/prompts/NEXT-CHAT-PROMPT-2026-10-21-STATIC-WEB.md` are marked HISTORICAL; REV2/REV3 already direct readers to the canonical prompt. The master prompt now starts with an override saying old embedded checkpoints are historical only.
- `docs/website-screenshots/README.md` no longer presents the old blocked-Access/local-fixture run as current project status; it distinguishes the before/after screenshot archive from real live Preview audit artifacts.
- This is a targeted handoff cleanup, not a claim that every historical report in the repository is current. Old audit reports and packaging/deployment READMEs are retained for historical context; never use them to override this file or the current code/config. If a task depends on one, compare it against current code and platform metadata.
- After the documentation-only edits, fetch the live branch HEAD and PR head again. Documentation changes do not imply a new storefront deploy because `docs/**` is excluded from the Preview push trigger.

## Non-negotiable scope
- Storefront public UI only: HTML/CSS/JS, layout, icons, effects, responsive behavior and visual parity.
- Never merge PR #108; never deploy Production or change `main`, DNS, Admin branch/code, backend/API/auth/schema/business logic, product/catalog/SKU/price/image mappings, D1/R2, bindings, secrets or Access policy.
- Never submit a real checkout or test money transfers.
- Keep QR checkout fail-closed until trusted backend confirmation and receiver/payment configuration exist. Never fabricate QR, amount or paid status.
- The owner-supplied hero `/images/hero-sd-gl052.png` is settled and must remain visible. Do not search the catalog for SKU SD-GL052, hide, replace or delete this asset.

## Verified facts vs open work
- The prior live audit SHA `78b0a673a610501bfa4048df0ed614ff48246f97` / run #39756327625 / artifact #12416207670 is historical; the newer exact-SHA audit is run #39760903036 / artifact #12418615814 for `fc406599e04475e232fad790efd03d46979a5a20`.
- Gallery arrow press: 4/4 PASS in that audit (detail/fullscreen, Light/Dark; vertical center shift <=1px; press scale ~0.97; Next/Previous returns to original image).
- Fly-to-cart: 6/6 PASS and animation edge cases 2/2 in that audit. Preserve animation capture behavior; do not reopen without new contrary evidence.
- Visual parity is NOT complete. Must inspect real screenshots against `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` and `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Icon redesign is NOT declared complete. Both `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png` were freshly opened from artifact #12418823837 and compared with sampled live Preview home/detail states on 2026-10-22; sampled icons broadly align, but remaining icon contexts and exact-SHA capture are still required.
- “Tuyển chọn 25” gallery has a CONFIRMED visible image inconsistency in artifact #12418823837 (image 01/19 black boots; image 02/19 different green/white sneaker). Do not modify product/image mapping without trusted catalog evidence and authorization; retain as a scope-locked dependency.
- Six Liquid Glass tiles must have three glass layers; do not blur the whole page. Review satin folds, header/logo/hero, trust section, catalog/search/cards, product detail/gallery, cart/account/checkout, Zalo, footer and 404 in all 8 viewport/theme pairs.
- Approximate progress: 88% remains a planning estimate only, not an audit score. The actual screenshot review now covers the 8 home viewport/theme pairs and key states; visual and icon parity remain open.

## Required viewport/theme matrix
360×800, 390×844, 768×1024, 1440×900 × Light and Dark = 8 combinations.

## Next actions (in order)
1. Refresh branch HEAD and PR #108 after this documentation-only update. PR must remain OPEN and unmerged. Separate docs HEAD from storefront source SHA `dff584114dfd3916219f38b24950e5bf531e2199`.
2. Check [validation #39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097), [Preview deploy #39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), [Admin Playwright #39769146129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146129) and especially [live visual audit #39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207). Wait until audit ends, download and open the artifact screenshots, and confirm deployed/source/audited SHA before acceptance.
3. Specifically compare hero Dark-mode matte at 390×844 and 1440×900, and also check Light mode to ensure the conditional filter is inactive where not verified. If the matte still looks rectangular or any shoe edge/colour is damaged, revert only the new hero matte helper/filter and its test rather than stacking more filters.
4. Keep VISUAL-PARITY and ICON-PARITY open; preserve the official logo and supplied hero `/images/hero-sd-gl052.png`. Startup splash/account-flash issue has 4 videos and 107 timeline samples with 0 captured violations in artifact #12418823837; do not repeat unless contrary evidence appears.
5. Keep PRODUCT-GALLERY-25 as a confirmed read-only mismatch. Do not change product/catalog/image mappings; correction requires trusted catalog data and authorization outside this scope.
6. After any future UI code change: run affected tests, deploy Preview, verify exact deployment SHA, run live audit, inspect artifact images, then update evidence docs. QR/payment stays fail-closed; no real checkout/payment tests.
## Canonical document rules
- This file is the single current-state summary. Other handoff docs should link here and retain only evidence/history they uniquely own.
- Never copy an old SHA or percentage forward without re-verifying it.
- Keep the latest checkpoint at the top; label older entries HISTORICAL/SUPERSEDED, never let them conflict with current facts.
- Test results are scoped to exact SHA, test suite, environment and artifact. Do not rerun unaffected PASS tests.
