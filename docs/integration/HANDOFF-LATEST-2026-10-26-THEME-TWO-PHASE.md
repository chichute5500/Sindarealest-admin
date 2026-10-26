> **OWNER PASS — 2026-10-26 — QUYẾT ĐỊNH NGHIỆM THU MỚI NHẤT:** Owner trực tiếp xác nhận **“Pass”** cho bản sửa chuyển theme Sáng/Tối trên điện thoại sau khi xem lại Preview. Source app được duyệt: `e320808029d79b0d43de32744c4f7d8a5913a929` (UI code commit `636bcde9`, QA/docs `e3208080`). Integrated isolated Preview Actions **#40356875061 PASS 3/3**, PC/Mobile 3 chu kỳ Light→Dark→Light, nhấn liên tục, Tài khoản đang mở, khôi phục kính mờ. **KẾT LUẬN: Theme Mobile đã được Owner PASS; không tiếp tục sửa hoặc yêu cầu Owner duyệt lại theme nếu không phát sinh lỗi mới.** Những đoạn lịch sử ở bên dưới như “chưa Owner PASS” là ghi chép trước xác nhận này và đã hết hiệu lực. GIỮ NGUYÊN HERO/Welcome/Gallery/Glass/Admin đã PASS, chỉ PR #118 OPEN DRAFT, chưa merge, tuyệt đối không deploy Production hoặc ghi D1/R2 Production. Owner PASS là nghiệm thu UX cụ thể, không phải cho phép phát hành Production.

> **LATEST ANDROID 23:05 SCREENSHOT REGRESSION — 2026-10-26:** Two owner screenshots show missing HERO static text, benefit tile icons/text and mobile nav items right after switching; DOM remains intact, severe native WebView repaint / glass compositing issue suspected (not confirmed without device telemetry). Only branch integration PR #118 DRAFT changed. Fix attempts: (1) mobile fully opaque outgoing-theme cover, (2) while covered, temporary class sd-theme-repaint-isolated disables expensive backdrop blurs & wallpaper filters only during root palette change, (3) after new palette gets two frames restore full approved Liquid Glass still under opaque cover, (4) wait for compositor settling and fade away after ~1.18s + .28s, (5) freeze IntersectionObserver reveal hiding during transition. Desktop unchanged. Automated QA extended to check isolation during commit and full recovery after, mobile longer timing, account scenario. No acceptance claim for physical Android; owner must retest. No Production or merge.\n\n> **ANDROID SEVERE FLICKER FIX — 26/10/2026 (LATEST):** Owner reports extreme flash even after small clip-radius fix, especially mobile frosted account drawer. CSS full-viewport circle/clip-path + backdrop-filter is a high-risk GPU tiling interaction on Android WebView and prior Chromium screenshots (end state only) cannot prove absence of transient flicker. Removed clip-path/animated gradient masking ENTIRELY. Now a solid outgoing-colour full-screen sheet fades in via opacity .18s, covers the old palette until opacity=1, commits html.dark under full coverage, waits for browser render, and fades sheet out .28s, ~1 second. Small centre text eases separately. Frozen whole-page/nav/drawer background transitions while covered, rapid-cancel safe, reduced-motion direct. QA updated for opacity cover events rather than obsolete circular spread. Owner must validate physical Android browser, do not label it 100% complete based on CI alone. Branch integration PR #118 DRAFT; no merge, Production, Production D1/R2 edits.\n\n> **REGRESSION FIX OWNER SCREENSHOT — 2026-10-26:** Owner screenshot Android displayed dark account drawer with partially drawn cards and large pale horizontal strip during/after theme switching. Old Chromium QA did not cover account drawer open; thus previous PASS did not cover screenshot. Reduced circular CSS clip radius from 150vmax to 72vmax (still covers rectangular viewport corners), removed extra paint containment to reduce Android tile raster pressure; froze html+body background transitions under fully covering overlay so root/body/drawer cannot reveal mixed palette. Extended mobile QA to switch via account action while drawer remains open, assert source/target colors, panel sizing/visibility, inspect account guest+order card bounds, and capture end-state screenshots. This addresses plausible causes but is NOT proof of Android physical GPU until Owner reviews the Preview. No Production changes. Verify latest exact SHA, run artifacts, and PR status before claiming PASS.\n\n> **OWNER UPDATE — 26/10/2026:** Theme chuyển từ trang phủ lập tức sang vòng tròn phát triển từ chữ “Đang đổi giao diện”, nguồn Sáng→Tối phủ sáng, Tối→Sáng phủ tối. Clip-path 450ms, sau khi che kín mới commit palette, chờ browser render và fade thoát 160ms, tổng ~1 giây. Áp dụng PC/Mobile, rapid clicks và reduced motion. QA nguồn phải kiểm tra SHA và Actions; không đánh đồng UX với cải thiện hiệu năng Chromium. Chỉ branch integration, PR #118 DRAFT; tuyệt đối không merge/Production.\n\n> **CẬP NHẬT OWNER UX — 26/10/2026:** Chuyển Light/Dark hiện dùng lớp phủ toàn trang “Đang đổi giao diện” theo đề xuất Owner, giữ 720ms + thoát 160ms thay vì phơi bày nền/navbar chậm. Source [1cfc8e71](https://github.com/chichute5500/Sindarealest-admin/commit/1cfc8e711a79ab50b0f08889e7325206bf127b3e) PASS integrated 3/3 [Actions #40346479818](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40346479818), PC/Mobile mỗi nơi 3 chu kỳ Light→Dark→Light và rapid tap 4 lần PASS, giữ Hero/Welcome/Gallery/Admin/checkout và Preview D1/R2 cách ly. Đây là **đổi tiêu chí trải nghiệm theo yêu cầu mới**, không tuyên bố nguyên nhân chậm render 80/300ms đã được khắc phục. Workflow chẩn đoán read-only #40346480005 chạy trước khi Preview deploy, dẫn đến FAIL sai nguồn (missing interstitial); từ đây chỉ dispatch thủ công sau khi deploy đúng SHA. Kiểm tra trạng thái mới nhất trên GitHub trước khi tuyên bố nghiệm thu 100%. PR vẫn DRAFT, không merge/Production.

