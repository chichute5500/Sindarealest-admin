# SinDarealest ADMIN — UI reference

This folder stores the approved mobile UI reference and the handoff instructions for the SinDarealest ADMIN redesign.

## Reference files
- `admin-mobile-reference.png` — visual reference image (1024 × 1536).
- `admin-mobile-reference.html` — self-contained HTML viewer with the image embedded.
- `reference-instructions.md` — rules for using the reference during implementation and QA.

## Branch separation — mandatory
- Static website branch, owned by the parallel static-site work: `fix/liquid-glass-audit-2026-10-19`.
- Dedicated ADMIN branch: `feature/admin-isolated-handoff-2026-10-20`.
- ADMIN code, tests, screenshots and handoff updates must be committed only on the ADMIN branch.
- Do not modify/commit to the static website branch, merge to `main`, or deploy Cloudflare Production as part of this task.
- The ADMIN branch was branched from the static website branch at separation time. Do not interpret this as permission to edit the public website. Do not auto-sync commits between branches.

## Important
These files are design references, not screenshots of the running application. Do not claim visual parity until real screenshots have been captured from the test ADMIN at matching viewport sizes and compared with the reference.
