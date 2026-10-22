# PR #111 — READ-ONLY SCOPE AUDIT

**Checked:** 2026-10-22T18:44:39+07:00 · **HEAD at audit:** `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e` · [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111) OPEN/unmerged.

GitHub's PR file-list endpoint returned **1,285 paths**.

| Top-level path | Count |
|---|---:|
| `docs/` | 1,222 |
| `tests/` | 25 |
| `functions/` | 24 |
| `scripts/` | 5 |
| `.github/` | 2 |
| `migrations/` | 2 |
| `public/` | 2 |
| `data/` | 1 |
| `package.json` | 1 |
| `README-DEPLOY.txt` | 1 |
| **Total** | **1,285** |

Extensions: PNG 913, MD 155, JSON 154, MJS 28, JS 26, HTML 3, YML 2, SQL 2, TXT 1, ZIP 1.

## Mixed-scope flags
The diff includes public `public/index.html`, 24 `functions/` API/auth/order/payment/product/warranty/admin files, migrations `0008` and `0009`, `scripts/setup-cloudflare.mjs`, `scripts/deploy-cloudflare.mjs`, and `.github/workflows/liquid-glass-visual-preview.yml`, alongside `public/admin/index.html`, tests, docs and evidence.

Diff membership alone does not prove a path was authored by recent ADMIN work; inherited static-site content must be distinguished by common-ancestor/file-level comparison before remediation. Do not revert paths blindly or merge.

- [Validate #39769095034](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39769095034) SUCCESS on exact checkpoint HEAD.
- [Preview #39767851318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318) SUCCESS on source SHA `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`; [artifact #311](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318/artifacts/12420678829) is fixture/read-only, not backend QA.
- No merge, Production deployment, remote D1/R2 write, migration/setup or Cloudflare configuration change was performed.

**Status: PARTIAL_NOT_ACCEPTED; merge readiness false.** Next: compare base/merge-base/head read-only; classify non-doc paths by origin and risk. Keep PR #111/#108 open/unmerged.
