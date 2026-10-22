# CHAT TRANSFER — READ BEFORE ANY ACTION (2026-10-22)


1. Read `docs/handoff/CURRENT-STATE.md` and `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md` first. They contain the latest hero incident and evidence. Fetch current GitHub branch HEAD/PR #108 and workflow/deployment metadata; do not assume old SHAs are current.
2. The owner says the previous assistant removed the owner-provided hero image before writing the lock. Accept responsibility and do not make the owner repeat the context.
3. The hero file `/images/hero-sd-gl052.png` is a standalone presentation asset, not a catalog/SKU/product image. It is locked like the official logo. Never replace/edit/retouch/recolour/crop/filter/mask/key its background or change its pixels. Never investigate SD-GL052 catalog linkage.
4. Known issue in source `fb997b4`: CSS drop-shadow is applied directly to `#home .hero-visual img`. Verify current source and remove only hero-specific visual transformations; test direct asset loading independent of catalog failure. Preserve original PNG bytes.
5. Review artifact `12423387968` from [visual workflow #39773486043](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39773486043); CI success is not visual approval. Verify exact deployed SHA, inspect real Preview screenshots in Light/Dark/mobile/desktop, then report evidence honestly.
6. Keep PR #108 open/unmerged. Preview storefront only; no Production/main/Admin/backend/API/auth/data/D1/R2/bindings/secrets/DNS/Access changes. Continue work autonomously; do not rerun unrelated passed tests or claim 100% without evidence.


## ABSOLUTE HERO ASSET LOCK — OWNER-SUPPLIED IMAGE (2026-10-22)

**The hero image is a standalone owner-provided presentation asset, not a product listing, SKU, catalog record, product-gallery image, or database-backed product image.** The owner personally supplied `/images/hero-sd-gl052.png` for the hero. Treat this asset as protected at the same level as the official brand logo.

- **Do not change it.** Never replace, redraw, regenerate, retouch, recolour, crop/recompose, key/remove its background, apply filters/masks, alter pixels, or substitute another image. Do not run image-processing experiments against it. Keep the original asset file and its bytes intact.
- Do not search the catalog for SD-GL052, validate its SKU, infer product identity, map it to a catalog item, or make hero visibility depend on product/API/catalog success. Its filename does not make it a catalog image; there is no catalog dependency to resolve.
- Only the page's loading/visibility plumbing may be corrected when needed to show this exact owner-supplied file unchanged. On catalog API failure, the hero image must still load and remain visible. Confirm the exact asset URL and image pixels in the actual Preview screenshot before declaring completion.
- If an older note describes hero matte-keying, background removal, sampling edge pixels, or treating hero as a product-image/SKU blocker, that note is superseded by this rule and must not be followed.

# NEXT CHAT PROMPT — SINDAREALEST2

Canonical concise prompt: [docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md](../handoff/PROMPT-NEXT-CHAT-2026-10-22.md). Current status and source of truth: [docs/handoff/CURRENT-STATE.md](../handoff/CURRENT-STATE.md).

Before acting:
1. Read CURRENT-STATE.md.
2. Fetch branch HEAD and PR #108 HEAD from GitHub.
3. Refresh relevant GitHub Actions and Cloudflare deployment metadata.
4. Continue open tasks in TASKS.md and the visual acceptance checklist.
5. Update evidence after meaningful changes.

Mandatory: continue after reports; do not rerun unaffected PASS tests; inspect real screenshots; keep branch/deployed/audited SHAs separate; PR #108 stays open; Preview only; no Admin/backend/product-data changes; preserve `/images/hero-sd-gl052.png`; QR/payment stays fail-closed. Follow the canonical prompt for full boundaries and acceptance rules.
