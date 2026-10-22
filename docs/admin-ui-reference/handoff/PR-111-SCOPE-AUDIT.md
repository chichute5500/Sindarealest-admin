# PR #111 SCOPE / PROVENANCE AUDIT

**Live source audit checkpoint:** 2026-10-22T16:28:00Z. This is a read-only comparison of tree blobs and source text; no deploy/setup script, remote SQL, migration, D1 or R2 action was executed.

## Current PR metadata
- ADMIN [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111): OPEN/unmerged, base `main`, HEAD at checkpoint start `0502739790fecfdf56f3c267dcaf607f1751908e`, 1,310 changed files, +49,466 / −404, mergeable=false.
- Protected website/static [PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108): OPEN/unmerged, HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`, 288 changed files, +23,248 / −394, mergeable=false; read-only in this task.
- `main` HEAD: `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Current merge base for ADMIN vs main: `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; branch comparison is diverged (ADMIN ahead 1,260 and behind 6 when checked).
- Tree snapshots were non-truncated: ADMIN 1,906 blobs; main 638; merge base 635; PR #108 tree was re-fetched at its live HEAD.

## Live changed-file census
The paginated GitHub PR file list and PR metadata both report **1,310 paths**.

| Top-level path | Count |
|---|---:|
| `.github` | 2 |
| `README-DEPLOY.txt` | 1 |
| `data` | 1 |
| `docs` | 1,247 |
| `functions` | 24 |
| `migrations` | 2 |
| `package.json` | 1 |
| `public` | 2 |
| `scripts` | 5 |
| `tests` | 25 |
| **Total** | **1,310** |

| Extension | Count |
|---|---:|
| PNG | 913 |
| MD | 171 |
| JSON | 163 |
| MJS | 28 |
| JS | 26 |
| HTML | 3 |
| YML | 2 |
| SQL | 2 |
| TXT | 1 |
| ZIP | 1 |
| **Total** | **1,310** |

The current runtime/config set (including `package.json`) has 36 paths: **14 added and 22 modified relative to the live merge base**. The older 1,304 census and old merge-base SHA `a3834fed...` are historical and must not be used as current evidence.

## Runtime/config path provenance (ADMIN tree at `0502739790fecfdf56f3c267dcaf607f1751908e`)
“ADDED” means no blob existed at the merge base; “MODIFIED” means the path existed but the ADMIN blob differs from the merge-base blob. The blob hashes below are exact at this checkpoint, not claims that every change is correct.

| Path | Relationship | ADMIN blob SHA |
|---|---|---|
| `.github/workflows/admin-preview-diagnostics.yml` | ADDED vs merge-base | `bfc42beeb3506289975f277af95b0d4db314a0f4` |
| `.github/workflows/liquid-glass-visual-preview.yml` | ADDED vs merge-base | `f76f28fe57db2d990f1767770addd908fcf6581d` |
| `functions/_lib.js` | MODIFIED vs merge-base | `14240aa8c757976cf0455ada1a5ae7115ece20df` |
| `functions/_lib/watermark-settings.js` | MODIFIED vs merge-base | `60ba2f27d522d13b06238306095af69cca7e9ac2` |
| `functions/_middleware.js` | MODIFIED vs merge-base | `2241bdfad2d7214118ed5e25467b0fc195958f84` |
| `functions/_payments.js` | ADDED vs merge-base | `0639f18194af4343c00d229f52a2dbd68eb99398` |
| `functions/api/admin/backup.js` | MODIFIED vs merge-base | `2ec690b177f37d972eb844766e5d26998a8e720a` |
| `functions/api/admin/orders.js` | MODIFIED vs merge-base | `58e7c6978e2a222d56a042f20b4c02c7df9fced1` |
| `functions/api/admin/payment-qr-preview.js` | ADDED vs merge-base | `a92a96093b3ec07e535b08168c4ef24d4a6b80b5` |
| `functions/api/admin/payment-qr-upload.js` | ADDED vs merge-base | `7a133a490488cf0593ae7cf1165acbc0307fcaa5` |
| `functions/api/admin/payment-qr.js` | ADDED vs merge-base | `6408ef720dc2b2e518ee7b9ef67e935d5581620b` |
| `functions/api/admin/payment-requests.js` | ADDED vs merge-base | `66620cb07d9c9d96446576bdbab853f8aa218392` |
| `functions/api/admin/payment-transactions.js` | ADDED vs merge-base | `bd3fae18ea201bf2676ffa7097f14d2049d5449b` |
| `functions/api/admin/products.js` | MODIFIED vs merge-base | `89197b4a9d2f1bd449f73ccabdae460608ae361f` |
| `functions/api/admin/products/[id].js` | MODIFIED vs merge-base | `8b906d3a398f57e1e3d170e5d550ce13c21f47b1` |
| `functions/api/admin/products/reset-skus.js` | MODIFIED vs merge-base | `132b30d3a986973f5427bd779346710a4d3239b4` |
| `functions/api/admin/restore.js` | MODIFIED vs merge-base | `ae7b53722d68577e8f801d2e84013cb20a541847` |
| `functions/api/admin/settings.js` | MODIFIED vs merge-base | `440d9d35c962a57e5fd87c364a7e431e1f369d1a` |
| `functions/api/admin/warranties.js` | MODIFIED vs merge-base | `e07ca549db7175ecc748d2883fb335ec62c1b156` |
| `functions/api/order-payment.js` | ADDED vs merge-base | `0281ead2d5070c1419b8952b01f8f7fc3b92d5d8` |
| `functions/api/orders.js` | MODIFIED vs merge-base | `7a9a8a77211efb6eb269814c5f9bdcdd89f140b9` |
| `functions/api/payment-settings.js` | ADDED vs merge-base | `fac8b3e4e90c5d817dfe247d763c0258f56a0029` |
| `functions/api/products.js` | MODIFIED vs merge-base | `416e2802c439829e79a74c3a9c10025fb5a1facb` |
| `functions/api/warranty-lookup.js` | MODIFIED vs merge-base | `10f408449e23814c44a1d634696b3bc92731ccc7` |
| `functions/payment-qr/[key].js` | ADDED vs merge-base | `42aafa35832ddf411065785809d89fc05322a294` |
| `functions/sitemap.xml.js` | MODIFIED vs merge-base | `779a1d98ca5a53bab0a30be06d32cdef972f5a5c` |
| `migrations/0008_product_sku_verification.sql` | ADDED vs merge-base | `5710d484214245795cc7ff5d37395599bdaf4c3d` |
| `migrations/0009_fulfillment_and_manual_payments.sql` | ADDED vs merge-base | `dbb64910bedd3e0ee8badf2e9870d5b1d9397b15` |
| `package.json` | MODIFIED vs merge-base | `446fcdfe0c92d843fa311f6266629a808188e47e` |
| `public/admin/index.html` | MODIFIED vs merge-base | `6246d2cde2e9c9e041019e169984bb23fe6c7b9d` |
| `public/index.html` | MODIFIED vs merge-base | `bb0ae30ecb06319eb87e5725ad47fda82595eeb8` |
| `scripts/capture-liquid-glass-preview.mjs` | ADDED vs merge-base | `9b3c88ecb762245d6ee01984c595ece512c801cb` |
| `scripts/check-migrations.mjs` | MODIFIED vs merge-base | `242ce439d9de903d3949f1a55baf69fe9a8e1f29` |
| `scripts/check-project.mjs` | MODIFIED vs merge-base | `3456fe7fc7bc891ecebbc97ca662f59735ba0e4b` |
| `scripts/deploy-cloudflare.mjs` | MODIFIED vs merge-base | `9a1e30c770527f27f20210b9ceb98ca25244f771` |
| `scripts/setup-cloudflare.mjs` | MODIFIED vs merge-base | `ec1c614048b84657ef8824d865dda42f0c8341fe` |

## Cross-branch and scope findings
1. **Seven current ADMIN blobs exactly match blobs at live PR #108 HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`**:  
   `functions/_lib/watermark-settings.js` — `60ba2f27d522d13b06238306095af69cca7e9ac2`; `functions/api/admin/products.js` — `89197b4a9d2f1bd449f73ccabdae460608ae361f`; `functions/api/admin/products/reset-skus.js` — `132b30d3a986973f5427bd779346710a4d3239b4`; `functions/api/admin/settings.js` — `440d9d35c962a57e5fd87c364a7e431e1f369d1a`; `functions/api/admin/warranties.js` — `e07ca549db7175ecc748d2883fb335ec62c1b156`; `functions/api/warranty-lookup.js` — `10f408449e23814c44a1d634696b3bc92731ccc7`; `migrations/0008_product_sku_verification.sql` — `5710d484214245795cc7ff5d37395599bdaf4c3d`.  
   Identical blobs do not by themselves prove incorrect duplication, but they require provenance/contract review before either PR is merged; do not edit the static branch from here.
