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

## CHECKPOINT TIẾP THEO — 2026-11-01 (SOURCE SHA 0c9faee9ca79)

**PR #159 vẫn OPEN/DRAFT**, branch `fix/audit-2026-10`; chưa merge Main/chưa triển khai Storefront Production. D1/R2 Production, secrets, thanh toán/đơn thật không thay đổi. Chạy song song GitHub Actions Source/Preview/Playwright/GET-only visual & Lighthouse thực tế; không giả định test thật trên Xiaomi 15 Ultra.

### Code & phép thử có bằng chứng
- `c41b41f19c`: thử thêm ảnh đầu tiên vào `<head>` preload chỉ ở SSR /sanpham. Kết quả Lighthouse Catalog mobile **72 / LCP 13457.96ms / CLS 0.04**, LCP probe 390px ~10452–10460ms; **KHÔNG tốt hơn mốc e49**. Đã rollback đúng hai file SSR/tests ở commit sau, không giữ tối ưu vô ích.
- `02d00d6e66`: `functions/api/products.js` dùng `context.waitUntil` để **không chặn HTTP response lúc ghi Cache API** nếu Pages cung cấp waitUntil; môi trường test không có waitUntil thì vẫn await như cũ. TTL 15s, phân tách priceMode và fulfillmentType, `show_prices` vẫn đọc lại D1 từng request; tuyệt đối không cache dữ liệu giá ẩn/Admin. Unit test mô phỏng ghi cache chậm và khẳng định HTTP trả trước khi ghi hoàn thành. `scripts/audit-lcp-probe.mjs` bổ sung resource timing theo tài nguyên; không thu thập thông tin khách.
- `0c9faee9ca7941bb85fa36d7863618cb7d2419bb`: giữ receiver `context.waitUntil(...)` đúng chuẩn Pages (không tách phương thức mất `this`); test guard có assert `this===context`. Source automated tests **PASS** runs `41233007502`, `41233010803`, Admin Preview Playwright **PASS** run `41233010801`, Customer Google preflight chỉ read-only **PASS** run `41233010818`. Mock checkout `41232846203` PASS ở commit 02d.
- QA độc lập `41233007424` **SUCCESS** trên SHA 0c9: kiểm tra SSR routes/404, 20 screenshots Light/Dark tại 360/390/768/1280/1920, kiểm tra chuyển SSR→CSR ảnh đầu và sắp xếp không thay đổi 360/390px, LCP probe, CLS/A-B và Lighthouse. Artifact `13054237493` (lấy qua GitHub Actions). Đây không phải xác nhận visual >95% so với ảnh Owner.
- Lighthouse 0c9: Home mobile Perf **57 / LCP 7055ms / CLS 0.02 / TBT 719ms**; Catalog mobile Perf **62 / LCP 11434ms / CLS 0.188 / TBT 234ms**; Home desktop Perf **98 / LCP 778ms / CLS 0.07**; Catalog desktop Perf **84 / LCP 2901ms / CLS 0.03**. Accessiblity/Best Practices 100 cả bốn; SEO Preview 69 do noindex có chủ đích. **CHƯA PASS PERFORMANCE**. Kết quả mobile Catalog biến động lớn giữa các lần đo; c41 Perf72 / LCP13458 / CLS0.04. Không tuyên bố chắc chắn LCP được cải thiện bởi cache waitUntil.
- Resource trace **hai lần lặp** 390px CPU4x mạng 1.6Mbps: ảnh LCP /media/f68f91f0... (~68.5KB) tải xong khoảng 4.87–4.89s, lần vẽ LCP cuối 10.42–10.49s; NotoSans-Regular (~179KB) tải xong 10.21–10.27s và NotoSerif-Regular (~190KB) 10.59–10.63s. Nhiều ảnh khác cạnh tranh băng thông, một ảnh ~569KB, điều kiện nhắm mục tiêu 1.6MB image savings. Đây là **bằng chứng tương quan muộn với font swap**, không đủ để tự kết luận nguyên nhân duy nhất. Đừng đổi font, giấu ảnh sản phẩm hay xóa Liquid Glass để nâng điểm; hướng thực tế là thumbnail responsive được xây không ghi đè R2 gốc và không tự bật dịch vụ trả phí.
- A/B CLS 390px Catalog baseline 0.0354; Lighthouse 0c9 đơn lần CLS0.188. Probe cũng có trường hợp bất thường `.theme-bg` cố định gây shift giả 0.097/0.142. Không xóa background kính dựa trên một phép đo; cần đo lặp cùng điều kiện và xem trace layout.

