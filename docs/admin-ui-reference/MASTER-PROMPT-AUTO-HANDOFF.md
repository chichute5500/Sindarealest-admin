# SinDarealest Admin — Master Prompt Compatibility Pointer

## Live checkpoint — 2026-10-24 08:24 ICT

- Branch HEAD at checkpoint start: `94669674ab0d5e635ac47026ef3c98d362e63002` (docs-only); source/test SHA: `0c441375a212c73ce56f16d4f9673e44c1b8260f`.
- Validate #5540 passed on the source/test SHA and Validate #5541 passed on the docs-only HEAD. Preview #493 captured evidence on `0c441375a212c73ce56f16d4f9673e44c1b8260f` but failed only at the exact-HEAD guard after the branch moved to `94669674ab0d5e635ac47026ef3c98d362e63002`; no Preview success is attached to the docs-only HEAD.
- Inspected artifact [#493](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40049413302/artifacts/12543031534): 133 PNGs, 120 UI-fixture captures, 112 metrics, zero overflow; Screen 7 Timeline visible at 390×844 with synthetic data. Exact approved-reference parity remains unverified.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; progress remains `50% PROVISIONAL`. PR #111 and PR #108 remain open/unmerged. No Production deploy, Access/secrets change, D1/R2 write, or migration.
- Refresh live HEAD and exact-SHA Actions after this docs-only sync; do not treat Preview #493 as latest-HEAD acceptance.

The single source of truth for starting or continuing work is [handoff/START-HERE.md](handoff/START-HERE.md).

Do not use historical HEADs, test runs, progress percentages, or branch counts in old prompt text as live state. Fetch the current PR #111 / PR #108 metadata, writable branch HEAD, merge base, and Actions results before acting.

## Canonical documents

- [START-HERE.md](handoff/START-HERE.md) — sole entry point and operating guardrails.
- [PROMPT-NEXT-CHAT.md](handoff/PROMPT-NEXT-CHAT.md) — compact continuation prompt.
- [current-status.json](handoff/current-status.json) and [latest-test-results.json](handoff/latest-test-results.json) — status snapshots; refresh against live GitHub before relying on them.
- [LATEST-STATUS.md](handoff/LATEST-STATUS.md), [12-SCREEN-REFERENCE-AUDIT.md](handoff/12-SCREEN-REFERENCE-AUDIT.md), and [PR-111-SCOPE-AUDIT.md](handoff/PR-111-SCOPE-AUDIT.md) — current audit context.
- [history/README.md](handoff/history/README.md) — evidence-retention policy.

## Non-negotiable scope

Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open and unmerged; PR #108 and the static website branch are read-only. No merge, force-push, Production deploy, Cloudflare Access bypass, secret access, remote D1/R2/schema/ledger operations, or setup/migration/deploy script execution. Respect all `DEFERRED_BY_OWNER` items and do not fabricate business data or API contracts.

This file is retained as a compatibility pointer for existing links. Do not duplicate live status or the full continuation prompt here.
