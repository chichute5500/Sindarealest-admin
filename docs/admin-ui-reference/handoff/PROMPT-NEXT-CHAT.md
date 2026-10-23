# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Canonical entry point: read [`START-HERE.md`](START-HERE.md) first, then fetch live branch/PR/Actions state before continuing; historical checkpoint values are not authoritative without revalidation.

## Live checkpoint — 2026-10-23 06:04 UTC
- Writable branch HEAD at sync: `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`; exact-SHA Validate #39909118547 is **SUCCESS**. [Validate](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118547).
- Admin Preview #39909118491 is **IN_PROGRESS**, last observed at Chromium installation. [Check live result](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39909118491) before changing code. Previous Preview #39908380252 failed only the stale 320px fixture assertion (scroll width 284px, old requirement >288px); commit `a3f5f28025efb6ebfc308e3f11a6239565cdfff2` lowers the overflow threshold to >10px. Do not repeat the same threshold change; wait for the exact-SHA Preview evidence.
- Product gallery CSS was compacted and a 390×844 assertion now requires the entire upload zone to fit above the sticky footer. Review the new artifact/screenshot if the Preview completes; do not accept the gallery on source checks alone.
- PR #111 OPEN/unmerged at `a3f5f28025efb6ebfc308e3f11a6239565cdfff2`; PR #108 OPEN/unmerged/read-only at `0e4a1d5eef3662951b3ce182c8bbf154467a8866`; `main` unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`. Keep all guardrails below.
- B1 cleanup is already complete; do not redo its census/deletion/API-consolidation review. All 12 screens remain `PARTIAL_NOT_ACCEPTED`; backend QA `NOT_TESTED`; D1 `NOT_VERIFIED`; exact visual parity `NOT_VERIFIED`; Production `NOT_PERFORMED`.
## Historical checkpoint

## Historical checkpoint (2026-10-23 04:07 UTC; superseded by newest verified checkpoint above)
- Writable branch: `feature/admin-isolated-handoff-2026-10-20`. Live branch HEAD `1596bbd07c2257f19ecad9b2f77a7a45e9161cd0` is a Preview-generated evidence child; application/source-test SHA `000d3d84a9cf8c63144388f80879b5cc1439d161` passed Validate [#39898454195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454195) and Admin Preview [#39898454274](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274) on the exact same SHA. PR #111 remains OPEN/unmerged; PR #108 remains OPEN and READ-ONLY; `main` is unchanged at `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Artifact [admin-preview-evidence-369](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39898454274/artifacts/12478285219) records 132 unique generated screenshot PNGs (16 login-shell + 116 distinct module PNGs), 120 module capture entries, 112 fixture metrics; ZIP includes the approved reference PNG. Expanded responsive fixture coverage includes 320×640 and 360×800 alongside 390×844 and 1280×800; measured fixture layouts reported no horizontal overflow.
- The first expanded run [#39897883648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39897883648) reproduced a Screen 9 positioning regression at 320×640: toast/navigation clearance was 6 px (558/564) against an 8 px minimum. CSS was corrected from 82 to 84 px plus safe-area inset; exact-SHA Validate/Preview now pass. Seven fixture console lines are expected from deliberate 503 retry-path tests; this fixture run remains read-only and does not prove backend persistence.
- The approved composite [mobile reference PNG](https://github.com/chichute5500/Sindarealest-admin/blob/feature/admin-isolated-handoff-2026-10-20/docs/admin-ui-reference/admin-mobile-reference.png) was opened from artifact 369 for qualitative comparison. Exact pixel parity remains NOT_VERIFIED. Preview diagnostics verify only the login-shell CSS signature; authenticated business QA remains NOT_TESTED.
- Current live PR #111 has 406 changed files (+39,536/-212) and mergeable state `dirty`. PR #108 remains READ-ONLY at `63079aabf853d6b4d492942020a71603754046d8` (287 files). Do not merge, rebase, force-push, deploy, or write to `main`/PR #108.

## B1 — complete; don't repeat without new evidence
B1 scope/provenance review is complete. The current diff is 396 files; the two additions after the last census are generated compact Preview evidence (`report.md`, `preview-diagnostics.json`). Current path census: docs 342, functions 24, migrations 2, Admin HTML 1, scripts 4, tests 19, workflow 1, seed data 1, root 2. History has 163 SHA-keyed directories and 330 compact text/JSON evidence files plus README. No further deletion or API consolidation is justified without newly discovered consumer/provenance evidence.

## Continue real work
1. Continue the remaining screen acceptance audit using artifact admin-preview-evidence-374 (run 39906240167) and the approved reference where direct inspection is possible; fix only reproducible defects.
2. Authenticated business/backend QA remains `NOT_TESTED`; remote D1 schema/ledger `NOT_VERIFIED`; Production `NOT_PERFORMED`. Fixture tests do not count as backend evidence.
3. Obtain authorized Preview access before authenticated QA; never bypass Access or change secrets. Migration 0009, PRE/PRO, product-image/R2 and AI image grouping remain deferred by owner.
4. Do not make metadata-only commits to chase the evidence child SHA; fetch live refs at the start of the next chat.
## Non-negotiable boundaries
- Write only to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111/#108 OPEN/unmerged. Do not write to PR #108, `main` or the static website branch.
- No merge/rebase/force-push, Production deploy, setup/migration/deploy script execution, remote D1/R2/schema/ledger operations, secret/Access changes or Access bypass.
- No fabricated business data or unapproved API contracts.
