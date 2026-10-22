# CHAT HANDOFF — SINDAREALEST2 STATIC STOREFRONT
Updated: 2026-10-23 — canonical handoff, owner decisions, and report-then-continue rule

**Canonical source:** read `docs/handoff/CURRENT-STATE.md` first. Then read `docs/handoff/TASKS.md` and consult `docs/handoff/TEST-RESULTS.md` only for evidence relevant to the active task. Do not ask the owner to repeat context. Re-fetch live GitHub state before any change.

## Hard scope and safety
- Repository: `chichute5500/Sindarealest-admin`
- Working branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108 must stay OPEN and unmerged.
- Preview/storefront branch only. Never deploy Production or change `main`, Admin branch, DNS, D1/R2 data/config, bindings, secrets, Access policy, backend/API/auth/business logic, or product/catalog data.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Hero owner decision: image is temporarily hidden and explicitly PAUSED. Owner says leave it alone and return to Hero only after other storefront work is complete. Do not edit Hero markup/CSS/assets, run Hero-specific redesign/checks, or restore obsolete `hero-sd-gl052.png` during the pause. Preserve `public/images/hero-upload/tb_image_share_1792519964514 (1).png` and its separate derivative unchanged. Hero is not PASS.

## Required working protocol — fastest safe completion

**Mandatory report-then-continue behavior:** a progress report is not a stopping point. After reporting a verified result, immediately continue with the next safe step of the SAME active task. If CI/deploy/capture is pending, do independent preparation/inspection while it runs, then return to inspect the result. Do not end a turn with only “I will continue” when available tools permit the work. Stop only for a genuine owner decision/visual acceptance, missing permission, or an external blocker that cannot be bypassed safely. When blocked, state exactly what is blocked and continue any independent safe work.
1. **One active acceptance item at a time.** Finish, verify, and present that item for owner acceptance before switching to another main item. Do not scatter partial changes across several features.
2. **Do not stop after a report.** After each concise update, continue to the next safe step. Stop only when owner input/permission/visual acceptance is genuinely required, or a real blocker cannot be resolved with available tools.
3. **Use wait time productively.** While CI, deploy, or screenshot capture runs, immediately work on independent, non-conflicting tasks that help the active item: inspect relevant code/tests, review audit criteria, prepare evidence checks, or diagnose known failures. Do not idle, duplicate the same workflow, or change the same files/behavior being validated.
4. **Respect SHA boundaries.** Results apply only to the exact commit and deployment tested. If code changes after a run starts, do not treat that run as validation of the newer code. Re-fetch current HEAD/PR/Actions and Preview deployment metadata as needed.
5. **Check evidence before rerunning.** Reuse still-valid PASS evidence when its tested code and scope are unchanged. Run only missing, stale, or impacted checks; do not rerun a whole matrix without reason.
6. **Fix root cause, not symptoms.** Identify the observed discrepancy and its source before editing. Make the smallest relevant change, then run targeted regression tests.
7. **Separate gates:** source tests, Preview deployment, exact deployment SHA, real Preview screenshot capture, and owner visual acceptance are distinct. Never infer visual PASS from green CI or a local fixture.
8. **Owner acceptance locks a task.** Statuses: IN PROGRESS, READY FOR OWNER REVIEW, PASS/LOCKED, BLOCKED. After the owner says PASS, do not alter that item without explicit permission. Do not ask the owner to re-approve these workflow rules.
9. **Report compactly and keep working:** current item/status; what changed; exact SHA; relevant CI/deploy/audit links; evidence and remaining blocker; next action. After that report, continue executing the next safe action; do not wait for the owner to say “continue.” No unsupported percentages or “100%” claims.

## Start work immediately
1. Verify PR #108 and current branch HEAD; check the latest relevant Actions and exact Cloudflare Preview deployment SHA.
2. Follow `TASKS.md`. The current active item is the next unfinished storefront visual-audit section OUTSIDE Hero. First inspect the live source/tests and existing evidence; do not invent a defect. Fix one concrete issue at a time, verify it, and move to the next step automatically. Hero is paused until other storefront work is complete.
3. While any workflow runs, do useful independent preparation and resume evidence review as soon as results arrive.
4. For each non-Hero section, report the actual Preview link and ask the owner to review only when a genuine visual acceptance decision is needed. Do not resume Hero until other storefront work is complete.
5. Update `CURRENT-STATE.md`, `TASKS.md`, and `TEST-RESULTS.md` when verified state changes. Also reconcile contradictory older instructions before handing off. Historical evidence belongs in `TEST-RESULTS.md`; never copy old SHA/run IDs forward as current.
6. Before ending a session, verify that the active task and Hero pause agree across `CURRENT-STATE.md`, `TASKS.md`, this prompt, and the visual-audit pointer. The archived `docs/prompts/NEXT-CHAT-PROMPT.md` and `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md` are intentionally non-active pointers; do not revive their old instructions.

## Owner-facing reporting language
- Say PASS only for the exact gate that passed and cite its SHA.
- Say PENDING for visual acceptance not yet confirmed by the owner.
- Say BLOCKED only when a real dependency or permission is missing, and state the exact action needed.
- Do not merely report progress and stop; continue working unless owner input or a genuine blocker is required.

