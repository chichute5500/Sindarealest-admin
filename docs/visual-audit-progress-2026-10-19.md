# SinDarealest — tiến độ kiểm toán giao diện

Cập nhật: 19/10/2026  
Repository: `chichute5500/Sindarealest-admin`  
Nhánh thử nghiệm: `fix/liquid-glass-audit-2026-10-19`  
Source HEAD đã xác minh: `68989d03bd254af8eede93628833012ac5d6389f` (mã nguồn); commit tài liệu cập nhật sau đó: `f806e4390f1b38adcc39f5445cc00ddf6ba042ed`  
Production: không merge vào `main`, không deploy, không thay DNS/secrets/DB/R2.

## Các thay đổi thực tế gần nhất

1. Sửa override CSS mobile khiến chiều cao thẻ cam kết bị ép cứng.
2. Xóa khối cam kết thương hiệu bị lặp sau “Sản phẩm nổi bật”; sáu cam kết chính dưới hero được giữ nguyên, CTA “Đặt hàng an tâm” và phần chi tiết quy trình vẫn còn.
3. **Sửa lỗi gốc khiến section “The art of…” bị sụp chiều cao trên mobile.** Quy tắc cuối cùng đặt `grid-template-rows:auto` trong khi các thẻ mosaic dùng nội dung/ảnh định vị tuyệt đối và không tạo intrinsic height. Khôi phục hàng mobile `200px 145px`.
4. Bổ sung assertion hồi quy trong `scripts/capture-liquid-glass-preview.mjs` kiểm tra bounding box mosaic ở mobile 390 px trong Light/Dark.
5. Điều chỉnh tiêu đề/mô tả của “The art of…” và “Tất cả sản phẩm” trên mobile thành bố cục xếp dọc; tránh tiêu đề và mô tả bị ép vào hai cột hẹp.

## Bằng chứng kiểm thử

- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187941825) — source commit `56a94091f63d`.
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187941663) — source commit `56a94091f63d`.
- Artifact screenshot: [sindarealest-liquid-glass-preview-78](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39187941663).
- Đã tải và đọc `visual-audit.json`: 36 screenshot; 20 tổ hợp responsive (10 viewport × 2 theme); 42 interaction checks; `passed=true`; `responsiveOverflowCount=0`; `hardFailures=[]`; không có page errors, console errors, same-origin HTTP errors hoặc failed requests.
- Assertion mosaic PASS ở cả hai theme: tổng chiều cao lưới 353 px; thẻ chính 200 px; hai thẻ phụ mỗi thẻ 179 × 145 px.
- Viewport: 320/360/375/390/412/430 px, tablet 768/1024 px, desktop 1366/1440 px, Light/Dark. Có thêm ảnh detail, fullscreen gallery, cart, checkout, order process và account.
- Môi trường là Chromium/Playwright trên preview tĩnh cô lập, dùng fixture sản phẩm cũ ở chế độ chỉ đọc; không dùng Cloudflare/D1/R2, không ghi dữ liệu và không gọi request ngoài. Không phải kiểm thử Android vật lý hoặc backend production.

## Sai lệch và giới hạn còn lại

1. **P1 — Độ giống ảnh mẫu:** trang hiện tại vẫn là storefront dài, không phải trải nghiệm app với các màn hình riêng như ảnh tham chiếu. Hero, mật độ nội dung, product card, texture nền và chiều sâu Liquid Glass chưa được nghiệm thu trực quan 100%.
2. **P1 — Catalog/ảnh:** preview fixture có sneaker/giày/phụ kiện, còn ảnh mẫu thể hiện túi xách/ví/thắt lưng. Không thay dữ liệu thật bằng ảnh giả; cần catalog/ảnh được chủ dự án xác nhận.
3. **P1 — Điều hướng:** một số luồng đang dùng anchor/drawer/modal trong cùng trang. Các luồng detail/gallery/cart/checkout/account đã được script kiểm tra; tách route cần đánh giá riêng để tránh phá state và browser history.
4. **P2 — ZIP nguồn:** chưa tìm được `sindarealest-liquid-glass-preview-21.zip` gốc gồm 28 screenshot trong tài nguyên hiện truy cập được. Artifact 78 là bộ mới 36 screenshot, không thay thế ZIP gốc.
5. **P2 — Android thật:** không có bằng chứng kiểm thử trên thiết bị vật lý; Playwright chỉ xác nhận browser mô phỏng.
6. **P2 — Backend production:** preview là chỉ đọc và cô lập; không chứng minh đăng nhập, thanh toán, tồn kho, đơn hàng hay D1/R2 production hoạt động.

## Trạng thái và tiến độ

- Bảo toàn branch; không merge/deploy production: **đã tuân thủ**.
- Source/test CI và visual preview: **pass** ở source HEAD `56a94091f63d`.
- Responsive overflow ở 20 tổ hợp viewport/theme: **0** theo audit.
- Interaction checks: **42, không có hard failure**.
- Lỗi mosaic mobile: **đã sửa và có assertion hồi quy**.
- ZIP gốc 28 ảnh, so sánh overlay/pixel trực tiếp với ảnh mẫu, nghiệm thu toàn bộ thị giác và kiểm thử Android/backend: **chưa hoàn thành**.

**Tiến độ ước tính: 70%** theo nhóm nhiệm vụ và bằng chứng; không phải điểm similarity. Đã tăng vì sửa lỗi sụp mosaic, thêm kiểm tra hồi quy, điều chỉnh hierarchy tiêu đề mobile và xác minh lại 36 screenshot/42 interaction checks. Không báo 100% khi thiếu ZIP gốc, dữ liệu hình ảnh đã xác nhận và kiểm thử thiết bị/backend.

## Tiếp theo

1. Tiếp tục sửa sai lệch thị giác có bằng chứng từ screenshot Light/Dark, đặc biệt là hero, product cards, texture nền và phân cấp Liquid Glass.
2. Kiểm tra các trạng thái/route chưa có screenshot bằng browser automation.
3. Khi ZIP gốc có thể truy cập, kiểm kê đúng 28 ảnh và so sánh từng viewport/theme.
4. Giữ branch thử nghiệm; không merge/deploy production.


## Cập nhật tiếp theo — 19/10/2026 (preview 80)

### Thay đổi code
- Commit giao diện: `68989d03bd254af8eede93628833012ac5d6389f`.
- File: `public/index.html`.
- Thêm lớp màu nhận diện riêng cho 7 kênh liên hệ (điện thoại, Zalo, Facebook, Messenger, Instagram, email, địa chỉ), tăng độ tương phản của biểu tượng và điều chỉnh kích thước icon mobile. Không thay đổi URL hoặc thông tin liên hệ.
- Đây là cải thiện thị giác có phạm vi hẹp; không được xem là hoàn tất toàn bộ footer hoặc độ giống ảnh mẫu.

### Kiểm thử sau thay đổi
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39188855230).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39188855223).
- Artifact mới: [sindarealest-liquid-glass-preview-80](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39188855223).
- Đã tải và kiểm tra artifact 80: 36 screenshot, 20 tổ hợp viewport/theme, 42 interaction checks; `passed=true`, `responsiveOverflowCount=0`, `hardFailures=[]`, không có console errors, page errors, same-origin HTTP errors hoặc failed requests.
- Đã mở và xem `mobile-390-light-full.jpg` sau thay đổi; biểu tượng kênh liên hệ thể hiện màu nhận diện rõ hơn. Đây là kiểm tra trực quan của ảnh screenshot, không phải kiểm thử thiết bị vật lý.

