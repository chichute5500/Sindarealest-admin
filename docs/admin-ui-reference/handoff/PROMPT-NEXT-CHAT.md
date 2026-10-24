# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub repository `chichute5500/Sindarealest-admin`. Do not ask the user to repeat context. Verify live state first and continue useful work after reporting.

## Live checkpoint — 2026-10-24 10:00 UTC (refreshed)

- Writable branch: `feature/admin-isolated-handoff-2026-10-20`. Source/test checkpoint SHA: `66bdd5e0ba5f41daa1de49c46f485e5042edb831`; this handoff refresh is a docs-only commit following that SHA, so refresh live HEAD before subsequent writes.
- PR #111 remains OPEN/unmerged. Do not merge, rebase, cherry-pick, or force-push. Live `main` ref at this checkpoint: `227622d3e3b7c75724ffa1775b193da71089269a`.
- Validate #5758 PASS on exact source/test SHA `66bdd5e0ba5f41daa1de49c46f485e5042edb831`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084040238
- Admin Preview Playwright #1108 PASS on the same SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084040292
- Admin Preview diagnostic #535 PASS on the same SHA; authenticated read-only routes 7/7, product catalog 235 rows, 527 image URLs decoded, zero mutation requests, and exact branch HEAD guard PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565
- Screenshot/evidence artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565/artifacts/12556296498. 16 real source login captures across 8 viewport sizes and 2 themes; 120 synthetic UI-fixture screenshot entries/112 metrics. Reference parity remains NOT_VERIFIED because fixture screenshots use synthetic data and are not pixel-equivalent accepted screen captures.
- QR receiver-rotation race: test-first red run #5756 (201 instead of 409) followed by SQL guard fix; regression passes in Validate #5758.
- Acceptance remains 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated business-write QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
- **Next:** fetch live state; continue screen-by-screen approved-reference review and read-only payment/order/warranty review. Source changes still require a new reproducible defect, regression first, then exact-SHA Validate + Preview evidence.

## Mandatory seven operating rules

1. Parallelize independent, safe workstreams.
2. Report verified results, then continue; do not stop merely because a report was sent.
3. If blocked, record evidence and switch to another useful stream instead of repeating the same failed path without new evidence.
4. Test-first: reproduce a concrete defect, add a regression test, then patch and verify.
5. Tie every result to an exact SHA; distinguish fixtures/read-only GETs from authenticated business-write QA.
6. Stop only when an actual account-owner action is required; never ask for a nonexistent “Run workflow” button.
7. Preserve isolation: only write to the feature branch; no merge/rebase/cherry-pick/force-push, no edits to main/storefront or PR #108/#112, PR #111 stays open/unmerged; no Production deploy, remote D1/R2 writes, schema/migration/ledger writes, secrets, Cloudflare Access/DNS changes, Access bypass, or fake commits.

## Acceptance boundary — unchanged

- Progress: **50% PROVISIONAL**.
- All 12 screens: **PARTIAL_NOT_ACCEPTED**.
- Approved-reference parity: **NOT_VERIFIED**.
- Authenticated business-write/persistence QA: **NOT_TESTED**.
- Remote Preview D1 schema/ledger: **NOT_VERIFIED**.
- Production: **NOT_PERFORMED**.
- Historical read-only diagnostics and synthetic fixture screenshots must not be attributed to current HEAD unless exact-SHA evidence supports it.

## Latest verified CI — 2026-10-24 10:00 UTC

- Validate #5758 PASS on exact source/test SHA `66bdd5e0ba5f41daa1de49c46f485e5042edb831`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084040238
- Admin Preview Playwright #1108 PASS on the same SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084040292
- Admin Preview diagnostic #535 PASS on the same SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565; evidence artifact https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565/artifacts/12556296498. Source screenshot matrix, remote login/dashboard/catalog check, 7 read-only endpoint checks and exact-HEAD guard all passed.
- Validate #5756 on test-only commit `de95760eafc4740ffb20a66b283b71b2c57290b7` failed as intended: regression reproduced the stale-QR race (actual 201; expected 409). The fix is present in `66bdd5e0ba5f41daa1de49c46f485e5042edb831` and passed Validate.
- Do not describe read-only GET results or synthetic fixtures as business-write/persistence QA.

## Next actions — continue without asking the user

1. Refresh live PR #111, branch HEAD, `main`, and Actions after this docs-only commit; preserve PR #111 OPEN/unmerged.
2. Continue approved-reference review for all 12 screens at matching viewport/theme. Use artifact https://github.com/chichute5500/Sindarealest-admin/actions/runs/40084037565/artifacts/12556296498; fixtures do not count as acceptance, and parity remains NOT_VERIFIED.
3. Continue read-only payment/order/warranty race review. Reproduce a new concrete defect and add regression test before any source change.
4. Maintain the boundary: authenticated business-write/persistence QA NOT_TESTED; remote Preview D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED. Never touch remote writes/secrets/Access/DNS or dispatch a deployment.

**Canonical entry point:** `docs/admin-ui-reference/handoff/START-HERE.md`.
