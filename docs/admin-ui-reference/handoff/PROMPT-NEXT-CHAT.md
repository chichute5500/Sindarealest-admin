# PROMPT NEXT CHAT — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub. Đọc [START-HERE.md](START-HERE.md) trước; không yêu cầu chủ dự án dán lại lịch sử. Luôn fetch live PR #111/#108, branch HEAD, merge base, changed paths và Actions trước khi thao tác.

Repository: `chichute5500/Sindarealest-admin`.

## Last verified checkpoint
- PR #111 OPEN/unmerged, branch `feature/admin-isolated-handoff-2026-10-20`; parent HEAD `73dfad5e35939da22dd37efd12bf8b06c09e7716`; 385 paths (+38829/−211), mergeable=false.
- PR #108 OPEN/unmerged, READ-ONLY at `7df19eb8c5a0a6cbdc76886b630905c89cf9c466`, 286 paths.
- Exact-SHA Validate [#39841964451](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39841964451) passed `npm run check` + `npm test` on `73dfad5e35939da22dd37efd12bf8b06c09e7716`. UI matrix + Preview diagnostic pass on source SHA `2eb6e7e9d6b1cf15002a7d67e299c713a4d32118` (102 PNGs, 78 fixture metrics).
- B1 cleanup complete; no additional safe deletion/merge proven in reviewed payment/API slice. Payment endpoints have distinct auth boundaries; migrations 0008/0009 remain deferred only for remote application. Broader provenance audit remains PARTIAL.
- Product progress 50% PROVISIONAL; 12 screens PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED; D1 schema/ledger NOT_VERIFIED; Production deployment NOT PERFORMED.


## Next task
1. Read `current-status.json`, `latest-test-results.json`, `LATEST-STATUS.md`, `12-SCREEN-REFERENCE-AUDIT.md`, `PR-111-SCOPE-AUDIT.md` and `history/README.md`; fetch live state first.
2. Continue provenance review of remaining runtime/API/migration/setup/workflow files. Delete only files proven unused and without safety/audit value; preserve required Admin/payment contracts and owner-deferred boundaries.
3. Do not edit `public/index.html`, `main`, PR #108 or the static branch. Keep PR #111 and #108 OPEN/unmerged.
4. No merge, force-push, Production deploy, Cloudflare Access bypass, secret access, remote D1/R2/schema/ledger operations, or setup/migration/deploy scripts. Migration 0009, PRE/PRO and R2/product-image save remain DEFERRED_BY_OWNER; AI grouping requires an owner-approved API/UX contract.
5. After each checkpoint, synchronize the handoff, read it back, refetch HEAD/PR/Actions and continue working. Do not increase progress without acceptance evidence.
