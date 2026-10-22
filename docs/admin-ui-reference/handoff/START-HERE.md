# START HERE — SINDAREALEST ADMIN

**Code/test SHA before this handoff-only commit:** `326526f8f74172ae0aea7fa37739c9a8e8f513ec`  
**Progress:** 50% PROVISIONAL. Source/unit CI is green; current Playwright is pending.

## Current refs
- [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111): OPEN/unmerged, `feature/admin-isolated-handoff-2026-10-20`.
- [PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108): OPEN/unmerged, protected website branch, latest observed head `32c4aa52e03e8917b930ff13d9775215e2876f62`; read-only.
- The handoff commit advances ADMIN HEAD but does not change the code SHA tested below. Fetch live refs at session start.

## Actions
- [Validate #39804852564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852564): SUCCESS on `326526f8...`; dependency audit, `npm run check`, `npm test` passed.
- [Preview #39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604): PENDING; no job/artifact at last poll.
- [Older blocker #39802525217](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39802525217): in progress at Chromium installation on old SHA `920f53d...`. Poll existing run; don't dispatch duplicates.

## Product fix delivered
- `e11ec06cd5870522735a28205b678897de829361`: Customers/Warranty endpoint failure or malformed response now renders an explicit error and GET-only retry.
- `326526f8f74172ae0aea7fa37739c9a8e8f513ec`: synthetic HTTP 503→retry→GET fixture recovery test, authored but not yet run.

## Read these live files
1. `docs/admin-ui-reference/handoff/current-status.json`
2. `docs/admin-ui-reference/handoff/latest-test-results.json`
3. `docs/admin-ui-reference/handoff/LATEST-STATUS.md`
4. `docs/admin-ui-reference/handoff/12-SCREEN-REFERENCE-AUDIT.md`
5. `docs/admin-ui-reference/handoff/PR-111-SCOPE-AUDIT.md`
6. `docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md`

## Next actions
Poll existing Preview runs; review screens #8 Customers, #9 Warranty/support, #10 Settings, #11 Backup/Restore and #12 Activity log against the approved reference at matching viewport/theme. Continue PR provenance review.

## Guardrails
- Only write ADMIN branch. Keep #111/#108 open/unmerged.
- No main/static edits, Production deploy, Access bypass, secrets, setup/deploy/migration or remote D1/R2 operations.
- No fake business data/API contracts. PASS requires exact SHA and logs/artifact; pending/no job is not PASS.
