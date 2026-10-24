# ADMIN test evidence history

## What stays in this folder

This directory keeps SHA-keyed compact evidence reports: `report.md`, `metadata.json`, and/or `preview-diagnostics.json`. They preserve source SHA, Action run, pass/fail outcomes, Preview diagnostics and test boundaries. Keep failure and skip evidence as well as successful runs.

At the checkpoint starting this handoff sync, history contains **158 SHA-keyed evidence directories and 323 report/metadata/Preview-diagnostic text/JSON files**, plus this README. It contains no generated PNG screenshots. The older 157/319 count predates the latest Preview run.

## Screenshot storage policy

Do not commit generated Playwright screenshot matrices in this directory. Earlier cleanup removed 912 historical PNG screenshots that obscured source changes. The approved UI reference `docs/admin-ui-reference/admin-mobile-reference.png` is not part of that cleanup and must remain in Git.

Latest successful source screenshot/Preview run: [#39887267725](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39887267725), artifact `admin-preview-evidence-357` (102 PNGs: 16 login-shell captures, 86 read-only fixture/module screens, 78 fixture metrics). Artifact expires 2026-11-06. It is temporary evidence, not authenticated backend acceptance.

## Superseded handoff snapshots

Duplicate legacy snapshots of START-HERE, prompts, status files, screen audit and reference instructions were removed because canonical live files remain in the parent handoff folder and snapshots held stale SHAs. START-HERE is the one entry point; PROMPT-NEXT-CHAT is the active continuation prompt.

## Evidence rules

- Keep the approved UI reference and app source files; do not replace the source reference with a generated screenshot.
- Keep compact text/JSON evidence tied to source SHA and Action run, including historical failures and Cloudflare Access blocks.
- Store complete screenshot matrices and detailed browser metadata in Actions artifacts, not in Git history.
- Never treat read-only fixture captures as proof of business-data persistence or authenticated backend behavior.
- Artifacts expire; compact history remains the durable audit trail.
