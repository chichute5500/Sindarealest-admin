# SINDAREALEST — MASTER HANDOFF HIỆN HÀNH — 01/11/2026

> CHO CHAT SAU TIẾP TỤC LẬP TỨC. ĐÂY LÀ CHECKPOINT ĐANG LÀM DỞ, KHÔNG PHẢI BẢN OWNER PASS. Ưu tiên tài liệu này hơn các mục bàn giao cũ; luôn kiểm tra lại HEAD, Main và Actions trước khi chỉnh sửa.
>
> Đây là cập nhật tài liệu bàn giao. Không đồng nghĩa đã sửa xong các mục còn tồn đọng.

## 1. NGỮ CẢNH CHÍNH XÁC / PHÂN QUYỀN

- Repo duy nhất: chichute5500/Sindarealest-admin.
- AI của chat này CHỈ phụ trách nhánh fix/audit-2026-10, PR #159, mục đích Storefront audit/refactor/performance/visual QA.
- PR: https://github.com/chichute5500/Sindarealest-admin/pull/159
- Preview riêng đã triển khai: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/
- HEAD tại lúc cập nhật tài liệu: e4cf36fd30326d8b7c81f6a2913e15cdfbca8df2; commit tài liệu sau đây sẽ tạo HEAD mới. CHAT SAU PHẢI LẤY HEAD THỰC TẾ, không hardcode SHA cũ.
- PR #159 OPEN / DRAFT, CHƯA MERGE; GitHub PR mergeable=false, mergeable_state=dirty; 201 commit và 87 file khác Main tại checkpoint; compare Main ↔ #159: ahead 201, behind 156. Những con số này có thể thay đổi.
- PR #154 Admin Liquid Glass do AI khác: MERGED vào Main; TUYỆT ĐỐI bảo vệ code Admin hiện tại.
- PR #155 D1/performance do AI khác: OPEN / DRAFT; KHÔNG can thiệp branch hay kết hợp code khi chưa được giao.
- PR #158 unified UX: CLOSED, KHÔNG MERGED, Owner xác định DỰ ÁN LỖI, BỎ LUÔN; tuyệt đối không lấy code, thiết kế hoặc merge #158.
- PR #160 Production D1: MERGED, Owner PASS; migration 0015, 0016, 0017 đã chạy Production; KHÔNG làm lại, không cập nhật D1 Production.
- Không tạo nhánh/PR mới. Không merge Main, không deploy Production, không ghi D1/R2 Production, không thực hiện đơn hoặc giao dịch thật, không sửa secrets, không thay đổi Customer Production không được cho phép.
- Đọc AGENTS.md và docs/QA_RESOURCE_POLICY.md ngay lúc bắt đầu. Giới hạn Workers Requests reset lúc 00:00 UTC = 07:00 Việt Nam, nhưng PHẢI xác minh mức sử dụng hiện tại, không giả định ngày hôm trước vẫn hết lượt.
- Ngôn ngữ làm việc: tiếng Việt, chủ yếu mobile (điện thoại Owner Xiaomi 15 Ultra).

## 2. OWNER ĐÃ GIAO TRIỂN KHAI — KHÔNG CHỜ GIAO LẠI

Owner đã yêu cầu: sửa toàn bộ lỗi Storefront thuộc #159, refactor CSS/JS có kiểm soát, khôi phục chuyển động mượt, tối ưu LCP/CLS/TBT/FPS, đo và tự QA trên Preview. **Làm việc đa luồng thực sự, không để thời gian chờ vô ích.** Owner cho phép TỐI ƯU LẠI Welcome vì chưa ưng; thiết kế Welcome mới vẫn CHƯA Owner PASS. Không làm lại Hero/Gallery/15 danh mục và chức năng từng PASS trừ khi có lỗi cần sửa. Không mở rộng sang Admin Liquid Glass hay D1 của AI khác.

Nghiệp vụ không được làm hỏng:
- Light Liquid Glass xanh nhạt đa tầng, Dark Gold, rim phản quang hồng/cyan mỏng, chiều sâu kính thật (không nhựa mềm), tương thích mobile.
- 15 danh mục sản phẩm, link sâu danh mục/SKU, featured, tài sản ảnh, watermark chỉ ở chi tiết/lightbox.
- Sản phẩm đặt riêng chủ yếu 5–20 ngày, cọc 30% làm tròn LÊN mốc 100.000đ; hàng sẵn cọc 100.000đ; thanh toán hết giảm 5% + freeship; tuyệt đối không hiện QR/cọc trước khi giá được xác minh.
- Tracking công khai 6 bước, bảo hành kích hoạt ở Hoàn thành, không làm lộ dữ liệu điện thoại/đơn.

