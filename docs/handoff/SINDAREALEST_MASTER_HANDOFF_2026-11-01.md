# SINDAREALEST — MASTER HANDOFF — 2026-11-01

**Tài liệu mới nhất cho chat tiếp theo.** Báo cáo tồn đọng theo % trước, **chờ Owner giao việc**; không tự code/merge/deploy. Tài liệu này ưu tiên hơn các handoff cũ nhưng phải lấy lại HEAD/CI thực tế trước khi kết luận.

## ĐÃ PASS — D1 Production, KHÔNG LÀM LẠI
- Repo: chichute5500/Sindarealest-admin; Production site: https://sindarealest2.pages.dev; Production D1: sindarealest-db; Preview D1: sindarealest-admin-preview-db.
- Main checkpoint SHA: 5930672817dedc030e7409ef04a6bf2625c998ab. PR #160 D1 ONLY đã MERGED.
- 0015 có 7 indexes. 0016 products revision: sort index + 3 triggers + settings marker. 0017 audit revision: sort index + 3 triggers + settings marker. Tất cả đã áp dụng Production.
- Production migration SUCCESS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/41236888312 . Kiểm tra đúng database, sao lưu bằng Time Travel bookmark và SQL export tạm, so sánh số bản ghi sản phẩm/đơn/khách/nhật ký/thanh toán trước-sau không đổi, 2 indexes + 6 triggers + 2 markers PASS.
- Main source/tests SUCCESS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/41237076323 .
- Production Cloudflare deploy SUCCESS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/41237076216 . Production đã được cập nhật code Admin đọc có revision + SQL orders GET; không mang thay đổi Storefront chưa Owner PASS của PR #159.
- **Kết luận D1: 100% phạm vi triển khai, PASS.** Chỉ còn quan sát Rows Read / Rows Written 24h+ dưới traffic tương đương, KHÔNG phải việc viết code lại. Số 167k/24h, -96.41% từ ảnh trước đó KHÔNG phải bằng chứng sau PR #160. Chưa có test login Admin Production bằng điện thoại thật.

## PR còn OPEN/DRAFT — re-fetch mỗi khi bắt đầu
| PR | Phạm vi | Snapshot | Tồn đọng chính |
|---|---|---|---|
| #159 | fix/audit-2026-10 — audit Storefront SEO/SSR/privacy/perf | b47f2348 trước commit docs, source/Preview/Admin Playwright PASS | mobile LCP/CLS, Owner visual comparison, OAuth/sandbox E2E; KHÔNG merge toàn PR |
| #154 | feat/admin-liquid-glass-2-2026-10-30 | 2a02f360, tests PASS | kính trong, rim hồng/cyan, độ nổi, top/bottom nav, thẻ khách, form edit; Owner visual >=95% chưa chứng minh |
| #158 | integration/storefront-ux-single-preview-2026-10-31 | 08096d97, unified Preview/test PASS | Owner duyệt visual và checkout; tránh xung đột #154/#159 |
| #155 | perf/d1-rows-read-safe-2026-10-30 | HEAD liên tục thay đổi và có phần D1 trùng Main | đối chiếu/rebase, bỏ trùng migrations/revision của #160, review riêng Storefront |
| #137 | feat/product-options-shoes-belts-phone-2026-10-28 | DRAFT | Size giày, bản rộng dây lưng, model ốp, giỏ nhiều biến thể, bảo hành; đối chiếu Main |
| #139 | feat/admin-android-apk-2026-10-28 | DRAFT | Build/test Xiaomi 15 Ultra thật, push, pull-to-refresh/session |
| #119/#120 | dynamic categories/bulk folder CSV import | DRAFT các nhánh phụ thuộc | đối chiếu Main; tránh nhập lại 218 sản phẩm/đụng sản phẩm cũ |

PR links: https://github.com/chichute5500/Sindarealest-admin/pull/154 ; https://github.com/chichute5500/Sindarealest-admin/pull/155 ; https://github.com/chichute5500/Sindarealest-admin/pull/158 ; https://github.com/chichute5500/Sindarealest-admin/pull/159 ; https://github.com/chichute5500/Sindarealest-admin/pull/160 .

