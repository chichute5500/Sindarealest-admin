# Task ledger — SinDarealest2

Mỗi task có ID bền vững. Cập nhật trạng thái và bằng chứng, không tạo task trùng cho cùng một lỗi.

## Quy ước trạng thái

- `TODO`: chưa bắt đầu.
- `IN_PROGRESS`: đang xử lý; phải ghi người/AI, commit bắt đầu và bước kế tiếp.
- `PASS`: tiêu chí đã đạt và có bằng chứng cụ thể.
- `FAIL`: đã chạy kiểm thử và xác nhận không đạt.
- `BLOCKED`: bị chặn bởi quyền, môi trường, secret, quota hoặc dịch vụ ngoài; phải ghi điều kiện gỡ chặn.
- `UNVERIFIED`: có báo cáo/thay đổi nhưng chưa đủ bằng chứng xác minh.
- `NOT TESTED`: chưa chạy test.
- `NOT APPLICABLE`: chức năng không tồn tại/không thuộc phạm vi, kèm bằng chứng.

## Danh sách công việc ban đầu

> Các trạng thái dưới đây là trạng thái khởi tạo bảo thủ, không phải khẳng định rằng chưa ai từng làm việc. AI tiếp quản phải xác minh lịch sử commit, code và test trước khi đổi trạng thái.

