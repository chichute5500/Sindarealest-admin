# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST STOREFRONT + ADMIN
**Ngày bàn giao 26/10/2026. Đây là dự án đang triển khai, KHÔNG tạo dự án mới.**

## NHIỆM VỤ
Tiếp tục trực tiếp trên GitHub repository `chichute5500/Sindarealest-admin` bằng connector GitHub. Đừng hỏi lại lịch sử, đừng bắt người dùng dán tài liệu khác. Trước tiên đọc:
1. **CHECKPOINT CHÍNH THỨC MỚI NHẤT:** [`docs/integration/HANDOFF-STORE-ADMIN-OWNER-ACCEPTANCE-2026-10-26.md`](./HANDOFF-STORE-ADMIN-OWNER-ACCEPTANCE-2026-10-26.md)
2. [`docs/integration/QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md`](./QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md)
3. [`docs/integration/STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md`](./STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md)

**Nhánh làm việc:** `integration/storefront-locked-on-main-2026-10-26`; **PR #118** [mở tại đây](https://github.com/chichute5500/Sindarealest-admin/pull/118). Tại checkpoint kiểm tra trước các commit tài liệu bàn giao: PR **OPEN/DRAFT**, mergeable true, NOT MERGED, branch HEAD `a314a020cdabd96eb3154da0feb82e140670c696`, main `db40af63965678598b0ebd3f3fe63865849dcf2e`, ahead 26 / behind 0. **Đã có commit tài liệu mới hơn** nên PHẢI truy vấn HEAD hiện tại ngay, không xem SHA cũ là HEAD.

## ĐÃ HOÀN THÀNH / BẰNG CHỨNG
- **Nguồn code được triển khai và QA Preview thật:** `9c5c09ebe972e57c2d564fec0ad79087c989f000`; [GitHub Actions #40279420747](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747), **SUCCESS 3/3 jobs**.
- **D1/R2 Preview tách Production + deploy đúng SHA: PASS.** Preview tích hợp: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ .
- **E2E remote D1 thật: 22/22 PASS**: 1 đơn giả qua `POST /api/orders` đến D1 Preview, Admin đăng nhập/nhìn thấy/xác nhận giá và điều khoản/hủy; test hash token/auth/CSRF, chặn QR trước xác nhận và không cho client sửa số tiền; **`cleanupVerified=true`, `productionWrites=0`, `realTransfers=0`**. [Artifact báo cáo #12631321770](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747/artifacts/12631321770).
- **UI Chromium 8/8 PASS**, PC/Mobile sáng/tối; **checkout browser disposable 4/4 PASS** với HTML Preview thật + POST intercept vào SQLite cục bộ. [Ảnh, JSON artifact #12632006392](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747/artifacts/12632006392), hết hạn 09/11/2026.
- **E2E backend thanh toán QR/ledger nhận tiền giả/hoàn tiền giả/freeship/cancel PASS** với route handlers trên **SQLite disposable**, migration đến 0009; **CHƯA làm remote Preview ledger/QR write, CHƯA chuyển tiền thật, CHƯA xác nhận bank thật**. Không nói vượt phạm vi.
- **Workflow Admin isolated chạy sai branch đã được sửa thành SKIPPED đúng điều kiện** trên PR này, giữ nguyên guard SHA của nhánh Admin thật. [Run #40279918616](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279918616) SKIPPED. CI tại checkpoint `a314a020c` [#40279918700](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279918700) PASS; Admin Preview [#40279918598](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279918598) PASS.
- Các commit sau source QA trong checkpoint chỉ sửa workflow Admin branch guard và các file docs; **không sửa app/UI/backend/payment**.
- **HERO, Welcome, Gallery, các ô dịch vụ, Liquid Glass, hiệu ứng bay CẢ ô sản phẩm vào giỏ, giao diện Admin đã Owner PASS và KHÓA. KHÔNG thiết kế/sửa lại.**
- **main/Production chưa đổi; PR #118 vẫn DRAFT chưa merge.**

## NHỮNG VIỆC CHƯA XONG — THỰC HIỆN THEO THỨ TỰ
1. **Xác minh lại trạng thái thực tế:** `get_pr_info` PR118, main vs integration compare/diff/CI/latest branch HEAD, xem có mã app mới sau SHA PASS không. Chỉ báo PASS khi có logs. Không coi CI SKIPPED là FAIL; không coi remote D1 E2E chưa làm.
2. **Đưa Owner nghiệm thu BẢN TÍCH HỢP CUỐI**: cung cấp link Preview và ảnh artifact, hướng dẫn nhìn PC/Mobile, sáng/tối, trang chủ, danh mục, cart, checkout và Admin. Chỉ so regression, không hỏi duyệt lại từng thành phần đã PASS. Báo rõ QA kỹ thuật xong và giới hạn payment test.
3. **Nếu có lỗi thật Owner phát hiện:** sửa an toàn đúng phạm vi trên branch integration, chạy lại đủ QA, cập nhật PR và docs. Không tự sửa các module owner PASS khi chưa có lỗi có chứng cứ.
4. **Chỉ sau khi có sự cho phép rõ ràng của Owner:** recheck CI/security/branch/Production binding, chuẩn bị rollback, rồi merge PR118/deploy Production trong quyền được cho phép và verify deployed commit/API/order/catalog. **Không tự merge, không deploy, không ghi Production, không thử chuyển tiền** chỉ vì người dùng bảo “tiếp tục”.
5. Cập nhật hồ sơ bàn giao khi có sự kiện mới. Nếu Owner chưa cho phép merge, **dừng ở gate chờ Owner nghiệm thu**, trình rõ việc chờ quyết định; không báo “100% hoàn thành”.

## NGUYÊN TẮC BẮT BUỘC
- Không chỉnh `main`, không force push, không merge/deploy Production nếu Owner chưa phê duyệt rõ ràng.
- Không chạy bất kỳ test ghi nào trên Preview cũ `fix-liquid-glass-audit-2026.sindarealest2.pages.dev` vì rủi ro binding Production. Trước mọi QA ghi vào Preview phải đối chiếu chính xác DB và R2 khác Production.
- Không ghi ledger chuyển tiền hoặc hoàn tiền giả lên remote DB dùng chung. QR/ledger/freeship/refund đã PASS trong môi trường disposable.
- Không làm lại HERO/Welcome/Gallery/cart flight/Admin owner PASS. Không thay logo hoặc màu nhận diện trái mẫu.
- Tận dụng song song các lượt **đọc** độc lập; các lượt cập nhật GitHub tuần tự, kiểm HEAD và file blob SHA trước mỗi ghi.
- Báo cáo chính xác: **technical QA PASS không đồng nghĩa owner acceptance, merge hay Production PASS**.

**Yêu cầu chat mới:** Đọc nguồn bàn giao, kiểm tra trực tiếp, báo cáo cho Owner trạng thái thật và đưa bản Preview tích hợp để Owner quyết định. Không bắt Owner dán lại lịch sử.
