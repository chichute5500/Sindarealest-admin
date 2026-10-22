# ADMIN test evidence history

## What stays in this folder

This directory retains compact per-run evidence: `report.md`, `metadata.json`, and/or `preview-diagnostics.json`. These records identify the tested source commit, Action run, pass/fail outcomes, and test boundaries. They are kept as a text audit trail.

## Screenshot storage policy

Do not commit generated Playwright screenshot matrices into this history directory. The prior tree contained 912 historical PNG screenshots across repeated runs; they made the ADMIN PR dominated by old generated evidence rather than source changes. Those screenshots have been removed from the current PR diff. The approved source reference, `docs/admin-ui-reference/admin-mobile-reference.png`, is not part of that removal and must remain in Git.

New full-resolution screenshots and metadata belong in the corresponding GitHub Actions artifact, as already configured by `.github/workflows/admin-preview-diagnostics.yml`. The latest successful matrix recorded before this cleanup is [run #39821242400](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39821242400), artifact `admin-preview-evidence-346` (102 PNGs; 16 login-shell captures, 86 read-only fixture screenshots, 78 fixture metrics). That artifact has a 14-day retention and is not authenticated backend acceptance.

## Evidence rules

- Keep the approved UI reference and application source files; do not replace the reference with a generated screenshot.
- Keep compact text/JSON records that explain historical test outcomes, including failures and Cloudflare Access blocks.
- Store full generated screenshot matrices in Actions artifacts, not in Git diffs.
- Never treat synthetic/read-only fixture captures as proof of persistent business data or authenticated backend behavior.
- The artifact's limited retention means it is temporary test evidence, not a permanent archive. The compact Git history records remain the long-lived audit trail.
