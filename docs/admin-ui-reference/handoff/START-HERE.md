# SinDarealest ADMIN — điểm bắt đầu bàn giao cho AI

> Thư mục này là điểm bàn giao bền vững giữa các phiên AI. Nội dung chỉ phản ánh trạng thái đã được ghi và kiểm chứng; không coi báo cáo cũ là bằng chứng nếu chưa xác minh lại.

## Lưu ý về tự động tiếp tục
Các file này lưu trạng thái bền vững nhưng không tự khởi động một phiên ChatGPT mới khi phiên hiện tại hết giới hạn. Tự động chạy tiếp cần có agent/automation riêng thực sự được cấu hình. Khi một phiên AI/automation được khởi chạy, hãy tự đọc tài liệu này và prompt tổng; người dùng không cần viết lại prompt dài.

## Trước khi làm bất cứ việc gì
1. Xác nhận repository `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`, HEAD SHA và `git status`.
2. Đọc file này, rồi đọc `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-COMPLETENESS-AUDIT.md` và `../reference-instructions.md`.
3. Mở ảnh thiết kế gốc `../admin-mobile-reference.png`; dùng `../admin-mobile-reference.html` và ZIP tham chiếu khi cần.
4. Kiểm tra ảnh gần nhất trong thư mục `history/` và đối chiếu SHA trong báo cáo với HEAD hiện tại. Nếu lệch, không coi ảnh đó là ảnh của code hiện tại.
5. Đọc MASTER PROMPT tại `../MASTER-PROMPT-AUTO-HANDOFF.md` và thực hiện đầy đủ.

## Quy tắc cập nhật sau mỗi vòng lặp
- Một vòng lặp là: thực hiện một sửa đổi có ý nghĩa → chạy lại kiểm tra → chụp lại cùng màn hình/điều kiện → so sánh kết quả.
- Sau MỖI vòng lặp hoàn chỉnh, dùng Playwright chụp ảnh ứng dụng đang chạy thật; lưu ảnh trước/sau và báo cáo trong `history/<short-sha-or-run-id>/screenshots/` cùng metadata. Không đợi kết thúc toàn bộ công việc mới lưu.
- Cập nhật `LATEST-STATUS.md`, `latest-test-results.json`, danh sách lỗi còn lại và commit mỗi vòng lặp đã kiểm tra thành công nếu có quyền/công cụ. Ghi SHA thực tế; không tự bịa thời gian, route, kết quả hoặc commit.
- Chỉ ghi PASS khi có bằng chứng. Dùng BLOCKED/NOT TESTED khi chưa kiểm tra được.
- Commit chỉ trên branch fix này. Không merge main, không deploy production, không đổi schema/binding/secret hay dữ liệu thật.
- Nếu quyền truy cập, Playwright hoặc GitHub bị lỗi, ghi rõ trở ngại và hướng tiếp tục; không tuyên bố đã lưu nếu API chưa xác nhận.

## Tệp trong thư mục này
- `LATEST-STATUS.md`: trạng thái bàn giao mới nhất.
- `latest-test-results.json`: mẫu/cập nhật kết quả kiểm thử.
- `PROMPT-COMPLETENESS-AUDIT.md`: bảng đối chiếu yêu cầu đã ghi nhận và các giới hạn còn lại của prompt.
- `MASTER-PROMPT-AUTO-HANDOFF.md` ở thư mục cha: prompt chuẩn dùng để khởi động và tiếp tục công việc.
- `history/`: ảnh/báo cáo theo từng mốc, giữ lịch sử không ghi đè.

## Lưu ý về ảnh
Các file `latest-*.png` chỉ được coi là ảnh chụp thực tế sau khi được tạo bởi Playwright từ ứng dụng đang chạy và lưu thành công. Nếu chưa có ảnh, không tạo placeholder PNG và không đánh dấu hoàn thành.