### Trạng thái repository
- Nhánh thử nghiệm HEAD sau thay đổi code: `68989d03bd254af8eede93628833012ac5d6389f` (sau đó có thể có commit tài liệu).
- `main` được xác minh riêng, HEAD `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; không có thao tác ghi vào `main`.
- Không deploy production.

### Tiến độ được đánh giá lại
**72% — ước tính theo các nhóm nhiệm vụ và bằng chứng, không phải điểm tương đồng pixel.** CI/test và visual preview tiếp tục đạt. Phần còn lại chủ yếu là sai lệch thị giác lớn giữa storefront hiện tại và ảnh tham chiếu, nguồn ZIP gốc 28 ảnh chưa truy cập được, cần dữ liệu ảnh/catalog đã xác nhận để thay thế fixture phù hợp, và chưa có kiểm thử Android vật lý/backend production. Không báo 100% cho đến khi các hạng mục còn lại có bằng chứng nghiệm thu.


## Cập nhật tiếp theo — 19/10/2026 (preview 84 và xác minh ZIP nguồn)

### ZIP nguồn 28 screenshot — đã tìm thấy và đọc
- ZIP `sindarealest-liquid-glass-preview-21.zip` được cung cấp trực tiếp trong cuộc hội thoại và có thể đọc trong môi trường này; không còn là tài nguyên chưa tìm thấy.
- Kiểm kê: 28 ảnh JPG, `report.html`, `visual-audit.json`.
- Audit lịch sử trong ZIP: `passed=true`; 28 screenshot; 20 tổ hợp viewport/theme; 14 kiểm tra tương tác; fixture 235 sản phẩm; `responsiveOverflowCount=0`; `hardFailures=[]`; không có page errors, console errors, lỗi HTTP cùng nguồn, failed requests hoặc write requests bị chặn.
- Đây là bộ screenshot cũ (18/10), không thay thế preview mới. Các số liệu trên mô tả kết quả lần chạy cũ chứ không xác nhận trạng thái production.

### Sửa giao diện có phạm vi hẹp
- Commit UI: `019b68f9d6bd3a2fd446182fc983b5fecad086be`.
- File: `public/index.html`.
- Nguyên nhân: hai override CSS cuối của thanh điều hướng mobile đặt nền ở opacity `.94` cho cả Light và Dark, che đáng kể nội dung/nếp nền phía dưới và làm mặt kính gần như đặc.
- Thay đổi: nền thanh điều hướng mobile Light `.94 → .78`, Dark `.94 → .82`. Giữ nguyên blur 24px, saturation 155%, viền, bóng, safe-area, vị trí cố định, 4 tab và logic điều hướng.
- Không thay đổi dữ liệu sản phẩm, giá/SKU, nghiệp vụ giỏ hàng/checkout, backend, D1/R2, secret, DNS hoặc cấu hình production.

### Sửa hồi quy và CI
- Commit cập nhật test: `f9a0d3a19c8aeda76eaefb2b56b17f60b86d03fb`.
- File: `tests/storefront-operations.test.mjs`.
- Nguyên nhân CI đỏ ngay sau thay đổi UI: test khóa cứng opacity cũ `.94`; các assertion không phản ánh material mới. Cập nhật regex/mô tả Light thành `.78`, Dark thành `.82`; giữ nguyên kiểm tra nền tab đang chọn `.96/.97` để bảo vệ độ tương phản.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39190869696).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39190869723).

### Artifact preview 84
- Artifact: `sindarealest-liquid-glass-preview-84`, artifact ID `12159638690`; source SHA `f9a0d3a19c8aeda76eaefb2b56b17f60b86d03fb`.
- 36 screenshot; 20 tổ hợp viewport/theme; 42 kiểm tra tương tác; `passed=true`; tràn ngang 0; `hardFailures=[]`; page errors 0; console errors 0; same-origin HTTP errors 0; failed requests 0; write requests blocked 0.
- Đã mở trực tiếp `mobile-390-light-viewport.jpg` và `mobile-390-dark-viewport.jpg`: thanh điều hướng 4 mục vẫn đọc được và tab active vẫn rõ, nền thanh điều hướng bớt đặc. Đây là screenshot từ Chromium/Playwright, không phải kiểm thử điện thoại Android vật lý.

### Kết quả đối chiếu với hai ảnh chủ dự án
- Đã xem ảnh tham chiếu Light/Dark và các screenshot tương ứng sau sửa; thanh điều hướng mobile là một sai lệch cụ thể đã được chỉnh.
- Sai lệch lớn vẫn còn: preview dùng fixture nhiều giày/sneaker/phụ kiện trong khi ảnh mẫu chủ yếu có túi xách/ví/thắt lưng; không được thay fixture bằng ảnh hoặc giá giả. Cần catalog/ảnh sản phẩm thật đã được chủ dự án cung cấp/xác nhận.
- Source vẫn thiên về một storefront dài với anchor và drawer/modal, khác phần nào trải nghiệm app nhiều màn hình trong ảnh mẫu. Việc chuyển thành route riêng chưa thực hiện vì có thể ảnh hưởng lịch sử trình duyệt và state; cần xử lý tách biệt, kèm test hồi quy.
- Nền crocodile texture hiện tại có chủ đích và đang được test bảo vệ; chưa thay asset nền để bắt chước nếp lụa bằng dữ liệu minh họa mới.

### Trạng thái branch và tiến độ
- Nhánh: `fix/liquid-glass-audit-2026-10-19`.
- HEAD được xác nhận qua hai workflow xanh: `f9a0d3a19c8aeda76eaefb2b56b17f60b86d03fb`.
- `main` không bị ghi; không merge production và không có thao tác deploy production từ nhiệm vụ này.
- Tiến độ ước tính sau kiểm tra: **73%** theo checklist, không phải visual-similarity score. Tiến độ tăng nhẹ do tìm/đọc ZIP nguồn, sửa một sai lệch Liquid Glass có bằng chứng, điều chỉnh test và đạt lại source/test CI cùng preview.
- Chưa nghiệm thu 100%: đối chiếu pixel/overlay đầy đủ 28 ảnh với các màn hình mới; dữ liệu/catalog phù hợp ảnh mẫu; hoàn tất mọi sai lệch thị giác lớn; kiểm thử route/state bổ sung; kiểm thử Android vật lý và backend production. Không suy diễn kết quả preview cô lập sang D1/R2, login, order hay payment production.


## Cập nhật nghiệm thu mở rộng — 19/10/2026 (preview 89)

### Liên hệ đã được căn chỉnh theo ảnh mẫu
- Commit UI: `8b00d5937a47ebaf1bdc5c861a1df2e779a48b00`; file `public/index.html`.
- Hợp nhất dòng Điện thoại và Zalo thành mục `Zalo / Điện thoại`; vẫn giữ hai hành động độc lập: mở `https://zalo.me/0827049192` và gọi `tel:+84827049192`.
- Phần địa chỉ hiển thị đủ `Hẻm 48 Võ Trường Toàn, Đà Lạt, Lâm Đồng, Việt Nam`.
- Chuyển lưới liên hệ desktop sang sáu cột ở breakpoint desktop; điều chỉnh mapping màu biểu tượng theo thứ tự sáu mục.
- Commit test: `cd4cba65b77e524b3eba72c701344f51fd9a0c77`; regression kiểm tra đúng sáu mục, hai liên kết, tiêu đề nhóm và địa chỉ.
- Test kiểm tra nguồn trên commit test đạt SUCCESS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39191624992.

### Audit mở rộng theo màn hình tại viewport mobile
- Commit script: `275aa3d582dc287bd0a70d18dfd09922923a24b0`; sau đó mở rộng tiếp tại `88cb40a1363b076e3145ecb44996f10746a35338`.
- File: `scripts/capture-liquid-glass-preview.mjs`.
- Thêm ảnh chụp theo viewport của footer contact; thêm capture riêng cho lưới sản phẩm và khu vực The Art of…; thêm ảnh crop trực tiếp vùng contact để dễ đọc và so sánh.
- Thêm runtime assertion xác nhận ở viewport 390 px có hai cột sản phẩm, đủ card, không overflow; thêm assertion contact sáu mục, địa chỉ đủ, và hai liên kết Zalo/điện thoại.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39192137749).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39192137753).
- Artifact mới nhất: `sindarealest-liquid-glass-preview-89`, ID `12160681209`, source SHA `88cb40a1363b076e3145ecb44996f10746a35338`.
- Báo cáo audit preview 89: 44 screenshot; 20 viewport/theme cases; 46 interaction checks; `passed=true`; `productFixtureCount=235`; responsive overflow 0; `hardFailures=[]`; page errors 0; console errors 0; HTTP errors 0; failed requests 0; test không phát sinh write requests.
- Các check mobile product-grid và footer contact đều PASS ở cả Light/Dark. Đã mở screenshot `products-grid-mobile-light.jpg`, `art-section-mobile-light.jpg`, `contact-section-element-mobile-light.jpg` và ảnh tương ứng Dark để xem trực tiếp.

### Những sai lệch vẫn còn — không thể xử lý bằng CSS đơn thuần
- Nguồn `data/legacy-products.json` có 235 sản phẩm: sneakers 62, loafers 52, dress-shoes 22, wallets 28, belts 22, sandals 22, watch-straps 21, phone-cases 6. Không có nhóm túi xách/handbag.
- Cả 235 sản phẩm đều chưa có giá đã được xác nhận (`price` trống/null; `sourcePriceConfirmed=true` là 0). Không điền giá giả.
- 63 sản phẩm có từ hai ảnh trở lên. Ảnh preview hero/catalog vì thế đang dùng tài sản thật của catalog (nhiều giày/dép); không thay thành túi giả để bắt chước ảnh.
- Ảnh crop khu vực contact cho thấy lưới sáu mục và địa chỉ đầy đủ, nhưng contact vẫn là một section cuối trang dài cùng phần tra cứu bảo hành, không phải route/màn hình độc lập như ảnh tham chiếu. Không tự viết lại routing/state rộng trong cùng một thay đổi nhỏ.
- Header logo hiện đang sử dụng tài sản thương hiệu có sẵn trong repo; asset `brand-emblem.png` là huy hiệu cá sấu kèm chữ SD, khác hình cá sấu nằm ngang trong ảnh tham chiếu. Không chế logo mới khi chưa có asset gốc phù hợp.
- CI/Playwright chạy trên Chromium emulation; chưa có nghiệm thu điện thoại Android vật lý hay backend production.

