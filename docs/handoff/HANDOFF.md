# HANDOFF — SHORT POINTER

**MANDATORY BOOT GATE:** Before any code change, read `CURRENT-STATE.md`, then `TASKS.md`, then the relevant `TEST-RESULTS.md` evidence. Also read the latest prompt below. These files override copied prompts, prior chats, stale issues, screenshots, or older handoffs when they conflict. Never reopen an owner-paused/locked scope unless the owner explicitly does so.

## Latest active handoff — 2026-10-24

- **Current prompt:** [PROMPT-NEXT-CHAT-2026-10-24.md](PROMPT-NEXT-CHAT-2026-10-24.md)
- **Canonical project state:** [CURRENT-STATE.md](CURRENT-STATE.md)
- **Task ledger:** [TASKS.md](TASKS.md)
- **Owner decisions / locks:** [DECISIONS.md](DECISIONS.md)
- **Test/deployment evidence:** [TEST-RESULTS.md](TEST-RESULTS.md)

**Owner's latest acceptance:** PASS all current storefront sections except fullscreen product-image viewing. Fullscreen mobile gallery flicker is much reduced but still occasionally flashes 1–2 times. Continue only on that remaining defect; do not reopen accepted/locked sections.

At the last live check, branch `fix/liquid-glass-audit-2026-10-19` / PR #108 HEAD was `700a651a1f92f35a7cc43bcc4b0ae96f2da26539`; validation run 40012914027 and Preview deploy run 40012914126 succeeded on that SHA. Re-fetch live HEAD, PR, Actions and deployed Preview SHA before making claims or changes.

PR #108 must remain OPEN/unmerged. Preview only; no Production deployment. Hero remains paused by owner. Do not claim browser or visual acceptance from CI alone.