## Handoff bổ sung — bộ icon website tĩnh Liquid Glass (2026-10-22)
- BẮT BUỘC đọc `../../../docs/icon-system-inventory.md` trước khi tiếp tục bất kỳ công việc icon nào trên website tĩnh.
- Tài liệu kiểm kê: [docs/icon-system-inventory.md](../../../docs/icon-system-inventory.md); nhánh `fix/liquid-glass-audit-2026-10-19`; commit tạo tài liệu `0d6119e1adbc815771a7eede3b22a40fb1ff8b5f`.
- Quy chuẩn đã được người dùng chốt: Liquid Glass trong suốt, viền sáng, khúc xạ nhẹ; nét mảnh; khi nhấn lún kính + đổi màu; KHÔNG ripple.
- Màu nền/ink/accent mục tiêu: `#eaf3fb`, `#142a3c`, `#5c91b9`.
- Phạm vi cho công việc icon website tĩnh: chỉ nhánh `fix/liquid-glass-audit-2026-10-19`; không merge main, không deploy Production, không sửa backend/API/schema/bindings/secret/dữ liệu.
- Trạng thái: đã tạo tài liệu kiểm kê ban đầu từ `public/index.html`; CHƯA triển khai icon vào giao diện; CHƯA có kiểm thử/ảnh trước-sau. Không ghi PASS cho các mục này.
- Trước triển khai: xác minh lại HEAD và nội dung source hiện tại, kiểm kê cả các control sinh động khi chạy, sau đó thực hiện từng nhóm icon và chạy kiểm thử/ảnh cùng SHA.


## Bổ sung bàn giao — icon động và hiệu ứng fly-to-cart (2026-10-22)

Nguồn chỉ dẫn chính đã được cập nhật trong [MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md), mục XXII. Đọc mục đó trước khi triển khai.

- Đặc tả inventory: [docs/icon-system-inventory.md](../../../docs/icon-system-inventory.md).
- **Ảnh tham chiếu phải đọc trực tiếp:** [Icon.png](../../../docs/icon-assets/Icon.png) (chuẩn hình dáng icon gốc) và [Chitiet.png](../../../docs/icon-assets/Chitiet.png) (trạng thái/hiệu ứng chi tiết). Mở ảnh thực tế trước khi code; không dùng ảnh thứ hai để vẽ lại icon gốc.
- Palette: nền `#eaf3fb`, icon/chữ `#142a3c`, accent `#5c91b9`, tim yêu thích bật `#E5484D`. Baseline kính sáng: surface `rgba(255,255,255,0.42)`, viền `1px solid rgba(255,255,255,0.72)`, blur `16px saturate(145%)`, shadow `0 8px 24px rgba(20,42,60,0.10)`, highlight `inset 0 1px 0 rgba(255,255,255,0.80)`. Nhấn: scale `0.97`, inset shadow `inset 0 2px 8px rgba(20,42,60,0.14)`, transition `140ms cubic-bezier(0.2,0.7,0.2,1)`. Đây là baseline kỹ thuật đề xuất; phải kiểm tra trên Preview và không tuyên bố đã triển khai trước khi test.
- Phạm vi: chỉ website tĩnh trên `fix/liquid-glass-audit-2026-10-19`; không merge PR/main, không deploy Production, không sửa backend/API/database/schema/secrets/bindings/dữ liệu.
- Yêu cầu quan trọng: heart đỏ khi thích; cart badge/toast phản ánh thao tác thật; mọi điểm add hàng dùng chung fly-to-cart đến icon header; clone phải dùng đúng ảnh đang hiển thị, đúng sản phẩm và variant; không di chuyển trang gốc hoặc add trùng.
- Quy trình bắt buộc: xác minh HEAD/Preview/baseline → audit source/runtime + test hiện hữu → chia lát thay đổi nhỏ → Playwright/ảnh Preview mỗi lát → cập nhật bằng chứng/handoff.
- Trạng thái: đặc tả và quy trình đã được ghi; chưa xác nhận tính năng được triển khai hay test PASS. Không suy diễn từ việc cập nhật tài liệu.


## Storefront icon state checkpoint — 2026-10-22 (separate from Admin acceptance)

