# SINDAREALEST ADMIN — ĐÁNH GIÁ MÃ NGUỒN TRƯỚC TÍCH HỢP

**Ngày:** 2026-10-25 · **Trạng thái:** CHƯA NGHIỆM THU 100% · **Phạm vi:** chỉ Admin trên PR #111, **KHÔNG** merge với website, KHÔNG chạy migration Production, KHÔNG thay đổi binding/DNS/secret của Production, KHÔNG thực hiện giao dịch tiền thật.

## 1. Định danh, cách ly và nguồn bằng chứng

- Repository: `chichute5500/Sindarealest-admin`.
- Nhánh Admin sửa được: `feature/admin-isolated-handoff-2026-10-20`. PR #111 vẫn OPEN.
- Mã nguồn và kiểm thử gần nhất được đánh giá: `f0bd664fa359aa197c274e8648e71c79e67567a9`.
- Nhánh Production `main` trước kiểm tra: `227622d3e3b7c75724ffa1775b193da71089269a`; không được phép thay đổi.
- Admin Preview đã deploy giao diện ở `c64e07fca248dc527361c4d018dc26c11f5b3570`; các commit sau đó chỉ thêm kiểm tra/workflow/tài liệu, không cần deploy mã ứng dụng.
- Website thử nghiệm là nhánh KHÁC `fix/liquid-glass-audit-2026-10-19`, PR #108. **Không hề ghép hai nhánh trong đợt kiểm tra này.**

## 2. Rà soát đầy đủ bề mặt API Admin

Đã liệt kê 22 module route dưới `functions/api/admin/`. Kiểm tra kiểm soát phiên, nguồn yêu cầu, giới hạn kích thước/kiểu dữ liệu và dấu vết audit; thêm kiểm thử hồi quy `tests/admin-route-auth-surface.test.mjs` để không vô tình bỏ xác thực.

| Nhóm | API | Kết quả/tồn tại |
|---|---|---|
| Xác thực | `login`, `logout`, `session` | SameSite=Strict, Secure, HttpOnly, phiên ký HMAC, kiểm tra origin; kiểm thử rate-limit và session rotation đã có |
| Sản phẩm | `products`, `products/[id]`, `products/reset-skus` | Auth bắt buộc, validation SKU, giá, ảnh và fulfillment; có kiểm tra race, vẫn cần end-to-end với website sau này |
| Ảnh sản phẩm | `upload` | WebP công khai / ORIGINALS riêng; nếu ORIGINALS thiếu phải 503 không ghi IMAGES; lỗi write thứ hai rollback private key mới tạo, đã bổ sung test |
| Đơn hàng | `orders` | Trạng thái/giá kiểm soát server, audit, bảo vệ không mở lại đơn đã hủy, chặn sửa giá sau giao dịch |
| QR/ngân hàng | `payment-qr`, `payment-qr-upload`, `payment-qr-preview`, `payment-requests`, `payment-transactions` | QR cần xác minh thủ công, ledger nhận/hoàn và audit, kiểm tra race/unique; **chưa nghiệm thu R2 live và thanh toán thật** |
| Bảo hành | `warranties`, `warranty-claim-image` | Bảo vệ đường dẫn ảnh, chỉ route Admin được đọc ORIGINALS, kiểm tra bảo hành và đính kèm; chưa nghiệm thu live PRIVATE R2 |
| Khách hàng/hoạt động | `customers`, `audit-logs` | Auth bắt buộc và read từ D1; cần thử độ lớn/performance production-like trên DB riêng |
| Cài đặt và sao lưu | `settings`, `backup`, `restore` | Đã có test V1/V2 rollback và giới hạn dung lượng; chưa nghiệm thu POST Restore trên remote D1 dành riêng cho test |
| Công cụ | `ai-description`, `push-subscriptions` | Có auth, giới hạn body/rate cho AI và giới hạn endpoint push; cần kiểm tra quyền binding, hạn mức và xử lý lỗi ở môi trường đích |

Kết quả kiểm tra tĩnh 22 route **không** tương đương kiểm định penetration test, kiểm tra quyền thủ công từng endpoint, hay nghiệm thu toàn bộ luồng UI.

## 3. Những sửa đổi thực tế của vòng kiểm toán

1. `a16dcc6`: sửa workflow tiền tích hợp để FAIL CÓ CHỦ ĐÍCH khi phát hiện Preview D1/R2 trùng Production hay thiếu ORIGINALS, thay vì trả kết quả SUCCESS giả.
2. `cb7b2da`: thêm `scripts/admin-preview-binding-safety.mjs`, `tests/admin-preview-binding-safety.test.mjs`, và chốt Cloudflare metadata **trước mỗi deploy Admin Preview**. D1 hoặc IMAGES/ORIGINALS Production => chặn; ORIGINALS không gắn => được deploy giao diện nhưng cảnh báo upload bị vô hiệu hóa. Không thay đổi binding.
3. `9820ebe`: thêm test duyệt toàn bộ 22 module Admin, kiểm tra route xác thực và các yêu cầu cookie/session.
4. `f0bd664`: bổ sung thử nghiệm ảnh thất bại khi thiếu ORIGINALS và rollback nếu ghi ảnh công khai thất bại. Mọi thử nghiệm này dùng binding R2 giả lập, không ghi đối tượng R2 thật.

