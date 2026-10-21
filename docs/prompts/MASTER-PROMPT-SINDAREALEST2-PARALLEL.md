# MASTER PROMPT

## Cập nhật bắt buộc — bàn giao phiên 2026-10-21 (ưu tiên hơn các mốc cũ)

- Nhánh web tĩnh: `fix/liquid-glass-audit-2026-10-19`; HEAD đã xác minh tại thời điểm bàn giao: `170304495869886a344b6fa02bdbaf6148d75100` — commit `improve readability of glass commerce drawers`.
- Preview alias đã được Cloudflare Pages API xác minh đúng nhánh và SHA: `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`; deployment ID `d416f4c3-5be3-4717-8539-ee425582b1da`, environment `preview`, stage/status success. Không dùng Production.
- Source/tests PASS: [run 39486732685](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732685). Admin Preview Playwright PASS: [run 39486732956](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732956). Storefront Preview deploy PASS: [run 39486732736](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732736).
- Visual workflow [run 39486732727](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732727), [artifact 12292874474](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39486732727/artifacts/12292874474): capture thật đã hoàn tất, 78 screenshots, 8/8 viewport-theme pairs, 12/12 product detail direct-open/reload/navigation checks PASS; 0 console errors, 0 page errors, 0 same-origin HTTP errors, 0 failed requests, 0 broken image contexts, 0 read-only violations, không tràn ngang ở 8 viewport-theme checks. Tuy nhiên JSON audit `passed=false` do **SKU SD-GL052 không có trong public verified product payload**. Hero fail-closed đúng cách và không hiển thị ảnh thay thế. Không tự thêm ảnh, sửa D1 hoặc đánh dấu SKU public nếu chưa có xác minh.
- Ảnh live cho thấy logo/header mobile đã gần đúng bố cục mẫu hơn; nền vẫn có các dải cong lớn, vì vậy cần tiếp tục đối chiếu trực quan và chỉnh nền satin có kiểm tra hồi quy. Đã tăng độ đục bề mặt drawer cart/account/checkout để chữ trang phía sau không xuyên qua quá nhiều; cần xác minh bằng screenshot state mới. Không tuyên bố giao diện đã giống 100% chỉ vì CI xanh.
- Việc tiếp theo: (1) mở artifact 12292874474, xem các ảnh mới và so với PNG tham chiếu gốc; (2) xử lý texture nền trên Light/Dark, mobile/desktop, tăng chất satin nếp mảnh thay vì vòng cong lớn; (3) kiểm tra drawer cart/checkout/account sau sửa; (4) cập nhật cache-busting URL và assertion đúng phiên bản nếu asset đổi; (5) chạy lại source tests, Preview deploy, Playwright và live capture; (6) ghi audit JSON thực tế, không chỉ kết luận workflow xanh.
- Không merge PR #108; không chạm `main`, Production, D1/R2 production, bindings, secrets, DNS hoặc Access policy. Không dùng mock thay live acceptance. Không hỏi lại người dùng điều mà GitHub/Actions có thể tự kiểm tra. Báo cáo tiến độ rồi tiếp tục tự động; chỉ dừng khi cần quyền/thao tác người dùng hoặc cần họ xác minh dữ liệu SKU thật.
 TỔNG HỢP — SINDAREALEST2 WEB TĨNH + ADMIN, LÀM SONG SONG VÀ BÀN GIAO KHÔNG MẤT Ý

**Repository:** `chichute5500/Sindarealest-admin`  
**Nhánh web tĩnh đang làm:** `fix/liquid-glass-audit-2026-10-19`  
**Nhánh admin:** `feature/*` — phải xác minh tên nhánh và SHA thật trên GitHub trước khi làm.  
**Production:** tuyệt đối không sửa, merge hoặc deploy trong nhiệm vụ này.

## 1. Tài liệu nguồn bắt buộc — không được làm mất prompt gốc

Đây là file điều phối tổng hợp. Nó giữ nguyên nguồn prompt gốc bằng cách dẫn chiếu các tài liệu chuẩn hiện có, đồng thời bổ sung quy tắc làm việc song song và lưu yêu cầu mới vào cùng một nơi.

- **Prompt gốc/chuẩn về kiểm toán, thiết kế lại Admin và handoff Playwright:** [`docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md`](../admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md). Phải đọc toàn bộ, giữ các yêu cầu kiểm thử, bằng chứng, an toàn, lưu ảnh và bàn giao trong đó, trừ các điểm được điều chỉnh rõ ràng ở mục 2 bên dưới.
- **Biên bản phối hợp hai nhánh:** [`docs/handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md`](../handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md).
- **Prompt tiếp tục ở chat mới:** [`docs/prompts/NEXT-CHAT-PROMPT.md`](NEXT-CHAT-PROMPT.md).

Không dựa vào trí nhớ chat thay cho tài liệu. Khi yêu cầu mới xuất hiện, phải ghi vào file này và cập nhật file next-chat cùng một lần làm việc.

## 2. Quy tắc ưu tiên và làm rõ các yêu cầu cũ

Một số câu trong prompt Admin gốc giới hạn công việc vào Admin và nói không thay giao diện customer-facing. Quy tắc đó vẫn áp dụng khi đang làm **nhiệm vụ Admin**; nó không cấm nhiệm vụ web tĩnh riêng đã được người dùng giao và phê duyệt. Hai luồng sau đây cùng tồn tại:

1. **Web tĩnh/storefront:** tiếp tục trên `fix/liquid-glass-audit-2026-10-19`, theo ảnh tham chiếu web tĩnh và yêu cầu gốc của người dùng trong lịch sử/tài liệu dự án.
2. **Web Admin:** tiếp tục trên nhánh `feature/*` đã xác minh, theo ảnh tham chiếu Admin và prompt Admin gốc.

Hai công việc độc lập và được làm song song. Không buộc Admin chờ storefront; không buộc storefront chờ Admin; không sao chép thiết kế hoặc code từ nhánh này sang nhánh kia một cách máy móc. Không merge/cherry-pick giữa hai nhánh khi chưa có chỉ thị riêng.

## 3. Phạm vi giao diện được phép thiết kế lại

Trong phạm vi giao diện được giao, không để code/CSS/font/bố cục cũ cản trở việc đạt ảnh mẫu. Có thể thiết kế lại cấu trúc HTML phục vụ giao diện, bố cục, font chữ, cỡ chữ, khoảng cách, màu sắc, nền, hiệu ứng, responsive, điều hướng, thẻ, bảng, biểu mẫu, modal và trạng thái tương tác. Không chỉ phủ màu hoặc thêm hiệu ứng lên thiết kế cũ nếu kết quả không đạt ảnh tham chiếu.

Admin và storefront không cần giống pixel: storefront ưu tiên trải nghiệm mua hàng; Admin ưu tiên vận hành hiệu quả. Có thể thống nhất ngôn ngữ thương hiệu nhưng không ép dùng chung CSS, theme class, JS, token hoặc layout.

## 4. Những thứ phải bảo vệ

Không tự ý đổi hoặc làm hỏng logo, tên/nhận diện thương hiệu SinDarealest, dữ liệu sản phẩm, SKU, slug, giá, mô tả, ảnh và mapping ảnh, API, auth/phân quyền/session, nghiệp vụ, D1/R2, bindings, secrets, schema, backend, đơn hàng, khách hàng hoặc chức năng lưu dữ liệu. Thay đổi ngoài phạm vi giao diện phải được tách riêng và xin phép. Không đưa secrets/PII vào ảnh, log hoặc commit.

## 5. Quy trình thực hiện bắt buộc