| ID | Hạng mục | Trạng thái hiện tại | Tiêu chí đóng việc / bằng chứng / bước tiếp theo |
|---|---|---|---|
| SETUP-001 | Xác minh nhánh, diff và môi trường Preview | IN_PROGRESS — merge chưa an toàn | HEAD hiện tại `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b`; source/test validation [39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248) **PASS**, gồm project integrity và automated tests sau khi sửa assertion của baseline gate. Visual workflow [39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049) **PASS local fixture only**; artifact [12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807) báo `accessBlocked=true`, `accessServiceTokenConfigured=false`, 0 live screenshots/routes/viewports. Deployment verifier báo thiếu `CLOUDFLARE_ACCOUNT_ID`; cần thêm biến đó và secret `CLOUDFLARE_PAGES_READ_TOKEN`, ngoài cặp Access secrets. Admin Playwright [39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239) vẫn FAIL ở selector đăng nhập; không được coi là kết luận lỗi mật khẩu/app khi Access chưa thông. Không merge nguyên PR #108 hoặc deploy Production. Hướng dẫn gỡ chặn: [PREVIEW-ACCESS-SETUP.md](PREVIEW-ACCESS-SETUP.md). |
| REF-001 | Hiển thị trực quan ảnh mẫu mobile sáng/tối | PASS (reference-only) | Hai PNG gốc đã được mở trực quan từ artifact [12233192824](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779/artifacts/12233192824). Điều này xác nhận hiểu mẫu, không xác nhận Preview đang khớp. |
| SHOT-001 | Xác minh workflow chụp ảnh baseline/end | PASS (current local fixture pipeline; live Preview still blocked) | Latest visual workflow [39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), artifact [12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807): code/source ref `0c5b436c`, 54 local fixture screenshots, 235 fixture products, 20 responsive cases, 93 interaction checks, 0 overflow/console/page/HTTP errors, 0 hard failures. This is a local static preview with fixture data/mock requests—not a live Preview pass. |
| SHOT-002 | Chụp baseline trước khi sửa | BLOCKED — Cloudflare Access + deployment API config | Latest live probe inside [run 39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), [artifact 12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807): redirect to Cloudflare Access, `accessServiceTokenConfigured=false`, 0 screenshots, 0/8 viewport/theme pairs, 0 route checks. Deployment verifier separately reported `BLOCKED_CONFIGURATION` because `CLOUDFLARE_ACCOUNT_ID` is absent; after adding that variable, it will also require `CLOUDFLARE_PAGES_READ_TOKEN` (read-only Pages API token). Access also needs Preview-only Service Auth and secrets `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET`. Do not send token values in chat. |
| UI-001 | Đối chiếu toàn bộ giao diện hiện tại với mẫu gốc | BLOCKED / NOT TESTED live | Hai ảnh PNG tham chiếu gốc tồn tại và đã được mở để xem; local fixture ảnh không phải screenshot Preview. Không thể kết luận giao diện live khớp mẫu vì Access chặn trước khi storefront render; chưa có pixel diff. |
| UI-002 | Kiểm tra hero, nền cũ, lớp phủ và hiệu ứng kính | UPDATED IN SOURCE / LIVE UNVERIFIED | Có cập nhật CSS Liquid Glass và regression guards cho sáu ô; local fixture visual audit PASS. Hero/background/glass chưa được kiểm tra trên Preview thật do Access; không thay logo/ảnh thêm khi chưa có live evidence. |
| UI-003 | Kiểm tra logo, màu sắc và tỷ lệ thương hiệu | NOT TESTED (live) | So sánh fixture với reference cho thấy cần review hero image/brand mark, nhưng chưa có DOM/screenshot live để xác định đó là sai lệch triển khai. Không thay đổi tài sản thương hiệu theo fixture-only evidence. |
| UI-004 | Kiểm tra tương phản và vùng chạm nút gallery | PASS (local contracts only) | Local Playwright audit PASS; tương phản/vùng chạm trên điện thoại thực và Preview thật chưa xác minh. |
| THEME-001 | Kiểm tra chuyển theme, nhấp nháy và layout shift | PASS (local fixture only; live unverified) | Local audit bao phủ Light/Dark và 20 responsive cases, 0 overflow/error. Theme theo system, first-load flicker/refresh trên Preview thật vẫn chưa test. |
| NAV-001 | Kiểm tra Back trên mobile khi overlay mở | PASS (local fixture only) | Assertion route/Back đã được cập nhật cho canonical category route và local audit tại code commit `8785286` vượt qua; hành vi Back/forward trên Preview thật còn BLOCKED. |
| URL-001 | Xác minh URL chi tiết sản phẩm, canonical redirect, direct open/reload/back/forward | IN_PROGRESS — source/local PASS; live BLOCKED | Source hiện dùng category key đã lưu với verified SKU hoặc internal product ID fallback, có legacy route handler và regression tests. Không dùng ID như commercial SKU. Live mapping/direct-open/reload/redirect chưa xác minh do Access. |
| FUNC-001 | Kiểm thử danh mục, tìm kiếm, lọc, chi tiết và URL sản phẩm | IN_PROGRESS — source/local PASS; live BLOCKED | Source/test validation PASS; canonical URL dùng `/sanpham/{stored-category-key}/{verified-SKU-or-product-ID}` và giữ nhận diện route legacy `/san-pham/{key}`. Local route/history checks PASS. Direct-open/reload/share/redirect bằng sản phẩm xuất bản thật chưa kiểm thử được do Access. |
| FUNC-002 | Kiểm thử yêu thích và trạng thái lưu | PASS (local fixture only) | Local audit bao phủ lưu/xóa/mở lại/screen yêu thích; chưa có xác minh live account state. |
| FUNC-003 | Kiểm thử giỏ hàng, số lượng, tổng tiền và cách đóng | IN_PROGRESS (local partial; live blocked) | Local tests bao phủ cart rows/checkout separation và hiển thị giá an toàn khi thiếu giá xác minh; cần hoàn tất kiểm tra quantity/total và hành vi API live khi Preview truy cập được. |
| FUNC-004 | Kiểm thử tài khoản và checkout an toàn | PASS (local/mock only) | Local audit xác minh form/focus và order request giả lập; không gửi đơn thật/ thanh toán thật. API live chưa xác minh. |
| FUNC-005 | Kiểm tra gallery/trình xem ảnh và lỗi tài nguyên | PASS (local fixture only) | Ảnh nhiều góc, thumbnail, fullscreen dialog và Escape pass trong fixture. Ảnh hỏng/reload trên Preview thật chưa test. |
| PERF-001 | Đo hiệu năng và lỗi console/network | PASS (local fixture only; live blocked) | Trên code commit `8785286`: 0 overflow, console errors, page errors, HTTP errors, failed requests và hard failures. Chưa có Performance/network telemetry thật của Preview. |
| AI-001 | Xác minh phạm vi và trạng thái AI gom nhóm ảnh (nếu thuộc nhánh) | NOT APPLICABLE to this website UI audit | AI image-grouping and admin features belong to a separate admin workstream. Do not use this status as a claim that the separate AI feature works or is deployed. |
| REG-001 | Chạy kiểm tra cú pháp, CI và Playwright phù hợp | PASS — source/tests; live/admin visual acceptance remains BLOCKED | Latest source/test validation [39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248) PASS on `0c5b436c` after correcting the baseline-guard regression assertion. Latest visual workflow [39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049) PASS covers local fixtures only. Admin Preview Playwright [39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239) FAILs because the login selectors are absent; Access is a likely gate, but do not infer an application-password defect. Live storefront is definitively BLOCKED by Access, with no real screenshots/routes/viewports. Follow [PREVIEW-ACCESS-SETUP.md](PREVIEW-ACCESS-SETUP.md) for the exact required variable/secrets. |
| SHOT-003 | Chụp ảnh end-of-work và so sánh baseline/mẫu | BLOCKED by SHOT-002 / deployment verification | `start-of-work/` still has no verified live baseline; `end-of-work/` remains empty and pixel comparison is NOT TESTED. Workflow now refuses final archive unless actual deployment metadata confirms the exact Preview alias, successful deployment, selected fix branch and SHA, plus a passing live audit. Never substitute fixtures. |
| SAFE-001 | Rà soát diff và xác nhận không chạm Production/nhánh admin riêng | FAIL for merge readiness / IN_PROGRESS for isolation | PR #108 diverged (345 ahead / 6 behind), 74 changed files, +9693/-364. Diff gồm `public/admin/index.html`, admin APIs/shared middleware, migration `0008_product_sku_verification.sql`, fixture data, setup/deploy files cùng storefront/audit changes. No merge/Production deploy performed by this checkpoint; do not merge as-is. |
| HANDOFF-001 | Cập nhật hồ sơ bàn giao cuối phiên | IN_PROGRESS — current validation captured; live acceptance blocked | Handoff is being refreshed to the current validation [39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248), latest fixture/live probe [39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), and Admin Preview smoke [39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239). Full visual acceptance still requires user-provisioned Preview-only Access and Pages Read API credentials plus a verified live baseline/end comparison. |

## Mẫu thêm task

| ID | Hạng mục | Trạng thái | Ưu tiên | Bằng chứng/commit | Bước tiếp theo |
|---|---|---|---|---|---|
| `AREA-NNN` | Mô tả lỗi cụ thể | TODO | P1/P2/P3 | Link issue/log/ảnh/commit | Hành động cụ thể |

## Quy tắc chống trùng lặp

