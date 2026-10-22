# SinDarealest Admin — Master Prompt Compatibility Pointer

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
