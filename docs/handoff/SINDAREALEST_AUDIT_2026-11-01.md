# SINDAREALEST — STOREFRONT AUDIT HANDOFF — 2026-11-01
**Mục đích:** chat sau tiếp tục code ngay, chạy nhiều luồng độc lập, không hỏi lại lịch sử, không làm lại Owner PASS.

## Repo và giới hạn an toàn
- Repo: chichute5500/Sindarealest-admin
- NHÁNH DUY NHẤT ĐƯỢC SỬA: fix/audit-2026-10
- PR #159: https://github.com/chichute5500/Sindarealest-admin/pull/159 — OPEN / DRAFT / chưa merge
- Preview: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/
- HEAD nguồn trước commit handoff: 2dbe918315b7a37423a5e595f8291357cee7dd60. Chat sau bắt buộc lấy HEAD mới.
- Giữ Main, Production Pages, D1/R2 và secrets hoàn toàn nguyên vẹn. Không tạo đơn, giao dịch hay thử Google OAuth trên Production. Chỉ merge khi Owner PASS.
- Giữ thiết kế Light Liquid Glass / Dark Gold, Welcome/hero/mobile bottom bar, 15 danh mục, QR/checkout và những chức năng đã PASS; không tạo dự án mới, demo, ZIP, PR mới hoặc xếp thêm CSS override.

## ĐÃ LÀM, KHÔNG LÀM LẠI
1. Xử lý lời nhắn lỗi Mailjet/Preview/migration lộ cho khách; checkout hỗn hợp chưa có giá không lộ QR hoặc tùy chọn cọc. Checkout mocked 390px PASS: ba bước, quay lại, số điện thoại, Esc, chống gửi trùng, mất API địa chỉ rồi retry, 20 vòng đóng/mở tài khoản không khóa cuộn/nhân tab. Mock POST only; run https://github.com/chichute5500/Sindarealest-admin/actions/runs/41218647316 và run mới hơn.
2. Edge cache API /api/products 15 giây với show_prices đọc lại D1 mỗi request, cache tách theo trạng thái hiển thị giá/filter. Tests tránh lộ giá ẩn PASS.
3. SSR sản phẩm public no-JS có giới hạn SQL LIMIT 8, Product ItemList schema, 404 đúng. Preview SEO 69 là noindex CỐ Ý; không gỡ noindex Preview.
4. WebP chất liệu 720px, ảnh gốc giữ nguyên: texture dark 570424→63068 byte, albino 282668→26790 byte. Catalog images ngoài fold dùng IntersectionObserver (400px), direct catalog ưu tiên hình đầu.
5. Đã xóa full-screen drift, GPU promotion và ảnh watermark ẩn, chuẩn hóa các thử nghiệm CSS. Không claim CLS đã hoàn toàn hết.
6. Đã sửa ảnh logo mobile bị vỡ: HTML dùng images/brand-emblem-nav.webp nhưng file ban đầu KHÔNG TỒN TẠI. scripts/build-logo-asset.py tạo từ biểu tượng chính hãng, 117389→7688 byte. Cả workflow Preview và Production release pipeline (chỉ khi được duyệt) tạo và kiểm tra. Preview run 41226203925 PASS; ảnh chụp Light/Dark 390px đã đối chiếu không còn vỡ. Browser QA giờ bắt buộc img.decode() cho logo.
7. Ẩn layout Home đằng sau Welcome trong thời gian splash còn mở bằng visibility:hidden trong cùng CSS guard; thiết kế và chuyển cảnh Welcome không bị đổi.
8. A/B Welcome nội bộ: baseline CLS browser 0.1139; đặt khung Welcome cao min(700px, 100dvh-16px) giảm xuống 0.0407. Đã apply cho code HEAD mới, phải đo lại.
9. A/B Catalog mobile: baseline CLS browser 0.203, tạm loại .theme-bg **chỉ trong browser thử nghiệm** giảm 0.0354. Chưa được tắt nền thật vì ảnh hưởng thiết kế. A/B đã mở rộng contain:paint, contain:layout paint, contain:strict, composite; CHƯA ĐỌC KẾT QUẢ của lần chạy mới.

## BẰNG CHỨNG MỚI NHẤT ĐÃ ĐỌC
Lighthouse run https://github.com/chichute5500/Sindarealest-admin/actions/runs/41226203919 tại SHA 8cfab165ce921959749fcf86fce9ebadbc4c95aa:
- Home mobile Performance 55 / CLS 0.00 / LCP 8085ms / TBT 725ms.
- Catalog mobile Performance 69 / CLS 0.04 / LCP 9331ms / TBT 293ms.
- Home desktop Performance 100 / CLS 0.03 / LCP 379ms.
- Catalog desktop Performance 74 / CLS 0.22 / LCP 2675ms.
- Accessibility 100, Best Practices 100 cả 4; SEO Preview 69 noindex intentional.
Đây là kết quả **trước** các thay đổi slot-height Welcome/A-B contain gần nhất. KHÔNG được dùng thay cho số đo mới.

