# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Continue actual GitHub work on the current live repository. Read [START-HERE.md](START-HERE.md) first, then verify live refs and Actions. Do not ask the owner to paste history or repeat completed B1 cleanup.

Repository: `chichute5500/Sindarealest-admin`

## Latest verified checkpoint
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`.
- At checkpoint time (`2026-10-23T02:54:13Z`), PR #111 was OPEN/unmerged at HEAD `620d7b07dd7f92aed8325846785c8b231b256e36`, 396 changed files (+39,234 / -212), base `main` `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. HEAD is a Preview-generated evidence-only child of source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`.
- Validate [#39891441964](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891441964) and Admin Preview [#39891442082](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082) both completed **SUCCESS on exact source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`**. Preview artifact [`admin-preview-evidence-361`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082/artifacts/12474998216) contains 102 PNGs (16 login shell, 86 read-only fixture/module screens) and 78 fixture metrics. These screenshots and the deployed login CSS diagnostic do not prove authenticated business-data persistence.
- The Admin Preview workflow committed compact evidence under `docs/admin-ui-reference/handoff/history/4ac7465539e7/`. Current source/test result and artifact remain pinned to `4ac7465539e746b7f37517327d7bf9bddcfa3285`; don't mistake the evidence-only child for a new app build.
- Product fix validated: Screen 10 moved the QR payment panel after public-price, welcome and watermark settings. `tests/admin-liquid-glass-contract.test.mjs` guards the order. Persistent settings and real QR activation remain unverified.
- Previous checkpoint Validate [#39890582750](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39890582750) was SUCCESS on exact SHA `71ca210f0a024f29b5960cc07705171096adb920`.
- PR #108 is READ-ONLY, OPEN/unmerged, observed head `5a11a5264ab6186c36eac764dd7755c3b2c1bf9a`, 286 changed files (+20,602 / -398). Main remains `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Do not write to PR #108/main/static website branch.

## B1 — complete; don't repeat without new evidence
B1 scope/provenance review is complete. The current diff is 396 files; the two additions after the last census are generated compact Preview evidence (`report.md`, `preview-diagnostics.json`). Current path census: docs 342, functions 24, migrations 2, Admin HTML 1, scripts 4, tests 19, workflow 1, seed data 1, root 2. History has 163 SHA-keyed directories and 330 compact text/JSON evidence files plus README. No further deletion or API consolidation is justified without newly discovered consumer/provenance evidence.

## Continue real work
1. Validate the **next handoff-doc checkpoint commit** on its exact SHA once. Do not add another commit only to update its own SHA or run pointer.
2. Continue concrete Admin acceptance: compare current Screenshots with the approved reference where visual inspection is genuinely possible, record verified differences, and fix only those. Screen 10's order fix passed Validate/Preview; keep all 12 screens `PARTIAL_NOT_ACCEPTED` until full evidence supports acceptance.
3. Authenticated business/backend QA remains `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Fixture tests do not count as backend evidence.
4. Get an authorized Preview login/service-access path before attempting authenticated QA; never bypass Access or change secrets. Migration 0009, PRE/PRO migration work, product-image/R2 persistence and AI image grouping remain deferred by owner.

## Non-negotiable boundaries
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111/#108 OPEN/unmerged. Do not write to PR #108, `main` or the static website branch.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy script execution, remote D1/R2/schema/ledger operations, secret/Access changes or Access bypass.
- No fabricated business data or unapproved API contracts.
