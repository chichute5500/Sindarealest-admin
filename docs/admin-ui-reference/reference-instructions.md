# Instructions for AI: use the ADMIN UI reference

Live status source: `docs/admin-ui-reference/handoff/current-status.json`. Single entry point: `docs/admin-ui-reference/handoff/START-HERE.md`. Fetch PR/HEAD/Actions live before writing; SHAs in these docs are historical checkpoints.

Open `docs/admin-ui-reference/admin-mobile-reference.png` before editing. Preserve business logic, auth and API contracts. Record exact screenshot names, viewport and theme.

## Screen mapping
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log.

## Requirements
- Mobile-first Liquid Glass; light/dark; Vietnamese; accessible focus/names/keyboard; no clipping/overlap.
- Unknown product images/price/stock remain unknown. Fixture placeholders must not become product data.
- Latest source/test matrix: [run #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576), SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`. It passed source/fixture checks but does not prove per-screen visual acceptance or authenticated backend flows.
- Gallery has a featured cover slot and horizontal thumbnail rail in source; no concrete defect was confirmed in the reviewed synthetic fixture screenshot.
- PR #111 includes cross-scope `public/index.html` which differs from main and static PR #108; do not edit the static version from this branch.
- Both setup/deploy script sources include 0009 preflight, but no remote D1 schema was checked. Do not run scripts.

No merge, main/static edits, Production deployment, Access bypass, secrets, remote D1/R2, or setup/migration/deploy execution. See handoff current-status, 12-screen audit and scope audit.
