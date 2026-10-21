# PROMPT TIẾP QUẢN CHAT MỚI — SINDAREALEST2 — 2026-10-22

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
