# Bàn giao khẩn — khôi phục ảnh người dùng đã upload (2026-10-21)

## Ưu tiên đầu tiên của phiên mới
Khôi phục/xác định đúng ảnh `tb_image_share_1792519964514.png` mà người dùng đã tải lên một thư mục do trợ lý tạo, sau đó yêu cầu trợ lý lấy ảnh và xóa thư mục. Người dùng hiện hỏi chuyện gì đã xảy ra. Đây là việc cần điều tra trước khi tiếp tục đụng đến ảnh hero.

## Sự thật đã biết và điều chưa được xác minh
- Người dùng khẳng định đã tải ảnh `tb_image_share_1792519964514.png` lên thư mục được tạo trước đó, rồi yêu cầu lấy ảnh và xóa thư mục.
- Trợ lý trước đó tìm tên file trong danh sách tệp của conversation và Library nhưng không thấy. Danh sách không tìm thấy **không chứng minh** file đã bị xóa, cũng không chứng minh trợ lý đã từng lấy ảnh.
- Tại thời điểm tạo handoff này, chưa có bằng chứng xác minh được: đường dẫn/thư mục cụ thể, file ID, ảnh đã được copy sang repo hay chưa, và thư mục có bị xóa hay không.
- Không được tuyên bố đã xóa thư mục, đã lấy ảnh, hoặc ảnh mất vĩnh viễn khi không có bằng chứng.
- Không yêu cầu người dùng upload lại ngay lập tức. Trước hết tìm trong toàn bộ nguồn khả dụng: Library search/list (bao gồm thư mục và các tệp gần đây), conversation attachments/files, lịch sử các thao tác tạo folder/move/delete/upload nếu công cụ có lưu, và GitHub branch/repo chỉ để xác minh xem ảnh đã được commit hay chưa. Tìm theo cả filename chính xác và timestamp/ảnh mới nhất.
- Nếu file hiện diện ở nguồn nào, mở/đọc/xem ảnh thật để xác nhận; sao lưu an toàn trước mọi thao tác xóa. Nếu không có công cụ truy xuất lịch sử thao tác hoặc file không còn khả dụng, nêu rõ giới hạn và chỉ hỏi người dùng thao tác tối thiểu cần thiết.

## Bối cảnh dự án
- Repo: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — không merge.
- Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production: https://sindarealest2.pages.dev/ — tuyệt đối không sửa/deploy/merge.
- Không làm Admin, không sửa `main`, D1/R2, catalog, bindings, secrets, DNS, Access hay dữ liệu backend.
- Handoff chính trước đó: `docs/handoff/PROMPT-NEXT-CHAT-2026-10-21.md`, `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`, `docs/prompts/NEXT-CHAT-PROMPT.md`.

## Làm rõ về SD-GL052 / hero
- Trước sự cố, trợ lý tập trung vào SKU `SD-GL052` vì code hero từng được thiết kế để lấy ảnh từ sản phẩm đó.
- Người dùng đã hỏi tại sao tiếp tục tìm SKU này và sau đó nói đã thay GL052 bằng ảnh vừa tải lên file. Do vậy không được mặc định rằng ảnh cần tìm là sản phẩm SKU GL052; ảnh người dùng mới tải lên là mục tiêu trực tiếp cần tìm.
- Chưa xác minh ảnh upload có được thêm vào repo hay gắn vào hero hay không. Không tự thay ảnh hero, không tạo mapping giả, không thay dữ liệu sản phẩm.
- Khi đã khôi phục được ảnh, xác nhận đúng file/ảnh bằng cách mở xem và xác định vị trí an toàn; sau đó kiểm tra code/branch hiện tại xem đã sử dụng ảnh chưa. Chỉ cập nhật hero nếu người dùng đã yêu cầu và file/nguồn ảnh có thể commit hợp lệ; giữ nguyên logo, thương hiệu, danh tính/dữ liệu sản phẩm.

## Quy trình tiếp tục sau khôi phục
1. Xác minh nguồn và trạng thái file; lưu bản sao ở vị trí rõ ràng trước khi xóa bất cứ thứ gì.
2. Nếu có thể, ghi lại tên thư mục, file ID/path, nguồn, trạng thái thao tác bằng chứng được. Không lưu thông tin nhạy cảm.
3. Kiểm tra GitHub branch HEAD hiện tại và diff trước khi chỉnh code; không tin SHA cũ trong lịch sử nếu chưa fetch lại.
4. Chỉ sau khi ảnh đã được xác nhận mới kiểm tra hero. Không tiếp tục chặn toàn bộ công việc website vì SKU GL052.
5. Cập nhật `HANDOFF.md`, `TEST-RESULTS.md`, `MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`, `NEXT-CHAT-PROMPT.md` bằng trạng thái có căn cứ. Không chỉnh screenshot manifest thủ công.
6. Tiếp tục audit giao diện tĩnh: satin, Light/Dark, mobile/desktop, 6 ô Liquid Glass, “Phong cách đẳng cấp từ da cá sấu”, cart/account/checkout, gallery controls, mobile Back, footer/Zalo, route. Sau mỗi thay đổi: test → Preview deploy → xác minh SHA → live screenshots → so ảnh tham chiếu.
7. Báo cáo tiến độ ngắn gọn rồi tiếp tục làm; không dừng chỉ để chờ người dùng thúc giục. Chỉ dừng khi cần thao tác/ủy quyền thật sự của người dùng hoặc blocker ngoài khả năng truy cập.

## Mẫu báo cáo bắt buộc
- Ảnh tìm thấy? (YES/NO/UNVERIFIED) — nguồn và bằng chứng.
- Thư mục xóa? (YES/NO/UNVERIFIED) — không suy luận từ việc không thấy folder.
- Ảnh đã được sao lưu/commit? (YES/NO/UNVERIFIED).
- Hero đang dùng ảnh nào? Chỉ kết luận sau khi đọc code/ảnh thật.
- Branch HEAD, diff, CI/Preview evidence mới nhất.
- Việc tiếp theo có thể tự làm và blocker thật sự (nếu có).
