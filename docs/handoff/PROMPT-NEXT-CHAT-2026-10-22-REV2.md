# HISTORICAL — DO NOT USE AS THE ACTIVE HANDOFF

Use the canonical prompt instead: [PROMPT-NEXT-CHAT-2026-10-22.md](PROMPT-NEXT-CHAT-2026-10-22.md). This REV2 file predates later workflow evidence and the user’s additional Liquid Glass icon/fly-to-cart requirements; retained only as history.

---

# PROMPT TIẾP QUẢN MỚI — 2026-10-22 (REV2)

Tiếp tục làm việc liên tục trên storefront branch; không dừng sau báo cáo. Không hỏi người dùng kể lại bối cảnh.

## Source of truth
- Repo `chichute5500/Sindarealest-admin`
- Branch `fix/liquid-glass-audit-2026-10-19`; PR #108 OPEN, không merge.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Code SHA audit PASS gần nhất: `064a19ae50bc0c7b24e3661f3f999b4879753cb2`.
- Code HEAD mới nhất cần xác minh: `c3863e09ffe624d023404075f556c388a91ef849`. Đã sửa mask mép ảnh detail sau khi xem artifact live cho thấy thanh đen vẫn còn. Không coi SHA mới PASS trước khi workflow xong.
- Handoff / test ledger / visual progress đã được cập nhật tại `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/visual-audit-progress-2026-10-19.md`; prompt trước: `docs/handoff/PROMPT-NEXT-CHAT-2026-10-22.md`.

## Bằng chứng mới nhất đã xác minh
Run [39669322205](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39669322205), artifact ID `12378174472`, có live audit PASS đúng deployment Preview SHA `064a19ae50bc0c7b24e3661f3f999b4879753cb2`:
- 88 ảnh live; 8/8 viewport-theme; 12 route checks.
- Overflow/error/broken image = 0.
- First paint PASS: đủ 20/20 frames; 5 frame mỗi context mobile-360-light/dark và mobile-390-light/dark; video coverage đủ 4/4; violations 0; hardFailures rỗng.
- Hero `/images/hero-sd-gl052.png` PASS loaded/visible ở 8/8 viewport-theme. Không quay lại tìm SKU, không hỏi gửi ảnh lại, không thay ảnh hero, không sửa catalog.
- Tuy nhiên ảnh product detail Light/Dark trong artifact vẫn cho thấy thanh đen dọc hai bên ảnh giày. Đây là mismatch thị giác còn tồn tại, không được coi là hoàn tất.

## Code change đang chờ audit
- Commit `c3863e09ffe624d023404075f556c388a91ef849`: cập nhật mask trên ảnh detail đã được phân loại canvas gần trắng; mép ngoài trong suốt đến 8.5%, fade tới 13%, vùng giữa giữ nguyên. Test `tests/storefront-reference-parity.test.mjs` cập nhật. URL ảnh, dữ liệu sản phẩm, crop nguồn và mapping không đổi.
- Workflow mới nhất:
  - Liquid Glass visual preview: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670568166
  - Validate: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670567875
  - Deploy: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39670567909
  - Admin Preview Playwright là workflow sẵn có; không chỉnh Admin.

## Việc tiếp theo — làm ngay, không dừng
1. Poll ba workflow ở trên cho SHA `c3863e09ffe624d023404075f556c388a91ef849`.
2. Lấy artifact; xác minh deployment metadata đúng branch + exact SHA.
3. Mở product-detail mobile 390×844 Light/Dark; kiểm tra thanh đen đã biến mất mà không cắt giày hoặc tạo viền. Nếu vẫn thấy, sửa CSS có căn cứ và chạy lại.
4. So sánh 6 ô Liquid Glass, satin background, cart/account/checkout/gallery với hai PNG reference. Kiểm tra viewport 360×800, 390×844, 768×1024, 1440×900 Light/Dark và các route/state bắt buộc.
5. Chỉ archive ảnh live thật; cập nhật manifest/ledger với run/artifact ID và SHA. Không chạy lại first-paint tests đã PASS trừ khi code mới làm audit liên quan fail.
6. Tính lại % tiến độ sau visual review; không dùng mốc cũ như kết quả đo và không nói 100% nếu còn mismatch/hard failure.

## Giới hạn
Chỉ storefront branch. Không làm Admin, không merge, không Production/main, DNS, D1/R2, bindings/secrets/Access, backend/catalog. Không đổi logo chính thức hay product data/mapping. Người dùng chưa cần thao tác; tiếp tục làm việc.
