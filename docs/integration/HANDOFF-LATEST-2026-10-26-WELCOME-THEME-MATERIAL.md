> **CHECKPOINT MỚI NHẤT (được cập nhật sau 7ef00dce, 26/10/2026):** Vui lòng mở [`docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md`](https://github.com/chichute5500/Sindarealest-admin/blob/integration/storefront-locked-on-main-2026-10-26/docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md) và [PROMPT MỚI](https://github.com/chichute5500/Sindarealest-admin/blob/integration/storefront-locked-on-main-2026-10-26/docs/integration/PROMPT-NEXT-CHAT-2026-10-26-THEME-TWO-PHASE.md) trước. Các kết luận PASS/FAIL, SHA `a4627e5` hoặc `63806aa` bên dưới chỉ là lịch sử; hiện HEAD code `7ef00dce` có Chromium theme FAIL. PR #118 vẫn DRAFT. Không dùng nội dung dưới để tuyên bố release-ready.

> **BỔ SUNG QUAN TRỌNG SAU LẦN KIỂM TRA QA 26/10/2026:** HEAD trước commit tài liệu này là `63806aae144c9460287f1c637648adf684ce61ab` (thay đổi **DUY NHẤT script kiểm thử**, mã giao diện vẫn giống source QA PASS `a4627e5`). [Isolated Preview run #40296591223](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296591223) hiện **FAIL chỉ ở Chromium theme regression**: nav tuy có transition CSS `0.22s` nhưng đôi khi **BẮT ĐẦU muộn** ở trình duyệt tải nặng; assertion `Navigation still changing after 300ms`. Job deploy D1/R2 và E2E Preview order/Admin **PASS**, [CI #40296591264](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296591264) và [CI PR #40296598817](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296598817) **PASS**. Run tài liệu [#40296121132](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296121132) FAIL do test Welcome cold-font giả định chữ phải còn nhìn thấy dù Welcome đã tự đóng hợp lệ; test này được sửa ở commit `63806aa`, đã qua bước font ở run sau. **CHƯA nghiệm thu hoàn toàn cảm nhận theme trên máy Owner; chat kế tiếp cần đo frame timing để tách trễ của event/render/painting khỏi duration CSS, KHÔNG chỉ tăng timer/nới ngưỡng test.** Các kết quả PASS `a4627e5` bên dưới là baseline thực, không thay thế trạng thái QA mới tại HEAD.

# SINDAREALEST — CHECKPOINT MỚI NHẤT: WELCOME FIRST PAINT + THEME PERFORMANCE + DA CÁ SẤU
**Ngày:** 26/10/2026 (Asia/Ho_Chi_Minh). **Nguồn sự thật cập nhật hơn** các checkpoint cũ cùng ngày. Đây là dự án đang chạy, KHÔNG tạo dự án mới.

## 1. Trạng thái nguồn đang được bảo vệ
- Repository: `chichute5500/Sindarealest-admin`.
- **Nhánh DUY NHẤT được tiếp tục sửa:** `integration/storefront-locked-on-main-2026-10-26`.
- **Mã ứng dụng đã QA đầy đủ lần cuối:** `a4627e55da5420522ba5461145ec522dc826c625` (viết gọn `a4627e5`).
- Base `main` tại lần xác minh: `db40af63965678598b0ebd3f3fe63865849dcf2e`. Compare `main...integration`: **ahead 47, behind 0** *trước commit tài liệu này*. Xác minh lại khi tiếp tục.
- **PR #118:** OPEN, DRAFT, mergeable true, NOT MERGED — https://github.com/chichute5500/Sindarealest-admin/pull/118.
- **Isolated Cloudflare Preview (không phải Production):** https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
- **Production `main` / D1 / R2:** không đổi do các commit sửa giao diện ở nhánh integration. **Không merge, không deploy, không ghi Production trước quyền Owner rõ ràng**.
- HEAD sẽ mới hơn source SHA trên do cập nhật tệp tài liệu, **không gọi HEAD mới là source đã test nếu diff có code**. Xem commit diff và Actions trước khi báo PASS.

## 2. Yêu cầu mới nhất từ Owner — ĐÃ SỬA và test kỹ thuật
### A. First paint Welcome (vấn đề KHÔNG phải lúc thoát)
Owner gửi ảnh khi vừa vào Welcome: dấu tiếng Việt/ chữ chưa chuẩn rồi sau đó mới ổn định. Bản sửa **KHÔNG chỉnh lại bố cục và thông điệp Owner PASS**.
- Nguyên nhân xác định trong mã: `font-display:swap` ở Noto Serif/Sans để browser phơi ra glyph fallback trước khi font tải xong, nhất là chữ có dấu.
- **Đã thêm preload** `/fonts/NotoSerif-Regular.ttf`, `/fonts/NotoSans-Regular.ttf`.
- Welcome chỉ hiện các hàng chữ sau khi `document.fonts.load` hoàn tất **và** `document.fonts.check` xác nhận Noto thực sự sẵn sàng; trước đó chữ tạm ẩn, nền/logo/nút "Vào cửa hàng" vẫn xuất hiện. **Không dùng timeout 1200ms để mở chữ mù**. Nếu font lỗi thật thì dùng system font rõ dấu.
- Giữ nguyên thiết kế Welcome đã duyệt, tự đóng `reduced?220:1450` ms, transition thoát 360ms; các thay đổi của lần fix trước bảo đảm trang phía sau sẵn sàng trước khi thoát và không có hai lớp tiêu đề trùng lấp.
- Chromium lần này **cố tình delay hai font request 600ms**, đo font ready/visibility: **PC 1440 PASS, Mobile 390 PASS**, `fallbackTextNeverPainted=true` và `correctVietnameseFontsReady=true`. Bằng chứng dưới đây.

### B. Theme Light/Dark trước đây trông như lag
Owner KHÔNG muốn kéo chậm hiệu ứng; muốn phản hồi nhanh, không khựng.
- Bỏ ép `void document.body.offsetHeight` trong `applyThemeMode` làm reflow toàn trang trước switch.
- Chỉ chuyển `opacity` nền cố định và `background-color/border-color/color` nav trong khoảng **220ms**; KHÔNG animate hàng trăm `box-shadow`, `backdrop-filter`, `filter` trên danh mục. Theme state tiếp tục đọc/ghi `sd-theme-mode`, hỗ trợ hệ thống/giảm chuyển động.
- Thời gian cũ **460ms/400ms** trong log/checkpoint lịch sử **KHÔNG CÒN LÀ phiên bản cuối**. Phần thumbnail slideshow vẫn crossfade **580ms** riêng, không bị rút xuống 220ms.
- Chromium trên PC/Mobile test Light → Dark → Light, nav/nền về trạng thái ổn định và không báo pageerror, PASS. **Chỉ kiểm chứng browser QA và CSS timing, chưa đo độ giật trên máy vật lý của Owner**; nếu Owner vẫn cảm thấy khựng thì thu thập trace lúc thao tác, sửa theo bằng chứng, không tùy tiện tăng thời lượng nữa.

### C. Ô “Chất liệu cao cấp”
- Thư mục ảnh: `public/images/crocodile-leather/`; 12 ảnh thật Owner đã upload, đã có trong `gallery.json`, không phải chờ tải ảnh.
- `public/material-gallery.js` đọc manifest, preload ảnh hợp lệ, đổi mỗi **1,5 giây**, **mờ chồng (crossfade) 580ms**, **không arrows/dots/nút** trên PC/Mobile.
- `public/material-gallery.css` loại bỏ lớp gradient trắng/đen đè lên ảnh thật, giữ text-shadow để đọc chữ. Gradient fallback vẫn giữ cho ảnh mặc định khi manifest trống/lỗi.
- `public/images/crocodile-leather/README.md` hướng dẫn **THÊM ảnh mới vào danh sách 12 ảnh hiện có**, không được thay cả manifest bằng `[]` hoặc tên ví dụ. Không ảnh hưởng Gallery sản phẩm vốn đã Owner PASS.

### D. Welcome glitch thoát trước đó
- Lần trước đã sửa lỗi click “Vào cửa hàng” khi catalog vẫn đang tải; giữ overlay đến khi layout/store ready, gỡ khóa trang trước fade; ẩn chữ Welcome trước khi nền phai để tránh ghosted over HERO.
- Đã kiểm tra riêng PC/Mobile trong Preview; **2/2 PASS**; không gọi sự cố startup font của Owner là lỗi exit nữa.

## 3. Bằng chứng QA PASS chính xác trên source `a4627e5`
| Luồng | Run / kết quả | Phạm vi |
|---|---|---|
| Isolated Preview integration toàn bộ | [#40290073747](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073747) — **SUCCESS 3/3 jobs** | exact SHA deploy, D1/R2 Preview khác Production; browser và remote D1 E2E |
| CI Validate source and tests (push) | [#40290073738](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073738) — **SUCCESS** | tests/contract/security |
| CI Validate source and tests (PR) | [#40290079433](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290079433) — **SUCCESS** | cùng source SHA |
| Admin Preview Playwright | [#40290079434](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290079434) — **SUCCESS** | Admin smoke |
| Admin *isolated* workflow chuyên nhánh khác | [#40290079435](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290079435) — **SKIPPED như thiết kế** | không bỏ guard/Admin production |
| Welcome cold-font PC/Mobile | Trong #40290073747 — **2/2 PASS** | 2 font GET bị delay 600ms; Welcome chữ chỉ hiện sau `document.fonts.check` |
| Welcome exit PC/Mobile | Trong #40290073747 — **2/2 PASS** | click sớm, chưa có catalog; không lộ half-layout / double headline |
| Light/Dark và material slideshow PC/Mobile | Trong #40290073747 — **2/2 PASS** | read-only Browser, mock ảnh 2 tệp để kiểm thử nhịp/transition |
| UI Chromium matrix cũ + Checkout | Trong #40290073747 — **8/8** giao diện, **4/4** checkout disposable | browser GET Preview; POST checkout handler dùng SQLite disposable, không ghi Production |
| Remote Preview D1 order/Admin E2E | Trong #40290073747 — **PASS**, fixture cleanup | đúng isolated D1 Preview; không chuyển tiền thật |

**Evidence màn hình/JSON chính xác SHA mới:** [Artifact #12636650251](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073747/artifacts/12636650251), Ảnh `desktop-1440-light-welcome.png`, `mobile-390-light-welcome.png` đã được quan sát, dấu tiếng Việt bình thường. Artifact GitHub thường có hạn sử dụng **09/11/2026**, có thể hết hạn về sau.

**Lịch sử tránh hiểu nhầm:** #40289155108, #40289721965, #40289892659 đã **FAIL** trong quá trình sửa vì first-paint font gate và assertions test cũ; **đều đã được xử lý và chạy lại PASS trên `a4627e5`**. Đừng lấy các lỗi trung gian làm trạng thái cuối, cũng **không xóa dấu vết** QA.

**Giới hạn giao dịch:** Remote Preview D1 từng **22/22 PASS** tại [#40279420747](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747): 1 order QA thật vào D1 Preview, Admin nhìn thấy/xác nhận/hủy, `cleanupVerified=true`, `productionWrites=0`, `realTransfers=0`. Payment QR/ledger/freeship/refund chỉ chứng minh trên **SQLite disposable**. **Chưa có bank transfer/QR scan/ledger/refund tiền thật; không được tạo thử trên Production**.

## 4. Các thiết kế Owner đã PASS — không làm lại
- HERO code-only `public/code-hero.css` và `#home.sd-code-hero`; Welcome composition/branding; Product Gallery/fullscreen; Liquid Glass; 6 ô lợi ích, watermark; hiệu ứng bay **CẢ ô sản phẩm vào giỏ**; Admin app/dashboard và các tab; public route/catalog/cart/checkout baseline.
- Chỉ sửa **bug thực sự được Owner báo hoặc QA chứng minh**, tối thiểu file, kiểm thử lại PC/Mobile Light/Dark và có ảnh đối chiếu. Không tự đổi logo sang xanh/đổi bố cục đã duyệt.
- **Owner chưa gửi PASS nghiệm thu phối hợp cuối sau hai lỗi mới nhất** (chỉ mới hỏi “hoàn thành chưa” và xin bàn giao), nên **đừng coi technical PASS là Owner PASS**. Không hỏi họ duyệt lại riêng từng màn đã PASS.

## 5. Điểm tiếp tục cho chat sau
1. **Đọc file này trước**, rồi [prompt hiện hành](./PROMPT-NEXT-CHAT-2026-10-26-STORE-ADMIN-FINALIZATION.md), [hồ sơ cũ](./HANDOFF-STORE-ADMIN-OWNER-ACCEPTANCE-2026-10-26.md) và [E2E release gate](./QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md). Đoạn cũ đánh dấu checkpoint **lịch sử**.
2. Fetch `main`, HEAD integration và PR #118; so diff từ `a4627e5`. Nếu commit sau là **docs-only**, giữ kết quả QA mã đã PASS; nếu đổi code thì QA phạm vi tác động, không làm lại Owner PASS.
3. **Đợi yêu cầu kế tiếp của Owner**, thực hiện trực tiếp, không hỏi lại lịch sử. Nếu Owner yêu cầu sửa Welcome cold-start/theme, nghiên cứu đúng phần đầu tải/transition/performance; **đừng nhầm với exit glitch** đã sửa.
4. Nếu nhiệm vụ là phát hành: trước tiên cần **ủy quyền rõ ràng riêng cho merge/deploy**; nghiệm thu Preview **không tự động cho phép merge**. Chuẩn bị rollback/cảnh báo bindings D1/R2 và chỉ release khi được cho phép.
5. Giữ theo dõi đúng phương pháp: CI source, isolated Preview SHA/D1/R2, Chromium read-only + disposable, Admin smoke. Không khai báo “Production 100%” khi chưa triển khai.

## 6. File/QA cần đọc khi xử lý thay đổi mới
- `public/index.html`: Welcome first paint/font preload/readiness và `applyThemeMode`.
- `public/material-gallery.css`, `public/material-gallery.js`, `public/images/crocodile-leather/gallery.json`: theme fast-switch và material slideshow.
- `scripts/qa-storefront-theme-material.mjs`: cold-font simulated latency PC/mobile, Welcome exit, theme/tile regression.
- `tests/welcome-owner-approved.test.mjs`; `tests/material-gallery-theme-atomic.test.mjs`.
- `.github/workflows/integration-storefront-isolated-preview.yml`, `scripts/audit-storefront-main-preview.mjs`, `scripts/qa-storefront-remote-preview-order.mjs`.
- `docs/integration/QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md`, `docs/integration/HANDOFF-STORE-ADMIN-OWNER-ACCEPTANCE-2026-10-26.md`.

**Kết luận:** sửa gần nhất **QA kỹ thuật PASS ở isolated Preview**; thiết bị thực Owner và quyền merge/Production **chưa nghiệm thu/chưa được cấp**. PR #118 tiếp tục DRAFT, không merge.
