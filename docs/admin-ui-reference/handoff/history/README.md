# ADMIN test evidence history

## What stays in this folder

This directory keeps SHA-keyed compact evidence reports: report.md, metadata.json, and/or preview-diagnostics.json. The files preserve source SHA, Action run, pass/fail outcomes, Preview diagnostics and test boundaries. Keep failure and skip evidence as well as successful runs; one older report-only folder records a failed screenshot attempt.

At the latest full-tree review, history contains 157 SHA-keyed evidence directories and 319 report/metadata/Preview-diagnostic text/JSON files, plus this README. It contains no generated PNG screenshots. The older phrase “318 compact records” was a stale/mislabelled prior evidence-file count.

## Screenshot storage policy

Do not commit generated Playwright screenshot matrices in this directory. The earlier tree contained 912 historical PNG screenshots across repeated runs; those were removed because they obscured source changes. The approved UI reference docs/admin-ui-reference/admin-mobile-reference.png is not part of that cleanup and must remain in Git.

The latest successful source screenshot/Preview run is [#39847591916](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39847591916), artifact admin-preview-evidence-355 (102 PNGs: 16 login-shell captures, 86 read-only fixture/module screens, 78 fixture metrics). The artifact has a 14-day retention. It is temporary evidence, not authenticated backend acceptance.

## Superseded handoff snapshots

Duplicate history/legacy-2026-10-22 snapshots of START-HERE, prompts, status files, screen audit and reference instructions were removed because the canonical live files remain in the parent handoff folder and the snapshots held stale SHAs. The old PROMPT-COMPLETENESS-AUDIT.md was also removed; START-HERE is the one entry point and PROMPT-NEXT-CHAT is the active continuation prompt.

## Evidence rules

- Keep the approved UI reference and app source files; do not replace the source reference with a generated screenshot.
- Keep compact text/JSON evidence tied to its source SHA and Action run, including historical failures and Cloudflare Access blocks.
- Store complete screenshot matrices and detailed browser metadata in Actions artifacts, not in Git history.
- Never treat read-only fixture captures as proof of business-data persistence or authenticated backend behavior.
- Artifacts expire; compact history remains the durable audit trail.

