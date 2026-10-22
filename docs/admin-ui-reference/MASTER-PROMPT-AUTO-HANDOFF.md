# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

> **Single entry point:** read [`handoff/START-HERE.md`](handoff/START-HERE.md). Do not ask the owner to paste old prompts/history. Latest tested source/test SHA `4b2220d510a906882e4309df6969c0c43514c421`: Validate #39813340342 PASS; Preview #39813340309 PASS. [Artifact #12439794397](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39813340309/artifacts/12439794397) contains 102 PNGs / 78 fixture metrics. Mobile toast/navigation overlap is fixed and geometry-tested. All 12 screens remain PARTIAL_NOT_ACCEPTED; authenticated backend QA NOT_TESTED.

## Mission
Do real GitHub work, not only analysis/reporting. After each checkpoint continue to the next safe evidence-backed task; stop only if owner authority/access is truly required or no safe task remains.

## Repository / branch isolation
- Repo `chichute5500/Sindarealest-admin`.
- Only writable branch: `feature/admin-isolated-handoff-2026-10-20`, PR #111.
- Protected website/static branch: `fix/liquid-glass-audit-2026-10-19`, PR #108; read-only.
- Fetch live PR/branch HEAD and Actions before writing. Test SHA and docs-only HEAD are distinct.
- No merge, rebase, blind revert, cherry-pick, force-push or cross-branch write. Verify provenance before edits.

## Forbidden
- No Production deployment; no Cloudflare Access bypass; no secret access/exposure/change.
- No remote D1/R2 writes, migration, setup or deploy-script execution. R2 persistence and migration 0009/PRE/PRO are DEFERRED_BY_OWNER.
- No invented product/customer/order/price/stock/image facts or unapproved API routes/contracts.
- QR must not encode payment amount; manual payment confirmation follows `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md`.

## Visual / functional acceptance
- Reference: `docs/admin-ui-reference/admin-mobile-reference.png`; screen map: `handoff/12-SCREEN-REFERENCE-AUDIT.md`.
- Luxury-minimalist Liquid Glass, mobile-first Vietnamese UI, light/dark, no clipping/overlap, accessible focus/targets, preserve auth/business/API behavior.
- Viewports: 320×640, 360×800, 375×812, 390×844, 412×915, 768×1024, 1280×800, 1440×900.
- Status vocabulary: PASS, PARTIAL_NOT_ACCEPTED, FAIL, BLOCKED, NOT_TESTED, NOT_VERIFIED, DEFERRED_BY_OWNER.
- Green CI and synthetic fixtures are not authenticated backend QA or complete visual acceptance. Keep progress 50% PROVISIONAL until weighted product acceptance improves.

## Execution loop
1. Fetch live PR #111/#108, branch HEAD and Actions.
2. Read the canonical handoff and relevant source/reference/artifact.
3. Reproduce a concrete gap, make the smallest ADMIN-only change and add regression coverage.
4. Validate the exact SHA and inspect screenshots at matching viewport/theme.
5. Update state/test JSON, status, START-HERE, next-chat prompt, completeness/screen/scope audits and this master prompt together in one atomic commit per meaningful checkpoint; do not commit individual docs or write while Preview saves artifacts.
6. Read back changes, validate JSON, fetch live HEAD/PR, and continue safely.
