# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual work on GitHub. First read [`START-HERE.md`](START-HERE.md), then fetch live PR #111 / #108 metadata, writable branch HEAD, merge base, changed-file list, and latest Actions. Historical SHA/counts in other documents are snapshots, not live state.

Repository: `chichute5500/Sindarealest-admin`.

## Scope
- Write only to `feature/admin-isolated-handoff-2026-10-20`.
- Keep PR #111 and PR #108 OPEN/unmerged. PR #108 and the static website branch are read-only.
- No merge, force-push, Production deploy, Cloudflare Access bypass, secret access, remote D1/R2/schema/ledger operations, or setup/migration/deploy scripts.
- Respect `DEFERRED_BY_OWNER` items. Never invent business data or API contracts.

## Work sequence
1. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md`, and `history/README.md`.
2. Continue the PR #111 scope cleanup from the live tree: remove only files proven obsolete or out of Admin scope; consolidate duplicated prompt/status instructions without deleting required test evidence or the approved UI reference.
3. For each change, identify why it is safe, make the smallest change, run the exact-SHA checks, and verify results from GitHub Actions.
4. Update and read back the canonical handoff only after evidence is available. Refetch live PR/HEAD/Actions before reporting.

## Acceptance boundary
All 12 screens remain unaccepted until evidence supports acceptance. Fixture screenshots are not authenticated backend QA. Never raise progress percentage without a defined, verified acceptance basis.
