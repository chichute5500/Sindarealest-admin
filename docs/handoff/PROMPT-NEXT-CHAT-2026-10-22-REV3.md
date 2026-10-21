# HISTORICAL — DO NOT USE AS THE ACTIVE HANDOFF

Use the canonical prompt instead: [PROMPT-NEXT-CHAT-2026-10-22.md](PROMPT-NEXT-CHAT-2026-10-22.md). This REV3 file predates later workflow evidence and the user’s additional Liquid Glass icon/fly-to-cart requirements; retained only as history.

---

# PROMPT TIẾP QUẢN MỚI — 2026-10-22 (REV3)

Tiếp tục làm việc liên tục từ GitHub. Không yêu cầu người dùng kể lại, không dừng chỉ để báo cáo.

## Phạm vi
- Repo `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, PR #108 OPEN; không merge.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Code hiện tại: `c3863e09ffe624d023404075f556c388a91ef849` cộng commit sửa regression assertion `a8ad4e31ba690ef2fa53095323f3afc2845c25e6`. Verify branch HEAD trước khi hành động tiếp.
- Đọc `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/visual-audit-progress-2026-10-19.md` và prompt REV2 trước; REV3 là bản mới nhất.

## Kết quả audit live đã PASS (SHA trước)
Run [39669322205](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322205), artifact [12378174472](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322205/artifacts/12378174472), xác nhận deployment Preview exact SHA `064a19ae50bc0c7b24e3661f3f999b4879753cb2`:
- Live audit passed=true, 88 screenshots, 8/8 viewport-theme, 12 route checks.
- Overflow, console/page/HTTP errors và broken images đều 0.
- First-paint đã PASS: 20/20 frames, 5/5 ở mỗi context mobile-360-light/dark và mobile-390-light/dark; video 4/4; violations=0; hardFailures rỗng.
- Hero `/images/hero-sd-gl052.png` loaded/visible trên 8/8 contexts. Đừng tìm SKU, đừng hỏi gửi lại ảnh, đừng ẩn/thay hero hoặc sửa catalog.

## Mismatch thị giác còn lại
Ảnh detail product trong artifact live vẫn có các thanh đen dọc ở mép trái/phải. Đây là lý do sửa tiếp; không liên quan hero. Code commit `c3863e09ffe624d023404075f556c388a91ef849` mở rộng feather mask trên ảnh detail chỉ khi class `sd-white-background-keyed` đã được xác minh. Regression assertion của test ban đầu viết sai escaping; đã sửa tại commit `a8ad4e31ba690ef2fa53095323f3afc2845c25e6`. Workflow mới nhất:
- Validate: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858472
- Deploy Preview: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858262
- Liquid Glass visual: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670858379
Tại thời điểm viết, cả ba đang chạy; chưa tuyên bố pass.

## Tiếp theo
1. Poll workflow trên cho đúng SHA `a8ad4e31ba690ef2fa53095323f3afc2845c25e6`; đọc logs nếu fail.
2. Khi validate/deploy pass, kiểm tra deployment metadata xác nhận alias + branch + exact SHA. Mở artifact live mới và xem ảnh detail mobile 390×844 Light/Dark; xác minh thanh đen đã biến mất, không cắt giày, không tạo viền giả.
3. Đối chiếu 6 ô Liquid Glass, satin background, cart/account/checkout/gallery với PNG reference. Kiểm tra viewport 360×800, 390×844, 768×1024, 1440×900 Light/Dark và route/state bắt buộc.
4. First-paint đã pass ở SHA trước; không chạy lại không cần thiết trừ khi audit mới báo fail. Chỉ archive/manifest từ capture live thật. Ghi rõ SHA và run/artifact IDs.
5. Cập nhật ledger/prompt khi kết quả mới có; tính lại % sau visual review. Không dùng 70–72% cũ như số đo, không nói 100% nếu còn mismatch/hard failure.

Không làm Admin, không merge, không Production/main, DNS, D1/R2, bindings/secrets/Access, backend/catalog. Không thay logo chính thức, dữ liệu sản phẩm hay mapping ảnh. Người dùng chưa cần thao tác; tiếp tục tự động.
