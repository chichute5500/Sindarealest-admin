# SinDarealest2 — Handoff trạng thái công việc

> Hồ sơ bàn giao giữa các AI. Đây là bản đồ trạng thái, không thay thế bằng chứng từ GitHub, CI, test và ảnh chụp thực tế.

## Trạng thái hiện tại

- Repository: `chichute5500/Sindarealest-admin`
- Nhánh mục tiêu: `fix/liquid-glass-audit-2026-10-19`
- Phạm vi: rà soát/sửa giao diện web tĩnh, so sánh ảnh tham chiếu, kiểm thử hồi quy và lưu bằng chứng trước/sau.
- Production: `https://sindarealest2.pages.dev`
- Quy tắc: không deploy/merge Production; không sửa nhánh admin riêng `feature/admin-isolated-handoff-2026-10-20`; không sửa dữ liệu Production.
- Ảnh tham chiếu gốc (không ghi đè):
  - Sáng: [file_0000000017088207af45f5e6dd90cfa4.png](../static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png)
  - Tối: [file_00000000fcb48207a23aeda23caa5eeb.png](../static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png)

## Cập nhật kiểm tra gần nhất — 2026-10-19/20 UTC

- Nhánh đang làm: `fix/liquid-glass-audit-2026-10-19`.
- Các commit quy trình ảnh trong lượt này: `746237efaf1fc5637019934fdb4fd90aeff4ef54` (đưa ảnh về đúng hai thư mục chuẩn tắc), `2297ea9fa4fffe37527b5e09bc832cfe705ff569` (bổ sung metadata viewport/đối chiếu vào manifest workflow), `d60fc6344520bb8e88d857d31fd830657adc5ee3`, `5280355ec9eb43f48c3a640ae425ba7d9b291295`, `dcd414163cd53876af6cb47d9d14efab1c86db7f`, `c33c77e330942d339b218dbbbfb81884137441d5` (tạo thư mục ảnh chuẩn tắc và manifest ghi đúng trạng thái hiện tại).
- `docs/website-screenshots/manifest.json` hiện ghi rõ baseline `BLOCKED`, end-of-work `NOT TESTED`, chưa có ảnh được xác minh. Không coi các tệp `.gitkeep` là screenshot.
- Đã truy cập thử URL Preview do người dùng cung cấp ở các route `/`, `/san-pham/sd2929`, `/sanpham/giaytay/sd2929` bằng trình đọc web chỉ đọc; cả ba trả về `login_required`. Đây không phải xác minh HTTP/browser hoàn chỉnh và không cung cấp screenshot. Không thử Production để thay thế.
- Workflow `.github/workflows/liquid-glass-visual-preview.yml` trước đây lưu ảnh theo `<stage>/<RUN_ID>/`; đã sửa hướng lưu sang đúng `<stage>/` và làm phong phú manifest. Workflow mới đang chờ/chạy trong GitHub Actions; chưa đánh dấu PASS cho commit mới cho đến khi có kết quả hoàn tất.
- Ảnh tham chiếu PNG vẫn chưa được mở/xem trực quan trong công cụ hiện có; trạng thái `UNVERIFIED`.
- Audit code xác nhận URL chi tiết hiện được tạo dạng `/san-pham/{SKU hoặc ID/slug}`, còn `popstate`/khởi tạo cũng chỉ nhận route đó. Chưa chuyển sang `/sanpham/{danh-mục}/{mã}`: cần nguồn dữ liệu thật và quy tắc SKU đã xác minh; nhiều bản ghi legacy có `sku: null` và `skuVerified: false`. Không tự tạo mapping.
- Chưa sửa HTML/CSS website công khai; các thay đổi hiện tại chỉ ở workflow/tài liệu ảnh. Không merge/deploy Production, không sửa nhánh admin.

## Cách tiếp quản — bắt buộc trước khi sửa

1. Đọc file này cùng `TASKS.md`, `TEST-RESULTS.md` và `DECISIONS.md`.
2. Xác minh nhánh và commit HEAD trực tiếp trên GitHub. Ghi lại SHA và thời gian bắt đầu phiên.
3. Kiểm tra diff và workflow runs kể từ commit được ghi trong hồ sơ.
4. Đối chiếu từng trạng thái với code/test/evidence; không tin trạng thái chỉ vì nó được ghi ở đây.
5. Không làm lại task PASS trừ khi code liên quan đã đổi, có lỗi hồi quy hoặc bằng chứng mới khiến kết quả cũ không còn hợp lệ.
6. Nếu task đang IN_PROGRESS, xác minh thay đổi hiện có và commit mới nhất trước khi tiếp quản; không ghi đè công việc chưa được hiểu.
7. Chỉ cập nhật hồ sơ bằng trạng thái có căn cứ. Không có bằng chứng thì dùng UNVERIFIED, NOT TESTED hoặc BLOCKED.

## Trạng thái khởi tạo đã biết

