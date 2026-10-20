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


## Trạng thái xác minh mới nhất — 2026-10-20 04:45 UTC

- Nhánh: `fix/liquid-glass-audit-2026-10-19`. Code ứng dụng storefront vẫn ở source commit `562d7d77624f7431296cb217b2b6d6592aca9ce4`; commits mới bổ sung helper xác minh deployment, assertion CI và workflow gate, không thay đổi HTML/CSS giao diện đang được kiểm thử.
- **Source/test validation: PASS** — [run 39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248), HEAD workflow `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b). Project integrity checks và toàn bộ automated tests xanh sau khi sửa assertion baseline guard.
- **Local fixture audit: PASS — không phải live Preview** — [run 39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), [artifact 12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807): 54 ảnh fixture, 235 sản phẩm mẫu, 20 responsive cases, 93 interaction checks, 0 responsive overflow/console/page/HTTP errors, 0 hard failures.
- **Live storefront capture: BLOCKED_ACCESS_GATE** — trong artifact mới nhất, `accessServiceTokenConfigured=false`, redirect đến Cloudflare Access và 0 screenshot/route/viewport thật. Không có baseline/end ảnh thật; không có pixel diff.
- **Deployment verifier: BLOCKED_CONFIGURATION** — báo cáo `deployment-verification.json` trong cùng artifact ghi thiếu `CLOUDFLARE_ACCOUNT_ID`. Sau khi biến này có mặt, verifier còn cần secret `CLOUDFLARE_PAGES_READ_TOKEN` và bắt buộc khớp alias, environment=preview, deployment success, branch fix được chọn và commit SHA trước khi cho phép archive.
- **Admin Preview Playwright: FAIL/BLOCKED** — [run 39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239) không tìm thấy `#loginView`/`#loginForm`. Đây là pipeline smoke test admin riêng; workflow chỉ truyền `ADMIN_TEST_URL`/`ADMIN_TEST_PASSWORD`, chưa truyền Access headers. Không kết luận lỗi mật khẩu hoặc thay đổi login/security ngoài phạm vi.
- **Hướng dẫn gỡ chặn**: [PREVIEW-ACCESS-SETUP.md](PREVIEW-ACCESS-SETUP.md). Cần Preview-only Service Auth + repo Secrets `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `CLOUDFLARE_PAGES_READ_TOKEN`, và repo Variable `CLOUDFLARE_ACCOUNT_ID`. Không gửi secret values trong chat, không mở policy cho Production.
- Workflow giờ từ chối archive end-of-work nếu chưa có baseline thật đã verify; pixel-diff sẽ đặt trạng thái chờ con người xem ảnh, không tự động chấm đẹp/đạt.
- Không merge/deploy Production, không sửa D1/R2/bindings/secrets Production. PR #108 vẫn không an toàn để merge nguyên trạng do chứa nhiều admin/API/migration/data/deploy changes ngoài scope.

- Không đóng baseline/end screenshots hoặc pixel comparison trước khi có ảnh Preview thật và kiểm tra người xem.

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


## Latest verification — 2026-10-20 (commit fa7445b)

- Visual workflow [39355499185](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185) completed successfully for the local fixture pipeline; artifact [12235310623](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185/artifacts/12235310623) contains the local screenshots, audit output, and original reference PNGs.
- Project tests, `npm run check`, and the local Playwright capture completed successfully. The direct Preview probe explicitly recorded `accessBlocked=true`, `captureCompleted=false`, and `screenshotCount=0`; this is a confirmed Access gate, not a live UI pass.
- The separate Admin Preview smoke workflow [39355503580](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355503580) failed because its expected `#loginView` / `#loginForm` elements were not found. This is outside the public static website scope; no admin code was changed as part of this audit. Investigate only in the dedicated admin workstream.
- The live capture script now classifies navigation to `*.cloudflareaccess.com` as an Access gate and stops route probing without credentials. No public storefront HTML/CSS/JS was changed, no screenshots were archived into canonical start/end folders, and no Production deploy or merge was performed.


## Branch-scope safety review — 2026-10-20

The GitHub compare from base commit `28c768ba26b1d9f7d40e14efac5112526ed1c8b3` to audit commit `fa7445b74661faf260c32b3ab32dfa85e3538e78` reports a diverged branch (293 commits ahead, 6 behind) and 72 changed files. The diff includes public storefront work but also admin HTML, admin API endpoints, shared middleware/API logic, a database migration, deployment/setup scripts and the large legacy product fixture. This branch is not safe to merge as one unit for the public static UI task. Keep PR #108 open; do not merge or deploy Production. Isolate/review out-of-scope files against the correct base before any integration.


