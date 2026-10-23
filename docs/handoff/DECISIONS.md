## DECISION UPDATE — CATALOG RESULT ANNOUNCEMENT — 2026-10-24

- Use the concise `#pageSummary` as the polite atomic status region for product search/category result updates.
- Do not make the entire product-card grid the live region; this avoids announcing a large set of card contents when the customer only needs the updated result summary.
- Implemented in source SHA `7939990c2387654a66cf6f859933ca718ccd3848`; regression contract in `046629d4170221d4bd3858d405ca36a26f1b5ef9`.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40041239674; Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40041239657; Preview https://66a04db0.sindarealest2.pages.dev/.
- This decision changes accessibility announcement semantics only. It does not reopen catalog filter appearance, catalog data, SKU routes, gallery, Hero, or other PASS/LOCKED scopes.

---

## IMPLEMENTATION RECORD — STRICT CLIENT PRODUCT ROUTE MATCHING — 2026-10-24

- Technical change committed in tree `8a92278e189bd9f83063bcd35284ea88a065cc01`: frontend route detection now validates product route segments against the canonical character/length constraints used by the existing middleware before calling `decodeURIComponent()`.
- Regression coverage rejects malformed encoded paths on both direct-load and history-navigation matchers. Valid legacy and modern product routes remain accepted.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40022567725
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40022567643; immutable Preview https://b9ee1245.sindarealest2.pages.dev/.
- This is an implementation/test record, not an owner visual acceptance. Gallery remains PAUSED / NOT ACCEPTED; PR #108 remains OPEN/unmerged; Production branch remains `main`; no restricted scopes were changed.

---

## LATEST VERIFIED UPDATE — MOBILE GALLERY ROOT-CAUSE REWORK — 2026-10-24

- Latest code commit deployed to Preview: `11a35b0d01eff46463675ee39ce80fc4465a655c`; latest test-only commit: `5fbb3cd5610200b04f285008895d0f6890887af6`.
- Root-cause direction: removed the 460ms overlapping mobile crossfade and its keyframes; mobile transitions now wait for the incoming image to load/decode, then atomically activate the incoming layer and deactivate the outgoing layer without a fade or delayed animation. Desktop directional animation remains.
- CSS mobile rule disables animation, transition, transform, and will-change on fullscreen image layers to reduce compositor artifacts. Added low-priority neighbor preload/decode cache, bounded to 12 images; preload is guarded for non-browser test harnesses and cleared on product-gallery open.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020102663
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020102657
- Immutable Preview: https://43851571.sindarealest2.pages.dev/
- Deployment logs confirm Pages project `sindarealest2`, Production branch `main`, and exact SHA deployment. No Production deployment or main-branch change.
- Liquid Glass visual workflow skipped by Hero guard; do not inspect Hero. No real-device visual acceptance yet.
- PR #108 remains OPEN/unmerged, base `main`.
- Acceptance remains OPEN until owner retests the fullscreen product gallery on a phone. If flicker persists, inspect rendered CSS/compositor behavior and all duplicate selectors/history before another visual tweak.

## DECISION UPDATE — MOBILE FULLSCREEN GALLERY TRANSITION — 2026-10-24

