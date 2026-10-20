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

## Current status

The manifest is the source of truth. Read-only fetches and GitHub Actions Playwright run `39352778226` confirmed that the supplied Preview redirects to the Cloudflare Access login host before storefront content renders. That direct probe produced zero screenshots; no live Preview baseline is verified. Local fixture captures remain artifact-only and must never be represented as deployed Preview screenshots. A user-authorized session or Preview-only Access permission is required; never weaken Production Access.
