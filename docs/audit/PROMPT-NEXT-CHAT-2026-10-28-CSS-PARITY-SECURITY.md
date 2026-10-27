# PROMPT NEXT CHAT — SINDAREALEST: KIỂM TOÁN CSS, ADMIN/STOREFRONT VÀ BẢO MẬT

Tiếp tục **trực tiếp** dự án SinDarealest đang làm dở trên GitHub, **không phải dự án mới**. Không hỏi lại lịch sử, không làm lại các phần đã Owner PASS, không hạ tiêu chuẩn QA.

**Repository:** `chichute5500/Sindarealest-admin`  
**Nhánh DUY NHẤT được tiếp tục sửa:** `audit/css-parity-security-2026-10-28`  
**PR kiểm toán:** [#136 — OPEN / DRAFT / CHƯA MERGE](https://github.com/chichute5500/Sindarealest-admin/pull/136)  
**Production main baseline:** `7c6607e5115cdec9aceee28b00bff4d7d0c4fc30`  
**Code audit đã QA:** `f5728d040b14433d36f2da2868236da2b3b3231c`  
**Preview tách D1/R2:** https://owner-css-parity-1028.sindarealest-admin-preview.pages.dev/

## 1. BẮT BUỘC đọc file đầu tiên

1. `docs/audit/HANDOFF-LATEST-2026-10-28-CSS-PARITY-SECURITY.md`
2. `docs/audit/OWNER-CSS-PARITY-SECURITY-2026-10-28.md`
3. `docs/audit/PROMPT-NEXT-CHAT-2026-10-28-CSS-PARITY-SECURITY.md`
4. `scripts/audit-css-cascade.mjs`, `public/index.html`, `public/admin/index.html`, `public/code-hero.css`, `public/material-gallery.css`, `functions/_lib.js`, `functions/_middleware.js` và các test mới.

Kiểm tra SHA và trạng thái **main, PR #136, Actions mới nhất** trước khi thực hiện. File bàn giao được commit sau code QA; xác minh HEAD hiện hành thay vì tự giả định các SHA giống nhau.

## 2. OWNER ĐÃ PASS — KHÔNG SỬA LẠI

- PR #134 đã merge: toàn bộ Admin quick-edit/ảnh, vuốt ngang quán tính, nhấn giữ phóng to và kéo ảnh bốn hướng, kéo thùng rác, Save/Cancel.
- Chuyển `217/217` sản phẩm đang có sang `made_to_order` đã thực hiện một lần trên D1 Production: **không rerun**.
- PR #135 đã **PASS, MERGE, deploy Production thành công**: Welcome chỉ hiện một lần khi vào/tải lại; không lặp trên điều hướng nội bộ; theme hệ điều hành ưu tiên lúc mở, manual light/dark không bị Android forced-dark.
- Tất cả Blue Liquid Glass xanh nhạt, HERO không ảnh bitmap, welcome animation, banner và logo, cart, checkout, QR, COD, bảo hành, đơn hàng, SKU, trang sản phẩm và Admin PC/mobile đã PASS.

## 3. ĐÃ SỬA TRÊN PR #136 (CHƯA MERGE)

- Bỏ 5 palette Admin light/dark cũ bị ghi đè; giữ duy nhất token **xanh băng/navy** đúng giao diện đã PASS.
- Bỏ 7 khai báo filter nền tối thực sự không còn tác dụng vì bị quy tắc cuối cùng ghi đè; các hiệu ứng còn lại giữ nguyên.
- Đồng nhất Admin theme với Storefront: OS-first mỗi lần tải và manual override theo tab, `color-scheme: only light/dark`.
- Harden `public/_headers`, Functions-generated HTML và JSON API bằng các header CSP chống framing/object/base injection cùng XFO, nosniff, Referrer-Policy. Giữ session cookie, no-store, login/rate-limit/same-site, không phá inline scripts đã Owner PASS.
- Bổ sung kiểm thử và CI, có ảnh Chrome so sánh màn PC/mobile Light/Dark.

**Bằng chứng:** [Preview QA #40560364276 SUCCESS 4/4](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40560364276), [CI #40560364341 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40560364341), [PR CI #40560417021 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40560417021). Mã nguồn trên `f5728d0...` có bằng chứng kiểm thử; các commit sau đó chủ yếu cập nhật docs bàn giao, cần xác minh lại.

## 4. YÊU CẦU TIẾP TỤC

- Rà soát code CSS để **phát hiện lỗi ghi đè THỰC SỰ**, không tự đồng nhất selector trùng = lỗi. So sánh computed CSS và ảnh PC/mobile, dark/light; các breakpoint và lớp Liquid Glass đã PASS phải được bảo toàn.
- Đối chiếu Admin ↔ Storefront về nhãn trạng thái sản phẩm, API, giá/giá trị cọc, loại hàng, ảnh, danh mục, đơn hàng, bảo hành, thanh toán. Không can thiệp dữ liệu Production.
- Rà soát bảo mật có bằng chứng: auth session, cookie, CSRF/Origin, JSON body limits, SQL params/race, upload MIME & kích thước, đường dẫn private files/QR, headers/cache/CSP, rate limiting, rò rỉ PII, permission cho các Functions. **Không khẳng định penetration test thành công** nếu chưa thực hiện.
- Ưu tiên sửa lỗi gốc nhỏ, test sát tình huống; hạn chế CSS override mới và tuyệt đối **không mass-rewrite** CSS vì nguy cơ làm lệch thiết kế.
- Chạy `npm run check`, `npm test`, E2E browser matrix (mobile 390 px, PC 1366 px, Light/Dark) và test bổ sung phù hợp. Mỗi thay đổi phải có kiểm thử cụ thể; không tắt/bỏ test chỉ để PASS.
- Kiểm tra PR #136 và update tài liệu handoff sau khi làm. **KHÔNG MERGE MAIN / DEPLOY PRODUCTION nếu chưa có Owner PASS đối với PR #136**. Hiện nay PR #136 là Draft, đang chờ nghiệm thu. Chỉ sau PASS mới được merge có kiểm soát.
- Giữ D1/R2 Production và mọi đơn hàng, thanh toán, bảo hành, sản phẩm **nguyên trạng**. Audit không được phát sinh mutation.

## 5. KẾT QUẢ CẦN BÁO CÁO NGẮN GỌN

Trình bày: (a) SHA/PR/CI hiện hành, (b) lỗi thực sự có nguồn và mức độ, (c) file/function đã chỉnh, (d) test/ảnh đối chiếu và link Preview, (e) phần còn tồn tại và rủi ro, (f) sẵn sàng Owner nghiệm thu hay chưa. Không tuyên bố toàn bộ CSS/bảo mật đạt 100% khi thiếu kiểm thử hay bằng chứng.

**Điểm dừng hiện tại:** Source/Browser QA phiên audit code `f5728d0` đã PASS, PR #136 chờ Owner duyệt. Tiếp tục đúng nhánh và đúng phần còn mở; không hỏi lặp lại các quyết định đã ghi trong file bàn giao.

## Phụ lục audit tiếp nối — 2026-10-28 (bổ sung trong chat này)
- Đã tiếp tục trực tiếp trên `audit/css-parity-security-2026-10-28`, không merge. Code audit `05c35a655f4e07771d94fc8cd9bd248087b9bc33`, source CI [#40567425583 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40567425583). Browser isolated [#40567425595](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40567425595): **SUCCESS 4/4 Chromium**, artifact 12 screenshot trong GitHub Actions, job xác nhận isolation bindings và deploy Preview tách biệt (code SHA `05c35a6`). Mọi HEAD chỉ cập nhật docs sau đó cần xác minh source CI riêng.
- Lỗi mới đã sửa: deep route sản phẩm GET/HEAD-only với 405 cho POST/PUT/PATCH/DELETE; 4 regression tests. Loại bỏ 5 `filter` cũ trên nền sáng đã bị `filter:none!important` che khuất; giữ nguyên giao diện. Browser matrix thêm computed light/dark background và mở/đóng cart không tràn.
- Owner audit browser workflow nay kích hoạt cả khi CSS/Functions/tests có liên quan thay đổi, không chỉ khi YAML đổi. Không cần sửa lại những thay đổi này nếu CI xanh.
- Khi bàn giao tiếp: xác minh HEAD cuối cùng, PR #136 OPEN DRAFT, trạng thái Actions ở **code SHA** và docs-only HEAD; cập nhật các file handoff nếu browser QA đã xong; tuyệt đối không lấy test đỏ của SHA trung gian làm kết luận cho commit đã sửa, nhưng phải nói rõ sự cố lịch sử. Không đụng Production D1/R2/main hay các phần đã PASS. Nếu cần audit sâu: dùng dữ liệu preview dùng thử cho category/detail/checkout/warranty/Admin logged-in, so ảnh từng breakpoint, không mass rewrite CSS.

## Nghiệm thu hình ảnh cuối — 2026-10-28 (strict drawer visibility)
- Dừng tại tested QA source SHA `fd925d81ae4be560f101f6fda2da02716efded0d`; [CI nguồn #40568866665 SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40568866665), [isolated Chrome QA #40568866642 SUCCESS 4/4](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40568866642), artifact có **12 screenshots**.
- Đã trực tiếp mở ảnh giỏ mobile dark/light cuối: drawer hiện đầy đủ, đồng tông xanh sáng/tối; không có bug giao diện do cleanup CSS. Các ảnh baseline còn lại gần như bất biến pixel. Chú ý hai lượt đỏ của **test mới do lỗi regex/đo geometry** ở các commit trung gian đã sửa, không tái mở việc Owner PASS.
- Repo HEAD sau commit tài liệu có thể khác tested QA SHA; phải xác minh Actions theo SHA và trạng thái PR mới nhất, không báo sai.
- Chỉ tiếp tục audit những việc chưa PASS với bằng chứng cụ thể; không merge PR #136 và không ghi Production D1/R2. Nếu cần, kiểm thêm category/detail/warranty/checkout với dữ liệu Preview giả lập và màn Admin đăng nhập.