- Keep the existing image visible until the incoming image has both loaded and decoded.
- On mobile, do not force ordinary next/previous navigation into an immediate swap. Use a 460 ms opacity crossfade after decode; activate the incoming layer before deactivating the outgoing layer.
- Decode rejection and stale requests must not reveal an unconfirmed image or override a newer request.
- Evidence: CI [#40018595783 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018595783); exact-SHA Preview deploy [#40018595733 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018595733); Preview https://c05ce8c0.sindarealest2.pages.dev/.
- This is not owner visual acceptance. Keep gallery acceptance OPEN until owner verifies on a real mobile device. Hero remains PAUSED BY OWNER; PR #108 OPEN/unmerged; no Production/main changes.

---

## DECISION UPDATE — FULLSCREEN DECODE FAILURE — 2026-10-24

- Accept the minimal decode-failure guard as an implementation change pending owner visual acceptance; it does not alter Liquid Glass styling, layout, controls, or gallery interaction design.
- When the incoming fullscreen photo fails to decode (including a synchronous throw), do not reveal that layer. Keep the previously active photo visible and restore its active/accessibility state. The transition ID remains authoritative so stale callbacks cannot affect the newest request.
- Automated regression + exact-SHA CI + Preview deploy are implementation gates only. The owner must still confirm perceived flicker on a phone before marking fullscreen gallery PASS.
- Existing decisions remain unchanged: PR #108 OPEN/unmerged; Production branch `main`; Hero PAUSED BY OWNER; all other storefront sections PASS/LOCKED; no Production/main, Admin/backend/API/data/storage/secrets/infrastructure/payment changes.

---

# Decision log — SinDarealest2

Lưu các quyết định đã chốt để AI sau không hỏi lại hoặc đảo ngược tùy tiện. Nội dung trong file này là ràng buộc dự án; khi có yêu cầu mới rõ ràng từ người dùng, ghi quyết định mới kèm ngày và phạm vi thay đổi.

## Quyết định hiện hành

### DEC-001 — Chỉ làm việc trên nhánh Preview đã chỉ định
- Quyết định: phạm vi làm việc là `fix/liquid-glass-audit-2026-10-19`.
- Không merge/deploy Production và không sửa cấu hình Production.
- Không chỉnh nhánh admin riêng `feature/admin-isolated-handoff-2026-10-20`.
- Lý do: tránh ảnh hưởng website thật và công việc độc lập của AI khác.

### DEC-002 — Ảnh mẫu gốc web tĩnh là nguồn tham chiếu chuẩn
- Sáng: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`.
- Tối: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Không đổi vai trò ảnh, không ghi đè/xóa ảnh gốc.
- Phải xem trực quan ảnh trước khi tuyên bố đã phân tích thiết kế.

### DEC-003 — Ảnh mẫu, baseline và ảnh kết thúc là ba loại riêng
- Mẫu gốc: `docs/static-web-reference/`.
- Ảnh chụp trước sửa: `docs/website-screenshots/start-of-work/`.
- Ảnh chụp sau sửa: `docs/website-screenshots/end-of-work/`.
- Ảnh trước/sau phải được chụp thực tế, không sao chép ảnh mẫu hoặc dùng ảnh dựng giả.

### DEC-004 — Giữ nguyên kiến trúc và hành vi ngoài phạm vi
- Duy trì HTML/CSS/JavaScript tĩnh, Pages Functions, D1, R2 và Workers AI.
- Không tự chuyển sang React/Vite.
- Giữ logo, dữ liệu sản phẩm, SKU, slug, URL ảnh, API, HTML IDs, xác thực và bindings hiện có, trừ khi có chỉ đạo riêng và bằng chứng cần thiết.

### DEC-005 — Không coi mock là kết quả dịch vụ thật
- Test mock, test mã nguồn tĩnh, test trình duyệt và test dịch vụ thật phải báo cáo riêng.
- Workers AI chỉ được xác nhận hoạt động thật khi có test thật và bằng chứng đầu ra.

### DEC-006 — Không ghi/xóa dữ liệu thật khi kiểm thử
- Không tạo đơn/thanh toán thật.
- Không ghi/xóa dữ liệu D1/R2 Production.
- Dùng dữ liệu thử nghiệm an toàn và môi trường Preview đã xác minh.

### DEC-007 — Trạng thái công việc phải có bằng chứng
- PASS cần test/log/ảnh hoặc bằng chứng phù hợp.
- Không đủ bằng chứng dùng UNVERIFIED/NOT TESTED; phụ thuộc môi trường dùng BLOCKED.
- Không tuyên bố 100% khi còn hạng mục bắt buộc chưa xác minh.

## Mẫu ghi quyết định mới

### DEC-NNN — Tiêu đề
- Ngày:
- Quyết định:
- Lý do:
- Phạm vi:
- Tác động/điều kiện:
- Người dùng đã xác nhận? Nếu cần:
- Commit hoặc bằng chứng liên quan:

### DEC-008 — Phương án dự phòng khi Preview bị chặn — 2026-10-20
- Quyết định: Không dừng toàn bộ công việc khi URL Preview trả về `login_required`. Tiếp tục các phần có thể xác minh độc lập bằng mã nguồn GitHub, test suite, kiểm thử Playwright trên local static preview và artifact ảnh kiểm thử.
- Phân loại bằng chứng: (1) kiểm thử mã nguồn/local; (2) ảnh tham chiếu gốc; (3) baseline/kết quả trên Cloudflare Preview; ba loại phải được ghi tách biệt.
- Điều kiện: Không dùng ảnh local làm ảnh baseline/end-of-work của Preview; không tuyên bố đã xem trực quan ảnh PNG nếu công cụ không trả được nội dung hình ảnh; không bypass xác thực hoặc truy cập trái phép.
- Hành động tiếp theo: tiếp tục audit route, CSS khu vực sáu ô, responsive/Light-Dark từ source; thử các kênh truy cập hợp lệ khác cho Preview và ảnh tham chiếu. Chỉ sửa giao diện sau khi có bằng chứng đủ cụ thể; route mới chỉ làm khi mã sản phẩm/danh mục đã xác minh.
- Bằng chứng mới nhất: workflow [39350484564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564) PASS; artifact [12232777359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564/artifacts/12232777359). Đây là kiểm thử local, không phải Preview thật.


## DEC-009 — Do not merge the visual-audit branch without scope isolation (2026-10-20)

- The current branch comparison against `main` is `diverged`, ahead by 293 commits and behind by 6 at commit `fa7445b74661faf260c32b3ab32dfa85e3538e78`; the compare reports 72 changed files.
- The changed-file set includes `public/admin/index.html`, multiple `functions/api/admin/*` files, shared API/middleware files, `migrations/0008_product_sku_verification.sql`, deployment/setup scripts, the large `data/legacy-products.json` fixture, and `public/index.html`. This exceeds a narrowly isolated public static UI task.
- Decision: do not merge this branch as-is and do not deploy it to Production. First separate or explicitly review each out-of-scope change against the correct base. No admin/API/DB/production changes are authorized by this visual-audit continuation.
- Evidence: [GitHub compare](https://github.com/chichute5500/Sindarealest-admin/compare/28c768ba26b1d9f7d40e14efac5112526ed1c8b3...fa7445b74661faf260c32b3ab32dfa85e3538e78), [PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108).


## DEC-010 — Do not change storefront while Preview auth is absent (2026-10-20)

- Run [39357805505](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505) and artifact [12236385238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505/artifacts/12236385238) report `accessServiceTokenConfigured=false` and `accessBlocked=true` before the storefront rendered.
- Decision: never substitute fixture screenshots into canonical screenshot folders and do not modify HTML/CSS or product routing against an unobserved render. First enable Preview-only Service Auth, then validate a genuine baseline.
- Compare at commit `8dda620a6e2fede306de9ad3440ff5e34b338eb1`: diverged, 311 ahead / 6 behind / 73 files changed. Keep PR #108 unmerged and do not deploy Production until out-of-scope admin/API/migration/config changes are isolated and reviewed.
 
## DECISION UPDATE — FULLSCREEN GALLERY TRANSITION — 2026-10-24

- Use a directional slide for both desktop and mobile instead of the mobile atomic no-animation swap. Both image layers remain in the same viewer frame; the incoming image must finish load/decode before the 300 ms slide starts.
- On opening a product's fullscreen album, proactively preload all images belonging to that product album; prioritize the selected photo, then warm the rest at low fetch priority.
- Keep reduced-motion support, stale-transition guards, decode-failure fallback, original product image URLs, and existing gallery controls. Do not change unrelated gallery/detail behavior.
- Acceptance remains pending until the owner tests the Preview on a real phone. CI/Preview deployment do not prove the flicker is fixed.


## DEC-011 — Pause fullscreen flicker and preserve owner PASS/LOCKED scope (2026-10-24)

- Owner explicitly paused mobile fullscreen-gallery flicker work and directed the next chat to move to a new task.
- Current gallery slide + full-album preload source/test commits remain in Preview, with CI and deployment PASS, but the visual issue is **not accepted** because the owner still observed flicker. Mark PAUSED / NOT ACCEPTED, not PASS. Do not continue editing or request a phone retest unless the owner reopens it.
- All other owner-accepted areas remain PASS/LOCKED; do not repeat audits or reopen them. See CURRENT-STATE.md and TASKS.md for the inventory.
- If no clearly authorized unlocked task is available, ask the owner what new task to do. Preserve PR #108 open/unmerged and all project safety boundaries.
