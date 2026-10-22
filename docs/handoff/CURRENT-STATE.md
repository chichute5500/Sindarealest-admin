# CURRENT STATE — SINDAREALEST2 STATIC STOREFRONT
Updated: 2026-10-23

## Read this file first
This is the single current source of truth. Re-fetch GitHub state before acting; never treat a SHA copied into a document as the live branch HEAD.

## Repository / safety
- Repository: `chichute5500/Sindarealest-admin`
- Working branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, NOT MERGED. Never merge unless the owner explicitly changes this instruction.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production is out of scope: no Production deploy, `main`, DNS, D1/R2 data/config, bindings, secrets, Access policy, Admin branch, backend/API/auth/business logic, or product/catalog data changes.

## Owner's latest decision: Hero temporarily hidden
- The Hero image is intentionally hidden for now. This is a pause, NOT visual acceptance/PASS.
- `public/index.html` keeps `#heroProductImage` hidden, removes `src`, and marks `temporarily-disabled-owner-request`.
- Preserve the owner-uploaded source `public/images/hero-upload/tb_image_share_1792519964514 (1).png` and its separate derivative. Do not delete, overwrite, rename, or associate either with a catalog product.
- Do not restore obsolete `hero-sd-gl052.png`. Do not resume Hero design work until the owner asks.
- Required visual condition: no empty Hero frame, reserved blank space, or layout regression on mobile/desktop in Light/Dark.

## Latest branch / workflow evidence (exact SHA only)
- Current HEAD: `51e6f937b56c9c8ff04f4bbfd82298c3f8307d02`. This commit changes only four workflow files under `.github/workflows/`; it does not alter storefront source, the Hero image, product data or runtime behavior.
- Source integrity, dependency audit and full automated tests: PASS on this exact SHA — [run #39843531405](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39843531405).
- The workflow-only push correctly triggered source validation only. Preview deploy, live screenshot capture and Admin smoke were not launched by this commit; do not claim the current HEAD is deployed or visually accepted.
- Latest recorded successful Preview deploy before this workflow-only commit: [run #39842480998](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480998), SHA `33e09dd2bce4c4be1df23c65a47d93217d2153b7`. Related Liquid Glass audit: [run #39842480928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480928), same SHA. These old results do not replace a fresh check of the alias/deployment metadata or human inspection of screenshots.
- Workflow trigger optimization is now applied: docs/root README-only changes skip full CI; workflow-only changes skip deploy and expensive visual capture; Admin Preview smoke is manual-only; stale source-test and ordinary visual-review runs are superseded by newer work. Deliberate start/end screenshot archives stay in a separate serialized concurrency group and are not automatically cancelled.
- Previous runs showed rapid stale-commit churn, including cancelled Admin smoke runs such as [#39842480951](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842480951) and [#39842289407](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39842289407). These are historical evidence of the inefficiency, not current failures.

## Immediate next actions
1. Re-fetch current HEAD, PR #108, Actions and Cloudflare deployment metadata before any new source change.
2. Keep the Hero temporarily hidden and preserve its owner-uploaded source/derivative. Inspect actual Preview screenshots for no empty frame or reserved blank area and no mobile/desktop Light/Dark regression; do not call this visual PASS until inspected.
3. Continue the storefront audit from current evidence. Run visual captures only after relevant storefront/source/test changes or deliberate manual dispatch. Never deploy Production or touch Admin/backend/catalog data.

## Evidence rules
- Source tests, deploy, deployment SHA, live screenshot capture and human visual acceptance are separate gates.
- PASS must be tied to exact relevant SHA/deployment. Automated tests alone do not prove visual acceptance.
- Preserve historical evidence, but never treat old SHAs, run IDs, URLs, blockers or percentages as current.

## Minimal read order
1. `docs/handoff/CURRENT-STATE.md` (this file)
2. `docs/handoff/TASKS.md` (active task ledger)
3. `docs/handoff/DECISIONS.md` only for relevant owner/scope decisions
4. `docs/handoff/TEST-RESULTS.md` for specific evidence
5. `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md` only when a new-chat prompt is needed

Files labelled historical/archived are context, not active instructions.