### Lỗi kiểm thử Preview vừa phát hiện
- Preview deploy run `41233007448` triển khai bundle thành công nhưng smoke test **ngay sau deployment** thấy trang chủ HTTP 500 một lần, kết luận run **FAIL** (đừng xóa lỗi này). Trong cùng commit 0c9, run độc lập `41233007424` đã chờ source marker đúng SHA, rồi GET Homepage/Catalog SSR hợp lệ và chạy đủ 20 ảnh QA PASS. Nghi là propagation sớm của Pages, chưa chứng minh tuyệt đối. `.github/workflows/audit-preview.yml` được điều chỉnh **retry tối đa 12 lần, cách 3s**, luôn xác thực đúng `audit-source-revision.txt == GITHUB_SHA`, SSR/JSON-LD/canonical và lỗi HTTP; **500 dai dẳng/HTML sai vẫn FAIL**. Cần xác minh workflow commit mới thực sự PASS; không được gọi run 41233007448 thành PASS.

### Việc còn phải hoàn thiện
- Mobile Catalog ảnh nặng/LCP 10–14s, Home TBT dao động; test responsive thumbnails và font-swap một cách độc lập, không tự phát sinh phí Cloudflare Image Resizing/ghi R2 Production.
- Kiểm tra visual parity thật với ảnh mẫu Owner và điện thoại Xiaomi 15 Ultra; 20 ảnh QA chỉ bảo đảm screenshot, không xác nhận tương đồng >95%.
- Google OAuth thực với tài khoản thử, xác minh chủ SĐT, thanh toán sandbox E2E chưa xác nhận; không dùng tài khoản khách thật/thanh toán thật.
- Không merge Main/Production nếu Owner chưa PASS. Chỉ báo đúng SHA/runs đã hoàn tất, tránh ghi nhầm CI cũ thành kết quả mới.

## PROMPT CHO CHAT SAU
Bạn là Principal Frontend/QA/Performance Engineer tiếp tục **trực tiếp** SinDarealest Storefront trong repo chichute5500/Sindarealest-admin, branch fix/audit-2026-10, PR #159 OPEN/DRAFT. ĐỌC FILE NÀY trước; không hỏi lại lịch sử, không làm lại các mục Owner PASS, không làm demo/ZIP, không merge Main, không chạm D1/R2 Production hoặc giao dịch thật.

**YÊU CẦU ĐA LUỒNG VÀ TRÁNH THỜI GIAN CHỜ VÔ ÍCH:** kiểm tra PR HEAD mới nhất (source checkpoint 0c9faee; docs/workflow commit có thể mới hơn), CI 41233007424 (SUCCESS, số liệu ghi phía trên), Preview source revision, ảnh chụp và mã nguồn **đồng thời**; chia luồng độc lập A (Welcome/theme-bg CLS), B (SSR catalog/LCP/R2), C (Mobile Light/Dark visual/checkout), D (QA/security/CI). Dùng parallel tools/processes thật, không giả vờ có subagents; khóa ghi vào một file và tích hợp bằng commit có trình tự. Khi CI chờ, xử lý vấn đề khác; không liên tục push khiến CI bị cancel. Sửa đúng nguyên nhân, bảo toàn kính Liquid Glass đã duyệt; đo A/B và tự chụp đối chiếu. Tự test và commit trên branch, chạy một vòng final Preview/Lighthouse, báo SHA, số điểm, PASS/FAIL và tồn đọng. Đừng gọi hoàn tất khi chưa có bằng chứng; chỉ xin Owner PASS trước merge.

---

## CHECKPOINT MỚI NHẤT — 01/11/2026 — PR #159, mobile F5, CSS first paint, Welcome