## 3. NHỮNG GÌ ĐÃ SỬA TRỰC TIẾP Ở ĐỢT 01/11/2026 TRÊN PR #159

A. Commit 13f6de0d:
- Loại thẻ main 404 thứ hai khỏi landmark bằng cách đổi wrapper của vùng 404 sang div; vẫn giữ HTTP 404.
- Khi đi tới #order (kể cả click từ chi tiết và hashchange), tự mở phần hướng dẫn đặt hàng bốn bước; hỗ trợ reduced motion khi cuộn.
- Tư vấn Zalo từ chi tiết sao chép SKU + tên + biến thể đã chọn, giỏ hàng sao chép từng SKU/tên/biến thể/số lượng.
- Scroll-reveal chuyển sang xuất hiện một lần: IntersectionObserver.unobserve ngay sau khi hiện; không ẩn lại khi cuộn ngược.
- Welcome rút nội dung và điểm phụ, thêm viền quang học hồng/cyan quanh logo, thời lượng mặc định từ 1450ms còn 1050ms; không xác nhận đẹp/đạt Owner PASS.

B. Commit fac442ff:
- Welcome heading từ h1 thành h2, Hero còn h1 chính.
- scripts/build-font-assets.py: WOFF2 subset tập ký tự Latin + tiếng Việt + dấu + ký hiệu; giữ TTF gốc; có kiểm tra glyph và contract test. Cần đo kích thước font build thực, tránh khẳng định giảm bao nhiêu khi chưa đo.

C. Commit afc8ebe9:
- Sửa drawer đặt hàng/giỏ hàng có thể “lướt qua” khi Android F5 vì CSS ẩn áp dụng muộn; đóng ban đầu ngay trong HTML bằng inline visibility:hidden; khi thật sự mở mới bỏ guard, giữ animation.
- Bổ sung Playwright giám sát trạng thái drawer NGAY TRONG LÚC DOM đang được parse; test reload trên mobile mock PASS.

D. Các commit dca65acf, 3534e70e, 80ab246d, c78d8d95, 73bc8450:
- Owner gửi ảnh chứng minh header tên “SinDarealestThời Trang Da Cá Sấu” dính lại khi nhanh tay chụp F5, vùng dưới Hero bị trống/mờ.
- Phân tích source: public/index.html có 28 khối style inline; ban đầu 16 trong head + 12 ở body (~128KB CSS). Nhiều rule cho brand/nav đến muộn gây FOUC/reflow.
- Chuyển toàn bộ 12 khối body style vào head, GIỮ NGUYÊN nội dung và thứ tự cascade của cả 28 khối; xác minh lúc commit di dời 28/28 block được bảo toàn. Hiện 28/28 trong head, 0 trong body. KHÔNG xóa bừa CSS.
- Khởi chạy bindReveal(document) TRƯỚC await API /api/products để phần nội dung tĩnh không phải chờ D1/network mới được nhìn thấy.
- Sửa các test cũ phụ thuộc “CSS phải nằm dưới body”; bổ sung kiểm tra header có display:flex, flex-direction:column, tên không nối tagline ở parse-time.
- Đã gặp CI fail trong lúc đổi giả định/test regexp; ĐÃ CHỈNH TEST, đợt kiểm thử cuối thành công. Đừng gọi các run lỗi cũ là PASS.

E. Commit e4cf36fd:
- Trigger deploy Preview riêng cho candidate 73bc8450; không chạm website chính.
- Preview PASS cùng source/tests PASS trên HEAD e4cf36fd.

Tài liệu chính: docs/handoff/SINDAREALEST_AUDIT_2026-11-01.md chứa lịch sử cũ; các mục trước 01/11 có thể mô tả HEAD và status lỗi thời. Tham khảo kỹ thuật, nhưng đừng sử dụng các con số lịch sử thay cho hiện tại.

## 4. KIỂM THỬ ĐÃ CÓ BẰNG CHỨNG — KHÔNG ĐỒNG NGHĨA OWNER PASS

