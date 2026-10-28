# HANDOFF LATEST — SINDAREALEST / PRODUCT OPTIONS & LIQUID GLASS
**Ngày kiểm tra:** 2026-10-28 (Asia/Ho_Chi_Minh). **Dự án đang tiếp tục**, không bắt đầu lại.

## 1. GitHub và quyền triển khai
- Repository: `chichute5500/Sindarealest-admin`
- Nhánh **duy nhất được sửa tiếp**: `feat/product-options-shoes-belts-phone-2026-10-28`.
- PR: [#137](https://github.com/chichute5500/Sindarealest-admin/pull/137) **OPEN / DRAFT / CHƯA MERGE**; không được tự merge.
- **Source checkpoint đã QA và deploy Preview**: `925272ae72327e53c839d845bc3a15bf3be1b085`. Commit bàn giao tài liệu sau checkpoint này chỉ bổ sung tài liệu; khi mở chat mới **phải truy vấn GitHub HEAD mới nhất**, không ngầm coi source SHA là HEAD.
- Main được xác minh tại checkpoint: `a5605ea9a18320854ac45d913c9f5cc939cd1ff2`, chưa nhận PR #137.
- [Preview cách ly](https://product-options-1028.sindarealest-admin-preview.pages.dev/): `https://product-options-1028.sindarealest-admin-preview.pages.dev/`. **Không phải Production**; D1/R2 Preview phải được kiểm tra tách biệt trước mỗi deploy.
- **Không** ghi/chỉnh Production D1/R2, không đổi sang `main`, không merge hoặc deploy Production nếu Owner chưa cho phép rõ ràng.

## 2. Owner đã yêu cầu và tính năng đã hoàn thành về logic
- Giày (bao gồm nhóm mới được Admin tạo như Giày boot): size `38`, `39`, `40`, `41`, `42`, `43`, `44`.
- Thắt lưng: bản dây `3.5` / `4.0` cm, trên giao diện hiển thị `3,5` / `4,0` và đơn vị cm trên nhãn.
- Ốp điện thoại: tên/dòng máy do khách nhập (2–80 ký tự), giữ ô nhập vì không phải danh sách hữu hạn.
- Mọi lựa chọn cố định trên chi tiết sản phẩm được hiển thị **nút bấm riêng**, không dùng select/dropdown. Ô giày/thắt lưng **tròn 40×40 px**, phù hợp PC/mobile; `aria-pressed` và bàn phím hỗ trợ. Nếu màn hẹp tự xuống hàng.
- Thêm giỏ, đặt ngay, đơn hàng, API quote/order, Admin và bản ghi bảo hành giữ đúng lựa chọn. Giỏ tách dòng theo giá trị tùy chọn; tổng lượng tối đa và tồn kho vẫn theo **sản phẩm**, không theo mỗi size. Với giày, lưu `order_item_details.size` đã tồn tại; tên item snapshot giữ size/bản dây/tên máy để Admin nhận biết.
- Server tra loại hàng bằng category/record thật trong D1, không tin category/giá client. Giá, cọc, QR, Zalo, 6 bước đơn hàng, bảo hành và các phần đã được Owner PASS trước đây **không bị làm lại**.
- Nguồn liên quan: `public/index.html`; `public/admin/index.html`; `functions/_product-options.js`; `functions/api/checkout-quote.js`; `functions/api/orders.js`; `tests/e2e/product-options-mobile-desktop.spec.js`; `tests/e2e/product-options-admin-mobile-desktop.spec.js`; `tests/product-options-flow.test.mjs`; workflow `.github/workflows/qa-product-options-20261028.yml`.

## 3. Lỗi thị giác Owner phát hiện — điểm phải ưu tiên ở chat mới
**Ảnh Owner cung cấp:** ảnh trên điện thoại, chi tiết “Giày Sục Da Cá Sấu” có nút trái tim phía trên ảnh sản phẩm và 7 nút size ở phía dưới. Owner hỏi “có giống nhau không?” — câu trả lời là **KHÔNG** tại thời điểm ảnh được chụp.
- Trái tim: **hình tròn**, Liquid Glass **ám xám**, cảm giác kính trong, viền có độ nổi.
- Ô size bản cũ: **trắng sữa/đục trên nền panel sáng**, nút size đã chọn 38 thì xanh đậm hơn; dù là tròn nhưng **không giống về thị giác**.
- Nguyên nhân đã nhận diện: đặt chất liệu kính trắng trong của nút trái tim (trên ảnh da tối) lên panel chọn size rất sáng làm kính thành trắng; tính “giống CSS” không bảo đảm “giống mắt”.
- **Đã sửa tiếp tại source SHA `925272ae7...`**: trong `public/index.html`, vùng `#productOverlay .sd-product-option-chip` dùng lens xám bán trong suốt khi theme sáng, viền phản chiếu, blur và bóng sâu hơn; khi chọn dùng xanh kính, không phủ đặc. Theme tối có công thức riêng. Nút trái tim **giữ nguyên**, không thay hệ icon đã PASS. `#productOverlay .sd-product-option-control` là input dòng điện thoại, vẫn dạng field chữ.
- **BẮT BUỘC không đánh dấu Visual Owner PASS.** Tuy mã đã qua CI Chrome, Owner **chưa xác nhận bằng mắt** phiên bản mới. Next chat nên mở/chụp/screenshot chính Preview ở 390px light/dark và PC, so sánh trực tiếp với icon trái tim, nhất là **tone xám, độ trong, viền, trạng thái selected, khoảng cách các nút**; nếu chưa giống thì chỉnh đúng CSS scoped, không chỉnh icon tim.
- **Không tự tuyên bố giống 100%** nếu chưa thực sự đối chiếu ảnh. Ảnh QA workflow là mock sản phẩm; không đồng nghĩa Preview có nguyên danh mục hàng Production.

## 4. Chứng cứ CI mới nhất (đã kiểm tra kết luận thật trên GitHub)
- [Chrome QA run 40622064394](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064394): **SUCCESS, 20/20 PASS** tại source `925272ae72327e53c839d845bc3a15bf3be1b085`; includes product details + cart + checkout, responsive PC/mobile, light/dark, selected chips and Admin; isolation checks SUCCESS, deploy to Preview project SUCCESS.
- [Chrome screenshots artifact 12787424063](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064394/artifacts/12787424063): ảnh mới nhất tương ứng source vừa QA, cần dùng để review thị giác; không trộn với artifact cũ.
- [Source CI 40622064498](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622064498): **SUCCESS**. [Source CI 40622070326](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622070326): **SUCCESS**.
- [Admin Preview Playwright 40622070296](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40622070296): **SUCCESS**.
- Có một run trước đó [40621755389](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40621755389) FAIL do assertion **sai khi yêu cầu nền idle theme tối phải khác trái tim**; đã sửa assertion theo theme và rerun **20/20 SUCCESS** trên `925272ae7...`. Không quay lại run lỗi để kết luận tình trạng hiện nay.
- Workflow run 40622064394 còn xác nhận deploy alias đúng `https://product-options-1028.sindarealest-admin-preview.pages.dev`.
- **Cảnh báo:** kiểm tra Cloudflare D1/R2 Preview binding là bước phòng ngừa, không phải chứng minh tuyệt đối an toàn R2.

## 5. Trình tự tiếp tục
1. Đọc **toàn bộ** tài liệu này, `docs/features/PRODUCT-OPTIONS-OWNER-REVIEW-2026-10-28.md` và `docs/features/PROMPT-NEXT-CHAT-2026-10-28-PRODUCT-OPTIONS-GLASS.md`.
2. Xác minh GitHub HEAD/PR/main/CI mới nhất và checksum source. Không thay đổi nhánh khác, không đụng PR audit #136.
3. Xem ảnh kiểm thử mới (artifact 12787424063), nếu có thể tự chụp Preview PC/mobile sáng/tối. So sánh **nút trái tim vs nút size** thực sự, không chỉ read CSS hay CI. Giữ tính năng nghiệp vụ hiện tại.
4. Nếu Owner chưa PASS vì vẻ ngoài chưa giống, sửa đúng `#productOverlay .sd-product-option-chip` ở stylesheet cuối, tránh bổ sung các selector trùng chéo/đổi CSS toàn web; kiểm tra gradient/alpha trên nền sáng.
5. Nếu sửa code, chạy đủ source check, Chrome 20 test, Admin E2E, check isolation trước Preview deploy. Chỉ báo PASS test sau GitHub kết luận SUCCESS.
6. Cung cấp link Preview và ảnh đối chiếu mới cho Owner duyệt; ghi rõ **đang chờ Owner Visual PASS**. Không merge PR #137 vào main cho đến khi Owner cho phép riêng.

## 6. Giới hạn phạm vi / các Owner PASS cũ
- Không đụng theme dark/light, Welcome, HERO, liquid glass icon system gốc, biểu tượng trái tim, thương hiệu xanh nhạt, QR cọc, link sản phẩm, tìm kiếm, tracking 6 bước, email/địa chỉ riêng tư, Admin bảo hành hoặc tính năng/thiết kế đã PASS.
- Không làm lại logic size/order/API đã xanh nếu không có regression thực sự.
- Do Preview D1/R2 riêng, không có nghĩa hàng Production được đồng bộ đầy đủ sang Preview; browser fixture chỉ là dữ liệu thử.
- Không xóa/sửa/ghi Production; không merge khi chưa được duyệt.

**Tóm tắt trạng thái:** Technical QA **PASS**; Preview **deployed**; PR #137 **DRAFT**; **Owner Visual PASS còn chờ** ở chất liệu Liquid Glass tròn sau ảnh phản hồi.
