# Admin 12-screen reference audit matrix

Updated: 2026-10-21 (ICT)  
Branch: `feature/admin-isolated-handoff-2026-10-20`  
Overall Admin progress: **50%** — weighted management estimate; unchanged after this test-only correction.

## Latest verification checkpoint — 2026-10-21 17:47 UTC

- Exact source/test SHA: `04889b6c6bc946483ea683e8345bac3b7cbf3838`; Validate Source [#39646606076](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39646606076) PASS and Admin Preview diagnostic [#39646606242](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39646606242) SUCCESS.
- Corrected a false-negative assertion for the custom “Hiển thị sản phẩm” switch: assert the visible `label.switch:has(#pPublished)` wrapper and checked checkbox state. Prior run #39646221204 failed only at screenshot-matrix step 9; the new run passes.
- This test correction does not accept any new screen family. The 12-screen matrix below remains PARTIAL/NOT TESTED as individually recorded; authenticated business QA remains BLOCKED/NOT TESTED.

## Evidence rules

- **PASS** means the screen was compared with the approved reference and has direct screenshot/test evidence.
- **PARTIAL** means a narrow source/fixture check passed but full reference parity is not accepted.
- **BLOCKED** means an external prerequisite prevents verification.
- **NOT TESTED** means no valid acceptance evidence is recorded.
- Synthetic fixture screenshots are not real product-data or authenticated-backend acceptance.
- Do not mark any screen PASS solely because `npm test` passes.

## Matrix

| # | Screen family | Status | Evidence / gap |
|---:|---|---|---|
| 1 | Login / unauthenticated shell | PARTIAL | Local Playwright previously checked login shell and masked password with mocked APIs; current approved-reference comparison not accepted. |
| 2 | Dashboard / summary | PARTIAL | Revenue panel has truthful no-data state; source and Preview diagnostic passed on exact SHA `06d689b6a97fa7bdb05258acb8435a6954d67309`. Not authenticated real-data QA. |
| 3 | Product list / search / filters | PARTIAL | Latest exact source/test SHA `b33e2d0e7b63feecddb1ad8dc66d88ddd3925ceb`: Validate Source #39644786469 PASS and Preview/Playwright #39644786736 SUCCESS; [artifact admin-preview-evidence-204](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39644786736/artifacts/12366373584) has 63 PNGs / 39 fixture metrics. Verified: name/SKU/category-label search, accessible live count/range, empty-state recovery/reset, category + fulfillment combinations, and published-status chips `Tất cả / Đang hiển thị / Đã ẩn` with counts + `aria-pressed`. Status filters use explicit `published` booleans only, not stock inference. Screenshots at 390×844 and 1280×800 were actually reviewed; the chips fit without horizontal overflow. Visual parity remains NOT ACCEPTED: reference card hierarchy/details are still different, and no actual price/stock values were added to fixtures. |
| 4 | Product editor / core fields | NOT TESTED | Need full field layout, focus order, validation, and reference comparison. |
| 5 | Product image gallery / image manager | PARTIAL | Horizontal thumbnail rail, prominent cover, responsive/light-dark fixture captures and last-thumbnail clearance passed on prior exact test tree `78a16b6d9fca91d7b080834f293e1690dc7c10cd`; synthetic images only, not real R2 photos or image-save proof. |
| 6 | Category / product classification | NOT TESTED | Need screen-level reference and safe fixture coverage. |
| 7 | Orders / fulfillment | PARTIAL | Exact-SHA fixture Playwright [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) on `4e660a0...` asserts QR-request and receipt-recording buttons stay disabled when price confirmation is still required and terms are not confirmed. Read-only synthetic order only; full authenticated flow remains NOT TESTED. |
| 8 | Payment QR / payment requests / ledger | PARTIAL | Latest fixture Playwright [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) on SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff` reruns accessible QR bank fields/manual verification checkbox, inactive-state disablement, unsaved-bank-details guard before confirmation/API write, and order payment-request/receipt disabled state before price/terms confirmation. Synthetic/read-only; mocked-D1 tests only, no live backend proof. |
| 9 | Customers / customer details | NOT TESTED | Need approved-reference comparison and safe fixture evidence. |
| 10 | Warranty / after-sales | PARTIAL | Source/fixture Playwright [#39637611768](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39637611768) on exact SHA `f2df0a923080135c5fe92ee2021c76137305699c` verifies list-first layout, search/filter behavior, collapsed accessible issue form and one-line mobile order ID. Artifact #197 (63 PNG / 39 metrics) reviewed at 390×844 and 1280×800; no errors or fixture writes. Reference parity NOT ACCEPTED: reference includes thumbnails/customer-date card details; issued-warranty API response lacks product image data. Not authenticated backend QA. |
| 11 | AI image review / grouping | NOT TESTED | Do not infer live model success from mocked tests; previous live AI test was blocked by provider daily quota. |
| 12 | Backup / restore / settings / responsive navigation | PARTIAL | Artifact `admin-preview-evidence-192` from [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) includes backup/settings fixture captures and a test asserting JSON export, JSON restore input and confirmation disclosure. 63 PNGs / 39 metrics; no export/restore action invoked, no live data or approved-reference parity acceptance. |

## Cross-cutting checks

| Check | Status | Notes |
|---|---|---|
| Light/dark themes | PARTIAL | Fixture/screenshot checks exist; complete reference parity is not accepted. |
| Narrow Android viewport / horizontal overflow | PARTIAL | Exact-SHA Playwright [#39632306588](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39632306588) reran the responsive/theme matrix on `0b9e8a2...`; 320–412px and tablet/desktop viewports are included, with no horizontal overflow assertions failing. Visual parity is still not accepted. |
| Keyboard / focus / accessible names | PARTIAL | The latest descendant run [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) on SHA `4e660a0...` reran product-editor ArrowLeft/ArrowRight/Home/End tab focus and `aria-selected`, dialog focus trap/restoration, order-detail focus and QR verification checkbox naming. Other screens still need per-module acceptance. |
| `prefers-reduced-motion` | PASS — BROWSER E2E ON SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff` | Admin Preview Playwright [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) reran the 3-test static browser suite successfully; reduced-motion emulation passed. Synthetic GET fixtures reject non-GET API calls; not authenticated backend QA. |
| Authenticated real backend | BLOCKED / NOT TESTED | Do not change Access or secrets to work around this. |
| Product image upload/save | DEFERRED_BY_OWNER | Do not resume without explicit owner authorization. |
| PRE/PRO migration | DEFERRED_BY_OWNER | Do not inspect remote schema through writes or execute migration/setup scripts. |

## Next execution order

1. Re-fetch current branch HEAD and exact-SHA Actions results; do not reuse old green runs as proof for newer code.
2. Obtain and compare the actual approved reference for screen family #5 and complete a focused gallery/accessibility audit using screenshots that are genuinely accessible.
3. Ensure the reduced-motion Playwright test runs in a workflow that executes `tests/e2e/admin-static-baseline.spec.js`; record the exact tested SHA and actual browser result.
4. Continue one screen family per iteration, with screenshot evidence and targeted ADMIN-only changes.
5. Update this matrix and handoff status only after verifying results.

## Safety boundaries

Only write to `feature/admin-isolated-handoff-2026-10-20`. Keep PR #111 and #108 open/unmerged. No edits to `main` or the static website branch; no merge/cherry-pick/force-push; no Production deploy; no secrets/Cloudflare Access changes or bypass; no remote D1/R2 writes; no SQL/migration/setup script execution; no TinyFish.


## Browser verification follow-up — 2026-10-21

- Playwright E2E on exact source/test SHA `131d6f395a94ef82b8d1d827fb5f000ab92df60e` passed in Admin Preview workflow [#39629076142](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39629076142). The `respects the reduced-motion preference across interactive ADMIN layers` test ran and passed; it uses only synthetic GET fixtures and rejects non-GET API calls.
- Root cause of the prior E2E failure on `979fa3500775c2b48af4db4f49e973b9c71eeda4`: test selectors incorrectly assumed `.dashboard-revenue` and `.dashboard-shortcut` lived under `#main`. In the actual rendered source those elements are inserted directly into `#appView`; the test now queries the actual classes and the dashboard assertion was aligned to `.dashboard-revenue`. No app business logic or CSS behavior was changed by this fix.
- The same run passed project check, automated tests, responsive/theme source Playwright matrix, and Preview login CSS signature. Artifact `admin-preview-evidence-188` (ID `12357698923`, 11,188,289 bytes, retained until 2026-11-04) contains 59 PNGs (16 login shell + 43 synthetic fixture screens), 36 fixture metrics and metadata. Metadata shows zero browser/console/request/HTTP errors and no attempted fixture writes. These are source/fixture captures, not authenticated business-flow evidence.
- Full 12-screen parity remains NOT ACCEPTED; authenticated backend QA remains BLOCKED / NOT TESTED. Overall estimate stays 48%.


## Keyboard-navigation follow-up — 2026-10-21 16:00 UTC

- Test-only commit `32c1f28662e7240353b0eda2f5daeaf22359257e` adds Home/End navigation assertions to the product editor tabs, including focus target and `aria-selected` state. Existing ArrowLeft/ArrowRight, dialog focus trapping, Escape close, and focus restoration checks remain.
- Exact source validation [#39630533326](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39630533326) and Playwright [#39630533169](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39630533169) both SUCCESS. Static baseline suite: 3 passed (30.5s); responsive/theme matrix and Preview CSS signature PASS. Artifact `admin-preview-evidence-189`, ID `12359007200`, has 59 PNGs and 36 synthetic fixture metrics.
- Keyboard/focus is now **PARTIAL**, not globally PASS: these checks cover selected editor and order-detail dialog behavior using synthetic fixtures. Full screen-by-screen keyboard/a11y review and all-12-screen visual parity remain NOT ACCEPTED.
- Overall progress remains 48%; authenticated real-backend QA is still BLOCKED / NOT TESTED. Image-save/PRE-PRO migrations remain DEFERRED_BY_OWNER.


## Keyboard-navigation follow-up — 2026-10-21 16:00 UTC

- Test-only commit `32c1f28662e7240353b0eda2f5daeaf22359257e` adds Home/End navigation assertions to the product editor tabs, including focus target and `aria-selected` state. Existing ArrowLeft/ArrowRight, dialog focus trapping, Escape close, and focus restoration checks remain.
- Exact source validation [#39630533326](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39630533326) and Playwright [#39630533169](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39630533169) both SUCCESS. Static baseline suite: 3 passed (30.5s); responsive/theme matrix and Preview CSS signature PASS. Artifact `admin-preview-evidence-189`, ID `12359007200`, has 59 PNGs and 36 synthetic fixture metrics.
- Keyboard/focus is now **PARTIAL**, not globally PASS: these checks cover selected editor and order-detail dialog behavior using synthetic fixtures. Full screen-by-screen keyboard/a11y review and all-12-screen visual parity remain NOT ACCEPTED.
- Overall progress remains 48%; authenticated real-backend QA is still BLOCKED / NOT TESTED. Image-save/PRE-PRO migrations remain DEFERRED_BY_OWNER.


## QR Settings client-side guard — 2026-10-21 16:11 UTC

- Exact test/source SHA `0b9e8a2f6a734ef328726c9c80e8e0e56328ce55`: Validate Source [#39632306385](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39632306385) and Admin Preview/Playwright [#39632306588](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39632306588) both SUCCESS.
- Added `settings-qr-unsaved-guard` fixture coverage for the Settings screen. It verifies the QR bank fields are available and the verification checkbox has an accessible name; with active QR false, deactivate remains disabled. Changing the bank name and ticking the manual verification checkbox must still show “Hãy lưu thông tin nháp trước khi kích hoạt QR.” and return before confirmation or API mutation.
- First attempt [#39631879451](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39631879451) failed because the test expected a blank status message after the previous viewport had already produced the warning. Test-only fix in `0b9e8a2...` navigates Products → Settings to create a fresh form per viewport. The retry passed; source logic was not changed.
- Artifact `admin-preview-evidence-191` ID `12360041542`: 63 PNGs, 47 fixture module images, 39 fixture metrics; 16 login-shell captures; no recorded browser/console/network/HTTP errors and no attempted writes. This confirms UI guard behavior under fixture-only input, not actual remote D1/R2 or authenticated business-flow behavior.
- QR screen status stays PARTIAL; screen #12 settings/backup status stays PARTIAL. The overall 12-screen visual parity remains NOT ACCEPTED and project progress remains 48%.


## Order-payment readiness and backup UI follow-up — 2026-10-21 16:18 UTC

- Exact tested SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff`; Validate Source [#39633278598](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278598) and Admin Preview/Playwright [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) both SUCCESS. Browser baseline 3 passed (25.5s), responsive/theme matrix and Preview login CSS signature PASS.
- Orders fixture now asserts that an order requiring price confirmation and lacking terms confirmation keeps `create-payment-request` and `record-payment` disabled, even while the UI displays the unpaid/needs-confirmation state. No actual request/receipt is submitted; non-GET API calls remain blocked.
- Backup/restore fixture now asserts the JSON download control, restore file input accepts JSON, and the confirmation disclosure is present. It does not click export or restore.
- Artifact `admin-preview-evidence-192`, ID `12360132558`, 11,895,011 bytes, expires 2026-11-04: 63 PNGs (16 login + 47 synthetic/read-only fixtures), 39 metrics, zero recorded browser/console/network/HTTP errors, no attempted writes or unexpected API paths.
- This advances screens #7 and #12 from NOT TESTED to **PARTIAL** for narrow UI safety and control coverage only. Payment/QR #8 remains PARTIAL; real authenticated backend/payment ledger still NOT TESTED. No screen family is accepted as fully matching the reference on the basis of fixture tests alone; overall 12-screen parity remains NOT ACCEPTED. Project progress remains 48%.


## Warranty / after-sales visual iteration — 2026-10-21 16:47 UTC

- UI commit `c5e89c59fa6f3d083e128196b9da26de772c9ffd` changed the warranty page to list-first with local search, all/in-progress/closed filters and a collapsed native disclosure. Screenshot-framing test commit `43509973e79010711f28b437940f052cd83996ce` resets scroll before capture; readability commit `64eef4eb269212585ecf3cc9b2cd8a2988be327c` shortens the placeholder and wraps order ID; exact tested SHA `f2df0a923080135c5fe92ee2021c76137305699c` makes the mobile order cell block-layout and asserts a single-line order ID.

- Validate Source [#39637611840](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39637611840) PASS and Admin Preview/Playwright [#39637611768](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39637611768) SUCCESS on the exact SHA. Browser baseline 3 passed (34.8s); Preview login CSS signature PASS.
- Artifact `admin-preview-evidence-197`, ID `12362111591`: 63 PNGs (16 login + 47 synthetic/read-only views), 39 metrics, zero browser/console/request/HTTP errors, no attempted writes or unexpected API paths. Raw PNGs remain in Actions artifact only.
- Reviewed `warranties__390x844__light.png`: heading/search/filter visible; order ID remains one line. Screen #10 advances to PARTIAL only; all-12-family parity remains NOT ACCEPTED and authenticated backend QA NOT TESTED / BLOCKED BY ACCESS.


## Screen #3 evidence update — 2026-10-21 17:26 UTC

- **Status: PARTIAL**, not accepted visual parity. Exact browser suite on `535e43121a612570dd84a353870bc118860c0c0d`; 3 Playwright tests passed in 35.8s and the configured Preview diagnostic passed.
- Reviewed actual artifact screenshots: `products__390x844__light.png` and `products__1280x800__light.png`, plus the approved composite reference image. In these fixture screenshots, no horizontal overflow is reported at either viewport; local module fixture data is synthetic/read-only.
- Implemented/tested: category-label search; accessible result-count/range announcement; honest no-match message; in-place reset that clears text/category/fulfillment and restores focus; category + fulfillment filter combination.
- Still open for #3: compare and improve reference-style published/status filters and card details without deriving stock state from null/incomplete values. No actual prices, inventory, images or product facts may be invented. Full 12-screen parity remains NOT ACCEPTED.


## Product screen #3 — second verified UI cycle (2026-10-21 17:34 UTC)

- Exact test/source tree `b33e2d0e7b63feecddb1ad8dc66d88ddd3925ceb`: Playwright 3 passed; Preview login/dashboard smoke 2 passed; CSS signature PASS. Artifact #204 contains screenshots for both light and dark themes and the approved reference image.
- The publication filter displays counts based on the active search/category/fulfillment subset. `published===true` maps to “Đang hiển thị” and `published===false` to “Đã ẩn”; missing/unknown values are not reclassified as hidden, and inventory is never used to infer either state.
- Screenshot review: `products__390x844__light.png` and `products__1280x800__light.png`. The filter chips are visible on both viewports. Remaining visual difference versus approved screen #3 includes row/card presentation and detail hierarchy, so visual parity stays NOT ACCEPTED.