1. Xác minh repo, branch, HEAD SHA, thay đổi hiện có, Preview URL và SHA mà deployment thực sự chạy.
2. Đọc prompt nguồn, tài liệu handoff, ảnh tham chiếu và code hiện tại. Nếu một tài liệu không truy cập được, ghi rõ; không tự đoán nội dung.
3. Chạy baseline và kiểm tra các script/test thực sự tồn tại.
4. Chụp ảnh ứng dụng đang chạy bằng Playwright; so sánh với ảnh tham chiếu ở cùng route, viewport, theme và trạng thái.
5. Liệt kê sai lệch cụ thể, tìm nguyên nhân gốc, sửa trong đúng nhánh và đúng phạm vi.
6. Sau mỗi vòng sửa có ý nghĩa: chạy test liên quan, chụp lại, so sánh, ghi kết quả và lưu bằng chứng lên GitHub nếu công cụ/quyền cho phép.
7. Kiểm tra chức năng và regression; không dùng mock hoặc ảnh tham chiếu thay cho ảnh chụp ứng dụng thật.
8. Cập nhật trạng thái, kết quả test, đường dẫn ảnh và commit SHA. Không báo PASS cho bước bị skip hoặc chưa chạy.
9. Ghi lại các điểm có thể ảnh hưởng nhánh còn lại: font, logo, assets, theme, responsive, global CSS, route/cache, gallery và hành vi tương tác.
10. Báo cáo trung thực những gì PASS, FAIL, BLOCKED, NOT TESTED. Không tuyên bố 100% nếu thiếu bằng chứng hoặc còn sai lệch chưa giải trình.

## 6. Quy tắc GitHub và Production

- Web tĩnh chỉ làm trên nhánh fix đã nêu và được xác minh.
- Admin chỉ làm trên nhánh feature thực tế đã xác minh.
- Không sửa `main`; không merge PR; không cherry-pick/ghi đè giữa nhánh; không deploy Production.
- Chỉ kiểm tra Preview. Không thay đổi cấu hình Production, secrets, database binding hoặc dữ liệu thật.
- Không xóa thay đổi chưa commit của người dùng, không force-push.
- Trước khi ghi file, đọc phiên bản hiện có; sau khi ghi, xác minh lại nội dung và commit trên GitHub.

## 7. Nhật ký phối hợp bắt buộc

Mỗi lần người dùng bổ sung, sửa hoặc thay đổi yêu cầu, hãy thêm mục mới vào phần **Yêu cầu đã bổ sung** ở cuối file này và đồng bộ với `docs/prompts/NEXT-CHAT-PROMPT.md`. Không xóa ý cũ; nếu ý mới thay thế ý cũ, ghi rõ ý nào bị thay thế, ngày và lý do. Không chỉ ghi trong chat.

Khi hai nhánh gần hoàn thành:
- Chốt branch + SHA + Preview URL của từng bên.
- So sánh ảnh theo viewport/theme tương đương.
- Phân loại vấn đề: storefront-only, admin-only, shared design/assets, API/data/backend, hoặc deployment/cache.
- Chạy regression chéo nếu thay đổi có thể ảnh hưởng cả hai.
- Chỉ đề xuất đồng bộ sau khi có bằng chứng; không tự merge hoặc triển khai Production.

## 8. Yêu cầu đã bổ sung

### 2026-10-20 — hai luồng thiết kế độc lập, phát triển song song
- Admin không bị buộc giữ giao diện cũ và không phải chờ web tĩnh.
- Web tĩnh không phải chờ Admin.
- Cả hai được phép tái thiết kế phần giao diện trong phạm vi đã phê duyệt.
- Không merge/cherry-pick/copy thay đổi giữa hai nhánh trước khi có đối chiếu.
- Ghi lại các điểm có thể xung đột và kiểm tra chéo sau khi cả hai có Preview gần hoàn thiện.
- Mỗi khi người dùng thêm ý mới, phải cập nhật file prompt master và file next-chat, không dựa vào lịch sử chat.

## 9. Câu lệnh tiếp tục ngắn gọn

Người dùng có thể nói: **“Tiếp tục theo MASTER PROMPT TỔNG HỢP SinDarealest2. Đọc tài liệu nguồn và handoff, xác minh nhánh/SHA, cập nhật các ý mới vào cả hai file prompt, rồi tiếp tục công việc trên Preview; tuyệt đối không đụng Production.”**

Không chỉ trả lời bằng kế hoạch nếu có thể thực hiện thật.

---

## PHẦN PROMPT GỬI RIÊNG CHO CHAT ĐANG LÀM WEB ADMIN

Sử dụng nguyên phần này khi cần bàn giao trực tiếp cho chat Admin:

# BÀN GIAO BẮT BUỘC — PHỐI HỢP THIẾT KẾ WEB TĨNH VÀ WEB ADMIN SINDAREALEST2

## 1. Vấn đề cần hiểu đúng

Hiện tại có hai công việc thiết kế giao diện đang được thực hiện song song:

- **Web tĩnh:** nhánh `fix/liquid-glass-audit-2026-10-19`.
- **Web admin:** đang làm trên một nhánh `feature/*`. Hãy tự kiểm tra GitHub để xác định chính xác tên nhánh và commit hiện tại, không tự đoán.

Hai công việc **độc lập, triển khai song song, không phụ thuộc nhau và không cần chờ nhau hoàn thành**.

Tôi cho phép thay đổi đáng kể giao diện cũ để đạt đúng hình ảnh tham chiếu. Không được để cấu trúc, CSS, font chữ hoặc cách bố trí của giao diện cũ trở thành rào cản khiến thiết kế mới không đạt yêu cầu.

## 2. Những gì được phép thay đổi

Trong phạm vi giao diện admin, chủ động thiết kế lại những phần cần thiết để phù hợp với ảnh tham chiếu và trải nghiệm quản trị hiện đại, bao gồm:

- Bố cục, cấu trúc các khu vực và cách tổ chức nội dung.
- Font chữ, cỡ chữ, độ đậm, khoảng cách và căn chỉnh.
- Màu sắc, nền, đường viền, bóng, hiệu ứng và trạng thái tương tác.
- Sidebar, thanh điều hướng, dashboard, thẻ thống kê, bảng dữ liệu, biểu mẫu, hộp thoại và các thành phần giao diện.
- Responsive trên điện thoại và máy tính.
- CSS và cấu trúc HTML phục vụ giao diện, khi cần thiết.

Không được chỉ sửa vài màu sắc hoặc thêm hiệu ứng lên giao diện cũ nếu cách đó không đáp ứng ảnh tham chiếu.

## 3. Những gì phải bảo vệ

Không tự ý thay đổi hoặc làm hỏng:

- Logo, tên thương hiệu SinDarealest và nhận diện thương hiệu cốt lõi.
- Dữ liệu sản phẩm, SKU, slug, giá, mô tả, ảnh và liên kết ảnh hiện có.
- API, đăng nhập, phân quyền, phiên làm việc và các chức năng nghiệp vụ.
- D1, R2, bindings, secrets, cấu hình môi trường và dữ liệu thật.
- Các chức năng quản lý sản phẩm, đơn hàng, khách hàng và những chức năng admin hiện có.

Được thay đổi cách hiển thị, nhưng phải bảo đảm chức năng vẫn hoạt động. Không được viết lại toàn bộ kiến trúc chỉ để làm giao diện nếu chưa có sự cho phép riêng.

## 4. Quy tắc làm việc song song

- Tiếp tục công việc admin trên đúng nhánh admin hiện tại.
- Không chờ web tĩnh hoàn thành mới thiết kế admin.
- Không tự ý merge, cherry-pick hoặc ghi đè mã giữa hai nhánh.
- Không sửa nhánh `main`, không thay đổi Production, không deploy Production.
- Không giả định rằng hai nhánh đã có cùng mã nguồn hoặc cùng cấu hình Preview.
- Khi gặp thành phần có thể liên quan cả hai bên — ví dụ logo, font, theme, nền, CSS dùng chung, ảnh, responsive hoặc quy tắc giao diện — hãy ghi rõ quyết định và rủi ro tiềm ẩn để đối chiếu sau. Không vì khả năng xung đột mà dừng thiết kế.