Preview:
- Audit: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/
- Glass Admin: https://admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev/admin/
- Combined UX: https://combined-ux-1031.sindarealest-admin-preview.pages.dev/

## Owner PASS cần giữ nguyên
- Luxury SinDarealest, 15 danh mục chuẩn, xanh nhạt Light Liquid Glass / Dark Gold; hero, Welcome, gallery, deep links, mobile bottom navigation, các hạng mục từng PASS.
- Made-to-order chủ yếu 5–20 ngày: cọc 30% làm tròn lên 100k; hàng sẵn cọc 100k; thanh toán đủ -5% + freeship; không tạo QR/cọc sai khi chưa có giá; 6 bước tracking; bảo hành kích hoạt lúc Hoàn thành.
- Kính 2–3 lớp: trong/xuyên mờ, chiều sâu mềm, rim hồng/cyan mảnh. Không làm giao diện như nhựa/neumorphism, không stack override CSS, không tự hạ ngưỡng ảnh mẫu.
- Mobile Xiaomi 15 Ultra là trọng tâm. Playwright simulation không tương đương test trên thiết bị thật.

## Bảng TIẾN ĐỘ GỐC, chỉ mang tính ƯỚC TÍNH
| Nhóm | Ước tính đã xong | Còn lại / cần xác minh |
|---|---|---|
| D1 code + migration + release Production | **100% PASS** | Không cần sửa tiếp; chỉ đo Rows Read/Written hậu triển khai riêng |
| Giám sát D1 quota sau deploy | **Chưa đo** | Cần 24h+ dữ liệu so lưu lượng tương đương |
| Storefront audit PR #159 | **~80% lịch sử** | LCP/CLS mobile, Owner visual, auth & checkout E2E |
| Mobile Storefront performance | **~55% lịch sử** | Kiểm tra ảnh/font, CPU/TBT, CLS, đo lại ở đúng SHA |
| Mobile visual Storefront/Admin Glass và unified UX | **Chưa đủ bằng chứng %** | So CURRENT/TARGET, test Xiaomi, không giả định đạt >=95% |
| Auth / phone ownership / payment sandbox E2E | **Chưa đủ bằng chứng %** | Google OAuth thật có kiểm soát; Turnstile chỉ chống bot, không xác minh sở hữu SĐT |
| APK / options / bulk import | **Chưa đủ bằng chứng %** | Xem branch, Owner chọn ưu tiên, test thật |

Lighthouse chỉ là số lịch sử tại audit SHA 0c9faee, KHÔNG đại diện HEAD hiện tại: Home mobile Perf 57, LCP 7.055s, CLS .02; Catalog mobile Perf 62, LCP 11.434s, CLS .188. Preview SEO 69 do noindex chủ ý. Cần đo lại có kiểm soát, không tắt Liquid Glass hoặc tự bật Cloudflare Image Resizing trả phí.

## BẮT BUỘC KHI CHAT MỚI BẮT ĐẦU
1. Đọc file này và nếu cần handoff audit lịch sử docs/handoff/SINDAREALEST_AUDIT_2026-11-01.md. Lấy Main/PR/CI HEAD hiện tại bằng connector GitHub, đối chiếu Production và Preview read-only.
2. **CHỈ BÁO CÁO**, làm một bảng gồm NHÓM / % XONG / % CÒN / ĐÃ PASS / TỒN ĐỌNG / ƯU TIÊN / PR, có căn cứ cụ thể. Mục thiếu số liệu ghi “chưa đủ bằng chứng”, không bịa tỷ lệ hay visual parity.
3. Đề xuất thứ tự cần làm, **DỪNG và chờ Owner giao hạng mục**. Không commit, merge, deploy hay thay D1/R2 khi chỉ được hỏi trạng thái.
4. Khi Owner chọn nhóm mới, mới được làm trên đúng nhánh/PR, chia luồng độc lập song song nếu công cụ cho phép, chụp so ảnh mobile Light/Dark, kiểm tra CSS chồng, QA đúng SHA, không tự merge Production chưa PASS.
5. Không coi Draft PR là code đã chạy Production, không coi CI PASS là visual Owner PASS, và không đề nghị làm lại D1 Production đã hoàn thành.
