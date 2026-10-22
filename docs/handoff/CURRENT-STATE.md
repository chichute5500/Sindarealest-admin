# SinDarealest2 — CURRENT STATE
Updated: 2026-10-22 UTC. Read this file first in every new chat.

## Source of truth
- Repository: https://github.com/chichute5500/Sindarealest-admin
- Work branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, DO NOT MERGE.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Branch HEAD is intentionally not frozen in this file: the documentation cleanup adds docs-only commits. Fetch the branch and PR #108 HEAD live before every new work session; distinguish branch HEAD from deployed storefront SHA and audited SHA.
- Last source commit in this verified checkpoint: `fc406599e04475e232fad790efd03d46979a5a20`. Do NOT assume that a green deploy workflow alone proves the deployed SHA; inspect deployment metadata and audit source SHA separately.
- Recent workflow links: Validate #39760902928; Preview Deploy #39760903008; Admin Preview read-only smoke #39760902960; Liquid Glass visual workflow #39760903036. The first three were reported PASS for this SHA. The terminal result/artifact of #39760903036 was not independently confirmed while this handoff was written; refresh it before claiming a new live audit.
- Docs-only commits are excluded from Preview deploy/live-capture push triggers by workflow `paths-ignore: docs/**`. A docs-only handoff commit must not be presented as a new deployed storefront.

## Documentation cleanup checkpoint (2026-10-22)
- Canonical handoff order: this file → `HANDOFF.md` → `TEST-RESULTS.md` → `TASKS.md` → visual audit plan → [canonical new-chat prompt](PROMPT-NEXT-CHAT-2026-10-22.md).
- Dated prompts `PROMPT-NEXT-CHAT-2026-10-20.md`, `PROMPT-NEXT-CHAT-2026-10-21.md`, and `docs/prompts/NEXT-CHAT-PROMPT-2026-10-21-STATIC-WEB.md` are marked HISTORICAL; REV2/REV3 already direct readers to the canonical prompt. The master prompt now starts with an override saying old embedded checkpoints are historical only.
- `docs/website-screenshots/README.md` no longer presents the old blocked-Access/local-fixture run as current project status; it distinguishes the before/after screenshot archive from real live Preview audit artifacts.
- This is a targeted handoff cleanup, not a claim that every historical report in the repository is current. Old audit reports and packaging/deployment READMEs are retained for historical context; never use them to override this file or the current code/config. If a task depends on one, compare it against current code and platform metadata.
- After the documentation-only edits, fetch the live branch HEAD and PR head again. Documentation changes do not imply a new storefront deploy because `docs/**` is excluded from the Preview push trigger.

## Non-negotiable scope
- Storefront public UI only: HTML/CSS/JS, layout, icons, effects, responsive behavior and visual parity.
- Never merge PR #108; never deploy Production or change `main`, DNS, Admin branch/code, backend/API/auth/schema/business logic, product/catalog/SKU/price/image mappings, D1/R2, bindings, secrets or Access policy.
- Never submit a real checkout or test money transfers.
- Keep QR checkout fail-closed until trusted backend confirmation and receiver/payment configuration exist. Never fabricate QR, amount or paid status.
- The owner-supplied hero `/images/hero-sd-gl052.png` is settled and must remain visible. Do not search the catalog for SKU SD-GL052, hide, replace or delete this asset.

## Verified facts vs open work
- The prior live audit SHA `78b0a673a610501bfa4048df0ed614ff48246f97` / run #39756327625 / artifact #12416207670 is historical; the newer exact-SHA audit is run #39760903036 / artifact #12418615814 for `fc406599e04475e232fad790efd03d46979a5a20`.
- Gallery arrow press: 4/4 PASS in that audit (detail/fullscreen, Light/Dark; vertical center shift <=1px; press scale ~0.97; Next/Previous returns to original image).
- Fly-to-cart: 6/6 PASS and animation edge cases 2/2 in that audit. Preserve animation capture behavior; do not reopen without new contrary evidence.
- Visual parity is NOT complete. Must inspect real screenshots against `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` and `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Icon redesign is NOT declared complete until `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png` are freshly opened and compared against actual live Preview screenshots in the current audit artifact. A prior checkpoint says they were inspected, but this acceptance gate still needs explicit current evidence.
- Check “Tuyển chọn 25” and other multi-image product galleries for main-image/thumbnail consistency. Visual concern is UNVERIFIED; do not modify product/image mapping without trusted source evidence.
- Six Liquid Glass tiles must have three glass layers; do not blur the whole page. Review satin folds, header/logo/hero, trust section, catalog/search/cards, product detail/gallery, cart/account/checkout, Zalo, footer and 404 in all 8 viewport/theme pairs.
- Approximate progress: 88% is a planning estimate only, not an audit score. Recalculate from current evidence; never claim 100% while visual differences remain.

## Required viewport/theme matrix
360×800, 390×844, 768×1024, 1440×900 × Light and Dark = 8 combinations.

## Next actions (in order)
1. Fetch branch HEAD and PR #108 head; inspect commits since this checkpoint.
2. Run #39760903036 is now verified SUCCESS with artifact #12418615814; use this newest exact-SHA artifact as the visual-review source and check for later runs before further changes.
3. Open the actual artifact images and both reference PNGs; inspect all 8 combinations and record specific mismatches (route, viewport, theme, screenshot).
4. Open both icon reference boards and compare actual icon states. Fix only demonstrated mismatches.
5. Review “Tuyển chọn 25” image/gallery relationships read-only; no data or mapping changes.
6. For each confirmed UI mismatch: minimal fix → affected tests → Preview deploy → verify exact deployment SHA → live audit/artifact → inspect screenshots.
7. Update this file, `HANDOFF.md`, `TEST-RESULTS.md`, `TASKS.md`, `docs/visual-audit-progress-2026-10-19.md` and `docs/prompts/NEXT-CHAT-PROMPT.md` only when their facts change. Keep these synchronized.
8. Continue to the next useful action after reporting. Stop only for a real missing permission/data/user decision.

## Canonical document rules
- This file is the single current-state summary. Other handoff docs should link here and retain only evidence/history they uniquely own.
- Never copy an old SHA or percentage forward without re-verifying it.
- Keep the latest checkpoint at the top; label older entries HISTORICAL/SUPERSEDED, never let them conflict with current facts.
- Test results are scoped to exact SHA, test suite, environment and artifact. Do not rerun unaffected PASS tests.
