# SinDarealest ADMIN — UI reference

This folder stores the approved mobile UI reference and handoff instructions for the SinDarealest ADMIN redesign.

## Reference files
- admin-mobile-reference.png — canonical approved visual reference (1024 × 1536); keep this source image.
- reference-instructions.md — rules for using the reference during implementation and QA.

The former admin-mobile-reference.html viewer was empty (0 bytes) and has been removed. Open the PNG directly; do not recreate or replace the approved reference with generated screenshots.

## Branch separation — mandatory
- Static website branch, owned by parallel static-site work: fix/liquid-glass-audit-2026-10-19.
- Dedicated ADMIN branch: feature/admin-isolated-handoff-2026-10-20.
- ADMIN code, tests, screenshots and handoff updates must be committed only on the ADMIN branch.
- Do not modify/commit to the static website branch, merge to main, or deploy Cloudflare Production as part of this task.
- The ADMIN branch was branched from the static website branch at separation time. Do not interpret that as permission to edit the public website. Do not auto-sync commits between branches.

## Important
The PNG is a design reference, not a screenshot of the running application. Do not claim visual parity until real screenshots have been captured from the test ADMIN at matching viewport sizes and compared with the reference.