**ĐÂY LÀ CHECKPOINT ĐƯỢC BỔ SUNG SAU NHỮNG PHẦN HANDOFF LỊCH SỬ PHÍA TRÊN.** Master handoff + prompt cùng thư mục là nguồn hướng dẫn ưu tiên. Mọi HEAD/CI lịch sử phía trên có thể lỗi thời.

- Repo: chichute5500/Sindarealest-admin; branch: fix/audit-2026-10; PR #159 OPEN/DRAFT, không merge, không Production. Trước commit tài liệu này, HEAD e4cf36fd30326d8b7c81f6a2913e15cdfbca8df2; sau khi cập nhật file phải re-fetch HEAD.
- #154 đã MERGED (Owner/AI khác, bảo vệ Admin), #155 OPEN/DRAFT AI khác, #158 Owner bỏ vì lỗi và PR CLOSED không merge, #160 D1 Production MERGED/PASS, tuyệt đối không làm lại.
- Owner chấp thuận tối ưu thiết kế Welcome (cũ không ưng); Welcome mới được cập nhật source nhưng CHƯA được Owner PASS.
- Commit 13f6de0d: wrapper 404 thành div để còn đúng một main; #order auto expand; tư vấn Zalo + biến thể; reveal một lần bằng unobserve; Welcome rút gọn, rim pink/cyan, 1050ms.
- Commit fac442ff: Welcome h2, Hero h1; subset WOFF2 bảo toàn tiếng Việt + hợp đồng kiểm tra.
- Commit afc8ebe9: chặn cart/checkout drawer ló ra khi F5 với visibility:hidden ban đầu, chỉ xóa guard khi mở thật; browser mock QA reload.
- Commits dca65acf, 3534e70e, 80ab246d, c78d8d95, 73bc8450: Owner chụp header “SinDarealestThời Trang Da Cá Sấu” dính chữ khi F5 và vùng trống dưới Hero; điều tra thấy 28 inline style blocks, 12 in-body (~128 KB), đã chuyển tất cả 28 vào head theo nguyên thứ tự và giữ nguyên nội dung CSS; bindReveal(document) trước await products API; test mới quan sát brand tại thời điểm parse.
- e4cf36fd: Preview-only dispatch; current deployed candidate SUCCESS, https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291532629; source/test SUCCESS https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291532642; mock mobile checkout và header early parse PASS tại dca65acf https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291134877.
- CSS audit read-only ở CI: 102 nhóm selector/context lặp, 70 nhóm có giá trị khác nhau; KHÔNG được gọi tất cả là bug, chưa dọn hết. Tính theo source lúc kiểm tra: 28 style blocks trong head, 0 trong body.
- LCP/CLS/TBT sau thay đổi cuối chưa được đo và so A/B đúng cùng điều kiện. Số lịch sử ở SHA 0c9faee: Home mobile Performance 57/LCP 7.055s/CLS .02/TBT 719ms; Catalog mobile Performance 62/LCP 11.434s/CLS .188/TBT 234ms. Cần đo mới, không claim performance PASS.
- PR #159 hiện diverged với Main: ahead 201, behind 156, 87 files và trạng thái GitHub dirty/merge conflict. public/admin/index.html khác Main; migrations 0015–0017 giống blob Main; bảo vệ #154 và PR #155. Không merge hoặc overwrite Main khi chưa được Owner PASS.
- Outstanding P0: nghiệm thu F5 và Welcome trên Xiaomi thật, đối chiếu ảnh 360/390px Light/Dark; performance LCP/CLS/TBT/FPS mới; kiểm thử drawer/checkout và Google OAuth/sandbox an toàn; xử lý CSS ghi đè có chủ đích; an toàn tích hợp Main.
- BẮT BUỘC THỰC HIỆN ĐA LUỒNG CÓ THẬT: A CSS/visual, B Perf/SSR, C Mobile/checkout browser QA, D Security/tests, E read-only Main integration. Đọc/đo/test độc lập chạy song song; khóa ghi source chung public/index.html và commit tuần tự; gộp patch rồi mới Preview 1 candidate; không bỏ thời gian chờ CI vô ích. Xem chỉ dẫn chi tiết tại MASTER HANDOFF và PROMPT CHAT MỚI.
- Chỉ phụ trách PR #159, không tạo PR khác, không dùng #158, không chạm Production D1/R2, không sửa #154/#155, không merge Main, không tự công bố Owner PASS.


