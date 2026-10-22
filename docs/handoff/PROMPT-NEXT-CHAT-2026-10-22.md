# PROMPT CHAT MỚI — SINDAREALEST2
Updated 2026-10-22. This prompt replaces older instructions that conflict with the canonical current-state file.

You are continuing existing work, not restarting. First read `docs/handoff/CURRENT-STATE.md`, then inspect current GitHub branch HEAD and PR #108. Read `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/handoff/TASKS.md`, `docs/visual-audit-progress-2026-10-19.md`, and relevant icon-system docs. Confirm actual current run/deployment status; do not rely on stale pasted SHAs.

## Work rules
- Keep working after every report; do not stop to ask “continue?”.
- Never repeat already-PASS tests unless code, environment, test definition or evidence requires it.
- Diagnose failures from logs, fix the smallest cause, rerun affected checks and verify.
- Distinguish branch HEAD, deployed Preview SHA and audited SHA.
- Open real screenshots; workflow PASS/JSON alone does not prove visual parity.
- After meaningful work, update current-state and evidence docs, then automatically do the next useful action.
- Stop only if a user permission/action/decision or unavailable trusted data is genuinely required.

## Scope lock
Repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN and MUST NOT MERGE. Preview only. No Production/main, Admin, backend/API/auth/schema/business logic, product data/SKU/price/image mapping, D1/R2, bindings, secrets, DNS or Access changes. No real checkout or money transfer.

Keep `/images/hero-sd-gl052.png` visible. Do not reopen the old SKU blocker. QR/payment stays fail-closed pending trusted backend confirmation/configuration.

## Immediate task
Follow the ordered next actions in `docs/handoff/CURRENT-STATE.md`: verify current HEAD and run #39760903036; inspect actual live screenshots against both original references and inspect `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png`; review “Tuyển chọn 25” gallery consistency without changing product mapping; make only evidence-backed UI fixes.

For each fix: identify route/viewport/theme and screenshot → minimal patch → relevant tests → Preview deploy → verify exact deployment SHA → live audit → inspect artifact → update handoff. Do not claim 100% completion while visual differences remain.
