# PROMPT TIẾP QUẢN — SinDarealest2 Storefront — 2026-10-24

> Đây là prompt bàn giao mới nhất cho phiên tiếp theo. Đọc cùng `CURRENT-STATE.md`, `TASKS.md`, `DECISIONS.md` và `TEST-RESULTS.md`; nếu dữ liệu cũ mâu thuẫn với trạng thái GitHub mới nhất hoặc quyết định mới nhất của chủ dự án, hãy xác minh GitHub và tôn trọng quyết định mới nhất. Không khởi động lại dự án.

## 1. Repo và trạng thái GitHub đã kiểm tra

- Repository: `chichute5500/Sindarealest-admin`
- Branch đang làm: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, chưa merge; base `main`.
- Source/test SHA của bản đang được chủ dự án kiểm tra: `700a651a1f92f35a7cc43bcc4b0ae96f2da26539`.
- CI #40012914027 và Preview deploy #40012914126 đã PASS trên đúng source SHA `700a651a1f92f35a7cc43bcc4b0ae96f2da26539`.
- Sau đó có các commit **chỉ cập nhật tài liệu bàn giao**; HEAD branch hiện tại là `aa9abe9d4d543a8d2d741b99c00b45c482cdead6`. Các commit tài liệu không thay đổi storefront và không phải deployment mới.
- Cloudflare Pages project: `sindarealest2`; Production branch phải tiếp tục là `main`.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Không merge PR, không thay đổi `main`, không deploy Production nếu không có chỉ thị rõ ràng của chủ dự án.

### Workflow đã xác minh trên đúng HEAD `700a651a…`

- Validate source and tests: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40012914027
- Deploy storefront fix branch to Cloudflare Pages Preview: PASS — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40012914126
- Liquid Glass isolated visual preview: SKIPPED — https://github.com/chichute5500/Sindarealest-admin/actions/runs/40012914085. Không gọi đây là visual audit PASS; workflow này bị skip theo guard hiện có.
- Các kết quả CI/deploy là bằng chứng tự động; không thay thế xác nhận hình ảnh thực tế từ chủ dự án.

## 2. DANH SÁCH RÕ RÀNG CÁC VIỆC CÒN LẠI (BẮT BUỘC ĐỌC TRƯỚC KHI LÀM)

**Chỉ còn 1 việc đang mở:** xử lý nháy ảnh sản phẩm khi xem toàn màn hình trên mobile. Chủ dự án vừa kiểm tra và xác nhận đã giảm rõ rệt nhưng thỉnh thoảng vẫn nháy 1–2 lần. Không tuyên bố hoàn tất cho đến khi chủ dự án kiểm tra Preview mới và xác nhận.

**Tất cả hạng mục khác hiện PASS / LOCKED theo quyết định mới nhất; không mở lại và không yêu cầu chủ dự án kiểm tra lại:**
- Giỏ hàng và tài khoản từ mobile navigation: giữ nguyên hoạt động mở/đóng, không làm tái phát lỗi.
- Icon system/Liquid Glass appearance, press feedback, kích thước control và hiệu ứng đã chấp nhận.
- Catalog Liquid Glass filter controls/chips/icons/height/effects; tuyệt đối không khôi phục panel lọc trạng thái sản phẩm riêng đã bị loại bỏ.
- `#order` / “Đặt hàng an tâm”.
- Warranty claim form/lookup; không yêu cầu mã bảo hành hoặc số điện thoại giả và không mở lại.
- Hero: PAUSED BY OWNER; không kiểm tra, sửa, chụp hoặc đưa vào workflow.
- Các fix đã làm và không phải việc còn mở: mobile navigation focus/history; welcome dialog keyboard/focus; gallery focus handling; warranty form focus transfer; favorites legacy-key migration; collection slideshow pause/reduced-motion/missing-control guard; stale cart cleanup và badge sync; Zalo cart consultation copy/fallback; fullscreen product share fallback.
- Các mục audit/visual parity cũ trong tài liệu lịch sử đã bị quyết định PASS mới nhất thay thế; chỉ mở lại khi chủ dự án báo lỗi cụ thể hoặc mở khóa rõ ràng.

**Quy trình duy nhất cho việc còn lại:** đọc source/test hiện hành → tái hiện/nghiên cứu nguyên nhân race/load/decode/layer flash → thêm regression test thực chất → sửa tối thiểu → focused test + full CI → Preview deploy exact SHA → xác minh SHA/URL → gửi URL cho chủ dự án chỉ để kiểm tra fullscreen gallery. Trong lúc CI/deploy chạy, tiếp tục review độc lập an toàn; báo cáo xong không dừng chờ nhắc.

## 2. Quyết định nghiệm thu mới nhất của chủ dự án — 2026-10-24

Chủ dự án xác nhận: **PASS tất cả các phần, NGOẠI TRỪ phần xem ảnh toàn màn hình**.

- Tất cả hạng mục còn lại được chủ dự án chấp nhận/đóng băng ở trạng thái hiện tại. Không tự ý mở lại, chỉnh sửa hoặc retest các hạng mục đã PASS.
- Riêng **xem ảnh sản phẩm toàn màn hình trên mobile** chưa PASS: chủ dự án báo độ nháy đã giảm rõ rệt nhưng thỉnh thoảng vẫn nháy khoảng 1–2 lần.
- Chỉ tiếp tục điều tra/sửa lỗi nháy còn sót của gallery/fullscreen image transition. Không đổi thiết kế Liquid Glass đã được chấp nhận, không thay đổi layout, icon, kích thước control hoặc các phần khác để “tiện tay”.
- Chưa tuyên bố hết nháy hoàn toàn. Chủ dự án mới xác nhận đã giảm đáng kể; vẫn cần xử lý và yêu cầu chủ dự án kiểm tra lại bản Preview mới.
- Giỏ hàng và tài khoản đã được sửa lỗi mở từ mobile navigation trước đó; không làm hỏng lại. Giữ nguyên hành vi các nút giỏ hàng/tài khoản.

