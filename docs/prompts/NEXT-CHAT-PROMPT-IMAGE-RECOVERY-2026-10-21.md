# PROMPT CHUYỂN GIAO CHAT MỚI — ƯU TIÊN KHÔI PHỤC ẢNH UPLOAD

Bạn tiếp quản dự án trực tiếp từ GitHub và các nguồn tệp có thể truy cập. Đọc file này trước, sau đó đọc `docs/handoff/INCIDENT-IMAGE-RECOVERY-2026-10-21.md` và các handoff chính bên dưới. Không bắt người dùng nhắc lại bối cảnh đã có.

## Việc đầu tiên — không được bỏ qua
Điều tra ảnh `tb_image_share_1792519964514.png`. Người dùng nói đã tải ảnh lên thư mục do trợ lý tạo và đã yêu cầu trợ lý lấy ảnh rồi xóa thư mục. Cuộc trò chuyện hiện không có bằng chứng cho thấy trợ lý đã thực hiện đúng các bước đó. Việc không tìm thấy filename trong một danh sách không chứng minh file đã mất hoặc folder đã bị xóa.

1. Kiểm tra tệp đính kèm của lượt hiện tại, Library search/list và các folder/tệp gần đây; tìm filename chính xác và các biến thể.
2. Kiểm tra lịch sử tool/action nếu khả dụng để xác định thư mục được tạo, file được lấy/copy/move và thao tác xóa đã chạy hay chưa.
3. Kiểm tra GitHub branch để biết ảnh đã được commit ở vị trí nào chưa. Không coi tìm trên GitHub là thay thế việc kiểm tra Library.
4. Nếu tìm thấy ảnh, mở xem chính ảnh đó, xác nhận nội dung, lưu bản sao an toàn trước mọi thao tác xóa. Không xóa thêm gì cho tới khi biết chắc bản sao an toàn tồn tại.
5. Nếu không thể truy cập lịch sử hoặc file, báo chính xác đã kiểm tra nguồn nào và nguồn nào không truy cập được; chỉ khi hết các đường khôi phục mới hỏi người dùng một thao tác tối thiểu. Không bắt upload lại ngay từ đầu.
6. Không nói rằng ảnh đã mất, đã lấy, hoặc thư mục đã xóa nếu chưa có bằng chứng.

## Ngữ cảnh ảnh hero
Trước đây trợ lý truy vấn SKU `SD-GL052` vì code hero từng trỏ vào SKU đó. Người dùng đã nói họ thay GL052 bằng ảnh vừa tải lên file. Do đó mục tiêu là ảnh upload của người dùng, không phải tiếp tục tìm SKU để chặn công việc. Chưa được xác minh rằng ảnh đã vào repo hoặc được gắn vào hero. Không sửa catalog/D1/R2 hoặc bịa SKU/image mapping. Sau khi tìm được ảnh, kiểm tra code hiện tại và xác nhận liệu hero đã dùng ảnh đó chưa.

## Dự án / an toàn
- Repo `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`.
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — KHÔNG merge.
- Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production: https://sindarealest2.pages.dev/ — tuyệt đối không sửa/deploy/merge.
- Không đụng Admin, `main`, backend, D1/R2, dữ liệu sản phẩm, bindings/secrets, DNS hoặc Access.
- Đọc `docs/handoff/HANDOFF.md`, `docs/handoff/TEST-RESULTS.md`, `docs/prompts/MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`, `docs/prompts/NEXT-CHAT-PROMPT.md`, và contract `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` trước khi chỉnh phần liên quan.

## Tiếp tục công việc website sau khi xử lý ảnh
Không để một SKU hoặc ảnh làm dừng các phần UI không liên quan. Tiếp tục audit đầy đủ: satin background, Light/Dark, mobile/desktop, 6 ô Liquid Glass, “Phong cách đẳng cấp từ da cá sấu”, “Đặt hàng an tâm”, product grid/detail/gallery, cart/account/checkout, gallery controls, mobile Back, footer/Zalo, routes và states. Giữ logo, thương hiệu, danh tính và dữ liệu sản phẩm. Không dùng mock để chứng minh live Preview.

Sau mỗi thay đổi: source/test → deploy Preview → xác minh deployment branch/SHA → chụp live screenshots → so trực tiếp với PNG tham chiếu. Không chạy lại test PASS không liên quan nếu code/điều kiện chưa đổi. Không chỉnh manifest/screenshot folders bằng tay để giả bằng chứng.

## Cách làm
Báo cáo tiến độ khi có kết quả hữu ích nhưng sau báo cáo tiếp tục làm, không tự dừng. Chỉ dừng nếu cần hành động/ủy quyền thật sự từ người dùng hoặc blocker ngoài khả năng truy cập. Cuối phiên cập nhật handoff, test results, master prompt và next-chat prompt trên đúng branch. Không tuyên bố hoàn thành 100% khi còn FAIL/BLOCKED/NOT TESTED.

## Báo cáo đầu tiên cần trả lời
- Đã tìm ảnh ở những nguồn nào, kết quả và bằng chứng?
- Có xác minh được lịch sử tạo/xóa thư mục không?
- Ảnh có được sao lưu/commit và hero đã dùng nó chưa?
- HEAD/diff/CI/Preview hiện tại là gì?
- Sau đó tiếp tục các task UI không liên quan, không chờ người dùng nhắc.
