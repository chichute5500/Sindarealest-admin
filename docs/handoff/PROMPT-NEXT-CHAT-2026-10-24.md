# ACTIVE HANDOFF OVERRIDE — HERO PEDESTAL IS STILL OPEN — 2026-10-24

You are continuing the existing SinDarealest2 project. Do not restart or repeat completed work. The immediate user complaint is: **“Phần bệ như ảnh mẫu đâu”** (“Where is the pedestal/platform shown in the reference?”). The user then asked to update handoff files and the prompt. Your first task is to make the Hero platform visibly match the real reference; do not merely report green CI.

## Verified repository state
- Repo: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN/unmerged, base `main`.
- Latest verified branch/PR HEAD before this handoff update: `98d45c4acd859ddda2f8067e5bfa336a8ec277ec` (“Keep Hero product PNG in front of CSS pedestal”). Re-fetch before editing.
- Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Validate PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40082426093
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40082426084
- Hero-only audit PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40082426108; screenshot/report artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40082426108/artifacts/12556115231
- Gallery-only audit PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40082426085

## Critical truth about current status
A CSS pedestal currently exists in `public/index.html`: `#home .hero-visual::before` draws the oval top and `::after` draws the front plinth. There are light/dark and mobile/tablet adjustments, and the product PNG is layered above it. However, the owner still says the pedestal is missing relative to the reference. Therefore **the implementation is NOT visually accepted and the task is OPEN**, even though the general Hero Playwright audit passes. That audit does not assert reference-level pedestal parity.

## Immediate work — do not stop at a report
1. Read `docs/handoff/CURRENT-STATE.md`, `TASKS.md`, `DECISIONS.md`, `TEST-RESULTS.md`, this prompt, and inspect current source around Hero CSS. Fetch current branch/PR HEAD and recent Actions first.
2. Download/inspect artifact 12556115231. Compare its actual screenshots to the actual user-provided reference image, not to memory or an unrelated generated image. Search available conversation/library files for the reference if it is not mounted; ask the owner to upload only if genuinely unavailable.
3. Examine the current `::before` and `::after` geometry: whether pseudo-elements are anchored to a positioned containing block; whether their `bottom` offsets align to the shoe soles; whether the front face is visible; whether the PNG/transparent padding makes the platform appear detached or hidden; whether stacking/overflow rules clip it; and whether desktop image sizing changed the reference alignment.
4. Make the smallest CSS-only correction so the platform clearly resembles the reference: pearl/ice-blue marble oval top, visible front vertical/slanted plinth face, realistic subtle shadow, correct width and shoe contact. Match proportions to the reference rather than arbitrary values. Keep the original transparent PNG untouched—no pixel edits, crop, mask, recolor, or substitute shoe image. Platform stays behind the shoe product.
5. Verify 360×800, 390×844, 768×1024, 1280×800, 1440×900 in both light/dark. Check copy overlap, product visibility, platform position/contact, clipping, horizontal overflow, console/network errors.
6. Run full Validate, deploy only the named branch to Cloudflare Pages Preview, run Hero-only Playwright audit against the exact deployed SHA, and inspect fresh screenshot artifacts. A green run alone is not proof of visual match. Repeat a minimal correction cycle if needed.
7. Only mark the pedestal done after actual reference comparison supports it. The owner may still need to approve the visual. Keep status `OWNER ACCEPTANCE REQUIRED` until that happens.

## Hard boundaries
- Do not merge PR #108. Never modify `main` or Production.
- Do not change unrelated Admin/backend/API/auth, catalog/product data, D1/R2/migrations, payment/QR, secrets/bindings, DNS, Cloudflare Access/infrastructure.
- Do not redo or alter owner-PASS/LOCKED scopes (gallery, icon system, catalog filters, `#order`, warranty, navigation, cart/account, etc.) unless a concrete regression and explicit authorization exist.
- Re-fetch HEAD before each write; if branch moved, reconcile before editing.
- Keep the work continuous: progress report is not a stopping point. Report exact evidence and continue until the Hero pedestal is visually checked or a genuinely owner-blocking input is needed.
- Project is not 100% complete merely because Validate/deploy/audit are green.

