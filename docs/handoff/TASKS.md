# TASK LEDGER — SINDAREALEST2

Current facts and next-step order: [CURRENT-STATE.md](CURRENT-STATE.md). This ledger contains open work and stable completed gates; older task narratives are retired to prevent stale statuses being mistaken for current state.

## Open work
| ID | Status | Next action / acceptance |
|---|---|---|
| VISUAL-PARITY | IN_PROGRESS | Inspect newest verified live Preview artifact against both original reference PNGs across all 8 viewport/theme pairs. Record each mismatch by route, viewport, theme and screenshot; fix only proven UI issues. |
| ICON-PARITY | IN_PROGRESS | Freshly open both icon reference boards and compare them against actual current Preview screenshots; historical notes alone do not close this gate. |
| PRODUCT-GALLERY-25 | UNVERIFIED | Read-only review of “Tuyển chọn 25” and multi-image detail pages; verify main image ↔ thumbnails and switching. Never change product/image mappings to improve screenshots. |
| EXACT-SHA-VERIFY | PASS | Run #39760903036 verifies deployed Preview branch and exact SHA `fc406599e04475e232fad790efd03d46979a5a20`; artifact #12418615814. Recheck later runs before any subsequent code changes. |
| HANDOFF-SYNC | PASS for docs checkpoint | Current state, prompt, handoff, test ledger and visual plan are synchronized. Recheck when facts change. |

## Latest verified audit evidence
- Exact deployed/audited SHA: `fc406599e04475e232fad790efd03d46979a5a20`; live run [#39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036), artifact [#12418615814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814).
- Machine summary: live Preview PASS, 128 screenshots, 8/8 viewport/theme pairs, 13 route checks, zero failed requests and hard failures. Visual archive comparison remains `COMPLETE_NEEDS_VISUAL_REVIEW`; do not mark visual parity complete until images are inspected.

## Stable prior PASS evidence (do not rerun without a reason)
- Gallery arrow press: 4/4 PASS in live audit #39756327625 for SHA `78b0a673a610501bfa4048df0ed614ff48246f97`.
- Fly-to-cart: 6/6 PASS; animation edge cases 2/2 PASS in the same audit/SHA.
- 128 screenshots and all 8 viewport/theme combinations were recorded in artifact [#12416207670](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625/artifacts/12416207670) for that historical SHA only.
- Validate, Preview deploy and read-only Admin smoke were reported PASS for source checkpoint `fc406599e04475e232fad790efd03d46979a5a20`: [Validate #39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928), [Preview Deploy #39760903008](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903008), [Admin smoke #39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960). Live visual workflow #39760903036 is now verified SUCCESS with exact SHA and artifact #12418615814; the artifact still requires manual visual review.

## Scope guard
No PR merge, Production/main deployment, Admin changes, backend/API/auth/schema/business logic changes, product data/SKU/price/image mapping changes, D1/R2/bindings/secrets/DNS/Access changes, or real checkout/payment testing. Keep `/images/hero-sd-gl052.png` visible. QR checkout remains fail-closed pending trusted backend confirmation/configuration.
