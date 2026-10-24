# LIVE PR #108 SCOPE RECONCILIATION — 2026-10-24

> This live inventory supersedes all historical file counts and scope groupings below. It is a read-only path classification; it does not remove, revert, approve, merge, or deploy any listed change.

## Verified live refs

- Repository: `chichute5500/Sindarealest-admin`
- PR: [#108](https://github.com/chichute5500/Sindarealest-admin/pull/108) — **OPEN, unmerged**, base `main`.
- PR/head branch SHA: `2f272f3a8a40438199b93cdd08a3046819f92aa8` (matched live branch ref at review time).
- Live PR changed-file count: **298**; additions 28051, deletions 449.
- Latest verified storefront source/test SHA: `8a4cc6066436f040e7900709e8dd2047ab7ab579`; its Validate and Preview deployment + authenticated HTTP diagnostic are PASS (runs [40052984815](https://api.github.com/repos/chichute5500/Sindarealest-admin/actions/runs/40052984815), [40052984918](https://api.github.com/repos/chichute5500/Sindarealest-admin/actions/runs/40052984918)).
- GitHub compare from source/test SHA to current HEAD reports six commits ahead, zero behind; changed paths are handoff documentation only. The current deployed storefront source/test was not changed by those later handoff commits.
- Branch protection is not enabled for this branch; this is a review observation, not a request to change settings.

## Scope rules for this inventory

- **Storefront source**: only `public/index.html`, `public/404.html` and current public storefront assets are eligible for narrow, evidence-backed work. Existing owner PASS/LOCK items remain frozen.
- **Restricted**: Admin/backend/API/auth, migrations, catalog data, shared libraries or routing, deployment/config, Cloudflare Access/infrastructure, and live payment remain out of mutation scope without separate explicit approval.
- **Guarded**: Hero assets/visual evidence, workflows touching locked sections, screenshot capture, shared routing/config and Preview/deploy/access tooling must not be bypassed or dispatched blindly.
- **Tests/docs/workflows** are not automatically in-scope because they live in those directories; their target area and side effects govern the disposition.
- Table status/addition/deletion counts come from GitHub's live PR file-list API at review time. Categories are review dispositions, not statements that every hunk in a file has been manually proven safe.

## Summary by disposition

| Disposition | Files | Action |
|---|---:|---|
| ACCEPTED DESIGN REFERENCE — LOCKED | 5 | No runtime acceptance implied |
| ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE | 14 | Do not mutate/merge without scope-specific owner decision |
| BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED | 18 | Do not mutate/merge without scope-specific owner decision |
| BUILD / AUDIT TOOLING — REVIEW ONLY | 4 | Do not mutate/merge without scope-specific owner decision |
| CI WORKFLOW — ALLOWED VALIDATION GATE | 1 | Do not mutate/merge without scope-specific owner decision |
| DEPENDENCY / BUILD CONFIG — SCOPE-SENSITIVE | 1 | Do not mutate/merge without scope-specific owner decision |
| DOCUMENTATION / REFERENCE ARTIFACT | 14 | No runtime acceptance implied |
| HANDOFF / AUDIT DOCUMENTATION | 13 | No runtime acceptance implied |
| HERO-RELATED — OWNER PAUSE / GUARDED | 6 | Do not mutate/merge without scope-specific owner decision |
| MIGRATION VALIDATION TOOLING — RESTRICTED-DEPENDENCY | 1 | Do not mutate/merge without scope-specific owner decision |
| PAYMENT REFERENCE DOCUMENTATION — NOT RUNTIME AUTHORIZATION | 2 | No runtime acceptance implied |
| PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED | 9 | Do not mutate/merge without scope-specific owner decision |
| PREVIEW DEPLOY WORKFLOW — PREVIEW ONLY | 1 | Do not mutate/merge without scope-specific owner decision |
| SHARED ROUTING RUNTIME / CONFIG — GUARDED | 2 | Do not mutate/merge without scope-specific owner decision |
| SPECIAL / GUARDED WORKFLOW | 3 | Do not mutate/merge without scope-specific owner decision |
| STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE | 20 | Candidate only; preserve owner locks and require relevant evidence |
| STOREFRONT SEO FUNCTION — CURRENTLY PASS | 2 | Candidate only; preserve owner locks and require relevant evidence |
| STOREFRONT SKU CONTRACT TEST — DATA-COUPLED | 1 | Do not mutate/merge without scope-specific owner decision |
| STOREFRONT SOURCE — IN SCOPE | 1 | Candidate only; preserve owner locks and require relevant evidence |
| STOREFRONT SOURCE — IN SCOPE WITH LOCKS | 1 | Candidate only; preserve owner locks and require relevant evidence |
| STOREFRONT STATIC ASSET — ACCEPTED / LOCKED | 4 | Do not mutate/merge without scope-specific owner decision |
| VISUAL ARTIFACT — HERO-CONTAINING / GUARDED | 32 | No runtime acceptance implied |
| VISUAL ARTIFACT ARCHIVE — PRESERVE | 142 | No runtime acceptance implied |
| VISUAL CAPTURE TEST — GUARDED | 1 | Do not mutate/merge without scope-specific owner decision |

## Path-by-path inventory (298 paths)

| Path | Live PR diff | Scope classification |
|---|---|---|
| `.github/workflows/admin-preview-playwright.yml` | added (+39/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `.github/workflows/catalog-filter-preview-audit.yml` | added (+950/−0) | SPECIAL / GUARDED WORKFLOW |
| `.github/workflows/ci.yml` | modified (+19/−0) | CI WORKFLOW — ALLOWED VALIDATION GATE |
| `.github/workflows/deploy-storefront-preview.yml` | added (+82/−0) | PREVIEW DEPLOY WORKFLOW — PREVIEW ONLY |
| `.github/workflows/liquid-glass-visual-preview.yml` | added (+474/−0) | SPECIAL / GUARDED WORKFLOW |
| `.github/workflows/non-hero-preview-audit.yml` | added (+454/−0) | SPECIAL / GUARDED WORKFLOW |
| `.github/workflows/process-hero-presentation-image.yml` | added (+51/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `AUDIT-REPORT-2026-10-17.md` | modified (+7/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `INTEGRITY-REPORT.md` | modified (+4/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `README-DEPLOY.txt` | modified (+3/−1) | DOCUMENTATION / REFERENCE ARTIFACT |
| `README-INTEGRATED-VI.txt` | modified (+2/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `README-UPDATE.txt` | modified (+2/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `README.txt` | modified (+2/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `UPGRADE-REPORT.md` | modified (+4/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `data/legacy-products.json` | modified (+3819/−1) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `docs/ADMIN_PREVIEW_PROGRESS_2026-10-20.md` | added (+137/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/MASTER_PROMPT_HANDOFF_ADMIN_PREVIEW_2026-10-20.md` | added (+7/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md` | added (+1085/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/README.md` | added (+14/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/admin-mobile-reference.html` | added (+40/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/admin-mobile-reference.png` | added (+0/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/handoff/LATEST-STATUS.md` | added (+104/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/handoff/PROMPT-COMPLETENESS-AUDIT.md` | added (+30/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/handoff/START-HERE.md` | added (+98/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/handoff/latest-test-results.json` | added (+35/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/reference-instructions.md` | added (+19/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/admin-ui-reference/sindarealest-admin-mobile-reference.zip` | added (+0/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `docs/design-reference/README.md` | added (+33/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/design-reference/liquid-glass-product-filters.png` | added (+0/−0) | ACCEPTED DESIGN REFERENCE — LOCKED |
| `docs/handoff/CURRENT-STATE.md` | added (+985/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/DECISIONS.md` | added (+303/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/HANDOFF.md` | added (+17/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/LOCAL-FIXTURE-VISUAL-REVIEW.md` | added (+7/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PR-SCOPE-REVIEW.md` | added (+54/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PREVIEW-ACCESS-SETUP.md` | added (+99/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PROMPT-NEW-CHAT-FINAL-100.md` | added (+105/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md` | added (+123/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PROMPT-NEXT-CHAT-2026-10-23.md` | added (+755/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/PROMPT-NEXT-CHAT-2026-10-24.md` | added (+250/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md` | added (+121/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/TASKS.md` | added (+812/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/handoff/TEST-RESULTS.md` | added (+1000/−0) | HANDOFF / AUDIT DOCUMENTATION |
| `docs/icon-assets/Chitiet.png` | added (+0/−0) | ACCEPTED DESIGN REFERENCE — LOCKED |
| `docs/icon-assets/Icon.png` | added (+0/−0) | ACCEPTED DESIGN REFERENCE — LOCKED |
| `docs/icon-assets/README.md` | added (+57/−0) | ACCEPTED DESIGN REFERENCE — LOCKED |
| `docs/icon-system-inventory.md` | added (+275/−0) | ACCEPTED DESIGN REFERENCE — LOCKED |
| `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` | added (+164/−0) | PAYMENT REFERENCE DOCUMENTATION — NOT RUNTIME AUTHORIZATION |
| `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md` | added (+5/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/prompts/NEXT-CHAT-PROMPT.md` | added (+5/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/static-web-reference/README.md` | added (+59/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/static-web-reference/checkout-payment-flow-reference.png` | added (+0/−0) | PAYMENT REFERENCE DOCUMENTATION — NOT RUNTIME AUTHORIZATION |
| `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` | added (+0/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png` | added (+0/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/visual-audit-progress-2026-10-19.md` | added (+19/−0) | DOCUMENTATION / REFERENCE ARTIFACT |
| `docs/website-screenshots/README.md` | added (+25/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/.gitkeep` | added (+1/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/README.md` | added (+18/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/home-desktop-dark-1440x900-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-desktop-dark-1440x900-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-desktop-light-1440x900-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-desktop-light-1440x900-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-dark-360x800-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-dark-390x844-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-dark-390x844-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-light-360x800-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-light-390x844-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-mobile-light-390x844-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-tablet-dark-768x1024-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/home-tablet-light-768x1024-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/product-detail-direct-open-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-direct-open-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-direct-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-direct-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-from-grid-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-from-grid-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-from-grid-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-from-grid-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-after-reload-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-after-reload-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-after-reload-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-after-reload-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-direct-open-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-direct-open-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-direct-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-modal-direct-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-reload-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-reload-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-reload-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/product-detail-reload-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-benefits-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-benefits-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-benefits-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-benefits-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-collections-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-collections-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-collections-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-collections-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-contact-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-contact-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-contact-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-contact-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-featured-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-featured-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-featured-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-featured-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-footer-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-footer-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-footer-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-footer-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-hero-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/section-hero-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/section-hero-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/section-hero-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/end-of-work/section-order-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-order-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-order-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-order-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-products-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-products-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-products-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/section-products-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-account-menu-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-account-menu-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-account-menu-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-account-menu-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-cart-with-item-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-cart-with-item-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-cart-with-item-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-cart-with-item-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-checkout-form-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-checkout-form-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-checkout-form-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-checkout-form-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-fullscreen-gallery-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-fullscreen-gallery-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-menu-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-menu-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-order-expanded-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-order-expanded-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-order-expanded-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/end-of-work/state-order-expanded-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/manifest.json` | added (+4250/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/.gitkeep` | added (+1/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/README.md` | added (+18/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/home-desktop-dark-1440x900-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-desktop-dark-1440x900-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-desktop-light-1440x900-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-desktop-light-1440x900-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-dark-360x800-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-dark-390x844-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-dark-390x844-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-light-360x800-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-light-390x844-full-page.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-mobile-light-390x844-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-tablet-dark-768x1024-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/home-tablet-light-768x1024-viewport.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/product-detail-direct-open-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-direct-open-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-direct-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-direct-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-from-grid-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-from-grid-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-from-grid-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-from-grid-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-after-reload-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-after-reload-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-after-reload-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-after-reload-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-direct-open-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-direct-open-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-direct-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-modal-direct-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-reload-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-reload-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-reload-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/product-detail-reload-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-benefits-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-benefits-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-benefits-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-benefits-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-collections-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-collections-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-collections-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-collections-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-contact-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-contact-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-contact-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-contact-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-featured-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-featured-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-featured-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-featured-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-footer-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-footer-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-footer-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-footer-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-hero-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/section-hero-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/section-hero-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/section-hero-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT — HERO-CONTAINING / GUARDED |
| `docs/website-screenshots/start-of-work/section-order-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-order-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-order-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-order-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-products-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-products-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-products-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/section-products-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-account-menu-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-account-menu-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-account-menu-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-account-menu-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-cart-with-item-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-cart-with-item-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-cart-with-item-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-cart-with-item-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-checkout-form-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-checkout-form-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-checkout-form-viewport-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-checkout-form-viewport-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-fullscreen-gallery-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-fullscreen-gallery-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-menu-open-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-menu-open-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-order-expanded-desktop-dark-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-order-expanded-desktop-light-1440x900.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-order-expanded-mobile-dark-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `docs/website-screenshots/start-of-work/state-order-expanded-mobile-light-390x844.png` | added (+0/−0) | VISUAL ARTIFACT ARCHIVE — PRESERVE |
| `functions/_lib.js` | modified (+51/−9) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/_lib/watermark-settings.js` | modified (+12/−2) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/_middleware.js` | modified (+13/−9) | SHARED ROUTING RUNTIME / CONFIG — GUARDED |
| `functions/api/admin/backup.js` | modified (+5/−1) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/orders.js` | modified (+3/−2) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/products.js` | modified (+20/−14) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/products/[id].js` | modified (+2/−2) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/products/reset-skus.js` | modified (+22/−12) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/restore.js` | modified (+2/−1) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/settings.js` | modified (+12/−0) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/admin/warranties.js` | modified (+1/−1) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/orders.js` | modified (+15/−4) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/api/warranty-lookup.js` | modified (+2/−2) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `functions/robots.txt.js` | modified (+17/−2) | STOREFRONT SEO FUNCTION — CURRENTLY PASS |
| `functions/sitemap.xml.js` | modified (+18/−2) | STOREFRONT SEO FUNCTION — CURRENTLY PASS |
| `migrations/0008_product_sku_verification.sql` | added (+4/−0) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `package.json` | modified (+4/−1) | DEPENDENCY / BUILD CONFIG — SCOPE-SENSITIVE |
| `public/404.html` | added (+44/−0) | STOREFRONT SOURCE — IN SCOPE |
| `public/_redirects` | modified (+2/−1) | SHARED ROUTING RUNTIME / CONFIG — GUARDED |
| `public/admin/index.html` | modified (+11/−11) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `public/images/hero-upload/README.md` | added (+9/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `public/images/hero-upload/tb_image_share_1792519964514 (1).png` | added (+0/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `public/images/hero-upload/tb_image_share_1792519964514-blended.png` | added (+0/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `public/images/liquid-glass-dark-mobile.svg` | added (+69/−0) | STOREFRONT STATIC ASSET — ACCEPTED / LOCKED |
| `public/images/liquid-glass-dark.svg` | added (+69/−0) | STOREFRONT STATIC ASSET — ACCEPTED / LOCKED |
| `public/images/liquid-glass-light-mobile.svg` | added (+69/−0) | STOREFRONT STATIC ASSET — ACCEPTED / LOCKED |
| `public/images/liquid-glass-light.svg` | added (+69/−0) | STOREFRONT STATIC ASSET — ACCEPTED / LOCKED |
| `public/index.html` | modified (+2835/−226) | STOREFRONT SOURCE — IN SCOPE WITH LOCKS |
| `scripts/capture-cloudflare-preview.mjs` | added (+1857/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/capture-liquid-glass-preview.mjs` | added (+1476/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/check-migrations.mjs` | modified (+23/−1) | MIGRATION VALIDATION TOOLING — RESTRICTED-DEPENDENCY |
| `scripts/check-project.mjs` | modified (+10/−8) | BUILD / AUDIT TOOLING — REVIEW ONLY |
| `scripts/cloudflare-access-service-token.mjs` | added (+19/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/compare-website-screenshots.mjs` | added (+82/−0) | BUILD / AUDIT TOOLING — REVIEW ONLY |
| `scripts/deploy-cloudflare.mjs` | modified (+6/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/preview-external-read-allowlist.mjs` | added (+25/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/process-hero-edge.py` | added (+125/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `scripts/sanitize-audit-value.mjs` | added (+16/−0) | BUILD / AUDIT TOOLING — REVIEW ONLY |
| `scripts/setup-cloudflare.mjs` | modified (+24/−2) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/validate-cloudflare-preview-url.mjs` | added (+19/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/verify-cloudflare-preview-deployment.mjs` | added (+308/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/verify-preview-seo.mjs` | added (+118/−0) | PREVIEW / DEPLOY / ACCESS / CAPTURE TOOLING — GUARDED |
| `scripts/verify-screenshot-archive-coverage.mjs` | added (+49/−0) | BUILD / AUDIT TOOLING — REVIEW ONLY |
| `tests/admin-product-sku-race.test.mjs` | modified (+1/−0) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `tests/admin-upgrade.test.mjs` | modified (+3/−3) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `tests/benefit-tiles-responsive.test.mjs` | modified (+78/−84) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/cart-checkout-separation.test.mjs` | added (+218/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/config-integrity.test.mjs` | modified (+5/−3) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/detail-gallery-integrity.test.mjs` | modified (+62/−10) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/e2e/admin-preview.spec.js` | added (+142/−0) | ADMIN WORKSTREAM — OUT OF STOREFRONT SCOPE |
| `tests/gallery-transition-mobile-cart-badge.test.mjs` | added (+232/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/hero-product-sku.test.mjs` | added (+102/−0) | HERO-RELATED — OWNER PAUSE / GUARDED |
| `tests/mobile-navigation-contract.test.mjs` | added (+74/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/order-contact-isolation.test.mjs` | modified (+96/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/order-trust-layout.test.mjs` | modified (+9/−3) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/preview-seo-smoke.test.mjs` | added (+46/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/product-card-liquid-glass.test.mjs` | modified (+233/−1) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/product-route-canonical.test.mjs` | added (+109/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/reset-skus.test.mjs` | modified (+21/−2) | BACKEND / ADMIN / CATALOG / MIGRATION — RESTRICTED |
| `tests/robots-txt.test.mjs` | added (+43/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/sitemap-safety.test.mjs` | modified (+30/−6) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/sku-missing-data-contract.test.mjs` | added (+26/−0) | STOREFRONT SKU CONTRACT TEST — DATA-COUPLED |
| `tests/smoke.test.mjs` | modified (+19/−2) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/storefront-accessibility-contract.test.mjs` | added (+584/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/storefront-html-safety.test.mjs` | modified (+53/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/storefront-operations.test.mjs` | modified (+263/−18) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/storefront-payment-product-type-contract.test.mjs` | added (+84/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/storefront-reference-parity.test.mjs` | added (+422/−0) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/watermark-integrity.test.mjs` | modified (+19/−2) | STOREFRONT / CONTRACT TEST — REVIEW CANDIDATE |
| `tests/website-screenshot-capture.test.mjs` | added (+498/−0) | VISUAL CAPTURE TEST — GUARDED |

## Decision and current blockers

1. Do **not** merge PR #108 wholesale. The PR is not a storefront-only change: it includes restricted data/API/admin/migration paths, Hero-related artifacts, deployment/Access tooling, numerous admin references, screenshot archive content and broader docs.
2. No restricted path has been modified by this review. Do not automatically revert, cherry-pick, split, rebase, or rewrite any of them; seek owner decision for isolation/splitting before any merge.
3. The live list now reports 298 files (superseding historical 297). Source/test SHA `8a4cc606...` is the validated/deployed baseline. Keep that SHA distinct from docs-only branch HEAD `2f272f3a8a40438199b93cdd08a3046819f92aa8`.
4. The icon/design baselines and accepted storefront sections remain LOCKED. Hero-containing assets are classified from filenames only; no Hero pixels were opened or recaptured.
5. Current visual workflow status is **SKIPPED BY SAFETY GUARD**, not PASS. Gallery device acceptance remains **OWNER ACCEPTANCE REQUIRED**. The inventory does not clear either gate.

---

> **HISTORICAL SCOPE REVIEW — 2026-10-20.** File counts, reviewed SHA, branch-divergence numbers, workflow state and URLs in the body are historical and must not be reused as current facts. The review remains useful as a warning that PR #108 contains mixed storefront/Admin/backend scope; do not merge it wholesale. For current state use [CURRENT-STATE.md](CURRENT-STATE.md), for current tests/deploy evidence use [TEST-RESULTS.md](TEST-RESULTS.md). PR #108 must remain OPEN/unmerged; Preview only.\n\n# PR #108 scope review — static storefront audit

Checkpoint: 2026-10-20
Repository: `chichute5500/Sindarealest-admin`
Branch: `fix/liquid-glass-audit-2026-10-19`
Reviewed head: `99ccc93e441c594f279e64db53c71ba9253837c0`
PR: https://github.com/chichute5500/Sindarealest-admin/pull/108

## Decision

**Do not merge PR #108 wholesale.** It is a mixed-scope branch, not a storefront-only patch. The branch has 75 changed files and is diverged from `main` (362 commits ahead / 6 behind at this checkpoint). Source/test validation is green, but that does not establish that every change is safe to merge or that the live Preview UI is accepted.

No Production deployment or merge was performed.

## Current change inventory

| Group | Files | Review / disposition |
|---|---:|---|
| Public storefront | 1 — `public/index.html` (+736 / −155) | In scope for static storefront, but validate against live Preview screenshots before accepting visual changes. |
| Audit scripts, workflows and tests | 30 | Mixed. Keep only storefront-specific visual capture, route, accessibility, responsiveness and screenshot tooling after dependency review. Admin/backend/security tests are not automatically in scope merely because they run in CI. |
| General handoff/reference documentation | 25 | Mixed. Retain static storefront handoff, original visual references, screenshot manifest and relevant audit results. Move admin UI reference materials to a separate admin PR/workstream. |
| Admin UI | 1 — `public/admin/index.html` | Out of scope; separate PR. |
| Admin APIs/shared admin settings | 9 | Out of scope; separate PR. |
| Shared functions and public APIs | 5 | High coupling risk. `functions/_lib.js`, `functions/_middleware.js`, order/warranty APIs and sitemap changes must be reviewed for storefront route dependencies and any backend side effects before splitting. |
| Migration and product fixture data | 2 | Out of scope for a visual audit; separate data/backend review. |
| Other config/docs | 2 — `package.json`, `README-DEPLOY.txt` | Review each hunk. Do not include deploy or project configuration changes unless essential and explicitly approved. |

## Why a simple one-file cherry-pick is not safe yet

The storefront URL implementation depends on the Pages Functions route handling and product-category mapping. The current tests cover canonical product URLs and compare the duplicated category slug maps in `public/index.html` and `functions/_lib.js`. Taking only `public/index.html` could therefore ship links without the matching server-side routing behavior.

Conversely, bringing the shared middleware/functions into a storefront-only patch without reviewing all related hunks could also bring along admin/backend behavior. Split by dependency and reviewed diff, not by filename alone.

## Required gates before a merge decision

1. Make Preview accessible through a Preview-only Cloudflare Access Service Auth policy and GitHub Actions secrets `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`. Never put secret values in this repository or chat.
2. Run the visual workflow against the actual PR Preview, not only local fixtures. Capture 360×800, 390×844, 768×1024 and 1440×900 in both Light and Dark themes.
3. Validate canonical product URLs, legacy redirects, product detail, theme switching and core cart/navigation behavior against deployed Preview.
4. Compare real screenshots with the original Light/Dark PNG references and save authentic baseline/end images and a pixel-diff report.
5. Prepare a separate storefront-only PR from a clean base after reviewing dependency hunks. Keep admin UI/APIs, migrations, product fixture expansion and unrelated deploy changes out.
6. Re-run source validation and the relevant visual suite on the exact final PR head.

## Evidence at this checkpoint

- Source validation on current head before this documentation update: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/39369401049
- Route-map parity regression test: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368679776
- Local fixture visual workflow: PASS, but not live Preview — https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236
- Preview still returns `login_required`; no genuine Preview screenshots or viewport/theme checks are available.
- Production read-only probe showed legacy `/san-pham/{SKU}` routes returning product metadata, while tested new `/sanpham/{category}/{key}` routes returned homepage metadata. Do not change Production on this evidence alone; confirm route behavior on accessible Preview first.
- Admin Playwright failure is a separate admin workstream and is not treated as a storefront failure.

## Safety boundary

This review is documentation-only. It does not modify runtime code, admin/backend behavior, D1/R2, secrets, Cloudflare Access policy, or Production. It does not approve merging PR #108.

 
## DELTA FROM ORIGINAL 298-PATH INVENTORY — GALLERY AUDIT ADDED — 2026-10-24

The original complete 298-path review remains intact. Two additional paths were added specifically for the owner-authorized fullscreen-gallery verification work, bringing the live PR #108 changed-file count to 300:

1. scripts/audit-fullscreen-gallery-preview.mjs — read-only Playwright browser test restricted to the fullscreen product viewer, real Preview product gallery, counter correctness, decoded image state, and animation geometry.
2. .github/workflows/gallery-preview-audit.yml — runs the gallery-only audit on the authorized fix branch, first verifies Cloudflare Pages Preview deployment metadata and exact commit SHA, blocks same-origin non-GET/HEAD requests and unapproved cross-origin requests, and captures only #sdFullscreenViewer. It does not capture Hero or other locked sections and does not deploy Production.

Evidence for gallery audit SHA 9cdcdfc5096e6b5efd2e5f4c74520f8c8d6049a0: Validate PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058856463; Preview deploy PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058856516; isolated browser audit PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40058856458. The full-frame gallery code fix is in source commit 866acdb350a5ba665251ed4f8acb5c2875810e5.

This delta adds two test/evidence-only paths; it does not reduce the original out-of-scope/restricted-scope risks already recorded in the 298-path inventory. PR #108 remains OPEN/unmerged; do not merge or deploy Production based on this gallery pass.



## OWNER ACCEPTANCE UPDATE — FULLSCREEN GALLERY — 2026-10-24
- Owner phone acceptance is now **PASS** for fullscreen gallery flicker/ghosting, following the Preview implementation at SHA `e273cf46bb66b7b0a8a647dbe7582cddd3c19e87` and PASS results for validation https://github.com/chichute5500/Sindarealest-admin/actions/runs/40065150016, Preview deploy https://github.com/chichute5500/Sindarealest-admin/actions/runs/40065150047, and isolated Playwright audit https://github.com/chichute5500/Sindarealest-admin/actions/runs/40065149963.
- This closes the gallery visual-acceptance gate only; it does not alter the 300-path inventory or resolve the separate PR scope-disposition concerns. PR #108 remains OPEN/unmerged. No main/Production changes or reopening of other locked areas.


## HERO EXPERIMENT STATUS UPDATE — 2026-10-24 13:10 ICT
- Owner authorized a narrow Hero image composition experiment. It does not change the existing PR scope inventory or authorize other locked areas.
- Latest validation failure: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40067424485, `tests/storefront-reference-parity.test.mjs:186`. Latest Preview deploy failure: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40067424463. Isolated visual audit skipped: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40067424491.
- Status: Hero **IN PROGRESS / NOT PASS**. Fix test/source mismatch and obtain validation + Preview deploy + isolated visual audit before owner acceptance. Gallery remains owner PASS/LOCKED. PR #108 remains OPEN/unmerged; no main/Production changes.

## HERO AUDIT TOOLING / RESPONSIVE FIX — DELTA TO SCOPE INVENTORY — 2026-10-24
- PR #108 remains OPEN/unmerged against `main`. Live `changed_files` count after these authorized Hero audit changes is 302 (was 300 at the earlier gallery-only inventory); preserve the original 300-path review and account for the two new isolated Hero audit paths below. The broader PR scope-disposition/risk review remains unresolved and this does not approve a merge.
- New path `scripts/audit-hero-preview.mjs`: isolated Playwright audit limited to `#home`/Hero; validates actual Preview source SHA, the owner PNG and dimensions, visibility/status, contain geometry, actual PNG alpha silhouette against rendered Hero copy/CTA, horizontal overflow, console/page/network errors, and blocked same-origin writes; writes only Hero screenshots and JSON report as workflow artifacts.
- New path `.github/workflows/hero-preview-audit.yml`: push-triggered only on the authorized fix branch and scoped Hero/source/test paths; verifies exact Preview deployment metadata and only targets the approved non-production Preview alias. Same-origin requests are GET/HEAD only; unapproved external requests are blocked. No Production deployment.
- Responsive source change in `public/index.html` is limited to Hero image positioning/scale: mobile 122% with no negative offset; tablet 761–1000px 113%, max-height 540px, no negative offset. PNG bytes/source color remain unchanged, `object-fit:contain` stays, no SKU/backend/catalog association is created. Regression checks were updated/strengthened, not deleted.
- Exact source/test SHA `500ccf80bb54c5ff92171809cff24faf130c695e`: Validate PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070840812; Preview deploy PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070840864; isolated Hero audit PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070840821; screenshots/report https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070840821/artifacts/12551645366.
- A pre-existing read-only gallery audit was automatically triggered by the shared `public/index.html` path filter during the Hero CSS commit; run https://github.com/chichute5500/Sindarealest-admin/actions/runs/40070751720 completed PASS. No gallery files/source were edited. Avoid intentionally re-running it; gallery remains owner PASS/LOCKED.
- Hero automated checks pass, but physical-phone owner visual acceptance is still pending. No main/Production changes or merge; existing scope inventory and outstanding separate PR review decisions still block any claim of total project/PR completion.


## HERO FINAL DELTA — EXACT-SHA PASS / REFERENCE ACCEPTANCE PENDING — 2026-10-24
- Latest verified source/test/Preview SHA `81abc218535b53f151c2d4d54758ec04d5413ff7`: Validate PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40076645894; deploy PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40076645870; Hero audit PASS https://github.com/chichute5500/Sindarealest-admin/actions/runs/40076645892; screenshot/report artifact https://github.com/chichute5500/Sindarealest-admin/actions/runs/40076645892/artifacts/12552544647.
- Original raw owner PNG is used directly. This update removes the dependency on the deleted `*-blended.png` and fixes stale test pin/CSS contracts. The PNG asset itself was not modified; alpha channel is decoded and verified in CI/browser.
- Audit now checks 10 combinations, with every combination passing and zero copy overlap, console/page/relevant network/write errors.
- This does not change the existing 302-file scope inventory or authorize merge. PR #108 remains OPEN/unmerged; no main/Production changes. Gallery source untouched.
- Exact named reference `a_clean_high_end_e_commerce_mobile_app_ui_screens.png` is still unavailable, so exact reference parity is NOT VERIFIED. Physical-phone acceptance is still required. Other PR scope-disposition blockers remain; no claim of global 100% completion.
