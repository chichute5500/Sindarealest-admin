# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

> **Single entry point:** [handoff/START-HERE.md](handoff/START-HERE.md). Chat starter should be one line; do not ask the owner to paste this long prompt or re-explain project history.

## Live checkpoint — 2026-10-22 (latest UI fix validated)
- Repo `chichute5500/Sindarealest-admin`; writable ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged; protected website/static PR #108 OPEN/unmerged/read-only.
- ADMIN HEAD before this handoff sync: `23b93779f232966aa150668cfd6bbe4c083ffe40`; latest source/test SHA `4b2220d510a906882e4309df6969c0c43514c421`, distinct from later docs-only HEADs.
- Source CI [#39813340342](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340342>) SUCCESS; Playwright matrix + Preview diagnostic [#39813340309](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309>) SUCCESS on exact SHA.
- Artifact [#340 / ID 12439794397](<https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397>) has 102 PNGs (16 login shell, 86 fixture screens) and 78 fixture metrics.
- Latest fix reserves safe-area-aware space for mobile toast above fixed nav and asserts an 8px gap; 390×844 Light screenshot confirms nav labels remain visible.
- Old retry-customers timeout #39804852604 is historical, not the active blocker.
- Progress 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED. PR #111 count 1,310; provenance PARTIAL. Existing audit found 36 runtime/config paths (14 added, 22 modified) vs merge-base; seven runtime blobs match PR #108 and ADMIN `public/index.html` differs from main/static.

## Mission and process
Continue actual, evidence-based GitHub work after short Vietnamese checkpoints. Verify current HEAD/PRs/Actions, inspect code/reference, reproduce real defects, make minimal ADMIN-only fixes, run tests on exact SHA, sync handoff, read it back and refetch status. Do not stall at a report if safe work remains.

## Reference and acceptance
Use `docs/admin-ui-reference/admin-mobile-reference.png` as visual reference and `handoff/12-SCREEN-REFERENCE-AUDIT.md` as mapping. Mobile-first Luxury Minimalism / Liquid Glass, light/dark, Vietnamese, accessible names/focus/keyboard, no clipping/overlap. Tests should compare same viewport/theme. Fixtures prove fixture behavior only, not authenticated real backend.

## Source-level migration note
Current `scripts/setup-cloudflare.mjs` and `scripts/deploy-cloudflare.mjs` both contain migration-0009 schema preflight. Setup performs earlier remote migrations/DDL before the preflight and does not apply 0009 itself; deploy checks 0007, 0008 and 0009 before deployment. This is source-only evidence, not remote D1 state. Never run these scripts unless owner restrictions are explicitly changed.

## Hard safety boundaries
- Keep PR #111/#108 OPEN/unmerged. Do not write to `main` or static branch, deploy Production, or blindly cherry-pick/force-push.
- No Cloudflare Access bypass, secret access/exposure/change, remote D1/R2/schema/ledger, or setup/migration/deploy script execution.
- Migration 0009 and PRE/PRO migrations; R2 persistence/product image save remain DEFERRED_BY_OWNER.
- AI grouping remains blocked until owner approves API/UX contract.
- No fabricated products, prices, stock, images, customers, orders, payment state or unapproved API/route contracts.
