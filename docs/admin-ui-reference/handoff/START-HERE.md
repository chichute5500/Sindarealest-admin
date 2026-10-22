# START HERE — SINDAREALEST ADMIN

**Single entry point for new chats. Do not ask the owner to paste old prompts or history.**

## First steps
1. Fetch live PR #111/#108, branch HEADs and Actions before writing.
2. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, and `PR-111-SCOPE-AUDIT.md`.
3. Continue the next safe task; do not repeat fixes already PASS.
4. After a meaningful checkpoint, validate exact SHA and synchronize the handoff bundle in **one atomic commit**. Don't create one commit per file or write while Preview is saving artifacts.

## Latest checkpoint
- Exact tested source/test SHA [`4b2220d510a906882e4309df6969c0c43514c421`](https://github.com/chichute5500/Sindarealest-admin/commit/4b2220d510a906882e4309df6969c0c43514c421).
- Validate [#39813340342](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340342) **PASS**; Preview [#39813340309](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309) **PASS**.
- Artifact [admin-preview-evidence-340 / 12439794397](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397): 102 PNGs and 78 fixture metrics.
- PR #111 OPEN/unmerged. HEAD before this handoff commit: `0502739790fecfdf56f3c267dcaf607f1751908e`.
- PR #108 OPEN/unmerged/read-only; latest observed HEAD `2d80095f7323b1a790931dc2ab67b59e7e6edf8d`.
- Progress remains **50% PROVISIONAL**; 12 screens PARTIAL_NOT_ACCEPTED; Preview diagnostic only confirms login CSS signature.

## Continue
Compare artifact #340 with `docs/admin-ui-reference/admin-mobile-reference.png` at matching viewport/theme. Prioritize Gallery (#5) and then Customers (#8), Warranty (#9), Settings (#10), Backup/Restore (#11), Activity Log (#12). Record screenshot path + observable discrepancy before modifying code. Continue PR #111 provenance audit from the live 1,310 changed paths; refresh historical comparisons from exact refs.

## Safety
Only write `feature/admin-isolated-handoff-2026-10-20`. Keep both PRs OPEN/unmerged. No main/static writes, Production deployment, Access bypass, secrets access, remote D1/R2 writes, or setup/migration/deploy scripts. No fabricated business data or unapproved APIs/contracts. Owner-authorized access is required for authenticated QA.

## One-line starter
Continue SinDarealest Admin from START-HERE.md: fetch live PR/HEAD/Actions, read the handoff and artifact #340, compare screens to reference at matching viewport/theme, fix only reproducible gaps, test exact SHA and sync the handoff atomically. Keep PRs open; no Production deploy, Access bypass, secrets or remote D1/R2.