## Gỡ chặn Cloudflare Access đúng cách — 2026-10-20

Đã bổ sung hỗ trợ *tùy chọn* Cloudflare Access service token cho công cụ chụp Preview ở các commit trên nhánh kiểm toán; không tự tạo hoặc vượt qua quyền truy cập.

- Hai GitHub Actions repository secrets được hỗ trợ: `CF_ACCESS_CLIENT_ID` và `CF_ACCESS_CLIENT_SECRET`. Phải cấu hình cả cặp; cấu hình thiếu một giá trị sẽ dừng an toàn với thông báo không chứa giá trị bí mật.
- Script chỉ gắn hai header service-token sau khi đã xác thực URL thuộc alias Pages không phải Production, và chỉ cho request `GET`/`HEAD` cùng origin Preview. Các request cross-origin bị chặn trước khi gắn header. Giá trị secret không được ghi vào JSON, HTML, ảnh hoặc log kiểm toán.
- Khi hai secret chưa được cấu hình hoặc token không có quyền với hostname Preview, capture tiếp tục báo **BLOCKED_ACCESS_GATE**; ảnh fixture local không được đưa vào thư mục baseline.

### Cách thiết lập cần người có quyền Cloudflare/GitHub thực hiện

1. Trong Cloudflare Zero Trust, tạo service token dành riêng cho kiểm thử và policy chỉ cho phép alias Preview `3ed49bcc.sindarealest2.pages.dev`. Không nới quyền của Production.
2. Trong repo GitHub, mở **Settings → Secrets and variables → Actions → New repository secret**. Tạo secret `CF_ACCESS_CLIENT_ID` rồi `CF_ACCESS_CLIENT_SECRET` bằng hai giá trị từ Cloudflare. Không gửi hai giá trị này trong chat và không commit vào file.
3. Mở **Actions → Liquid Glass isolated visual preview → Run workflow**, chọn nhánh `fix/liquid-glass-audit-2026-10-19`, stage `start-of-work`, xác nhận Preview-only, nguồn `cloudflare-preview`, URL mặc định. Chỉ khi run capture hoàn tất và manifest ghi nhận ảnh live mới bắt đầu vòng đối chiếu giao diện.

Nếu không có quyền tạo service token/Secrets, không thể chụp baseline Preview bằng GitHub Actions một cách trung thực; tiếp tục dùng test local riêng nhưng giữ baseline live ở trạng thái BLOCKED.


## Live Preview capture and coverage checkpoint — 2026-10-20

- Tooling source checks passed at commit `2a66c96457aa2c2b8235bece34a37dc916c6b25f`: [Validate source and tests run 39357404831](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357404831).
- The updated live capture script now targets required viewports 360×800, 390×844, 768×1024 and 1440×900 in both light/dark; it captures the hero, six benefit tiles, order section, featured products, collections, catalog and footer; it derives detail URLs from actual live cards and checks direct open/reload. Sample SKU URLs were removed from the live probe. The archive gate now rejects incomplete/failed coverage before deleting or replacing canonical screenshots.
- [Live-probe workflow 39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764) completed as a diagnostic workflow, but its embedded live audit was `captureCompleted=false`, `accessBlocked=true`, `screenshotCount=0`. The final URL was Cloudflare Access login on `sindarealest2-pages.cloudflareaccess.com`; no public storefront DOM was captured and canonical screenshot folders were not changed.
- Local Playwright fixture artifact [12235773515](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764/artifacts/12235773515) contains 54 local-fixture screenshots with zero recorded console, page, HTTP or hard failures and zero horizontal overflow. This is explicitly artifact-only and is **not** a Preview baseline or visual acceptance.
- A safe boolean `accessServiceTokenConfigured` is being added to the next live diagnostic; it reports only whether the optional paired GitHub secrets are present, not their values. No secret is logged or serialized.
- No public storefront UI, product URL routing, image URL, R2/D1 data, admin file, production setting, merge or deployment was changed by this checkpoint.


## Exact Preview Access blocker confirmed — 2026-10-20