- HEAD e4cf36fd — full source/npm automated tests: SUCCESS, https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291532642
- HEAD e4cf36fd — isolated Cloudflare Preview deploy, SSR/metadata/real 404 GET-only: SUCCESS, https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291532629
- Mobile mocked Playwright checkout + first-paint header CSS test tại code SHA dca65acf: SUCCESS, https://github.com/chichute5500/Sindarealest-admin/actions/runs/41291134877
- Mobile mocked checkout + reload drawer regression tại afc8ebe9: SUCCESS, https://github.com/chichute5500/Sindarealest-admin/actions/runs/41289657918
- Đã từng lấy 7 ảnh QA 390x844 của giỏ hàng và checkout từ browser mock, KHÔNG phải phép đo trực tiếp trên Xiaomi.
- CI PASS xác nhận quy trình test tương ứng, KHÔNG chứng nhận hình Welcome đẹp, không chứng nhận không còn F5 flash trên mọi Android, không chứng nhận 60/120 FPS.

## 5. TỒN ĐỌNG BẮT BUỘC — PHẢI TIẾP TỤC LÀM

P0 — An toàn tích hợp:
1. PR #159 đang diverged/dirty so với Main (ahead 201, behind 156; 87 files). #154 Admin đã merge. So sánh có mục đích, lập bản đồ overlap. Không rebase/merge/blind overwrite ngay; trước tiên bảo vệ Admin, các migration đã có Main, #155 của AI khác. Git branch có migration 0015–0017 trùng y hệt Main theo blob SHA tại checkpoint; functions/api/admin/products.js và admin/orders.js đã kiểm tra giống Main, nhưng public/admin/index.html khác Main. Phải xem full conflict hunk trước khi đụng. Khi cần release, giải quyết tích hợp #159 có kiểm soát và lấy Owner PASS trước khi merge.
2. Sau ảnh F5, cần lấy ảnh/quan sát trực tiếp Owner trên Android thật để xác nhận header/drawer/Welcome đã hết flash. Preview PASS không đủ để gọi Owner PASS.

P0 — Hiệu năng:
3. ĐO MỚI Lighthouse và trình duyệt 360/390px trên đúng SHA e4cf36fd hoặc HEAD mới, cùng cấu hình và điều kiện, Home + /sanpham, Light + Dark; LCP, CLS, TBT, timing/font/image, layout shift sources, animation/frame time. Tách ảnh lớn, SSR→CSR, font swap, Welcome CLS và theme-bg. Không suy diễn chỉ một phép đo.
4. Chỉ số cũ tại SHA 0c9faee, KHÔNG phải hiện tại: Home mobile Performance 57 / LCP 7.055s / CLS .02 / TBT 719ms; Catalog mobile Performance 62 / LCP 11.434s / CLS .188 / TBT 234ms. Cần đạt cải thiện có bằng chứng, không hứa khóa FPS 60–120 chỉ bằng CSS.
5. LCP mobile sản phẩm ảnh lớn ~569KB cho vị trí hiển thị nhỏ, cạnh tranh font; thử thumbnail/responsive srcset từ bản sao, không đụng ảnh R2 gốc, không bật Cloudflare Image Resizing trả phí. Thử A/B và chỉ giữ thay đổi tốt hơn.
6. Kiểm thử nguyên nhân khoảng trống sau Hero với mạng chậm/JS lỗi, bảo đảm graceful fallback, không che cả nội dung khi API thất bại.

P0 — Giao diện/UX:
7. Ảnh Welcome mobile Light/Dark chưa được Owner PASS; tự chụp, so ảnh Owner nếu có, tinh chỉnh nhưng không thêm lớp override CSS. Kiểm tra khi reload/full reload/vào lại Home, ngăn splash gây chờ; mục này Owner CHO PHÉP thay đổi.
8. Kiểm thử 360/390px header/mobile bottom nav, /sanpham, danh mục chip, product cards, cart/checkout/account/lightbox, tracking/warranty, modal history/back, Android keyboard; dark/light; không thay đổi phần Owner đã PASS.
9. CSS trùng: audit script ghi nhận 102 nhóm cùng selector/ngữ cảnh, 70 nhóm có giá trị khác; chỉ là dấu hiệu cần xem, KHÔNG 70 lỗi khẳng định. Sắp xếp theo selector ảnh hưởng header, nav, Welcome, drawers, product cards. Dọn CÓ KIỂM SOÁT tại stylesheet nguồn, bảo toàn cascade/specificity/breakpoints, test ảnh trước-sau; không quét xoá hàng loạt và không xếp thêm CSS vá. Dọn toàn bộ CSS trùng CHƯA HOÀN THÀNH.
10. Scroll-reveal một lần đã code/test, cần QA ảnh/motion khi cuộn lên xuống; modal/drawer phải mượt, giảm GPU cost có đo lường.

