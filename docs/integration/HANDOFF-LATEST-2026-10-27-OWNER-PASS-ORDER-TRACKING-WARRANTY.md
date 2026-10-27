# SINDAREALEST — HANDOFF MỚI NHẤT 27/10/2026 — OWNER PASS TRA CỨU ĐƠN 6 BƯỚC & BẢO HÀNH

> **SOURCE OF TRUTH mới nhất cho chat kế tiếp.** Owner đã PASS giao diện Tra cứu đơn hàng rút gọn trên Preview. Đây là checkpoint bàn giao, không phải yêu cầu sửa code/merge Production. Những prompt/handoff cũ ghi PR #118 còn OPEN hoặc chỉ sửa nhánh integration đã lỗi thời.

## 1. Định danh, trạng thái GitHub và URL đã xác minh

| Mục | Trạng thái xác minh ngày 27/10/2026 |
| --- | --- |
| Repository | chichute5500/Sindarealest-admin |
| Nhánh code Owner PASS mới nhất | feat/warranty-short-code-2026-10-27 |
| **CODE SHA đã PASS** | **89657feb0b5bba186ff50b672a3af72687463741** |
| PR hiện tại | **#122 OPEN, DRAFT, chưa merge**; https://github.com/chichute5500/Sindarealest-admin/pull/122 |
| main Production | f50ec34910bbfc431b01d6603d7973f2b0e426f1 (merge PR #118, không gồm code mới từ PR #122) |
| Preview được deploy | https://order-six-review-1027.sindarealest-admin-preview.pages.dev/ |
| Cloudflare Pages | Project **sindarealest-admin-preview**, branch alias order-six-review-1027, khác Production |
| Workflow deploy đúng SHA | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40451693014 — **SUCCESS**, log xác nhận alias và SHA 89657feb... |
| Source + tests 1 | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40451693023 — SUCCESS |
| Source + tests 2 | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40451697405 — SUCCESS |
| Admin Preview Playwright | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40451697430 — SUCCESS |
| Admin isolated Preview Playwright | run 40451697429 — SKIPPED theo workflow, **không gọi là PASS** |

**Phân biệt code SHA và docs commit:** sau khi tạo tệp bàn giao này, HEAD sẽ đổi do commit tài liệu. Mốc Owner PASS vẫn là code SHA 89657feb..., không tự gắn nhãn QA SUCCESS cho code viết thêm sau mốc đó. Xác minh diff nếu HEAD cao hơn.

## 2. OWNER PASS MỚI — khóa, không tự sửa lại

### 2.1 Web công khai: Tra cứu đơn hàng
- Trên **public/index.html**, thẻ Tra cứu đơn hàng nằm **NGAY DƯỚI** khối Đặt hàng an tâm, **TRƯỚC** Sản phẩm nổi bật và **BÊN NGOÀI** phần Đặt hàng an tâm có thể thu/mở. Khách nhìn thấy ô ngay cả khi khối hướng dẫn đang đóng.
- Tra cứu được bằng **mã đơn hàng hoặc số điện thoại**; chức năng qua POST /api/order-tracking sử dụng dữ liệu D1 thực.
- KHÁCH thấy **6 mốc**, khác với 5 mốc ở Admin:
  1. Đã gửi đơn — tự đánh dấu xong khi đơn được tạo.
  2. Xác nhận đơn.
  3. Đã nhận cọc (đơn thanh toán đủ hiển thị Đã nhận thanh toán).
  4. Đang làm sản phẩm.
  5. Đã gửi hàng.
  6. Hoàn thành.
- Mốc **Đang làm sản phẩm** hiện đang làm khi trạng thái processing; chỉ coi xong khi đã gửi hàng. Chỉ bước **đã xong** mới hiển thị ngày/tháng/năm theo múi giờ Việt Nam; các mốc chưa xong/đang làm không có dòng ngày. Không tự bịa ngày từ orders.updated_at.
- **Giao diện tối giản vừa được Owner PASS** ở code 89657feb: **đã xóa hẳn** hai đoạn: “Nhập mã đơn hoặc số điện thoại đã đặt để xem 6 bước xử lý của Shop.” và “Chỉ hiển thị tiến trình đơn, không công khai thông tin cá nhân hoặc thanh toán. Liên hệ Shop nếu cần hỗ trợ.”; đã xóa CSS thừa và thu nhỏ padding/gap desktop/mobile. **Tuyệt đối không thêm lại hai đoạn hoặc padding cũ**.
- Giao diện: tiêu đề Tra cứu đơn hàng, label Mã đơn hàng hoặc số điện thoại, input, nút Tra cứu đơn; có thông báo lỗi/trạng thái và card timeline 6 mốc sau khi tìm thấy; light/dark và mobile/PC không thay CSS owner-pass.
- Bảo vệ riêng tư API: với tra cứu SĐT chỉ lộ mã đơn **che** dạng ••••4 ký tự cuối; không trả tên, SĐT, địa chỉ, số tiền, SKU, audit nội bộ; tối đa 10 đơn gần nhất; rate-limit 5 lần / 15 phút / IP, same-origin guard, body-size limit. Không gọi đây là xác thực OTP.
- File: functions/api/order-tracking.js; public/index.html (selectors sd-track, sdTrackForm, sdTrackResults); tests/order-tracking-public.test.mjs.

### 2.2 Bảo hành: sửa đúng lúc kích hoạt
- **Xác nhận đơn không phát hành/kích hoạt bảo hành.** Admin bước Xác nhận đơn nay ghi “Chốt giá và xác nhận điều kiện đơn hàng”.
- Chỉ khi đơn **lần đầu** đi tới completed mới phát hành tự động **một mã trên mỗi dòng order_item**, trong cùng transaction D1 với việc hoàn tất đơn và ghi nhận thu COD nếu có. Bảo hành bắt đầu ngày hoàn tất tính theo giờ Việt Nam.
- Mặc định: **tổng đơn dưới 2.000.000đ ⇒ 6 tháng; từ 2.000.000đ trở lên ⇒ 12 tháng**, không tính theo số tiền còn lại hay chiết khấu thanh toán.
- Mã bảo hành cấp **mới** dạng SDW-XXXX gồm bốn ký tự không mơ hồ, chống trùng bằng UNIQUE+retry transaction. Mã dài 24 ký tự **đã cấp trước đây** tiếp tục hợp lệ. Khách tra cứu bằng mã hoặc SĐT như trước.
- Không reset, phát hành trùng hay thay đổi các mã đã tồn tại; không tự backfill/sửa hồi tố bảo hành Production vốn đã được cấp từ lúc xác nhận theo code cũ.
- Admin vẫn có **5 bước** riêng (Xác nhận; Đối soát cọc; Làm hàng; Gửi hàng; Thu số dư & Hoàn tất) và chỉ mốc xong mới có ngày. **Không đồng bộ UI Admin thành 6 bước** khi chưa được Owner yêu cầu.
- File: functions/api/admin/orders.js, functions/api/admin/warranties.js (ngoại lệ), functions/_warranty-policy.js, public/admin/index.html, tests/warranty-auto-confirmation.test.mjs, tests/warranty-short-code.test.mjs.

### 2.3 COD và ngân hàng — quy tắc đang áp dụng
- Ví dụ đơn 9.000.000đ, khách cọc 2.700.000đ, còn 6.300.000đ: Shop chỉ đối soát/nhập cọc một lần. Khi chọn Hoàn tất có xác nhận Shop đã **thực sự thu** số còn lại, ghi receipt COD riêng; không cần nhập lần hai, không giả là giao dịch QR ngân hàng, chống double-post.
- QR khách quét **không chứng minh đã thanh toán**; không tự mark paid cho chuyển khoản chưa đối soát; giữ audit, không thay tiền đơn sau giao dịch đã nhận.
- Đây là quy trình đã Owner PASS trước mốc bàn giao này.

## 3. Các Owner PASS cũ vẫn khóa

- PR #118 đã được merge vào main (f50ec3...), bao gồm checkout QR, COD Admin, bảo hành phiên bản cũ, 5 bước Admin, sản phẩm/danh mục D1 và các giao diện được duyệt.
- Footer mobile logo trái và hai dòng chữ phải, VIP chữ **đỏ đậm đứng không in nghiêng**, các nút Thêm vào giỏ xanh / Đặt hàng ngay cam, Liquid Glass, HERO/Welcome, theme sáng/tối, catalog, QR lớn vuông 1:1, checkout chính chủ, cấu hình thanh toán, gallery/watermark đều Owner PASS. Không sửa ngoài phạm vi lệnh mới.
- PR #122 **CHƯA** merge; việc Owner PASS Preview không phải lệnh merge hay deploy Production.
- Không xóa/ẩn sản phẩm, ghi R2/D1 Production, gửi giao dịch thật, tự cập nhật tài chính hoặc chạy thay đổi khác khi chưa được giao.

## 4. QA & giới hạn bằng chứng

- Code 89657feb đã chạy npm run check + npm test trên workflow Review Preview 40451693014, CI push 40451693023, CI PR 40451697405 — tất cả **SUCCESS**.
- Admin Preview smoke test 40451697430 SUCCESS. Workflow Admin isolated Preview 40451697429 SKIPPED có chủ đích.
- Cloudflare log xác nhận **Deployment complete** và alias Preview với deployed source commit **89657feb...**. Không suy ra rằng đã có E2E nhập mã trên dữ liệu Production thật hoặc đã sửa các bảo hành lịch sử. Test tra cứu dùng SQLite tạo mẫu và guard backend.
- Scoped CSS sd-track đã tinh gọn; không tự dọn chồng CSS hàng loạt. Khi có thay đổi giao diện mới phải kiểm tra PC/mobile và light/dark, cùng source QA, không ghi nhầm thông số sai.
- Trước khi tác động release, fetch lại GitHub branch HEAD, PR #122, main, SHA của Cloudflare Preview và CI; cần một lệnh deploy/merge mới rõ ràng từ Owner.

## 5. Trình tự chat kế tiếp

1. Đọc file này và docs/integration/PROMPT-NEXT-CHAT-2026-10-27-ORDER-TRACKING-WARRANTY.md (bản mới nhất) trước; tệp docs/integration/PUBLIC-ORDER-TRACKING-6-STEPS-2026-10-27.md là tài liệu kỹ thuật kèm theo.
2. Fetch HEAD thực tế nhánh feat/warranty-short-code-2026-10-27, PR #122, main, Actions; phân biệt docs-only commit và code SHA đã Owner PASS.
3. **Không tự làm lại phần đã PASS**. Không có task code còn dang dở tại mốc chuyển chat. Chỉ thực hiện khi Owner giao việc mới; giới hạn file đúng phạm vi và kiểm thử trước khi báo PASS.
4. Khi được hỏi đưa main: kiểm tra mergeability, chạy CI đúng code SHA, xác minh CSS/PC/Mobile, bảo đảm PR #122 vẫn tương thích main, rồi mới thực hiện nếu được Owner **ra lệnh merge/deploy**; kiểm tra sau merge và Production workflow.