## 5. Tài liệu đối chiếu giữa hai nhánh

Tài liệu bàn giao:
https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/handoff/STOREFRONT-ADMIN-CROSSCHECK-2026-10-20.md

Hãy đọc tài liệu này nếu truy cập được. Lưu ý tài liệu có thể chưa tồn tại trên nhánh admin. Nếu không truy cập được, hãy ghi nhận rõ và tiếp tục dựa trên yêu cầu trong prompt này; không được dừng toàn bộ công việc.

## 6. Cách thực hiện

1. Xác minh nhánh admin, commit hiện tại và trạng thái GitHub.
2. Đọc ảnh tham chiếu, yêu cầu giao diện và mã admin hiện tại.
3. Chỉ ra những rào cản của giao diện cũ đang khiến thiết kế không đạt ảnh mẫu.
4. Chủ động sửa giao diện trong phạm vi được phép.
5. Chạy kiểm tra mã và Playwright qua GitHub Actions; chỉ dùng Preview.
6. Chụp ảnh giao diện Preview ở các kích thước điện thoại và máy tính, chế độ sáng/tối nếu có.
7. Đối chiếu ảnh thực tế với ảnh tham chiếu; tiếp tục sửa các sai lệch cụ thể.
8. Kiểm tra lại chức năng admin sau khi sửa giao diện.
9. Ghi lại các thay đổi có thể ảnh hưởng đến việc đối chiếu với web tĩnh, kèm file, lý do và trạng thái kiểm tra.

## 7. Điều kiện báo hoàn thành

Không được báo hoàn thành 100% chỉ vì code đã sửa hoặc CI đã chạy thành công.

Phải phân biệt rõ:
- Kiểm tra mã và CI.
- Kiểm tra chức năng.
- Kiểm tra giao diện thực tế trên Preview.
- Đối chiếu trực quan với ảnh tham chiếu.
- Những mục chưa thể xác minh.

**Yêu cầu cuối cùng:** Hãy xác nhận bạn hiểu rằng hai nhánh được phát triển độc lập song song, không bị giao diện cũ trói buộc trong phạm vi được cho phép, và phải ghi lại các điểm cần đối chiếu sau này. Sau đó tiếp tục công việc admin hiện có, không chỉ trả lời bằng kế hoạch và không chờ tôi nhắc lại các nguyên tắc trên.

## Ghi chú về prompt gốc

Prompt gốc đầy đủ về kiểm toán Admin, thiết kế lại, Playwright, ảnh và handoff vẫn được lưu nguyên bản tại:
`docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md`.
Không thay thế hay xóa file nguồn đó; file master tổng hợp này kết nối prompt nguồn với các quy tắc phối hợp mới.


## Latest execution note — 2026-10-21 11:06 ICT
- Current storefront work is limited to branch `fix/liquid-glass-audit-2026-10-19`; never merge PR #108, change `main`, deploy Production, or mutate Production data/config.
- Latest completed live capture before the newest satin edit was Actions run #453: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39489628054 (artifact 12296050211). Tests/checks/deployment metadata and capture passed; overall product audit still fails closed for missing verified public SKU SD-GL052.
- Actual artifact images were opened. Mobile account/cart/checkout drawers cover the bottom navigation; do not claim overlap absent new evidence. Checkout content is readable. Cart has a large empty middle area. Dark mobile satin still shows sweeping curves that differ from the reference.
- Four satin SVGs have just been softened (narrower fold strokes/highlights); cache key is now `20261021-3` in `public/index.html` and `tests/storefront-reference-parity.test.mjs`. These newest changes are not yet visually verified. Wait for the latest Actions run, open its live screenshot artifact, compare with original reference PNGs, and continue fixing confirmed differences.
- Update handoff and test results after each verified iteration. Never claim 100% while live audit fails or visual comparison remains incomplete. Do not replace SD-GL052 with another product or fabricate catalog data.


## 2026-10-21 — Preview target correction
- Live capture run #454 passed `npm test`, `npm run check`, local fixture audit, and deployment metadata diagnostics but stalled during the push-triggered live probe at step 14. Inspection found the workflow was probing the generic alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/` rather than the exact branch Preview documented for this work.
- Corrected all seven Preview URL references in `.github/workflows/liquid-glass-visual-preview.yml` to the known branch Preview `https://3ed49bcc.sindarealest2.pages.dev/` (commit `1d47c0b58e2e0f2ec51eeab127004f8671b4e010`). This only changes the non-production Preview target; it does not touch Production, `main`, or data/config.
- Next: verify the new Actions run against this exact URL, confirm its deployment metadata, inspect the new live screenshots and pixel diff, and continue visual fixes. Do not count the most recent SVG refinements as visually validated until this run completes.


## 2026-10-21 — Correct Preview alias after Cloudflare API verification
- Run #466 passed `npm test`, `npm run check`, local fixture screenshot audit, and Cloudflare deployment metadata query. Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542829610/artifacts/12320605588.
- Correction to the previous handoff note: `https://3ed49bcc.sindarealest2.pages.dev/` is an older deployment and is not present in current Cloudflare Pages deployment metadata. Screenshots from it do not validate the latest source; they show the old crocodile-scale backdrop. The live audit also reports no captured cart-with-item/checkout/gallery states and product cards still open `/san-pham/...` rather than the required `/sanpham/{category-slug}/{product-key}` route.
- Cloudflare API identifies the current branch deployment as commit `b5df036d5b79df705581d1a085d26bc79b708647`, deployment URL `https://6113550b.sindarealest2.pages.dev`, with stable branch alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Workflow now targets that stable alias in commit `51511e10101efdecc214e3ec7a6f174f074783fa`.
- Next: verify a new Actions run against the stable alias and ensure deployment SHA matches its captured source before comparing satin changes. Then fix confirmed route and commerce-state coverage/behavior. No Production/main changes, no PR #108 merge, no catalog fabrication; SD-GL052 remains fail-closed.


## 2026-10-21 — Current visual findings and hero fallback
- Run #467 passed source tests/checks and captured 78 live screenshots. Route/direct-open/reload checks use `/sanpham/{category}/{product-key}` and passed; gallery (2), cart-with-item (2), and checkout form (2) states were captured. Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39543227718/artifacts/12320382705.
- Its screenshots show the new satin SVGs instead of the legacy crocodile-scale background, but the creases are too faint/oversized versus the reference. Exact deployment metadata did not match the run's source SHA because newer handoff-only commits were deploying while it ran; do not treat it as final SHA-verified evidence. Run #469 is a fresh stable-alias capture; a later run will verify the latest UI commit.
- Exact public SKU `SD-GL052` is still missing. The hero therefore intentionally hides the product image rather than substituting another SKU. Visual comparison revealed the resulting hero section retained a large empty bordered frame. Added CSS in `public/index.html` to collapse that empty frame and reduce its height on desktop/mobile without inventing product data; added a regression assertion in `tests/storefront-operations.test.mjs`.
- Next: wait for the latest Actions run to pass the new hero fallback assertion; use only a Preview capture whose deployment commit SHA matches the captured source. Then compare 360/390/768/1440 in Light/Dark and continue satin/hero refinements. Keep SD-GL052 fail-closed; no Production/main changes, no PR #108 merge, no catalog edits.