2. **`public/index.html` is a real scope conflict to review before merge.** At this checkpoint ADMIN blob is `bb0ae30ecb06319eb87e5725ad47fda82595eeb8`, main/merge-base blob is `1e9362341a6c30976dfb9e86886c38e0ff3e5fd4`, and live PR #108's file blob is `94542aff3710eb5cbc2919ae503602b691f7b334`. The ADMIN version therefore differs from both main and the protected website branch. Do not change this path here; keep the PR unmerged until its intended ownership is resolved.
3. `.github/workflows/liquid-glass-visual-preview.yml` is added relative to the ADMIN merge base, but the live static PR has a different blob (`32f8b13fb5c5635e3be1cbb720059c23c500a940`). Review the two workflows separately; do not copy across branches.
4. Full PR provenance is **PARTIAL**, not PASS. This section accounts for the 36 runtime/config paths but does not yet validate every docs/history/image/test path or every semantic code change.

## Migration/preflight source audit — no remote operations
- `migrations/0009_fulfillment_and_manual_payments.sql` creates `fulfillment_type`, payment-term/token fields, `order_payment_requests` and `order_payment_transactions`.
- `scripts/setup-cloudflare.mjs` **does include a 0009 preflight** (current blob `ec1c614048b84657ef8824d865dda42f0c8341fe`): after executing remote migrations 0001 and 0003–0007 and adding missing 0008 SKU columns, it issues SELECT-only schema checks for 0009 fields/tables and stops before seed/Pages deploy if they fail. It does not automatically apply migration 0009. Because it performs remote writes before that preflight, do not run it under current owner restrictions.
- `scripts/deploy-cloudflare.mjs` **also includes a 0009 preflight** (blob `9a1e30c770527f27f20210b9ceb98ca25244f771`), after checks for 0007 contact snapshots and 0008 SKU columns, before Pages deploy. It checks schema via SELECT/zero-row queries; it does not apply 0009.
- This corrects any older handoff statement that either script “does not reference migration 0009.” That claim is stale. The true runtime state of remote D1 schema/ledger remains **NOT_VERIFIED** because the script was not run and remote access is not authorized. Do not infer that migration 0009 is applied or absent from source code alone.

