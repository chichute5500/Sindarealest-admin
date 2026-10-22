# Instructions for AI: use the ADMIN UI reference

**Single entry point:** [START-HERE.md](handoff/START-HERE.md). Fetch live HEAD, PR #111/#108 and Actions before work; the SHA below is historical evidence.

Live status source: `docs/admin-ui-reference/handoff/current-status.json`. Single entry point: `docs/admin-ui-reference/handoff/START-HERE.md`. Fetch PR/HEAD/Actions live before writing; SHAs in these docs are historical checkpoints.

Open `docs/admin-ui-reference/admin-mobile-reference.png` before editing. Preserve business logic, auth and API contracts. Record exact screenshot names, viewport and theme.

## Screen mapping
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log.

## Requirements
- Mobile-first Liquid Glass; light/dark; Vietnamese; accessible focus/names/keyboard; no clipping/overlap.
- Unknown product images/price/stock remain unknown. Fixture placeholders must not become product data.
- Last successful source/UI matrix: [run #39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346), SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`. It passed source/fixture checks but does not prove per-screen visual acceptance or authenticated backend flows.
- Gallery has a featured cover slot and horizontal thumbnail rail in source; no concrete defect was confirmed in the reviewed synthetic fixture screenshot.
- Live scope verification at the 2026-10-23 checkpoint: `public/index.html` is absent from PR #111's changed-file list, while `public/admin/index.html` remains the ADMIN UI source. Re-check the live PR file list before acting; never edit the static website branch from ADMIN.
- Both setup/deploy script sources include 0009 preflight, but no remote D1 schema was checked. Do not run scripts.

No merge, main/static edits, Production deployment, Access bypass, secrets, remote D1/R2, or setup/migration/deploy execution. See handoff current-status, 12-screen audit and scope audit.


## Handoff integrity checkpoint — 2026-10-23
The regression test added to `tests/handoff-integrity.test.mjs` found a genuine missing explicit link from START-HERE to PROMPT-NEXT-CHAT at SHA `7a60099f96bb0be4f68dbda47fbec9c10df44390`; Validate #39820101711 and Preview #39820105048 failed at automated tests before Playwright ran. This handoff sync adds the missing direct link. Re-fetch Actions on the resulting branch HEAD before recording PASS. The approved reference image could not be rendered by the current inspection tool, so exact reference parity is NOT_VERIFIED.
