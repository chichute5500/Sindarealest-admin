# MASTER PROMPT BÀN GIAO — Tiếp tục hoàn thiện Admin Preview & Liquid Glass cho SinDarealest2

Bạn nhận tiếp công việc trong repository `chichute5500/Sindarealest-admin`. Hãy đọc toàn bộ file tiến độ `docs/ADMIN_PREVIEW_PROGRESS_2026-10-20.md` trước khi làm. Không yêu cầu người dùng nhắc lại những thông tin đã có trong file.

## Mục tiêu
Tự kiểm tra, chẩn đoán, sửa và xác minh cho đến khi các tiêu chí nghiệm thu dưới đây đạt. Không được tuyên bố hoàn tất 100% chỉ vì một workflow tổng thể xanh.

## Bối cảnh cố định
- Nhánh duy nhất được phép sửa: `fix/liquid-glass-audit-2026-10-19`
- PR: https://github.com/chichute5500/Sindarealest-admin/pull/108
- Preview: https://3ed49bcc.sindarealest2.pages.dev/
- Production: https://sindarealest2.pages.dev/
- PR #108 đang mở, chưa merge.
- Người dùng thao tác chủ yếu bằng Android và không muốn phải chạy nhiều Actions thủ công. Hãy tự dùng GitHub tools/Actions trong khả năng cho phép, không hỏi người dùng chạy lại những workflow mà bạn có thể tự kiểm tra.
- Tuyệt đối không yêu cầu người dùng gửi password/token/secret trong chat.

## Bằng chứng gần nhất — phải phân biệt rõ
1. Admin Preview Playwright PASS tại https://github.com/chichute5500/Sindarealest-admin/actions/runs/39413543764.
2. Validate source and tests PASS tại https://github.com/chichute5500/Sindarealest-admin/actions/runs/39413543869.
3. Visual audit có báo cáo tại https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810:
   - Local fixture audit PASS: 54 screenshots, 235 fixture products, 20 responsive cases, 93 interaction checks; không có overflow/console/page/HTTP/hard failures.
   - Live Preview chưa đạt: 46 ảnh thật; 8/8 viewport/theme pairs; 4 route checks; `productDetailContextsComplete=false`.
   - Deployment verification bị `API_AUTHENTICATION_REJECTED`, Cloudflare Pages API HTTP 401.
   - Một số bước live/archive có thể bị skip. Kiểm tra từng step/log/artifact, không suy diễn từ conclusion tổng thể.
4. Helper `count` của bước tổng hợp báo cáo Liquid Glass đã được đưa ra ngoài scope điều kiện để sửa ReferenceError.
5. Bản sửa Playwright giới hạn target vào HTTPS Preview alias không phải production, chỉ gửi Access service headers đến đúng Preview origin, và thêm chẩn đoán selector. Các sửa đổi gần nhất có Admin Playwright và source validation xanh.

## Nhiệm vụ bắt buộc
### A. Kiểm tra trạng thái GitHub hiện tại
- Fetch head SHA của PR/nhánh và trạng thái PR.
- Kiểm tra các Actions gần nhất theo SHA hiện tại, gồm từng step và log lỗi.
- Không sử dụng trạng thái của commit cũ để tuyên bố code mới đã qua visual audit.

### B. Sửa live capture và route coverage
- Đọc `scripts/capture-cloudflare-preview.mjs`, `public/index.html`, workflow `liquid-glass-visual-preview.yml`, manifest, report và artifact gần nhất.
- Xác định route canonical thực sự của sản phẩm từ mã nguồn; không giả định route cũ như `/san-pham/...` nếu code dùng route khác.
- Sửa tương tác menu/mobile/product cards/detail để chụp được đủ ngữ cảnh trang chủ, danh mục, sản phẩm và chi tiết sản phẩm.
- Chờ tín hiệu DOM/URL cụ thể, không dùng sleep mù nếu có selector/sự kiện đáng tin cậy.
- Đảm bảo ảnh là nội dung storefront thực, không chấp nhận trang Cloudflare Access, lỗi, blank page hoặc ảnh fixture làm bằng chứng Live.
- Bổ sung kiểm tra rõ ràng cho số ảnh tối thiểu, đủ route, đủ product detail contexts, viewport/theme pairs và lỗi console/page/network.
- Không giảm tiêu chí chỉ để làm workflow xanh. Nếu tiêu chí hiện tại không hợp lý, giải thích bằng bằng chứng và cập nhật manifest/report minh bạch.

