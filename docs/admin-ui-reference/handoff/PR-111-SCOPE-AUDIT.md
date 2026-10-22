# PR #111 SCOPE / PROVENANCE AUDIT

**Code/test checkpoint before handoff-only commit:** `326526f8f74172ae0aea7fa37739c9a8e8f513ec`  
**PR #111 / #108:** both OPEN, unmerged. Full per-path provenance remains PARTIAL.

## Current census

| Path group | Count |
|---|---:|
| `.github/` | 2 |
| `README-DEPLOY.txt` | 1 |
| `data/` | 1 |
| `docs/` | 1,241 |
| `functions/` | 24 |
| `migrations/` | 2 |
| `package.json` | 1 |
| `public/` | 2 |
| `scripts/` | 5 |
| `tests/` | 25 |
| **Total** | **1,304** |

Extensions: PNG 913, MD 168, JSON 160, MJS 28, JS 26, HTML 3, YML 2, SQL 2, TXT 1, ZIP 1.

## Branch comparison
- ADMIN code/test checkpoint: `326526f8f74172ae0aea7fa37739c9a8e8f513ec`.
- Protected website PR #108 HEAD at last read: `32c4aa52e03e8917b930ff13d9775215e2876f62`; always re-fetch because it is actively changing.
- Relation: `diverged`; ADMIN ahead 978, website ahead 957; merge base `a3834fed3eb1c012b188d7c95d14ec3d15e3969f` ([compare](https://github.com/chichute5500/Sindarealest-admin/compare/32c4aa52e03e8917b930ff13d9775215e2876f62...326526f8f74172ae0aea7fa37739c9a8e8f513ec)).
- Never merge, rebase, cherry-pick or cross-write.

## Blob provenance spot-check

| Path | ADMIN blob | Finding |
|---|---|---|
| `public/index.html` | `bb0ae30ecb06319eb87e5725ad47fda82595eeb8` | Equals ADMIN merge-base blob; static current blob `648d4af...`, main current blob `1e93623...`. Inherited unchanged on ADMIN; don't blind-revert/copy. |
| `.github/workflows/liquid-glass-visual-preview.yml` | `f76f28fe57db2d990f1767770addd908fcf6581d` | Equals ADMIN merge-base blob; static later blob `76cddc9...`. Inherited unchanged. |
| `scripts/setup-cloudflare.mjs` | `ec1c614048b84657ef8824d865dda42f0c8341fe` | ADMIN-specific; can run remote migrations 0001 and 0003–0008 before 0009 preflight. **DO NOT RUN.** |
| `scripts/deploy-cloudflare.mjs` | `9a1e30c770527f27f20210b9ceb98ca25244f771` | ADMIN-specific preflight changes. **DO NOT RUN** here. |

Spot-checks don't establish provenance for all 1,304 paths.

## Actions
- [Validate #39804852564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852564): SUCCESS on `326526f8...`; dependency audit, `npm run check`, `npm test` passed.
- [Preview #39804852604](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604): PENDING, no job/artifact at last poll.
- [Blocking Preview #39802525217](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39802525217): old SHA `920f53d...`, Chromium installation still in progress since `2026-10-22T15:12:38Z`. Don't launch another run.

## Scope / safety blockers
- Remote D1 schema/payment ledger NOT VERIFIED; migration 0009 and PRE/PRO deferred; R2 persistence deferred; AI grouping blocked until owner approves API contract.
- No remote D1/R2 operation, setup/migration, Production deploy, Access bypass or secret access.
- Keep PR #111/#108 OPEN/unmerged; no main/static edits or fake business data.

## Next
Poll current Preview runs, review #8–#12 evidence, then continue per-path provenance in evidence-backed batches.