## Latest test/source evidence
- [Actions #39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346) SUCCESS on exact code/test SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`.
- [Artifact #344](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210): 102 PNGs and 78 fixture metrics. Gallery screenshot `product-gallery__390x844__light.png` reviewed alongside the included reference poster; current CSS provides a featured cover slot, 1.55:1 mobile image frame and horizontal thumbnail rail, with existing Playwright assertions for image count/accessibility/reorder. The fixture uses synthetic placeholder images, so this does **not** justify adding fake product photography. No specific UI fix is promoted from this visual review; screen #5 remains PARTIAL_NOT_ACCEPTED until per-screen acceptance is complete.
- The protected static `public/index.html` at PR #108 head `2d80095f7323b1a790931dc2ab67b59e7e6edf8d` currently adapts `/api/order-payment` without mapping/displaying the API's `freeShippingEligible` / `freeShipping` fields (source-level observation only). Admin payment API source returns these flags; this integration display gap belongs to the static-branch owner/agent. No static write was made here.
- Run #39804852604's retry-customers timeout is historical; the newer #39816652346 run passes.

## Safety/deferred scope
- D1 remote schema/ledger: NOT_VERIFIED.
- Migration 0009 and PRE/PRO migrations: DEFERRED_BY_OWNER; the preflight code does not authorize execution.
- R2 persistence/product-image save: DEFERRED_BY_OWNER / NOT_VERIFIED.
- AI grouping: BLOCKED until an owner-approved API/UX contract exists.
- No Production deploy, Access bypass, secrets access, remote D1/R2, setup/migration/deploy execution, merge or cross-branch write.

## Next batch
1. Continue semantic review of the 36 runtime/config paths—especially `public/index.html`, the 7 static-shared blobs, the payment route/ledger, and setup safety sequencing—without executing remote operations.
2. Review changed test/evidence/docs batches against their provenance and intended scope; do not call the overall PR audit complete until each path group is classified.
3. Keep #111/#108 open/unmerged; only write to the ADMIN branch.


## Latest validated UI checkpoint — run #39813340309
- Tested source SHA [`4b2220d510a906882e4309df6969c0c43514c421`](<https://github.com/chichute5500/Sindarealest-admin/commit/4b2220d510a906882e4309df6969c0c43514c421>); source CI [#39813340342](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340342>) and Playwright/Preview [#39813340309](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309>) both SUCCESS.
- Artifact [#340 / 12439794397](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397>) contains 102 PNGs and 78 fixture metrics. Mobile toast/navigation regression PASS.
- The old retry-customers timeout is historical. Authenticated backend data, remote schema/ledger and production deployment remain untested/unverified/not performed as applicable.


## Latest evidence refresh — 2026-10-22
- Current source/test SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`; source validation #39816652373 PASS and responsive/theme + Preview diagnostic #39816652346 PASS.
- Current screenshot artifact: [admin-preview-evidence-344, ID 12441639210](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210). The earlier artifact #339 is historical.
- Live PR #111 metadata is now 1,314 changed files. The 1,310-path census and its detailed counts are historical until the paginated live file list is refreshed.
