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