# LATEST PROMPT HANDOFF — SINDAREALEST2 — 2026-10-24

> Read first. This supersedes older task/SHA entries below. Continue the existing project; do not restart it.

## Current repository state
- Repo: `chichute5500/Sindarealest-admin`
- Working branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, not merged, base `main`.
- Latest storefront source/test tree and Preview SHA: `8a92278e189bd9f83063bcd35284ea88a065cc01`. After this docs-only commit, fetch live branch HEAD rather than assuming HEAD still equals the deployed code SHA.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40022567725
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40022567643
- Immutable Preview: https://b9ee1245.sindarealest2.pages.dev/
- Project `sindarealest2`; Production branch `main`. No Production deployment or PR merge.

## Latest completed task — safe product-route guard
- A source-first audit found the storefront's product route regexes looser than the canonical route validation in `functions/_middleware.js`.
- Updated both initial-load and history-navigation matchers in `public/index.html` to reject invalid segment characters/length before `decodeURIComponent()`.
- Added regression assertions for valid modern/legacy routes plus malformed percent-encoded paths. Full validation CI and Preview deploy passed on `8a92278e189bd9f83063bcd35284ea88a065cc01`.
- This is a technical routing fix; no browser visual audit is claimed.

## Mandatory owner decisions and scope locks
- Fullscreen mobile product-gallery flicker is **PAUSED / NOT ACCEPTED**. Keep the currently deployed slide + full-album-preload behavior in place; do not inspect/change gallery CSS/JS, transitions, preload, layers, tests, roll back, or ask for a phone retest until the owner explicitly reopens it.
- Hero is **PAUSED BY OWNER**: never inspect, capture, edit, or include it in any visual workflow.
- Do not reopen/retest owner PASS/LOCKED areas: mobile cart/account and modal/history; icon system/Liquid Glass appearance/press/dimensions; catalog filters/chips/icons/heights/effects (never restore the removed product-status panel); `#order`; warranty claim/lookup; mobile navigation/focus/history; welcome dialog; gallery focus/accessibility (distinct from visual flicker); warranty focus; favorites migration; slideshow guard; stale cart/badge; Zalo/contact/share; and other owner-accepted storefront work.
- Keep PR #108 OPEN/unmerged. Preview only. Do not touch `main`, Production, Admin/backend/API/auth, catalog/product data, D1/R2, secrets/bindings, DNS, Cloudflare Access/infrastructure, or live-payment flow.

## Next action
- Re-fetch branch HEAD, PR state and recent Actions before any code change.
- Continue only a specifically authorized, unlocked backlog task. The route guard is complete; no other concrete unlocked task is currently enumerated. Do not create scope from historical audit notes or retest PASS items. If no clearly authorized unlocked task is available, ask the owner one concise question: what new task should be started?
- A docs-only handoff commit does not alter storefront source or represent a new deployment.

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

# CURRENT HANDOFF UPDATE — MOBILE FULLSCREEN GALLERY FLICKER — 2026-10-24

> Read this update first. This supersedes older source SHA, run, and Preview details below; old entries remain historical records.

## Current verified state

- Repository: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, not merged, base `main`.
- Source/test SHA deployed: `e0b9e10325b42c5b658e6e911b9fa745530a67b0`.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018595783
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40018595733
- Immutable Preview: https://c05ce8c0.sindarealest2.pages.dev/
- Branch Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Cloudflare Pages project `sindarealest2`; Production branch remains `main`. No Production deployment or PR merge.

## Latest gallery investigation

- Found a plausible root cause: the mobile media query forcibly set every gallery navigation to `instant=true`, bypassing transition animation even when the next image was successfully loaded and decoded.
- Removed that forced instant mode for ordinary next/previous changes. After load and decode, mobile uses a 460 ms opacity crossfade; outgoing photo remains visible until the transition commits. Incoming active layer is enabled before outgoing layer is disabled.
- Decode failures keep the current photo; transition IDs prevent stale overlapping requests from taking over.
- Tests run the real `setFullscreenPhoto()` function with controlled load/decode promises and verify pending decode, rejection, stale requests, mobile fade timing, and layer ordering.
- CI and Preview deployment passed on the exact SHA. The Liquid Glass visual workflow was SKIPPED by its Hero guard. No browser/Playwright screenshot or device visual acceptance is claimed.

