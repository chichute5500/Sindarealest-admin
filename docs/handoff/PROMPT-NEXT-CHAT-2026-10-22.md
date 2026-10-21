# CURRENT OVERRIDE — READ THIS FIRST (2026-10-22)

This canonical prompt supersedes the older REV2/REV3 scratch prompts. Read the current `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/visual-audit-progress-2026-10-19.md`, and `docs/icon-system-inventory.md`; reconcile by exact current branch HEAD and workflow evidence, not by dates or estimates alone.

## New user requirements — preserve and implement, not just document
The latest user additions are in `docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md` section XXII and `docs/icon-system-inventory.md`. They are new feature requirements and have **NOT yet been proven implemented**:
- Luxury Minimalism + Apple Liquid Glass. Glass surface `#eaf3fb`, main icon/text `#142a3c`, accent `#5c91b9`; heart is red only while favorited.
- No ripple. Pressed feedback is subtle inset/depressed glass and tint, then returns on release. Short, purposeful animation; respect `prefers-reduced-motion`.
- Favorite heart, cart badge, toast and every other icon state must match actual functional result; no fake success or visual-only state.
- One shared fly-to-cart effect for every actual add-to-cart entry point (listing/card, product detail, gallery/other add controls). Clone starts from the product image actually displayed/selected at click time, including alternate/back gallery image, uses correct product ID/SKU and selected variant where supported, and flies to the real header cart target. Never move/scale the source DOM or cause layout shift.
- Fly animation target 0.6–0.9s initially; on successful add only, subtle cart bounce, correct badge update and success toast. Animation must not trigger a second add, duplicate quantity, or gate business success. Handle rapid clicks, image load/error, scrolling/resizing, mobile/desktop, sticky/mobile header, and reduced-motion fallback. Clicking cart to open it must never add an item.
- Implement in small verified slices: (1) map all live icon/add/favorite/cart/toast interactions and reuse current logic; (2) basic icon press/state; (3) heart/badge/toast; (4) shared fly-to-cart. Add/adjust tests for correct displayed image/variant, exactly-once quantity, failed add, rapid clicks, no layout shift, responsive and reduced-motion. Run validation + Playwright and inspect actual Preview screenshots after each slice.
- Do not rewrite the whole file or create a parallel cart mechanism. Do not modify backend/API/schema/database/product data/source image mappings or Admin. This is SPECIFIED / NOT IMPLEMENTED-VERIFIED until actual code, tests and Preview evidence prove it.

