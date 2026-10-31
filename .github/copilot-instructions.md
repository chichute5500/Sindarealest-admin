# SinDarealest repository instructions for AI coding assistants

Read `AGENTS.md` and `docs/QA_RESOURCE_POLICY.md` at the start of **every** task. Their instructions also apply to future PRs and unrelated features.

Owner-PASS features must be preserved. Mobile-first Liquid Glass; actual screenshots required for any numerical visual-parity claim. Verify current PR branch/SHA and avoid overwriting other AI agents.

Do not deploy/merge to main or touch Production D1/R2 or `sindarealest2` without explicit Owner approval. Shared `sindarealest-admin-preview` analytics cannot prove which Preview branch caused a spike.

Run local tests first, batch work, and use a single Preview deployment for a verified release candidate. Never run repeated full browser/Lighthouse tests on every small push. Read-only analytics only; distinguish Workers Requests from D1 Rows Read. Before modifying GitHub Actions run `node scripts/qa-resource-guard.mjs` and inspect cost/concurrency/duplicate workflows.

Every handoff: PR, SHA, PASS scope, remaining tasks, actual QA evidence, request impact. Do not claim visual >=95% without reference comparison.