## CHECKPOINT TIẾP NỐI — 01/11/2026 — dock mobile không chờ sản phẩm

- Repo / PR / branch: chichute5500/Sindarealest-admin, #159 OPEN/DRAFT, fix/audit-2026-10; tuyệt đối không merge Main/Production, không ghi D1/R2, không đụng #154/#155/#158/#160.
- Source sửa mới: commit afa86825b3713f1550677a444fd9777632f31f00. Nguyên nhân: setupMobileBottomNav và setupNavSpy đặt sau await fetch('/api/products'); markup #mobileBottomNav lại nằm sau script khởi tạo. Đã đăng ký bottom dock ở DOMContentLoaded (hoặc chạy ngay nếu DOM đã ready), nav spy chạy trước API, bỏ gắn sự kiện sau hydration. Không thay đổi CSS, Admin hay schema.
- Browser local mocked checkout run 41293535518: SUCCESS. Playwright tạo 11 ảnh artifact 13077869665, bao gồm 360px và 390px Light/Dark với /api/products bị trì hoãn 7 giây; Cart/Account mở ngay trước response, không viết request POST thật. Checkout/phone/quote không giá/Back/Esc/address retry/20 vòng account còn PASS.
- Test source cũ có giả định sai rằng nav spy phải nằm cạnh slideshow sau API. Đã cập nhật contract ở tests/catalog-ssr.test.mjs (commits 10709150, d2caeba9) và tests/storefront-audit-ux-regressions.test.mjs (commit 1ca2944cae92784372522b454ceea52939fd6a59). CI full source run 41293860611: SUCCESS.
- Luồng E read-only: so Main 9fce1a85c9c19620a8269cce80575cdc92d9919c với audit: diverged, ahead 202/behind 156 trước code-fix; migration 0015–0017 và functions/api/admin/products.js, admin/orders.js là blob giống Main; public/admin/index.html khác Main, KHÔNG SỬA. Không resolve merge conflicts/merge Main.
- Preview gần nhất xác minh trước lượt sửa: e4cf36fd, run 41291532629 SUCCESS. Lượt này đưa marker để chạy MỘT lần isolated Preview sau CI; kiểm chứng exact audit-source-revision trước khi nói Preview PASS. Lighthouse mới nhất, LCP/CLS/TBT/FPS và Android thật, full Owner-reference visual chưa PASS.
- CSS audit vẫn 102 nhóm selector/context trùng / 70 nhóm có giá trị khác (dữ liệu audit trước, không được coi là số bug), không dọn bừa hoặc thêm override. Không báo đã tối ưu hiệu năng khi chưa có A/B cùng điều kiện.
- BẮT BUỘC: tiếp tục luồng A CSS/Welcome/F5, B LCP/CLS/font/SSR, C mobile screenshot chức năng, D security/checkout, E conflict; chỉ một writer public/index.html và HEAD lease trước commit; giữ Owner PASS; Preview-only; đợi Owner PASS trước release.