# SINDAREALEST — BÀN GIAO MỚI NHẤT / THEME TWO-PHASE
**Thời điểm:** 26/10/2026, Việt Nam. **Đây là trạng thái GitHub đã xác minh**, không phải lời hứa công việc chạy nền. Các checkpoint 26/10 trước đó chỉ là lịch sử; phải lấy PR/Actions mới nhất khi chat mới bắt đầu.

## 0. Thông tin an toàn và nguồn chính thức

- **Repo:** `chichute5500/Sindarealest-admin`.
- **Nhánh duy nhất được phép sửa:** `integration/storefront-locked-on-main-2026-10-26`. **KHÔNG sửa `main` hay nhánh khác.**
- **PR #118:** OPEN, DRAFT, NOT MERGED, mergeable = true: https://github.com/chichute5500/Sindarealest-admin/pull/118.
- **HEAD ứng dụng trước commit tài liệu bàn giao:** `7ef00dce06177e9718975c0df0e05b7074be8dba` (`7ef00dce`). Sau khi commit file bàn giao, HEAD thay đổi nhưng **mã nguồn ứng dụng vẫn ở `7ef00dce`** nếu chỉ có diff tài liệu.
- **Production `main` lúc xác minh:** `db40af63965678598b0ebd3f3fe63865849dcf2e`.
- **Isolated Preview:** https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ (không phải Production). Có thể phải xác nhận URL/deploy hiện hành từ Actions thay vì đoán alias.
- **Cấm:** merge PR, deploy Production, thay đổi D1/R2 Production, thử chuyển khoản/ngân hàng thật, ghi dữ liệu QA vào Production; chỉ Owner cho phép mới phát hành.
- **Người dùng yêu cầu:** không hỏi lại lịch sử, không làm lại phần đã PASS, ưu tiên xử lý tận gốc lag Light/Dark, tự dùng GitHub connector, tận dụng các luồng kiểm thử độc lập song song; không dừng ở báo lỗi.

## 1. LATEST QA — phân biệt chính xác PASS / FAIL

