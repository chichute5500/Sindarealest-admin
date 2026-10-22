# START HERE — SINDAREALEST ADMIN

## Snapshot
- Pre-write ADMIN HEAD c002a34d0df955e4d804615f665d6ae5bedc4072 (https://github.com/chichute5500/Sindarealest-admin/commit/c002a34d0df955e4d804615f665d6ae5bedc4072). Its parent source-validation record is documented in LATEST-STATUS.md; this docs-only commit advances HEAD. Fetch the live refs and exact-SHA workflow run at every session start.
- PR #111 OPEN/unmerged on feature/admin-isolated-handoff-2026-10-20. Protected PR #108 OPEN/unmerged on fix/liquid-glass-audit-2026-10-19; do not write to static branch.
- Progress 50% PROVISIONAL; all 12 screens remain PARTIAL_NOT_ACCEPTED.
- #3 Product list review closed as data-limited; #4 Product editor remains partial. Do not repeat geometry checks without new state or a reproducible defect. Next screen work: #6 Orders and #7 Order detail independently.
- Migration 0009 source preflight is tested; remote schema/ledger NOT VERIFIED and migration DEFERRED_BY_OWNER. Setup's 0009 gate follows earlier remote migrations; do not run setup.

## Canonical files
1. PROMPT-NEXT-CHAT.md — paste-ready transfer prompt.
2. current-status.json — refs, checkpoint, progress, queue and scope.
3. latest-test-results.json — exact-SHA source checks versus visual evidence.
4. LATEST-STATUS.md — human-readable summary.
5. 12-SCREEN-REFERENCE-AUDIT.md — official screen numbering and acceptance.
6. PR-111-SCOPE-AUDIT.md — source provenance, schema/API/deploy risks.
7. PROMPT-COMPLETENESS-AUDIT.md — checklist of handoff completeness.

## Anti-duplication
- Every PASS must match workflow head_sha to the relevant source SHA. Older run evidence remains contextual only.
- Do not rerun #3/#4 geometry absent a new state, changed app source or reproducible bug.
- Never invent product photos/prices/stock, API contracts or acceptance evidence.
- No merge, main/static writes, Production deployment, Access bypass, secret access, remote D1/R2 queries/writes, setup/deploy/migration.