- Current storefront source SHA: `a603c3c8f4c36efb98d604c84c24ae02d217fefa`; PR #108 remains open/unmerged.
- Source validation [39681751497 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751497); Preview deployment [39681751269 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751269); live audit [39681751457 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457); artifact [12385195509](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457/artifacts/12385195509).
- Exact deployment verified: Preview alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`, deployment `6d641e52-8e30-4e5a-8c29-05e1d974cce7`, environment `preview`, exact branch and commit.
- Live audit passed: 100 screenshots, 8/8 viewport-theme pairs, 12 route checks, complete sections/commerce/detail, first-paint 20/20 and 4/4 videos, zero hard failures or browser/network/image/read-only errors.
- Four live heart state contexts PASS: mobile 390×844 and desktop 1440×900 in Light/Dark. Press state uses scale 0.97, correct tinted glass/inset depth, selected heart and SVG path red `#E5484D`, local storage + `aria-pressed` agree, and unselect restores the correct theme outline. All ripple code removed.
- Remaining storefront feature work: successful add-to-cart toast while detail overlay is open; single shared exact-image fly-to-cart plus correct badge/cart bounce, rapid click, no layout shift, image-failure, viewport and reduced-motion acceptance.
- This is storefront Preview evidence only. Do not modify Admin, Production/main, backend/API, product data, database, bindings/secrets, DNS or access policy; no archive manifest changed.

Next step: continue storefront feature slice 3 (real add result/toast/badge) on the current storefront branch. Admin stays outside the code scope.


## CURRENT PROGRESS / HANDOFF OVERRIDE — 2026-10-22 10:56 ICT

- **Estimated overall completion: 82%** (estimate only, not a test result). Public storefront visual audit ~90%; favorite/icon state partially verified in earlier recorded evidence; successful add-to-cart toast/badge and shared fly-to-cart remain pending; final exact-SHA reconciliation remains pending.
- Branch HEAD observed before this documentation update: `5873920b9ef24df843bff8173ad99ae529990252`; PR #108 stays OPEN/unmerged. Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/.
- Existing handoff documents icon-state checkpoint SHA `a603c3c8f4c36efb98d604c84c24ae02d217fefa`, Validate [39681751497](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751497), Deploy [39681751269](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751269), Live audit [39681751457](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457), artifact [12385195509](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39681751457/artifacts/12385195509). Existing record says 100 screenshots, 8/8 viewport-theme pairs, first-paint 20/20, video 4/4, no hard failures and heart states 4/4. Reconcile against actual HEAD before claiming current-SHA acceptance.
- Reference PNGs `docs/icon-assets/Icon.png` and `docs/icon-assets/Chitiet.png` exist according to GitHub metadata, but actual visual inspection is **NOT VERIFIED**: binary blob read failed UTF-8 decoding. Render/open both images before claiming review or implementing pixel-specific icon shape. Read `docs/icon-assets/README.md`, `docs/icon-system-inventory.md`, `docs/admin-ui-reference/handoff/START-HERE.md`, `docs/admin-ui-reference/handoff/LATEST-STATUS.md`, and master prompt §XXII in documented order.
- Preserve design baseline: surface `#eaf3fb`, icon/text `#142a3c`, accent `#5c91b9`, active favorite `#E5484D`; no ripple; press feedback inset/tint around scale 0.97 and ~140ms; adapt dark mode and respect `prefers-reduced-motion`.
- Next: reconcile HEAD/workflows/deployment SHA; verify successful-add outcome, toast and real badge; then implement one shared 0.6–0.9s fly-to-cart using the exact displayed/selected image and correct item/variant. Bounce only on successful add; no duplicate quantity or layout shift. Test failed/rapid add, image error, scroll/resize, responsive/sticky target, reduced-motion; inspect actual Preview screenshots.
- Do not count commit `8afab8bfcebed3ec045b544e277e8e81acba70c3` as accepted: exact-SHA completed validation/deploy/live artifact was not verified in this session. Reconcile it with the later documented heart-state checkpoint rather than overwriting newer work.
- Hero `/images/hero-sd-gl052.png` is approved; do not return to catalog search. No Admin code, merge, Production/main, backend/API/schema/database/product data/image mapping/D1/R2/bindings/secrets/DNS/Access changes. Continue automatically; do not rerun unrelated PASS tests.
