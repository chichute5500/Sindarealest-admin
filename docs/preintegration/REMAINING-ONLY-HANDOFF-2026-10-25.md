# SINDAREALEST ADMIN — BÀN GIAO CHỈ CÁC VIỆC CÒN MỞ (25/10/2026)

**Giới hạn:** chỉ sửa nhánh Admin `feature/admin-isolated-handoff-2026-10-20`, [PR #111](https://github.com/chichute5500/Sindarealest-admin/pull/111). [Storefront PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108) và `main` READ-ONLY. Không merge, không sửa Production, không viết vào Storefront Preview còn chia sẻ tài nguyên Production.

## A. PASS ĐÃ KHÓA — KHÔNG LÀM LẠI

| Phần | Bằng chứng | Trạng thái |
|---|---|---|
| 12/12 màn hình và chuông thông báo có số chưa đọc | [Chủ dự án ký duyệt](../admin-audit/OWNER-VISUAL-APPROVALS-2026-10-25.md), source chuông `1f0b7fe16e809e323caa8567d230fe34b4b87014`, [deploy #40200290452](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40200290452), [visual #40200290474](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40200290474), 10/10 Actions SUCCESS | OWNER APPROVED (thiết kế, không phải release) |
| Admin R2 IMAGES/ORIGINALS PUT–GET–DELETE, SHA readback và cleanup 2 lần | [#40187426696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40187426696), artifact `12597070312` | PASS |
| POST Restore thật trên D1 mới dùng một lần, rollback và xóa D1 | [#40188752986](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40188752986), artifact `12597562027` | PASS |
| Auth/keyboard/performance **smoke** Admin Preview | [#40208397077](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40208397077), artifact `12604137595` | PASS trong phạm vi smoke |
| QA nghiệp vụ D1 synthetic và các test responsive đã PASS trước đó | Evidence đã lưu trong [audit](../admin-audit/PARALLEL-ACCEPTANCE-2026-10-25.md) | Không chạy lại nếu không đổi phần liên quan |

## B. BLOCKER THỰC SỰ CHƯA PASS

### P0-1: CHÍNH XÁC 2 LỖI CẤU HÌNH CLOUDFLARE STOREFRONT PREVIEW

[**Read-only run #40207822357**](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40207822357) FAIL tại bước kiểm tra bindings. Log thực tế báo:
- `STOREFRONT_PREVIEW_DB_SHARES_PRODUCTION`: Storefront Preview D1 cùng ID Production.
- `STOREFRONT_PREVIEW_ORIGINALS_PRODUCTION_BACKED`: Storefront Preview private R2 `ORIGINALS` trỏ Production.

**Đã PASS trong chính log:** Admin Preview DB/IMAGES tách Production, **Admin Preview ORIGINALS đã có và cách ly đúng**, public IMAGES giữa hai Preview dùng bucket cách ly khỏi Production. Bỏ blocker lịch sử `ADMIN_PREVIEW_ORIGINALS_MISSING`.

**Chỉ chủ dự án/quản trị Cloudflare thao tác, trên môi trường Preview của Pages project `sindarealest2`**:
1. Chuyển binding `DB` sang D1 **không phải Production**. Việc hai dự án Preview sẽ chia sẻ D1 hay đồng bộ riêng phải được thiết kế rõ trước khi tạo dữ liệu.
2. Chuyển `ORIGINALS` sang bucket **private Preview-only**, tuyệt đối khác Production `ORIGINALS` và public `IMAGES`.
3. Không sửa cấu hình Production, không sao chép dữ liệu thật. Sau thay đổi chạy **một lần duy nhất** read-only preintegration workflow để kiểm tra hai lỗi đã hết. Chưa cho phép write QA trước khi xanh.

### P0-2: HỢP ĐỒNG API/SCHEMA HAI NHÁNH CHƯA TƯƠNG THÍCH

Đối chiếu GitHub nhánh Admin và Storefront: Admin có `functions/api/order-payment.js`, `functions/api/payment-settings.js`, `functions/payment-qr/[key].js`, `migrations/0009_fulfillment_and_manual_payments.sql`; Storefront branch hiện **thiếu cả bốn**. Admin `functions/api/orders.js` tạo `orderAccessToken` trong khi Storefront không.

**Việc kế tiếp (chưa được cấp quyền sửa Storefront):** thiết kế bản vá contract/migration chọn lọc trên một **nhánh tích hợp dùng một lần** sau khi P0-1 PASS và chủ dự án cho phép; không nhập nguyên các UI file từ Admin làm mất Hero Storefront đã duyệt. Kiểm tra token trạng thái thanh toán, truy cập QR, dữ liệu đơn hàng và migration chỉ trên D1/R2 Preview cách ly, không giao dịch thật.

### P1-3: KẾ TOÁN/ĐỐI SOÁT NGOÀI HỆ THỐNG

Cần bản đối soát giao dịch/hoàn tiền với chứng từ ngân hàng đã được ẩn thông tin nhạy cảm và người phụ trách nghiệp vụ xác nhận. CI synthetic PASS không chứng minh tiền thật được đối soát. Chưa thể PASS bằng mã nguồn.

### P1-4: KIỂM TOÁN ĐỘC LẬP CHUYÊN SÂU

Còn thiếu văn bản nghiệm thu pentest toàn diện, WCAG có trình đọc màn hình và test với người dùng, tải đồng thời/hiệu năng có ngưỡng đo. Auth/keyboard/smoke #40208397077 đã PASS nên **không chạy lại smoke**; chỉ thực hiện phần chuyên sâu chưa có bằng chứng và không tự PASS.

## C. QUY TẮC BÀN GIAO

- Giao diện Admin: **12/12 OWNER APPROVED**, không yêu cầu duyệt lại.
- R2 và Restore disposable remote: **PASS**, không tạo lại test.
- Cổng tích hợp Storefront: **BLOCKED** vì hai binding P0, contract drift và các signoff còn thiếu.
- Không merge PR #111, không chỉnh PR #108/main/Production; không chạy ghi/khôi phục trên Storefront Preview còn trỏ Production.
- Mọi mốc mới phải chỉ rõ source SHA, workflow và phạm vi chứng minh. **Chưa đạt 100% tổng thể và chưa được phát hành.**

Đây là trạng thái mới hơn các báo cáo baseline cũ, không thay đổi kết quả PASS lịch sử.
