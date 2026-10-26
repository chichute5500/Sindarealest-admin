# PROMPT NEXT CHAT — SINDAREALEST: TIẾP TỤC SỬA TẬN GỐC LỖI THEME

Tiếp tục **TRỰC TIẾP** dự án hiện hữu `chichute5500/Sindarealest-admin` trên GitHub, **không tạo dự án mới, không hỏi lại lịch sử và không làm lại bất kỳ thiết kế nào Owner đã PASS.** Người dùng yêu cầu **triển khai sửa/tối ưu**, tận dụng tối đa các kiểm tra độc lập song song, không dừng ở việc báo FAIL.

**Nhánh DUY NHẤT được sửa:** `integration/storefront-locked-on-main-2026-10-26`. **PR #118 OPEN/DRAFT, chưa merge; KHÔNG merge hoặc deploy Production khi chưa có chỉ thị rõ ràng.** D1/R2 Production, giao dịch ngân hàng thật tuyệt đối không dùng làm QA. Preview cách ly: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/.

## BẮT BUỘC — ĐỌC HẾT SOURCE OF TRUTH TRƯỚC KHI SỬA

1. **`docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md` — checkpoint QUAN TRỌNG NHẤT, mới hơn mọi handoff cũ.**
2. `docs/integration/THEME-CHROMIUM-PERF-INVESTIGATION-2026-10-26.md` — các phép thử render/raster/root-cascade đã làm.
3. `docs/integration/CSS-CASCADE-DEEP-AUDIT-2026-10-26.md` — CSS lặp/đè, CSS catalog <style> lồng còn rủi ro.
4. `docs/integration/STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md` và `docs/integration/QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md` — các phần Owner PASS và giới hạn QA.
5. Code thực tế: `public/index.html` (`applyThemeMode`, `toggleTheme`, navbar + background), `public/material-gallery.css`, `public/code-hero.css`, `scripts/qa-storefront-theme-material.mjs`, `tests/material-gallery-theme-atomic.test.mjs`, `scripts/audit-static-assets.mjs`, workflows integration/chromium read-only.

## CHECKPOINT CHÍNH XÁC KHI BÀN GIAO (26/10/2026)

- HEAD ứng dụng trước commit handoff: `7ef00dce06177e9718975c0df0e05b7074be8dba` (`7ef00dce`); `main` SHA `db40af63965678598b0ebd3f3fe63865849dcf2e`. HEAD có thể mới hơn do commit doc — **tự xác minh bằng GitHub connector**.
- **Latest CI source PASS:** #40336211284.
- **Latest Admin Preview PASS:** #40336211225.
- **Latest isolated integration FAIL** #40336201444: deploy/isolated D1 checkout/Admin đều PASS, **Chromium theme FAIL**. Dark nav + nền bắt đầu ở **123ms** (>80ms), kết thúc **343ms** (>300ms); Light bắt đầu 64ms, kết thúc 287ms. Fade CSS đang **205ms**; 120ms longtask, Script ~3ms, RecalcStyle ~46ms.
- **Bản full integrated PASS gần nhất:** source SHA `b99295ae0969ac3189cf3ec23238cc7f3297f089` tại run **#40334252328 SUCCESS 3/3**; lúc đó nav/bg CSS fade **220ms** và two-phase có sẵn. Sau đó thêm rapid-tap test, thử rút duration từ 220→205ms, chỉnh auditor và workflow; **không được coi 7ef là PASS**.
- GATE KHÔNG HẠ: nav/background transitionstart <=80ms sau click; transitionend <=300ms; skew <=40ms; timing 220±25ms; Light→Dark→Light và rapid taps PC/Mobile phải PASS.
- Latest implementation uses two-phase **surface-first** (inline navbar + opacity nền) rồi commit `html.dark` khi navbar `transitionstart`; fallback 560ms, cleanup inline & cancel rapid taps. Không viết lại blindly.
- HERO mới có CTA Zalo với viền nhấp nháy, slogan trong glass; **Owner đã PASS**. Welcome, Material Gallery 12 ảnh/1.5s/crossfade 580ms, catalog/fullscreen, Liquid Glass, Admin, mobile đã có nghiệm thu trước; bảo vệ tuyệt đối.
- CSS xếp lớp đã dọn các quy tắc HERO ảnh không còn hiệu lực, có static auditors. **Không xóa ảnh WebP hash trong danh mục động**, không kích hoạt CSS <style> lồng nếu chưa kiểm computed styles và screenshot parity.

## NHIỆM VỤ BẮT ĐẦU NGAY, KHÔNG HỎI OWNER

**Luồng A (root cause):** xác minh diff `b99295ae...7ef00dce`, xem log #40334252328 vs #40336201444; khoanh vùng regression sau khi giảm 220ms xuống 205ms và test rapid tap. Cân nhắc quay riêng fade 205→220ms (giữ staged transition + mobile color + rapid cancellation) như thí nghiệm kiểm chứng, **không giả định đây là fix**.

**Luồng B (chất lượng UI):** kiểm tra computed colors thực navbar PC/Mobile Dark/Light, các background satin SVG, Welcome Noto fonts, HERO CTA và glass, catalog click/URL, mobile bottom nav, reduced-motion, rapid taps. Nếu thay đổi CSS phải tự chụp/so sánh trên Preview và không làm lệch design đã PASS.

**Luồng C (CI/isolation):** chạy source CI, Admin Preview, browser stress PC/Mobile, isolated D1/R2 checkout bằng QA fixture cleanup; các job độc lập chạy song song khi phù hợp. Kiểm tra đúng SHA để không lẫn kết quả của code khác. Không sửa main, không deploy Production.

**Luồng D (cleanup):** chỉ gỡ CSS/file thừa đã chứng minh không được tham chiếu bằng HTML/JS/CSS/data động, giữ nguyên CSS layering intentional và các asset/photos Owner; CSS catalog <style> lồng là blocker cần kiểm tra cẩn trọng.

**Cách báo cáo:** trạng thái có dẫn Actions/commit, lỗi chính xác còn lại, tác động và bước đang làm. Khi fail, tiếp tục công việc có ích trong phiên hiện tại; không chỉ nói “lỗi” rồi dừng. Chỉ báo 100% sau khi gate thật PASS và Owner nghiệm thu, **không tự merge hay deploy Production**.

**Luôn dùng GitHub tools sửa trực tiếp, không gửi code để Owner tự dán.** Bắt đầu bằng đọc handoff mới nhất, xem PR/HEAD/Actions, rồi hành động.
