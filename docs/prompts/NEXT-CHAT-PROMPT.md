# NEXT CHAT PROMPT — TIẾP TỤC SINDAREALEST2 KHÔNG MẤT BỐI CẢNH

Bạn tiếp nhận công việc SinDarealest2. Đừng bắt người dùng kể lại những gì đã ghi trên GitHub. Trước khi sửa code, hãy mở và đọc:

1. [MASTER PROMPT TỔNG HỢP — SinDarealest2 Web tĩnh + Admin](MASTER-PROMPT-SINDAREALEST2-PARALLEL.md)
2. [Prompt Admin gốc: MASTER-PROMPT-AUTO-HANDOFF](../admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md)
3. [Biên bản đối chiếu chéo web tĩnh và Admin](../handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md)
4. Nếu tồn tại, đọc các file handoff trạng thái mới nhất và kết quả test được master prompt nêu.

## Quy tắc không được quên

- Repository: `chichute5500/Sindarealest-admin`.
- Web tĩnh: nhánh `fix/liquid-glass-audit-2026-10-19`.
- Admin: nhánh `feature/*`; phải tìm trên GitHub để xác minh tên nhánh chính xác, SHA và Preview hiện hành.
- Hai luồng độc lập, làm song song. Không bắt Admin chờ web tĩnh hoặc ngược lại; không sao chép thiết kế/code máy móc giữa hai nhánh.
- Được phép tháo bỏ các ràng buộc giao diện cũ trong phạm vi UI để đạt ảnh tham chiếu: cấu trúc UI, bố cục, font, màu, nền, spacing, responsive, CSS và trạng thái tương tác.
- Giữ nguyên logo/nhận diện thương hiệu, dữ liệu và mapping sản phẩm/ảnh, SKU, giá, mô tả, API, auth, nghiệp vụ, D1/R2, bindings, secrets và backend trừ khi người dùng cho phép riêng.
- Không sửa `main`, không merge/cherry-pick giữa nhánh, không deploy Production, không thay cấu hình Production.
- Kiểm thử bằng Preview và Playwright khi có thể. Chỉ ghi PASS khi có bằng chứng thật; workflow skipped không phải live acceptance.
- Sau mỗi vòng sửa quan trọng: chạy test, chụp ảnh ứng dụng đang chạy, so sánh với tham chiếu, ghi kết quả và cập nhật handoff/ảnh lên đúng nhánh nếu có quyền.
- Ghi lại điểm có thể ảnh hưởng nhánh kia; kiểm tra chéo sau khi hai bên có Preview gần hoàn thiện.
- Khi người dùng thêm, sửa hoặc đổi yêu cầu, cập nhật cả hai file:
  - `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`
  - `docs/prompts/NEXT-CHAT-PROMPT.md`
  Không chỉ trả lời trong chat. Giữ các ý cũ; nếu thay thế ý cũ, ghi rõ lịch sử thay đổi.

## Việc đầu tiên của phiên này

1. Đọc đầy đủ các tài liệu trên.
2. Kiểm tra GitHub để xác nhận branch, HEAD SHA, commit gần nhất, Actions, PR và Preview deployment. Không đoán trạng thái.
3. Xác định việc còn dang dở từ handoff và kết quả mới nhất.
4. Tiếp tục công việc đúng nhánh và đúng phạm vi; không chỉ lập kế hoạch.
5. Nếu cần bổ sung yêu cầu mới, cập nhật hai file prompt trên GitHub trước hoặc cùng lúc với phần thực hiện.
6. Báo cáo ngắn gọn bằng tiếng Việt: branch/SHA, việc đã làm, bằng chứng test/ảnh, lỗi còn lại, blocker và bước tiếp theo. Không tuyên bố hoàn thành 100% nếu chưa đủ bằng chứng.

**Lệnh người dùng có thể gửi:** “Tiếp tục theo file NEXT-CHAT-PROMPT.md. Đọc master prompt và handoff, xác minh trạng thái GitHub thực tế, rồi tiếp tục công việc. Nếu tôi bổ sung ý nào, ghi vào cả hai file prompt để không bị quên. Không đụng Production.”