### Trạng thái sau cập nhật
- Branch `fix/liquid-glass-audit-2026-10-19`; HEAD được xác minh tại `88cb40a1363b076e3145ecb44996f10746a35338`.
- `main` vẫn ở `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; không có merge, deploy hay thay đổi cấu hình production từ nhiệm vụ này.
- Tiến độ đánh giá: **75%**. Đã củng cố Liquid Glass nav, gom và xác minh nội dung liên hệ, thêm regression tests và thêm screenshot/assertions cho vùng product/contact. Chưa thể nâng lên 100% vì còn độ lệch bố cục/hero so với mẫu, thiếu danh mục túi và giá sản phẩm đã xác nhận, trải nghiệm vẫn là storefront dài với drawer/modal, cùng giới hạn kiểm thử thiết bị/backend nêu trên.


## Cập nhật kiểm thử chế độ tự động — 19/10/2026 (preview 93)

### Đã kiểm tra thay đổi system theme trong trình duyệt
- Commit script cuối: `278a72943c14712b50cfc04aba52d841c1cdb308`, file `scripts/capture-liquid-glass-preview.mjs`.
- Thêm một Chromium context riêng không đặt theme thủ công và xóa `sd-theme-mode` trong `localStorage` trước khi trang khởi tạo. Context giữ nguyên các giới hạn an toàn: chỉ GET/HEAD cùng nguồn, mock địa chỉ offline, không dùng backend/DB thật.
- Ba runtime check mới:
  1. OS Light + mode `auto` → trang khởi động Light.
  2. Giả lập OS chuyển sang Dark → trang chuyển Dark trong khi mode vẫn là `auto`.
  3. Giả lập OS chuyển lại Light → trang chuyển lại Light, mode vẫn là `auto`.
- Cả ba check đều PASS trong `visual-audit.json` của preview 93.

### Sự cố trung gian trong test harness đã được xử lý
- Lượt đầu thêm auto-theme test ghi nhận đúng các trạng thái Light/Dark nhưng audit tổng hợp FAIL vì context bổ sung chưa mock `https://provinces.open-api.vn/api/v2/p/`; yêu cầu ngoài bị chặn và sinh một console error `ERR_FAILED`. Không tắt console audit.
- Lượt sửa fixture kế tiếp có regex route escape sai, CI báo `SyntaxError: Invalid regular expression flags`. Đã sửa regex bằng cách sao chép chính xác pattern đang dùng ở các context Light/Dark hiện có.
- Commit cuối `278a729...` đạt cả source/test và visual preview; không còn console error hoặc request ngoài bị chặn trong audit mới.

### Bằng chứng cuối hiện tại
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39192739990).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39192739985).
- Artifact `sindarealest-liquid-glass-preview-93`, ID `12160841603`, source SHA `278a72943c14712b50cfc04aba52d841c1cdb308`.
- Kết quả preview 93: 44 screenshot, 20 responsive viewport/theme cases, 49 interaction checks, `passed=true`, 235 sản phẩm fixture đọc-only, overflow 0, hard failures 0, page errors 0, console errors 0, same-origin HTTP errors 0, failed requests 0, write requests 0, external requests blocked 0.
- Trạng thái tổng thể vẫn **76%**; kiểm thử tự động theme đã phủ tốt hơn, nhưng chưa làm biến mất khoảng cách giữa dữ liệu/catalog thật hiện có và ảnh tham chiếu, chưa biến các drawer thành mọi route riêng, và chưa có kiểm thử Android vật lý/backend production.
- Nhánh trước lần cập nhật tài liệu là `fix/liquid-glass-audit-2026-10-19`, code HEAD `278a729...`. Không merge/deploy production.

## Bàn giao tiếp tục — 19/10/2026 (preview 121)

### Công việc bổ sung đã thực hiện trên nhánh kiểm thử
- Thêm chức năng sản phẩm yêu thích ở trang chi tiết: trạng thái trái tim có `aria-pressed`, lưu cục bộ bằng `localStorage`, mở lại đúng sản phẩm, bỏ yêu thích và trạng thái rỗng.
- Bổ sung màn hình “Đơn hàng của tôi” trong ngăn tài khoản. Chỉ ghi nhận mã yêu cầu/trạng thái/danh sách sản phẩm/ngày gửi sau phản hồi thành công từ API; không lưu họ tên, số điện thoại, email hoặc địa chỉ vào lịch sử cục bộ. Hiển thị rõ lịch sử chỉ nằm trên thiết bị, chưa đồng bộ tài khoản.
- Bổ sung kiểm thử tương tác cho lưu/mở/xóa yêu thích và lịch sử yêu cầu đặt hàng trong Light/Dark. API đặt hàng trong kiểm thử được mock bằng fixture trong bộ nhớ; không gọi backend thật và không ghi D1.
- Sửa kiểm thử vòng focus bàn phím của tài khoản để lấy phần tử đầu/cuối thực tế từ DOM sau khi bổ sung các mục menu, thay vì giữ giả định cũ rằng “Liên hệ” luôn là phần tử cuối.
- Sửa chú thích trong tài khoản để không còn nói sai rằng địa chỉ/lịch sử chưa có: nêu đúng chức năng lưu cục bộ, không có đăng nhập khách hàng hoặc đồng bộ giữa thiết bị.

### Kết quả kiểm thử đã xác minh
- Source/test validation: [SUCCESS — run 39197424120](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197424120).
- Liquid Glass isolated visual preview: [SUCCESS — run 39197424021](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197424021).
- Artifact: `sindarealest-liquid-glass-preview-121`, ID `12162785474`, source SHA `e22c87ff8d778a00e25580437e0abbc5fc0f714d`.
- Preview 121: 46 screenshots, 67 interaction checks, `passed=true`, 235 sản phẩm fixture chỉ đọc, tràn ngang 0, hard failures 0, page errors 0, console errors 0, same-origin HTTP errors 0, failed requests 0, write requests bị chặn 0, yêu cầu ngoài bị chặn 0. Có 2 yêu cầu POST `/api/orders` được mock riêng trong bộ nhớ phục vụ kiểm thử lịch sử; không chuyển tới backend thật.

### Tiến độ cập nhật
- Checklist triển khai/UX hiện ước tính **80%** (không phải phần trăm pixel-match). Các luồng tài khoản cục bộ và kiểm thử đã được mở rộng, nhưng chưa đủ bằng chứng để gọi là hoàn thiện 100%.
- Còn chặn 100%: chưa xác minh pixel-diff với toàn bộ 28 ảnh tham chiếu ban đầu; chưa có tài sản/dữ liệu túi xách và giá sản phẩm được chủ cửa hàng xác nhận; cần tiếp tục so khớp bố cục hero/khoảng cách/tỷ lệ thẻ với ảnh mẫu; chưa kiểm thử thiết bị Android vật lý; chưa có kiểm thử đầu-cuối trên Cloudflare production với D1/R2/đơn hàng thật; chưa xác minh mọi trạng thái lỗi/rỗng/keyboard/safe-area và hiệu năng trên nhiều thiết bị thực.
- Không có dữ liệu sản phẩm, giá, chứng nhận, chính sách hoặc hình ảnh nguồn mới nào được tự bịa để làm đầy phần còn thiếu.

### Ranh giới an toàn triển khai
- Làm việc trên `fix/liquid-glass-audit-2026-10-19`; không merge vào `main`, không deploy production, không thay đổi binding/D1/R2 thật.
- Các luồng yêu thích, địa chỉ giao hàng và lịch sử yêu cầu hiện là lưu cục bộ; không được mô tả thành tài khoản khách hàng hoặc lịch sử đồng bộ.



## Cập nhật regression audit — preview 128

- Code SHA đã kiểm thử: `90caa026f383419cecc777431d3ed6facbf1be82`.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197993223).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197993162).
- Artifact: `sindarealest-liquid-glass-preview-128.zip`, ID `12162004111`.
- Preview 128: 46 screenshots, 71 interaction checks, 235 fixture products, `passed=true`, overflow 0, page errors 0, console errors 0, HTTP errors 0, failed requests 0, write requests 0 and external requests blocked 0.
- Regression được phát hiện và sửa: CSS `display:grid` đã làm panel địa chỉ giao hàng hiện ngay trong menu tài khoản dù mang thuộc tính `hidden`. Đã thêm quy tắc ẩn tường minh cho `#accountAddressView[hidden]` và assertion tự động cho panel địa chỉ/yêu thích/đơn hàng.
- Regression được phát hiện và sửa tiếp: tự điền địa chỉ checkout có thể đọc danh sách xã/phường trước khi request hiện hành hoàn tất. Đã chờ danh sách lựa chọn tải xong trước khi chọn xã/phường đã lưu. Preview 128 xác nhận tự điền đúng tên, số điện thoại, tỉnh, xã/phường và đường ở cả Light/Dark.
- Kiểm thử focus trap của account và checkout đều PASS ở Light/Dark. Yêu thích, lịch sử yêu cầu đặt hàng và trạng thái rỗng tiếp tục PASS.
- Các kết quả checkout và địa chỉ hành chính vẫn dùng fixture offline; không đại diện cho thanh toán hoặc backend production.

### Trạng thái hoàn thành sau preview 128
- Checklist hiện vẫn ước tính **80%**, chưa đủ căn cứ nâng lên 100%. Việc sửa regression làm tăng độ tin cậy của giao diện, nhưng không giải quyết những giới hạn lớn: chưa pixel-diff đủ 28 ảnh gốc, thiếu dữ liệu/tài sản túi xách và giá được xác nhận, một số màn hình vẫn dùng drawer/modal, chưa có kiểm thử Android vật lý và chưa có kiểm thử staging backend/thanh toán thật.
- Không merge/deploy production. `main` giữ nguyên SHA đã xác nhận `f38cefe4647b33bd42f9018fde00c420ee5c7c66`.

## Kiểm thử sổ địa chỉ và prefill checkout — preview 128

