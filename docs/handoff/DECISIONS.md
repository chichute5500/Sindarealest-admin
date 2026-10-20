# Decision log — SinDarealest2

Lưu các quyết định đã chốt để AI sau không hỏi lại hoặc đảo ngược tùy tiện. Nội dung trong file này là ràng buộc dự án; khi có yêu cầu mới rõ ràng từ người dùng, ghi quyết định mới kèm ngày và phạm vi thay đổi.

## Quyết định hiện hành

### DEC-001 — Chỉ làm việc trên nhánh Preview đã chỉ định
- Quyết định: phạm vi làm việc là `fix/liquid-glass-audit-2026-10-19`.
- Không merge/deploy Production và không sửa cấu hình Production.
- Không chỉnh nhánh admin riêng `feature/admin-isolated-handoff-2026-10-20`.
- Lý do: tránh ảnh hưởng website thật và công việc độc lập của AI khác.

### DEC-002 — Ảnh mẫu gốc web tĩnh là nguồn tham chiếu chuẩn
- Sáng: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`.
- Tối: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Không đổi vai trò ảnh, không ghi đè/xóa ảnh gốc.
- Phải xem trực quan ảnh trước khi tuyên bố đã phân tích thiết kế.

### DEC-003 — Ảnh mẫu, baseline và ảnh kết thúc là ba loại riêng
- Mẫu gốc: `docs/static-web-reference/`.
- Ảnh chụp trước sửa: `docs/website-screenshots/start-of-work/`.
- Ảnh chụp sau sửa: `docs/website-screenshots/end-of-work/`.
- Ảnh trước/sau phải được chụp thực tế, không sao chép ảnh mẫu hoặc dùng ảnh dựng giả.

### DEC-004 — Giữ nguyên kiến trúc và hành vi ngoài phạm vi
- Duy trì HTML/CSS/JavaScript tĩnh, Pages Functions, D1, R2 và Workers AI.
- Không tự chuyển sang React/Vite.
- Giữ logo, dữ liệu sản phẩm, SKU, slug, URL ảnh, API, HTML IDs, xác thực và bindings hiện có, trừ khi có chỉ đạo riêng và bằng chứng cần thiết.

### DEC-005 — Không coi mock là kết quả dịch vụ thật
- Test mock, test mã nguồn tĩnh, test trình duyệt và test dịch vụ thật phải báo cáo riêng.
- Workers AI chỉ được xác nhận hoạt động thật khi có test thật và bằng chứng đầu ra.

### DEC-006 — Không ghi/xóa dữ liệu thật khi kiểm thử
- Không tạo đơn/thanh toán thật.
- Không ghi/xóa dữ liệu D1/R2 Production.
- Dùng dữ liệu thử nghiệm an toàn và môi trường Preview đã xác minh.

### DEC-007 — Trạng thái công việc phải có bằng chứng
- PASS cần test/log/ảnh hoặc bằng chứng phù hợp.
- Không đủ bằng chứng dùng UNVERIFIED/NOT TESTED; phụ thuộc môi trường dùng BLOCKED.
- Không tuyên bố 100% khi còn hạng mục bắt buộc chưa xác minh.

## Mẫu ghi quyết định mới

### DEC-NNN — Tiêu đề
- Ngày:
- Quyết định:
- Lý do:
- Phạm vi:
- Tác động/điều kiện:
- Người dùng đã xác nhận? Nếu cần:
- Commit hoặc bằng chứng liên quan:

### DEC-008 — Phương án dự phòng khi Preview bị chặn — 2026-10-20
- Quyết định: Không dừng toàn bộ công việc khi URL Preview trả về `login_required`. Tiếp tục các phần có thể xác minh độc lập bằng mã nguồn GitHub, test suite, kiểm thử Playwright trên local static preview và artifact ảnh kiểm thử.
- Phân loại bằng chứng: (1) kiểm thử mã nguồn/local; (2) ảnh tham chiếu gốc; (3) baseline/kết quả trên Cloudflare Preview; ba loại phải được ghi tách biệt.
- Điều kiện: Không dùng ảnh local làm ảnh baseline/end-of-work của Preview; không tuyên bố đã xem trực quan ảnh PNG nếu công cụ không trả được nội dung hình ảnh; không bypass xác thực hoặc truy cập trái phép.
- Hành động tiếp theo: tiếp tục audit route, CSS khu vực sáu ô, responsive/Light-Dark từ source; thử các kênh truy cập hợp lệ khác cho Preview và ảnh tham chiếu. Chỉ sửa giao diện sau khi có bằng chứng đủ cụ thể; route mới chỉ làm khi mã sản phẩm/danh mục đã xác minh.
- Bằng chứng mới nhất: workflow [39350484564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564) PASS; artifact [12232777359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564/artifacts/12232777359). Đây là kiểm thử local, không phải Preview thật.


## DEC-009 — Do not merge the visual-audit branch without scope isolation (2026-10-20)

- The current branch comparison against `main` is `diverged`, ahead by 293 commits and behind by 6 at commit `fa7445b74661faf260c32b3ab32dfa85e3538e78`; the compare reports 72 changed files.
- The changed-file set includes `public/admin/index.html`, multiple `functions/api/admin/*` files, shared API/middleware files, `migrations/0008_product_sku_verification.sql`, deployment/setup scripts, the large `data/legacy-products.json` fixture, and `public/index.html`. This exceeds a narrowly isolated public static UI task.
- Decision: do not merge this branch as-is and do not deploy it to Production. First separate or explicitly review each out-of-scope change against the correct base. No admin/API/DB/production changes are authorized by this visual-audit continuation.
- Evidence: [GitHub compare](https://github.com/chichute5500/Sindarealest-admin/compare/28c768ba26b1d9f7d40e14efac5112526ed1c8b3...fa7445b74661faf260c32b3ab32dfa85e3538e78), [PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108).
