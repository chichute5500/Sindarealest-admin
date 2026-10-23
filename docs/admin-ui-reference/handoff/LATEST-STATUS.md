# LATEST STATUS — SinDarealest Admin

## Latest verified handoff checkpoint
- Live branch/PR #111 HEAD: `83733513da6d3a28a13e773f479b596a4432df1f`. Validate [#39893834166](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39893834166) completed **SUCCESS on exact SHA `83733513da6d3a28a13e773f479b596a4432df1f`**; dependency audit, project integrity and automated tests passed.
- PR #111 remains OPEN/unmerged, 396 changed files (+39,231 / -212), base main `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- PR #108 remains OPEN/unmerged/read-only; live observed head `7e8c33f52e9216ff07484133910479ea5a456225`, 287 files (+21,043 / -398). Do not write there.

## Latest verified source and Preview evidence
- Application/source/test SHA: `4ac7465539e746b7f37517327d7bf9bddcfa3285`.
- Validate [#39891441964](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891441964) **SUCCESS on exact SHA**: dependency audit, project integrity and automated tests passed.
- Admin Preview [#39891442082](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082) **SUCCESS on exact same SHA**. Artifact [`admin-preview-evidence-361`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39891442082/artifacts/12474998216) has 102 PNGs (16 login-shell, 86 read-only fixture screens) and 78 fixture metrics.
- Preview diagnostic `PASS_LOGIN_CSS_SIGNATURE` confirms the configured unauthenticated login-shell CSS signature only. The local matrix is read-only/synthetic fixture evidence; authenticated business persistence remains untested.
- Current branch HEAD at checkpoint: `620d7b07dd7f92aed8325846785c8b231b256e36`, a Preview-generated evidence-only child of source/test SHA `4ac7465539e746b7f37517327d7bf9bddcfa3285`. The checkpoint doc update that follows must receive one exact-SHA Validate check; then stop pointer-chasing.

## Concrete UI change delivered
- Screen 10 Settings: moved the separate QR payment panel below the public-price setting, welcome settings and watermark controls.
- Added a regression assertion in `tests/admin-liquid-glass-contract.test.mjs` to preserve this DOM order.
- The 390×844 light Preview screenshot shows the expected top order. QR draft/activate API, payment contracts and backend code were not changed.
- Persistence of website settings and actual QR upload/activation remain unverified.

## B1 — PR #111 cleanup/provenance
**COMPLETE.** All changed paths and main consumers/contracts were classified; no further deletion or route/helper consolidation is supported by evidence. Current PR diff is 396 files (+39,234 / -212): docs/evidence 342, Functions 24, migrations 2, Admin HTML 1, scripts 4, tests 19, workflow 1, seed 1, root 2.
- History contains 163 SHA-keyed evidence directories and 330 compact text/JSON report/metadata/Preview-diagnostic files plus README. Full screenshot matrices remain in temporary Actions artifacts.
- Previous cleanup removed 912 generated screenshot PNGs, 10 duplicate snapshots, stale prompt/static-only artifacts, an unreferenced ZIP and an empty viewer. Retain active files with proven consumers.
- `normalizeFulfillmentType` is canonical in `functions/_lib.js`; payment endpoints remain separate because authorization, exposure, caching and state transitions differ.

## Live repository boundaries
- PR #111 is OPEN/unmerged on `feature/admin-isolated-handoff-2026-10-20`; base `main` SHA `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- PR #108 is OPEN/unmerged/read-only; observed head `5a11a5264ab6186c36eac764dd7755c3b2c1bf9a`, 286 files (+20,602 / -398). Do not write there.
- All 12 screens remain `PARTIAL_NOT_ACCEPTED`; progress remains 50% PROVISIONAL.
- Authenticated backend QA: `NOT_TESTED`. Remote D1 schema/ledger: `NOT_VERIFIED`. Production: `NOT_PERFORMED`.
- Orders and Order detail need authorized authenticated workflow evidence. Exact pixel/reference parity is still `NOT_VERIFIED`.
- Migration 0009, PRE/PRO migration changes, product-image/R2 persistence and AI image grouping remain deferred by owner.

## Next
1. Validate this handoff refresh on its exact SHA once, then stop pointer-chasing.
2. Continue screen acceptance only where evidence can be inspected; exact reference parity remains NOT_VERIFIED and all 12 screens remain PARTIAL_NOT_ACCEPTED.
3. Obtain an authorized authenticated Preview path before testing persisted business workflows. No merge/deploy/remote-data operations.

## Kết quả kiểm thử tự động gần nhất

- Tested commit: 44ba439f34db4fa6fba9cf97ce7837c3c087d77d
- Run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39895792200
- npm run check: PASS
- npm test: PASS
- Local source Playwright matrix: FAILURE; 63 real PNGs captured in artifact admin-preview-evidence-363 (not committed to Git).
- Deployed Preview: success.
- Source screenshot matrix: 63 real PNGs; login shell: 16; read-only fixture module screens: 47; fixture metrics: 43.
- Fixture screens use synthetic/read-only data and do not prove authenticated business-data workflows; those remain NOT TESTED.
- Production deployment: NOT PERFORMED.
