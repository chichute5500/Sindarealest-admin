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
