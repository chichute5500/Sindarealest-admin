# SINDAREALEST — mandatory agent instructions

Repository: `chichute5500/Sindarealest-admin`. These instructions are part of the source, not a chat prompt. **Read this file and `docs/QA_RESOURCE_POLICY.md` at the start of every coding task, including future tasks unrelated to today's Cloudflare issue.**

## Source of truth
- Preserve all Owner-PASS features and mobile-first Liquid Glass design. Work in the requested existing branch/PR, verify current HEAD before edits, and never overwrite a concurrently edited commit.
- Never merge, deploy, push or mutate `main`, `sindarealest2`, Production D1 `sindarealest-db`, or Production R2 without the Owner explicitly authorizing that specific operation. Preview is not Production.
- `sindarealest-admin-preview` is a **shared** Pages project for multiple branch aliases: global Worker/Pages Analytics totals **cannot** be assigned to a branch without hostname/deployment evidence.
- Use least-privilege credentials, disposable test databases, and sanitized logs. Never log real customer, payment, login or secret data.

## Workflow for EVERY task
1. Check active branch, PR, exact HEAD, relevant files, Owner PASS and other parallel work.
2. Change one coherent scope. Do not stack duplicate CSS or silently rewrite approved UI/logic.
3. Test source and functionality **locally first** (`npm run check`, relevant `npm test` / disposable browser/database tests). Do not waste Workers Requests on repetitive live QA.
4. Batch iterations, then deploy one pinned Preview candidate SHA only when integration needs a real deployment or for Owner review.
5. Full functional/visual QA still required before final PASS. For mobile visual parity, use actual Owner reference, equivalent viewport and screenshots. Do **not** invent a >=95% similarity score.
6. Handoff includes PR/branch, SHA, test results, what was not tested, Preview evidence, Cloudflare request impact, and outstanding work. Never report PASS if not verified.

## Resource safeguards, including future AI sessions
- Enforce `docs/QA_RESOURCE_POLICY.md` for every new/edited GitHub Action or browser test; run `node scripts/qa-resource-guard.mjs`.
- Never trigger multiple full Playwright/Lighthouse QA jobs on every source push. Prefer local targeted tests per commit; one full live Preview QA after the release candidate is deployed.
- Guard remote checks with bounded retries, concurrency and correct SHA. Only compare site Requests using matching time ranges. D1 Rows Read != Workers Requests.
- The monitoring report is in PR #155 / `scripts/workers-pages-request-attribution-readonly.mjs`. The token `CLOUDFLARE_ANALYTICS_TOKEN` is for analytics read-only; do not elevate deploy token permissions.
- A rule file on a feature branch is NOT global until propagated/merged into the branch an AI actually checks out. Future branches from current `main` may need the policy copied; never claim otherwise.