## Only open item

Owner must test the immutable Preview on a phone: open a product fullscreen gallery, switch next/previous several times and tap different thumbnails. Confirm whether any flicker, flash, or ghost/overlaid image remains. Do not mark PASS before owner confirmation. Do not ask to retest cart/account or any other accepted section.

## Boundaries

Hero remains PAUSED BY OWNER: never inspect, capture, edit, or include it in visual workflows. All other storefront sections remain PASS/LOCKED. Do not change `main`, merge PR #108, deploy Production, or touch Admin/backend/API/auth, catalog data, D1/R2, secrets/bindings, DNS, Cloudflare Access/infrastructure, or payment flow.

The latest source/test SHA can differ from branch HEAD after this handoff commit because this commit updates documentation only; documentation updates are not new storefront deployments.

---

# CURRENT HANDOFF UPDATE — SinDarealest2 Storefront — 2026-10-24

> Read this update first. It supersedes older SHA/run details below; historical records are retained as history.

## Current source, tests, and Preview

- Repository: `chichute5500/Sindarealest-admin`.
- Working branch: `fix/liquid-glass-audit-2026-10-19`.
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, not merged, base `main`.
- Latest storefront source/test SHA deployed to Preview: `fa24269d7e1c06b511d1b08455d77493bd4c9d1e` (`fix: preserve fullscreen photo when decode fails`, plus regression-test fixture corrections in the same source/test series).
- Exact-SHA CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40015701227
- Exact-SHA Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40015701262
- Immutable Preview: https://6f355551.sindarealest2.pages.dev/
- Branch alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Project must remain `sindarealest2`; Production branch must remain `main`. No Production deploy and no PR merge.

## Only open item

Investigate/verify the occasional mobile product fullscreen-image flicker. A confirmed unsafe path was fixed: decode failure used to be swallowed and then treated as a successful reveal. It now keeps the existing image visible on decode failure. A real-function runtime regression test covers pending decode, rejected decode, and stale overlapping requests.

**Next action:** owner tests the immutable Preview on a phone: open a product’s fullscreen gallery, move next/previous and tap different thumbnails repeatedly, noting whether any flash or ghost/overlaid image remains. Do not ask owner to retest cart/account or other accepted work. Do not label visual acceptance PASS until owner confirms.

## Acceptance and boundaries

- CI PASS and Preview deploy PASS are automated evidence; they are not visual acceptance.
- Liquid Glass isolated visual workflow is SKIPPED because it requires Hero coverage; Hero remains PAUSED BY OWNER and must not be inspected, captured, or modified.
- All other items remain PASS/LOCKED per latest owner instruction: mobile cart/account controls; accepted icon/Liquid Glass appearance and dimensions; catalog filters/chips; `#order`; warranty claim form/lookup; every other previously accepted storefront section. Do not reopen any.
- No changes to `main`, Production, Admin/backend/API/auth, catalog data, D1/R2, secrets, bindings, DNS, Cloudflare Access/infrastructure, or live-payment flow.
- The newest source/test SHA can differ from branch HEAD after this handoff commit because this commit updates documentation only. This docs update does not change deployed storefront assets and must not be described as a new deployment.

---

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
 
## HANDOFF UPDATE — 2026-10-24 — FULLSCREEN GALLERY SLIDE + PRELOAD ALL PHOTOS

Tiếp tục từ Preview hiện có, không khởi động lại dự án.

