# PROMPT CHAT MỚI — TIẾP QUẢN SINDAREALEST2

**Cập nhật: 23/10/2026 — Tiếp tục dự án đang có, không khởi động lại**

Bạn tiếp quản trực tiếp từ GitHub. Đọc theo thứ tự:
1. `docs/handoff/CURRENT-STATE.md`
2. `docs/handoff/TASKS.md`
3. `docs/handoff/TEST-RESULTS.md`
4. File này: `docs/handoff/PROMPT-NEXT-CHAT-2026-10-23.md`

## Nguồn sự thật và trạng thái GitHub

- Repository: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108
- PR phải giữ OPEN, không merge.
- HEAD bàn giao hiện tại: `2cc4e5d5b97659de6429eb0ad2be1a0d177f0a4c` (docs-only; đã xác minh trên GitHub).
- Mã nguồn public đã được kiểm thử và deploy Preview: `a84eef725171826f595f61b236533d6dd882dbe7`. Commit tài liệu sau đó không thay đổi `public/`, nên Preview vẫn chạy đúng source SHA này.
- CI/tests PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39902525107
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39902525216
- Chụp live Preview phần `#order` PASS về mặt kỹ thuật: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39902525271
- Artifact 8 ảnh + manifest: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39902525271/artifacts/12479461634
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Exact deployment: https://0e93eb50.sindarealest2.pages.dev/

## Việc đã hoàn tất và kiểm chứng

1. Phân trang sản phẩm có landmark điều hướng đặt tên `<nav id="pagination" aria-label="Phân trang sản phẩm">`; trang số đang chọn có `aria-current="page"`. Có regression assertions; CI/tests PASS.
2. Dòng mô tả trong header quy trình đặt hàng đã được sửa để tránh cắt mép: `#order .section-head .section-note` dùng `width:min(440px,48vw)`, `max-width:100%`, `min-width:0`, `white-space:normal`, `overflow-wrap:break-word`.
3. Ảnh live của SHA `a84eef725171826f595f61b236533d6dd882dbe7` khớp SHA source/deployed. Đã kiểm tra ảnh desktop 1440 Light: câu mô tả nằm trọn trên một dòng, không tràn mép; tablet 768 Light: tự xuống dòng sạch.
4. Artifact có 8 ảnh `#order` ở các kích thước 360, 390, 768, 1440 và chế độ Light/Dark. Manifest báo capture hoàn tất, bốn thẻ quy trình mở rộng, không có runtime error, lỗi HTTP cùng nguồn, read-only violation hoặc Cloudflare Access block.

## Các giới hạn bắt buộc — không được vi phạm

- **Hero đang PAUSED BY OWNER. Tuyệt đối không mở, sửa, khôi phục, chụp ảnh hoặc thay đổi Hero.** Không dùng Hero làm việc tiếp theo.
- Typography tiêu đề quy trình đặt hàng đã PASS/LOCKED. Không thay đổi kiểu chữ, kích thước hoặc cách trình bày tiêu đề nếu chủ dự án chưa cho phép.
- Không thay đổi Admin/backend/API/auth/catalog data/D1/R2/secrets/bindings/DNS/Cloudflare Access.
- Chỉ làm trên Preview; tuyệt đối không deploy Production.
- PR #108 phải để OPEN, không merge.
- Không được tuyên bố chủ dự án đã PASS giao diện: trạng thái hiện tại là `CAPTURED_AWAITING_OWNER_VISUAL_ACCEPTANCE`. Chụp thành công và CI xanh không thay thế sự chấp thuận trực quan của chủ dự án.

## Bước tiếp theo bắt buộc

1. Báo ngắn gọn cho chủ dự án rằng bộ ảnh #order đã sẵn sàng để xem; đưa link artifact ở trên. Chờ chủ dự án xác nhận PASS/ yêu cầu sửa cho riêng phần #order. Không tự đánh dấu owner-accepted.
2. Khi chủ dự án trả lời, cập nhật trạng thái vào cả bốn file handoff. Nếu họ PASS, khóa phần #order và không sửa nữa. Nếu yêu cầu chỉnh, chỉ sửa đúng vấn đề họ nêu, từng thay đổi một, rồi chạy test, deploy Preview và chụp lại đúng SHA.
3. Sau khi xử lý cổng xác nhận #order, tiếp tục mục an toàn tiếp theo trong `TASKS.md`; không dừng chỉ vì đã báo cáo.
4. Trước mọi thay đổi, đọc HEAD mới nhất, PR #108, trạng thái CI, Preview deploy và SHA đã deploy. Nếu branch HEAD khác SHA bàn giao, đối chiếu thay đổi trước khi sửa.
5. Sau mỗi thay đổi, kiểm tra kết quả workflow đến trạng thái cuối; trong khi workflow chạy, làm việc độc lập an toàn nếu có. Không tuyên bố PASS khi chưa có bằng chứng.
6. Cập nhật `CURRENT-STATE.md`, `TASKS.md`, `TEST-RESULTS.md` và prompt bàn giao này sau mỗi trạng thái quan trọng. Tạo commit docs-only riêng khi cần; không thay đổi mã nguồn đã deploy chỉ để cập nhật tài liệu.

**Tóm tắt trạng thái:** source/tests/deploy và ảnh live hiện đều PASS về mặt kỹ thuật; phần #order đang chờ chủ dự án duyệt trực quan. Hero vẫn tạm dừng. PR #108 OPEN, không merge. Production không bị thay đổi.