- Thư mục ảnh tham chiếu `docs/static-web-reference/` có README và hai ảnh PNG được GitHub Contents API liệt kê. README xác định ảnh đầu là mẫu mobile sáng, ảnh thứ hai là mẫu mobile tối.
- Việc xem trực quan từng ảnh bằng công cụ hiện tại **chưa được xác minh hoàn tất**; không tuyên bố đã phân tích pixel cho đến khi ảnh thực sự được hiển thị.
- Có đề cập workflow `.github/workflows/liquid-glass-visual-preview.yml` để chụp ảnh. Việc workflow chạy thành công, ảnh thật được tạo và commit chưa được xác minh trong hồ sơ này.
- Các thư mục/ảnh baseline và end-of-work: cần kiểm tra trực tiếp trên nhánh; không mặc định đã tồn tại.
- Trạng thái test giao diện hiện tại: UNVERIFIED cho đến khi xác minh commit, URL Preview, test logs và ảnh thực tế.

## Môi trường và giới hạn

- Ưu tiên GitHub Actions/Playwright để chạy kiểm thử; không phụ thuộc vào việc chạy Wrangler trên Android.
- Không giả định Preview có cùng bindings, secrets hoặc dữ liệu với Production.
- Không in secrets/token vào log, screenshot hoặc commit.
- Không dùng mock làm bằng chứng thành công của dịch vụ thật (đặc biệt Workers AI).
- Không thực hiện hành động có thể ghi/xóa dữ liệu thật.

## Cập nhật sau mỗi phiên

Khi kết thúc phiên làm việc, cập nhật:
- Commit SHA cuối và link commit.
- Task IDs đã hoàn tất/thay đổi trạng thái.
- Test vừa chạy, URL/commit/viewport, kết quả và link workflow/log.
- Ảnh mới được tạo và đường dẫn manifest.
- Lỗi còn lại, lý do BLOCKED và điều kiện để tiếp tục.
- Việc tiếp theo có thể thực hiện ngay (tối đa 3–5 mục, sắp xếp ưu tiên).

Không ghi “hoàn thành 100%” nếu còn FAIL, BLOCKED hoặc hạng mục bắt buộc chưa được kiểm thử. Không deploy Production.

## Cập nhật xác minh phiên 2026-10-20

- Run [39320885814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814), job `118295011697`, đã chạy thành công trên source commit `c1757447f3b30aee9923297aca2c8ab89a42775d`.
- Log xác nhận `npm test` PASS, `npm run check` PASS; Playwright local static preview báo 235 fixture products, 54 screenshots, 0 responsive overflow, 0 page errors, 0 HTTP errors, không có hard failure. [Artifact screenshots/report](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814/artifacts/12218939627).
- Giới hạn quan trọng: workflow phục vụ thư mục `public` qua Python local server tại `http://127.0.0.1:4173/`; đây **không phải** Cloudflare Preview. Kết quả không chứng minh đường dẫn Pages Functions, dữ liệu/bindings Preview hoặc tương đồng pixel với ảnh mẫu.
- Workflow file `.github/workflows/liquid-glass-visual-preview.yml` có lưu ảnh vào `docs/website-screenshots/${STAGE}/` chỉ khi sự kiện là `workflow_dispatch`. Run vừa xác minh là sự kiện push nên bước lưu stage bị skip. `docs/website-screenshots/manifest.json` đã tồn tại; sau kiểm tra mới ngày 2026-10-20, manifest được cập nhật để ghi nhận cả ba route probe trả `login_required`, trạng thái baseline BLOCKED, end-of-work NOT TESTED và ảnh tham chiếu chưa được xem trực quan. Hai thư mục stage có `.gitkeep` placeholders, không có ảnh chụp thật.
- Lần truy cập tự động trước đó tới Preview `https://3ed49bcc.sindarealest2.pages.dev/` trả `login_required`; do đó deployed Preview vẫn BLOCKED/UNVERIFIED. Không dùng ảnh local fixture thay cho ảnh Preview.
- Chưa sửa HTML/CSS/JS storefront và chưa đổi route. Đã cập nhật task ledger/test results bằng commit docs-only; Production không bị deploy/merge hoặc thay đổi.
- Tiếp theo: (1) giải quyết điều kiện truy cập Preview hoặc xác định rõ capture local được chấp nhận làm baseline nội bộ; (2) chạy capture với stage `start-of-work`, lưu đúng thư mục cố định và manifest, ghi rõ nguồn capture; (3) mở/xem hai ảnh mẫu gốc và baseline thật; (4) chỉ sau đó mới sửa Liquid Glass hoặc route sản phẩm; (5) chụp end-of-work và so sánh cùng viewport/theme.



## Bằng chứng bổ sung sau lần rà soát tiếp theo — 2026-10-20