## CHECKPOINT QA — 2026-11-01 — LCP + PREVIEW + MAIN INTEGRATION
- Repo `chichute5500/Sindarealest-admin`; existing PR #159 on `fix/audit-2026-10` OPEN/DRAFT. Source+Preview QA candidate commit `ee1da987f878cd477bf16f1af8a72d6957a05ba4`; Main stays at `9fce1a85c9c19620a8269cce80575cdc92d9919c`. DO NOT merge Main, change Admin, alter Production D1/R2 or claim Owner PASS.
- Main-vs-audit comparison at candidate: **ahead 215 / behind 156 / 90 files**. 20 paths modified on both sides; 11 have exactly identical Git blob, nine differ. These are *overlaps*, not proof that all nine are textual merge conflicts. See `docs/qa/PR159_MAIN_INTEGRATION_PLAN_20261101.md`; retain Main's newer Owner-PASS Admin UI.
- Source fix in prior candidate `c50b815b`: first-visit Welcome releases when DOM ready, no longer waits for /api/products; checkout province list loads only on checkout open. Mock browser on 360/390 Light/Dark passed (run 41294763445); source and Preview run 41294961360 / 41294961227 passed.
- Source fix `dd216f48` prioritizes first two SSR+CSR catalog images. Full CI 41295951676 PASS, independent Preview 41295951750 PASS, remote read-only QA 41295951684 PASS. Lighthouse **catalog-mobile** Performance 77, LCP 6043.61ms, CLS .04, TBT 70ms vs earlier `c50b815b` Performance 73, LCP 10607.91ms, CLS .04, TBT 41ms. Two separate runs, not a guaranteed population average. Home mobile 77 / LCP 1536.04ms / CLS .02 / TBT 1033.5ms at `dd216f48`; desktop Home 100, Catalog 98.
- Candidate `3cbf7f7` introduced validated first-row SSR image preload hints on direct catalog routes only; Home untouched. Source CI 41297037913 PASS. Trigger commit `ee1da987f878cd477bf16f1af8a72d6957a05ba4`, independent Preview 41297169711 PASS, source CI 41297169898 PASS, **GET-only screenshot/SSR/motion/Lighthouse QA** 41297169778 PASS, artifact accessible from GH Action. Lighthouse: Home mobile Performance **80**, LCP 1733.09ms, CLS .02, TBT 753.5ms; catalog mobile **77**, LCP **6027.57ms**, CLS .04, TBT 79ms; Home desktop 100 / 358.23ms LCP; Catalog desktop 98 / 1081.08ms LCP. No material catalog gain versus 6.04s prior; do NOT claim preload alone solved LCP.
- Repeated restricted-network LCP probe catalog 390px Light: first priority change ~5800–6116ms (`dd216f48`), preload ~5548–5584ms (`ee1da987f878cd477bf16f1af8a72d6957a05ba4`); variance exists. Browser reports first-viewport image LCP source `/media/f68f91f0-c01d-4261-94e3-9a43311f98a2.webp`. Other product image source ~569KB and all eight catalog photos begin loading near first viewport. Durable improvement likely requires **responsive smaller R2 thumbnails**, an authorized image-resize facility or upload pipeline; none authorized yet. Never touch Production R2 objects or enable paid Image Resizing without Owner approval. Avoid speculative CSS changes.
- QA screenshot coverage `audit/after/screenshots`: Home/Catalog Light/Dark at 360,390,768,1280,1920. Existing mocked checkout and navigation tests PASS. Remote screenshot evidence is not equivalent to Owner Xiaomi 15 Ultra test or `>=95%` visual reference PASS.
- CSS scan: 102 same-selector/context groups, 70 value conflicts across scopes; informational, not 70 bugs. A basic exact-duplicate scanner found ~1.5KB potential, insufficient to justify risky bulk cleanup. Layout A/B did not prove disabling theme background resolves current CLS. Welcome layout shift may be tied to async settings copy, measured around 0.019, below .1.
- Remaining tests requiring external permissions/Owner: actual Xiaomi 15 Ultra F5/Welcome Light/Dark/keyboard/cart; Owner approval of Welcome and visual >=95% with reference; real Google OAuth test account, phone ownership policy, and a non-Production payment sandbox if one exists. Do not make an actual payment or use real customers. E2E mocked checkout is not equivalent to signed-in test account/payment sandbox.
- Policy: branch must remain DRAFT; no Main merge/production updates without specific Owner PASS. Latest source is the QA candidate commit; documentation-only follow-on commits do not change deployed code but will not equal the pinned Preview SHA.
- Relevant direct links: PR https://github.com/chichute5500/Sindarealest-admin/pull/159 ; Preview https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/ ; SHA-pinned QA https://github.com/chichute5500/Sindarealest-admin/actions/runs/41297169778 ; CI https://github.com/chichute5500/Sindarealest-admin/actions/runs/41297169898 .
\n## CHECKPOINT VERIFIED — 2026-11-01 — offscreen SSR media gating (NO Production)\n
- Branch `fix/audit-2026-10`, PR #159 remains OPEN/DRAFT and **mergeable=false**. Validated source SHA `93d9057d3b7ea159649aca05f31086158791a644`; pinned Preview/remote QA SHA `d491e3ef1ab9f7c6be80e196310e1d9a384b1eac`. Preview: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/ . Main and all Production D1/R2 unchanged.
- Actual source modifications: `functions/_catalog-ssr.js` SSR routes defer photos 3–8 using `data-src`; `<noscript>` real same-origin fallback and JS-disabled stylesheet preserve all eight image cards. `public/index.html` installs existing IntersectionObserver before `/api/products` fetch, reveals deferred SSR photos as visible; API-failure fallback still scroll-loads. Source contracts `tests/catalog-ssr.test.mjs`; browser JS-disabled acceptance `scripts/qa-ssr-hydration.mjs`; mock timing race fixed in `scripts/qa-audit-local-checkout.mjs`.
- CI source `41298892694` **PASS**; local-only mocked checkout Playwright `41298892608` **PASS**; independent isolated Preview `41299050751` **PASS**, exact deployed SHA independently checked by read-only QA `41299050750` **PASS**. No payment requests, no customer-data writes. New read-only JS-disabled test reported: `PASS: no-JS catalog retains all six deferred product images and stable media boxes`.
- Baseline QA `ee1da987` Lighthouse mobile Catalog **77 / LCP 6027.57ms / CLS 0.04 / TBT 79ms**, Home **80 / LCP 1733.09ms / CLS .02 / TBT 753.5ms**. Candidate `d491e3ef`: Catalog **78 / LCP 5575.39ms / CLS .06 / TBT 101ms**, Home **87 / LCP 1666.70ms / CLS .02 / TBT 453.5ms**. Those are single-run lab samples and TBT/CLS can vary. Do not claim consistent improvement to Home from unrelated catalog code. Catalog LCP remains FAIL versus recommended 2.5s.
- Repeated limited-network browser probe Catalog 390 Light: baseline **5584, 5548ms**, candidate **4176, 3908ms**; Catalog 360 Dark baseline 5540, candidate 3912ms. In first run of each, 6 nonpreloaded R2 image requests were pushed from ~950ms to ~3227ms, removing contention for the 68KB LCP image. Larger raw R2 photos are still 300KB–569KB. Real responsive low-resolution variants still needed for substantial LCP gains. Do not enable Cloudflare paid image resizing or mutate Preview/Production R2 without explicit approval.
- Visual identity invariant: all **10** fully rendered Catalog screenshots across widths **360/390/768/1280/1920** in **Light and Dark** are *pixel-for-pixel identical* before `ee1da987` vs after `d491e3ef`. Verified by exact RGB array equality using saved GitHub Action artifacts. This does **not** establish >=95% parity with Owner's separate target design or Android Xiaomi device PASS.
- CSS audit 102 same-selector contexts / 70 differing value groups informational; do not remove all blindly. Main/audit merge conflict risk still open; `docs/qa/PR159_MAIN_INTEGRATION_PLAN_20261101.md` is read-only resolution matrix: protect newer Main Admin and full test union. **No Main merge/rebase or Production deploy authorized.**
- Remaining owner-required gates: physical Android F5/Welcome/drawer/checkout QA and subjective visual signoff; real Google OAuth test-account permission; payment sandbox (if available); **explicit approval** before generating/uploading derived ~400px card thumbnails into isolated Preview R2 or enabling a billed image pipeline; separate PASS/authorization for eventual Main merge/Production. Continue source-only tasks without waiting where possible, but do not claim production parity or payments when unverified.
- Links: CI https://github.com/chichute5500/Sindarealest-admin/actions/runs/41298892694 ; mock https://github.com/chichute5500/Sindarealest-admin/actions/runs/41298892608 ; Preview deploy https://github.com/chichute5500/Sindarealest-admin/actions/runs/41299050751 ; QA + screenshots https://github.com/chichute5500/Sindarealest-admin/actions/runs/41299050750 .
