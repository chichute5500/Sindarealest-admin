# MASTER PROMPT TỔNG HỢP — SINDAREALEST2 WEB TĨNH + ADMIN, LÀM SONG SONG VÀ BÀN GIAO KHÔNG MẤT Ý

**Repository:** `chichute5500/Sindarealest-admin`  
**Nhánh web tĩnh đang làm:** `fix/liquid-glass-audit-2026-10-19`  
**Nhánh admin:** `feature/*` — phải xác minh tên nhánh và SHA thật trên GitHub trước khi làm.  
**Production:** tuyệt đối không sửa, merge hoặc deploy trong nhiệm vụ này.

## 1. Tài liệu nguồn bắt buộc — không được làm mất prompt gốc

Đây là file điều phối tổng hợp. Nó giữ nguyên nguồn prompt gốc bằng cách dẫn chiếu các tài liệu chuẩn hiện có, đồng thời bổ sung quy tắc làm việc song song và lưu yêu cầu mới vào cùng một nơi.

- **Prompt gốc/chuẩn về kiểm toán, thiết kế lại Admin và handoff Playwright:** [`docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md`](../admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md). Phải đọc toàn bộ, giữ các yêu cầu kiểm thử, bằng chứng, an toàn, lưu ảnh và bàn giao trong đó, trừ các điểm được điều chỉnh rõ ràng ở mục 2 bên dưới.
- **Biên bản phối hợp hai nhánh:** [`docs/handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md`](../handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md).
- **Prompt tiếp tục ở chat mới:** [`docs/prompts/NEXT-CHAT-PROMPT.md`](NEXT-CHAT-PROMPT.md).

Không dựa vào trí nhớ chat thay cho tài liệu. Khi yêu cầu mới xuất hiện, phải ghi vào file này và cập nhật file next-chat cùng một lần làm việc.

## 2. Quy tắc ưu tiên và làm rõ các yêu cầu cũ

Một số câu trong prompt Admin gốc giới hạn công việc vào Admin và nói không thay giao diện customer-facing. Quy tắc đó vẫn áp dụng khi đang làm **nhiệm vụ Admin**; nó không cấm nhiệm vụ web tĩnh riêng đã được người dùng giao và phê duyệt. Hai luồng sau đây cùng tồn tại:

1. **Web tĩnh/storefront:** tiếp tục trên `fix/liquid-glass-audit-2026-10-19`, theo ảnh tham chiếu web tĩnh và yêu cầu gốc của người dùng trong lịch sử/tài liệu dự án.
2. **Web Admin:** tiếp tục trên nhánh `feature/*` đã xác minh, theo ảnh tham chiếu Admin và prompt Admin gốc.

Hai công việc độc lập và được làm song song. Không buộc Admin chờ storefront; không buộc storefront chờ Admin; không sao chép thiết kế hoặc code từ nhánh này sang nhánh kia một cách máy móc. Không merge/cherry-pick giữa hai nhánh khi chưa có chỉ thị riêng.

## 3. Phạm vi giao diện được phép thiết kế lại

Trong phạm vi giao diện được giao, không để code/CSS/font/bố cục cũ cản trở việc đạt ảnh mẫu. Có thể thiết kế lại cấu trúc HTML phục vụ giao diện, bố cục, font chữ, cỡ chữ, khoảng cách, màu sắc, nền, hiệu ứng, responsive, điều hướng, thẻ, bảng, biểu mẫu, modal và trạng thái tương tác. Không chỉ phủ màu hoặc thêm hiệu ứng lên thiết kế cũ nếu kết quả không đạt ảnh tham chiếu.

Admin và storefront không cần giống pixel: storefront ưu tiên trải nghiệm mua hàng; Admin ưu tiên vận hành hiệu quả. Có thể thống nhất ngôn ngữ thương hiệu nhưng không ép dùng chung CSS, theme class, JS, token hoặc layout.

## 4. Những thứ phải bảo vệ

Không tự ý đổi hoặc làm hỏng logo, tên/nhận diện thương hiệu SinDarealest, dữ liệu sản phẩm, SKU, slug, giá, mô tả, ảnh và mapping ảnh, API, auth/phân quyền/session, nghiệp vụ, D1/R2, bindings, secrets, schema, backend, đơn hàng, khách hàng hoặc chức năng lưu dữ liệu. Thay đổi ngoài phạm vi giao diện phải được tách riêng và xin phép. Không đưa secrets/PII vào ảnh, log hoặc commit.

## 5. Quy trình thực hiện bắt buộc

