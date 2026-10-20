# PROMPT BÀN GIAO — TIẾP TỤC HOÀN THIỆN SINDAREAL EST ADMIN

Bạn phải tiếp tục công việc thực tế, không chỉ lập kế hoạch. Trước khi hành động, hãy đọc toàn bộ các file sau từ nhánh `feature/admin-isolated-handoff-2026-10-20` trong repository `chichute5500/Sindarealest-admin`:

1. [MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md)
2. [START-HERE.md](START-HERE.md)
3. [LATEST-STATUS.md](LATEST-STATUS.md)
4. [latest-test-results.json](latest-test-results.json)
5. [PROMPT-COMPLETENESS-AUDIT.md](PROMPT-COMPLETENESS-AUDIT.md)
6. [reference-instructions.md](../reference-instructions.md)

## Bắt đầu bằng xác minh, không đoán

- Xác minh repository, nhánh ADMIN, HEAD SHA, Git status/working tree nếu có checkout, PR hiện tại và workflow mới nhất.
- Nếu không có local checkout hoặc không có quyền đọc một phần trạng thái, nói rõ giới hạn; không giả vờ đã chạy lệnh hoặc xem file.
- Đọc handoff trước khi làm để tránh lặp lại các bước đã có bằng chứng.
- Không dựa vào test PASS của commit cũ để tuyên bố HEAD hiện tại đã PASS. Mọi kết quả phải gắn với source commit/workflow cụ thể.

## Phạm vi và bảo vệ bắt buộc

- Chỉ sửa và commit trên `feature/admin-isolated-handoff-2026-10-20`.
- Bảo vệ nhánh website tĩnh `fix/liquid-glass-audit-2026-10-19` và nhánh `main`.
- Giữ PR #111 (ADMIN) và PR #108 (website tĩnh) OPEN/chưa merge. Không tự merge, cherry-pick, force-push hoặc đồng bộ hai nhánh.
- Không deploy Production; không sửa secrets, cấu hình môi trường, D1/R2, schema, dữ liệu thật, API/auth/backend hay nghiệp vụ ngoài phạm vi được cho phép.
- Không bỏ qua Cloudflare Access. Nếu Preview bị chặn hoặc phục vụ sai source/signature, ghi BLOCKED và tiếp tục công việc độc lập có thể thực hiện an toàn.

## Tiếp tục công việc

1. Đối chiếu trạng thái và bằng chứng gần nhất trong LATEST-STATUS.md / JSON; xác minh lại các kết quả mới nhất từ GitHub Actions.
2. Xử lý các việc còn mở theo thứ tự ưu tiên: Preview URL/source mismatch; kiểm thử Playwright trên source hiện tại; so sánh các màn hình với ảnh tham chiếu; đánh giá responsive và nghiệp vụ ADMIN bằng fixture/read-only trước; chỉ kiểm tra backend thật khi có Preview và quyền hợp lệ.
3. Không coi ảnh fixture hoặc login-only là bằng chứng cho nghiệp vụ đã đăng nhập. Không dùng dữ liệu cá nhân/thật cho screenshot.
4. Với mỗi thay đổi có ý nghĩa: sửa trên nhánh ADMIN → chạy test phù hợp → lưu screenshot/metadata thực → đối chiếu → cập nhật LATEST-STATUS.md và latest-test-results.json. Dùng PASS/FAIL/BLOCKED/SKIPPED/NOT VERIFIED chính xác.
5. Không dừng sau báo cáo tiến độ nếu vẫn còn việc an toàn có thể thực hiện. Chỉ dừng khi cần người dùng cấp quyền, cung cấp URL Preview hợp lệ, hoặc quyết định mà AI không thể suy ra an toàn.
6. Trước khi kết thúc phiên, cập nhật file handoff, ghi commit SHA chỉ sau khi GitHub xác nhận, đọc lại file từ GitHub để xác minh và đưa ra bước tiếp theo cụ thể.

## Trạng thái khởi điểm được ghi nhận — 2026-10-21

- Lượt cập nhật bàn giao gần nhất chỉ cập nhật tài liệu; không có thay đổi source ADMIN và không chạy test mới.
- Bằng chứng kiểm thử cũ phải được đọc từ JSON và xác minh workflow/commit trước khi tái sử dụng. Preview mismatch và kiểm thử module nghiệp vụ đã đăng nhập là các vấn đề còn cần xử lý theo trạng thái mới nhất.
- Không tuyên bố hoàn tất 100% cho đến khi từng tiêu chí nghiệm thu có bằng chứng phù hợp.

**Bắt đầu ngay bằng việc xác minh GitHub và đọc các file bàn giao trên; sau đó thực hiện bước tiếp theo an toàn có thể làm, cập nhật file và tiếp tục.**
