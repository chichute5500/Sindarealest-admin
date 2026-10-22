# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

> **Single entry point for every chat:** [handoff/START-HERE.md](handoff/START-HERE.md). Send only its one-line starter. Fetch GitHub live state before doing work; do not request the owner's old prompts or repeat completed tasks.

## Live checkpoint — 2026-10-22
- Repo `chichute5500/Sindarealest-admin`; writable ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111 OPEN/unmerged.
- Protected website/static branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN/unmerged and read-only.
- Latest source/test SHA `483a03966ba2d1d2e46d2723f440b97ebc31d0e4`; [Actions #39811730576](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576) SUCCESS and screenshot artifact [#339](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39811730576/artifacts/12441015558).
- Prior run #39804852604 failed on an older SHA at the retry-customers Playwright selector. The newer run passed. Do not treat the obsolete failure as active work.
- Progress stays 50% PROVISIONAL; all 12 screens remain PARTIAL_NOT_ACCEPTED; live authenticated backend acceptance is NOT_TESTED.

## Mission
Continue real GitHub work after each short Vietnamese checkpoint. Do not stop at analysis/reporting if a safe actionable task remains. Make small evidence-based changes, validate exact SHAs, then synchronize the handoff.

## UI reference and acceptance
Use `docs/admin-ui-reference/admin-mobile-reference.png` as the visual standard. Official screen mapping is `handoff/12-SCREEN-REFERENCE-AUDIT.md`. Mobile-first Luxury Minimalism / Liquid Glass; light/dark, Vietnamese text, keyboard/focus/accessibility, no clipping/overlap. Compare identical viewport/theme; record the actual tested combinations. Preserve authentication, business logic and API contracts.

## Execution loop
1. Fetch live PR #111/#108 metadata, branch HEAD, relevant Actions run and artifact.
2. Read current-status JSON, test JSON and the relevant audit.
3. Pick the highest-value unresolved safe task; don't repeat green exact-SHA tests without a concrete reason.
4. Reproduce the issue, make the smallest ADMIN-only change and add regression coverage where appropriate.
5. Validate on the exact new SHA; inspect matching screenshot evidence.
6. Update handoff JSON/Markdown, reread it, then refetch live HEAD/PR.
7. Continue with the next safe task.

Use PASS, FAIL, PARTIAL_NOT_ACCEPTED, BLOCKED, NOT_TESTED, NOT_VERIFIED, DEFERRED_BY_OWNER truthfully. CI/fixtures do not equal authenticated backend QA.

## Hard safety boundaries
- Do not merge PRs, edit `main` or the static branch, force-push, cherry-pick blindly, or deploy Production.
- No Cloudflare Access bypass, secret access/exposure/change, remote D1/R2/schema/ledger operation, or execution of setup/migration/deploy scripts.
- PRE/PRO migrations, migration 0009 and product-image/R2 persistence remain DEFERRED_BY_OWNER.
- No fabricated products, prices, stock, images, customers, orders, payment status or unapproved API/route contracts.
