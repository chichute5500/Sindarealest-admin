# SINDAREALEST — QA + Workers Requests policy for all future development

**Status:** Owner-approved for `main` on 2026-11-01. New branches created from this Main commit inherit the policy. Existing branches must carry/copy their own files. Applies to ALL future tasks, not just D1 or PR #159.

## Verified baseline and interpretation
- Cloudflare Pages Functions read-only report, around 40 hours ending 2026-11-01 03:xx Vietnam: shared `sindarealest-admin-preview` script **~86,563 Requests**, `sindarealest2` Production **~21,616**. These are NOT daily quota counts.
- Preview peak **31 Oct 21:00–21:59 (GMT+7)**: **12,285 requests**. Cloudflare showed **16 PR #159 deployments and 0 PR #154 deployments during that hour**. This is **NOT** proof PR #159 caused all requests: already-deployed branches and unrelated traffic remain possible.
- Preview peak **1 Nov 02:00–02:59 (GMT+7)**: **14,432 requests**. Cloudflare's `pagesFunctionsInvocationsAdaptiveGroups` dataset groups by Pages project script, *not* branch/deployment. Compare deployment activity with logs, not as a traffic substitute.
- Workers Requests quota, D1 Rows Read quota, and internal subrequests are different. Request count never equals an API query's rows read count.
- Evidence: PR #155 diagnosis comment `#6548632435` and Actions `41238166382`.

## Practical pipeline: local-first + one verified Preview release candidate

| Gate | Trigger | Target | Live Cloudflare use |
| --- | --- | --- | --- |
| Static checks, unit tests, contract tests | On relevant code changes | GitHub runner / disposable fixtures | None |
| Browser functionality, mobile screenshots, Liquid Glass visual diff | Iterative editing | Local test server, fixture DB and stable Owner screenshot | Prefer none |
| Preview deployment | Candidate SHA ready after batch of changes | Isolated branch alias only | One deploy per candidate |
| Remote smoke, API integration and final visual QA | After candidate SHA is deployed and checked | Exact branch Preview URL | Bounded, measured |
| Full Lighthouse/mobile+desktop regression and final PASS | Before Owner acceptance, or justified major change | Exact verified candidate | **One full pass** per candidate |
| Production | Only on explicit Owner PASS and release approval | Main / Production | Separate gated flow |

**Local-only tests do not replace the final real-Preview verification.** Maintain scope, mobile visual QA and Owner's >=95% visual requirement, but never claim the percentage without a reproducible image comparison against Owner reference.

## Rules for new or modified GitHub workflows
1. Inventory existing triggered workflows and overlapping test suites before adding another one. Prefer reusable workflow/jobs over one Playwright/Lighthouse workflow per task.
2. Full live screenshot/Lighthouse sweeps MUST NOT run on every ordinary source `push`. Use explicit `workflow_dispatch` (or a candidate-only dependency with exact SHA); deploy only stabilized candidate snapshots. Smaller local unit tests may auto-run on every change.
3. Live Preview QA requires `concurrency.group` scoped by branch/environment and an appropriate `cancel-in-progress` choice: **true for superseded read-only QA**, **false for a non-idempotent/deployment job**. Do not share one global group between unrelated branches.
4. Every remote probe must have bounded retries/timeouts/backoff. No unbounded refresh/poll loops, load tests or crawler runs against live Preview/Production. Stub repeated image catalog requests during *local* screenshots; run final real-asset integration once.
5. Check exact deployment SHA/alias before interpreting screenshots. Use a single release-candidate URL; do not use unspecified `ADMIN_TEST_URL` to claim the specific PR's visual fidelity.
6. Record baseline (same measurement window), After, requests by actual Pages script, number of remote browser navigations, and unresolved gaps. If per-host/branch logs are missing, report **unattributed** rather than blaming a PR.
7. Measure D1 efficiency separately from Workers Requests. Never broaden Cloudflare API token permissions for convenience. Analytics workflows should only call read-only endpoints and never generate synthetic site traffic.
8. Only mark **Owner PASS** after Owner review. Preserve acceptance screenshots and documents; never silently downgrade required coverage or claimed similarity.

## Built-in guard
- `node scripts/qa-resource-guard.mjs --self-test` checks guard cases.
- `node scripts/qa-resource-guard.mjs` checks policy files and **changed GitHub workflows in the current commit** for missing concurrency and new automatic expensive live QA.
- `.github/workflows/qa-resource-policy.yml` executes this cheap, local-only check when policy/CI changes. Existing workflows are not retroactively marked PASS by simply adding these files.
- This is a **preventive gate, not full traffic attribution**; per-deployment request logging or sampling must be installed separately before assigning exact culprit branches.

## What future AI must write in every handoff
```
Repository / PR / branch / HEAD:
Owner PASS to preserve:
Changes made:
Local/static tests:
Preview URL and exact deployed SHA:
Real Preview tests and screenshots:
Cloudflare Workers Requests before/after (same window) or "not measured":
D1 Rows Read before/after or "not relevant":
Owner visual reference match: proved / not proved:
Remaining work and risks:
Production/Main changed: NO unless explicit Owner approval:
```

**Deployment safety:** Owner approved this policy-only Main commit. `.github/workflows/deploy.yml` excludes policy-only changes; this commit uses `[CF-Pages-Skip]` to skip an independent Cloudflare Git integration deployment, if any. Real runtime changes continue through Production approval and existing deployment gates. Read rules from the currently checked-out branch.