P0/P1 — Nghiệp vụ và bảo mật:
11. Checkout ba bước/deposit/QR, hàng chưa giá, API địa chỉ retry, đơn/tracking/warranty, Google OAuth, quyền sở hữu SĐT: mocked/local tests có một phần PASS, nhưng E2E đầy đủ với môi trường test thật chưa PASS; không dùng dữ liệu hoặc thanh toán Production. Turnstile chỉ chống bot, KHÔNG xác minh khách sở hữu SĐT.
12. Không lộ debug Mailjet/D1/Preview, giá ẩn, secrets; xác minh SEO/SSR/canonical, preview noindex có chủ đích.
13. PR #155 có thể đang chạm D1/Performance. Không đụng việc bên đó hoặc thực thi migration trùng; thông báo ranh giới nếu có giao nhau.

## 6. BẮT BUỘC ĐA LUỒNG THỰC CHẤT — KHÔNG CHỜ NHÀN RỖI

Mục tiêu: xử lý đồng thời các NHÓM KHÔNG TRANH CHẤP FILE. Tạo 4–5 workstreams đọc/đo song song; KHÔNG để hai luồng ghi public/index.html cùng lúc. Nếu không có nhiều agent thực, dùng các lệnh/Promise.all cho các tác vụ đọc độc lập, các job test tách biệt và một đầu mối commit tuần tự. Không nói đang chạy đa agent nếu không có.

LUỒNG A — CSS/FOUC & UI:
- Read-only phân tích 102/70 nhóm selector ghi đè, computed styles header/Welcome/Drawer ở các thời điểm parse, F5 và bfcache; chụp Light/Dark 360/390px.
- Sau khi có nguyên nhân/ảnh so, duy nhất đầu mối ghi public/index.html gộp sửa, không stack patch và không thay Owner PASS.

LUỒNG B — LCP/CLS/TBT/SSR:
- Đọc Lighthouse hiện có, trace CPU/network/font/image, kiểm tra SSR→hydration và first image, A/B thử nghiệm cục bộ; script/asset riêng không chạm source chung.
- Chỉ giữ tối ưu có số đo và regression PASS.

LUỒNG C — QA chức năng mobile:
- Playwright local mocked với GET/POST mock, reload liên tục, zero drawer/header flash, 4 bottom tabs, category switch, Welcome, Light/Dark, cart/checkout 3 bước, modal/back/address retry; lưu screenshot có SHA và viewport.
- Không viết đơn/D1 Production. Tổ chức test script riêng, không tranh CSS.

LUỒNG D — Security/SEO/guard:
- Kiểm tra Turnstile/no-secret/price privacy, SSR/404/canonical/meta, request budget, source tests, workflow Preview request policy; không sửa Admin, D1 #155 hoặc secrets.
- Tăng test coverage khi tìm thấy lỗi, mock các API.

LUỒNG E — INTEGRATION & CONFLICT (read-only trước):
- Song song so sánh Main vs audit; phân biệt trùng blob hoàn toàn (migrations đã Main), file thay đổi do Admin merge #154, và Storefront #159. Chuẩn bị giải pháp conflict có kiểm tra, CHƯA merge Main nếu Owner chưa duyệt.
- Một điều phối viên tích hợp các thay đổi A–D có thứ tự, fetch HEAD mới và compare SHA trước mỗi ghi; commit theo batch hợp lý. Nếu thay đổi file chung thì áp dụng tuần tự sau khi các luồng đã báo kết quả.

Quy trình không được lãng phí:
1) Đọc cùng lúc HEAD/CI, AGENTS, handoff và source cần thiết; phân nhóm ngay. 2) Trong khi một tác vụ chạy test/CI, làm việc đọc/đo độc lập ở luồng khác, không poll vô tận. 3) Trước push xác thực HEAD, chạy targeted local tests; không push 10 commit vụn khi có thể 1 batch. 4) Khi candidate ổn, chạy npm run check, npm test, mocked Playwright, GET-only QA; duy nhất một vòng Preview verify SHA và Lighthouse đủ dữ liệu. 5) Report những gì chưa PASS, nêu blockers và chỉ xin Owner PASS trước merge.

KHÔNG tạo branch/PR mới. KHÔNG hứa làm việc nền rồi báo sau. Chat sau phải trực tiếp thực hiện trong lượt làm việc; nếu thiếu browser cục bộ thì sử dụng GitHub Actions có sẵn và nói rõ giới hạn.

## 7. BÀN GIAO PHẢI CÓ — MẪU GỌN

