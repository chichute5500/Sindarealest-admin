# Admin 12-screen reference audit matrix

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T11:39:07+07:00

- **Nhánh ADMIN:** `feature/admin-isolated-handoff-2026-10-20`. HEAD trước checkpoint handoff: `eb0d2f6492e1e6f91accb0f8b0a301c9510d436e` (commit chỉ lưu report/evidence). **Source/test SHA:** `b503ade1d7b300c38bc2ef8ccb648733215339dd`.
- **Validate Source:** [run #39723373757](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39723373757) — **SUCCESS** trên đúng source/test SHA `b503ade1d7b300c38bc2ef8ccb648733215339dd`; `npm run check`, `npm test` PASS.
- **Admin Preview diagnostic / Playwright:** [run #39723373723](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39723373723) — **SUCCESS** trên cùng SHA. Local source Playwright **3 tests PASS** (44.8s); configured Preview login/dashboard smoke **2/2 PASS**; login CSS diagnostic `PASS_LOGIN_CSS_SIGNATURE`. Không phải full backend/business QA.
- **Artifact:** [`admin-preview-evidence-274`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39723373723/artifacts/12401304184), ID `12401304184`, 13,647,200 bytes. ZIP gồm 79 files và 76 PNG: **75 test screenshots** (16 login + 59 fixture) cùng 1 ảnh reference; 51 fixture metrics. Metadata `completed=true`; 0 page errors, 0 console errors, 0 failed requests, 0 HTTP errors, 0 attempted writes và 0 unexpected API paths.
- **Customers #9 — responsive regression bổ sung:** ảnh `320×640` và `360×800`, light/dark đã được mở/xem. Assertions cho document/body/main/table/card/cell bounds đều PASS; metadata cho biết `documentWidth=320/360`, không có horizontal overflow, table `scrollWidth == clientWidth`. Dữ liệu khách hàng vẫn là fixture; không tạo avatar/ảnh khách hàng giả. Visual parity vẫn **NOT ACCEPTED**.
- **Screen #4 Product editor/gallery:** keyboard reorder focus+Enter và responsive gallery `320×640`/`360×800` PASS trong chu kỳ trước; vẫn **PARTIAL**. **Screen #8 QR:** guard file-picker local-only/no implicit upload PASS; không upload thật, không lưu/kích hoạt/tắt QR; màn QR/ledger vẫn **PARTIAL**.
- **Screen #6 Category/product classification:** control assertions cho datalist, nhập danh mục mới, filter match/no-result/reset đã hiện hữu; screen-level reference parity chưa nghiệm thu. Không tạo route/API mới.
- **Tiến độ tổng thể: 50% — giữ nguyên.** Toàn bộ 12 nhóm vẫn **NOT ACCEPTED** về visual parity; full business CRUD/save/upload QA **NOT TESTED**. Giữ nguyên mọi `DEFERRED_BY_OWNER`.
- **PR #111 ADMIN:** `OPEN`, merged=`false`, current observed head `eb0d2f6492e1e6f91accb0f8b0a301c9510d436e`; **PR #108 static website:** `OPEN`, merged=`false`, head `f16acd5fe8ac5a7f8fbc2fb85dff4b440387e5c6`. Không merge, không đổi `main` hoặc static branch.
- **Bước kế tiếp:** mở rộng responsive fixture regression cho Warranty #10 tại `320×640` và `360×800`: tab filter, mã đơn/bảo hành, bounds và không tràn ngang; dùng fixture sẵn có, không dựng ảnh sản phẩm giả. Chạy exact-SHA Validate + Preview, mở ảnh/artifact và tiếp tục audit các màn chưa nghiệm thu.
- **Rào chắn:** chỉ ADMIN branch; không merge/cherry-pick/force-push/sync branches; không Production deploy; không đọc/đổi/bypass secrets hoặc Cloudflare Access; không remote D1/R2/SQL/migration/setup/deploy/infra; không TinyFish.
---

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T11:06:00+07:00

- **Nhánh:** `feature/admin-isolated-handoff-2026-10-20`. Source/test SHA đã xác minh: `2357cf6a3659758d62331f6cb65846410bc7ba43`; HEAD hiện tại trước cập nhật handoff là `1a300d97cb3a0832b445d967e315fd73c4ae5d41` (các commit sau chỉ lưu evidence/docs).
- **Validate Source:** [run #39720164328](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39720164328) — **SUCCESS**, đúng SHA `2357cf6a3659758d62331f6cb65846410bc7ba43`.
- **Admin Preview / Playwright:** [run #39720164321](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39720164321) — **SUCCESS**, đúng SHA `2357cf6a3659758d62331f6cb65846410bc7ba43`.
- **Artifact:** [`admin-preview-evidence-270`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39720164321/artifacts/12400543626), ID `12400543626`, 68 PNG trong ZIP (16 ảnh login + 51 ảnh fixture + 1 ảnh reference được đóng gói), 43 fixture metrics; metadata `completed=true`, 0 page errors, 0 console errors, 0 failed requests, 0 HTTP errors, 0 attempted writes và 0 unexpected API paths. Các ảnh fixture dùng dữ liệu tổng hợp, không đăng nhập backend thật và không ghi dữ liệu.
- **Lỗi test đã sửa:** assertion dải ảnh trước đây chạy sau khi xóa ảnh, làm dải chỉ còn 4 thumbnail và không còn vượt ngưỡng scroll. Đã chuyển kiểm tra overflow lên trước khi xóa, giữ kiểm tra nút “xuống” bị disable ở đúng thời điểm sau khi xóa. Commit test fix [`2357cf6`](https://github.com/chichute5500/Sindarealest-admin/commit/2357cf6a3659758d62331f6cb65846410bc7ba43); Validate và Preview đều xanh ở SHA này.
- **Preview diagnostic:** `PASS_LOGIN_CSS_SIGNATURE` — chỉ xác nhận CSS/điều hướng màn đăng nhập. Không được diễn giải thành QA đã đăng nhập thật; Cloudflare Access không bị bypass.
- **Tiến độ tổng thể: 50%**. Giữ nguyên vì sửa test và CI xanh chưa đồng nghĩa nghiệm thu 12 màn. 12-screen parity **NOT ACCEPTED**; authenticated backend/business QA **NOT TESTED**. Không merge PR #111/#108; không sửa `main`/nhánh static, không Production deploy, không chạm secrets/remote D1/R2/schema/migration/infra.
- **Bước tiếp theo:** tiếp tục audit gallery sản phẩm bằng fixture tổng hợp: alt text, trạng thái ảnh bìa, reorder/delete và accessible names; không bấm lưu/upload thật. Sau thay đổi tiếp tục chạy exact-SHA Validate + Preview, xem artifact và cập nhật/đọc lại đủ 7 tệp.

---

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T04:35:36+07:00

- Repo `chichute5500/Sindarealest-admin`; chỉ nhánh ADMIN `feature/admin-isolated-handoff-2026-10-20`. Exact source/test SHA `6dcbcdccb45d824095f5dd50f5f7c919ae72e77a`; branch HEAD khi ghi handoff `76769e55ac40d8cb8eff8ee099de15eebab30970` là evidence-only descendant.
- Validate Source [#39679652666](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39679652666) **SUCCESS** và Admin Preview/Playwright [#39679652720](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39679652720) **SUCCESS**, cùng exact SHA `6dcbcdccb45d824095f5dd50f5f7c919ae72e77a`.
- Artifact [`admin-preview-evidence-267`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39679652720/artifacts/12382874321), ID `12382874321`, 13,069,621 bytes: 68 PNG, 51 fixture screenshots, 43 metrics. ZIP metadata đã đọc: completed=true; 0 page/console/failed-request/HTTP errors, 0 attempted writes, 0 unexpected API paths.
- Mobile “Khác” menu: Escape đóng menu và focus trả về trigger; chọn “Cài đặt & sao lưu” đóng menu, đặt `aria-expanded=false`, trả focus về trigger và chuyển đúng nội dung; test sau đó quay về Tổng quan và mở menu lại. E2E còn kiểm tra Warranty/Settings menuitems, aria-controls, bounds và overflow ở mobile. Screenshot 390×844 light đã xem trực tiếp; artifact có theme/viewports khác.
- Notifications: Escape close/focus restore + viewport/no-clipping tests pass. Backup/Restore #12: mobile actions wrap đúng, note cảnh báo không tràn, file input ẩn; screenshot helper chụp đúng panel. Không export/restore thật, không API write.
- Screen #11 “AI image review/grouping” chưa có route/controls/API rõ ràng trong source hoặc tên file/module ở recursive tree. Không tự phát minh màn hình/endpoint; không gọi provider thật hoặc tiêu tốn quota. Cần feature contract/reference đã duyệt trước khi triển khai.
- Tiến độ giữ **50%**; 12-screen parity **NOT ACCEPTED**; authenticated backend/business QA **NOT TESTED**. PR #111/#108 OPEN/UNMERGED. Không sửa `main`/nhánh static, không merge, không Production deploy, không Access/secrets, không remote D1/R2/schema/migration/infra, không TinyFish.

---

---

---

---

---

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T03:55:41.155+07:00

- Chỉ sửa nhánh ADMIN `feature/admin-isolated-handoff-2026-10-20`; HEAD trước lần cập nhật handoff này `80fd27310aacb221894eb382efbbf3ef8cc82c07`; exact source/test SHA `e3e46b649c86346d2c014d12002b2b0c6b012020`.
- Validate Source [#39674335114](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39674335114) **SUCCESS** và Admin Preview/Playwright [#39674335123](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39674335123) **SUCCESS**, cùng SHA.
- Artifact [`admin-preview-evidence-259`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39674335123/artifacts/12381230471), ID `12381230471`: 64 PNG (16 login shell + 48 fixture) và 40 metrics. Metadata đọc từ ZIP: completed=true; 0 page/console/failed-request/HTTP errors, 0 attempted writes, 0 unexpected API paths. Preview `PASS_LOGIN_CSS_SIGNATURE` chỉ kiểm tra shell/CSS, không phải authenticated backend QA.
- Customer screen: thêm avatar chữ cái đầu được suy ra từ tên khách hàng có sẵn (không giả lập ảnh đại diện/không thêm dữ liệu), và E2E xác nhận initials + aria-hidden từng avatar; customer search theo tên/điện thoại/email/địa chỉ, no-result/reset đã có fixture coverage. Đã xem trực tiếp screenshot 390×844 light/dark và 1280×800 light. Reference yêu cầu ảnh đại diện và tab phân nhóm; API hiện không có ảnh, quy tắc “Mới/Thân thiết” chưa được xác nhận nên không bịa ảnh hay phân loại. Screen customer **PARTIAL**, reference parity chưa được chấp nhận.
- Hai lần E2E trước đó thất bại do assertion test mới: (1) regex split tên bị escape sai, (2) locator aria-hidden strict-mode áp vào 2 avatar; đã sửa cả hai và rerun thành công trên SHA `e3e46b649c86346d2c014d12002b2b0c6b012020`. Không phải lỗi dữ liệu/backend.
- Category controls #6 **PARTIAL — existing controls only**; không có trang quản lý danh mục riêng. Tổng tiến độ giữ **50%**; full 12-screen parity **NOT ACCEPTED**; authenticated business/backend QA **NOT TESTED**.
- PR #111/#108 vẫn OPEN/UNMERGED. Không sửa `main`/nhánh static, không merge, không Production deploy, không Access/secrets, không remote D1/R2/schema/migration/infra, không TinyFish.

---

## CHECKPOINT XÁC MINH MỚI NHẤT — 2026-10-22T03:43:17.921+07:00

- Chỉ sửa nhánh ADMIN `feature/admin-isolated-handoff-2026-10-20`; HEAD trước handoff update `d7c65c125685bab5c2e974ffcdb7b8cfb896d2db`, source/test SHA đã kiểm tra `e91b933f40aba30814b2b50590893c95ed5de1a5`.
- Validate Source [#39672585196](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39672585196) **SUCCESS** và Admin Preview/Playwright [#39672585229](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39672585229) **SUCCESS**, cùng exact SHA.
- Artifact [`admin-preview-evidence-256`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39672585229/artifacts/12379888318), ID `12379888318`, có 64 PNG (16 login shell + 48 fixture) và 40 metrics. Metadata được tải/kiểm tra: completed=true; 0 page/console/failed-request/HTTP errors, 0 attempted writes, 0 unexpected API paths. Preview diagnostic `PASS_LOGIN_CSS_SIGNATURE` chỉ xác nhận shell/CSS, không phải authenticated backend QA.
- E2E fixture/read-only mới: `#pCategory` datalist 8 options, manual custom category entry/restore; `#categoryBox` match Ví da/Thắt lưng, count, no-result và clear/reset. Không nhấn Save; không có non-GET API requests. CSS đã thêm khoảng cách 10px sau nhóm trường chính; ảnh Product editor 390×844 light/dark và Products 390×844/1280×800 đã được mở/kiểm tra.
- #6 Category/classification **PARTIAL — existing controls only**; không có trang quản lý danh mục riêng nên reference parity cho screen-family chưa được chấp nhận. Progress giữ **50%**; full 12-screen parity **NOT ACCEPTED**; authenticated business/backend QA **NOT TESTED**.
- PR #111/#108 vẫn OPEN/UNMERGED. Không sửa `main`/nhánh static, không merge, không Production deploy, không Access/secrets, không remote D1/R2/schema/migration/infra, không TinyFish.

---

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
| 3 | Product list / search / filters | PARTIAL | Latest exact-SHA tree `d7488c845202a695b18ea01ec5d87906b6e9bffa`: Validate Source [#39661154355](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154355) PASS; Admin Preview/Playwright [#39661154345](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154345) SUCCESS; [artifact `admin-preview-evidence-227`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154345/artifacts/12373068383). Inspected `products__390x844__light.png`, `products__390x844__dark.png`, and `products__1280x800__light.png`: all 3 fixture products and pagination fit in mobile view; no horizontal overflow; mobile title ellipsis retains a title attribute; price/stock are inline with an accessible SVG edit action; desktop table remains intact. Fixture-only evidence. Screen #3 remains PARTIAL/NOT ACCEPTED because whole-screen/reference parity and real authenticated data are not accepted. |
| 4 | Product editor / core fields | PARTIAL | Exact-SHA Validate [#39669112058](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669112058) and Preview/Playwright [#39669112068](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669112068) SUCCESS on `44778d91ff5f084a5bb89a166e97536bd4f42b9d`; artifact `admin-preview-evidence-254` (12378134004) inspected at product-editor mobile light/dark 390×844 and desktop 1280×800. Price/stock align; concise placeholder fits and title keeps full guidance. Fixture tests cover tabs/keyboard/validation/no writes. Full reference parity and authenticated CRUD are not accepted. |
| 5 | Product image gallery / image manager | PARTIAL | Horizontal thumbnail rail, prominent cover, responsive/light-dark fixture captures and last-thumbnail clearance passed on prior exact test tree `78a16b6d9fca91d7b080834f293e1690dc7c10cd`; synthetic images only, not real R2 photos or image-save proof. |
| 6 | Category / product classification | PARTIAL — existing controls only | Exact-SHA fixture E2E on `e91b933`: `#pCategory` datalist (8 options), custom entry/restore, `#categoryBox` match for Ví da/Thắt lưng, result count/no-result/clear reset. No standalone category page; screen-family reference parity remains NOT ACCEPTED. No non-GET writes. |
| 7 | Orders / fulfillment | PARTIAL | Exact-SHA Validate [#39669112058](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669112058) PASS + Preview [#39669112068](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669112068) SUCCESS on `44778d91ff5f084a5bb89a166e97536bd4f42b9d`; artifact `admin-preview-evidence-254` reviewed at orders mobile light/dark 390×844 and desktop 1280×800. Search/status/payment filters, count/reset/no-result, compact mobile summary and collapsed management disclosure work on synthetic fixtures. API lacks item image snapshot; no fake thumbnail. Desktop table remains scrollable. Backend QA NOT TESTED. |
| 8 | Payment QR / payment requests / ledger | PARTIAL | Latest fixture Playwright [#39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) on SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff` reruns accessible QR bank fields/manual verification checkbox, inactive-state disablement, unsaved-bank-details guard before confirmation/API write, and order payment-request/receipt disabled state before price/terms confirmation. Synthetic/read-only; mocked-D1 tests only, no live backend proof. |
| 9 | Customers / customer details | PARTIAL — fixture only | Exact-SHA Playwright on `e3e46b6`: search by name/phone/email/address, no-result/reset, derived initials avatar and `aria-hidden` checked. Artifact `admin-preview-evidence-259` inspected at 390×844 light/dark and 1280×800 light. Reference has photo avatars and customer-segmentation tabs; API has no avatar image and no confirmed rule for “Mới/Thân thiết”, so do not fake either. Reference parity and authenticated customer data remain NOT ACCEPTED/NOT TESTED. |
| 10 | Warranty / after-sales | PARTIAL | Exact-SHA E2E on `08f2525`: read-only search/no-result, filter state, issue-form disclosure and field constraints. Artifact `admin-preview-evidence-260` reviewed at 390×844 light/dark; the three filter tabs now fit on one row without clipped labels. Reference product thumbnails are not fabricated because the source API lacks matching image data; full reference parity/authenticated QA NOT ACCEPTED. |
| 11 | AI image review / grouping | BLOCKED — feature contract/source route missing | Static inspection of `public/admin/index.html` and recursive Git tree found no AI-image-review/grouping route, controls or dedicated module file. Do not invent UI/API or call live provider; require approved feature contract/reference. |
| 12 | Backup / restore / settings / responsive navigation | PARTIAL | Exact-SHA E2E on `94c9fb6` checks panel bounds, action text wrapping, safety note and hidden JSON input; screenshot targets the panel. Mobile More/Khác E2E on `6dcbcdc` verifies Warranty/Settings, aria state, viewport fit, Escape, focus restoration and actual Settings navigation. Artifact `admin-preview-evidence-267` includes 390×844 light/dark and responsive matrix. No export/restore action or API write. |

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


## Continuation checkpoint — 2026-10-22 — product-list fulfillment detail

- Branch scope remains `feature/admin-isolated-handoff-2026-10-20` only. New source commit: `330f4bbaae11c0dd3bdbb61a01b75d5462d3201b` (`public/admin/index.html`); regression-test commit: `7948a320c3fd38a7f73d061de6ca6e3251b72789` (`tests/e2e/admin-static-baseline.spec.js`).
- Screen #3 product list now renders the existing fulfillment classification as a compact, semantic chip rather than plain secondary text. It explicitly distinguishes `Hàng có sẵn`, `Hàng đặt riêng`, and `Chưa phân loại`; unclassified uses a dashed neutral treatment. No price, inventory, SKU, publication state, or product fact was fabricated, and no API/data behavior was changed.
- Added fixture assertions for all three chip states using synthetic read-only products. These assertions are committed but **must not be marked PASS until Actions runs on the exact current source/test SHA are observed**. A connector query for PR-associated runs returned no run at the time of this checkpoint; validation is pending, not assumed.
- Overall progress remains **50%**. This bounded visual change is not acceptance of screen #3 or all-12-screen parity. Authenticated business/backend QA remains NOT TESTED/BLOCKED; image-save/R2 and PRE/PRO migration remain DEFERRED_BY_OWNER.
- Next: re-fetch current branch/PR state and Actions. Verify source and Preview/Playwright on exact SHA; inspect the new product screenshots at 390×844 and 1280×800 in light/dark. If checks fail, fix the cause without weakening assertions. Update progress only if screenshot review and evidence justify it.
- Safety unchanged: PR #111/#108 remain open/unmerged; no Production deploy, no edits to `main` or static branch, no Access/secrets changes, no remote D1/R2 or migrations, and no TinyFish.

## Verified checkpoint — 2026-10-22 01:58 +07

- Exact application/test SHA: `c18736b70d0035769408ce3190a6fb729ccd75fd`. Validate Source [#39656347891](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39656347891) and Admin Preview/Playwright [#39656348109](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39656348109) both **SUCCESS** on the exact same SHA.
- Mobile product-list fixes and matching tests are green. Evidence: 64 responsive/theme screenshots and 40 synthetic/read-only fixture metrics. Authenticated business/backend QA remains NOT TESTED/BLOCKED by Access; no production deployment.
- Overall progress remains **50%**. Screen #3 and 12-screen visual parity are NOT ACCEPTED; image-save/R2 and PRE/PRO migrations remain DEFERRED_BY_OWNER.
- Next: re-fetch branch HEAD and CI, inspect reference-vs-actual screenshots at 390×844 and 1280×800 in light/dark, continue substantive UI parity work and update handoff docs after verified cycles. Keep PR #108/#111 open; no Production, Access/secrets, D1/R2, migrations, main/static branch edits, or TinyFish.


## Checkpoint note — 2026-10-22

Live branch checkpoint verification: HEAD was `3f50b4d14e890a4c7b1d2b679f364f322fc3933c`; exact-HEAD Validate source and tests run [#39657885958](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39657885958) succeeded. This does **not** establish visual acceptance. Keep screen parity incomplete until actual reference screenshots are inspected at 390x844 and 1280x800 in light and dark themes, and record only observations actually verified. Progress remains 50%; PR #111/#108 remain unmerged.

## Iteration continuation — 2026-10-22T02:14:21.414+07:00

- Baseline artifact `12371792374`, source SHA `c18736b70d0035769408ce3190a6fb729ccd75fd`, was opened and visually compared with `admin-mobile-reference.png` at its product screen. The before-change product screenshots inspected were 390×844 light/dark and 1280×800 light.
- Observed gap: mobile price/stock/edit occupied a separate row below the product identity, unlike the reference's denser product card. The ADMIN-only source/test changes are `8a2acf322f3c785716b0c0d27947f44bf9565727` and `a33bb596a1b2cf587f4f2cfb9af84d42592f6b24`; product values, API and data behavior remain unchanged.
- Screen #3 remains **PARTIAL / NOT ACCEPTED**. No post-change screenshot is available yet, so the new layout remains **PENDING / NOT VERIFIED**. Keep all 12 screen acceptance incomplete and progress at **50%**.
- Last successful validation before the change is [run #39658657454](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39658657454) on `b659a19838c1276de7c4bd9ef9edab2279369651`, not the edited SHA. Next: run exact-SHA validation and Preview/Playwright, inspect the new 390×844 light/dark and 1280×800 light screenshots, then update Screen #3 only if the evidence supports it.

## Latest screenshot review — 2026-10-22T02:30:43.029+07:00 (Asia/Ho_Chi_Minh)

## Verified continuation checkpoint — 2026-10-22T02:30:43.029+07:00 (Asia/Ho_Chi_Minh)

- Branch: `feature/admin-isolated-handoff-2026-10-20`. Tested application/test tree SHA: `d7488c845202a695b18ea01ec5d87906b6e9bffa`. Source density pass: `30608b533014f2b5c2eb48110d29c8731b8bbe4c`; Playwright measurement/assertion update: `339bddc64618058a72626091569e72f6fb7c5806`; aligned ADMIN regression contract: `d7488c845202a695b18ea01ec5d87906b6e9bffa`.
- Exact-SHA CI: Validate Source [#39661154355](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154355) **PASS**; Admin Preview diagnostic + Playwright [#39661154345](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154345) **SUCCESS**. Both checked out `d7488c845202a695b18ea01ec5d87906b6e9bffa`. The earlier failures on `8a2acf3`/`a33bb59` and `30608b5` were stale CSS-contract expectations; these were repaired and the final exact-SHA workflows are green.
- Evidence artifact: [`admin-preview-evidence-227`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39661154345/artifacts/12373068383), artifact ID `12373068383`. It contains 64 PNGs: 16 login-shell captures, 48 read-only synthetic fixture-module captures, and 40 fixture metrics. PNGs live in the Actions artifact, not in Git.
- I opened the approved `admin-mobile-reference.png` and current `products__390x844__light.png`, `products__390x844__dark.png`, `products__1280x800__light.png`, and `orders__390x844__light.png`. For product-list screen #3, 390×844 light/dark show all 3 fixture cards plus pagination without horizontal overflow; product title is one line with a `title` attribute, price/stock facts are inline, and the mobile edit control is an accessible SVG button. At 1280×800 the desktop table layout remains intact. This is **PARTIAL evidence, not full reference acceptance**: keep screen #3 PARTIAL/NOT ACCEPTED and all-12-screen parity NOT ACCEPTED.
- Automated evidence: `npm run check` PASS; `npm test` PASS; Chromium install and source screenshot matrix PASS; Preview CSS signature PASS. The run reports zero page errors, console errors, failed requests, HTTP errors, unexpected API paths, and fixture write attempts. The preview/login signature is not proof of authenticated business workflows.
- No product data, API semantics, authentication, real business records, D1/R2, Access, secrets, Production deployment, or PR merge was changed. Authenticated business/backend QA remains **NOT TESTED**. PR #111 and #108 remain OPEN/UNMERGED.
- Overall progress remains **50%**: automation and one screen-family iteration improved, but 12-screen visual acceptance, several screen families, and authorized real backend QA remain incomplete.
- Next safe task: inspect the orders list at 390×844 against reference screen #6, implement a focused ADMIN-only mobile card layout if justified, add E2E regression checks, run exact-SHA Validate Source + Preview/Playwright, open the new screenshot artifact, then update and re-read all seven handoff files.


## Screen #6 — orders list continuation (2026-10-22)

- Code/test SHA validated: `214dd104c17e3837166fac77f8f2106d1a25ffeb`; Validate Source [#39662986446](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39662986446) and Preview/Playwright [#39662986425](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39662986425) both SUCCESS.
- Improvement: mobile order card keeps the primary summary compact; per-item price inputs and management/payment actions are inside a labelled disclosure that starts collapsed at ≤680px. Desktop hides the disclosure label and leaves controls expanded. Regression tests check toggle behavior, price visibility and payment safety guards.
- This acceptance note is historical and is superseded by the verified Orders/Fulfillment screen #7 visual review below (artifact `admin-preview-evidence-240`). Do not infer acceptance for screen #6 / Category and product classification, which remains NOT TESTED.
- Overall project progress remains 50%; 12-screen parity NOT ACCEPTED; authenticated backend QA NOT TESTED.

## Latest verified Orders/Fulfillment visual review — 2026-10-22T02:53:48.575+07:00

- Tested SHA: `8d4009f785cc89ff0ff5575460aacac8d2119746`; Validate Source [#39664727740](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39664727740) PASS; Preview/Playwright [#39664727558](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39664727558) SUCCESS.
- Opened artifact [admin-preview-evidence-240](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39664727558/artifacts/12377312578): `orders__390x844__light.png`, `orders__390x844__dark.png`, `orders__1280x800__light.png`. Mobile card is summary-first; details collapse on all viewports; desktop row remains compact with the existing single price field in the product column.
- 64 PNGs are stored in the Actions artifact; 16 login-shell and 48 fixture-module screens with 40 metrics. Zero page/console/request/HTTP errors and no non-GET fixture writes. This is synthetic/read-only coverage, not live backend QA.
- Screen #7 remains PARTIAL / NOT ACCEPTED; all 12 screens NOT ACCEPTED; progress remains 50%. Next: select the next unaudited screen family in the matrix.


## Verified checkpoint — 2026-10-22T03:25:42.193+07:00

- Tested source/test SHA `44778d91ff5f084a5bb89a166e97536bd4f42b9d`, Validate #39669112058 and Preview #39669112068 SUCCESS; artifact `admin-preview-evidence-254` (12378134004) inspected.
- Screen #4 Product editor PARTIAL; #7 Orders PARTIAL; #6 Category/classification NOT TESTED as a distinct screen family. No categories route exists: current logic uses `#pCategory` and `#categoryBox`.
- Fixture-only checks; full 12-screen parity NOT ACCEPTED, authenticated business QA NOT TESTED, overall progress 50%.
- Next: safe fixture tests for current category options/manual entry/list filter. Do not create route/API or save data.
