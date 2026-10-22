# HANDOFF — SINDAREALEST2 STATIC STOREFRONT

> Current facts live in [CURRENT-STATE.md](CURRENT-STATE.md). Read it first; this document is a short operating guide, not a second competing status log.

## Project boundary
- Repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 open and not to be merged.
- Preview only. Do not touch Production/main, Admin, backend/API/auth/schema/business logic, product data/mappings, D1/R2, bindings, secrets, DNS or Access policy.
- Preserve owner-provided hero `/images/hero-sd-gl052.png`. QR/payment stays fail-closed until trusted backend configuration exists.

## How to continue
1. Read [CURRENT-STATE.md](CURRENT-STATE.md), then fetch current branch and PR HEAD.
2. Read [TEST-RESULTS.md](TEST-RESULTS.md) and [TASKS.md](TASKS.md) for exact-SHA evidence and outstanding work.
3. Check GitHub Actions and Cloudflare deployment metadata. Keep source SHA, deployed Preview SHA and audited SHA separate.
4. Inspect the real screenshots against both source reference PNGs; do not infer visual parity from a green workflow.
5. Fix only confirmed storefront mismatches, run relevant tests, verify Preview deployment SHA, inspect the new artifact and update the docs.
6. Continue after reporting; stop only for a real user action, permission or trusted data dependency.

## Evidence discipline
- PASS is scoped to the exact commit, test suite, environment and artifact.
- Gallery press (4/4) and fly-to-cart (6/6 plus 2 animation-edge checks) were PASS in the recorded live audit for SHA `78b0a673a610501bfa4048df0ed614ff48246f97`; do not reopen without newer contrary evidence.
- The most recent documented full live audit is run #39756327625, artifact #12416207670, for SHA `78b0a673a610501bfa4048df0ed614ff48246f97`. It is not evidence that later SHA `fc406599e04475e232fad790efd03d46979a5a20` has passed live visual audit.
- Docs-only commits are excluded from Preview deployment/live-capture push triggers. Do not say a documentation commit has deployed storefront code.

See [NEXT-CHAT prompt](PROMPT-NEXT-CHAT-2026-10-22.md) for the concise handoff instructions.
