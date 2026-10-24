# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub repository `chichute5500/Sindarealest-admin`. Do not ask the user to repeat context. Verify live state first and continue useful work after reporting.

## Live verified checkpoint — 2026-10-24 09:30 UTC

- Writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- Current branch HEAD: `fb12af89a15f3bb901a2ae34c9c96dedb2dd3b94` (documentation-only update to current-status.json).
- Latest source/test SHA: `cf340b686e0974ac5602b6ef4594c00e477c8932` — cancellation race guard for order-item writes.
- Validate #5688 PASS on source/test SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623892
- Admin Preview Playwright #1077 PASS on the same source/test SHA: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623888
- PR #111 OPEN/unmerged; do not merge, rebase, cherry-pick, or force-push. Write only to the feature branch. PR #108/#112 and storefront/main are read-only.
- Recent fix: order cancellation's order-item updates now also guard against a pending QR payment request, avoiding a partial state where cancellation is rejected but item writes might proceed. Test/Validate and Preview Playwright pass at exact SHA `cf340b686e0974ac5602b6ef4594c00e477c8932`.

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

## Next actions — continue without asking the user

1. Refresh PR #111, branch HEAD, main, and Actions after any new commits.
2. Parallel stream A: continue read-only payment/order/warranty concurrency review, including cancellation/payment-request/receipt idempotency and warranty issuance gates. Change source only after a new reproducible defect and regression.
3. Parallel stream B: obtain valid screenshots on the latest source SHA and compare all 12 screens against the approved reference at matching viewports/themes. Do not claim parity from synthetic fixture artifacts alone.
4. Parallel stream C: audit workflow/PR isolation and exact-HEAD guard; do not dispatch a deployment or touch remote state.
5. After verified progress, update `START-HERE.md`, this prompt, `LATEST-STATUS.md`, `current-status.json`, `latest-test-results.json`, and the screen audit. Keep source/test SHA separate from documentation-only HEAD.

**Canonical entry point:** `docs/admin-ui-reference/handoff/START-HERE.md`
