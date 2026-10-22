# HANDOFF OVERRIDE — HERO INCIDENT AND CURRENT EVIDENCE (2026-10-22)


Use `CURRENT-STATE.md` as source of truth; this override supersedes stale source/deployment timestamps below. Owner is moving to a new chat after the assistant's handling of the hero image reduced progress. Do not ask the owner to repeat the story.

- Last verified branch HEAD: `e4bcc7cb978743693077694baddf0801832d0808`; last code-bearing source SHA: `fb997b448a80a0bc9f34e75b4a31b7b450951fed`; refresh both.
- Validation: [#39773486071 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773486071). Preview deploy workflow: [#39773485868 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773485868). Visual workflow: [#39773486043](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773486043), artifact `12423387968`; local audit passed but live screenshots still need direct visual review and exact deployed-SHA confirmation.
- Immediate source concern: hero-specific drop-shadow filters remain in `public/index.html` at source `fb997b4`; these violate the no-alteration rule. See CURRENT-STATE.md for safe next steps.

Absolute asset lock: `/images/hero-sd-gl052.png` is a user-provided standalone presentation image, not a product/SKU/catalog image. Do not replace or modify its bytes or appearance, including filters, cropping, masks or background removal. Never pursue SKU/catalog lookup. Only fix loading/visibility plumbing. Preview only; PR #108 remains open/unmerged; no Production/main/Admin/backend/data/config changes.


## ABSOLUTE HERO ASSET LOCK — OWNER-SUPPLIED IMAGE (2026-10-22)

**The hero image is a standalone owner-provided presentation asset, not a product listing, SKU, catalog record, product-gallery image, or database-backed product image.** The owner personally supplied `/images/hero-sd-gl052.png` for the hero. Treat this asset as protected at the same level as the official brand logo.

- **Do not change it.** Never replace, redraw, regenerate, retouch, recolour, crop/recompose, key/remove its background, apply filters/masks, alter pixels, or substitute another image. Do not run image-processing experiments against it. Keep the original asset file and its bytes intact.
- Do not search the catalog for SD-GL052, validate its SKU, infer product identity, map it to a catalog item, or make hero visibility depend on product/API/catalog success. Its filename does not make it a catalog image; there is no catalog dependency to resolve.
- Only the page's loading/visibility plumbing may be corrected when needed to show this exact owner-supplied file unchanged. On catalog API failure, the hero image must still load and remain visible. Confirm the exact asset URL and image pixels in the actual Preview screenshot before declaring completion.
- If an older note describes hero matte-keying, background removal, sampling edge pixels, or treating hero as a product-image/SKU blocker, that note is superseded by this rule and must not be followed.

# HANDOFF — SINDAREALEST2 STATIC STOREFRONT

> Current facts live in [CURRENT-STATE.md](CURRENT-STATE.md). Read it first; this document is a short operating guide, not a second competing status log.

## Project boundary
- Repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 open and not to be merged.
- Preview only. Do not touch Production/main, Admin, backend/API/auth/schema/business logic, product data/mappings, D1/R2, bindings, secrets, DNS or Access policy.
- Preserve owner-provided hero `/images/hero-sd-gl052.png`. QR/payment stays fail-closed until trusted backend configuration exists.


## Latest source/deploy handoff — 2026-10-22 11:16 UTC

- PR #108 is OPEN / NOT MERGED. Latest storefront source SHA: `dff584114dfd3916219f38b24950e5bf531e2199`; documentation-only commits can move branch HEAD without changing this deployed source.
- Validation/tests PASS [#39769146097](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146097). Preview deploy job PASS [#39769145975](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769145975), URL `https://b7858119.sindarealest2.pages.dev/`, stable alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`.
- Live visual audit [#39769146207](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769146207) was still pending at last poll. Next chat must read status/artifact before making any parity claim.
- Latest patch is conditional Dark hero matte keying, not a radial mask: sample 8 corners/edge points and reuse existing SVG background filter only at >=6 neutral-light votes. Hero asset path remains unchanged. Keep only if screenshots show improvement without clipping/recolouring the shoe.
- Historical intermediate commits failed tests because test-double `classList` was missing and then an assertion expected the non-optional call. Both were corrected before the passing validation SHA above.
- All scope lock rules in CURRENT-STATE remain in force; no gallery image mapping fix is permitted.

## Latest inspection note — 2026-10-22
The newer artifact [#12418823837](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39762445821/artifacts/12418823837) has 128 genuine Preview captures and both references/icon boards, but its deployment-verification JSON is `DEPLOYMENT_METADATA_UNVERIFIED` (`e916ce...` expected versus deployed `5f1be31...`). Use it for visual observation only, not exact-SHA acceptance. Read CURRENT-STATE.md for the full screenshot review. The “Tuyển chọn 25” gallery is visibly inconsistent (black boots on image 01/19; different green/white sneaker on image 02/19); product/image mapping remains out of scope and unchanged.

## How to continue
1. Read [CURRENT-STATE.md](CURRENT-STATE.md), then fetch current branch and PR HEAD.
2. Read [TEST-RESULTS.md](TEST-RESULTS.md) and [TASKS.md](TASKS.md) for exact-SHA evidence and outstanding work.
3. Check GitHub Actions and Cloudflare deployment metadata. Keep source SHA, deployed Preview SHA and audited SHA separate.
4. Inspect the real screenshots against both source reference PNGs; do not infer visual parity from a green workflow.
5. Fix only confirmed storefront mismatches, run relevant tests, verify Preview deployment SHA, inspect the new artifact and update the docs.
6. Continue after reporting; stop only for a real user action, permission or trusted data dependency.

## Evidence discipline
- PASS is scoped to the exact commit, test suite, environment and artifact.
- Gallery press (4/4) and fly-to-cart (6/6 plus 2 animation-edge checks) were PASS in the recorded live audit for SHA `78b0a673a610501bfa4048df0ed614ff48246f97`; do not reopen without newer contrary evidence.
- Latest exact-SHA machine-verified live audit is run #39760903036, artifact #12418615814, for SHA `fc406599e04475e232fad790efd03d46979a5a20`; deployment verification passed. Screenshot archive still requires manual visual review, so this does not certify final visual parity.
- Docs-only commits are excluded from Preview deployment/live-capture push triggers. Do not say a documentation commit has deployed storefront code.

See [NEXT-CHAT prompt](PROMPT-NEXT-CHAT-2026-10-22.md) for the concise handoff instructions.