- Workflow [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706) đã kết thúc `success` trên commit `e3c5c08e633bc73900343933dc3145720fbaefa2`; toàn bộ các bước trong job `visual-preview` đều PASS/skipped theo điều kiện. Artifact [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329) đã được tạo.
- Run này được kích hoạt bởi push, nên bước lưu ảnh vào kho chuẩn tắc bị skip. Ảnh chỉ nằm trong artifact tạm thời; **không** có nghĩa là baseline đã lưu. Không đánh dấu SHOT-002 PASS.
- Đã đọc mã workflow và capture script. Chúng chạy server tĩnh cục bộ từ thư mục `public/` tại `http://127.0.0.1:4173/`, chặn một số request bên ngoài và dùng fixture/in-memory data cho các kịch bản giá. Kết quả hữu ích cho hồi quy cục bộ, nhưng không kiểm tra trực tiếp URL Cloudflare Preview, Pages Functions hoặc dữ liệu Preview thật.
- Audit route tiếp tục xác nhận generator và parser hiện tại dùng `/san-pham/{SKU hoặc ID/slug}`; chưa có bằng chứng đủ để đổi sang `/sanpham/{category-slug}/{product-code}`. Không sửa route/UI trước baseline và kiểm kê dữ liệu/SKU thật.
- Preview được cung cấp vẫn đang ghi nhận `login_required` trong các lần truy cập trước; ảnh PNG tham chiếu vẫn chưa được hiển thị/xem trực quan. Hai blocker này chưa được gỡ.
- Website HTML/CSS/JS chưa bị sửa trong lượt này. Các cập nhật chỉ bổ sung hồ sơ kiểm thử. Không merge/deploy Production.

## Bổ sung kiểm tra 2026-10-20 — công cụ trình duyệt

- Thử mở lại Preview bằng trình duyệt tự động ở chế độ chỉ đọc để xác định màn hình website hoặc Cloudflare Access. Lượt chạy không bắt đầu vì số dư TinyFish wallet âm `-$0.16`; không có screenshot mới và không phát sinh thay đổi website.
- Kết quả này là giới hạn của công cụ trình duyệt, tách biệt với `login_required` trả về từ lần fetch URL trước đó. Không được ghi là đã kiểm tra trực quan hoặc chụp được Preview.
- Các cập nhật tài liệu đã thực hiện trong nhánh fix: tạo README cho kho ảnh, xác minh/cập nhật manifest trung thực, sửa task ledger và handoff để không còn khẳng định sai rằng manifest chưa tồn tại.
- Commit tài liệu mới nhất: [5440da821c5aabeb89c65336d7d5ce319516d60c](https://github.com/chichute5500/Sindarealest-admin/commit/5440da821c5aabeb89c65336d7d5ce319516d60c). Chỉ là commit docs; không có thay đổi storefront và không có deploy Production.

## Kiểm tra bổ sung — 2026-10-20

### Kiểm kê nhánh trước mọi thay đổi code
- So sánh GitHub API `main` (`28c768ba26b1d9f7d40e14efac5112526ed1c8b3`) với `fix/liquid-glass-audit-2026-10-19`: trạng thái `diverged`, nhánh fix ahead 275 commits và behind 6 commits tại thời điểm kiểm tra.
- Danh sách diff bao gồm nhiều khu vực ngoài công việc giao diện public, ví dụ `public/admin/index.html`, các `functions/api/admin/*`, API khác, `migrations/0008_product_sku_verification.sql`, script/config Cloudflare và fixture sản phẩm. Đây là cảnh báo phạm vi từ diff; chưa kết luận mỗi thay đổi đều có lỗi.
- Không merge/deploy nhánh này. Trước khi sửa code hoặc đề xuất merge, cần xem xét phạm vi từng commit/file và xác minh những thay đổi ngoài phạm vi. Production không bị đụng đến.

### Định tuyến sản phẩm
- Middleware hiện chỉ nhận `/san-pham/{key}`; key tra theo slug/id/SKU, và redirect về key chuẩn theo trạng thái SKU đã xác minh.
- Sitemap hiện phát URL `/san-pham/{SKU đã xác minh hoặc ID}`.
- JavaScript storefront cũng tạo và đọc `/san-pham/{key}`; đổi sang `/sanpham/{danh-mục}/{mã-sản-phẩm}` cần đồng bộ middleware, canonical/OG, sitemap, JS mở chi tiết, popstate và test.
- Fixture legacy có 235 records nhưng SKU null/chưa xác minh toàn bộ; không thể lấy fixture đó để bịa mã sản phẩm hoặc khẳng định đường dẫn mới đã đúng. Chưa thay đổi route vì baseline website còn bị chặn và cần nguồn product code đã xác minh.

### Công cụ browser
- Lượt TinyFish browser automation không khởi chạy vì wallet âm `-$0.16`; không có ảnh mới. Kết quả này không xác minh được trang hiển thị hay Access gate.

## Live Preview blocker — 2026-10-20

The direct, read-only GitHub Actions browser probe against `https://3ed49bcc.sindarealest2.pages.dev/` (run [39352778226](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226)) was redirected to the Cloudflare Access login host before storefront content rendered. Artifact [12232894712](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226/artifacts/12232894712) records `accessBlocked=true`, `captureCompleted=false` and zero screenshots. No writes were sent and the canonical screenshot folders remain empty. A user-authorized session or Preview-only Access permission is required; do not weaken Production Access. The subsequent commit `aaec8026c8eca4aef3027dcb5a5c1e49d6189930` adds URL query/fragment redaction and filters console errors by Preview origin.
