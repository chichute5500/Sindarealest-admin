# Website screenshot archive

This archive intentionally has exactly two stage directories:

- `start-of-work/` — real screenshots captured before changing storefront HTML/CSS/JS.
- `end-of-work/` — matching screenshots captured after implementation and tests.

The `.gitkeep` files only preserve the directory structure. They are **not screenshots** and do not satisfy either capture stage.

## Capture rules

1. Never copy reference designs into these folders.
2. Never label local fixture screenshots as a Cloudflare Preview capture. The current GitHub Actions visual workflow serves `public/` from a read-only local Python server and uses `data/legacy-products.json` fixtures; its manifest must retain that distinction.
3. Use the existing workflow `.github/workflows/liquid-glass-visual-preview.yml` and explicitly select `start-of-work` or `end-of-work` when dispatching it on the approved fix branch. Confirm the workflow run commits screenshots to this branch before reporting success.
4. Keep the existing `manifest.json` truthful. Record source commit, capture source, timestamp, viewport, theme, route, test result, and whether a same-name counterpart exists. Keep visual comparison status `UNVERIFIED` until images have actually been compared.
5. Capture equivalent routes, viewport sizes and themes for before/after. Do not create run-ID subfolders or additional canonical screenshot folders.
6. Do not deploy or merge Production. Do not capture authenticated/admin pages or perform state-changing actions.

## Current status (supersedes old run notes)

Do not use an old run ID or SHA from this README as current project status. The current project handoff and next steps live in [CURRENT-STATE.md](../handoff/CURRENT-STATE.md); exact-SHA test evidence lives in [TEST-RESULTS.md](../handoff/TEST-RESULTS.md).

This archive's `start-of-work/` and `end-of-work/` folders are a separate before/after screenshot record and must not be confused with the live read-only Cloudflare Preview audit artifacts. Local fixture captures can validate fixture behavior but are never proof of live Preview behavior. For live parity, verify the newest workflow artifact, its `sourceKind`, source commit, deployment SHA and `captureCompleted`, then open the actual screenshots. Do not overwrite these baseline folders just to make the archive appear current; update them only as part of a deliberate, documented capture cycle.

Older status paragraphs and run IDs were removed because they described an earlier blocked Access state and are superseded by the current handoff. Keep the distinction between fixture evidence and genuine Preview evidence explicit.