Tại thời điểm bàn giao:
- HEAD SOURCE 2dbe918315b7a37423a5e595f8291357cee7dd60, PR vẫn DRAFT.
- CI source/tests, Admin Preview Playwright và Google production preflight read-only tại HEAD: PASS.
- Preview deploy run 41226800826 PASS.
- **After QA Preview + Lightroom Lighthouse/CLS/A-B run 41226800786 đang chạy**, phải đọc kết quả khi bắt đầu chat mới; đừng chờ không làm gì.
- Các workflow được đặt tại .github/workflows/audit-preview.yml, audit-after-qa.yml, audit-checkout-browser.yml.
- Tools/tests: scripts/audit-readonly.mjs, scripts/audit-cls-probe.mjs, scripts/audit-layout-ab.mjs, scripts/qa-material-network.mjs, scripts/qa-audit-local-checkout.mjs, tests/catalog-ssr.test.mjs, tests/production-audit-fixes.test.mjs, tests/public-price-serialization.test.mjs.

## CHƯA PASS — CẦN LÀM THẬT
1. Đọc lại PR HEAD + run 41226800786 (sau handoff có thể đổi). So sánh ảnh chụp và LCP/CLS với các mốc cũ. Chỉ công bố số đo đã xong/đúng SHA.
2. Root-cause theme-bg fixed có shift ngay cả khi box hình học không đổi; dùng A/B/trace và ảnh Light/Dark, xử lý không tắt kính, không chồng CSS.
3. SSR → hydrated productCard() còn nhảy chiều cao; so product badge/SKU/title/footer với functions/_catalog-ssr.js. Không gắn giá/giỏ giả trong SSR.
4. Tối ưu LCP 8–10 giây, TBT/CPU mobile; xem Lighthouse JSON (LCP image/font/critical requests), R2 payload, ưu tiên ảnh đúng vùng thấy và tránh rows-read thừa. Không thay ảnh chất lượng cao trong detail.
5. Chụp/đối chiếu 360px/390px, Light/Dark, navbar, cart/checkout/account/order-tracking/warranty. Đừng claim Full visual PASS nếu chưa so.
6. Google OAuth với tài khoản test thật, phone ownership (Turnstile KHÔNG xác minh chủ SĐT), và thanh toán sandbox chưa E2E. Không dùng live payments/customer data, đừng khẳng định PASS.
7. Test thiết bị Android Xiaomi 15 Ultra chỉ có thể xác nhận khi có test thật. Mock Playwright không thay cho test tay thực.

## THỰC THI ĐA LUỒNG THẬT, KHÔNG CHỜ VÔ ÍCH
- LUỒNG A: CLS Welcome + theme-bg; A/B, Chrome trace và CSS hệ nguồn.
- LUỒNG B: SSR→CSR catalog, image/font/LCP, D1 Rows Read và performance.
- LUỒNG C: screenshots mobile/Light/Dark, 4-tab navbar, dialogs, quote/checkout, order/warranty GET/mocks.
- LUỒNG D: tests, privacy/Turnstile/price leak, GET-only network probes, CI và release gates.
- LUỒNG TÍCH HỢP: điều phối commits/chạy final CI/matching deployed SHA/Owner checkpoint.
**CHẠY CÁC TÁC VỤC ĐỘC LẬP SONG SONG** khi công cụ cho phép (Promise.all cho các truy xuất GitHub, các process/test khác file; multi-agent chỉ nếu có quyền truy cập thật). Tránh 2 luồng update public/index.html cùng lúc; mỗi lần update lấy SHA mới. Gộp thay đổi theo batch trước khi chạy final Preview, vì push liên tục từng file đã khiến nhiều Actions tự cancel. Nếu chờ một CI thì làm tác vụ độc lập khác thay vì chỉ poll. Không hứa làm nền hoặc yêu cầu người dùng chờ.
Giữ branch fix/audit-2026-10, không merge Main.

## NGHIỆM THU
- Source/test/Playwright/Preview có SHA chính xác, log rõ.
- Không broken images, visual parity ở Light/Dark/mobile và không chồng nav.
- So Performance/CLS/LCP trước–sau trong điều kiện có kiểm soát, không nhầm noindex Preview thành lỗi SEO.
- Đúng thông tin thanh toán, không rò rỉ giá ẩn/riêng tư, no Production writes.
- Nếu chưa đạt phải sửa tiếp và báo CHƯA PASS; yêu cầu Owner PASS trước Production.

## PROMPT CHO CHAT SAU
Bạn là Principal Frontend/QA/Performance Engineer tiếp tục **trực tiếp** SinDarealest Storefront trong repo chichute5500/Sindarealest-admin, branch fix/audit-2026-10, PR #159 OPEN/DRAFT. ĐỌC FILE NÀY trước; không hỏi lại lịch sử, không làm lại các mục Owner PASS, không làm demo/ZIP, không merge Main, không chạm D1/R2 Production hoặc giao dịch thật.

**YÊU CẦU ĐA LUỒNG VÀ TRÁNH THỜI GIAN CHỜ VÔ ÍCH:** kiểm tra PR HEAD, CI 41226800786, Preview source revision, ảnh chụp và mã nguồn **đồng thời**; chia luồng độc lập A (Welcome/theme-bg CLS), B (SSR catalog/LCP/R2), C (Mobile Light/Dark visual/checkout), D (QA/security/CI). Dùng parallel tools/processes thật, không giả vờ có subagents; khóa ghi vào một file và tích hợp bằng commit có trình tự. Khi CI chờ, xử lý vấn đề khác; không liên tục push khiến CI bị cancel. Sửa đúng nguyên nhân, bảo toàn kính Liquid Glass đã duyệt; đo A/B và tự chụp đối chiếu. Tự test và commit trên branch, chạy một vòng final Preview/Lighthouse, báo SHA, số điểm, PASS/FAIL và tồn đọng. Đừng gọi hoàn tất khi chưa có bằng chứng; chỉ xin Owner PASS trước merge.