## 3. Các sửa đổi gần nhất liên quan fullscreen ảnh

Các commit mới nhất trên nhánh:
- `2b6efeeaa594b60a4f0cd29426eca55bced871e6` — `fix: atomically swap decoded fullscreen photos on mobile`
- `700a651a1f92f35a7cc43bcc4b0ae96f2da26539` — `test: guard flicker-free mobile fullscreen image swap`
- Trước đó, `b665d03b36595b58b860399a72ccf35269514e14` đã sửa mobile nav selector và bỏ blur/blending trong transition.
- Tests liên quan: `tests/gallery-transition-mobile-cart-badge.test.mjs`, `tests/mobile-navigation-contract.test.mjs` và các test gallery liên quan khác. Trước khi sửa, đọc source/test hiện hành từ HEAD mới nhất; đừng giả định tên hàm hoặc code cũ vẫn còn nguyên.

## 4. Nhiệm vụ kế tiếp — chỉ tập trung vào fullscreen image flicker

1. Bắt đầu bằng cách re-fetch branch HEAD, PR #108, workflow runs và Preview deployment hiện tại; tài liệu này có thể đã cũ nếu nhánh thay đổi sau lúc bàn giao.
2. Đọc `public/index.html` và toàn bộ test gallery liên quan trên HEAD hiện tại. Tìm nguyên nhân cụ thể của 1–2 lần nháy còn lại, nhất là các đường đi next/previous, mở fullscreen, ảnh chưa decode xong, cache/network chậm, resize/orientation và race giữa nhiều lần bấm.
3. Tập trung vào tính nguyên tử của swap: giữ ảnh đang hiển thị ổn định cho tới khi ảnh đích đã tải/được decode; tránh hai layer chồng nhau, flash nền, ảnh cũ hiện lại, blur hoặc opacity animation làm ảnh trông nháy. Không áp dụng giải pháp lớn khi chưa xác định được đường gây lỗi.
4. Bổ sung regression test tái hiện race/timing phù hợp. Không nới lỏng assertion chỉ để test xanh. Kiểm tra cả reduced-motion nếu có liên quan.
5. Sửa tối thiểu đúng phạm vi fullscreen gallery; không chỉnh các phần đã PASS/LOCKED. Chạy test liên quan trước, sau đó chạy đầy đủ validation/CI.
6. Trong khi CI/deploy chạy, làm việc độc lập an toàn có ích (review test/race path hoặc kiểm tra workflow logs), không ngồi chờ. Sau đó quay lại kiểm tra kết quả cuối và xác minh deploy đúng exact SHA.
7. Chỉ dùng Preview alias/immutable Preview; không đổi target sang Production. Phân biệt rõ CI PASS, Preview deploy PASS và visual acceptance của chủ dự án.
8. Báo chủ dự án link Preview mới để kiểm tra lại thao tác mở ảnh toàn màn hình và chuyển qua lại nhiều ảnh trên điện thoại. Chỉ đánh dấu hạng mục PASS khi chủ dự án xác nhận hoặc có quy trình nghiệm thu được ủy quyền; automated test không thể thay thế cảm nhận nháy thực tế.
9. Sau mỗi thay đổi đáng kể, cập nhật hồ sơ bàn giao hiện hành và prompt mới; đồng bộ SHA, run IDs, Preview URL và trạng thái thật. Không khẳng định browser/Playwright chạy nếu không có bằng chứng workflow thực tế.
10. Báo cáo xong phải tiếp tục bước an toàn kế tiếp, không dừng chờ nhắc, trừ khi cần chủ dự án thực hiện kiểm tra thiết bị hoặc đưa ra quyết định không thể suy ra.

## 5. Những vùng không được mở lại

- Hero: PAUSED BY OWNER — không kiểm tra, sửa, chụp hoặc thiết kế lại.
- `#order` / “Đặt hàng an tâm”: OWNER PASS / LOCKED.
- Catalog Liquid Glass filter controls/chips/icons/height/effects: OWNER PASS / LOCKED; không khôi phục panel lọc trạng thái sản phẩm riêng đã bị loại bỏ.
- Icon appearance/system: OWNER PASS / LOCKED.
- Warranty claim form: OWNER PASS / LOCKED theo quyết định chủ dự án; không bắt buộc mã bảo hành/số điện thoại giả để thử.
- Các hạng mục khác: coi là PASS theo chỉ thị mới nhất; chỉ mở lại khi chủ dự án báo lỗi cụ thể hoặc yêu cầu rõ ràng.
- Không đụng Admin/backend/API/auth, dữ liệu sản phẩm, D1/R2, secrets, bindings, DNS, Cloudflare Access/infrastructure, luồng thanh toán thật hoặc Production.

## 6. Cách làm việc bắt buộc

- Làm trực tiếp qua GitHub/repository/Actions khi công cụ cho phép; không chỉ đưa hướng dẫn để người dùng tự code.
- Không bịa kết quả, URL deployment, SHA hoặc test. Nếu không thể xác minh, ghi rõ chưa xác minh.
- Không in hoặc yêu cầu secrets.
- Giữ PR #108 OPEN/unmerged.
- Người dùng đã xác nhận các phần ngoài fullscreen image là PASS; không yêu cầu họ test lại các phần đó. Chỉ cần họ kiểm tra lại fullscreen gallery sau bản sửa kế tiếp.
