# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Start here: [START-HERE.md](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/handoff/START-HERE.md). The owner should not need to paste this prompt or project history.

## Current known checkpoint
- Repo: `chichute5500/Sindarealest-admin`
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Protected/read-only website branch: `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged.
- HEAD at latest checkpoint start: `074d8ef712914d456754bdedb26e87c7fc00c5ad`; always fetch live HEAD before writes.
- Latest source/test SHA: `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`.
- [Run #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576) SUCCESS; [artifact #339](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576/artifacts/12441015558) contains 102 PNGs / 78 fixture metrics.
- Progress **50% PROVISIONAL**. All 12 screens are PARTIAL_NOT_ACCEPTED; authenticated backend/data flows NOT_TESTED.
- The retry-customers timeout belongs to old run #39804852604 on SHA `326526f8...`. Newer run #39811730576 on `483a03966ba2d1d2e46d2723f440b97ebc31d0e4` passed; do not reopen this as the current blocker absent new evidence.
- PR #111 live count: 1,310 changed files. Old 1,304-path grouped census is stale.

## Continue work
1. Compare artifact #339 against `docs/admin-ui-reference/admin-mobile-reference.png` at the exact same viewport/theme, starting with Gallery (#5) and screens #8–#12.
2. Refresh PR #111 changed-file provenance from the live paginated file list; prioritize runtime/API/migration/setup/workflow paths and distinguish inherited paths from new changes.
3. For every reproduced issue, make the smallest safe change only on the ADMIN branch, add regression coverage, validate the exact SHA, and synchronize handoff state.
4. If authenticated testing requires permissions not available, mark it BLOCKED/NOT_TESTED and state the exact missing authorized access; never bypass Access.

## Guardrails
No merge, main/static edits, force-push, Production deploy, secrets/Cloudflare Access bypass, or remote D1/R2/schema/ledger operations. Do not run setup/migration/deploy scripts. Product image-save, R2 persistence, migration 0009 and PRE/PRO migrations remain DEFERRED_BY_OWNER. Do not fabricate business data or unapproved API contracts.
