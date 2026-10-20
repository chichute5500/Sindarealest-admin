# PR #108 scope review — static storefront audit

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
