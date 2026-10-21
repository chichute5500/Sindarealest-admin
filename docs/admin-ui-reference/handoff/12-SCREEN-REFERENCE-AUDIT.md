# Admin 12-screen reference audit matrix

Updated: 2026-10-21 (ICT)  
Branch: `feature/admin-isolated-handoff-2026-10-20`  
Overall Admin progress: **48%** — unchanged until evidence supports a meaningful increase.

## Evidence rules

- **PASS** means the screen was compared with the approved reference and has direct screenshot/test evidence.
- **PARTIAL** means a narrow source/fixture check passed but full reference parity is not accepted.
- **BLOCKED** means an external prerequisite prevents verification.
- **NOT TESTED** means no valid acceptance evidence is recorded.
- Synthetic fixture screenshots are not real product-data or authenticated-backend acceptance.
- Do not mark any screen PASS solely because `npm test` passes.

## Matrix

| # | Screen family | Status | Evidence / gap |
|---:|---|---|---|
| 1 | Login / unauthenticated shell | PARTIAL | Local Playwright previously checked login shell and masked password with mocked APIs; current approved-reference comparison not accepted. |
| 2 | Dashboard / summary | PARTIAL | Revenue panel has truthful no-data state; source and Preview diagnostic passed on exact SHA `06d689b6a97fa7bdb05258acb8435a6954d67309`. Not authenticated real-data QA. |
| 3 | Product list / search / filters | NOT TESTED | Need approved-reference comparison and screenshot evidence at mobile and desktop sizes. |
| 4 | Product editor / core fields | NOT TESTED | Need full field layout, focus order, validation, and reference comparison. |
| 5 | Product image gallery / image manager | PARTIAL | Horizontal thumbnail rail, prominent cover, responsive/light-dark fixture captures and last-thumbnail clearance passed on prior exact test tree `78a16b6d9fca91d7b080834f293e1690dc7c10cd`; synthetic images only, not real R2 photos or image-save proof. |
| 6 | Category / product classification | NOT TESTED | Need screen-level reference and safe fixture coverage. |
| 7 | Orders / fulfillment | NOT TESTED | Source-contract tests exist; authenticated end-to-end business flow not tested. |
| 8 | Payment QR / payment requests / ledger | PARTIAL | Read-only source audit and mocked-D1 contract tests only; no live backend proof. |
| 9 | Customers / customer details | NOT TESTED | Need approved-reference comparison and safe fixture evidence. |
| 10 | Warranty / after-sales | NOT TESTED | Need approved-reference comparison and safe fixture evidence. |
| 11 | AI image review / grouping | NOT TESTED | Do not infer live model success from mocked tests; previous live AI test was blocked by provider daily quota. |
| 12 | Backup / restore / settings / responsive navigation | NOT TESTED | Need screen-by-screen evidence; no remote restore or data mutation during audit. |

## Cross-cutting checks

| Check | Status | Notes |
|---|---|---|
| Light/dark themes | PARTIAL | Fixture/screenshot checks exist; complete reference parity is not accepted. |
| Narrow Android viewport / horizontal overflow | PARTIAL | Prior screenshot matrix included 390px width; repeat on current code SHA before accepting. |
| Keyboard / focus / accessible names | NOT TESTED | Inspect and test controls screen-by-screen. |
| `prefers-reduced-motion` | IMPLEMENTED; BROWSER E2E NOT VERIFIED | Test added in `tests/e2e/admin-static-baseline.spec.js`; recorded source validation did not run this Playwright browser suite. Require an exact-SHA run that executes the E2E suite. |
| Authenticated real backend | BLOCKED / NOT TESTED | Do not change Access or secrets to work around this. |
| Product image upload/save | DEFERRED_BY_OWNER | Do not resume without explicit owner authorization. |
| PRE/PRO migration | DEFERRED_BY_OWNER | Do not inspect remote schema through writes or execute migration/setup scripts. |

## Next execution order

1. Re-fetch current branch HEAD and exact-SHA Actions results; do not reuse old green runs as proof for newer code.
2. Obtain and compare the actual approved reference for screen family #5 and complete a focused gallery/accessibility audit using screenshots that are genuinely accessible.
3. Ensure the reduced-motion Playwright test runs in a workflow that executes `tests/e2e/admin-static-baseline.spec.js`; record the exact tested SHA and actual browser result.
4. Continue one screen family per iteration, with screenshot evidence and targeted ADMIN-only changes.
5. Update this matrix and handoff status only after verifying results.

## Safety boundaries

Only write to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and #108 open/unmerged. No edits to `main` or the static website branch; no merge/cherry-pick/force-push; no Production deploy; no secrets/Cloudflare Access changes or bypass; no remote D1/R2 writes; no SQL/migration/setup script execution; no TinyFish.
