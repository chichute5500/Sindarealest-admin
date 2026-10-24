# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue directly on GitHub repository `chichute5500/Sindarealest-admin`. Do not ask the user to repeat context. Read this handoff, verify live state, then start useful work immediately and keep working after reports.

## Current verified state (2026-10-24 09:00 UTC)

- Writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- Branch HEAD: `d5f4b06a28d0a682891580b5e646a3bc064fd68a` (documentation-only handoff sync).
- Latest application/source-test SHA: `0469930f6836d5f8d87b155a538e1d68776e3913`.
- Validate #5666 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40080139131
- Admin Preview Playwright #1070 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40080139090
- PR #111 OPEN, unmerged; GitHub `mergeable=true`, `mergeable_state=clean`. Do not merge.
- Branch comparison: 1,675 commits ahead and 7 behind `main`; no rebase/merge allowed.
- QR upload atomicity fix passed test-first regression: pending QR pointer + audit row in one D1 batch; failure cleans only newly staged R2 object.
- Feature-only deployment workflow is `.github/workflows/deploy-admin-isolated-preview.yml`, pinned to `sindarealest-admin-preview` and exact feature branch.
- Feature-only E2E spec is `tests/e2e/admin-isolated-preview.spec.js`; diagnostics workflow invokes it. Do not change shared `main` workflow/spec.

## Mandatory rules (all seven)

1. Parallelize independent safe streams.
2. Report verified results, then continue work; never stop just because a report was sent.
3. For blockers, provide evidence and switch to another useful stream; do not repeat the same failed path without new evidence.
4. Test-first: reproduce a concrete defect, add/run regression, then patch.
5. Tie every result to exact SHA; distinguish local fixtures/read-only GET from authenticated business-write QA.
6. Stop only for actual account-owner action. Never ask for a nonexistent “Run workflow” button.
7. Preserve isolation and safety: only write to the feature branch; no merge/rebase/cherry-pick/force-push; no edits to `main`/storefront, PR #108/#112; PR #111 remains open/unmerged; no Production deploy, remote D1/R2 writes, schema/migration/ledger writes, secrets, Cloudflare Access or DNS changes, Access bypass, fake commits.

## Acceptance boundary

Progress 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; approved-reference parity NOT_VERIFIED; authenticated business-write QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED. Do not inflate these statuses from unit tests, fixtures, or read-only API checks. Prior diagnostic on an older SHA showed 7/7 read-only Admin routes HTTP 200, 235 products and 527 decoded image URLs; do not attribute it to current HEAD without a new run.

## Start now

1. Refresh branch HEAD, PR #111/#108/#112, `main`, and latest Actions before any claims.
2. Run parallel read-only audits: (A) order/payment/warranty concurrency/error paths; (B) reference-driven UI comparison using the newest valid screenshot artifact; (C) PR workflow/check isolation.
3. Patch only a proven defect, test-first, then run Validate + Preview on exact same source/test SHA and verify exact-HEAD guard.
4. Update this prompt and `START-HERE.md` after new verified evidence. Keep the user informed briefly, then continue working unless a real user action is required.

**Start-here file:** `docs/admin-ui-reference/handoff/START-HERE.md`


## Latest verified continuation — 2026-10-24 09:24 UTC

- Branch HEAD/source-test SHA: `cf340b686e0974ac5602b6ef4594c00e477c8932`.
- PR #111 OPEN/unmerged; mergeable=true. Do not merge/rebase.
- Validate #5688 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623892
- Admin Preview Playwright #1077 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40081623888
- Payment/order/warranty concurrency read-only review completed for this pass; no additional reproducible defect established. Regression suite explicitly covers QR request/order cancellation races, verified receipt/refund constraints, duplicate warranty issuance and stale completion state.
- Visual evidence remains old source SHA `e55088d89632ff84ec68715cdee3ef64c1a9e964`, synthetic fixture-only; latest run did not expose a screenshot artifact through the artifact listing. Therefore reference parity is NOT_VERIFIED and all 12 screens remain PARTIAL_NOT_ACCEPTED.
- Progress stays 50% PROVISIONAL; authenticated business-write QA NOT_TESTED; remote D1 schema/ledger NOT_VERIFIED; Production NOT_PERFORMED.
- Continue: obtain latest-HEAD screenshot artifact or run approved non-mutating visual diagnostics, compare each screen/viewport/theme directly to reference, then investigate any new concrete concurrency failure. Do not deploy or perform remote writes.