## Exact scope and continuous-work rule
- Repo `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 remains OPEN and must NOT be merged.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Never touch Production/main, DNS, Admin branch, backend/API business behavior, D1/R2 data/config, bindings, secrets or Access policy.
- User says do not stop after reporting; report concise progress and continue automatically unless user action/permission/decision is genuinely required.
- Do not rerun tests already PASS without a reason. A PASS belongs only to the exact SHA/scope tested. Do not claim 100% while any acceptance item remains unverified.

## Latest known code/audit checkpoint
- Current branch HEAD at the time of this update was docs commit `9c8424e55e2abc738656f3aa1734c0f7878c5768`; the latest code commit in the recent visual-fix chain is `a8ad4e31ba690ef2fa53095323f3afc2845c25e6`. Fetch branch/PR HEAD and inspect newer commits before editing; never assume this checkpoint is still current.
- Validate [39670858472](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858472), Preview deploy [39670858262](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858262), and live visual preview [39670858379](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858379) all completed SUCCESS for exact code SHA `a8ad4e31ba690ef2fa53095323f3afc2845c25e6`. Artifact ID `12379757134`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858379/artifacts/12379757134. Do not equate workflow SUCCESS with visual parity; inspect the artifact screenshots and `visual-audit.json` before declaring the detail-image edge-bars issue resolved.
- Earlier exact-SHA live audit run [39669322205](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322205), artifact `12378174472`, passed 88 screenshots, 8/8 viewport-theme pairs, 12 route checks, 20/20 first-paint frames, video 4/4, zero overflow/errors/broken images. Hero `/images/hero-sd-gl052.png` was loaded/visible on 8/8 contexts. This evidence belongs to SHA `064a19ae50bc0c7b24e3661f3f999b4879753cb2`, not current HEAD.
- Hero image is a user-uploaded approved presentation asset, independent of catalog SKU. Never search the catalog again, request the image again, hide/replace the hero, or change catalog/mapping to make it display.
- Separate unresolved item in the main handoff: inspect full welcome startup videos and `firstPaintTimelines` for any reported ~100ms account flash. Static 200–300ms screenshots alone do not prove it is fixed. Preserve the earlier sampling fix and inspect evidence before changing the capture matcher.
- The product-detail feather mask was changed to remove black pillar bars without cropping the shoes. The latest run above passed its workflows, but inspect the latest real Preview artifact to verify visual result and update the evidence ledger.

## Next steps (execute, do not stop after reporting)
1. Fetch branch HEAD/PR HEAD and current workflows; inspect commits after the checkpoint.
2. Inspect artifact `12379757134`, deployment metadata and actual mobile Light/Dark detail screenshots. Confirm edge bars are gone without clipping shoes. Review any user-provided latest screenshots as evidence of what remains.
3. Review the complete handoff for additional requirements and reconcile stale contradictory notes; never omit the new icon/fly-to-cart specification above.
4. Inspect runtime DOM/source and inventory every add-cart/favorite/icon path; design minimal tests before changing source.
5. Implement and verify the new interaction requirements in small slices on Preview, alongside remaining storefront visual audit. Preserve hero, logo, product data, URLs and existing behavior.
6. Update this canonical prompt, HANDOFF, TEST-RESULTS, visual progress, icon inventory and applicable manifest after each evidence-bearing change. Record exact SHA, run URL, artifact ID and PASS/FAIL/UNVERIFIED. Mark REV2/REV3 as historical, not authoritative.

---

# PROMPT TIẾP QUẢN CHAT MỚI — SINDAREALEST2 — 2026-10-22 (CANONICAL; older sections are historical where superseded above)

Bạn tiếp tục công việc đang làm từ GitHub. Không yêu cầu người dùng kể lại bối cảnh, không tự dừng sau khi báo cáo; báo cáo ngắn rồi tiếp tục làm việc. Chỉ hỏi người dùng khi thật sự cần thao tác/quyết định/quyền truy cập.

## Nguồn sự thật và phạm vi
- Repo: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: đang OPEN; không merge.
- Code SHA checkpoint: `064a19ae50bc0c7b24e3661f3f999b4879753cb2`. Commit tài liệu mới có thể đứng sau code SHA; kiểm tra HEAD và các workflow mới nhất trước khi sửa.
- Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Đọc checkpoint trong `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/visual-audit-progress-2026-10-19.md` trước khi làm tiếp. Handoff là nguồn trạng thái, không chạy lại test đã PASS nếu không có lý do.

## Hero — ĐÃ GIẢI QUYẾT, KHÔNG QUAY LẠI SKU
Hero đang dùng ảnh trình bày được duyệt `/images/hero-sd-gl052.png`; audit live ở SHA `3988e651a441bec3d0420483de6d3a985b90f620` xác nhận loaded/visible trên 8/8 viewport-theme. Không tìm SD-GL052 trong catalog, không yêu cầu người dùng gửi lại ảnh, không ẩn/thay ảnh, không sửa product data hoặc mapping vì hero.

## Trạng thái mới nhất
- Validate source/tests PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322361
- Preview deployment PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669321794
- Admin Preview Playwright check PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669321616 — chỉ là workflow hiện có; không chỉnh Admin.
- Liquid Glass isolated visual preview cho code SHA checkpoint: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322205 — cần kiểm tra kết quả mới nhất, lúc cập nhật handoff còn đang chạy.
- Audit artifact cũ: run 39667095207, artifact ID 12376634539, SHA `3988e651a441bec3d0420483de6d3a985b90f620`, 88 screenshots; 8/8 viewport-theme; overflow/errors/broken images = 0. Đây là bằng chứng SHA cũ, không chứng minh HEAD mới.

## Blocker audit còn lại
Artifact cũ không PASS do `firstPaintCoverageComplete=false`: có 18/20 frame; thiếu mẫu +200ms và +300ms ở `startup-probe-mobile-390-dark`. Đây là thiếu coverage của phép đo, chưa chứng minh là lỗi UI. Không giảm tolerance hoặc xóa hard failure.

## Code changes cần xác minh trên live Preview
1. Commit `c9e5daf67f9b46903f3d466c5932b9c4e1baf92b`: `scripts/capture-cloudflare-preview.mjs` lấy RAF samples xuyên cửa sổ ~460ms (tối đa 40 frames), regression assertion trong `tests/website-screenshot-capture.test.mjs`. Matcher/tolerance giữ nguyên.
2. Commit `064a19ae50bc0c7b24e3661f3f999b4879753cb2`: `public/index.html` thêm feather mask mép ảnh detail khi `sd-white-background-keyed` đã được xác minh; `tests/storefront-reference-parity.test.mjs` được cập nhật. Không đổi URL ảnh, dữ liệu SKU, crop nguồn hay product mapping. Chưa coi là visual PASS trước khi xem ảnh live Light/Dark.

## Việc tiếp theo — làm liên tục
1. Kiểm tra kết quả run 39669322205, artifacts và deployment metadata; xác minh exact deployed source SHA.
2. Kiểm tra mobile-390-dark có đủ 5 first-paint samples, không còn thiếu +200ms/+300ms. Nếu fail, điều tra timestamps/matcher và sửa nguồn; không hạ ngưỡng.
3. Xem ảnh live mới của product detail Light/Dark: xác minh mask không cắt mép giày hoặc tạo viền lạ. Đối chiếu 6 ô Liquid Glass, satin background, cart/account/checkout/gallery với PNG reference.
4. Kiểm tra viewport 360×800, 390×844, 768×1024, 1440×900 trong Light/Dark cùng route/state bắt buộc. Giữ route `/sanpham/{category}/{product-key}`. Không dùng local fixture như bằng chứng live.
5. Chỉ cập nhật screenshot archive/manifest khi capture live thật được tạo. Cập nhật ledger với SHA, run/artifact IDs và trạng thái riêng cho source tests, deploy, live visual audit, first-paint coverage.
6. Tính lại % tiến độ sau khi kiểm tra ảnh live; không coi 70–72% cũ là số đo mới. Không tuyên bố 100% nếu còn hard failure.

## Không được làm
- Không Admin branch, không merge PR, không Production/main, DNS, D1/R2, bindings, secrets, Access, backend/catalog mutation.
- Không thay logo chính thức, không sửa dữ liệu/quan hệ ảnh sản phẩm thật.
- Không dừng chỉ để báo cáo. Nếu một workflow đang chạy, tiếp tục kiểm tra phần khác an toàn trong lúc chờ.
