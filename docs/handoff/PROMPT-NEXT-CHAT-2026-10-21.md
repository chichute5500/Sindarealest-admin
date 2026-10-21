# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST2 WEB TĨNH

Bạn tiếp quản công việc trực tiếp từ GitHub, không yêu cầu người dùng nhắc lại bối cảnh. Đọc file này trước, sau đó đọc `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`, `docs/prompts/NEXT-CHAT-PROMPT.md`, `docs/handoff/HANDOFF.md` và `docs/handoff/TEST-RESULTS.md`.

## Phạm vi và an toàn
- Repo: `chichute5500/Sindarealest-admin`.
- Nhánh web tĩnh: `fix/liquid-glass-audit-2026-10-19`.
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — chưa được phép merge.
- Production: https://sindarealest2.pages.dev/ — TUYỆT ĐỐI không sửa, deploy, merge, thay DNS, D1/R2, bindings, secrets hoặc Access policy.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Giữ nguyên logo/thương hiệu, catalog, SKU, giá, mô tả, mapping ảnh, API, auth, nghiệp vụ và backend. Được tự do thay đổi UI/CSS/font/layout trong phạm vi đã cho phép để gần ảnh tham chiếu hơn.
- Không dùng ảnh giả thay cho SKU thật; không dùng mock/local fixture làm bằng chứng live Preview.

## Trạng thái đã xác minh
- Commit code đã kiểm tra: `170304495869886a344b6fa02bdbaf6148d75100`.
- Deployment verifier xác nhận Preview deployment ID `d416f4c3-5be3-4717-8539-ee425582b1da`, đúng nhánh và exact SHA, deploy success.
- Source/tests PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732685
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732736
- Admin Preview Playwright PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732956
- Live capture run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732727
- Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732727/artifacts/12292874474
- 78 screenshots; 8/8 viewport-theme combinations; 12/12 product detail route/navigation/reload checks PASS; 0 console/page/same-origin HTTP errors, failed requests, broken image contexts, read-only violations and horizontal overflow.
- Audit vẫn FAIL vì `SD-GL052` không xuất hiện trong public verified product payload. Hero image ẩn theo fail-closed. Không tự thêm SKU/ảnh, không đổi D1 để làm xanh test. Cần dữ liệu SKU/ảnh thật được xác minh.

## Việc phải làm tiếp theo — đừng chỉ lập kế hoạch
1. Mở artifact 441 và xem ảnh live mobile/desktop, Light/Dark; so sánh trực tiếp với PNG tham chiếu gốc, không chỉ đọc số liệu.
2. Sửa nền satin: ảnh hiện tại còn dải cong lớn; chuyển dần sang nếp vải satin mảnh, có lớp sáng/tối nhẹ, giữ rõ chữ và sản phẩm. Áp dụng nhất quán mobile/desktop, Light/Dark; cập nhật cache-busting URL và regression tests khi asset đổi.
3. Kiểm tra screenshot các trạng thái cart/account/checkout sau khi tăng opacity drawer; bảo đảm nền phía sau không xuyên chữ nhưng vẫn có hiệu ứng kính.
4. Kiểm tra hero khi SKU SD-GL052 chưa có: không có khung ảnh trống; không dùng ảnh sản phẩm khác để lấp chỗ.
5. Sau mỗi vòng sửa: source/tests → deploy Preview → Playwright → live screenshot/audit; xem artifact thực tế, cập nhật tiến độ và file handoff. Nếu CI fail, đọc log rồi sửa đúng nguyên nhân.
6. Tiếp tục tự động, không dừng giữa chừng chỉ để báo tiến độ. Chỉ dừng khi cần người dùng xác minh/cung cấp dữ liệu SKU thật hoặc cần cấp quyền không thể tự làm.

## Báo cáo
Báo cáo ngắn bằng tiếng Việt: SHA mới, file đã đổi, workflow links, trạng thái live audit (không chỉ trạng thái workflow), khác biệt hình ảnh còn lại, blocker và bước tiếp theo. Không tuyên bố 100% khi còn fail hoặc chưa đối chiếu trực quan. Mọi cập nhật yêu cầu mới phải ghi lại trong master prompt và next-chat prompt trên GitHub.


