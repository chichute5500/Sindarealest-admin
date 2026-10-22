# TEST RESULTS — EXACT-SHA EVIDENCE

> Current branch/next steps: [CURRENT-STATE.md](CURRENT-STATE.md). Never treat a result for one SHA as a PASS for another.

## Latest verified checkpoint (2026-10-22 UTC)

# CURRENT CHECKPOINT — 2026-10-22 UTC

- Branch HEAD / PR #108 head: `eafa0d0b31723134727ba5f5933018e34f31854a` (documentation-only; PR remains OPEN, NOT merged).
- Latest verified storefront source, deployed Preview SHA and live-audit source SHA: `fc406599e04475e232fad790efd03d46979a5a20`.
- Validate/tests: [run #39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928) reported PASS.
- Preview deployment verification + live visual workflow: [run #39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036) SUCCESS; logs explicitly confirm `VERIFIED_PREVIEW_DEPLOYMENT`, branch match and exact commit SHA match.
- Latest artifact: [#12418615814 — sindarealest-liquid-glass-preview-853](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036/artifacts/12418615814). It reports local fixture audit PASS (58 screenshots, 235 fixtures, 20 responsive cases, 103 interaction checks, zero recorded errors/hard failures) AND live Preview PASS (128 screenshots, 8/8 viewport/theme pairs, 13 route checks, Access service token configured, zero failed requests/hard failures).
- Screenshot archive comparison state: `COMPLETE_NEEDS_VISUAL_REVIEW`. Workflow success does NOT mean visual parity is finished; real screenshots still require manual visual review against reference images.
- Docs-only commits do not trigger Preview deploy/live capture (`docs/**` ignored). Do not claim these docs commits redeployed storefront code.


- Validate source/tests: [run #39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928) — reported PASS for source checkpoint `fc406599e04475e232fad790efd03d46979a5a20`.
- Admin Preview Playwright [run #39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960) — PASS, read-only smoke only; not authorization to change Admin.
- Live audit has a green machine result, but the visual archive still says `COMPLETE_NEEDS_VISUAL_REVIEW`. Manual screenshot inspection remains open.

## Last fully documented live audit (historical evidence)
- Audited source SHA: `78b0a673a610501bfa4048df0ed614ff48246f97`
- Workflow: [run #39756327625](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625)
- Artifact: [#12416207670](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39756327625/artifacts/12416207670)
- Recorded coverage: 128 Preview screenshots; 8/8 viewport/theme pairs (360×800, 390×844, 768×1024, 1440×900 in Light/Dark); reported zero responsive overflow, console/page/HTTP/request/image errors and zero hard failures.
- Gallery arrow press: 4/4 PASS in detail/fullscreen gallery in Light/Dark; vertical center shift <=1px, subtle press scale and correct Next/Previous restoration.
- Fly-to-cart: 6/6 PASS; animation edge cases 2/2 PASS.
- These results apply to the SHA above only. A green result is not a substitute for inspecting screenshot images.

## Regression rules
- Do not rerun unaffected PASS suites.
- Rerun tests when the changed code/test definition intersects their coverage, the deployed environment changes, or an exact-SHA requirement demands new evidence.
- Record each result with commit SHA, workflow URL, conclusion, environment and artifact.
- Distinguish `PASS`, `FAIL`, `BLOCKED`, `UNVERIFIED` and `NOT TESTED`; do not turn unknown into PASS.