### C. Xử lý Cloudflare deployment verification HTTP 401
- Đọc `scripts/verify-cloudflare-preview-deployment.mjs` và workflow để hiểu token/permissions cần thiết.
- Không đọc/in secret; không yêu cầu người dùng paste secret. Có thể xác minh tên secret, sự tồn tại qua hành vi workflow, endpoint và quyền yêu cầu mà không lộ giá trị.
- Nếu không thể hoàn tất chỉ qua repo, chuẩn bị hướng dẫn đúng một lần, tối thiểu và chính xác trong Cloudflare dashboard để người dùng tự thay token account-scoped Pages Read. Không được giả vờ verification đã pass.
- Không bỏ qua guard deployment verification chỉ để archive screenshot.

### D. Sửa và kiểm thử
- Tạo commit trên đúng nhánh; không sửa `main`, không merge PR, không deploy production.
- Sau mỗi sửa đổi có ý nghĩa, kiểm tra syntax/validate source, Admin Playwright và visual audit.
- Đọc artifact/report của lần chạy mới nhất; xác minh head SHA của run khớp commit vừa sửa.
- Nếu thất bại, tiếp tục chẩn đoán/sửa và chạy lại. Không lặp rerun cùng một mã nguồn lỗi mà không có thay đổi hoặc giả thuyết kiểm tra rõ ràng.

## Tiêu chí hoàn tất 100%
Chỉ được báo hoàn tất khi tất cả đều có bằng chứng:
- [ ] PR #108/nhánh đang được kiểm tra đúng commit mới nhất.
- [ ] Admin Preview Playwright PASS.
- [ ] Validate source/tests PASS.
- [ ] Live Cloudflare Pages Preview capture PASS; không bị skip.
- [ ] Số lượng ảnh thật đạt ngưỡng workflow và report/manifest nhất quán.
- [ ] Đủ viewport/theme pairs, route checks và product detail contexts.
- [ ] Không có lỗi console/page/HTTP/overflow/hard failures theo tiêu chí dự án.
- [ ] Cloudflare deployment verification PASS cho đúng Preview alias/branch/commit SHA.
- [ ] Artifact chứa report và ảnh được upload thành công.
- [ ] Production không bị merge/deploy/thay đổi.
- [ ] PR vẫn mở để chủ dự án xem xét.

## Quy tắc giao tiếp
- Báo cáo bằng tiếng Việt, nêu phần trăm tiến độ chỉ khi có cách tính minh bạch; tách rõ “đã xác minh”, “đang chặn”, “chưa kiểm tra”.
- Không hỏi người dùng thao tác nếu có thể tự xử lý.
- Nếu cần người dùng thực hiện một bước bí mật/quyền truy cập mà không thể làm thay, chỉ hỏi đúng bước tối thiểu sau khi hoàn tất toàn bộ việc có thể tự làm.
- Khi dừng, cập nhật file `docs/ADMIN_PREVIEW_PROGRESS_2026-10-20.md` với trạng thái, SHA, link Actions, lỗi còn lại và bước tiếp theo.
- Không bao giờ nói “100% hoàn tất” nếu còn một tiêu chí chưa đạt.

Bắt đầu ngay bằng việc đọc file tiến độ, kiểm tra trạng thái PR/Actions mới nhất, sau đó tiếp tục sửa cho đến khi đạt các tiêu chí. Không chỉ đưa ra kế hoạch rồi dừng.


---

## BỔ SUNG PHẠM VI ĐƯỢC CHỦ DỰ ÁN DUYỆT — 2026-10-21

Có yêu cầu mới cho hai nhánh riêng: (1) phân loại sản phẩm Hàng có sẵn / Hàng đặt riêng; (2) thanh toán chuyển khoản bằng QR, ưu tiên QR theo đơn hàng nhưng không tích hợp cổng thanh toán. Hợp đồng tích hợp chung nằm tại `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md`.

Trên nhánh website tĩnh, chỉ triển khai giao diện khách hàng và dùng dữ liệu/API thực tế. Không giả lập API, không tự đánh dấu thanh toán thành công, không yêu cầu trả tiền trước khi giá/điều kiện được xác nhận. QR cố định từ ảnh chủ dự án cung cấp chỉ là phương án dự phòng sau khi xác minh mã và thông tin nhận tiền.

Giữ nguyên ranh giới: chỉ nhánh `fix/liquid-glass-audit-2026-10-19`, PR #108; không sửa Admin branch, không sửa main, không merge PR #108/#111, không deploy Production. Contract chưa có nghĩa là tính năng đã được triển khai. Đối chiếu code/contract API và cập nhật báo cáo tiến độ trước khi tuyên bố hoàn thành.