- Trước khi tạo task mới, tìm ID và mô tả tương tự trong file này.
- Một lỗi gốc chỉ có một task ID; các test liên quan tham chiếu cùng ID.
- Task PASS không được làm lại vô cớ. Nếu sửa code liên quan, tạo lượt hồi quy gắn với commit mới hoặc chuyển trạng thái kèm lý do.
- Sau hai lần sửa không đạt cùng tiêu chí, dừng thay đổi ngẫu nhiên; xem lại giả thuyết, log và môi trường.
- Không xóa task đã đóng; ghi lịch sử ngắn hoặc link commit.


## Bổ sung xác minh 2026-10-20

- Run [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706) thành công trên commit `e3c5c08e633bc73900343933dc3145720fbaefa2`; artifact [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329) tồn tại.
- Phân loại chính xác: SHOT-001/REG-001 PASS cho pipeline local fixture; SHOT-002 vẫn BLOCKED; SHOT-003 chưa làm. Không được nâng trạng thái kiểm tra Preview hoặc so sánh giao diện.
- Lý do không sửa giao diện: chưa có baseline thật và chưa xem trực quan ảnh mẫu. Chuyển route hiện tại cũng chưa đủ căn cứ do legacy records có SKU chưa xác minh.


## Bằng chứng kiểm kê route/dữ liệu legacy — 2026-10-20

Đã đọc `data/legacy-products.json` từ nhánh mục tiêu, blob `99080accf6dd155d24f899231f0b9ffe26bf9b0b`:

- Có 235 bản ghi; cả 235 đều có `sku: null`, `skuVerified: false`; tất cả có `id` và `slug`.
- Phân bố category: `sneakers` 62, `loafers` 52, `dress-shoes` 22, `wallets` 28, `belts` 22, `sandals` 22, `watch-straps` 21, `phone-cases` 6.
- Cả 235 bản ghi có `price: null`; không dùng file fixture này để suy ra giá thực hay SKU thật.
- Hệ quả: chưa thể triển khai route dạng `/sanpham/{category-slug}/{product-code}` một cách trung thực chỉ dựa trên fixture này. Cần đối chiếu nguồn dữ liệu sản phẩm thực/Preview được cấp quyền hoặc có bảng ánh xạ đã xác minh. Không tự suy SKU từ slug.
- Bằng chứng test local được tải từ artifact [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329): 235 fixture products, 0 responsive horizontal overflow, 0 page errors, 0 HTTP errors, 0 console errors; các request mock và hai lỗi 503 kỳ vọng ở warranty lookup là fixture-only. Đây vẫn là test local, không phải Cloudflare Preview.

## Bổ sung 2026-10-20 — điều kiện và rủi ro mới

- SHOT-002 remains BLOCKED: Preview access probes previously returned `login_required`; browser automation retry did not start because the TinyFish wallet is negative. No screenshot was captured in this retry.
- ROUTE-001 (new): TODO — map actual verified product codes to category slugs; preserve existing `/san-pham/{key}` compatibility; coordinate middleware, sitemap, canonical metadata, JS `pushState`/popstate and tests. Do not infer SKU from legacy fixture.
- SAFE-002 (new): TODO — review the full fix-branch diff against the latest main before any merge recommendation. Compare result at the time of audit was `diverged`, ahead 275 / behind 6, and includes public admin/API/migration/config changes outside this visual task. No merge/deploy authorized.
- SHOT-001/REG-001: the latest observed run `39327473706` passed the local capture/test job; archive-save step was skipped because the run was triggered by push.

## Phương án tiếp tục khi Preview bị chặn — 2026-10-20
- SHOT-001 / REG-001: **PASS — local static preview only**. Run mới nhất [39350484564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564) thành công; artifact [12232777359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564/artifacts/12232777359). Số liệu capture/audit đã ghi trong `docs/website-screenshots/manifest.json`.
- SHOT-002: **BLOCKED** — không dừng các phần khác; tiếp tục đọc source và chạy test local. Không dùng ảnh local làm baseline Preview.
- REF-001: **BLOCKED / UNVERIFIED** — GitHub API trả blob SHA của hai PNG tham chiếu nhưng không trả bytes khi yêu cầu base64 (content rỗng); công cụ web cũng trả cache miss. Vì vậy chưa được tuyên bố đã xem trực quan ảnh tham chiếu.
- ROUTE-001: **TODO / UNVERIFIED mapping** — đã đọc `public/index.html` và `functions/_middleware.js`: JS `pushState` + `popstate` và middleware hiện đang dùng `/san-pham/{key}`; middleware tra DB theo slug/id/SKU và redirect key chuẩn. Chưa đổi route sang `/sanpham/{category-slug}/{product-code}` vì 235 fixture legacy không có SKU đã xác minh; cần nguồn dữ liệu thực được cấp quyền.
- UI-001: **NOT TESTED against references** — source có biến CSS `--benefit-tile-glass`, `--benefit-tile-border`, `--benefit-tile-shadow` và style Liquid Glass chung, nhưng chưa đủ bằng chứng để xác nhận bố cục/lớp kính của khu vực sáu ô khớp ảnh gốc. Không sửa CSS theo phỏng đoán.
- SAFE-001: **IN PROGRESS** — không có thay đổi storefront, không merge/deploy Production; tiếp tục audit riêng trên nhánh fix.

## Bổ sung 2026-10-20 — capture thật và so sánh ảnh