1. Xác minh repo, branch, HEAD SHA, thay đổi hiện có, Preview URL và SHA mà deployment thực sự chạy.
2. Đọc prompt nguồn, tài liệu handoff, ảnh tham chiếu và code hiện tại. Nếu một tài liệu không truy cập được, ghi rõ; không tự đoán nội dung.
3. Chạy baseline và kiểm tra các script/test thực sự tồn tại.
4. Chụp ảnh ứng dụng đang chạy bằng Playwright; so sánh với ảnh tham chiếu ở cùng route, viewport, theme và trạng thái.
5. Liệt kê sai lệch cụ thể, tìm nguyên nhân gốc, sửa trong đúng nhánh và đúng phạm vi.
6. Sau mỗi vòng sửa có ý nghĩa: chạy test liên quan, chụp lại, so sánh, ghi kết quả và lưu bằng chứng lên GitHub nếu công cụ/quyền cho phép.
7. Kiểm tra chức năng và regression; không dùng mock hoặc ảnh tham chiếu thay cho ảnh chụp ứng dụng thật.
8. Cập nhật trạng thái, kết quả test, đường dẫn ảnh và commit SHA. Không báo PASS cho bước bị skip hoặc chưa chạy.
9. Ghi lại các điểm có thể ảnh hưởng nhánh còn lại: font, logo, assets, theme, responsive, global CSS, route/cache, gallery và hành vi tương tác.
10. Báo cáo trung thực những gì PASS, FAIL, BLOCKED, NOT TESTED. Không tuyên bố 100% nếu thiếu bằng chứng hoặc còn sai lệch chưa giải trình.

## 6. Quy tắc GitHub và Production

- Web tĩnh chỉ làm trên nhánh fix đã nêu và được xác minh.
- Admin chỉ làm trên nhánh feature thực tế đã xác minh.
- Không sửa `main`; không merge PR; không cherry-pick/ghi đè giữa nhánh; không deploy Production.
- Chỉ kiểm tra Preview. Không thay đổi cấu hình Production, secrets, database binding hoặc dữ liệu thật.
- Không xóa thay đổi chưa commit của người dùng, không force-push.
- Trước khi ghi file, đọc phiên bản hiện có; sau khi ghi, xác minh lại nội dung và commit trên GitHub.

## 7. Nhật ký phối hợp bắt buộc

Mỗi lần người dùng bổ sung, sửa hoặc thay đổi yêu cầu, hãy thêm mục mới vào phần **Yêu cầu đã bổ sung** ở cuối file này và đồng bộ với `docs/prompts/NEXT-CHAT-PROMPT.md`. Không xóa ý cũ; nếu ý mới thay thế ý cũ, ghi rõ ý nào bị thay thế, ngày và lý do. Không chỉ ghi trong chat.

Khi hai nhánh gần hoàn thành:
- Chốt branch + SHA + Preview URL của từng bên.
- So sánh ảnh theo viewport/theme tương đương.
- Phân loại vấn đề: storefront-only, admin-only, shared design/assets, API/data/backend, hoặc deployment/cache.
- Chạy regression chéo nếu thay đổi có thể ảnh hưởng cả hai.
- Chỉ đề xuất đồng bộ sau khi có bằng chứng; không tự merge hoặc triển khai Production.

## 8. Yêu cầu đã bổ sung

### 2026-10-20 — hai luồng thiết kế độc lập, phát triển song song
- Admin không bị buộc giữ giao diện cũ và không phải chờ web tĩnh.
- Web tĩnh không phải chờ Admin.
- Cả hai được phép tái thiết kế phần giao diện trong phạm vi đã phê duyệt.
- Không merge/cherry-pick/copy thay đổi giữa hai nhánh trước khi có đối chiếu.
- Ghi lại các điểm có thể xung đột và kiểm tra chéo sau khi cả hai có Preview gần hoàn thiện.
- Mỗi khi người dùng thêm ý mới, phải cập nhật file prompt master và file next-chat, không dựa vào lịch sử chat.

## 9. Câu lệnh tiếp tục ngắn gọn

Người dùng có thể nói: **“Tiếp tục theo MASTER PROMPT TỔNG HỢP SinDarealest2. Đọc tài liệu nguồn và handoff, xác minh nhánh/SHA, cập nhật các ý mới vào cả hai file prompt, rồi tiếp tục công việc trên Preview; tuyệt đối không đụng Production.”**

Không chỉ trả lời bằng kế hoạch nếu có thể thực hiện thật.