# SinDarealest PR #159 — Main integration matrix (read-only), 01/11/2026

Source comparison: `main` `9fce1a85c9c19620a8269cce80575cdc92d9919c` vs audit source `ee1da987f878cd477bf16f1af8a72d6957a05ba4`. PR #159 OPEN/DRAFT, mergeable=false at comparison. Main is **not** modified. This matrix is NOT a merge, rebase or permission to release.

## Overlap summary

At merge base `cca1ff9be2ab7de4d89702f6dabf80d9bf3c7657`, 20 files were changed by both branches; **11 are identical blobs** in the resulting tips: `.github/copilot-instructions.md`; `functions/api/admin/{audit-logs,orders,products}.js`; D1 migrations `0015`, `0016`, `0017`; `tests/{admin-audit-revision,admin-products-revision,d1-rows-read-regression}.test.mjs`; `tests/fixtures/d1-admin-orders-original.sql`. No replacement is needed for those.

Nine tip blobs are different. This list records content overlaps, **not nine guaranteed textual merge conflicts**:

| Path | Safe integration choice, after Owner PASS only |
| --- | --- |
| `public/admin/index.html` | **Keep Main**: newer Admin Liquid Glass / Owner PASS from parallel PRs; never overwrite with audit branch's older Admin. |
| `tests/admin-mobile-refresh-contract.test.mjs` | Keep newer Main performance/refresh checks; union only independent audit assertions that still apply to Main implementation. |
| `docs/qa/ADMIN_D1_REVISION_PLAYWRIGHT_RERUN_2026-11-01.md` | Keep Main's PR #154 handoff. Audit doc has the same path for PR #159; preserve separately with a distinct filename if that historical record is needed. |
| `AGENTS.md` | Keep Main wording indicating policy already Owner-approved on Main. Audit text still incorrectly says not integrated. |
| `docs/QA_RESOURCE_POLICY.md` | Keep Main active/Owner-approved status. Do not revert governance due to audit branch age. |
| `.github/workflows/deploy.yml` | Preserve Main's approved QA-policy-only paths-ignore and production guards; manually carry over any still-relevant audit safety checks if missing. DO NOT run deployment or migrations while reconciling. |
| `.github/workflows/qa-resource-policy.yml` | Union appropriate Main broader trigger coverage with narrow audit candidate-marker exception; keep concurrency/resource guard intact. |
| `scripts/qa-resource-guard.mjs` | Main handles generic safety. Include the tightly scoped `AUDIT_AFTER_DISPATCH_20261101.trigger` exemption only if the corresponding audit QA workflow remains; reject broad push-triggered remote QA. |
| `package.json` | Form a **union** of test commands. Main has Admin Liquid Glass and latest Admin checks; audit has catalog SSR, security and read-only storefront regressions. Never replace one script wholesale with the other. |

## Merge gate / verification plan

1. Freeze a **single** accepted candidate; obtain Owner approval for mobile visual, Welcome, and release first.
2. Integrate with a controlled conflict-resolution step **outside Main**; preserve approved Main Admin/Cloudflare deployment. No automatic wholesale rebase that replaces Main Admin.
3. On integrated tree run `npm run check`, `npm test`, mocked checkout, SSR/SEO/canonical, mobile Light/Dark and Main Admin regressions; only then one exact-SHA Preview verification.
4. Verify no D1 migration is reapplied and no Production R2/D1 writes are introduced.
5. Request a **separate** explicit permission for Main merge/Production deploy. Do not treat earlier audit Preview PASS as Owner PASS.

## Residual blockers

Real Xiaomi 15 Ultra Owner QA; Google OAuth test account; phone ownership verification requirements; non-Production payment sandbox; responsive R2 media thumbnails need authorized design/space, not a speculative production mutation. Mobile catalog LCP remains ~6 seconds under Lighthouse even after current code-side optimizations.
\n## Catalog candidate d491e3ef status\nPixel-identical 10 fullpage catalog screenshots Light/Dark 360/390/768/1280/1920 versus ee1da987; separate Preview full QA `41299050750` PASS. Catalog mobile LCP 6027.57 -> 5575.39ms; before further media transformation, obtain explicit permission to create Preview-R2-only derived thumbnails, never alter originals or Production.\n

## 2026-11-01 low-risk Main alignment update
At audit commit \`0d470a49\`, four overlapping policy/deployment guard paths became **exact copies of the current Main versions**: \`AGENTS.md\`, \`docs/QA_RESOURCE_POLICY.md\`, \`.github/workflows/qa-resource-policy.yml\`, \`.github/workflows/deploy.yml\`. This reduces future conflict risk without changing Main, Admin or Production. Keep other divergences until compatible integration is validated.