- Run [39357805505](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505) used capture-code commit `39389c66c97f88f49d6994e1178ceeaf6eb264e3`; artifact [12236385238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505/artifacts/12236385238). Its safe diagnostic reports `accessServiceTokenConfigured=false`, `accessBlocked=true`, `captureCompleted=false`, `passed=false`, and zero live screenshots.
- GitHub Actions did not receive the optional paired Access service-token values. This is an access/configuration blocker, not evidence the storefront rendered incorrectly. The browser was redirected to Cloudflare Access before the page DOM was reached.
- Local-only fixture run produced 54 screenshots, 20 responsive cases and 91 interaction checks with zero overflow, console/page/HTTP errors, failed requests or hard failures. The captures stay artifact-only.
- Required authorized action: configure a Preview-only Cloudflare Access Service Auth policy and supply `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` through GitHub Actions Secrets. Do not send their values in chat or commit them. Rerun capture and require a passing full live coverage audit before storefront UI or routing changes.
- Deployed Preview commit correspondence is still **UNVERIFIED** because Access blocked before a storefront response/build marker could be inspected. No public UI/routing, admin, Production or D1/R2 data was changed in this checkpoint.


## Latest verified checkpoint — 2026-10-20 02:28 UTC

- Current source HEAD at the latest tested run: `8955a8aa5e1bd3bc99ef7cdb1456670908c01a5d`.
- Source/test CI: [run 39358935696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696) — PASS.
- Visual workflow: [run 39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718), artifact [12236194129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718/artifacts/12236194129). Local fixture checks/artifact upload passed; live Preview probe did not pass.
- Live Access result: `accessServiceTokenConfigured=false`, `accessBlocked=true`, zero real screenshots and zero route/viewport probes. Separate read-only fetches of Preview aliases `3ed49bcc`, `9c82d72c`, and `95780a45` all returned `login_required`.
- The screenshot manifest was refreshed at commit `605db27dfb8690647491417a37278d3d916e6a1a`; task ledger and test log were refreshed afterward. No public-site source code was changed during this checkpoint; no Production merge/deploy or data write occurred.
- Continue with independent static source/test work, but do not invent product category/code URL mapping or claim visual completion without real product data and a real Preview baseline. To finish live visual tasks, configure the Preview-only Cloudflare Access Service Auth policy and repository secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`, then rerun baseline capture.


## Recheck hiện hành — 2026-10-20 03:14 UTC (ưu tiên mục này nếu ghi chú cũ mâu thuẫn)

- Branch code commit: `968ec2e3af591dd39bbadc911de655a60135dd0f` ([commit](https://github.com/chichute5500/Sindarealest-admin/commit/968ec2e3af591dd39bbadc911de655a60135dd0f)). Không merge/deploy Production; không đổi binding/secret/dữ liệu Production.
- CSS Liquid Glass: bỏ ghi đè cascade muộn khiến `.service-strip` bị áp riêng nền/blur/border/box-shadow và bỏ nền tối đục trên wrapper `.service`; lớp kính ngoài được kế thừa từ `.glass`, mỗi `.service-copy` giữ mặt kính riêng. Có test hồi quy cho cascade sáng/tối.
- URL trang chi tiết: dùng ánh xạ tường minh từ category key lưu trong DB tới URL slug ổn định: `sneakers→sneaker`, `loafers→giayluoi`, `dress-shoes→giaytay`, `belts→thatlung`, `wallets→vida`, `sandals→dep`, `watch-straps→daydongho`, `phone-cases→oplung`. Middleware, sitemap và JavaScript storefront dùng cùng hợp đồng URL `/sanpham/{mapped-category-slug}/{verified-SKU-or-product-id}`; route cũ `/san-pham/{key}` và category segment sai chuyển hướng 301. SKU chỉ dùng khi `sku_verified` đã bật; JSON-LD không xuất SKU chưa xác minh.
- Source/tests **PASS**: [run 39362965160](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965160) trên `968ec2e3af591dd39bbadc911de655a60135dd0f`. Visual fixture audit **PASS — local only**: [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), [artifact 12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618); 235 fixture products, 54 screenshots, 20 responsive cases, 93 interaction checks, 12 mocked requests, 0 overflow, 0 console/page/HTTP/failed-request/hard failures.
- Preview thật **BLOCKED_ACCESS_GATE**: artifact `12237724618` ghi `accessServiceTokenConfigured=false`, `accessBlocked=true`, 0 screenshot/viewport/route probe; redirect sang Cloudflare Access login. Chưa có genuine start/end screenshot, chưa xác minh deployed Preview commit, chưa pixel diff và chưa thể kết luận visual match 100%. Không dùng fixture screenshots giả làm baseline.
- Admin smoke workflow riêng [run 39362965143](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965143) còn FAIL vì Playwright không tìm thấy `#loginView`/`#loginForm` trên target cấu hình. Đây là hạng mục admin riêng, không chứng minh storefront public sai và chưa được sửa ở đây.
- Branch fix còn các diff không liên quan trong admin/API/migration/config; không merge wholesale.
- Tiếp theo: cấu hình Service Auth policy chỉ dành cho Preview và GitHub Actions secrets `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` (không dán giá trị vào chat); xác minh đúng deployment commit; sau đó kiểm tra URL bằng sản phẩm thật, chụp bộ ảnh start/end cùng viewport/theme và làm pixel + visual comparison. Nếu alias không giữ code trước sửa thì không được gắn nhãn baseline gốc cho ảnh chụp muộn.