## 2026-10-21 — Progress update: verified live Preview, broader UI fixes, next audit pass
- **Overall estimated completion: 62%**. This is a work estimate, not a claim of visual sign-off. Main responsive/theme foundations, product route checks, and major commerce-state capture are working; full reference-by-reference visual parity and remaining interaction checks are not complete.
- Latest source/UI commit verified by Cloudflare Pages API: `757cb5d15fad960f13091164b375dc7cd511a623` (`soften broad satin ribbons and restore fine silk highlights`). Branch: `fix/liquid-glass-audit-2026-10-19`. The stable Preview alias is `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`; deployment ID `c0c858af-5ff3-4f6e-a5f7-039152a35c58`, exact branch and commit match PASS. Production and `main` were not touched.
- Latest evidence artifact (run #498): https://github.com/chichute5500/Sindarealest-admin/actions/runs/39549498958/artifacts/12322754921. It captured the live Preview after verifying the exact source SHA. The artifact contains live viewport/section/state captures and an audit JSON. Source checks, `npm test`, `npm run check`, deployment checks and the visual-preview workflow completed successfully.
- Live audit: all 8 required viewport/theme combinations (360×800, 390×844, 768×1024, 1440×900 × Light/Dark) returned HTTP 200 with no horizontal document overflow. Product card navigation, direct-open and reload of the real route `/sanpham/sneaker/sneakers-26-41-a` passed across mobile/desktop and Light/Dark. Account, fullscreen gallery, cart-with-item and checkout-form states were captured in Light and Dark; checkout was opened without submitting an order.
- **Audit is not fully PASS yet:** its only reported hard failure is that `SD-GL052` is absent from the verified public product payload. Do not fabricate that SKU, substitute another product image, or change product data. Per current priority, do not let this one dependency block other UI work; return to the hero/product-image comparison after other sections are audited.
- UI changes since the previous handoff: refined all four satin SVGs (desktop/mobile, Light/Dark) to reduce broad ribbon scale and bring back fine silk highlights; improved mobile bottom-navigation contrast and hid it during immersive fullscreen gallery; raised gallery thumbnail placement to avoid the footer; retained theme-specific contrast-safe gallery controls; updated regression tests to reflect the new satin asset structure and contrast overrides.
- **Next actions — continue without waiting for user input:** (1) inspect run #498 live screenshots against the two original reference images at section level, prioritizing the “Phong cách đẳng cấp từ da cá sấu” section, six Liquid Glass tiles, order-assurance comparison, product grid, product detail/gallery, cart, account, checkout, Zalo CTA and footer; (2) fix only visually confirmed layout/contrast/spacing/state defects outside the missing-SKU dependency; (3) run tests and Preview deployment after each coherent fix; (4) capture a new SHA-verified live screenshot set and compare again; (5) revisit the hero once the other sections have been addressed. Preserve the original logo, brand identity, and real product identity/data/image relationships. Do not work on Admin UI, merge PR #108, modify `main`, or touch Production, D1/R2 data/config.

## 2026-10-21 — Latest validated UI fix: mobile account panel
- Updated overall estimated completion to **63%**; this remains an estimate, not a visual sign-off.
- Commit `151e22f1c920fdb798b65ea8a5bb0f6ed7a6ea3a` fixes a confirmed mobile account-drawer issue found in run #498: the account panel was forced to occupy nearly the full screen and left a large blank area. It now fits its content while respecting a safe maximum height. Added a regression assertion in `tests/storefront-reference-parity.test.mjs`.
- Run #500 passed source tests/checks and captured 84 live Preview screenshots. Artifact: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39550753725/artifacts/12324121132. Cloudflare deployment metadata confirms the captured branch and source SHA match exactly (deployment `b6a52c8b-a88d-482a-a550-92ab195d2438`). The updated account panel was visually inspected in Light mode and the oversized blank area is reduced.
- Live audit still has one hard failure only: `SD-GL052` is absent from verified public product data. Other audited route checks, 8 viewport/theme checks, and account/gallery/cart/checkout capture states passed. Keep the SKU fail-closed and continue other sections before revisiting the hero.
- Continue next with the remaining non-hero visual comparisons and fixes: six Liquid Glass tiles, order-assurance area, featured/product cards, product detail/gallery controls, cart and checkout spacing/readability, Zalo CTA, footer, and the full-page section flow. Each coherent fix must pass tests and be checked against a new exact-SHA Preview capture. Do not change the official logo, brand identity, real product identity/data/image relationships; do not work on Admin UI, merge PR #108, modify `main`, or touch Production/D1/R2 config/data.


---

## BỔ SUNG VÀO PHẠM VI CÔNG VIỆC DÀI HẠN — ĐỒNG BỘ WEB TĨNH / ADMIN, KHÔNG NGẮT VIỆC ĐANG LÀM

Đây là một phần chính thức của công việc SinDarealest, không phải lệnh đổi ưu tiên tức thời.

### Quy tắc ưu tiên và tiếp tục công việc
- Tiếp tục hoàn thành các hạng mục hiện tại của Web tĩnh theo thứ tự ưu tiên và checkpoint đã ghi trong file bàn giao mới nhất. Không bỏ dở, không tự chuyển toàn bộ phiên sang QR/Admin integration chỉ vì phụ lục này được thêm.
- Chỉ xử lý phần tích hợp QR/phân loại trong lượt hiện tại nếu nó độc lập, cần thiết cho công việc đang làm và không làm trễ hoặc phá vỡ mục tiêu hiện tại. Nếu sẽ đổi phạm vi hoặc gây gián đoạn, ghi nhận dependency/việc cần làm tiếp theo vào handoff rồi tiếp tục nhiệm vụ hiện tại.
- Sau khi đạt checkpoint công việc hiện tại hoặc khi có khoảng làm việc an toàn, tiến hành phần thuộc Web tĩnh của hợp đồng tích hợp chung. Không chờ người dùng nhắc lại, nhưng cũng không được ưu tiên việc mới cao hơn các blocker/hạng mục hiện tại một cách tự ý.
- Luôn đọc bản mới nhất của `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` và xác minh API/schema ở HEAD hiện hành trước khi tích hợp; tài liệu không phải bằng chứng API đã tồn tại.

### Phạm vi Web tĩnh
- Hiển thị `fulfillment_type` theo dữ liệu API: `in_stock`, `made_to_order`, `unclassified`; không suy luận loại hàng từ `stock`, không tự phân loại dữ liệu cũ.
- QR chuyển khoản không nhúng/điền sẵn số tiền. Chỉ hiển thị số tiền bên ngoài QR sau khi giá và điều kiện/đợt thanh toán được xác nhận; khách tự nhập số tiền trong ứng dụng ngân hàng.
- Không tự tạo API giả, không tự đánh dấu đơn `paid`, không coi việc mở/quét QR hoặc gửi biên lai là bằng chứng tiền đã nhận.
- Dùng API/backend có thẩm quyền theo hợp đồng. Nếu API còn thiếu, ghi BLOCKED/contract dependency với endpoint, trường dữ liệu và response còn thiếu; tiếp tục các hạng mục giao diện độc lập khác.
- Không sửa code Admin hoặc nhánh Admin. Không merge/cherry-pick/sync hai nhánh để giải quyết khác biệt.

### Bàn giao và kiểm chứng
- Cập nhật handoff hiện hành: trạng thái tích hợp (NOT STARTED / IN PROGRESS / BLOCKED / VERIFIED), dependency API, file/commit SHA, test đã chạy và kết quả thực tế.
- Chỉ báo VERIFIED khi đã kiểm tra trên đúng SHA và có test/bằng chứng. Tài liệu chung hoặc giao diện tĩnh đơn thuần không chứng minh backend đã đồng bộ.
- Giữ nguyên hàng rào hiện có: không merge PR #108/#111, không sửa main, không deploy Production, không thao tác dữ liệu/config D1/R2/secret thật.


### Asset QR ngân hàng đã có sẵn — cách tích hợp bắt buộc
- Chủ dự án đã có ảnh QR nhận tiền tài khoản ngân hàng. Không yêu cầu chủ dự án commit ảnh vào source, gửi lại ảnh trong chat hoặc tự chèn ảnh vào nhánh Web tĩnh để bắt đầu.
- Trong phạm vi Web tĩnh, chỉ tích hợp phần hiển thị ảnh QR đang active cùng thông tin nhận tiền từ public-safe API đã thống nhất với Admin. Không hardcode URL/file path, không tạo QR giả/placeholder và không dùng dữ liệu giả.
- Hiển thị số tiền cần chuyển riêng ngoài QR, chỉ khi giá và đợt thanh toán đã được xác nhận; khách tự nhập số tiền trong app ngân hàng.
- Nếu API upload/cấu hình QR chưa sẵn sàng, ghi dependency cụ thể vào handoff và tiếp tục công việc Web tĩnh độc lập; không chuyển ưu tiên hoặc dừng các hạng mục đang làm.
- Không tuyên bố QR đã tích hợp hoàn chỉnh cho đến khi kiểm thử trên Preview đúng SHA, xác minh API trả ảnh active và có trạng thái fallback khi chưa cấu hình.


## 2026-10-21 — Storefront QR / fulfillment integration checkpoint

- Scope: public storefront only, PR #108 branch `fix/liquid-glass-audit-2026-10-19`. Do not edit the isolated Admin branch, merge PR #108/#111, change `main`, deploy Production, or run migrations against Production D1.
- Shared contract: `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` (latest contract includes the fixed receiving-QR image workflow and storefront payload contract).
- Implemented in storefront source:
  - Public product mapper emits `fulfillmentType` only for the explicit enum `in_stock`, `made_to_order`, `unclassified`; unknown/missing values become `unclassified`. It never derives type from `stock`.
  - Catalog has fulfillment filters and product-card/detail badges for **Hàng có sẵn**, **Hàng đặt riêng**, and **Cần xác nhận**.
  - Checkout QR panel fails closed unless the server response is `status: confirmed`, `priceConfirmationRequired: false`, and `paymentInstructions.status: ready` with a trusted HTTPS/same-origin image URL, `qrIncludesAmount: false`, complete receiver/reference fields, and a positive safe integer VND amount. The amount is shown outside the QR. QR load errors replace the panel with a do-not-transfer fallback.
  - It never sets `payment_status`, never claims QR scan/receipt equals payment, and currently shows **Chờ cửa hàng xác nhận** because `POST /api/orders` still returns `pending_confirmation` and there is no public order-status/QR configuration endpoint on the current contract.
- Verification: commit `9621d2dd3787c56d92e8d68dd3f8aee3c03c344c` fixes malformed newline escapes in `tests/storefront-payment-product-type-contract.test.mjs`. GitHub Actions source validation/tests PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39556470011. Admin Preview smoke workflow PASS (read-only only): https://github.com/chichute5500/Sindarealest-admin/actions/runs/39556470010. Preview deployment workflow PASS and reports alias `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev`: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39556469995. The isolated visual screenshot/audit was still running at the time this note was prepared; do not claim its result until checked.
- Status: storefront presentation/filter work is implemented and source-test verified; actual live QR display is **BLOCKED by backend/Admin contract dependency**, not by the frontend. The current backend order-create endpoint cannot return a confirmed payment instruction; do not fabricate a QR or amount. The existing product rows have no trusted fulfillment classification until backend/Admin adds and an authorized person sets the field. Existing rows correctly remain **Cần xác nhận**.
- Next: check the visual audit workflow/artifact; run a live Preview capture with exact SHA/deployment evidence after the final source commit; exercise the checkout pending state and invalid/broken QR fallback; add runtime behavioral tests for valid/invalid payment payloads if feasible; then update screenshot manifest and this handoff with exact evidence. Continue unrelated storefront visual work while backend work proceeds on the other branch.


## 2026-10-21 — Verified storefront payment/fulfillment and responsive audit

- **Current code/evidence SHA:** `f46ce67f33f28c1b6a95bee57efa02533656711e` (this note records that validated source checkpoint; if a newer commit exists, re-check workflows against that SHA before claiming current PASS).
- **Storefront implementation:** `functions/_lib.js` maps only explicit `fulfillment_type` enum values and defaults unknown/missing to `unclassified`; `public/index.html` displays category/fulfillment metadata together on compact product cards, adds category/fulfillment filters and detail badge, and uses a fail-closed QR payment panel in checkout.
- **QR behavior:** order-create currently returns `pending_confirmation`; no public order-status lookup or active receiver-QR config is available in the storefront API. Checkout therefore says **Chờ cửa hàng xác nhận**, warns **Vui lòng chưa chuyển tiền**, and shows no QR or amount. A QR can be rendered only from a complete server-confirmed `paymentInstructions` payload, with `qrIncludesAmount:false`; the amount is outside the QR. A broken image switches to a do-not-transfer fallback. No frontend payment status is written.
- **Regression fix:** a live-source audit showed mobile product-card info height 155px. Moving the category and fulfillment badge onto a shared metadata row reduced it to 133px; a follow-up tightened the mobile padding and card-bottom/title spacing to target the audit ceiling of 130px. The follow-up audit result below confirms whether this target passed.
- **Source validation:** [run 39557478661](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478661) PASS on SHA `f46ce67f33f28c1b6a95bee57efa02533656711e`; the payment/product-type contract test passed. [Preview deploy run 39557478645](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478645) PASS, deployment ID `f4862be3-0d07-4b0b-a996-a90aa508c409`, exact branch and SHA verified. [Read-only smoke run 39557478636](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478636) PASS.
- **Local fixture audit:** PASS, 54 screenshots, 235 fixture products, 20 responsive cases, 95 interaction checks, overflow=0, console/page/HTTP errors=0, hardFailures=0. Artifact [run 39557478593 / 12327010238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478593/artifacts/12327010238).
- **Live Preview audit:** captured 84 real Preview screenshots; 8/8 viewport-theme pairs; 12 route checks; 60 section target checks; 4 product-detail contexts; overflow=0, console/page/HTTP/failed requests/broken-image/read-only violations=0. Artifact: [run 39557478593 / 12327010238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478593/artifacts/12327010238). Deployment verification is `VERIFIED_PREVIEW_DEPLOYMENT` and confirms exact branch + SHA. Audit still reports exactly one hard failure: `SD-GL052` is absent from verified public product payload. Do not replace it or fabricate product data. Live audit also leaves `commerceStatesComplete=false` because it is a read-only capture; it does not submit a real order.
- **Status:** storefront payment/fulfillment presentation is implemented and source-test verified; actual active QR/payment flow is **BLOCKED by backend/Admin API dependency**. Existing catalog rows remain unclassified until authorized backend/Admin data is added. UI redesign is not complete; continue comparing reference screenshots and fix confirmed visual defects.
- **Next:** check fresh workflows on any newer HEAD; verify the pending-order no-QR test in the latest local audit; inspect the new mobile card screenshots; continue satin/hero, six glass tiles, order-assurance, product detail/gallery, cart/account/checkout, Zalo and footer. Do not change Admin code, catalog data, D1/R2, Production, or merge PRs.


## 2026-10-21 — Storefront QR/fulfillment handoff refresh (checkpoint 0153bbf)

- Branch scope: `fix/liquid-glass-audit-2026-10-19`, public storefront / PR #108 only. Re-fetch HEAD before continuing. Do not edit Admin/other branch, merge, deploy Production, run Production migrations, change secrets/bindings/DNS, or modify product records.
- Shared API contract: `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` is authoritative, including the owner-supplied fixed receiving-QR upload/verification/activation workflow. Never assume the other branch has shipped an API/config until verified.
- Fulfillment: only explicit `fulfillmentType` values `in_stock`, `made_to_order`, `unclassified` are accepted; missing/unknown values fail closed to `unclassified`. Never infer type from stock quantity. Cards/details and filters label “Hàng có sẵn”, “Hàng đặt riêng”, “Cần xác nhận”. Existing products remain unclassified until authorized backend/Admin data is supplied.
- Payment: QR display requires a server-confirmed order, `priceConfirmationRequired: false`, ready `paymentInstructions`, safe same-origin/HTTPS QR URL, `qrIncludesAmount: false`, receiver/reference details, and a positive safe-integer VND amount. Amount is displayed outside QR. Browser must never write payment status or treat QR scan/display, uploaded receipt, or customer claim as proof of receipt.
- Current API limitation: `POST /api/orders` returns `pending_confirmation`; no public order-status lookup/active receiver QR config was verified. Expected checkout is “Chờ cửa hàng xác nhận” / “Vui lòng chưa chuyển tiền”, without QR or amount. Do not create a fake QR or guess receiving details.
- Verified at checkpoint SHA `0153bbfdc4ad66850ac9a9ab0ca3950811330f84`: source validation [run 39558222038](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39558222038) PASS; storefront Preview deployment [run 39558221968](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39558221968) PASS. Visual audit [run 39558222013](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39558222013) was in progress when this entry was prepared; recheck its final result and deployment SHA.
- Previous live audit [run 39557478593 / artifact 12327010238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39557478593) captured 84 Preview screenshots and 8/8 viewport-theme pairs, but hard-failed because SKU `SD-GL052` is absent from verified public data. Do not invent/substitute the SKU. `commerceStatesComplete=false` because the audit is read-only and does not submit a real order.
- Next: recheck current SHA and latest workflows; verify runtime tests for pending-order no-QR and invalid QR rejection; inspect new live screenshots in light/dark at 360×800, 390×844, 768×1024, 1440×900; continue confirmed visual defects. Update `docs/website-screenshots/manifest.json` only after a new capture is complete. Do real code/test work, not documentation-only; keep PR unmerged.


## 2026-10-21 — Audit result finalized after previous checkpoint

- Live audit [run 39558222013 / artifact 12327195638](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39558222013) completed successfully as a capture job on source SHA `0153bbfdc4ad66850ac9a9ab0ca3950811330f84`; deployment metadata verified Preview branch and exact SHA (deployment `e64ac4f9-412a-49ec-8675-d9c23d6f0ba1`).
- Capture totals: 84 screenshots; 8/8 viewport-theme pairs; 12 route checks; 60 section targets; 4 product-detail contexts; 8 commerce UI-state checks. Overflow, console, page, HTTP, failed-request, broken-image and read-only-violation counts are all zero.
- **Audit did not pass:** one hard failure remains: `SD-GL052` is absent from the verified public product payload at `mobile-390-light`. Do not invent or substitute it. `commerceStatesComplete` is not evidence of a completed order: the audit was read-only, checkout was opened but not submitted, and no payment was attempted.
- Manifest `docs/website-screenshots/manifest.json` now records this exact audit, artifact, verified deployment SHA and blocker. The capture artifact is evidence for SHA `0153bbf…`, not a claim that a later documentation-only commit is already deployed.
- At this follow-up, branch HEAD was `c9b52c6a37e91416aab35c3def40d85abe0e6d33` (handoff-only commit); source validation, Preview deploy, Admin Preview smoke and visual workflow were newly queued/running on that SHA. Recheck those runs and deployment verification before calling the newest HEAD validated. Keep Production untouched and PR #108 unmerged.


## AUTHORITATIVE ADDENDUM — PRODUCT FULFILLMENT & CHECKOUT RULES (2026-10-21)

This section clarifies storefront behavior and does not authorize work on Admin code. Keep this branch exclusively for the public static website, customer-facing UI, storefront integration, and its tests. Do not edit Admin UI/backend/schema/migrations or implement Admin-only endpoints here. Read the shared contract at `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` before touching checkout.

### Product type is owner-managed, never customer-selected
- The product's fulfillment type is a product field set/controlled by the owner in Admin and returned by the API: `made_to_order`, `in_stock`, or `unclassified`.
- The customer must NOT choose whether a product is made-to-order or in-stock at checkout. The storefront reads the authoritative product field and displays the matching payment options automatically.
- Do not infer the type from category (e.g. shoes/footwear), SKU, stock quantity, old labels, photos, or guesswork. The owner may classify footwear as made-to-order and can classify individual products as in-stock in Admin. If the API field is missing/unknown, treat it as `unclassified` and offer contact/consultation without exposing an incorrect payment choice.

### Payment options to render
- `made_to_order`: (A) deposit = 30% of the server-confirmed product/order value to begin production; or (B) full payment = 100%, eligible for freeship.
- `in_stock`: (A) fixed deposit = 100,000 VND, then dispatch after the store verifies the deposit and confirms the order; or (B) full payment = 100%, eligible for freeship and dispatch after verification.
- Full-payment freeship applies to BOTH fulfillment types. Do not imply that the deposit options are automatically freeship.
- The storefront must show the amount calculated/confirmed by the server for the chosen option, not a browser-invented amount. If price or type is unclassified/unconfirmed, allow the customer to submit a consultation/order request but do not calculate a fake deposit, request transfer, or show a payment-ready QR.
- QR image and receiving details must come from the active public-safe Admin/API configuration. Never hardcode or fabricate a QR. Do not treat opening/scanning QR, clicking “I transferred”, or uploading a receipt as proof of payment. Only show verified-paid status returned by trusted backend/Admin workflow.

### UX acceptance checks
- No customer-facing selector for fulfillment type.
- Verify all four exact branches: made-to-order 30% deposit; made-to-order 100% + freeship; in-stock 100,000 VND deposit; in-stock 100% + freeship.
- Verify unclassified product, missing price, unavailable QR, invalid payment response, and mobile light/dark states fail safely and offer consultation.
- Do not state that backend support exists unless verified against actual API and deployed Preview. Keep this work on the static branch; no merges or Production deploys.


## 2026-10-21 — QR payment / fulfillment-type integration handoff (storefront branch)

**Scope and safety boundary**
- Current branch: `fix/liquid-glass-audit-2026-10-19`. Current pre-handoff-docs HEAD at time of inspection: `ed454231a6a9cd9b9605f3581f4a5a79497462bb` (message: `docs(contract): define owner-managed fulfillment and payment options`). Do not merge PR #108, deploy Production, run Production D1 migrations, or edit Admin-only UI/backend implementation from this branch.
- Contract source of truth: `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md`. Read it in full before code changes and re-read the latest handoff/test-results on the actual branch HEAD.
- Storefront owns customer-facing product type/payment-option presentation and API consumption only. Admin/backend owns product classification, persistence/schema, public-safe active QR configuration, authoritative payable amounts, payment ledger and manual verification. Coordinate by contract; do not cherry-pick/edit the other AI's branch files.

**Contract rules to implement/verify**
- Product type values: `in_stock`, `made_to_order`, `unclassified`. Unknown/missing values must remain unclassified. Never infer from category, SKU, stock count, photos or old labels. Customer must not choose the fulfillment type.
- `made_to_order`: offer server-confirmed 30% deposit to begin production OR server-confirmed 100% full payment. Full payment qualifies for freeship.
- `in_stock`: offer fixed 100,000 VND deposit OR server-confirmed 100% full payment. Dispatch follows store verification of deposit and order confirmation. Full payment qualifies for freeship.
- Deposit-only options do not automatically promise freeship. Missing/unconfirmed price/type/terms may create a consultation/order request, but must not calculate or request a fabricated amount or show payment-ready QR.
- QR and receiving details may only come from an active, verified, public-safe Admin/API configuration with no embedded fixed amount. Scanning QR, uploading a receipt, clicking “I transferred”, or a customer claim must never mark payment paid. Only trusted backend/Admin verification can do so.

**Evidence at handoff**
- Contract exists on this branch and documents the separation/rules. This is not evidence that runtime integration exists.
- Previous live storefront audit: [run 39558222013](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39558222013), artifact 12327195638, 84 screenshots; exact Preview deployment SHA `0153bbfdc4ad66850ac9a9ab0ca3950811330f84`. Capture was read-only and did not submit an order or attempt payment. Audit failed because `SD-GL052` is absent from verified public product data; do not invent/substitute it.
- Prior evidence does not establish QR/payment API availability. Inspect the live code and latest workflow runs on the current HEAD before claiming anything is implemented or deployed.

**Next actions — code required, not documentation-only**
1. Inspect storefront product API, order creation/response, existing checkout UI, and contract tests; identify actual fields/routes from source and runtime responses. Do not invent endpoint names or fields.
2. Check current API support for product type, payment options, server-calculated amounts, active QR config, order/payment status. If fields/routes are absent, fail closed and document the exact dependency for the Admin AI; do not simulate a working payment flow.
3. Implement storefront display for all four confirmed payment branches and safe consultation fallback for unclassified/missing price/missing QR/invalid response. Only show QR when all required server data validates; pending order remains pending until verified server status says paid.
4. Add tests for every branch, malformed/unknown response, pending status, invalid/inactive/fixed-amount QR rejection, and prevention of client-side “paid” transitions. Never submit a real order/payment in audit tests.
5. Run relevant tests, deploy only Preview through GitHub Actions, verify deployment SHA, capture real screenshots and update `docs/website-screenshots/manifest.json` only after evidence exists. Update this handoff with exact commit, run/artifact URLs, outcomes and remaining blockers.

**Status honesty:** this handoff addendum records the contract and next implementation requirements; it does not claim the storefront QR/payment/product-type feature is complete. Keep the satin/reference audit separate; its known `SD-GL052` blocker remains unresolved and must not be “fixed” by fabricating product data.


## Current handoff pointer — 2026-10-21

Before work, read `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` and `docs/handoff/PROMPT-NEXT-CHAT-2026-10-21.md`. The storefront branch must only consume public API and implement customer UI/tests. Admin AI owns Admin UI, schema, product classification persistence, QR setup and payment verification on its own branch. Current API creates orders as `pending_confirmation`; no verified active public QR or public order-status lookup exists, so checkout must not show QR/amount and must say “Chờ cửa hàng xác nhận” / “Vui lòng chưa chuyển tiền”. Never infer product type or mark payment paid from QR scan/receipt/customer claim. Keep PR #108 open; no Production changes.


## VISUAL REFERENCE REQUIREMENT — CHECKOUT / PAYMENT (2026-10-21)

- Treat `docs/static-web-reference/` as the canonical reference folder for the **public static storefront only**. Keep this separate from `docs/admin-ui-reference/`.
- The newly rendered checkout/payment storyboard is intended as a supplement to the two existing mobile source references (Ice Pearl light and Deep Navy dark), not a replacement for them. Match the current website's real typography, glass material, spacing, radii, background texture, blue palette and mobile-first density; do not copy the storyboard's illustrative product/SKU, bank data, dates or sample prices into production data.
- **Required comparison workflow:** before designing checkout, open the checkout/payment storyboard at full resolution alongside both existing original mobile reference images and current Preview. After each meaningful iteration, capture the same relevant screens in mobile light/dark mode, compare side-by-side, and report concrete mismatches and evidence. Do not claim visual comparison unless the image was actually opened and inspected.
- Image-asset status (superseded by the authoritative update at the end of this prompt): the checkout/payment storyboard is uploaded and verified at `docs/static-web-reference/checkout-payment-flow-reference.png` on branch `fix/liquid-glass-audit-2026-10-19`. Use the exact file; do not ask the user to upload it again unless a fresh GitHub check shows it is missing.
- Checkout must never ask the customer to choose “hàng đặt làm / hàng có sẵn”. This is an owner-controlled product field from Admin/API. The storefront only presents the payment options allowed for that product's current authoritative type:
  - `made_to_order`: 30% deposit, or 100% full payment with freeship.
  - `in_stock`: fixed 100,000 VND deposit, or 100% full payment with freeship.
  - `unclassified` or missing/unknown type: no guessed payment options; allow consultation/order request.
- Price-based amounts are dynamic. Calculate only from server-confirmed current prices/terms: made-to-order deposit is 30%; in-stock deposit is fixed 100,000 VND; full payment is 100%. Full-payment freeship applies to both types. Never bake the storyboard's example amount into code or request payment if price/type/terms are not confirmed.
- QR slot in the storyboard is only a layout cue. Render the actual QR and receiver details only from a valid active Admin/API response; no fabricated QR, bank name or account number. A QR scan or customer claim does not mean payment has been verified.
- Keep changes only on `fix/liquid-glass-audit-2026-10-19`; do not edit Admin files/schema/migrations, merge PR #108, or deploy Production.


## AUTHORITATIVE UPDATE — checkout/payment reference image is uploaded (2026-10-21)

This entry supersedes any earlier wording in this file that says the checkout/payment storyboard is absent, not committed, awaiting upload, or only a planned path. The user uploaded the image and GitHub fetch verified the file at the exact path below on this branch:

- **Canonical path:** `docs/static-web-reference/checkout-payment-flow-reference.png`
- **Branch:** `fix/liquid-glass-audit-2026-10-19`
- **GitHub URL:** https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/static-web-reference/checkout-payment-flow-reference.png
- **Blob SHA verified:** `c89ff843af1c094def9233d27a148e048b191990` (re-fetch before relying on this SHA after later edits).
- **Folder index / usage rules:** https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/static-web-reference/README.md

### Mandatory instructions for the storefront AI
1. Open the uploaded PNG at full resolution before checkout/payment visual work. If the browser cannot render it, use GitHub's download/raw option and inspect the actual image; do not claim visual inspection until done.
2. Compare it side-by-side with BOTH original storefront mobile references (light Ice/Pearl and dark Deep Navy) and the live Preview. The storyboard is an additional checkout-flow reference, not a replacement for the original brand design.
3. Preserve the existing Luxury Minimalism + Apple Liquid Glass language, mobile-first layout, both themes, legibility, spacing and responsive behavior. Do not blindly copy storyboard-only details or let it override the actual site.
4. Never copy illustrative product/SKU, prices, bank/account details, dates or QR from the storyboard into live data/code. The image is a visual and flow reference only.
5. Follow `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md` for actual behavior: type is owner-set in Admin/API (never customer-selected); made-to-order allows server-confirmed 30% deposit or 100% with freeship; in-stock allows fixed 100,000 VND deposit or 100% with freeship; unknown type/price must fail safely to consultation; QR and receiver details must come from active, verified API configuration; a customer claim is not proof of payment.
6. Keep the source of truth consistent: this prompt, `docs/static-web-reference/README.md`, and the exact PNG path above. If the image disappears or its path changes, re-fetch and report the actual result rather than guessing.
7. No merge of PR #108, no Production deploy, and no changes to Admin branch/backend/data unless separately authorized.
## Quy tắc liên tục khi chat dài hoặc Memory đầy (2026-10-21)

Nguồn sự thật của dự án là GitHub: đọc docs/handoff/PROMPT-NEXT-CHAT-2026-10-21.md trước, xác minh HEAD/Actions/Preview mới nhất rồi mới tiếp tục. Memory và tóm tắt hội thoại chỉ hỗ trợ, không thay thế handoff hoặc bằng chứng mới. Trước khi chuyển chat, cập nhật handoff và next-chat prompt với SHA, test/deployment/audit links, blocker và hành động tiếp theo. Không lặp lại test PASS khi code/config/điều kiện liên quan không đổi. Tiếp tục sau khi báo cáo; chỉ dừng khi thật sự cần người dùng thao tác/phê duyệt hoặc gặp blocker ngoài quyền truy cập. Chỉ làm storefront trên fix/liquid-glass-audit-2026-10-19; tuyệt đối không sửa Admin, merge PR #108/#111, sửa main hoặc chạm Production/D1/R2/config/secrets.


## Cập nhật thực thi mới nhất — 2026-10-21 09:42 UTC / 16:42 ICT

> Bản ghi này mới hơn các mốc HEAD cũ trong lịch sử phía trên. SHA code storefront đã xác minh tại thời điểm cập nhật là `18116ef82bf4b65f077ae8a5da35a6f9d0790ee7`; mọi bằng chứng bên dưới được gắn đúng SHA này.

- Nhánh: `fix/liquid-glass-audit-2026-10-19`. PR #108 vẫn mở, chưa merge. Phạm vi tiếp tục chỉ là storefront tĩnh; không đụng Admin, `main`, Production, D1/R2, binding, secrets, DNS hay dữ liệu sản phẩm.
- Vòng sửa nền satin: commit `9cf53f9d80c00bf434aacc8d205e96f63b6b62f4` thay dải cong song song bằng các lớp nếp lụa uốn tự nhiên hơn trong bốn asset SVG Light/Dark và mobile/desktop; `public/index.html` và regression assertions dùng cache key `20261021-12`. Commit `1a95fc4cce042ed9494218aecc5a3d31632f99b1` đồng bộ cache assertions; commit `18116ef82bf4b65f077ae8a5da35a6f9d0790ee7` sửa test để khớp markup SVG có `data-fold-index`, thay vì ID cũ `fold4`.
- Source/tests: **PASS** tại [run 39578846923](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39578846923). Job validate hoàn tất thành công; log ghi nhận các regression checks storefront gồm 6 commitment tiles, Liquid Glass product cards, gallery/modal, cart/checkout/account, thao tác Back/Forward trên mobile, safe fallback khi thiếu SKU, và satin asset checks.
- Cloudflare Pages Preview deploy: **PASS** tại [run 39578846653](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39578846653). Log báo deployment hoàn tất, URL triển khai `https://35be2d90.sindarealest2.pages.dev`, alias nhánh `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev`. Bản ghi này xác nhận bước deploy của workflow; chưa coi là xác nhận parity trực quan.
- Live visual capture/audit: [run 39578846635](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39578846635) **đang chạy ở thời điểm ghi**; job `visual-preview` chưa kết thúc và chưa có artifact ở lần kiểm tra này. Chưa được tuyên bố texture satin đã đạt hình tham chiếu và không được cập nhật screenshot manifest/folders thủ công thay cho workflow guarded.
- Blocker cứng vẫn giữ nguyên: public verified product payload chưa có SKU `SD-GL052`. Giữ fail-closed, không dựng SKU giả, không chọn ảnh thay thế, không thay catalog/backend. Audit toàn thể chỉ được chấp nhận sau khi đúng dữ liệu SKU được xác minh và ảnh live mới được mở, so trực tiếp với PNG gốc.
- Ngay sau cập nhật tài liệu: tiếp tục lấy kết quả run visual, đọc log khi fail, lấy artifact khi có, mở ảnh thực tế Light/Dark ở bốn viewport, kiểm tra các trạng thái cart/account/checkout và các sai lệch còn xác nhận được. Sau mỗi thay đổi source, chạy lại test và Preview theo quy trình. Không lặp các test PASS nếu source/điều kiện liên quan không đổi.
- Ghi chú phạm vi: workflow có tên “Admin Preview Playwright” cũng xanh cùng SHA nhưng không phải lý do để mở rộng sang sửa Admin hoặc coi đó là nghiệm thu giao diện storefront.


## BÀN GIAO MỚI NHẤT — 2026-10-21 16:55 ICT (supersedes older “current HEAD” notes)

### Trạng thái code và kiểm tra
- Repo `chichute5500/Sindarealest-admin`, branch `fix/liquid-glass-audit-2026-10-19`; **code-bearing commit**: `7fe8968e8820b75c2fc696a8433493332e245991` — `fix(storefront): soften satin into fine low-contrast folds`.
- PR #108 vẫn mở, chưa merge: https://github.com/chichute5500/Sindarealest-admin/pull/108. Production https://sindarealest2.pages.dev/ không được sửa/deploy; không làm Admin/backend.
- Trên SHA `7fe8968e8820b75c2fc696a8433493332e245991`, source/test validation run [39580407595](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39580407595) đã **PASS**; Preview deployment workflow [39580407427](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39580407427) đã **PASS**; workflow mang tên Admin Preview Playwright [39580407474](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39580407474) cũng xanh nhưng ngoài phạm vi công việc, không phải bằng chứng nghiệm thu Admin/storefront.
- Live visual diagnostic [run 39580407617](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39580407617) **còn chạy khi ghi chú này được tạo**; job đang thực hiện local fixture screenshots/audit và bước metadata/probe/capture live vẫn chờ. Chưa có artifact mới được xác nhận ở lần truy vấn này. Không tuyên bố texture mới đã PASS trực quan chỉ vì CI/deploy xanh.
- Preview alias đã dùng trong pipeline là `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`; cần xác nhận deployment metadata/commit chính xác trong diagnostic trước khi chấp nhận screenshots như live proof.

### Phần đã sửa trong vòng satin mới
- Commit `7fe8968e8820b75c2fc696a8433493332e245991` chỉnh bốn SVG `public/images/liquid-glass-{light,dark}(-mobile).svg` sang marker `organic-fine-satin-folds-v3`. Nếp lớn và lớp shadow/highlight giảm độ rộng/độ tương phản; đường nhăn mảnh vẫn giữ để satin không bị phẳng. Desktop shadow stroke 6.8/body 3.2/shade 0.9/highlight 0.75; mobile shadow 3.0/body 1.75/shade 0.55/highlight 0.48 (SVG user-facing appearance vẫn cần kiểm tra bằng ảnh).
- `public/index.html` cùng test liên quan nâng cache-busting từ `20261021-12` lên `20261021-13`. Regression tests thêm ngưỡng opacity để chặn các dải thành ribbon/ring lớn trở lại.
- Trước thay đổi này, live artifact của run [39578846635](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39578846635), artifact [12335711675](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39578846635/artifacts/12335711675) có screenshots live nhưng workflow steps để archive/pixel compare đều skipped, không phải canonical screenshot capture. Việc xem ảnh cho thấy nếp satin vẫn đọc thành đường cong lớn, nhất là Dark/desktop; đó là lý do cho vòng v3. Không chỉnh thủ công `docs/website-screenshots/start-of-work/`, `end-of-work/` hay manifest để tạo cảm giác audit đã pass.

### Blocker / các bước tiếp theo bắt buộc
1. Kiểm tra trạng thái cuối của run `39580407617`, đọc logs nếu lỗi, lấy artifact khi upload xong. Phân biệt local fixture với live Preview, xác minh source/deployment SHA.
2. Mở ảnh live thực tế ở mobile/desktop và Light/Dark; so cạnh PNG gốc `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png` và `file_00000000fcb48207a23aeda23caa5eeb.png`. Kiểm tra các viewport 360×800, 390×844, 768×1024, 1440×900; tiếp tục sửa những sai khác còn thấy rõ.
3. Duy trì kiểm tra sáu ô Liquid Glass, phần “Phong cách đẳng cấp từ da cá sấu”, nền satin, gallery controls, drawer cart/account/checkout, mobile Back, footer/Zalo và route sản phẩm; không coi kiểm thử tĩnh là visual acceptance.
4. Audit toàn thể vẫn bị khóa nếu public verified product payload không có đúng SKU `SD-GL052`. Không fake SKU, không thay ảnh khác, không đụng catalog/D1/R2/Admin để làm xanh audit. Giữ fail-closed và ghi blocker cụ thể.
5. Sau khi có kết quả visual cuối, cập nhật handoff, test results, master prompt, next-chat prompt; chỉ workflow guarded được phép lưu canonical screenshots/manifest khi các điều kiện acceptance đạt. Tiếp tục làm sau khi báo cáo, không tự dừng để hỏi cập nhật tiến độ.
