# TEST RESULTS — EXACT-SHA EVIDENCE

> Current branch/next steps: [CURRENT-STATE.md](CURRENT-STATE.md). Never treat a result for one SHA as a PASS for another.

## Latest checkpoint (2026-10-22)
- Branch: `fix/liquid-glass-audit-2026-10-19`
- Source checkpoint: `fc406599e04475e232fad790efd03d46979a5a20`
- Validate source/tests: [run #39760902928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902928) — reported PASS.
- Preview deploy workflow: [run #39760903008](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903008) — reported PASS. This does not alone prove the exact deployment SHA; verify Cloudflare deployment metadata before attributing live screenshots to this commit.
- Admin Preview Playwright: [run #39760902960](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760902960) — reported PASS; read-only smoke only, not authorization to change Admin.
- Liquid Glass visual workflow: [run #39760903036](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39760903036) — final conclusion/artifact was not independently confirmed in the handoff refresh. Refresh before claiming PASS or launching a duplicate run.
- Docs-only handoff changes do not deploy storefront code because the Preview workflow ignores `docs/**`.

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
