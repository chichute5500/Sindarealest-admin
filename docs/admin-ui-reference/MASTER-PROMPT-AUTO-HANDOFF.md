# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

> **Single entry point:** [handoff/START-HERE.md](handoff/START-HERE.md). Chat starter should be one line; do not ask the owner to paste this long prompt or re-explain project history.

## Live checkpoint — 2026-10-22
- Repo `chichute5500/Sindarealest-admin`; write only ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Protected static branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged, latest observed HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`, read-only.
- Latest source/test SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`; [Actions #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576) SUCCESS and artifact [#339](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576/artifacts/12441015558).
- Old retry-customers failure is historical; new run passed. Progress stays 50% PROVISIONAL and all 12 screens remain PARTIAL_NOT_ACCEPTED.
- PR #111 live file census = 1,310; runtime/config paths 36 (14 added/22 modified vs merge-base). The ADMIN storefront `public/index.html` differs from main and static #108 and needs explicit scope review before any merge. Seven other current runtime blobs match static #108 exactly.

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
