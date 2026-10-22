# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

**Canonical handoff entry point:** [START-HERE.md](handoff/START-HERE.md). Fetch live GitHub state before acting; this master prompt is not a substitute for START-HERE.

> **Single entry point:** [handoff/START-HERE.md](handoff/START-HERE.md). Chat starter should be one line; do not ask the owner to paste this long prompt or re-explain project history.

## Last source/UI evidence checkpoint — 2026-10-22 (not current HEAD)

The last successful source/UI screenshot matrix was source SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`, runs #39816652373 and #39816652346, artifact #344 / ID 12441639210. Handoff integrity test added at `7a60099f96bb0be4f68dbda47fbec9c10df44390` subsequently failed because START-HERE lacked a direct prompt link; this sync adds the link. Fetch live Actions to verify the fix.
- Repo `chichute5500/Sindarealest-admin`; writable ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Static branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged and read-only.
- Branch HEAD at sync start `9ec143a6d0250b4c5949cfaa6e6f6eed01d6748e`; latest source/test SHA `105f46b90dc5664dd091493dbd5cea1af7796c44`.
- Source validation [#39816652373](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652373) and screenshot/Preview run [#39816652346](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346) SUCCESS; current artifact [#344](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39816652346/artifacts/12441639210).
- PR #111 live count 1,314 changed files; refresh paginated list before new path counts.
- Old retry-customers timeout #39804852604 is historical, not active work.
- Progress 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED.

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