| SHA hoặc workflow | Kết quả xác minh | Ghi chú |
|---|---|---|
| `7ef00dce` — [Source CI #40336211284](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40336211284) | **SUCCESS** | Contract, source, CSS/asset auditor |
| `7ef00dce` — [Admin Preview #40336211225](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40336211225) | **SUCCESS** | Admin |
| `7ef00dce` — [Integrated isolated Preview #40336201444](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40336201444) | **FAIL tổng do Chromium theme** | Deploy+ D1/R2 isolation SUCCESS; remote D1 checkout/Admin QA fixture+cleanup SUCCESS; Chromium light/dark FAIL |
| `b99295ae0969ac3189cf3ec23238cc7f3297f089` — [Integrated #40334252328](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40334252328) | **SUCCESS 3/3** | Nền tảng code **220ms** với two-phase và mobile color parity; không chứa các thay đổi mới sau commit này |
| `6490c02416668d728e115f6a2120dedd08bd1acb` | Source/Admin CI SUCCESS nhưng integrated #40335174410 FAIL | Bổ sung rapid-tap test; cần đọc log nếu phân tích |
| `dcbaeda4741142d5c8e6ca65d15302a219073afb` | Source CI FAIL, integrated FAIL | Chuyển fade **220ms → 205ms**, sau đó assertion CSS test chưa sửa |
| `de31b36e660d3ecc1811568f09fa4ce4a9dc96d4` | Source CI SUCCESS, integrated tiếp theo vẫn FAIL | Cập nhật CSS static auditor kiểm 205ms |
| `7ef00dce` | **HEAD gần nhất**, chưa đủ gate theme | Chỉ thêm trigger integrated workflow theo các file CSS/audit |

**Log lỗi chính xác `7ef00dce`:**
- Chromium Dark: `transitionstart` **123ms** sau click (quá gate 80ms), `transitionend` **343ms** (quá gate 300ms), thời lượng CSS thực `205ms`, **nav + dark/light backdrop cùng bắt đầu tại 123ms**, không bị lệch màu riêng.
- Chromium Light: start **64ms**, end **287ms** (đạt riêng lượt Light).
- Dark có **120ms long task**, `TaskDuration≈252ms`, `RecalcStyle≈46ms`, `Layout≈16ms`, `ScriptDuration≈3ms` ⇒ nguyên nhân chủ yếu là CSS root invalidation / paint/compositor và timing jitter, **không phải handler JS tính toán lâu**.
- Source QA screenshot, checkout và các thiết kế trước đó PASS không cho phép suy luận rằng theme HEAD đã PASS. Đừng tô xanh toàn bộ PR dựa trên CI nguồn.

## 2. Cơ chế two-phase theme ĐÃ CÓ trong code

Cần **đọc thực tế `public/index.html`**, tránh xây lại từ đầu:
- `applyThemeMode(mode, animate=true)`: khi nhấn theme, đưa màu và opacity 3 bề mặt (navbar, `.theme-bg--light`, `.theme-bg--dark`) bằng inline important trước; còn có mobile-bottom-nav.
- Gắn `transitionstart/transitionend` tại navbar. Chỉ khi transition bắt đầu mới commit lớp `html.dark`, cập nhật meta/theme icon để tránh invalidation của toàn trang trước frame đầu tiên.
- Khi end: gỡ inline overrides, gỡ lớp `theme-transitioning`; có fallback 560ms nếu browser thiếu events, và hàm `__sdCancelThemeStage` để xử lý rapid taps.
- Target tạm: `window.__sdThemeTargetDark`; `toggleTheme` dựa vào target này để lần bấm nhanh kế tiếp không đảo sai chiều.
- `public/material-gallery.css` đang đặt opacity wallpaper và nav transition duration **0.205s**; **trước đó PASS 0.22s** (nhưng một lượt 220ms từng kết thúc 305ms). Ngưỡng thực tế vẫn **start <=80ms, end <=300ms, nav/bg skew <=40ms**, CSS duration kỳ vọng ~220±25ms (205ms nằm trong khoảng này).
- `tests/material-gallery-theme-atomic.test.mjs` và `scripts/audit-static-assets.mjs` hiện kiểm `.205s` — nếu thay duration phải cập nhật test cùng code.
- `scripts/qa-storefront-theme-material.mjs`: strict PC 1440 và Mobile 390 Light→Dark→Light, Welcome cold font, material 1500ms/crossfade 580ms và **rapid interrupts (4 taps)**, kiểm meta/aria/inline override sau lượt bấm nhanh. Chỉ khi cả hai chiều/môi trường PASS mới chấp nhận.

**Gợi ý tiếp theo có căn cứ:** diff `b99295ae` (SUCCESS integrated, 220ms) với `7ef00dce` (FAIL 205ms) tập trung **205ms và các test/trigger thêm sau**; xem lại first-frame jitter 120ms, không dùng 1 lần PASS duy nhất để chứng minh hết lỗi. Có thể thử hoàn nguyên **riêng 205ms về 220ms** mà giữ two-phase, mobile màu và rapid-tap fixes, rồi chạy 2–3 lượt stress + visual matrix trên exact SHA. **Không nới 80/300ms, không tăng fade theo cảm giác, không sửa Owner-PASS layout.** Đây là hướng điều tra, không phải sửa đã xác nhận.

## 3. Các thiết kế Owner PASS — BẢO VỆ

- **HERO code-only** `#home.sd-code-hero` / `public/code-hero.css`, text và bố cục PC/Mobile đã Owner duyệt. CTA mới **“Tư Vấn Đặt sản phẩm theo yêu cầu của bạn”** → `https://zalo.me/0827049192`, chỉ **viền** nhấp nháy (reduced-motion tắt); glass card nâng chữ **“SINDAREALEST · SIGNATURE”**, thêm 2 dòng **“Da cá sấu thật” / “Phong cách sống thật”**. Owner **đã PASS**.
- **Welcome** first paint dấu tiếng Việt: Noto Serif/Sans phải load và kiểm `document.fonts.check` trước khi hiện chữ; Welcome exit và cold-font PC/Mobile đã có bằng chứng QA, **không thiết kế lại**.
- **Chất liệu cao cấp**: 12 ảnh thật trong `public/images/crocodile-leather/` cùng `gallery.json`; tự chạy **1.5s** / 1 ảnh, crossfade **580ms**, không arrows/dots, không phủ sáng/tối lên ảnh thật. **Đừng ghi đè/xóa manifest**.
- Product gallery/fullscreen, product card, giỏ hàng/checkout, tài khoản, Admin PC/Mobile, Liquid Glass, theme Light/Dark màu sắc, watermark & logo: đã từng được Owner/QA PASS ở phạm vi cụ thể; **không đổi giao diện để đổi lấy vài ms**.
- E2E synthetic click thẻ sản phẩm cả PC/Mobile từng 8/8 PASS. Vấn đề sản phẩm deep-route cá biệt có thể là workflow khác; không tự đánh đồng synthetic PASS với mọi URL Production.

## 4. Đã dọn code / CSS — ranh giới

- CSS legacy HERO ảnh cũ V2–V9 không khớp với `#home.sd-code-hero` đã xóa có bằng chứng; 2 PNG HERO mồ côi (~913KB) đã xóa. Không kéo chúng trở lại.
- CI có `scripts/audit-css-cascade.mjs`, `scripts/audit-static-assets.mjs`; kiểm toán trước đó phát hiện nhiều nhóm selector lặp/chồng trong các style blocks, **không có nghĩa tất cả là bug**.
- **Chưa tự ý sửa** `<style>` lồng trong `public/index.html` tại catalog CSS do nguy cơ kích hoạt selector cũ làm sai hình đã PASS. Đọc `docs/integration/CSS-CASCADE-DEEP-AUDIT-2026-10-26.md`.
- 526 ảnh sản phẩm WebP theo hash và hồ sơ QA lịch sử có thể được dữ liệu động D1/API sử dụng; **không xóa hàng loạt**.
- Đã thử và hoàn nguyên các hướng không đạt: bỏ navbar blur trong fade, `content-visibility` ngoài màn hình, ẩn HERO, đổi SVG sang PNG lớn, pre-promote compositor, cắt hiệu ứng toàn trang; các phép thử chỉ trong QA được ghi tại tài liệu theme. KHÔNG lặp lại mù.

## 5. Việc chat mới phải xử lý — ưu tiên, không chạy nền

1. Dùng GitHub connector **get_pr_info, branch HEAD, main SHA và Actions**; xác minh trạng thái thời điểm mới chứ không dùng mỗi checkpoint.
2. Đọc **toàn bộ file này** và `docs/integration/PROMPT-NEXT-CHAT-2026-10-26-THEME-TWO-PHASE.md`, `docs/integration/THEME-CHROMIUM-PERF-INVESTIGATION-2026-10-26.md`, `docs/integration/CSS-CASCADE-DEEP-AUDIT-2026-10-26.md`.
3. Phân tích diff từ **last full integrated PASS SHA `b99295ae`** tới hiện tại; đọc log #40336201444 và run #40334252328; xác minh root-cause/failure rate. Lưu ý có nhiều commit test/docs không sửa giao diện.
4. Chỉ sửa bug đã xác định trên branch integration, so sánh visual PC/Mobile Light/Dark, cold-font Welcome, Gallery, Zalo CTA, menu nav, product card, click deep route, checkout; **không đụng Admin/Production nếu không có bằng chứng**.
5. CI và isolated Preview phải PASS trên **cùng mã SHA**; đo theme start/end + rapid taps nhiều lượt, không thay ngưỡng để PASS.
6. Nếu chưa đạt: ghi log, dữ liệu, commit, blockers và tiếp tục sửa; chỉ dừng khi cần Owner thao tác hoặc hết quyền tool. Không báo 100% và không merge PR.

## 6. Căn cứ và prompt mới

- Latest handoff (file này): `docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md`
- **Prompt mở chat mới:** `docs/integration/PROMPT-NEXT-CHAT-2026-10-26-THEME-TWO-PHASE.md`
- Historical accepted design: `docs/integration/STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md`
- Isolated checkout boundary: `docs/integration/QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md`
- Previous broad handoff: `docs/integration/HANDOFF-LATEST-2026-10-26-WELCOME-THEME-MATERIAL.md` (lịch sử, **không thay thế file này**)
- PR: https://github.com/chichute5500/Sindarealest-admin/pull/118

**Đầu ra mong đợi:** sửa dứt điểm lỗi theme + kiểm toán code còn lại trên Preview, rồi báo cáo có thể nghiệm thu; **không** tự phát hành Production.
