# Instructions for AI: use the ADMIN UI reference

Live status: `docs/admin-ui-reference/handoff/current-status.json`. Prior long-form reference instructions archived at `docs/admin-ui-reference/handoff/history/legacy-2026-10-22/reference-instructions.md`. Parent HEAD at consolidation: `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e`; refetch HEAD/PR before writes.

Open `docs/admin-ui-reference/admin-mobile-reference.png` before editing a screen. The poster is the visual standard; preserve business behavior and API contracts. Record reference and result screenshot paths.

## Official numbering
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log.

Classification belongs to #3/#4. AI review/grouping is a separate feature and BLOCKED until route, controls, API and behavior are approved.

## Requirements
- Mobile-first Liquid Glass, light/dark, Vietnamese text, accessible focus/names, no clipping or overlap.
- Inspect actual source and API/data flows; preserve authentication and contracts.
- Unknown product images/price/stock remain unknown. Don't fabricate data to mimic examples.
- Compare at matching viewport/theme. Record only combinations truly tested. Fixtures demonstrate fixture behavior only.
- No merge, main/static edit, Production deployment, Access bypass/secrets, or remote D1/R2/migration operation.

See `handoff/current-status.json`, `handoff/12-SCREEN-REFERENCE-AUDIT.md` and `handoff/PROMPT-NEXT-CHAT.md`.