- Preview 126 phát hiện checkout có thể đã điền họ tên/số điện thoại/đường phố trong khi xã/phường chưa hoàn tất. Điều kiện kiểm thử được chỉnh để chờ đủ cả tỉnh và xã/phường, không đọc trạng thái giữa chừng.
- Điều tra tiếp cho thấy luồng sản phẩm cần chờ danh sách xã/phường được tải xong trước khi chọn địa chỉ đã lưu. Đã sửa `prefillCheckoutFromLocalAddress()` để chờ options của ward trước khi đặt giá trị và mã xã/phường.
- Thêm kiểm thử hai theme cho sổ địa chỉ: nhập địa chỉ mẫu offline, lưu bằng thao tác rõ ràng, xác minh localStorage và thông báo quyền riêng tư; sau đó mở checkout và xác minh họ tên/số điện thoại/tỉnh/xã/đường phố được điền sẵn mà vẫn có thể sửa.
- Preview cuối cho code fix: [Liquid Glass isolated visual preview — SUCCESS, run 39197993162](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197993162).
- Artifact `sindarealest-liquid-glass-preview-128`, ID `12162004111`, source SHA `90caa026f383419cecc777431d3ed6facbf1be82`.
- Preview 128: 46 screenshots, 71 interaction checks, `passed=true`, overflow 0, hard failures 0, page/console/HTTP errors 0, failed requests 0, write requests bị chặn 0, external requests bị chặn 0. Hai POST đặt hàng là fixture mock trong bộ nhớ, không gửi tới backend.
- Source/test validation: [SUCCESS — run 39197993223](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39197993223).
- Đánh giá vẫn **80%**. Kết quả này củng cố các luồng tương tác và responsive nhưng không thay thế đối chiếu pixel với ảnh mẫu, thử trên Android thật hay xác minh backend production. Các mục chặn 100% trong phần trước vẫn còn nguyên.



## Cập nhật ảnh trạng thái tài khoản và thumbnail — preview 133

- Code SHA: `32199a3f60200fb038143b4d3663eb728ab03c79`.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39198676697).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39198676769).
- Artifact: `sindarealest-liquid-glass-preview-133.zip`, ID `12162787072`.
- Preview 133: 52 screenshot, 73 interaction checks, `passed=true`, overflow 0, page errors 0, console errors 0, HTTP errors 0, failed requests 0, write requests 0, external requests blocked 0.
- Bổ sung screenshot riêng ở Light/Dark cho ba màn hình tài khoản: sổ địa chỉ, sản phẩm yêu thích, lịch sử yêu cầu đặt hàng.
- Phát hiện và xử lý thumbnail yêu thích chưa kịp tải lúc chụp: ảnh trong danh sách yêu thích chuyển sang `loading="eager"`; test mới chờ ảnh có `naturalWidth > 0`. Thumbnail thật đã load thành công trong cả Light và Dark.
- Các luồng địa chỉ, prefill checkout, yêu thích, lịch sử đơn hàng và focus trap vẫn PASS. Checkout tiếp tục dùng fixture mock offline, không phải giao dịch/backend production.
- Mức checklist vẫn **80%**. Chưa có căn cứ tăng lên 100% vì các blocker về pixel-diff đủ ảnh mẫu, tài sản/dữ liệu sản phẩm được xác nhận, Android vật lý và backend/thanh toán staging thật vẫn chưa giải quyết.


## Cập nhật kiểm thử mới nhất — preview 138

- Code SHA: `9fff67e67fe44d0ab1ecb28f132b6777f9a53a49`.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39199639948).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39199639981).
- Artifact: `sindarealest-liquid-glass-preview-138.zip`, ID `12163407410`.
- Preview 138: 52 ảnh chụp, 73 mục kiểm tra tương tác, 20 viewport ở 2 theme, 0 horizontal overflow, 0 page error, 0 console error, 0 same-origin HTTP error, 0 failed request; `passed=true`.
- Đã kiểm tra nội dung artifact trực tiếp: các ảnh Light/Dark cho trang chủ, danh mục, chi tiết, giỏ, checkout, liên hệ/bảo hành, yêu thích, sổ địa chỉ và lịch sử yêu cầu đặt hàng đều được đóng gói. Dữ liệu sản phẩm là fixture chỉ đọc; 2 yêu cầu đơn hàng là fixture Playwright trong bộ nhớ, không gửi đến D1/backend.
- Main vẫn giữ SHA `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; không merge và không deploy production.
- Tiến độ checklist hiện tại vẫn **80%**. Preview PASS chứng minh các kiểm tra tự động đã khai báo chạy qua, không chứng minh mọi màn hình giống ảnh mẫu hoặc mọi nghiệp vụ production đã hoàn tất. Các blocker còn lại vẫn là đối chiếu pixel với đủ ảnh gốc, dữ liệu SKU/giá/tồn kho đã được xác nhận, trải nghiệm trên Android vật lý và kiểm thử backend/thanh toán staging.


## Cập nhật dữ liệu SKU và kiểm thử — preview 148

- Code SHA đã kiểm thử: `fa3146f4ffff840a0905320f8fb5a07670d5e94d`.
- [Validate source and tests — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39201964359).
- [Liquid Glass isolated visual preview — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39201964346).
- Artifact: `sindarealest-liquid-glass-preview-148.zip`, ID `12164466319`.
- Preview 148: 52 ảnh chụp, 73 kiểm tra tương tác, 20 viewport/theme, 0 tràn ngang, 0 page error, 0 console error, 0 HTTP error, `passed=true`.
- Phát hiện từ kiểm tra nguồn: 235 bản ghi fixture có mã SD001…SD235 được tạo cho bố cục thử nghiệm, không phải bảng SKU được thương hiệu xác nhận. Đã thêm cờ `skuVerified:false` để giữ tính tương thích dữ liệu nội bộ nhưng không hiển thị các mã này như SKU thật; catalog, chi tiết, yêu thích, giỏ hàng, lịch sử yêu cầu và nội dung Zalo hiện báo rõ khi mã SKU chưa được cung cấp. URL sản phẩm thử nghiệm dùng ID/slug khi SKU chưa được xác nhận. SKU hợp lệ từ dữ liệu quản trị thực vẫn được hỗ trợ.
- Thêm regression assertions cho nguồn gốc SKU và cập nhật kiểm tra gallery để xác nhận URL dùng ID/slug khi mã SKU chưa xác nhận. Toàn bộ test source/migration và preview đã PASS sau khi cập nhật các assertion tương ứng.
- Tiến độ checklist được điều chỉnh từ 80% lên **81%** do đóng được một lỗi dữ liệu có tác động trực tiếp đến khách hàng; đây không phải điểm số pixel similarity.
- Chưa merge/deploy. `main` vẫn là SHA đã xác nhận `f38cefe4647b33bd42f9018fde00c420ee5c7c66`.
- Blocker để đạt 100% vẫn còn: chưa đối chiếu pixel với đầy đủ bộ ảnh gốc, cần bảng SKU/giá/tồn kho được xác nhận, chưa test trên thiết bị Android vật lý, chưa kiểm thử backend/thanh toán trên staging thật và chưa xác minh mọi màn hình/luồng production end-to-end.


## Cập nhật SKU chưa xác minh — 19/10/2026

- Nhánh: `fix/liquid-glass-audit-2026-10-19`; không merge/deploy production.
- Commit dữ liệu: [`32ab97b48bba64fc5a694dcb232e62391608605c`](https://github.com/chichute5500/Sindarealest-admin/commit/32ab97b48bba64fc5a694dcb232e62391608605c).
- Commit regression test: [`8881bb30ddeea8181ac4d15a49bd303b738418ca`](https://github.com/chichute5500/Sindarealest-admin/commit/8881bb30ddeea8181ac4d15a49bd303b738418ca).
- Đã xác minh trực tiếp dữ liệu trên nhánh sau cập nhật: 235 bản ghi; cả 235 bản ghi có `skuVerified:false` và `sku:null`; không còn SKU tạo tự động dạng SD001…SD235 trong trường SKU fixture.
- Cập nhật assertion trong `tests/storefront-operations.test.mjs` để bắt buộc SKU của fixture chưa xác minh phải là `null`. Các helper storefront hiện tại vẫn ẩn SKU chưa xác minh và hiển thị trạng thái “Chưa được cung cấp”; CTA Zalo giữ tên sản phẩm và không đưa chuỗi `null`/SKU giả vào lời nhắn.
- Trạng thái CI sau các commit trên: chưa xác nhận được kết quả chạy mới cho HEAD này; trạng thái commit API chưa trả về status checks. Không dùng kết quả Preview 138 hoặc Preview 148 làm bằng chứng cho thay đổi mới.
- Chưa tuyên bố hạng mục SKU hoàn tất cho đến khi workflow source/test và visual preview chạy trên HEAD mới nhất và được kiểm tra kết quả.


## Cập nhật hồi quy SKU trống và preview 160 — 19/10/2026

- Code được chạy kiểm thử: `ad7a030ef96ccc056c788b8012668f44eadcbf5d`.
- [Liquid Glass isolated visual preview #160 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39203914769).
- Artifact đã tải và mở trực tiếp: [`sindarealest-liquid-glass-preview-160.zip`](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39203914769); artifact ID `12165275941`, SHA-256 `5abde969f0dfcd55f1f6e118d53a70fce1b42bf0638955bfeace83e9c92b61b5`.
- Đã xác minh file `visual-audit.json` bên trong artifact: `passed=true`, 52 screenshot, 77 interaction assertions, 20 viewport/theme combinations, 0 horizontal overflow, 0 hard failures, 0 console errors, 0 page errors, 0 same-origin HTTP errors, 0 failed requests. Artifact có đủ ảnh Light/Dark cho các viewport mobile/tablet/desktop và các trang chính.
- Regression assertions mới chạy PASS ở cả Light và Dark:
  - Chi tiết sản phẩm hiển thị “Mã SKU: Chưa được cung cấp” và dùng URL ID/slug thay vì tạo SKU giả.
  - CTA mở đúng `https://zalo.me/0827049192`, lời nhắn giữ tên sản phẩm và ghi rõ mã SKU chưa được cung cấp; không chứa `null`, `undefined` hoặc mã SD001…SD235 chưa xác minh.
  - Hai dòng sản phẩm trong giỏ đều hiển thị trạng thái SKU chưa được cung cấp, không lộ mã giả.
