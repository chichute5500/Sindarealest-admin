# BIÊN BẢN ĐỐI CHIẾU CHÉO — WEB TĨNH & WEB ADMIN SINDAREALEST2

**Ngày ghi nhận:** 20/10/2026 (UTC+7)  
**Repository:** `chichute5500/Sindarealest-admin`  
**Mô hình phát triển:** hai nhánh song song, độc lập — `fix/liquid-glass-audit-2026-10-19` cho web tĩnh và nhánh `feature/*` cho web admin (tên nhánh feature cụ thể cần xác minh từ GitHub trước khi ghi cứng). Không xem admin là giao diện cũ cần giữ nguyên, và không mặc định storefront là nguồn để áp đặt thiết kế admin.  
**PR web tĩnh:** [#108 — Fix/liquid glass audit 2026 10 19](https://github.com/chichute5500/Sindarealest-admin/pull/108) — không merge trong công việc này.  
**Storefront Preview:** https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/  
**Admin Preview:** cần xác minh branch feature, URL và deployment SHA đang phục vụ admin trước khi kiểm thử cuối.  
**Production:** https://sindarealest2.pages.dev/ — chỉ để phân biệt; không sửa, không merge và không triển khai Production.

> Mục đích: ghi lại hai luồng thiết kế đang phát triển song song, độc lập và lập danh sách kiểm tra chéo sau khi cả hai hoàn tất. Mỗi nhánh được tự do thiết kế lại giao diện trong phạm vi đã duyệt; chỉ so sánh các quy ước chung và phát hiện xung đột khi có bằng chứng. Biên bản này không yêu cầu admin giữ nguyên giao diện cũ hoặc phải sao chép nguyên trạng storefront.

## 1. Phạm vi công việc song song

### A. Web tĩnh / giao diện khách hàng
- Mã trang chính: `public/index.html` (HTML, CSS và JS phần lớn nằm trực tiếp trong file; đã quan sát thấy stylesheet inline và nhiều khối style/script bổ sung).
- Ảnh nền giao diện mới được thêm:
  - `public/images/liquid-glass-light.svg`
  - `public/images/liquid-glass-dark.svg`
  - `public/images/liquid-glass-light-mobile.svg`
  - `public/images/liquid-glass-dark-mobile.svg`
- Font storefront được khai báo bằng `@font-face` với họ `SD Sans` và `SD Serif`, trỏ tới file trong `public/fonts/`.
- Những phần đã được chỉnh trong vòng công việc gần đây: nền Liquid Glass sáng/tối và riêng mobile; nền splash/ambient; bố cục chi tiết sản phẩm trên mobile thành full-screen; vị trí nút yêu thích để tránh chồng lên nút đóng.
- Phạm vi giao diện được phép chỉnh theo chấp thuận của chủ dự án: bố cục, font, khoảng cách, màu, nền/gradient, kính mờ, kích thước/vị trí điều khiển, responsive, cấu trúc giao diện cần thiết để khớp ảnh mẫu.
- Không tự ý thay logo/tên thương hiệu, ảnh sản phẩm hoặc mapping ảnh, SKU, giá, mô tả, dữ liệu, API, xác thực, backend, D1/R2 hay chức năng kinh doanh.

### B. Web admin / nhánh feature đang phát triển song song
- Nguyên tắc: admin cũng được phép tháo bỏ ràng buộc của code giao diện cũ và tái thiết kế theo ảnh mẫu. Không áp dụng CSS/layout storefront lên admin một cách máy móc; không trì hoãn việc thiết kế admin để chờ storefront hoàn tất.
- Nhánh feature cụ thể và SHA hiện hành: cần xác minh trực tiếp trong GitHub; không tự đoán tên nhánh hoặc revision.
- Mã giao diện admin: `public/admin/index.html`; hiện có CSS và JS inline riêng, không thấy trang này nạp stylesheet dùng chung với `public/index.html` trong phần đầu file đã kiểm tra.
- Admin có bộ biến CSS và thành phần riêng như `--bg`, `--paper`, `--ink`, `--line`, `--gold`; giao diện tối được điều khiển bằng selector `:root[data-admin-theme="dark"]`.
- Admin sử dụng logo tại `/images/brand-emblem.png`; các nội dung sản phẩm/ảnh trong admin còn liên quan tới API và luồng tải/lưu, nên thay đổi giao diện không được làm đổi hợp đồng API hoặc hành vi lưu dữ liệu.
- Phạm vi theo báo cáo admin hiện có: hoàn thiện kiểm toán Admin Preview/Liquid Glass, kiểm tra trực quan so với mẫu, xác minh deployment theo branch/SHA, kiểm tra Playwright, các route và responsive. Báo cáo admin được lưu ở `docs/ADMIN_PREVIEW_PROGRESS_2026-10-20.md`; prompt bàn giao admin ở `docs/MASTER_PROMPT_HANDOFF_ADMIN_PREVIEW_2026-10-20.md`.
- Trạng thái không được mặc định là đã hoàn tất: đọc báo cáo/Actions mới nhất tại đúng SHA trước khi tuyên bố nghiệm thu; review trực quan cuối cùng vẫn là tiêu chí riêng.

## 2. Nguyên tắc phát triển song song

1. Nhánh `fix` tiếp tục hoàn thiện web tĩnh theo ảnh gốc; nhánh `feature` tiếp tục hoàn thiện admin theo ảnh gốc. Hai nhánh không phụ thuộc thiết kế của nhau để có thể tiến triển.
2. Mỗi nhánh có thể thay đổi cấu trúc HTML, CSS, font, layout, responsive và JS giao diện trong phạm vi được chủ dự án cho phép; các thay đổi chức năng/data/backend/API/auth vẫn phải tuân theo giới hạn đã thống nhất và xin phép riêng nếu vượt phạm vi.
3. Không merge/cherry-pick hoặc sao chép thay đổi giữa hai nhánh trong bước làm việc này. Ghi nhận các quy ước chung và điểm cần đối chiếu sau khi hai bên hoàn tất.
4. Sau khi cả hai có bản Preview gần hoàn thiện, chốt SHA riêng cho từng nhánh, chụp ảnh cùng kích thước/điều kiện phù hợp, lập bảng sai khác và regression. Chỉ khi đó mới quyết định thay đổi nào cần đồng bộ, giữ riêng hoặc giải quyết xung đột.
5. “Đồng bộ thương hiệu” không có nghĩa là hai giao diện phải giống pixel: admin ưu tiên vận hành, storefront ưu tiên trải nghiệm mua hàng.

## 3. Bản đồ phụ thuộc và nguy cơ xung đột

| Khu vực | Hiện trạng đã xác minh / cần đối chiếu | Cách xử lý khi nghiệm thu |
|---|---|---|
| CSS/HTML chính | Storefront ở `public/index.html`; admin ở `public/admin/index.html`. Mỗi trang có CSS inline và token riêng theo phần đầu file được kiểm tra. | Giữ CSS storefront trong scope của storefront; giữ CSS admin trong scope admin. Nếu sau này tạo stylesheet/component dùng chung, phải kiểm tra selector global và thứ tự nạp CSS trước khi hợp nhất. |
| Font | Storefront khai báo `SD Sans`/`SD Serif` từ `public/fonts/`; admin hiện có stack `Inter, "Noto Sans", system-ui, ...`. | Đối chiếu độ đồng nhất thương hiệu sau khi cả hai hoàn tất. Không tự thay font admin chỉ vì storefront đã đổi; thay đổi đó cần được ghi thành đầu việc giao diện admin riêng trong phạm vi đã duyệt. Kiểm tra font tải thành công, fallback, xuống dòng và tràn nội dung trên mobile. |
| Theme sáng/tối | Storefront dùng class `html.dark` và `data-theme-mode`; admin có cơ chế riêng `data-admin-theme="dark"`. | Không giả định hai trang có thể dùng chung tên class, token hoặc localStorage key. Chạy cả sáng/tối riêng cho mỗi trang; kiểm tra nền, chữ, viền, focus, overlay, nút disabled và hình ảnh. |
| Logo/thương hiệu | Storefront và admin tham chiếu đường dẫn/logo trong cấu trúc riêng; admin thấy `/images/brand-emblem.png`, storefront có tài sản thương hiệu riêng. | Giữ nguyên nguồn logo/tên thương hiệu. So sánh tỉ lệ hiển thị, khoảng đệm, độ tương phản và vị trí; không thay file/nguồn logo để giải quyết khác biệt hiển thị nếu chưa có chấp thuận cụ thể. |
| Ảnh sản phẩm/gallery | Storefront có card, gallery và product-detail overlay; admin có trình chỉnh sửa sản phẩm/thư viện ảnh (ví dụ `renderGallery()` và lưới ảnh). | Chỉ đồng bộ quy tắc trình bày khi phù hợp; không dùng cùng CSS class chung theo cách có thể ảnh hưởng chọn/xóa/tải lên/sắp thứ tự/lưu ảnh trong admin. Kiểm tra sản phẩm một ảnh và nhiều ảnh, lỗi tải/lưu và trạng thái đang lưu. |
| Ảnh nền/thư mục ảnh | Bốn file SVG Liquid Glass mới nằm dưới `public/images/`; đây là tài sản nền storefront. | Không áp ảnh nền storefront lên admin một cách vô điều kiện. Nếu chủ dự án muốn dùng ngôn ngữ kính mờ chung ở admin, chỉ dùng như quyết định thiết kế có kiểm tra tương phản và khả năng đọc. |
| Responsive/layout | Storefront có điều chỉnh chi tiết sản phẩm mobile full-screen; admin có layout dashboard, sidebar/mobile navigation, form/modal và các bảng có min-width. | Test ở viewport tương đồng: điện thoại 390px, tablet/desktop và chế độ zoom hẹp nếu workflow hỗ trợ. Bảo đảm admin không tràn ngang, nút đóng không đè favorite/action, modal không che nút lưu, bảng vẫn dùng được. |
| JavaScript/UI state | Storefront và admin là hai trang riêng với luồng tương tác khác nhau. | Không chuyển nguyên JS điều khiển modal/theme/gallery từ storefront sang admin. Sau sửa CSS/markup, chạy kiểm thử tương tác, console/page errors và các luồng đăng nhập/CRUD/ảnh admin hiện có. |
| API, dữ liệu, backend | Giao diện admin quản trị dữ liệu; storefront hiển thị dữ liệu khách hàng qua các route/API. | Thay đổi ở đợt giao diện này phải giữ nguyên API, auth, dữ liệu, D1/R2, secrets và chức năng nghiệp vụ. Bất kỳ nhu cầu thay đổi nào ở lớp này phải tách khỏi chỉnh giao diện và xin phép riêng. |
| Định tuyến / service worker | Storefront và `/admin/` cùng được phục vụ trong một Pages project; có `public/admin-sw.js`. | Kiểm tra trực tiếp URL storefront, `/admin/`, tải lại trang, direct-open route sản phẩm và cache/service worker. Không sửa scope/caching/redirect như một giải pháp “chữa” lỗi giao diện nếu chưa xác định nguyên nhân. |
| Build/deploy và môi trường | Hai giao diện ở cùng repository, nhưng link Preview/deployment và cấu hình có thể lệch SHA theo từng lần chạy. | Trước khi so sánh cuối, ghi SHA commit, branch, Preview URL và deployment ID của cả hai. Không so ảnh từ hai revision khác nhau mà không ghi rõ. Preview-only; Production bất biến. |

## 4. Những điểm cần kiểm tra chéo sau khi hai phần hoàn tất

### 3.1. Đồng nhất nhận diện nhưng không ép hai trang giống hệt
- Logo, tên SinDarealest và giọng điệu thương hiệu giữ nguyên.
- Bảng màu, font, bán kính bo góc, độ đổ bóng, cách dùng kính mờ và trạng thái hover/focus có thể cùng một ngôn ngữ thiết kế.
- Admin là công cụ vận hành nên mật độ thông tin, bảng, biểu mẫu, cảnh báo, nút lưu/xóa có thể khác storefront; không làm admin khó đọc chỉ để giống pixel.

### 3.2. Kiểm tra regression bắt buộc
- Storefront: trang chủ, danh mục/collection, card sản phẩm, mở chi tiết qua click, mở URL sản phẩm trực tiếp, tải lại trang, gallery một ảnh/nhiều ảnh, favorite, đóng/mở overlay, giỏ hàng/CTA quan trọng.
- Storefront: mobile sáng/tối và desktop sáng/tối; kiểm tra overflow, console/page errors, font fallback, ảnh 404 và thay đổi do carousel/autoplay.
- Admin: đăng nhập, điều hướng dashboard, danh sách sản phẩm, mở/tạo/sửa/lưu sản phẩm, tải lên/chọn/xóa/sắp xếp ảnh theo hành vi được phép, reload để kiểm tra tính bền dữ liệu, đơn hàng/khách hàng/bảo hành/thiết lập ở mức smoke test, theme sáng/tối, sidebar/mobile tabs và các modal/form.
- Sau bất kỳ thay đổi shared asset, font, global CSS, route/cache hoặc markup chung: chạy cả storefront visual workflow lẫn Admin Preview Playwright. Workflow bị skipped hoặc chỉ dùng fixture không được tính là live acceptance.
- So sánh ảnh ở cùng viewport, màu/theme và URL/route. Lưu before/after cùng tên quy ước; giữ nguyên thư mục `start-of-work`, không ghi đè baseline lịch sử.

## 5. Quy trình xử lý xung đột

1. **Chốt revision riêng:** ghi commit SHA, tên nhánh và Preview URL của web tĩnh (`fix`) và admin (`feature`); xác minh mỗi deployment đang chạy đúng SHA.
2. **Xác định nguồn lỗi:** phân loại lỗi thành (a) storefront-only, (b) admin-only, (c) tài sản/quy tắc dùng chung, (d) API/data/backend, hoặc (e) cache/deployment.
3. **Sửa đúng lớp:** CSS scoped hoặc HTML trang tương ứng trước; không sửa API/backend để chữa lỗi trình bày.
4. **Ghi thay đổi:** cập nhật bảng dưới đây với file, selectors/IDs, lý do, kiểm thử và SHA.
5. **Chạy test liên quan:** storefront visual Playwright; Admin Preview Playwright; source validation/tests. Chạy chéo cả hai nếu file/tài sản/selector chung hoặc ảnh hưởng chưa rõ.
6. **Chấp nhận có điều kiện:** không gọi 100% nếu visual parity còn cần người xem, live deployment chưa đúng SHA, workflow bị skip, hoặc có regression chưa xử lý.
7. **Triển khai:** tiếp tục chỉ ở nhánh/Preview. Tuyệt đối không merge/deploy Production trong quá trình này.

## 6. Nhật ký thay đổi của hai nhánh

| Ngày / SHA | File / vùng | Thay đổi | Ảnh hưởng admin dự kiến | Cần kiểm tra lại | Trạng thái |
|---|---|---|---|---|---|
| Web tĩnh — vòng công việc hiện tại; SHA trước commit ghi biên bản: `db21d489923cde19730cd5076051410b0f0f91a5` | `public/index.html` | Điều chỉnh CSS/JS giao diện khách hàng, nền, theme, product detail overlay và responsive. | Không thấy CSS/JS inline của admin được import trực tiếp; nguy cơ trực tiếp thấp. Tác động gián tiếp ở nhận diện/đường dẫn tài sản và những sửa đổi global về sau. | Xác nhận admin login/CRUD/gallery/theme/responsive vẫn PASS trên SHA admin mới nhất. | Cần xác minh cross-regression cuối |
| Web tĩnh — vòng công việc hiện tại | `public/images/liquid-glass-*.svg` | Thêm bốn SVG nền Liquid Glass sáng/tối, desktop/mobile cho storefront. | Không phải thay đổi chức năng admin; tránh tự áp các asset này lên admin. | Tải SVG thành công ở storefront; admin không bị đổi nền ngoài dự định. | Đã ghi nhận; chờ cross-check |
| Vòng công việc hiện tại | `public/admin/index.html` | Không sửa trong bước ghi biên bản này. Admin tiếp tục theo đầu việc/PR hiện hữu. | Không phát sinh chỉnh sửa admin từ commit ghi chú này. | Đọc trạng thái Actions mới nhất trước khi nghiệm thu cả hai. | Không thay đổi |

## 7. Trạng thái chụp ảnh trước/sau và giới hạn bằng chứng

- Thư mục chuẩn ảnh: `docs/website-screenshots/start-of-work/` và `docs/website-screenshots/end-of-work/`.
- Manifest: `docs/website-screenshots/manifest.json`.
- Manifest có ghi một lần so sánh trước đây: 66 cặp, 57 pixel-identical, 9 cặp thay đổi; trạng thái review trực quan được ghi là `AWAITING_HUMAN_VISUAL_REVIEW`. Đây là bằng chứng của revision được nêu trong manifest, không phải bằng chứng rằng revision hiện tại đã khớp ảnh gốc.
- Không ghi đè ảnh baseline để che khác biệt. Khi capture mới, xác minh branch + exact deployment SHA và sử dụng đúng Preview live read-only.
- Ảnh tham chiếu storefront sáng/tối được chỉ định trong `docs/static-web-reference/README.md`; đừng nhầm chúng với ảnh chụp kết quả hiện tại hoặc ảnh admin.

## 8. Những điều không được làm khi giải quyết xung đột

- Không sửa `main`, không merge PR #108, không deploy Production.
- Không đổi logo/tên thương hiệu hoặc ảnh/mapping/dữ liệu sản phẩm chỉ để tạo pixel diff đẹp hơn.
- Không đổi API, auth, D1/R2, secrets, backend hoặc luồng lưu dữ liệu để chữa lỗi hiển thị.
- Không chuyển CSS toàn cục hoặc theme class giữa hai trang khi chưa kiểm tra phạm vi và side effects.
- Không đánh dấu PASS khi workflow/step bị skip, capture là fixture-only, SHA không khớp hoặc chưa có ảnh cần xem.
- Không yêu cầu người dùng chạy thủ công các kiểm tra mà có thể được xác minh qua GitHub Actions; không yêu cầu họ gửi bí mật trong chat.

## 9. Cập nhật nhật ký sau này

Mỗi khi chỉnh storefront mà có thể ảnh hưởng admin, thêm một dòng vào mục 5 kèm:
- SHA, file và selectors/IDs cụ thể.
- Tóm tắt thay đổi và lý do.
- Tác động dự kiến lên admin: none / visual consistency / potential regression.
- Các workflow/run URLs và kết quả thật.
- Preview URL/deployment ID/source SHA đã đối chiếu.
- Việc còn mở và người cần review (nếu có).

**Mốc đóng:** chỉ đóng đối chiếu chéo khi storefront và admin đều đã nghiệm thu riêng, test cross-regression phù hợp PASS, và các sai khác thiết kế còn lại được phân loại rõ là chấp nhận được hoặc đã sửa.