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