- REF-001: **DONE** — ảnh PNG mẫu sáng/tối được đưa nguyên byte vào artifact [12233192824](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779/artifacts/12233192824) và xem trực quan.
- SHOT-001 / REG-001: **PASS — local fixture only** — run [39351043779](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779), 54 screenshots, 20 responsive cases, 91 interaction checks, không có overflow/error theo audit.
- SHOT-002: **BLOCKED** — chưa có baseline Cloudflare Preview thật; không dùng ảnh local để điền thư mục start/end.
- SAFE-002: **IN PROGRESS** — không merge/deploy; nhánh đang diverged và cần review phạm vi trước mọi đề xuất merge.
- Đã thêm capture script trực tiếp Preview, allowlist host non-production, chỉ GET/HEAD, phát hiện Cloudflare Access và từ chối archive nếu capture không phải live/không hoàn tất.
- Đã thêm pixel-diff cho PNG cùng tên giữa hai stage; report sẽ có JSON, HTML và diff mask. Chưa có kết quả so sánh vì hai thư mục stage còn trống.
- UI-001: **NOT TESTED against a real Preview baseline**; storefront HTML/CSS/JS không đổi trong lần bổ sung này.

## Live Preview probe result — 2026-10-20 (run 39352778226)

- **SHOT-002: BLOCKED by Cloudflare Access.** Direct Playwright reached the supplied Preview URL and was redirected to the Cloudflare Access login host. Challenge query parameters were excluded from the saved handoff record.
- Artifact: [12232894712](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226/artifacts/12232894712). The audit JSON confirms `captureCompleted=false`, `accessBlocked=true`, `screenshotCount=0`, and no write requests were sent. Route probes were not attempted because the homepage was gated.
- The push probe uses `continue-on-error: true` only so diagnostics can be uploaded; it does **not** mean the live Preview check passed.
- Safe next step: obtain a user-authorized browser session or Preview-only Access permission for this test alias, then rerun. Do not weaken Production Access.
- Updated audit safeguards redact URL query/fragment values and ignore console errors from the external Cloudflare Access login page, so gate diagnostics are not mislabelled as storefront errors.

## Route audit before URL changes — 2026-10-20

- Current middleware accepts only `/san-pham/{single-segment-key}` and looks up `products.slug`, `products.id`, or `products.sku`. It canonicalizes the path to the existing `/san-pham/{verified SKU or product id}` format.
- Sitemap currently emits `/san-pham/{verified SKU or id}`. Storefront JavaScript only recognizes `/^\/san-pham\/([^/]+)/` to open the detail modal on initial load, and close-detail logic only replaces paths starting `/san-pham/`.
- The storefront category keys are explicitly `sneakers`, `loafers`, `dress-shoes`, `belts`, `wallets`, `sandals`, `watch-straps`, `phone-cases`; the labels are display names and must not be used as slugs. The requested example `/sanpham/giaytay/sd2929` cannot be assumed valid without confirming the database product's category and SKU verification.
- Implementation scope once baseline is available: add an explicit mapping from stored category key to canonical URL slug, validate category + verified SKU/product identity together in middleware, keep legacy single-segment URLs working, update the client route parser/close handler and sitemap, then add positive/negative route tests. Do not create an unverified alias or change canonical URLs before the baseline is archived.
- No route or storefront UI code was changed during this audit.


## Latest continuation checkpoint — 2026-10-20 (commit `fa7445b74661faf260c32b3ab32dfa85e3538e78`)

- **REG-001: PASS — local pipeline only.** [Run 39355499185](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185) completed; project tests, `npm run check`, local Playwright screenshot capture and artifact upload passed. Artifact [12235310623](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185/artifacts/12235310623).
- **SHOT-002: BLOCKED_ACCESS_GATE.** The live Preview probe in the same run detected a redirect to the Cloudflare Access login host: `accessBlocked=true`, `captureCompleted=false`, `screenshotCount=0`. Do not mark the live Preview test as passed just because the overall workflow is green.
- **REF-001: PASS — reference images visually inspected** (artifact includes the original PNGs). This does not establish that the live page matches the references.
- **UI-001/UI-002/UI-003/THEME-001/FUNC-001..005: NOT VERIFIED against live Preview.** No storefront HTML/CSS/JS was changed in this checkpoint; do not claim the visual redesign is complete.
- **SAFE-001: IN PROGRESS.** No merge or Production deployment; public static website scope preserved.
- Separate Admin Preview smoke run [39355503580](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355503580) failed because `#loginView` and `#loginForm` were absent. This is explicitly outside the current public static website scope; track and repair only in the dedicated admin workstream.
- Next: obtain authorized Preview-only Access, then capture the true start baseline, perform evidence-based UI corrections, capture end state, compare screenshots, and review the complete branch diff before any merge recommendation.


## SAFE-002 branch-scope audit — 2026-10-20

