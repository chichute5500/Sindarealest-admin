# START HERE — SINDAREALEST ADMIN

**Single entry point for every new chat.** Read this file and PROMPT-NEXT-CHAT.md, verify live GitHub state, then continue unfinished work. Do not ask the owner to paste prior history or repeat completed B1 cleanup.

## Canonical handoff
- [Prompt for next chat](PROMPT-NEXT-CHAT.md)
- [Latest status](LATEST-STATUS.md)
- [Current status JSON](current-status.json)
- [Latest test results](latest-test-results.json)
- [PR #111 scope/provenance audit](PR-111-SCOPE-AUDIT.md)
- [12-screen acceptance audit](12-SCREEN-REFERENCE-AUDIT.md)
- [Evidence retention policy](history/README.md)

## Live checkpoint (2026-10-23T02:54:13Z)
- Repository: `chichute5500/Sindarealest-admin`.
- PR #111: OPEN/unmerged, base `main` at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`, 396 changed files (+39,234 / -212). Working branch: `feature/admin-isolated-handoff-2026-10-20`.
- Branch HEAD at checkpoint: `620d7b07dd7f92aed8325846785c8b231b256e36`. This is the Preview workflow's evidence-only child of the tested application/source SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`; it contains compact screenshot/diagnostic reports, not an additional application change.
- Validate [#39891441964](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891441964) **SUCCESS on exact source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`**: dependency audit, project integrity and the complete automated test suite passed.
- Admin Preview [#39891442082](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082) **SUCCESS on the same source/test SHA**. Artifact [`admin-preview-evidence-361`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082/artifacts/12474998216) contains 102 PNGs (16 login-shell, 86 read-only fixture screens) and 78 fixture metrics. The mobile Settings screenshot shows the fixed order: price controls, welcome controls, watermark, then QR payment panel.
- The handoff baseline Validate [#39890582750](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39890582750) also completed SUCCESS on exact checkpoint SHA `71ca210f0a024f29b5960cc07705171096adb920`.
- Product change: Screen 10 Settings now renders price, welcome and watermark controls before the separate QR payment panel. A regression assertion guards the DOM order. This does not verify persisted settings or real QR activation.
- Preview-generated evidence is retained in `docs/admin-ui-reference/handoff/history/4ac7465539e7/`; the screenshot artifact remains in Actions, not Git.
- PR #108 remains OPEN/unmerged/read-only on `fix/liquid-glass-audit-2026-10-19`, current observed HEAD `5a11a5264ab6186c36eac764dd7755c3b2c1bf9a`, 286 changed files (+20,602 / -398). Do not write to that branch/PR.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; authenticated backend QA `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`.

## B1 — PR #111 cleanup/provenance
**B1 audit remains complete.** The two new files since the 394-path cleanup census are compact Preview evidence (`report.md` and `preview-diagnostics.json`), not a reason to reopen file deletion or API consolidation.
- Current path census: .github 1; root 2; data 1; docs 342; functions 24; migrations 2; public 1; scripts 4; tests 19 (396 total).
- History now contains 163 SHA-keyed run directories and 330 compact report/metadata/Preview-diagnostic text/JSON files plus the README policy. Raw screenshot matrices stay in Actions artifacts.
- Earlier cleanup removed 912 generated historical PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and the zero-byte viewer HTML.
- Keep active consumers and distinct payment contracts. `normalizeFulfillmentType` is canonical in `functions/_lib.js`. No further deletions or route/helper merges without new evidence.

## Next actions
1. Validate the **next handoff-doc checkpoint commit** on that exact SHA once, because it follows the already-passing source/test and Preview run above. Do not make a further metadata-only commit to chase its own SHA.
2. Continue Screen 10 reference comparison and the remaining Admin acceptance work. Fix only reproducible ADMIN-specific defects supported by screenshot/code evidence.
3. Obtain an authorized authenticated Preview test path before testing business persistence. Never bypass Cloudflare Access or substitute fixtures for backend evidence.

## Guardrails
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and PR #108 open/unmerged; do not write to PR #108, `main`, or the static website branch.
- No merge/rebase/force-push, Production deployment, setup/migration/deploy scripts, remote D1/R2/schema/ledger operations, secrets or Access changes, or Access bypass.
- Do not invent business data or unapproved API contracts. Migration 0009, PRE/PRO changes, product-image/R2 persistence and AI image grouping remain deferred by the owner.
