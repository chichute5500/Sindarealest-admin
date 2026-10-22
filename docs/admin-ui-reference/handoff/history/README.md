# ADMIN test evidence history

## What stays in this folder

This directory retains compact per-run evidence: `report.md`, `metadata.json`, and/or `preview-diagnostics.json`. These records identify the tested source commit, Action run, pass/fail outcomes, and test boundaries. They are kept as a text audit trail.

## Screenshot storage policy

Do not commit generated Playwright screenshot matrices into this history directory. The prior tree contained 912 historical PNG screenshots across repeated runs; they made the ADMIN PR dominated by old generated evidence rather than source changes. Those screenshots have been removed from the current PR diff. The approved source reference, `docs/admin-ui-reference/admin-mobile-reference.png`, is not part of that removal and must remain in Git.

New full-resolution screenshots and metadata belong in the corresponding GitHub Actions artifact, as already configured by `.github/workflows/admin-preview-diagnostics.yml`. The latest successful matrix is [run #39840692976](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39840692976), artifact `admin-preview-evidence-352` (102 PNGs; 16 login-shell captures, 86 read-only fixture screenshots, 78 fixture metrics). It has a 14-day retention and is not authenticated backend acceptance.

## Superseded handoff snapshots

The duplicated `history/legacy-2026-10-22/` copies of `START-HERE.md`, prompts, status files, screen audit, and reference instructions were removed because the canonical live versions remain in the parent handoff folder and the snapshots contain stale SHAs. This cleanup does not remove per-run `report.md`, `metadata.json`, or `preview-diagnostics.json` records. The old `PROMPT-COMPLETENESS-AUDIT.md` was also removed; `START-HERE.md` is the single entry point and `PROMPT-NEXT-CHAT.md` is the active prompt.

## Evidence rules

- Keep the approved UI reference and application source files; do not replace the reference with a generated screenshot.
- Keep compact text/JSON records that explain historical test outcomes, including failures and Cloudflare Access blocks.
- Store full generated screenshot matrices in Actions artifacts, not in Git diffs.
- Never treat synthetic/read-only fixture captures as proof of persistent business data or authenticated backend behavior.
- The artifact's limited retention means it is temporary test evidence, not a permanent archive. The compact Git history records remain the long-lived audit trail.
