# SINDAREALEST — QA tích hợp checkout/Payment và release gate (26/10/2026)

> **REMOTE PREVIEW D1 GATE ĐÃ PASS (cập nhật 26/10/2026).** Các câu ghi "chưa kiểm thử ghi trực tiếp remote Preview" phía dưới thuộc checkpoint cũ và **đã được giải quyết cho hành trình đặt hàng → Admin**: Workflow [#40279420747](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747) tại SOURCE SHA \`9c5c09ebe972e57c2d564fec0ad79087c989f000\` PASS cả 3 jobs. **Remote D1**: 22/22 bước PASS, tạo đúng 1 đơn giả qua \`POST /api/orders\` tới Pages Preview thật, Admin xác nhận giá/terms, kiểm tra token/auth/CSRF/QR fail-closed, hủy đơn, **cleanupVerified=true**. Không ghi Production/không chuyển tiền; không tạo QR/nhận tiền/refund giả trên DB Preview dùng chung. **Remote QR/ledger real-write chưa làm** và chỉ thử an toàn trên disposable như mô tả bên dưới. Artifact [remote E2E #12631321770](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747/artifacts/12631321770), [Chromium screenshots #12632006392](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747/artifacts/12632006392). Commit \`cb9398b98f8ccdb1b3d0ca9dca8cc55473a9c5dd\` chỉnh riêng workflow Admin: PR tích hợp tự **SKIPPED** đúng nhánh thay vì FAIL giả; Admin Preview [#40279463480](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279463480) và CI [#40279463469](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279463469) PASS. Đến lúc này chỉ còn Owner xem Preview tích hợp cuối và **phê duyệt** trước merge/deploy. Production chưa thay đổi.


**MỤC ĐÍCH:** Bằng chứng kiểm thử bổ sung; không thay đổi các module giao diện/Admin đã OWNER PASS. Tài liệu này phân biệt nghiêm ngặt **local disposable E2E** với **giao dịch thật trên Remote Preview/Production**.

## 1. Checkpoint đã xác minh trực tiếp

- Repository `chichute5500/Sindarealest-admin`; working branch `integration/storefront-locked-on-main-2026-10-26`.
- **Last tested source commit:** `cfb9351424eea3d43a4fe2936a6f989be4dbe10a`. HEAD có thể vượt SHA này do commit tài liệu; phải so diff trước khi nghiệm thu.
- Baseline `main`: `db40af63965678598b0ebd3f3fe63865849dcf2e` (lúc xác minh 26/10).
- PR #118: **OPEN / DRAFT / NOT MERGED / mergeable**, compare source `ahead=14, behind=0`. Phải xác minh lại ngay trước merge.
- Isolated Preview: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
- Owner PASS, **KHÓA KHÔNG SỬA**: HERO code-only, Welcome, Gallery/fullscreen, Liquid Glass, hiệu ứng bay nguyên ô vào giỏ, Admin đã lên main.

## 2. Các bằng chứng có thể kiểm toán

| Hạng mục | Trạng thái / phạm vi | GitHub evidence |
|---|---|---|
| Source/migrations/security/Unit+integration | **PASS**, trên source `cfb9351` | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268196 |
| Admin Preview read-only browser | **PASS** trên `cfb9351` | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268193 |
| D1/R2 Preview isolation, preview exact SHA, deployment | **PASS** job 1 trên `cfb9351`, không ghi Production | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988 |
| Storefront 8/8 Chromium PC/Mobile × light/dark + public API GET | **PASS**, catalog **synthetic trong browser**, chặn ghi từ bài audit này | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988 |
| Backend journey trên một DB SQLite disposable áp dụng migration 0001–0009 | **PASS**, 29 kiểm tra status và nhiều assertions DB: public catalog, POST checkout, token hash, Admin nhận đơn, xác nhận giá/terms, QR, ledger, paid/freeship/refund/cancel, CSRF/permissions/fail-closed | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40276380203 |
| **Browser checkout 4/4 PC/Mobile light/dark** | **PASS**, UI lấy từ **live isolated Preview** nhưng mọi POST được chuyển qua Pages `functions/api/orders.js` **chạy cục bộ** trên SQLite disposable; Admin handler đọc cùng DB; mỗi biến thể tạo 1 đơn giả; **remoteWrites=0, realPayments=0** | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988 |
| Admin isolated Preview Playwright riêng, cố định dành cho nhánh Admin | **FAIL** tại branch/provenance guard nếu chạy trên nhánh integration; **không phải bằng chứng lỗi giao diện**. Không báo mọi workflow xanh | https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277268183 |

**Ảnh và JSON report:** Artifact [storefront-main-integration-cfb9351424eea3d43a4fe2936a6f989be4dbe10a](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988/artifacts/12630847523), id `12630847523`, 30 tệp, hết hạn **09/11/2026**. Có 8/8 ảnh viewport/Welcome/HERO, 4 ảnh checkout PC/Mobile sáng/tối, JSON audit và bản JSON checkout. Chỉ tuyên bố những gì artifact/log thực sự chứng minh.

## 3. Những gì đã kiểm thử trong một hành trình dữ liệu disposable

1. Chỉ seed sản phẩm / khách hàng QA, không sản phẩm thật; chạy API công khai đọc sản phẩm.
2. UI browser thêm sản phẩm → giỏ → checkout → gửi request; route POST bị chặn truy cập Cloudflare và **chuyển trực tiếp tới production-source handler chạy trong cùng tiến trình QA** với SQLite disposable; Admin route đọc lại đúng 4 đơn.
3. Backend integration trực tiếp khác kiểm tra orderNumber, token 64 ký tự, lưu SHA-256 chứ không lưu plaintext, snapshot item/contact, xác nhận giá/terms và các response fail-closed.
4. Cấu hình pending QR và bank draft **giả**; Admin xác minh và kích hoạt; tạo yêu cầu thanh toán đủ tự tính 150.000 VND; QR absent/stale/unverified phải bị từ chối.
5. Ghi ledger `received`/ `refunded` bằng mã giao dịch **giả**, đối chiếu đổi `payment_status`, freeship chỉ khi đủ tiền; từ chối duplicate, refund quá hạn mức, hủy đơn và yêu cầu mới sai trạng thái.
6. Cross-origin và session sai bị từ chối; `PRAGMA foreign_key_check` sạch; không gọi ngân hàng, không chuyển tiền, không ghi Preview D1 remote hay Production D1/R2.

## 4. Ranh giới đã biết / release blockers

- **KHÔNG có bằng chứng** giao dịch đã ghi trên **D1 remote Preview**; Chromium checkout sử dụng disposable SQLite, không phải `POST` đến Preview D1. Đây là lựa chọn fail-safe vì không có lý do để ghi ngoài fixture.
- **KHÔNG có bằng chứng** ngân hàng thật đã nhận tiền, QR scan từ ứng dụng ngân hàng, giao dịch hoàn tiền thật; ledger thử chỉ là kế toán giả lập, không dịch chuyển tiền.
- Browser regression 8/8 dùng danh mục mock; browser checkout 4/4 dùng API catalog và order handler thật nhưng DB disposable.
- Gate kỹ thuật hiện PASS theo **phạm vi local disposable + read-only Preview**. Nếu yêu cầu nghiệm thu giao dịch **ghi trực tiếp remote Preview D1** trước khi phát hành, cần một lần chạy chuyên biệt có fixture cách ly, quyền QA và bằng chứng không trùng Production; không tự diễn dịch local PASS thành remote PASS.
- **Owner approval** cho bản Preview tích hợp và merge/deploy Production chưa có. PR #118 phải tiếp tục DRAFT, không tự merge.

## 5. Checklist trước khi phát hành (owner-only approval required)

1. Kiểm tra `main` mới nhất so với PR #118: SHA, conflict, Admin regressions; không overwrite Admin mới.
2. Kiểm tra Actions và artifact **đúng head code SHA**, isolation D1/R2, migrations 0001–0009, Admin API auth, public product API, SEO canonical `/sanpham/{category}/{verifiedSKU-or-id}`, sitemap và legacy redirect.
3. Xem Preview https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ và ảnh checkout trong artifact, nghiệm thu **phối hợp cuối**, không duyệt lại phần Owner PASS.
4. Chủ web **chủ động cho phép** mới được chuyển PR #118 khỏi draft / merge main / deploy Production. Không cần tạo order thật để “thử”.
5. Sau triển khai kiểm SHA đang chạy chính xác, Cloudflare binding đúng môi trường, API read-only, login/Admin smoke, canonical/SEO, Pages logs/metrics và rollback.
6. Rollback: ghi lại SHA main/Pages deployment production trước phát hành; khi có sự cố, chủ web quyết định rollback Cloudflare Pages về deployment an toàn hoặc revert commit tích hợp, kiểm tra lại API/bindings/migrations. **Không tự đảo ngược migration chứa dữ liệu Production hoặc xóa data**.

## 6. Thay đổi mới, chỉ test/workflow

- `tests/disposable-storefront-checkout-payment-e2e.test.mjs`: E2E handler chung trên disposable database.
- `package.json`: thêm E2E disposable vào `npm test`.
- `scripts/audit-storefront-checkout-disposable-browser.mjs`: Chromium PC/Mobile sáng tối với live Preview UI và local-only POST.
- `.github/workflows/integration-storefront-isolated-preview.yml`: chạy browser checkout sau gate isolation + audit 8/8; upload screenshot.
- **Không chỉnh public/index.html, CSS, Admin UI, Production backend logic** trong các commit QA bổ sung.

## 7. Bài test Chromium lần đầu FAIL — đã sửa đúng nguyên nhân, chạy lại PASS

- **FAIL:** workflow [#40276901952](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40276901952), source `82fbb391...`. Cả bốn cấu hình chỉ timeout ở thao tác Playwright nhấn `#skipIntro`; log: nút tồn tại trong DOM nhưng Welcome **đã tự biến mất** theo thiết kế Owner PASS (có cấu hình pointer interception trong mobile). Không có đơn nào bị tạo hoặc remote write trong lượt lỗi.
- **Nguyên nhân:** kịch bản QA giả định nút luôn còn hiển thị, trái với hành vi tự đóng hợp lệ của Welcome, không phải bằng chứng lỗi UI.
- **Sửa:** chỉ tệp test `scripts/audit-storefront-checkout-disposable-browser.mjs`, bỏ giả định, cho phép Welcome tự đóng và đợi trạng thái hidden; commit `cfb9351424eea3d43a4fe2936a6f989be4dbe10a`. Không sửa `public/index.html`, CSS hay Admin.
- **RETEST:** workflow [#40277262988](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40277262988), kết quả 4/4 Chromium checkout PASS + 8/8 GUI audit PASS, `remoteWrites=0`, screenshot/log artifact `12630847523`.
