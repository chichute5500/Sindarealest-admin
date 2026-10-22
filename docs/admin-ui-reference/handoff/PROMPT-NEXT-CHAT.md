# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Single entry point: [START-HERE.md](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/handoff/START-HERE.md). Do not request the owner to paste historical prompts.

## Live source-audit checkpoint
- Repo `chichute5500/Sindarealest-admin`, write only `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Protected website/static branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged, current observed HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`, read-only.
- ADMIN HEAD at audit checkpoint start `0502739790fecfdf56f3c267dcaf607f1751908e`; fetch live before every write.
- Latest source/test SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`; [run #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576) SUCCESS; [artifact #339](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576/artifacts/12441015558) has 102 PNGs and 78 fixture metrics.
- Product progress 50% PROVISIONAL; all 12 screens PARTIAL_NOT_ACCEPTED, authenticated business backend NOT_TESTED.
- Old `retry-customers` timeout in run #39804852604 is historical; do not reopen without new failing evidence.
- PR #111 current file list contains 1,310 paths. Runtime/config: 36 files, 14 added/22 modified vs merge-base `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; full provenance is still PARTIAL.
- Source audits confirmed both setup and deploy scripts contain migration-0009 preflight, but no remote D1 query was run. Do not repeat obsolete assertion that 0009 preflight is missing.

## Continue work
1. Continue semantic review of the 36 runtime/config files, especially ADMIN `public/index.html` (differs from main and static #108), seven runtime blobs that are exactly equal to static #108, payment API/ledger contracts and setup sequencing. Keep these as source-only findings; do not edit the static branch.
2. Continue the 12-screen comparison at matching viewport/theme. Gallery source already implements a featured slot + horizontal rail; screenshot fixture art is synthetic, not actual product photography.
3. Review remaining changed tests/docs/evidence groups and record path provenance; don't call the PR clean/merge-ready until every scope is accounted for.
4. Make smallest reproducible ADMIN-only fixes with regression coverage, validate exact SHA, update JSON/Markdown and refetch live refs.
5. If authorized authenticated Preview is unavailable, mark BLOCKED/NOT_TESTED; never bypass Access.

## Guardrails
No merge, main/static edits, force-push, Production deploy, secrets/Access bypass, remote D1/R2/schema/ledger action, or setup/migration/deploy execution. Migration 0009, PRE/PRO, R2/product-image save remain DEFERRED_BY_OWNER. AI grouping awaits approved API/UX contract. Never fabricate data.
