# CURRENT STATE — SINDAREALEST2 STATIC STOREFRONT
Updated: 2026-10-23

## Read this file first
This is the single current source of truth. Do not read archived prompts or long historical logs unless a specific evidence item is needed.

## Repository / safety
- Repository: `chichute5500/Sindarealest-admin`
- Working branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, NOT MERGED. Never merge unless the owner explicitly changes this instruction.
- Current branch HEAD checked before cleanup: `726d3bbd53b6d16288bed1a7d607a1de404ab171`. Re-fetch HEAD before any future change because this cleanup will create new commits.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production URL is out of scope. No production deploy, no `main`, DNS, D1/R2 data/config, bindings, secrets, Access policy, Admin branch, backend/API/auth/business logic, or product/catalog data changes.

## Owner's latest decision: Hero temporarily hidden
- The Hero image is intentionally hidden for now. This is a pause, NOT visual acceptance/PASS.
- The code change in `public/index.html` makes `syncHeroProductImage()` keep `#heroProductImage` hidden, removes `src`, and marks `temporarily-disabled-owner-request`.
- Preserve the owner-uploaded source `public/images/hero-upload/tb_image_share_1792519964514 (1).png` and its separate derivative. Do not delete, overwrite, rename, or associate either with a catalog product.
- Do not restore obsolete `hero-sd-gl052.png`. Do not resume Hero work until the owner asks.
- Still required after this change: verify the latest Actions and actual Preview on mobile/desktop, Light/Dark; ensure no empty Hero frame, reserved blank space, or layout regression. The latest commit's live Preview status has NOT been confirmed in this checkpoint.

## Immediate next actions
1. Verify latest branch HEAD and PR #108 status.
2. Check Actions for the current HEAD: source tests, Preview deployment and live screenshot capture. Do not treat an older run or local fixture as proof for the current commit.
3. Verify the deployed Preview SHA matches the intended code; inspect actual screenshots for mobile/desktop and Light/Dark.
4. Fix any failures only on this branch. Do not start unrelated visual redesign until the temporary Hero-hidden layout is verified.
5. Record verified run URLs, artifact IDs, and exact SHAs in `docs/handoff/TEST-RESULTS.md`; update this file only with the current status and next action.

## Evidence rules
- PASS means evidence is tied to the exact relevant commit/deployment and the actual output was inspected where visual acceptance is involved.
- Automated tests passing does not mean visual acceptance.
- Do not report a test or deployment PASS unless current GitHub evidence confirms it.
- Preserve historical evidence, but never treat old SHAs, run IDs, Preview URLs, blockers, or percentages as current.

## Minimal read order
1. `docs/handoff/CURRENT-STATE.md` (this file)
2. `docs/handoff/TASKS.md` (active task ledger)
3. `docs/handoff/DECISIONS.md` only if a scope/owner decision is relevant
4. `docs/handoff/TEST-RESULTS.md` only for specific historical evidence
5. `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md` only if a new-chat prompt is needed

Everything else labelled historical/archived is not an active instruction.
