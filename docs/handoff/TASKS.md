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
| SETUP-001 | Xác minh nhánh, HEAD, diff và môi trường Preview | IN_PROGRESS | Đã xác minh nhánh `fix/liquid-glass-audit-2026-10-19`, commit được workflow kiểm thử `8955a8aa5e1bd3bc99ef7cdb1456670908c01a5d`; source/test validation [39358935696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696) PASS. Current visual workflow [39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718) still receives `login_required` from Cloudflare Access. HEAD and CI are verified; deployed Preview commit is UNVERIFIED until Access permits a storefront response. |
| REF-001 | Hiển thị trực quan ảnh mẫu mobile sáng/tối | PASS (reference-only) | Hai PNG gốc đã được mở trực quan từ artifact [12233192824](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779/artifacts/12233192824). Điều này xác nhận hiểu mẫu, không xác nhận Preview đang khớp. |
| SHOT-001 | Xác minh workflow chụp ảnh baseline/end | PASS (local pipeline only) | Latest visual workflow [39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718) completed; artifact [12236194129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718/artifacts/12236194129) includes local captures and direct-Preview diagnostics. Source/tests pass, but the real Preview capture remains blocked by Cloudflare Access; this is not a live visual PASS. |
| SHOT-002 | Chụp baseline trước khi sửa | BLOCKED (missing Access secrets) | Latest live probe [39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718) still reports `accessServiceTokenConfigured=false`, `accessBlocked=true`, and zero real Preview screenshots. The log confirms both `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are absent. Configure a Preview-only Service Auth policy and both GitHub Actions secrets; never substitute local fixture images. |
| UI-001 | Đối chiếu toàn bộ giao diện hiện tại với mẫu gốc | BLOCKED / NOT TESTED on live Preview | Original design references have been visually inspected, and local fixture screenshots reviewed; no true Cloudflare Preview baseline exists. Do not claim a visual match until the Access gate is resolved and the same viewports are captured. |
| UI-002 | Kiểm tra hero, nền cũ, lớp phủ và hiệu ứng kính | NOT TESTED (live) | Local screenshots reviewed for orientation only; validate the deployed Preview in both themes and compare the hero/background/glass against the references after a live baseline exists. |
| UI-003 | Kiểm tra logo, màu sắc và tỷ lệ thương hiệu | NOT TESTED (live) | Local tests see the logo asset loaded, but the logo/color/scale have not been confirmed against the real Preview. Preserve the source asset; no speculative filter. |
| UI-004 | Kiểm tra tương phản và vùng chạm các nút gallery | PASS (local contracts only) | Local Playwright confirms gallery/detail dialog semantics, focus restoration, Escape close and thumbnail selection. Real-device contrast/touch-target review on Cloudflare Preview remains NOT TESTED. |
| THEME-001 | Kiểm tra chuyển theme, nhấp nháy và layout shift | IN_PROGRESS (local pass / live unverified) | Local checks pass manual theme round-trip and changes between light/dark OS preferences. Confirm first-load flicker, refresh and navigation on the true Preview after Access is configured. |
| NAV-001 | Kiểm tra Back trên mobile khi overlay mở | NOT TESTED | Current local interaction audit does not provide complete evidence for the physical/browser Back contract when multiple overlays are open. Add/execute this test before closing. |
| FUNC-001 | Kiểm thử danh mục, tìm kiếm, lọc, chi tiết và URL sản phẩm | IN_PROGRESS (partial local pass) | Local audit confirms detail modal route, thumbnails and closing route restoration; complete category/search/filter and live direct-open/refresh/share using real Preview cards. New live capture derives the URL from an actual rendered product card rather than invented SKU. |
| FUNC-002 | Kiểm thử yêu thích và trạng thái lưu | PASS (local fixture only) | Local Playwright verifies add/remove favorites, saved product image, favorites view, correct product reopening and empty state. Live Preview remains unverified. |
| FUNC-003 | Kiểm thử giỏ hàng, số lượng, tổng tiền và cách đóng | IN_PROGRESS (partial local pass) | Local audit verifies add/open cart, multiple distinct rows, safe unverified-price display and separated accessible checkout; complete quantity increment/decrement and final totals in local and live contexts. |
| FUNC-004 | Kiểm thử tài khoản và checkout an toàn | PASS (local fixture only) | Local audit verifies form validation, keyboard focus trap, focus restoration, local-only order request and no stored customer PII in the mocked request record. No real order/payment was sent; live API state is unverified. |
| FUNC-005 | Kiểm tra gallery/trình xem ảnh và lỗi tài nguyên | PASS (local fixture only) | Local audit verifies multiple images, thumbnail switching, fullscreen gallery dialog, focus restoration and Escape behavior. Complete broken-image and detail reload checks on real Preview when authorized. |
| PERF-001 | Đo hiệu năng và lỗi console/network | IN_PROGRESS (local pass / live blocked) | Latest local fixture audit: zero document overflow, console/page/HTTP errors, failed requests or hard failures. No actual Preview performance or network results exist because Access stops initial navigation. |
| AI-001 | Xác minh phạm vi và trạng thái AI gom nhóm ảnh (nếu thuộc nhánh) | NOT APPLICABLE to this website UI audit | AI image-grouping and admin features belong to a separate admin workstream. Do not use this status as a claim that the separate AI feature works or is deployed. |
| REG-001 | Chạy kiểm tra cú pháp, CI và Playwright phù hợp | PASS (local / source validation) | Latest source validation [39358935696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696) passed on `8955a8aa5e1bd3bc99ef7cdb1456670908c01a5d`; latest visual workflow [39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718) passed local checks and uploaded fixtures, but its live probe remains blocked by Access. |
| SHOT-003 | Chụp ảnh end-of-work và so sánh baseline/mẫu | BLOCKED by SHOT-002 | Do not create end-of-work images or pixel diffs until a true Preview start baseline exists and code changes have been made against evidenced mismatches. |
| SAFE-001 | Rà soát diff và xác nhận không chạm Production/nhánh admin riêng | IN_PROGRESS | Phiên này chỉ đọc GitHub và ghi nhận hồ sơ nhánh fix; chưa sửa website code, không deploy/merge Production. Tiếp tục kiểm tra diff trước khi hoàn tất. |
| HANDOFF-001 | Cập nhật hồ sơ bàn giao cuối phiên | IN_PROGRESS | Cập nhật test log/task ledger trong phiên này; cập nhật tiếp khi có ảnh baseline và kết quả Preview. |

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