## 4. Ranh giới Cloudflare hiện đã chứng minh (P0)

Pre-integration metadata workflow sau khi chuyển sang **fail closed**: [#40167641001](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40167641001) — FAILURE **đúng như kỳ vọng**. Chính xác 3 blocker:

- **P0-A:** `STOREFRONT_PREVIEW_DB_SHARES_PRODUCTION`. D1 website Preview trùng Production; cấm thử ghi trên website thử nghiệm.
- **P0-B:** `ADMIN_PREVIEW_ORIGINALS_MISSING`. Admin Preview thiếu binding private R2; không thể thử upload ảnh gốc sản phẩm/bảo hành live.
- **P0-C:** `STOREFRONT_PREVIEW_ORIGINALS_PRODUCTION_BACKED`. ORIGINALS website Preview trùng bucket ảnh gốc Production; cấm upload thử.
- **Đạt:** D1 Admin Preview tách Production và IMAGES của hai Preview dùng bucket thử nghiệm chung, tách hai bucket ảnh Production.

**Chỉ có chủ tài khoản/config Cloudflare mới có thể xác lập đích bucket và database chính xác.** Không được giả định bucket mới là private chỉ vì tên khác; phải kiểm tra public URL, R2.dev, access grants và token. Sau mỗi thay đổi, chạy lại preflight GET-only trước khi ghi dữ liệu. Không thay đổi môi trường Production.

## 5. D1, schema, data và backup

- Schema hiện có các migration `0001`–`0009`; `0009` bổ sung `fulfillment_type`, token đơn, yêu cầu chuyển khoản và ledger. Các bài test SQLite/Wrangler local đã chạy bản migration tương ứng, Restore POST, quản lý QR, khóa/race và FK.
- Admin Preview trước đây có QA với ảnh chụp 72 màn hình và disposable D1 run-owned, hai lượt cleanup đều xác minh **0 row** trong bảy bảng, [#40162834106](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40162834106).
- Chưa có bằng chứng hoàn chỉnh: Restore POST V2 lên một D1 remote hoàn toàn disposable và xác minh xóa/khôi phục trong cùng môi trường, không phải Production.
- Database lớn, truy vấn hiệu suất, backup vượt 5.000 record/20 MB được fail-closed nhưng chưa có bài kiểm tra chiến lược sao lưu lô đủ quy mô.

## 6. UX, thương hiệu, website và thử nghiệm

- Logo chính thức đã được giữ màu gốc, không áp CSS hue-rotate; [#40165551290](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40165551290) PASS.
- Bộ ảnh 12 màn hình × 320px/390px/1280px × light/dark = **72 ảnh** đã kiểm tra đúng viewport, không trùng; Editor/Gallery seam tại 320/390 = 0px. Đây là bằng chứng capture, **không phải** so khớp bản thiết kế chuẩn và được người dùng duyệt.
- 12/12 bản thiết kế tham chiếu vẫn cần đánh giá parity theo cùng dữ liệu/trạng thái, kiểm thử bàn phím và screen reader; rubric chứng cứ trước đó ghi **0/12 visual accepted**, 32/100 *trọng số chứng cứ*, tuyệt đối KHÔNG đọc thành % hoàn thành dự án.
- Admin Preview và web thử nghiệm dùng hai nhánh/API khác nhau, đặc biệt migration 0009 và order-payment; chưa có thử nghiệm bên cạnh nhau với môi trường DB test tách Production. **Không thực hiện hợp nhất**.

## 7. Điều kiện kết luận đủ 100% trước tích hợp

Chỉ công nhận khi có: (1) 3 blocker P0 Cloudflare được giải và preflight PASS; (2) data/schema/access migration an toàn trên bản sao test được kiểm; (3) upload/read/cleanup R2 private và public bằng object QA riêng; (4) 100% luồng sản phẩm, đơn, thanh toán hoàn, bảo hành, backup/restore kết thúc có readback+audit/rollback; (5) security/session/CSRF/permissions/performance kiểm đầy đủ; (6) 12 màn hình cùng dữ liệu được duyệt; (7) xác nhận bằng SHA/test artifact; và (8) được chủ dự án chấp thuận riêng để **sau đó mới cân nhắc** việc tích hợp. Không dùng số lượng CI xanh để thay cho các bằng chứng đó.

## Trạng thái cuối đợt này

- **An toàn của các sửa đổi mã nguồn nêu trên:** CI độc lập của Admin đã qua các bài thử liên quan; chỉ những bước có kết quả công khai mới được công nhận.
- **Cloudflare Preintegration:** FAIL đúng thiết kế vì 3 blocker P0 chưa xử lý.
- **Sẵn sàng tích hợp:** **BLOCKED**.
- **Main/Production/Website Preview:** giữ nguyên và không được sửa/ghi dữ liệu trong đợt này.