## Tiếp tục kiểm toán — 2026-10-20 04:20 UTC (mốc mới nhất)

- **PR/nhánh:** [PR #108](https://github.com/chichute5500/Sindarealest-admin/pull/108) vẫn open/unmerged. HEAD tại checkpoint `33e0d4e0a051d767d7d027006d872872f4517e96`; 75 tệp, 361 commit, +9994/−364. Compare `main...` báo diverged, 361 ahead / 6 behind. Không merge hay deploy Production.
- **Source CI trên HEAD hiện hành:** [run 39368810377](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810377) — PASS trên `33e0d4e0a051d767d7d027006d872872f4517e96`.
- **Regression test vừa bổ sung:** commit `f23032ebf536c30ea6a5432e22870cba51c5b8b5` thêm assertion để ánh xạ slug danh mục trong `public/index.html` và `functions/_lib.js` không lệch nhau. Regex được sửa sau khi run đầu [39368562410](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368562410) phát hiện lỗi của chính test mới; bản sửa [run 39368679776](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368679776) PASS. Không có runtime website change trong commit test này.
- **Visual workflow mới nhất cho code commit có test đã sửa:** [run 39368675236](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236), [artifact 12240562466](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236/artifacts/12240562466) — local fixture pipeline PASS: 235 sản phẩm fixture, 54 ảnh, 0 tràn ngang, 0 lỗi trang/HTTP/hard failure. Embedded direct Preview probe báo `accessServiceTokenConfigured=false`, `accessBlocked=true`, 0/8 viewport-theme pairs, 0 ảnh thật. Visual workflow success không có nghĩa live Preview PASS.
- **Preview trực tiếp:** `https://3ed49bcc.sindarealest2.pages.dev/` vẫn trả `login_required`. Không có screenshot, DOM, deployed commit marker hoặc kiểm thử route live. Cần chủ sở hữu cấu hình Preview-only Cloudflare Access Service Auth và secrets `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET`; không gửi giá trị secret trong chat.
- **Production route baseline (read-only):** sitemap `https://sindarealest2.pages.dev/sitemap.xml` liệt kê 237 URLs, theo dạng `/san-pham/{SKU}`. `/san-pham/SD-SN001` và `/san-pham/SD-ODT007` trả metadata sản phẩm. Ngược lại, `/sanpham/sneaker/SD-SN001` và `/sanpham/sneaker/sneakers-26-41-a` trả homepage metadata/canonical root; route hai đoạn chưa hoạt động trên Production vào lúc kiểm tra. Không sửa/triển khai Production trong công việc này. Điều này cũng **không** xác minh code trên Preview vì Preview bị Access chặn.
- **Admin smoke:** [run 39368810463](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810463) FAIL với selector đăng nhập admin không tìm thấy; đây là phạm vi admin riêng, không dùng làm kết luận lỗi storefront.
- **Phạm vi PR:** ngoài storefront/audit có `public/admin/index.html`, admin APIs, shared middleware/functions, migration, fixture dữ liệu, deploy/config và tài liệu admin. Không merge nguyên PR.
- Không thay đổi HTML/CSS/JS runtime hoặc dữ liệu; không merge/deploy Production.

### Gate còn mở

1. Mở quyền Preview bằng policy/service token chỉ cho alias Preview, sau đó chạy đủ 8 viewport/theme pairs và route checks từ sản phẩm thật.
2. Chụp ảnh baseline/end-of-work thật cùng viewport/theme/state và đối chiếu với hai ảnh PNG gốc. Không dùng fixture screenshot thay thế.
3. Cô lập và review các thay đổi ngoài scope trước khi xem xét merge.