- **SAFE-002: FAIL for merge readiness / IN PROGRESS for remediation.** Compare at commit `fa7445b74661faf260c32b3ab32dfa85e3538e78` reports `diverged`, 293 commits ahead, 6 behind and 72 changed files: [compare](https://github.com/chichute5500/Sindarealest-admin/compare/28c768ba26b1d9f7d40e14efac5112526ed1c8b3...fa7445b74661faf260c32b3ab32dfa85e3538e78).
- Scope contamination confirmed: `public/admin/index.html`, multiple `functions/api/admin/*` files, shared middleware/API code, migration `0008_product_sku_verification.sql`, setup/deploy scripts and `data/legacy-products.json` changed alongside `public/index.html` and visual-audit tooling.
- Do not merge PR #108 as-is and do not deploy Production. Before integration, isolate public static UI/audit commits from unrelated admin/API/database/config changes and review the remaining diff against a freshly fetched base.


## Latest static-website continuation — 2026-10-20

- `SHOT-001` Baseline in `docs/website-screenshots/start-of-work/`: **BLOCKED** — live Preview remains behind Cloudflare Access; 0 valid Preview screenshots. Do not substitute the 54 local fixture images.
- `SHOT-002` Result archive in `docs/website-screenshots/end-of-work/`: **NOT TESTED** — no baseline or public UI change to compare.
- `CAPTURE-001` Playwright tooling coverage: **IN PROGRESS** — required four viewport sizes and both themes; homepage viewport/full-page images; seven named sections including `.service-strip`; mobile menu; expanded order details; actual product-card click, direct detail route and reload. Capture report records route, theme, viewport, section and state metadata.
- `ARCHIVE-001` Safe screenshot replacement: **IN PROGRESS** — workflow now requires a passing full live audit, complete theme/viewport/section coverage and four direct/reload product checks before it can replace a canonical stage. Failed Access probes do not archive images.
- `ACCESS-001` Preview authorization: **BLOCKED_ACCESS_GATE** — run [39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764), source `2a66c96457aa2c2b8235bece34a37dc916c6b25f`, final redirect to the Cloudflare Access login host, 0 screenshots. Next diagnostic records only whether the paired optional Access secrets are configured.
- `REF-001` Original reference PNGs: **PASS** — both files were opened and visually reviewed; that is not proof that the blocked live Preview matches them.
- `UI-001/UI-002/THEME-001` Live visual/background/Liquid Glass verification: **BLOCKED** pending a valid live baseline. Keep public HTML/CSS unchanged until capture succeeds.
- `URL-001` Product detail URL audit: **IN PROGRESS / NOT VERIFIED against real Preview data**. Source currently uses `/san-pham/{key}` and middleware/sitemap reflect that one-segment format; target `/sanpham/{category}/{product-code}` is not implemented. Do not invent SKU/category values or change routes until real published product rows and legacy mapping are verified.
- `FUNC-001` Live interactions: **NOT TESTED** — the capture gate prevents storefront content from rendering. Local fixture checks are not substitutes.
- Safety: **PASS for this checkpoint** — only Playwright capture tooling, workflow validation and handoff records were changed; no admin, public UI, D1/R2 data, production configuration, merge or deployment.


## Access-token support and stricter live coverage — 2026-10-20

- **SHOT-002: BLOCKED_ACCESS_GATE — confirmed missing GitHub secrets.** Latest live capture [run 39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764), source commit `2a66c96457aa2c2b8235bece34a37dc916c6b25f`, logs both `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` as empty. It produced 0 screenshots, 0 viewport/theme pairs and stopped before route probes. No bypass or write request occurred.
- **AUDIT-ACCESS-001: IN PROGRESS.** Added optional service-token support through `scripts/cloudflare-access-service-token.mjs`, the direct Preview capture script and the workflow. Tests validate paired configuration, incomplete-pair fail-closed behavior and header isolation to the allowed Preview origin. No credentials were created or committed. User/authorized owner must create a Preview-only Service Auth policy and GitHub Actions secrets.
- **SHOT-004: IN PROGRESS — stricter live capture coverage.** The latest capture harness requires 8 viewport/theme pairs (360×800 mobile, 390×844 mobile, 768×1024 tablet, 1440×900 desktop; light/dark), default and expanded sections, menu state, required section screenshots (hero, benefits, order assurance, featured products, collections, catalog and footer), real card-derived product detail route/reload checks, and broken-image/error checks. The workflow now refuses to archive a baseline unless these required coverage checks pass.
- **REG-001: PASS — tests/local only.** [Source validation run 39357400760](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400760) and [PR validation run 39357404831](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357404831) passed. [Visual run 39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764) uploaded artifact [12235773515](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764/artifacts/12235773515); local fixture audit remained 54 screenshots / 20 responsive cases / 91 interaction checks, with zero document overflow, console/page/HTTP errors, failed requests or hard failures. The overall visual workflow being green is not a live Preview pass; its live probe failed closed on the missing secrets.
- **UI-001 to UI-004, THEME-001, NAV-001, FUNC-001 to FUNC-005, SHOT-003: NOT VERIFIED against the real Preview.** No end-of-work screenshots or image diff exist. This continuation changed audit tooling/docs, not storefront HTML/CSS/JS.
- **SAFE-002: FAIL for merge readiness.** PR #108 remains open and the broad branch diff includes admin/API/migration/config changes outside the static website audit. No merge or Production deployment.
- Next action required to unlock the live-baseline path: configure both secrets as described in `docs/handoff/HANDOFF.md`, rerun `Liquid Glass isolated visual preview` with `start-of-work` and `cloudflare-preview`, then continue the visual discrepancy list only after a complete real capture passes.


## Recheck — current live Access diagnostic (2026-10-20)

- `ACCESS-001`: **BLOCKED_ACCESS_GATE** — [run 39357805505](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505), artifact [12236385238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505/artifacts/12236385238), capture source commit `39389c66c97f88f49d6994e1178ceeaf6eb264e3`. `accessServiceTokenConfigured=false`, 0 viewport/theme captures, 0 section captures, 0 product-route probes, 0 screenshots.
- `SHOT-001`: **BLOCKED**, start archive empty. `SHOT-002`: **NOT TESTED**, end archive empty. Pixel comparison **NOT TESTED**.
- `UI-001/UI-002/THEME-001`: **BLOCKED / NOT TESTED live**. Keep public styling unchanged until authorized Preview access and code-to-deployment match can be checked.
- `URL-001`: **NOT VERIFIED against live data**. Current source route remains `/san-pham/{key}`; `/sanpham/{category}/{product-code}` is not implemented. Do not infer codes/categories from the 235-row legacy fixture.
- Branch compare at `8dda620a6e2fede306de9ad3440ff5e34b338eb1`: diverged, 311 ahead / 6 behind / 73 files changed. Scope includes unrelated admin/API/migration/config changes; no merge/deploy.


## Cập nhật bằng chứng — 2026-10-20 02:28 UTC

- Branch HEAD: `8955a8aa5e1bd3bc99ef7cdb1456670908c01a5d` (commit: browser Back closes product detail overlay).
- Source/test CI: [39358935696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696) — PASS.
- Visual workflow: [39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718); artifact [12236194129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718/artifacts/12236194129) — local fixture checks/artifact upload PASS, live Preview probe BLOCKED.
- Exact live blocker: `accessServiceTokenConfigured=false`, `accessBlocked=true`, 0 real screenshots, redirected to Cloudflare Access login. The same outcome was independently observed on Preview aliases `3ed49bcc`, `9c82d72c`, and `95780a45` by a separate read-only fetch.
- The manifest was refreshed in commit `605db27dfb8690647491417a37278d3d916e6a1a`. Do not close SHOT-002, UI-001/002, THEME-001, FUNC-001, SHOT-003 or HANDOFF-001 until the Access gate is resolved and real before/after evidence exists.


## Recheck mới nhất — 2026-10-20 03:02 UTC (supersedes older status entries)

- **REG-001 source/tests: PASS** on `878528620fc519b04fe0a3b36b961eb53d2647d3` — [run 39361899889](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361899889).
- **SHOT-001 local capture harness / fixture audit: PASS — local only** — [run 39361896954](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954), [artifact 12237048814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954/artifacts/12237048814): 54 screenshots, 235 fixture records, 20 responsive cases, 93 interactions, 12 mocked requests, zero overflow/errors/hard failures. These are not screenshots of the Cloudflare Pages Preview.
- **SHOT-002 real Preview baseline: BLOCKED** — the same run reports `accessBlocked=true`, `accessServiceTokenConfigured=false`, 0 screenshot/viewport/route probes; the Preview redirects to the Cloudflare Access login host. Canonical `start-of-work/` stays empty. Do not substitute local fixtures or reference PNGs.
- **SHOT-003 end-of-work and pixel comparison: NOT TESTED** — no verified live baseline and no live capture; both stages remain empty.
- **UI / Liquid Glass source work: UPDATED, visually UNVERIFIED on live Preview** — removed late shared-glass overrides on the six-tile `.service-strip`, retained tile-specific material, and removed the dark-mode opaque background from tile wrappers. Need live before/after captures and visual comparison before declaring acceptance.
- **ROUTE-001 source implementation: CODED / source tests PASS; live data remains UNVERIFIED** — new canonical URL uses `/sanpham/{products.category}/{verified SKU or product ID}`, not display label; middleware, sitemap, SEO canonical/OG, client deep links/history, legacy 301 redirect and route regression tests are aligned. JSON-LD omits unverified SKU. Test direct-open/reload/share from an actual rendered Preview card after Access is fixed.
- **Separate Admin Preview check: FAIL / outside public storefront scope** — [run 39361899892](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361899892) cannot find `#loginView` / `#loginForm` on the configured target. Inspect correct configured Preview target/markup in the dedicated admin task; do not count this as a public storefront pass.
- **Scope guard:** no Production merge/deployment or binding/secret changes. Fix branch still has unrelated admin/API/migration/config diffs; do not merge wholesale.


## Latest verified checkpoint — 2026-10-20 03:06 UTC (supersedes stale table evidence)

- Branch HEAD: `d6999c6a4afc35a2b1222f161dda1a46b72b3848`; commit hiện tại chỉ chỉnh câu chữ handoff trên code commit `878528620fc519b04fe0a3b36b961eb53d2647d3`.
- Source/tests: PASS — [run 39362467340](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362467340). Visual audit of code commit: PASS for local fixtures — [run 39361896954](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954), [artifact 12237048814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954/artifacts/12237048814).
- Local audit counts: 235 fixtures, 54 screenshots, 20 responsive cases, 93 interactions, 12 mocked requests, 0 overflow, 0 console/page/HTTP/failed-request/hard failures.
- Live Preview: BLOCKED_ACCESS_GATE. Both the exact current deployment `https://d2f4aff2.sindarealest2.pages.dev/` and branch alias returned `login_required`; 0 genuine live screenshots and no live route/viewport probes.
- Current PR #108: open/unmerged; 74 files changed; 345 commits; +9693/-364; diverged from main by 345 ahead / 6 behind. This PR is not merge-ready due out-of-scope admin/API/migration/data/setup changes.
- Admin smoke [39362467402](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362467402) FAIL: login selectors absent; this is outside public storefront scope.
- No merge, source change, secrets/config change or Production deployment was performed by this session.

## Recheck mới nhất — 2026-10-20 03:14 UTC (supersedes earlier evidence below)

- **REG-001 source/tests: PASS** — commit `968ec2e3af591dd39bbadc911de655a60135dd0f`, [run 39362965160](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965160).
- **SHOT-001 fixture capture: PASS — local only** — [visual workflow 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), [artifact 12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618); 54 local screenshots, 235 fixture products, 20 responsive cases, 93 interactions, 12 mocked requests, 0 local overflow/errors/hard failures. These are not Preview screenshots.
- **SHOT-002 genuine Preview baseline: BLOCKED** — live probe in the same artifact has `accessBlocked=true`, `accessServiceTokenConfigured=false`, 0 screenshots/viewports/routes. Canonical start archive remains empty.
- **SHOT-003 end archive/pixel diff: NOT TESTED** — need genuine matched Preview captures; do not put local fixtures in the canonical archive.
- **UI-001/002 Liquid Glass: source updated, live visual review BLOCKED** — removed redundant late glass overrides and the dark opaque wrapper background. Local screenshots were inspected; acceptance against the deployed site/reference still needs live before/after comparison.
- **URL-001 ROUTE-001: source and tests PASS; live data UNVERIFIED** — explicit mapping `dress-shoes→giaytay`, `sneakers→sneaker`, `loafers→giayluoi`, `belts→thatlung`, `wallets→vida`, `sandals→dep`, `watch-straps→daydongho`, `phone-cases→oplung`. Canonical format `/sanpham/{mapped-category-slug}/{verified-SKU-or-product-ID}`; legacy route redirects 301; unverified SKU is not exposed in Product JSON-LD. Test real card click/direct-open/reload/Back/Forward/share only after Access opens the Preview.
- **Admin Preview test: FAIL / separate blocker** — [run 39362965143](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965143) cannot find `#loginView` / `#loginForm` at its configured target. Do not count this as storefront pass or alter admin within this static-public task without verifying its target.
- **Scope guard:** no Production merge/deploy, no data or bindings changes. PR #108 contains unrelated admin/API/migration/config diffs; don't merge wholesale.


## Mốc kiểm toán tiếp tục — 2026-10-20 04:20 UTC (supersedes statuses above when conflicting)

| ID | Trạng thái | Bằng chứng mới nhất | Bước tiếp theo |
|---|---|---|---|
| SETUP-001 | PASS cho trạng thái repo; FAIL cho merge readiness | PR #108 open, HEAD `33e0d4e0a051d767d7d027006d872872f4517e96`; [source validation 39368810377](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810377) PASS; 75 files, compare 361 ahead / 6 behind. | Review/isolated scope before any merge discussion. |
| REG-001 | PASS — source/test CI | [Run 39368810377](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810377) PASS on current docs HEAD. | Rerun after further runtime/test changes. |
| ROUTE-MAP-001 | PASS — new regression guard | Added map-parity assertion in `tests/product-route-canonical.test.mjs`; after fixing the assertion regex, [run 39368679776](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368679776) PASS on code/test commit `f23032e`. | Keep this regression guard; do not change route runtime based on Production before Preview is accessible. |
| SHOT-001 | PASS — local fixture only | [Visual run 39368675236](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236), [artifact 12240562466](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236/artifacts/12240562466): 235 fixture products, 54 screenshots, 0 overflow, 0 page/HTTP/hard failures. | Retain as local-only evidence. |
| SHOT-002 | BLOCKED_ACCESS_GATE | Preview `3ed49bcc` returns `login_required`; run 39368675236 reports no paired service token, access blocked, 0 screenshot/viewport/route checks. | Owner must configure Preview-only Service Auth + paired secrets. |
| UI-001/UI-002/THEME-001 | NOT VERIFIED on Preview | Only fixture images and references are available; no authentic Preview screenshot or pixel diff. | Capture live at 360×800, 390×844, 768×1024, 1440×900 in Light/Dark after Access setup. |
| URL-001/FUNC-001 | Source/local tests PASS; live Preview BLOCKED | Source route map has parity test. Production read-only baseline shows old `/san-pham/{SKU}` URLs work, while new `/sanpham/{category}/{key}` paths fall back to homepage metadata. This is not Preview evidence. | Do not change Production; validate new routes and legacy redirects on accessible Preview before acceptance. |
| SHOT-003 | NOT TESTED | No authentic baseline/end screenshot pair and no pixel diff. | Keep canonical end folder unmodified until live capture passes. |
| SAFE-001/SAFE-002 | FAIL — merge readiness | PR has 75 files and 361 commits ahead / 6 behind; includes out-of-scope admin/API/migration/data/deploy changes. | Isolate/review these changes; do not merge wholesale. |
| ADMIN-SMOKE-001 | FAIL, out of scope | [Run 39368810463](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810463) is the admin Playwright failure; selectors absent. | Leave for separate admin workstream. |

Estimated progress index, equal weight across code/tooling 85%, local test 100%, live Preview 0%, visual comparison 0%, documentation 90% = **55%**. This is an audit-progress estimate, not a claim that the website is 55% built or accepted; live visual gates are still blocked.


## Mốc kiểm toán mới nhất — 2026-10-20 04:45 UTC (ghi đè trạng thái cũ khi xung đột)

| ID | Trạng thái | Bằng chứng mới nhất | Bước tiếp theo |
|---|---|---|---|
| SETUP-001 | PASS cho kiểm tra source/test; FAIL cho merge readiness | HEAD `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b`; [validation run 39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248) PASS. PR #108 vẫn có khác biệt rộng ngoài phạm vi. | Không merge nguyên PR/không deploy Production; cô lập scope trước bất kỳ tích hợp nào. |
| REG-001 | PASS | [Run 39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248): validate project integrity + automated tests thành công sau khi sửa regex assertion. | Giữ regression tests và chỉ sửa tiếp khi CI có lỗi cụ thể. |
| SHOT-001 | PASS — local fixtures only | [Visual run 39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), [artifact 12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807): 54 fixture screenshots, 235 products, 20 responsive cases, 93 interactions, 0 overflow/console/page/HTTP errors; local audit passed. | Giữ fixture làm regression evidence, tuyệt đối không chép sang thư mục ảnh thật. |
| SHOT-002 | BLOCKED_ACCESS_GATE + deployment verifier missing config | Cùng artifact: live capture 0 screenshots/routes/viewports; redirected to Cloudflare Access; `accessServiceTokenConfigured=false`. `deployment-verification.json` status `BLOCKED_CONFIGURATION`, thiếu `CLOUDFLARE_ACCOUNT_ID`. | Chủ sở hữu cần cấu hình Preview-only Access Service Auth + `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, repo Variable `CLOUDFLARE_ACCOUNT_ID`, Secret `CLOUDFLARE_PAGES_READ_TOKEN`. |
| ADMIN-SMOKE-001 | FAIL/BLOCKED, separate admin pipeline | [Run 39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239): test không tìm thấy `#loginView`/`#loginForm`. Đây chưa chứng minh app login sai; test hiện không có Access headers. | Sau khi Preview Access được cấp, kiểm tra URL admin target/tầng Access; không thay đổi admin auth/security ngoài phạm vi này. |
| UI-001/UI-002/THEME-001 | NOT VERIFIED on live Preview | Fixture audit pass không cung cấp live screenshot; canonical `start-of-work/` vẫn trống. | Capture thật 360×800, 390×844, 768×1024, 1440×900, Light/Dark khi Access/API config đủ. |
| URL-001/FUNC-001 | Source/local tests PASS; live BLOCKED | Các test route local hiện xanh; artifact live probe có 0 route checks vì Access redirect. | Kiểm thử click/direct-open/reload/legacy/back-forward bằng sản phẩm render từ API thật sau khi truy cập được. |
| SHOT-003 | NOT TESTED | Chưa có cặp baseline/end thật, chưa pixel diff. Workflow đã khóa end archive nếu baseline chưa verify và yêu cầu human review sau diff. | Chỉ chạy end-of-work sau baseline PASS; xem thủ công diff artifact. |
| SAFE-001 | FAIL — merge readiness | PR #108 vẫn chứa admin/API/migration/data/deploy/config ngoài scope. | Không merge wholesale. |
| Production | UNCHANGED | Không có merge/deploy/config changes vào Production trong lượt này. | Giữ nguyên. |

**Tiến độ ước tính: 58%** — source/regression tooling và local QA có bằng chứng PASS; live capture, route acceptance và visual comparison vẫn 0% cho đến khi Access/API credentials được cấu hình. Đây là chỉ số hoàn tất nhiệm vụ audit, không phải % website được xây dựng.


## Cập nhật xác minh sau mốc 11:06 UTC — 2026-10-20 18:13 ICT (11:13 UTC)

- **PR HEAD hiện tại:** `d646934407daee83b3bdd58240e23506e7442305`; PR #108 vẫn OPEN, chưa merge, 81 file thay đổi / 403 commits. So với code audit `5f181d994bf0edb7a4e553c64ba97cddf55e31c4`, commit này chỉ cập nhật hồ sơ tiến độ, hướng dẫn Preview và manifest; không thay runtime HTML/CSS.
- **Validate source/tests PASS** trên HEAD hiện tại: [run 39412627375](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627375).
- **Admin Preview Playwright PASS, 2/2** trên HEAD hiện tại: [run 39412627328](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627328).
- **Live visual audit gần nhất** vẫn là [run 39411977810](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810), [artifact 12260286017](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810/artifacts/12260286017), chạy source commit `5f181d994bf0edb7a4e553c64ba97cddf55e31c4`: workflow outer SUCCESS nhưng JSON audit `passed=false`, 46 ảnh; 8/8 viewport-theme pairs; đủ ảnh 7 section; menu-open=2, order-expanded=4; 4/4 product route checks FAIL.
- **Live Preview status:** `accessBlocked=false`, `accessServiceTokenConfigured=true`, 0 overflow, console/page/same-origin HTTP errors, failed requests, broken image contexts và read-only violations. Đây không xoá bỏ lỗi route.
- **Deployment verifier:** `API_AUTHENTICATION_REJECTED`, HTTP 401; Cloudflare không chấp nhận `CLOUDFLARE_PAGES_READ_TOKEN`. Chưa xác minh được deployment ID/branch/SHA nên chưa phân biệt được runtime route bug với Preview chạy source cũ.
- **Route mismatch:** live click path `/san-pham/sneakers-26-41-a`; code/test kỳ vọng canonical `/sanpham/{category-slug}/{product-key}`. Không sửa runtime route chỉ để làm xanh Playwright trước khi verifier chứng minh Preview đang chạy đúng SHA.
- **Ảnh chuẩn:** baseline BLOCKED, end-of-work NOT TESTED, pixel diff NOT TESTED. Artifact 12260286017 chỉ là bằng chứng chẩn đoán; không chép vào thư mục chuẩn.
- **Tiến độ ước tính giữ ở 62%** cho audit/QA tổng thể. Chưa đạt 100% vì deployment metadata, route checks, live acceptance, baseline/end và visual review vẫn chưa đạt.



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