## 2026-10-21 11:06 ICT — satin refinement pass 2

- Verified branch HEAD before this pass: `d78ddec509a11eb1efc7fe74b78053e8f52ea4e8`. Run #453 completed successfully: source tests, `npm run check`, Cloudflare Preview deployment metadata verification, and 78 live screenshots / 8 of 8 viewport-theme combinations. Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39489628054/artifacts/12296050211.
- Opened the actual artifact images, including Light/Dark mobile home, cart-with-item, checkout form, and account drawer. Commerce drawers cover the mobile bottom nav correctly in captured state images; cart-with-item has excessive empty vertical space but its controls remain readable. Checkout form is legible and contained. Do not report a bottom-nav overlap defect without new evidence.
- Visual discrepancy confirmed: background still has prominent sweeping curves on dark mobile. Narrowed the long fold/blur strokes in all four satin SVGs and reduced highlight stroke width; changed cache-busting in `public/index.html` and parity test from `20261021-2` to `20261021-3`. Latest change commits include `93d628a9033c7c397f16edd49ac555809264848a` (HTML/cache) and `64c46a4d36ba68e81ebae96cd78c9a22db9ef915` (parity test); the four asset edits precede these in branch history.
- New workflow for the updated HEAD must be checked before treating the changes as deployed or visually improved. Re-run source tests, deploy verifier, live screenshot capture, then open the resulting images and compare to original reference PNGs.
- Overall visual audit remains FAIL until exact SKU `SD-GL052` is present in verified public product data; do not substitute a different product image or mutate catalog data. No Production/main change, merge, DB/R2 write, or secret/policy change.
- Current rough project completion estimate: 55% (visual coverage + verification estimate, not code volume). Remaining: validate new satin pass in live Preview, inspect 360/390/768/1440 in Light/Dark, refine other confirmed visual differences, check account/cart/checkout interactions and mobile back behavior, and update this file, TEST-RESULTS.md, and next-chat prompt after each verified pass.


## 2026-10-21 — Preview target correction
- Live capture run #454 passed `npm test`, `npm run check`, local fixture audit, and deployment metadata diagnostics but stalled during the push-triggered live probe at step 14. Inspection found the workflow was probing the generic alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/` rather than the exact branch Preview documented for this work.
- Corrected all seven Preview URL references in `.github/workflows/liquid-glass-visual-preview.yml` to the known branch Preview `https://3ed49bcc.sindarealest2.pages.dev/` (commit `1d47c0b58e2e0f2ec51eeab127004f8671b4e010`). This only changes the non-production Preview target; it does not touch Production, `main`, or data/config.
- Next: verify the new Actions run against this exact URL, confirm its deployment metadata, inspect the new live screenshots and pixel diff, and continue visual fixes. Do not count the most recent SVG refinements as visually validated until this run completes.


## 2026-10-21 — Correct Preview alias after Cloudflare API verification
- Run #466 passed `npm test`, `npm run check`, local fixture screenshot audit, and Cloudflare deployment metadata query. Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542829610/artifacts/12320605588.
- Correction to the previous handoff note: `https://3ed49bcc.sindarealest2.pages.dev/` is an older deployment and is not present in current Cloudflare Pages deployment metadata. Screenshots from it do not validate the latest source; they show the old crocodile-scale backdrop. The live audit also reports no captured cart-with-item/checkout/gallery states and product cards still open `/san-pham/...` rather than the required `/sanpham/{category-slug}/{product-key}` route.
- Cloudflare API identifies the current branch deployment as commit `b5df036d5b79df705581d1a085d26bc79b708647`, deployment URL `https://6113550b.sindarealest2.pages.dev`, with stable branch alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Workflow now targets that stable alias in commit `51511e10101efdecc214e3ec7a6f174f074783fa`.
- Next: verify a new Actions run against the stable alias and ensure deployment SHA matches its captured source before comparing satin changes. Then fix confirmed route and commerce-state coverage/behavior. No Production/main changes, no PR #108 merge, no catalog fabrication; SD-GL052 remains fail-closed.