- Repository: `chichute5500/Sindarealest-admin`; branch: `fix/liquid-glass-audit-2026-10-19`; PR #108 vẫn OPEN/unmerged.
- Thay đổi mới: fullscreen gallery dùng directional slide 300 ms trên mobile và desktop. Khi mở bộ ảnh sản phẩm, bắt đầu preload toàn bộ ảnh trong album; ảnh đang chọn ưu tiên cao, các ảnh còn lại ưu tiên thấp. Chỉ bắt đầu chuyển khi ảnh đích load/decode xong; giữ guard chống request/decode cũ và tôn trọng reduced-motion.
- Code commit: `be27230919462aabbb86c8a9b4a2369375dd752f`; test commit: `87cef74f427ff7178e984e3bd836152948f1d974`.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020956856
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020956813
- Preview URL: https://9fe68f80.sindarealest2.pages.dev/
- **Chưa được coi là PASS về hình ảnh.** Chủ dự án cần test trên điện thoại: nhấn chậm và nhấn nhanh liên tục nút trước/sau, xác nhận hết nháy và ảnh bóng. Nếu còn lỗi, tiếp tục trace CSS/layer thực tế, không quay lại cách bỏ hoàn toàn hiệu ứng.
- Không merge PR, không deploy Production, không chỉnh `main`, không mở lại các mục PASS/LOCKED. Hero vẫn PAUSED BY OWNER và visual workflow có thể bị guard skip.



# LATEST HANDOFF — OWNER PAUSED GALLERY; CONTINUE NEW WORK ONLY — 2026-10-24

**Read this section first; it supersedes older instructions below that ask for a gallery phone retest.**

## Current repository state
- Repository: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — must stay OPEN/unmerged, base `main`.
- Latest gallery source: `be27230919462aabbb86c8a9b4a2369375dd752f`; test commit: `87cef74f427ff7178e984e3bd836152948f1d974`.
- CI PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020956856
- Preview deploy PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40020956813
- Preview: https://9fe68f80.sindarealest2.pages.dev/

## Owner's latest decision
- The fullscreen mobile gallery still flickers. Owner says: **pause this part and handle it later**. Its status is **PAUSED / NOT ACCEPTED**, despite CI/deploy passing. Do not keep investigating, edit CSS/JS, alter slide/preload behavior, change gallery tests, roll back, or ask for phone retesting until the owner explicitly reopens the issue.
- The latest deployed gallery behavior currently uses a directional 300 ms slide on mobile/desktop and starts preloading every image in the opened album. Keep the current Preview/source in place while paused.

## PASS / LOCKED — DO NOT REPEAT OR REOPEN
The owner says the prior chat has already passed the following. Do not rerun the same checks or ask the owner to retest them:
- Mobile cart/account controls and modal open/close/history behavior.
- Shared icon system; accepted Liquid Glass appearance, press feedback, sizes/dimensions and controls.
- Catalog Liquid Glass filters/chips/icons/heights/effects. Do not restore the removed standalone product-status filter panel.
- `#order` / “Đặt hàng an tâm”.
- Warranty claim and lookup flow; do not ask for invented warranty code/phone.
- Mobile navigation focus/history; welcome dialog keyboard handling; gallery focus/accessibility handling (this is separate from the paused visual flicker); warranty-form focus transfer; favorites legacy-key normalization; collection slideshow pause/reduced-motion/missing-control guard; stale-cart cleanup/badge sync; Zalo/contact; and all other owner-accepted storefront work listed in CURRENT-STATE.md and TASKS.md.
- Hero is PAUSED BY OWNER. Never inspect, capture, edit, or include it in any workflow. Respect all existing locked visual areas.

## What to do next
1. Read the newest sections of `docs/handoff/CURRENT-STATE.md`, `TASKS.md`, `DECISIONS.md`, and `TEST-RESULTS.md` before touching code. Do not treat old historical audit notes as open tasks.
2. Continue the next safe task only if it is clearly authorized and unlocked in the existing backlog. Do not create scope by retesting accepted areas. If there is no clearly defined unlocked task, ask the owner one concise question: what new task should be started?
3. Work directly in GitHub/repo/Actions where available; keep checking workflow runs while doing independent safe work. Report exact SHAs and links only after verification.
4. Keep PR #108 open/unmerged. Preview only; never change `main` or deploy Production. Do not touch Admin/backend/API/auth, product/catalog data, D1/R2, secrets/bindings, DNS, Cloudflare Access/infrastructure, or live payments.
5. Do not claim the gallery is fixed or accepted. Do not ask for its manual test until the owner reopens it.
