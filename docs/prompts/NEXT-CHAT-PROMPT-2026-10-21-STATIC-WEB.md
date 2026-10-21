# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST2 WEB TĨNH
**Ngày cập nhật: 2026-10-21**

Bạn tiếp quản công việc website tĩnh SinDarealest2. Đọc prompt này trước, rồi đọc các file bàn giao trên GitHub được liệt kê dưới đây. Tiếp tục làm việc thực tế; không chỉ báo cáo rồi dừng.

## 1. Phạm vi và giới hạn bắt buộc
- Repository: `chichute5500/Sindarealest-admin`
- Branch duy nhất cho công việc này: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — không merge.
- Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Production: https://sindarealest2.pages.dev/ — tuyệt đối không sửa, deploy, merge hay tác động.
- Không làm Admin; không đổi sang `main`; không sửa backend, D1/R2, catalog/dữ liệu sản phẩm, bindings, secrets, DNS, Access hoặc cấu hình production.
- Không viết lại bằng React/Vite nếu chưa được cho phép rõ ràng. Có thể refactor HTML/CSS/JS frontend tĩnh mạnh tay để đạt thiết kế.
- Chỉ 3 yếu tố thương hiệu/sản phẩm không được đổi: logo SinDarealest chính thức (không thay, bóp méo hay đổi màu), tên/nhận diện thương hiệu, và dữ liệu/định danh thật của sản phẩm (SKU/ID/tên/giá/thuộc tính/danh mục/nguồn ảnh và quan hệ ảnh-sản phẩm).
- **Bỏ qua hoàn toàn chủ đề ảnh upload/thư mục đã nói ở cuộc trò chuyện trước.** Người dùng sẽ làm lại chủ đề đó ở cuộc trò chuyện mới khi cần. Không tìm kiếm, điều tra, nhắc lại hay để nó chặn công việc website. Không cần yêu cầu người dùng upload ảnh vì lý do bàn giao này.

## 2. Đọc tài liệu theo thứ tự
1. `docs/handoff/PROMPT-NEXT-CHAT-2026-10-21.md`
2. `docs/handoff/HANDOFF.md`
3. `docs/handoff/TEST-RESULTS.md`
4. `docs/prompts/MASTER-PROMPT-SINDAREALEST-PARALLEL.md` (nếu đường dẫn không tồn tại, kiểm tra tên chính xác `MASTER-PROMPT-SINDAREALEST2-PARALLEL.md`)
5. `docs/prompts/NEXT-CHAT-PROMPT.md`
6. Khi checkout/payment/product fulfillment liên quan: `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md`

Nếu tài liệu có SHA/run cũ, xác minh lại HEAD và trạng thái hiện tại trước khi dựa vào chúng. Không đoán kết quả từ lịch sử hội thoại.

## 3. Việc cần làm ngay
1. Xác minh branch HEAD hiện tại, working tree/diff, GitHub Actions gần nhất và Preview deployment hiện tại. Kiểm tra PR chỉ để đọc, không merge.
2. Đọc file bàn giao và ghi nhận những test nào đã PASS; không chạy lại test PASS không liên quan nếu code/điều kiện không đổi.
3. Tiếp tục audit và hoàn thiện toàn bộ website tĩnh theo ảnh tham chiếu; không chỉ homepage:
   - satin background và chuyển Light/Dark/System;
   - header/logo/menu/hero;
   - phần “Phong cách đẳng cấp từ da cá sấu”;
   - khu vực 6 ô Liquid Glass — chỉ áp dụng glass tại khu vực này, giữ nền có chiều sâu và chữ/card dễ đọc;
   - phần “Đặt hàng an tâm”;
   - danh mục, tìm kiếm, lưới sản phẩm, chi tiết sản phẩm, gallery và controls;
   - cart, account, checkout và các trạng thái rỗng/lỗi/đang tải;
   - Zalo CTA, footer, 404, deep links/reload và mobile navigation.
4. Kiểm tra các viewport `360×800`, `390×844`, `768×1024`, `1440×900`, Light và Dark trên mobile/desktop. Dùng ảnh tham chiếu gốc trong `docs/static-web-reference/`; không dùng ảnh chụp hiện trạng làm chuẩn thay cho reference.
5. Sau mỗi thay đổi: test → deploy Preview bằng workflow phù hợp → xác minh SHA/branch/deployment → chụp ảnh trực tiếp từ Preview → so sánh trực quan với reference → tiếp tục sửa lỗi còn lại.
6. Duy trì screenshot evidence theo quy ước hiện có: chỉ `docs/website-screenshots/start-of-work/`, `docs/website-screenshots/end-of-work/` và `docs/website-screenshots/manifest.json`; manifest chỉ được cập nhật bởi workflow kiểm chứng được, không sửa tay để giả bằng chứng.
7. Sau khi có kết quả mới, cập nhật handoff/test results/master prompt/next-chat prompt trên đúng branch.

## 4. Các lỗi/nguyên tắc thiết kế cần nhớ
- Hero và ảnh sản phẩm phải hòa với nền satin, không có khung chữ nhật thô nếu reference không có.
- Không phủ blur/invert/overlay toàn website; giữ hiệu ứng 3 lớp chỉ trong khu vực Liquid Glass.
- Đảm bảo controls gallery (mũi tên/zoom/favorite/số ảnh) có tương phản rõ.
- Nút Back trên panel cart/account mobile phải đóng panel đúng cách, không điều hướng khỏi trang.
- Tránh giật khi đổi theme.
- Định tuyến sản phẩm theo dạng `/sanpham/{category}/{product-code}`, chỉ dựa trên mapping dữ liệu thật; kiểm tra truy cập trực tiếp, reload, URL cũ và URL không hợp lệ.
- Không tự thay ảnh/sản phẩm để thỏa audit nếu chưa được xác minh trong dữ liệu public thực tế.
- Checkout phải fail-closed: chưa có cấu hình QR/endpoint xác thực thì không hiển thị QR/số tiền chuyển, không xác nhận đã thanh toán; đơn chỉ ở trạng thái chờ cửa hàng xác nhận. Không suy diễn loại fulfillment từ tồn kho, danh mục, SKU hay ảnh.

## 5. Cách làm và báo cáo
- Báo cáo tiến độ theo % ngắn gọn khi có kết quả có căn cứ; báo cáo xong phải tiếp tục làm, không dừng chỉ vì đã báo cáo.
- Chỉ dừng khi cần người dùng thao tác/ủy quyền thật sự hoặc có blocker ngoài khả năng truy cập.
- Không tuyên bố 100% nếu còn FAIL/BLOCKED/NOT TESTED. Nêu rõ test nào PASS/FAIL/BLOCKED và dẫn chứng run/SHA/Preview.
- Không merge PR, không triển khai Production, không làm Admin.
- Không điều tra hoặc nhắc lại chủ đề ảnh upload/thư mục của cuộc trò chuyện trước trong công việc bàn giao này.

Bắt đầu bằng việc xác minh HEAD/diff/Actions/Preview rồi tiếp tục các hạng mục còn thiếu theo thứ tự ưu tiên trong handoff mới nhất.
