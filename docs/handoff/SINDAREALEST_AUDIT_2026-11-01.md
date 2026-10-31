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
- **After QA Preview + Lighthouse/CLS/A-B run 41226800786 đã hoàn tất SUCCESS** trên code SHA 2dbe9183, chính xác với deployed audit-source-revision; 20 screenshots và GET-only network gate PASS.
- **Lighthouse mới nhất 41226800786:** Home mobile Perf 55 / CLS 0.00 / LCP 8103ms / TBT 660ms; Catalog mobile Perf 74 / CLS 0.04 / LCP 14439ms / TBT 7ms; Home desktop Perf 99 / CLS 0.07 / LCP 385ms; Catalog desktop Perf 83 / CLS 0.03 / LCP 3146ms. Accessibility/Best Practices đều 100, SEO Preview 69 do noindex.
- **A/B mới tại source SHA 2dbe9183:** Home mobile baseline CLS 0.0407; A/B fixed-welcome-box CLS 0.0026 (có thể là can thiệp CSS lần hai chứ không phải chắc chắn sẽ đạt như vậy ở mọi lần đo). Catalog mobile baseline 0.0354; no-hydration 0.0192; no-theme-layer 0.0627, contain-paint 0.0355, contain-layout-paint 0.0627, contain-strict 0.0518, promote-composite 0.0354. **Do not change/delete theme-bg based on earlier single-run finding**: A/B mới cho thấy tắt nền không giúp. Ưu tiên giải quyết SSR→CSR catalog jump thực sự.
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

## CHECKPOINT SAU TIẾP TỤC AUDIT — 2026-11-01 (source SHA e49ae966)

**Chỉ trên nhánh audit.** PR #159 vẫn OPEN/DRAFT. Main, Production Pages, D1/R2 và secrets không thay đổi. Checkout QA dùng dữ liệu giả/POST mock, GET-only cho Preview; không đăng nhập Google thật hoặc thanh toán thật.

### Code đã thay đổi
- `c274c664b3`: giữ lại nút ảnh DOM SSR đang tải khi catalog hydration sang CSR; bỏ lần render danh mục `all` thừa khi mở trực tiếp `/sanpham`.
- `bb611ac268`: sửa điều hướng History về Home để featured media khởi tạo lại sau khi bị trì hoãn trên route Catalog.
- `67268ef863`: lazy-init slideshow tác phẩm trên Home khi đến gần vùng nhìn, không tự chuyển ảnh khi offscreen hoặc đang ở Catalog; thêm `scripts/audit-lcp-probe.mjs` (GET-only/CPU4x/150ms/1.6Mbps).
- `be18cb2a1f`: đồng bộ sắp xếp `created_at DESC,id DESC` giữa SQL SSR và danh mục CSR; `craftTileImage` tải lazy; chụp ảnh QA chủ động decode ảnh; thêm `scripts/qa-ssr-hydration.mjs` để giữ thứ tự/ảnh đầu tại 360/390px.
- `859a7123fe`: khôi phục logo gallery PNG gốc do test Owner-approved `tests/product-card-liquid-glass.test.mjs` yêu cầu đúng asset. Commit `be18cb` đã từng FAIL vì đổi asset này; đã sửa và tests PASS, không được lặp lại.
- `e49ae966f8afd771558bfdea09990264c0d2b943`: ẩn ngay HTML panel Tài khoản đang đóng để ngăn nội dung account-note lọt vào LCP trước khi CSS đến; khi mở panel xóa inline visibility để CSS/animation hiện hữu điều khiển. LCP probe bổ sung assertion `closedAccountPaint=false`.