- Nhánh + PR + exact HEAD + URL preview + deploy SHA; production unchanged.
- Theo LUỒNG A/B/C/D/E: đã sửa gì, file, commit, test PASS/FAIL, link GH Actions/screenshot, số liệu performance cùng điều kiện.
- Tồn đọng, root cause chưa chứng minh, xung đột Main chưa xử lý và rủi ro khi merge.
- Không đưa % hoàn thành không có tiêu chí và phép đo. Không nhận “Owner PASS” nếu Owner chưa xác nhận.
- Tiếp tục đúng PR #159, không tự merge lên website chính.

## 8. TÀI LIỆU

- Master này: docs/handoff/SINDAREALEST_MASTER_HANDOFF_2026-11-01.md
- Lịch sử audit (giữ nguyên, thêm checkpoint mới ở cuối): docs/handoff/SINDAREALEST_AUDIT_2026-11-01.md
- Prompt copy cho chat mới: docs/handoff/SINDAREALEST_PROMPT_CHAT_MOI_2026-11-01.txt
- AGENTS.md và docs/QA_RESOURCE_POLICY.md: đọc bắt buộc.
- PR: https://github.com/chichute5500/Sindarealest-admin/pull/159
- Preview: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/


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

## 01-11-2026 — Latest validated mobile Storefront, PR159 (do not repeat PASS work)
- Branch fix/audit-2026-10, PR #159 DRAFT. Latest verified deployed code SHA \`530017ddcef9b473adb7db200b0685c9abcdbc08\`; standalone source CI run 41300184374 PASS, isolated Preview deploy 41300184417 PASS, exact-SHA browser/Lighthouse run 41300184426 PASS, checkout mock run 41300008986 PASS. No Production D1/R2 or Main writes.
- Root-cause fix: reserve mobile #categoryFilters rail via existing rule \`min-height:50px\` before JS hydration. Catalog mobile standalone Lighthouse CLS **0.00**, browser A/B CLS **0.0173** from previous **0.0355**; LCP **6042.85ms** (previous **5575.39ms**, run-to-run variance); Perf 77; TBT 38ms. Home mobile Perf 93 / LCP 1439ms / CLS .02 / TBT 314.5ms. Page remains slow on mobile catalog, do not claim performance PASS.
- Screenshots: all 10 fully rendered Catalog screenshots at 360/390/768/1280/1920 in Light/Dark are EXACT RGB pixel matches between previous candidate \`d491e3ef\` and \`530017dd\`; checked via Pillow ImageChops. Home dynamic screenshots differ; do not claim pixel parity there. This is NOT Owner's separate target reference acceptance.
- Image bandwidth bottleneck: original R2 product photos ~300–569KB; Lighthouse Image Delivery insight estimates ~1.55MiB avoidable bytes. Candidate already delays six SSR below-fold images; first-row LCP photo ~68KB. Further target <=2.5s requires validated responsive-image delivery or optimized card media; **never** mutate Production R2, create Preview R2 derived assets or enable paid Cloudflare processing without explicit Owner authorization.
- Branch-only, safe file-level integration commit \`0d470a492b8632a206e5a59db82854d2b5322c32\` synced EXACT Main Git blobs for \`AGENTS.md\`, \`docs/QA_RESOURCE_POLICY.md\`, \`.github/workflows/qa-resource-policy.yml\`, \`.github/workflows/deploy.yml\`. Main stayed \`9fce1a85c9c19620a8269cce80575cdc92d9919c\`. This is NOT a merge/rebase or production deployment. Do not copy older PR159 \`public/admin/index.html\` over newer Owner-PASS Admin on Main.
- Remaining technical integration blockers: differing \`public/admin/index.html\` (keep Main), \`package.json\` (union test commands), \`tests/admin-mobile-refresh-contract.test.mjs\` (keep Main updated tests), \`scripts/qa-resource-guard.mjs\` (preserve scoped candidate marker), overlapping PR154/159 handoff doc (archive latter). Do not perform Main merge without separate Owner PASS.
- Owner-required final gate: Android Xiaomi 15 Ultra F5 / initial Welcome / theme / drawer / account / checkout, genuine Google OAuth test account and non-Production payment sandbox if configured, explicit final visual approval and later separate Main-release permission. Simulated checkout and browser tests cannot substitute physical owner or payment provider.
- QA evidence: https://github.com/chichute5500/Sindarealest-admin/actions/runs/41300184426 ; Preview: https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev/ ; no Owner PASS yet.
