# SinDarealest ADMIN — điểm bắt đầu bàn giao cho AI

> Đây là điểm bắt đầu bắt buộc cho mọi phiên AI/agent tiếp tục công việc ADMIN. Nội dung chỉ phản ánh trạng thái đã ghi và kiểm chứng; luôn xác minh Git thực tế trước khi sửa.

## Phân chia nhánh — bắt buộc

- Repository: `chichute5500/Sindarealest-admin`
- **Nhánh WEBSITE TĨNH cần bảo vệ:** `fix/liquid-glass-audit-2026-10-19`
- **Nhánh ADMIN duy nhất được phép sửa/commit:** `feature/admin-isolated-handoff-2026-10-20`
- Nhánh ADMIN được tách từ nhánh website tĩnh tại thời điểm tạo. Điều đó chỉ xác định điểm xuất phát; không cấp quyền chỉnh sửa website tĩnh.
- Không commit ADMIN vào nhánh `fix/liquid-glass-audit-2026-10-19`, không commit vào `main`, không force-push, không tự merge/cherry-pick qua lại.
- Không tự động đồng bộ các commit website mới sang nhánh ADMIN. Trước khi đồng bộ phải so sánh SHA/diff, đánh giá file xung đột và có chỉ thị rõ ràng.

## Trước khi làm bất cứ việc gì

1. Xác nhận repository, branch hiện tại, HEAD SHA, remote, `git status` và các thay đổi chưa commit.
2. Nếu không ở `feature/admin-isolated-handoff-2026-10-20`, **không sửa hoặc commit**. Không checkout/reset/stash một cách mù quáng; trước tiên bảo toàn thay đổi hiện có rồi mới quyết định chuyển nhánh an toàn.
3. Ghi nhận SHA hiện tại của nhánh website tĩnh để làm mốc đối chiếu; không sửa nhánh đó.
4. Đọc `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-COMPLETENESS-AUDIT.md`, `../reference-instructions.md` và `../MASTER-PROMPT-AUTO-HANDOFF.md`.
5. Mở ảnh tham chiếu `../admin-mobile-reference.png`; dùng `../admin-mobile-reference.html` và ZIP tham chiếu khi cần.
6. Kiểm tra screenshot gần nhất trong `history/` và so sánh SHA của ảnh/báo cáo với code đang chạy. Nếu không khớp, không gọi đó là ảnh của code hiện tại.

## Phạm vi công việc

- Chỉ chỉnh giao diện và chức năng ADMIN theo master prompt, bảo toàn nghiệp vụ/backend hiện có.
- Không redesign hoặc thay đổi storefront, trang chủ công khai, sản phẩm công khai, giỏ hàng/checkout, navbar/footer public, Liquid Glass, nền động, theme, typography hay responsive của website tĩnh.
- Với API/auth/component/config dùng chung, trước khi sửa phải ghi rõ phụ thuộc, lý do, rủi ro và kế hoạch regression. Nếu không thể cô lập an toàn, ghi BLOCKED cho mục đó và tiếp tục việc độc lập.
- Không tự ý thay đổi Cloudflare/Production, secrets, D1 schema/bindings, R2 data hoặc dữ liệu khách hàng/đơn hàng thật.

## Quy tắc cập nhật sau mỗi vòng lặp

- Một vòng lặp là: sửa đổi có ý nghĩa → chạy kiểm tra → chụp lại cùng màn hình/điều kiện → so sánh.
- Sau MỖI vòng lặp hoàn chỉnh, lưu ảnh thật từ ứng dụng đang chạy, metadata và báo cáo vào `history/<short-sha-or-run-id>/`.
- Cập nhật `LATEST-STATUS.md`, `latest-test-results.json` và các lỗi còn lại. Chỉ ghi PASS khi có bằng chứng; dùng BLOCKED/NOT TESTED nếu chưa kiểm tra được.
- Commit tài liệu, screenshot và code ADMIN đã kiểm tra chỉ trên `feature/admin-isolated-handoff-2026-10-20`. Xác minh commit và đọc lại file sau khi ghi.
- Không giả vờ đã chụp ảnh, chạy test, lưu GitHub hoặc hoàn thành nếu chưa có xác nhận thực tế.

## Tự động tiếp tục

Các file này lưu trạng thái bền vững nhưng không tự khởi động một phiên ChatGPT mới khi phiên hiện tại hết giới hạn. Việc tự chạy tiếp cần agent/automation riêng thực sự được cấu hình và chạy. Khi một phiên AI/automation được khởi chạy, hãy đọc handoff và master prompt trước khi hành động.

## Tệp bàn giao

- `LATEST-STATUS.md`: trạng thái mới nhất.
- `PROMPT-NEXT-CHAT.md`: prompt ngắn, đầy đủ để phiên chat tiếp theo tiếp tục đúng trạng thái hiện tại.
- `latest-test-results.json`: kết quả kiểm thử có bằng chứng.
- `PROMPT-COMPLETENESS-AUDIT.md`: bảng đối chiếu yêu cầu và giới hạn.
- `../MASTER-PROMPT-AUTO-HANDOFF.md`: prompt chuẩn.
- `history/`: ảnh/báo cáo lịch sử; không ghi đè mốc cũ.

## Ảnh tham chiếu

Các file PNG/HTML tham chiếu là mục tiêu thiết kế, không phải screenshot ứng dụng chạy thật. Chỉ ảnh do Playwright chụp từ app đang chạy mới được coi là bằng chứng thực tế.
