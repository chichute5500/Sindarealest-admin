# PROMPT NEXT CHAT — SINDAREALEST / PRODUCT OPTIONS / LIQUID GLASS

Tiếp tục **trực tiếp dự án SinDarealest** trên GitHub, không bắt đầu dự án mới, không hỏi lại lịch sử, không làm lại các phần Owner đã PASS.

## GitHub checkpoint
- Repository: `chichute5500/Sindarealest-admin`
- **Chỉ sửa** branch: `feat/product-options-shoes-belts-phone-2026-10-28`
- PR [#137](https://github.com/chichute5500/Sindarealest-admin/pull/137) hiện **OPEN, DRAFT, CHƯA MERGE**.
- Source SHA đã QA/deploy: `925272ae72327e53c839d845bc3a15bf3be1b085`. Sau đó có commit chỉ tài liệu; **trước khi thao tác phải xác minh HEAD mới nhất, PR/main SHA, CI GitHub thực tế**.
- Main tại checkpoint: `a5605ea9a18320854ac45d913c9f5cc939cd1ff2`.
- Preview riêng: https://product-options-1028.sindarealest-admin-preview.pages.dev/

## BẮT BUỘC đọc đủ ba tài liệu trong repo
1. `docs/features/HANDOFF-LATEST-2026-10-28-PRODUCT-OPTIONS-GLASS.md` (mới nhất, ưu tiên).
2. `docs/features/PRODUCT-OPTIONS-OWNER-REVIEW-2026-10-28.md` (nguồn nghiệp vụ + QA chi tiết).
3. `docs/features/PROMPT-NEXT-CHAT-2026-10-28-PRODUCT-OPTIONS-GLASS.md` (file prompt này).

## Đã xong / KHÔNG làm lại
- Size giày 38–44, bản dây thắt lưng 3.5/4.0 cm, ốp điện thoại nhập dòng máy. Storefront/Admin/API/cart/checkout/order/warranty đã có logic và kiểm thử, không sửa lại nếu không có lỗi thật.
- Các lựa chọn cố định trên chi tiết sản phẩm là **nút tròn Liquid Glass 40×40px, mỗi số một nút**, không dropdown. Input tên máy vẫn là ô chữ.
- Các phần Owner đã PASS trước đây: theme sáng/tối, Welcome, HERO, icon trái tim và icon system, tông xanh nhạt, QR/cọc/giá, bảo hành, tracking sáu bước, thiết kế Admin, URL sản phẩm — giữ nguyên.

## Vấn đề Owner đang chờ nghiệm thu (ƯU TIÊN)
Owner gửi ảnh trên điện thoại: nút trái tim ở trên ảnh giày có **kính xám trong suốt**, nhưng các nút chọn size (38–44) bên dưới là **trắng sữa**, nhìn không giống chất liệu Liquid Glass của nút trái tim. Trước đó AI nhận định nhầm rằng chỉ cần cùng thông số CSS và hình tròn là đạt; **không được lặp lại sai lầm này**.

Đã sửa trong source `925272ae7...`: CSS `public/index.html` ở `#productOverlay .sd-product-option-chip` tạo tint xám bán trong suốt trên panel sáng, viền phản sáng, bóng và blur; trạng thái chọn phủ **xanh kính nhẹ**, không solid; dark mode có tint riêng. Lý do: kính trắng alpha trên panel sáng nhìn như nút trắng dù đúng thông số icon tim trên nền ảnh tối.

**Chưa có Owner PASS cho giao diện mới**. Nhiệm vụ tiếp theo:
- Tự kiểm tra bằng ảnh chụp thật hoặc artifact Chrome mới nhất, đối chiếu từng vòng tròn size/bản dây với **icon trái tim**. Ưu tiên xem trên viewport mobile 390px theme sáng giống ảnh Owner, rồi mobile dark/desktop.
- Nếu chưa giống hình ảnh: chỉnh **CSS scoped đúng vùng nút size**, tránh CSS chồng lớp, không sửa icon tim gốc. Phải có ảnh đối chiếu để báo cáo, **không tự nhận 100% giống**.
- Xác nhận trạng thái selected dễ nhận biết mà vẫn trong suốt; các nút cân đối 40×40px, không tràn ngang, không đổi chức năng giỏ/đơn.
- Chỉ khi Owner duyệt mới ghi Owner PASS.

## QA hiện có và an toàn triển khai
- [Chrome workflow 40622064394](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064394): **SUCCESS, 20/20 PASS** cho source `925272ae7...`, có screenshot artifact [12787424063](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064394/artifacts/12787424063), check Cloudflare Preview D1/R2 isolation và Preview deploy SUCCESS.
- [Source CI 40622064498](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064498) và [40622070326](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622070326): SUCCESS.
- [Admin Preview 40622070296](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622070296): SUCCESS.
- **Không** được sửa `main`, merge PR, deploy Production hoặc thao tác Production D1/R2 khi chưa có phép riêng của Owner. Preview là dự án cách ly, dùng fixture/mocks trong browser QA; không mặc định có catalog Production.
- Nếu có sửa mã thì phải test lại đầy đủ và cập nhật handoff đúng commit/check mới nhất. Không lấy CI của source cũ làm bằng chứng cho source mới.

Sau khi đọc tài liệu, **tiếp tục thực thi phần còn cần làm**, cung cấp Preview + screenshot đối chiếu và xin Owner Visual PASS. Không dừng ở lời đề xuất hoặc hỏi lại những yêu cầu đã xác định.