### CI / QA đã xác minh
- `859a7123`: Preview deploy + source tests + mocked checkout + GET-only audit-after **PASS**; run audit-after `41229952355`. 20 screenshots 360/390/768/1280/1920 Light/Dark, không lỗi. SSR→CSR 360/390px order + first image DOM node **PASS**.
- `e49ae966`: Preview deploy `41230553727` **SUCCESS**, source/tests `41230553788` **SUCCESS**, checkout mock `41230553706` **SUCCESS**, audit-after run `41230553737` **SUCCESS** với 20 screenshots/errors=0, LCP probe 4 trường hợp đều `closedAccountPaint=false`.
- Lighthouse `859a7123`: Home mobile **59 / LCP 6939ms / CLS 0 / TBT 611ms**; Catalog mobile **70 / LCP 12317ms / CLS 0 / TBT 54ms**; Home desktop **100 / LCP 392ms / CLS 0.027**; Catalog desktop **84 / LCP 2886ms / CLS 0.027**.
- Lighthouse `e49ae966`: Home mobile **42 / LCP 7407ms / CLS 0 / TBT 2181ms**; Catalog mobile **74 / LCP 13409ms / CLS 0.0361 / TBT 35ms**; Home desktop **96 / LCP 383ms / CLS 0.1236**; Catalog desktop **84 / LCP 2883ms / CLS 0.0267**.
- **Quan trọng:** Đây là các mẫu Lighthouse đơn lẻ, có dao động lớn do môi trường mạng/CPU/CI. Không kết luận `e49ae` tự gây ra Home TBT +1570ms; cần đo lặp có kiểm soát ở cùng SHA, cùng điều kiện. KHÔNG công bố Performance PASS.
- GET-only LCP probe Catalog 390px `859a` ≈10.39–10.44s; `e49ae` ≈10.44–10.52s. Trước đó `67268` ≈11.29–11.32s. Kết quả khác Lighthouse và không được thay thế số đo Lighthouse.
- A/B `theme-bg` vẫn dao động; không xóa nền kính hoặc xếp chồng CSS. Screenshot QA có thể xem trong artifacts của run 41230553737.

### Việc còn tồn đọng — KHÔNG tự công bố PASS
1. **Mobile Catalog LCP 12–14s, Home TBT không ổn định.** Lighthouse `image-delivery-insight` ước tính tiết kiệm khoảng 1.6MB ảnh; một ảnh 1350×1193 WebP ~569KB chỉ hiển thị ~187px. Cần nghiên cứu thumbnail responsive hiệu quả nhưng KHÔNG ghi đè R2 Production và KHÔNG tự bật Cloudflare image resizing có thể tính phí. Fonts Noto WOFF2 được xây không subset/glyph nguyên bản; không tự đổi phông.
2. A/B có kiểm soát CLS / Welcome / SSR→CSR trên mobile; không kết luận từ từng run riêng lẻ.
3. Đối chiếu hình tham chiếu Owner 360/390px Light/Dark, nav/cart/checkout/account/order/warranty; mock Playwright không bằng Android Xiaomi 15 Ultra thật; chưa tự công bố visual parity >95%.
4. Google OAuth thật, xác minh chủ SĐT (Turnstile chỉ chống bot), thanh toán sandbox E2E vẫn CHƯA PASS. Không thực hiện giao dịch thật hoặc truy cập Production.
5. PR giữ DRAFT, Main chưa merge. Chỉ chủ động đề nghị Owner PASS sau khi visual/performance thực sự đạt; không đưa Production trước Owner duyệt.

## PROMPT CHO CHAT SAU
Bạn là Principal Frontend/QA/Performance Engineer tiếp tục **trực tiếp** SinDarealest Storefront trong repo chichute5500/Sindarealest-admin, branch fix/audit-2026-10, PR #159 OPEN/DRAFT. ĐỌC FILE NÀY trước; không hỏi lại lịch sử, không làm lại các mục Owner PASS, không làm demo/ZIP, không merge Main, không chạm D1/R2 Production hoặc giao dịch thật.

**YÊU CẦU ĐA LUỒNG VÀ TRÁNH THỜI GIAN CHỜ VÔ ÍCH:** kiểm tra PR HEAD mới nhất (source checkpoint e49ae966; docs commit có thể mới hơn), CI 41230553737 (SUCCESS, số liệu ghi phía trên), Preview source revision, ảnh chụp và mã nguồn **đồng thời**; chia luồng độc lập A (Welcome/theme-bg CLS), B (SSR catalog/LCP/R2), C (Mobile Light/Dark visual/checkout), D (QA/security/CI). Dùng parallel tools/processes thật, không giả vờ có subagents; khóa ghi vào một file và tích hợp bằng commit có trình tự. Khi CI chờ, xử lý vấn đề khác; không liên tục push khiến CI bị cancel. Sửa đúng nguyên nhân, bảo toàn kính Liquid Glass đã duyệt; đo A/B và tự chụp đối chiếu. Tự test và commit trên branch, chạy một vòng final Preview/Lighthouse, báo SHA, số điểm, PASS/FAIL và tồn đọng. Đừng gọi hoàn tất khi chưa có bằng chứng; chỉ xin Owner PASS trước merge.