- Trong cùng workflow, `npm test` và `npm run check` đều hoàn thành thành công trước bước Chromium/preview.
- Một lượt preview trước đó (#159) bị hủy khi workflow mới hơn thay thế trong hàng đợi; không dùng lượt đó làm kết quả cuối. Preview #160 là lượt mới nhất đã xác nhận SUCCESS.
- Phạm vi kiểm thử vẫn là preview local, dữ liệu fixture chỉ đọc và đơn hàng mô phỏng trong bộ nhớ. Đây không phải kiểm thử Android vật lý, D1/R2 production hay thanh toán thật.
- Ước tính checklist code/kiểm thử tự động: **82%**. Tỷ lệ tổng thể chưa thể là 100% vì còn thiếu đối chiếu pixel với đầy đủ 28 ảnh gốc, xác minh tài sản/dữ liệu thương mại, thử Android vật lý, backend/staging thật và kiểm thử end-to-end các tích hợp production.
- Không merge vào `main`; không deploy production.


## Xác nhận lại sau cập nhật tài liệu — preview 173

- Commit tài liệu: `9f061b2424f9585ec54b28057db3e1e4b5b1732d`; không thay đổi source code so với code đã kiểm thử tại `ad7a030ef96ccc056c788b8012668f44eadcbf5d`.
- [Preview 173 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39208596153), chạy trên nhánh fix sau cập nhật tài liệu.
- Đã tải và mở artifact `sindarealest-liquid-glass-preview-173.zip`, ID `12166473906`; SHA-256 `81c2f128618918321dc63b71c71caa0104f446191dca08b0c2b6ee29e0b0bd96`.
- Xác minh trực tiếp `visual-audit.json`: `passed=true`; 52 screenshot; 77 interaction checks; 20 viewport/theme combinations; 0 horizontal overflow; 0 hard failures; 0 console/page/HTTP errors; 0 failed requests; không có tương tác thất bại.
- Bốn assertion liên quan SKU/Zalo/giỏ hàng PASS trên cả Light và Dark. Artifact mới nhất đã được tải về và kiểm tra nội dung, không chỉ dựa vào tên artifact.
- `npm test` và `npm run check` đều PASS trên workflow này. Dữ liệu sản phẩm vẫn là fixture chỉ đọc, các yêu cầu đặt hàng chỉ mô phỏng trong bộ nhớ.
- Tình trạng đối chiếu ảnh gốc, kiểm thử Android vật lý và backend/thanh toán production không thay đổi; không được tính là hoàn thành.


## Accessibility-contract regression and preview 176 — 19/10/2026

- Added `tests/storefront-accessibility-contract.test.mjs` and included it in the `npm test` suite. The checks enforce the presence of reduced-motion CSS, keyboard focus indicators, top/bottom safe-area handling, dialog semantics, polite live regions, a 44px minimum touch-target rule, and Escape-key handling. These are source contracts, not a standalone WCAG certification.
- Commits: `e87ebb871cc529ec556a7bcd3cafb16c31f5eef2` (new test); `b1055b8bb8b9bdf497b2f1661f63845a27de5f33` (suite wiring).
- [Liquid Glass preview #176 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39209189491). Both `npm test` (including the new test) and `npm run check` passed; Chromium preview and screenshot audit also passed.
- Artifact `sindarealest-liquid-glass-preview-176.zip`, ID `12167246043`, was downloaded and opened directly. SHA-256: `b151d77c5dd0b2618198104a2b3a95b3efbb9fb5392f3de162fd8f51c01e08cb`.
- Verified `visual-audit.json`: `passed=true`; 52 screenshots; 77 interaction checks; 20 responsive viewport entries for 10 viewport widths across Light/Dark; zero horizontal overflow; zero hard failures; zero console errors, page errors, same-origin HTTP errors, failed requests, or failed interaction assertions.
- Branch comparison against `main`: fix branch is ahead by 188 commits and behind by 0 at this check; no merge or production deploy was performed.
- Historical note, superseded by the later correction below: during this earlier check the ZIP had not yet been identified. A subsequent search of the attachments at the start of the conversation found `70041.png`, `70042.png`, and `sindarealest-liquid-glass-preview-21.zip`; the two PNGs are the user's actual Light/Dark target mockups.
- Current checklist estimate: **83% overall**. Source/tests/isolated preview are stronger after this change, but the remaining 17% is not safely claimable as complete without the original reference assets, physical Android verification, and authorized staging/production integration checks (D1/R2, admin operations, real orders/payment and watermark access controls). No production writes were made.


## Final documentation-commit verification — preview 177

- [Preview #177 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39209419752) ran on documentation commit `4de8f100b3bedcb41751181c84de95d761b42494`; no storefront source changed after the passing preview #176.
- Downloaded and opened artifact `sindarealest-liquid-glass-preview-177.zip`, ID `12167525438`, SHA-256 `4e52bd02989f4ee66d399ac91508ccfe5fa1d40dd45178e5d855b77fa9380b60`.
- Direct artifact verification: `passed=true`; 52 screenshots; 77 interactions; 20 viewport/theme entries; 0 overflow; 0 hard failures; 0 console/page/HTTP errors; 0 failed requests or interaction assertions.
- `npm test`, `npm run check`, Chromium capture and artifact upload all completed successfully. This confirms the documentation commit did not break the automated preview.


## SKU fallback regression and Preview 181 — 19/10/2026

- Removed SKU-coded fallbacks from featured-product selection. Featured cards now choose by category and gallery availability, not unverified commerce codes.
- Added `tests/sku-missing-data-contract.test.mjs` and wired it into the main `npm test` chain. It checks empty/missing SKU presentation, truthful Zalo consultation fallback, and the absence of the former hard-coded SKU fallback list.
- Commits: `13b1ff2f86b09ea693c5cea71df6f5540e6c0403` (selector fix), `5ecf128e25d5544106c28e8d84eff23fc12930da` (regression test and test wiring).
- [Preview #181 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39210023818). All steps completed successfully: complete project tests, source/migration checks, isolated Chromium install, read-only preview, screenshot/responsive audit, and artifact upload.
- Downloaded and inspected artifact `sindarealest-liquid-glass-preview-181`, ID `12166898786`. The embedded `visual-audit.json` reports `passed=true`, 52 screenshots, 77 interaction checks, 20 theme/viewport entries, 0 responsive overflow, 0 hard failures, 0 console errors, 0 page errors, 0 same-origin HTTP errors, and 0 failed requests.
- Fixture contains 235 products and is read-only; unknown prices/stock were not modified. These are isolated preview results, not proof of production backend, real checkout/payment, or physical Android behavior.
- SKU source audit confirms card, detail, favorite, cart, order-history, warranty and Zalo UI paths use a safe missing-SKU fallback or omit SKU where appropriate. Product routing falls back to technical ID/slug when SKU is missing; technical identifiers are not displayed as commercial SKU.
- Overall estimate remains **84%** pending reference-pack/pixel comparison, Android-device verification, and authorized real/staging backend checks (D1/R2, admin CRUD, order/payment and watermark access control). No merge to `main` or production deployment occurred.


## Audit correction and requirements checklist — 19/10/2026

This entry supersedes earlier statements in this document that the `sindarealest-liquid-glass-preview-21.zip` archive could not be found. The exact original attachments have now been identified and inspected:

- `70041.png` — user's **Light Mode target mockup**, 1024 × 1536 px; a 12-panel mobile UI reference collage.
- `70042.png` — user's **Dark Mode target mockup**, 1024 × 1536 px; the matching 12-panel dark UI reference collage.
- `sindarealest-liquid-glass-preview-21.zip` — inspected directly at `/mnt/data/sindarealest-liquid-glass-preview-21.zip`. It contains 28 old **automated website preview screenshots**, plus `report.html` and `visual-audit.json` (30 archive entries total). Its audit reports 235 fixture products, `passed=true`, 20 responsive entries, 14 interactions, zero overflow and zero recorded browser/network errors.

Important distinction: the two PNGs are the actual target mockups from the user. The ZIP is the older site-preview baseline used for comparison; it is not source code and is not a substitute for the target mockups. The ZIP’s old audit passing only means the previous automated checks passed, not that its interface matches the target images. Visual acceptance must compare current screenshots against `70041.png` and `70042.png`, screen by screen. Any sample prices/SKU shown in a mockup are not automatically verified business data and must not be invented into the catalog.

### Revalidated source/tests
- Source/test commit validated by preview #181: `b79fd25491913003e7110eb2aaf617cf982bcd36`.
- [Preview #181 — SUCCESS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39210023818); artifact ID `12166898786`, SHA-256 `d8e900c7df20c57fdef9c212e8e4ebd4a459b7a797426d10db2df8d691295655`.
- Directly read `visual-audit.json` from the downloaded artifact: 52 screenshots, 77 interaction checks, 20 viewport/theme entries, 235 fixture products, `passed=true`, no overflow, no hard failures, zero console/page/same-origin HTTP errors and zero failed requests.
- `npm test`, `npm run check`, Chromium capture, screenshot audit and artifact upload all completed successfully.
- Fixture integrity check: all 235 fixture records have `skuVerified:false` and `sku:null`; featured product selection no longer uses hard-coded unverified SKU identifiers. Source assertions cover missing SKU display, Zalo message fallback and accessibility contracts.

### Requirements status by workstream

| Workstream | Status | Evidence / outstanding work |
|---|---|---|
| Branch/production safety | Done | Work stayed on `fix/liquid-glass-audit-2026-10-19`; no main merge or production deploy. Compare to main showed fix branch ahead and not behind at the last check. |
| SKU and missing-data safety | Automated pass | All 235 fixture SKU fields blank/unverified; card/detail/cart/Zalo/order-history/warranty paths use safe fallback or omit unverified SKU; regression test included in `npm test`. Verify new admin-created commercial SKUs only from authorized real business data. |
| Source, migration and isolated browser tests | Automated pass on #181 | `npm test`, `npm run check`, Chromium, responsive and interaction audit pass in a local read-only preview. |
| Theme/responsive/UI interactions | Automated partial pass | 10 viewport sizes × Light/Dark, 77 interaction assertions, zero overflow and browser/request errors. Automation does not confirm subjective similarity or physical-device rendering. |
| User target mockups | Partial; visual gaps remain | Compared the conversation's 70041/70042 mockups with #181 screen captures. The structural pattern (two-column hero, six benefit tiles, order CTA, two-column catalogue, detail/cart/account drawers and bottom nav) is represented, but visual match is not pixel-verified. Major content gap: the target mockups show handbag products and prices/SKUs that are not verified in the fixture; do not fabricate those. Target's horizontal crocodile silhouette logo and flowing liquid-fold background also differ from the current SD emblem / crocodile-scale background and need authenticated brand asset/design approval before replacement. |
| Baseline ZIP | Found and inspected | `preview-21.zip` is available as an old automated baseline. It should not be mislabelled as the target mockup pack and cannot substitute for a target-image pixel comparison. |
| Category/product catalogue | Partially blocked by source data | Fixture categories: sneakers, loafers, dress shoes, wallets, belts, sandals, watch straps and phone cases; no handbag category. Do not invent bag entries, prices, live stock or product SKUs. |
| Accessibility/keyboard/reduced motion/safe areas | Automated partial pass | Source contracts and modal/drawer/focus/Escape tests are present. Still requires physical Android and assistive-technology checks, plus an independent contrast/semantics review for a full accessibility sign-off. |
| Contact, warranty, customer account and order request | Fixture-level pass only | Local storage and offline mocks are covered by automated assertions; no evidence this confirms actual production records or warranty/transaction writes. |
| D1/R2/admin CRUD/authentication/orders/payment/watermark permissions | Not production-verified | Requires authorized staging/production access and real binding/configuration evidence. Do not make live writes or transactions without explicit approval. |
| Android physical-device acceptance | Not done | No physical Android device is connected to this automation environment. |
| Progress documentation | Updated by this correction | Historic entries remain as history; this newer checklist corrects the ZIP availability and labels evidence scope precisely. |

### Current completion estimate

**84% of the code-and-automated-test checklist**, not 84% pixel similarity and not production readiness. The unfinished portion is concentrated in (1) visual comparison and adjustments against the actual 12-screen reference mockups, (2) missing verified catalog/logo assets, (3) physical Android acceptance, and (4) authorized staging/production integration acceptance. The existing user-provided reference composites establish the desired appearance, but the current app is not yet identical to them. No 100% completion claim is made while these objective blockers remain.


## Bổ sung bằng chứng kiểm toán — 19/10/2026 (lần cập nhật sau SHA `37111af3b8863b23f38f2aff1c35a2a67067efbf`)

### 1. Source và phạm vi an toàn

- SHA mã nguồn đã được kiểm thử: `37111af3b8863b23f38f2aff1c35a2a67067efbf`.
- Nhánh làm việc: `fix/liquid-glass-audit-2026-10-19`.
- `main` tại lần đối chiếu này vẫn là `f38cefe4647b33bd42f9018fde00c420ee5c7c66`; không merge, không deploy và không sửa dữ liệu production.
- Commit `60b2ffc8b8bb3cbfb3c48a997b51726fa530148c` từng làm CI thất bại do thiếu dấu đóng hàm trong `functions/_lib.js`; lỗi cú pháp được sửa trong `3ad1550fa67d385787f9feb984eb5ac8b4c0b0e1`. Không sử dụng run thất bại của commit trung gian làm bằng chứng nghiệm thu.
- Lớp response sản phẩm công khai chỉ trả `price` khi công tắc `show_prices` bật, `source_price_confirmed` đã xác nhận và giá là số nguyên VND không âm an toàn. Giá thiếu/chuỗi rỗng/âm/thập phân không được chuyển thành số tiền công khai.
- Endpoint tạo đơn `functions/api/orders.js` đã được sửa cùng nguyên tắc: snapshot `order_items`, `line_total`, subtotal và total đều để `NULL` khi giá chưa xác nhận, bị ẩn hoặc không hợp lệ. Điều này ngăn giá D1 sai kiểu/âm bị lưu vào snapshot đơn hàng dù tổng đơn đang chờ xác nhận.

### 2. Kết quả CI trên SHA mã nguồn đã kiểm thử

- Validation workflow #2674, run [39217253313](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39217253313): **SUCCESS** trên SHA `37111af3b8863b23f38f2aff1c35a2a67067efbf`. Các bước `npm run check` và `npm test` đều thành công.
- Visual preview workflow [39217253318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39217253318): **SUCCESS** trên cùng SHA; các bước project tests, migrations/check, cài Chromium, capture Light/Dark và upload artifact đều thành công.
- Artifact đầy đủ: `sindarealest-liquid-glass-preview-198`, artifact ID `12170017749`, SHA-256 `sha256:074d76d3fc8296fb0b1426746a4b004a1c6f7873baf908ce0733b9d436ee9b77`. ZIP gồm 54 ảnh JPG, `report.html` và `visual-audit.json`.
- Audit JSON: `passed=true`; 235 fixture sản phẩm; 20 kiểm tra viewport/theme; 91 mục tương tác; 0 hard failures; 0 overflow; 0 lỗi console, page, HTTP hoặc request thất bại; 0 request ghi dữ liệu trong preview.

### 3. Kiểm chứng giá công khai và checkout

Bộ kiểm thử chạy trong trình duyệt Chromium với response API được intercept trong bộ nhớ. Giá `1.234.567₫` là dữ liệu tổng hợp chỉ dành cho test, không được ghi vào fixture/catalog và không chụp vào screenshot sản phẩm thông thường. Mọi POST đơn hàng trong ngữ cảnh audit đều bị chặn; số lần gọi POST trong các kịch bản giá là 0.

Kết quả Light và Dark đều **PASS** cho:
1. Catalog legacy không có giá đã xác minh: không lộ giá trên thẻ; giá chi tiết ban đầu bị ẩn.
2. Giá xác nhận + bật công tắc: 8 card catalog và 4 featured card hiển thị; trang chi tiết và giỏ hàng hiển thị `1.234.567₫` nhất quán.
3. Giá chưa xác nhận: card/featured/detail không hiển thị giá; giỏ hàng thể hiện “Chờ xác nhận giá” và “Giá sẽ được xác nhận”; checkout không hiển thị số tiền tổng hợp.
4. Giá `NULL`: hành vi ẩn/đợi xác nhận giống giá chưa xác nhận.
5. Checkout được mở để kiểm tra UI nhưng không gửi đơn, không ghi DB và không gọi API tạo đơn.

Regression tests cũng kiểm tra ở lớp serializer D1/public response và endpoint tạo đơn cho: giá âm, thập phân, chuỗi rỗng, cờ xác nhận false, công tắc công khai tắt và trường hợp giá hợp lệ được xác nhận. Đây là kiểm chứng bằng fake/in-memory DB trong test, không phải nghiệm thu môi trường D1 production.

### 4. Screenshot và đối chiếu ảnh mẫu

- Đã tạo đủ 54 screenshot trên SHA mã nguồn nêu trên, bao gồm Light/Dark, mobile 320/360/375/390/412/430 px, tablet 768/1024 px, desktop 1366/1440 px, homepage/full page, grid, detail/fullscreen, cart, checkout, account, favorites, orders, address, art, contact/footer, warranty và order-process.
- Các ảnh mẫu composite có trong Library đã được mở để đối chiếu: “Bộ giao diện SinDarealest sáng tối sang trọng.png”, “Bộ sưu tập giao diện SinDarealest sang trọng.png”, “Bảng thiết kế giao diện da cá sấu sang trọng.png” và “Giao Diện Thời Trang Da Cá Sấu Hai Tông Màu.png”.
- Kết quả đối chiếu ở mức bố cục/tổng thể: nền sáng dạng da bạch tạng, nền tối da cá sấu và vật liệu glass của bản preview có hướng thẩm mỹ tương đồng với bộ mẫu. Tuy nhiên, không được gọi là pixel-match: một số board là moodboard ghép nhiều layout và chứa hình/giá/SKU minh họa không phải dữ liệu thương mại. Trang thực tế hiện vẫn có hero chia cột chữ + ảnh giày thay vì hoàn toàn giống các board có tiêu đề căn giữa; cấu trúc một số khu vực cũng không trùng tuyệt đối. Không sao chép giá/SKU/sản phẩm giả từ board vào catalog.
- Contact sheets Light/Dark và dải viewport được tạo ngoài repo từ chính artifact #198; ZIP gốc giữ nguyên toàn bộ ảnh cùng audit report.

### 5. Tiến độ sau đợt này và blocker còn lại

- **Phạm vi code + kiểm thử tự động của đợt giá/UI audit: PASS** trên SHA `37111af3b8863b23f38f2aff1c35a2a67067efbf`.
- Ước tính checklist code và tự động hóa tổng thể: **khoảng 90%** (tăng từ 84% trước đợt này do public API price gating, order snapshot sanitation, test hồi quy và preview mới đều PASS). Không phải tỷ lệ pixel-match và không phải độ sẵn sàng production.
- Các hạng mục chưa được coi là hoàn thành: test trên thiết bị Android thật; kiểm tra D1/R2/admin/auth/orders/warranty trong staging có quyền truy cập; kiểm chứng upload/ảnh riêng tư/watermark ở endpoint thật; dịch vụ tìm kiếm Taobao/1688 và quyền/plan Workers AI; triển khai và thử thanh toán trên staging; đối chiếu thủ công chi tiết từng screen với bộ ảnh chuẩn và ghi danh sách sai khác nhỏ còn lại.
- Chưa có phê duyệt merge/deploy. Không chạy migration trên production, không thay đổi secrets và không tạo giao dịch/đơn hàng thật.

## Bổ sung kiểm toán watermark và bằng chứng giao diện — 19/10/2026

### Thay đổi đã hoàn tất trên nhánh thử nghiệm

- Admin cho phép cấu hình đường dẫn logo watermark nội bộ, vị trí, kích thước và độ mờ; URL ngoài, đường dẫn sai định dạng và logo R2 không tồn tại bị từ chối.
- Giao diện chi tiết/fullscreen lấy đúng `watermarkLogoUrl` từ public settings thay vì luôn cố định `/watermark.webp`. Watermark vẫn chỉ là lớp phủ khi xem ảnh lớn; không ghi đè ảnh gốc và không phủ thumbnail/thẻ danh sách.
- Backup v2 bao gồm logo watermark đã chọn. Restore v2 xác thực logo khi trường có mặt, đồng thời vẫn tương thích với backup v2 cũ chưa có trường này.
- Bổ sung kiểm thử cho đường dẫn nội bộ an toàn, chặn URL ngoài, sự tồn tại của ảnh R2, truyền cấu hình ra viewer và bảo toàn cài đặt qua backup/restore.
- Giữ nguyên bố cục sáu ô cam kết chính đã được kiểm thử; cam kết “Đặt hàng theo yêu cầu” vẫn nằm trong khu vực quy trình đặt hàng. Không đổi thiết kế đã duyệt chỉ để ép thành bảy ô trong dải chính.

### Bằng chứng mới nhất

- Source HEAD: `a9456c3071bfc6070645408f32f82f1163df6a54`.
- Validation workflow [39223554864](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39223554864): **SUCCESS**, gồm `npm run check`, kiểm toán dependency và toàn bộ `npm test`.
- Visual preview workflow [39223554394](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39223554394): **SUCCESS** trên cùng SHA.
- Artifact `sindarealest-liquid-glass-preview-214`, ID `12172876965`, SHA-256 `sha256:2d4b643010221111038f16c34607018f52ecbd1e35d116c481554ea9fa03a23c`.
- Báo cáo máy: `passed=true`; 54 ảnh; 20 kiểm tra viewport/theme; 91 tương tác; 235 sản phẩm fixture; 0 lỗi cứng, 0 tràn ngang, 0 lỗi console/page/HTTP/request và 0 request ghi dữ liệu. Mọi đơn hàng/API ghi dữ liệu đều được mock/chặn trong preview; không dùng dữ liệu khách hàng hay giao dịch thật.

### Ranh giới nghiệm thu chưa thể xác nhận bằng CI

- Đây là preview tĩnh, fixture và fake/in-memory DB; không chứng minh D1/R2/auth/đơn hàng/bảo hành hoạt động với binding production thực.
- Chưa có phiên đăng nhập Cloudflare được xác nhận cho browser profile, chưa có môi trường staging được cấp quyền và chưa có thiết bị Android thật nối vào môi trường kiểm thử.
- Chưa thực hiện triển khai production, migration production, thanh toán thật hoặc ghi dữ liệu thật. Cần quyền staging/thiết bị/duyệt triển khai phù hợp trước khi đóng các mục nghiệm thu ngoài mã nguồn.
- Taobao/1688 tiếp tục bị loại khỏi phạm vi theo yêu cầu hiện tại.

## Bổ sung — 2026-10-20: trực quan ảnh mẫu và chuẩn bị vòng capture/compare

- Đã mở hai ảnh mẫu gốc từ artifact [12233192824](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779/artifacts/12233192824). Mẫu là collage nhiều màn hình app mobile. Trang home mẫu có nền kính xanh băng ở Light/xanh navy sâu ở Dark, lưới sáu ô 3×2, nhãn thường xuống hai dòng, chip/halo cho icon, CTA “Đặt hàng an tâm” gọn và bottom navigation 4 mục. Đây là mô tả ảnh mẫu, không phải kết luận website hiện tại khớp.
- Đã chuẩn bị workflow chụp trực tiếp Cloudflare Pages Preview bằng Playwright ở chế độ read-only, chỉ lưu hai stage chuẩn khi nguồn được xác minh là live Preview; local fixture chỉ ở artifact. Khi chụp stage end, workflow so sánh các PNG cùng tên/kích thước và xuất pixel-diff report.
- Chưa sửa storefront HTML/CSS/JS vì chưa có baseline Preview thật. Hai thư mục stage tiếp tục trống; không merge/deploy Production.

## Live browser probe — 2026-10-20

- Run [39352778226](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226) navigated to the supplied Preview with Playwright in read-only mode. Cloudflare Access redirected to its login host before the homepage rendered.
- Audit: `accessBlocked=true`, `captureCompleted=false`, zero screenshots and zero route probes. The probe step continues only so the report/artifact are uploaded; it is not a PASS.
- One console message originated from Access login CSP, not the storefront. Commit `aaec8026c8eca4aef3027dcb5a5c1e49d6189930` adds a sanitizer to remove URL credentials/query/fragment values and ignores console/page errors emitted by non-Preview origins.
- No storefront HTML/CSS/JS has changed. The start/end folders remain empty until authorized Preview capture is possible; do not change Production Access to get around this blocker.


## Bổ sung bàn giao mới nhất — 2026-10-20: xác minh token và trạng thái Playwright

### Điều đã xác minh được
- Người dùng báo đã thêm secret `CLOUDFLARE_PAGES_READ_TOKEN` vào GitHub Actions, nhưng chưa chắc giá trị có đúng loại/quyền hay không. Giá trị secret không thể đọc ngược từ GitHub; tuyệt đối không yêu cầu người dùng dán token vào chat.
- Run [39405151215 — Admin Preview Playwright](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39405151215), branch `fix/liquid-glass-audit-2026-10-19`, commit `45cb80cb8568ec6ccb0b3acae55f5f20e9d4106d`, hoàn tất **SUCCESS** ngày 2026-10-20. Job tên “Test Admin Preview (read-only smoke checks)”; các bước checkout, setup Node, cài Playwright và “Test the supplied Preview URL” đều thành công.
- **Giới hạn bằng chứng:** run 39405151215 là workflow Admin Preview Playwright, không phải bước xác minh Cloudflare Pages API token. Vì vậy không được suy ra rằng `CLOUDFLARE_PAGES_READ_TOKEN` đã đúng hoặc có quyền `Account → Cloudflare Pages → Read` chỉ từ trạng thái SUCCESS này.
- Workflow chuyên biệt cần chạy để xác minh token là [Liquid Glass isolated visual preview](https://github.com/chichute5500/Sindarealest-admin/actions/workflows/liquid-glass-visual-preview.yml), trên branch `fix/liquid-glass-audit-2026-10-19`, với `capture_source=cloudflare-preview`, `capture_stage=start-of-work`, xác nhận Preview-only, URL `https://3ed49bcc.sindarealest2.pages.dev/`. Bước “Verify actual Cloudflare Pages deployment before manual capture/archive” dùng `CLOUDFLARE_ACCOUNT_ID` (GitHub variable) và `CLOUDFLARE_PAGES_READ_TOKEN` (GitHub secret).
- Nếu bước xác minh token thất bại, xem lỗi của chính bước này để phân biệt secret rỗng/sai, token thiếu quyền, account ID sai hoặc alias/branch deployment không khớp. Không chia sẻ giá trị token trong logs; nếu log có thông tin nhạy cảm, không chép lại công khai.
- Nếu xác minh API thành công nhưng capture bị Cloudflare Access chặn, đó là blocker riêng: kiểm tra cấu hình Service Token `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`; không nới Access hay sửa Production để vượt qua.

### Trạng thái ảnh chuẩn và ranh giới an toàn
- Chưa có bằng chứng mới cho thấy ảnh chụp live Preview đã hoàn tất; run Admin Preview PASS không phải nghiệm thu visual capture.
- `docs/website-screenshots/start-of-work/` và `docs/website-screenshots/end-of-work/` chỉ được điền bằng ảnh từ live Preview đã xác minh. Chưa ghi nhận baseline mới; end stage phải đợi start baseline đạt điều kiện.
- Không có thay đổi storefront HTML/CSS/JS được thực hiện trong bước kiểm tra token này. Không merge, deploy, chạy migration hoặc thay đổi binding/secret của Production.

### Việc tiếp theo cho chat mới
1. Mở workflow chuyên biệt ở link trên, chọn đúng branch `fix/liquid-glass-audit-2026-10-19` và chạy thủ công với các input Preview-only nêu trên.
2. Đọc kết quả từng bước, đặc biệt bước xác minh Cloudflare Pages deployment metadata. Chỉ kết luận token đúng khi bước này PASS.
3. Nếu token check PASS nhưng browser bị Access redirect, điều tra riêng cấu hình Service Token cho Preview.
4. Sau khi xác minh deployment và capture live đạt toàn bộ điều kiện coverage, lưu baseline `start-of-work`; chỉ chụp `end-of-work` sau khi đã có baseline. Tiếp tục giữ Production nguyên trạng.

## Cập nhật xác minh thực tế — 2026-10-20 10:20 UTC

### Nhánh và bằng chứng GitHub
- Nhánh được kiểm tra: `fix/liquid-glass-audit-2026-10-19`. Source commit của workflow mới nhất là `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b` ([commit](https://github.com/chichute5500/Sindarealest-admin/commit/0c5b436c114e094f1ee7ae5a44a4c54b3f79692b)).
- Workflow source/tests [39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248): job `validate` và các bước kiểm tra source/test đều SUCCESS.
- Workflow trực quan [39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), artifact [12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807): job tổng kết SUCCESS nhưng **không phải live visual PASS**. Đây là push run; bước xác minh dành cho `workflow_dispatch` và các bước lưu baseline/end đã SKIPPED.
- So sánh GitHub ghi nhánh fix đã diverge khỏi `main` (393 commit ahead, 6 behind; merge base `f38cefe4647b33bd42f9018fde00c420ee5c7c66`). Danh sách thay đổi gồm Admin, API, migration, dữ liệu, deploy/config và các file không thuộc giao diện công khai. Không merge toàn bộ nhánh này; không có thao tác merge/deploy Production.
- Chỉ xem trạng thái repository từ GitHub API; không có local clone/working tree để xác minh các thay đổi chưa push. Không sửa code trong lần kiểm tra này.

### Blocker được xác nhận từ log và artifact
- Bước `Verify supplied Preview deployment metadata on push (diagnostic only)` dừng với `Missing or invalid CLOUDFLARE_ACCOUNT_ID`. Trong môi trường của run, `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_PAGES_READ_TOKEN` đều rỗng; vì thiếu Account ID, API chưa xác minh được token. **Chưa thể kết luận token sai hay đúng quyền**.
- Bước `Probe supplied Cloudflare Preview on push` chạy nhưng report ghi `accessServiceTokenConfigured=false`, `accessBlocked=true`, `captureCompleted=false`. Log xác nhận cả `CF_ACCESS_CLIENT_ID` và `CF_ACCESS_CLIENT_SECRET` rỗng trong run.
- URL bị chặn: `https://sindarealest2-pages.cloudflareaccess.com/cdn-cgi/access/login/3ed49bcc.sindarealest2.pages.dev`. Phân loại chính xác hiện tại là **Cloudflare Access/login gate**, không phải lỗi render storefront. Không nhập tài khoản, không bypass Access và không sửa policy Production.
- `deployment-verification.json` có trạng thái `BLOCKED_CONFIGURATION`; báo cáo live có 0 screenshot, 0 viewport, 0 route, 0 section và 0 product-detail check. Các bước chỉ tiếp tục để upload diagnostic artifact vì được cấu hình `continue-on-error`; không được tính là PASS.

### Đã mở và xem ảnh tham chiếu
- Đã tải artifact `sindarealest-liquid-glass-preview-322` chỉ để kiểm tra, sau đó mở cả hai PNG tham chiếu gốc `file_0000000017088207af45f5e6dd90cfa4.png` (Light) và `file_00000000fcb48207a23aeda23caa5eeb.png` (Dark) ở trong artifact. Hai ảnh là collage màn hình mobile kiểu ứng dụng, nền kính xanh băng ở Light/xanh navy ở Dark, lưới quyền lợi sáu ô 3×2, và các ví dụ túi xách, ví, giày, thắt lưng.
- Đã mở ảnh `mobile-390-light-viewport.jpg` trong cùng artifact để xác định loại bằng chứng: đây là ảnh Playwright của **local static fixture**, có bố cục storefront dài và ảnh sản phẩm giày. Nó cho thấy khác biệt hình ảnh đáng kể so với collage tham chiếu nhưng **không phải ảnh Preview thật**, vì vậy không được dùng làm baseline hoặc làm bằng chứng nghiệm thu live.
- Artifact local audit có 54 screenshot, 235 fixture products, 20 responsive cases và 93 interaction checks; các chỉ số này chỉ nghiệm thu được đường chạy fixture. Kết quả local ghi 0 tràn ngang/lỗi console/page/HTTP/request và 0 hard failures; không chứng minh Preview, D1/R2 hoặc dữ liệu sản phẩm thực.
- Đã kiểm tra mã nguồn `public/index.html`: `syncHeroProductImage()` lấy ảnh từ ảnh sản phẩm đầu tiên ở `#catalogGrid .product-photo img`, rồi fallback sang `#featuredGrid .feature-slide`; không cần hardcode ảnh Hero mới. CSS sáu ô nằm trong nhóm selector `.service-strip`/`.service-strip .service-copy` có breakpoint mobile và lớp nền/blur/viền riêng. Chưa có ảnh live để kết luận ngoại quan sau render nên không sửa CSS theo phỏng đoán.

### URL sản phẩm và ảnh chuẩn
- Kiểm tra source/tests: middleware có pattern route mới `/sanpham/{category-slug}/{product-key}`, route cũ `/san-pham/{key}` và redirect sang category canonical; danh mục lấy từ mapping dùng chung. Test `tests/product-route-canonical.test.mjs` xác minh mapping/redirect/metadata trên dữ liệu test.
- Không có bằng chứng mở trực tiếp, reload, Back/Forward hoặc click card cho URL sản phẩm trên **Preview thật** vì homepage chưa vượt qua Cloudflare Access. Không đánh dấu route runtime PASS; không tự tạo mapping từ fixture như dữ liệu catalog thật.
- Hai thư mục chuẩn `docs/website-screenshots/start-of-work/` và `docs/website-screenshots/end-of-work/` vẫn không có ảnh PNG live. Manifest hiện giữ trạng thái BLOCKED; pixel comparison chưa được chạy. Không copy ảnh fixture/reference vào hai thư mục chuẩn.

### Tiến độ thực tế và bước tiếp theo
- Đã xác minh: source/test CI xanh; định nghĩa workflow có input `capture_stage`, `confirm_preview_only`, `capture_source`, `preview_url`; hai ảnh tham chiếu gốc đã được mở; root cause của lần chạy này là cấu hình GitHub Actions không được cung cấp trong run và Access login gate.
- Chưa xác minh: Pages token hợp lệ/quyền Pages Read, deployment ID/branch/SHA gắn với alias, ảnh Preview thật, visual diff, section “Phong cách đẳng cấp từ da cá sấu” trên live, Liquid Glass sau render live, URL sản phẩm runtime và đầy đủ theme/responsive trên Preview.
- Ước tính checklist **không tăng từ lần trước; chưa đủ bằng chứng để nâng tiến độ**. Local fixture success không bù cho live capture bị chặn.
- Để mở khóa, repository cần có GitHub Actions variable `CLOUDFLARE_ACCOUNT_ID` và secrets `CLOUDFLARE_PAGES_READ_TOKEN`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` với đúng phạm vi; đồng thời phải có Cloudflare Access Service Auth policy giới hạn an toàn ở Preview alias. Log hiện tại cho thấy các giá trị này chưa được cấp vào run, dù các tên secret từng được nhắc trong ghi chú trước. Không gửi giá trị secret vào chat.
- Sau khi cấu hình hoàn tất, chạy thủ công workflow `liquid-glass-visual-preview.yml` trên đúng branch với `capture_stage=start-of-work`, `confirm_preview_only=true`, `capture_source=cloudflare-preview`, `preview_url=https://3ed49bcc.sindarealest2.pages.dev/`. Chỉ dùng baseline sau khi deployment API xác minh Preview branch/SHA và live audit đủ coverage; mới sau đó mới chạy end-of-work.
