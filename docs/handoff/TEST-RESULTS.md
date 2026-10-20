# Test results ledger — SinDarealest2

Ghi mỗi lượt test thực sự đã chạy. Không ghi test dự định chạy vào phần kết quả như thể đã chạy.

## Quy tắc ghi nhận

Mỗi bản ghi phải có:
- Thời gian (UTC).
- Commit SHA được test và nhánh.
- URL/môi trường (Preview/local/CI); không ghi secret.
- Công cụ, suite và lệnh/workflow.
- Viewport, theme và trạng thái giao diện nếu là test UI.
- PASS/FAIL/BLOCKED/NOT TESTED.
- Tóm tắt kết quả và link log/artifact/screenshot.
- Task ID liên quan.
- Ghi chú nếu kết quả cũ không còn áp dụng do code hoặc môi trường thay đổi.

Không dùng kết quả của commit cũ để tuyên bố commit mới đã PASS khi có thay đổi liên quan. Không ghi nhận mock là test dịch vụ thật.

## Kết quả đã xác minh

### 2026-10-20 18:13 ICT (11:13 UTC) — CI trên HEAD hiện tại và live audit cuối cùng

- Branch `fix/liquid-glass-audit-2026-10-19`; HEAD `d646934407daee83b3bdd58240e23506e7442305`. Commit code/runtime đã chạy visual audit gần nhất: `5f181d994bf0edb7a4e553c64ba97cddf55e31c4`; commits kế tiếp trước HEAD chỉ cập nhật docs/manifest, không sửa storefront runtime.
- Source/test validation: **PASS** — [run 39412627375](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627375).
- Admin Preview Playwright: **PASS, 2/2** — [run 39412627328](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627328).
- Live visual run: [39411977810](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810), [artifact 12260286017](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810/artifacts/12260286017). Outer workflow SUCCESS is diagnostic-only; actual `live-preview/visual-audit.json` is `passed=false`.
- Actual live coverage: 46 screenshots; 8/8 viewport-theme pairs; 7 required sections have 4 each; menu-open=2; order-expanded=4; 4/4 product route checks FAIL on `/san-pham/sneakers-26-41-a` vs expected `/sanpham/{category-slug}/{product-key}`.
- Responsive/runtime signal: overflow=0; console/page/same-origin HTTP errors=0; failed requests=0; broken image contexts=0; read-only violations=0; Cloudflare Access passed.
- Deployment metadata verifier: **API_AUTHENTICATION_REJECTED, HTTP 401**. The secret `CLOUDFLARE_PAGES_READ_TOKEN` is rejected by Cloudflare, so alias-to-deployment branch/SHA remains unverified.
- Canonical screenshots: baseline BLOCKED / end NOT TESTED / pixel diff NOT TESTED. Production unchanged; PR #108 remains open/unmerged and too broad to merge wholesale.


### 2026-10-20 04:43–04:45 UTC — regression validation, screenshot workflow and Preview probe

- Branch: `fix/liquid-glass-audit-2026-10-19`; validated commit `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b`.
- **Source/test validation: PASS** — [run 39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248). The project-integrity and automated-test steps completed successfully after fixing the test assertion regex. The prior failure was in the new test's regex ordering, not storefront runtime.
- **Local fixture visual audit: PASS (fixture-only)** — [run 39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), [artifact 12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807). It captured 54 screenshots with 235 fixture products, 20 responsive cases and 93 interaction checks; 0 responsive overflow, console/page/HTTP errors, failed requests or hard failures. Requests/data are local fixture/mock traffic, not a live Preview test.
- **Live Preview probe: BLOCKED_ACCESS_GATE** in the same artifact. The capture report records `accessServiceTokenConfigured=false`, redirect to Cloudflare Access, 0 genuine screenshots, 0 viewport/theme pairs and 0 route probes. Because push-triggered capture is diagnostic-only, canonical start/end archive folders were not written.
- **Deployment metadata verification: BLOCKED_CONFIGURATION** in `deployment-verification.json`. Missing GitHub repository variable `CLOUDFLARE_ACCOUNT_ID`; after that, verification also requires a read-only `CLOUDFLARE_PAGES_READ_TOKEN` secret. It rejects archive until the exact alias maps to a successful Preview deployment on the selected fix branch with a verified SHA.
- **Admin Preview Playwright: FAIL/BLOCKED** — [run 39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239). The tests fail to find `#loginView`/`#loginForm`. The admin workflow currently passes `ADMIN_TEST_URL`/`ADMIN_TEST_PASSWORD`, not Cloudflare Access headers; this result is not proof of an app-password/login defect.
- Added unit assertions for Preview host validation, alias match, expected branch, deployment environment, success stage and verified commit SHA. The test suite including those assertions is covered by run 39371075248.
- Production was not merged/deployed or reconfigured. No genuine start/end screenshots or pixel comparison are claimed.
- Required next owner action: configure Preview-only Access Service Auth + repo Secrets `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `CLOUDFLARE_PAGES_READ_TOKEN`, and repo Variable `CLOUDFLARE_ACCOUNT_ID` as explained in [PREVIEW-ACCESS-SETUP.md](PREVIEW-ACCESS-SETUP.md). Do not paste secret values into chat or code.


### 2026-10-20 04:11 UTC — kiểm tra nguồn mới nhất và smoke test Preview

- Code-bearing commit: `562d7d77624f7431296cb217b2b6d6592aca9ce4`. Validation chạy trên docs-only commit `7d5de0114025df35974067c0c1bf481f95be7fd6`.
- Source/test validation: **PASS**, [run 39368493275](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368493275). Project-integrity checks và automated tests đều hoàn thành thành công.
- Admin Preview Playwright: **FAIL/BLOCKED**, [run 39368493324](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368493324). Hai test không tìm thấy `#loginView`/`#loginForm`; workflow inject `ADMIN_TEST_URL` và `ADMIN_TEST_PASSWORD` nhưng không inject Access service-token headers. Vì vậy chưa xác minh được login/dashboard thật và không kết luận đây là lỗi mật khẩu hay app.
- Live storefront probe gần nhất vẫn là [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193): `accessServiceTokenConfigured=false`, `accessBlocked=true`, 0 screenshot/route/viewport thật. Các commit mới là docs-only nên chưa phát sinh capture live mới.
- Local fixture audit [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), [artifact 12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618) vẫn PASS trong phạm vi fixture (54 ảnh, 235 sản phẩm, 20 responsive cases, 93 interaction checks); không thể thay cho website Preview thật.
- Hướng dẫn an toàn để mở access chỉ cho Preview: [PREVIEW-ACCESS-SETUP.md](PREVIEW-ACCESS-SETUP.md). Không đưa token vào chat/log/commit; không mở policy cho Production.
- Production không được merge/deploy/chỉnh cấu hình trong lượt kiểm tra này.


### 2026-10-20 04:02–04:03 UTC — kiểm tra HEAD tài liệu mới nhất

- Commit đã được kiểm thử: `1d261598c4e481ede062eed8ff32c374ffe67373`; nhánh `fix/liquid-glass-audit-2026-10-19`.
- Source/test validation: **PASS**, [run 39367417810](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39367417810). Commit này chỉ thay đổi docs so với code HEAD `562d7d77624f7431296cb217b2b6d6592aca9ce4`; các commit ghi nhật ký sau đó cũng chỉ sửa docs.
- Admin Preview Playwright: **FAIL/BLOCKED**, [run 39367417804](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39367417804). Hai bài test không tìm thấy `#loginView`/`#loginForm`. Bằng chứng live độc lập [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193) cho thấy redirect Cloudflare Access, cặp secrets service-token không được cấu hình trong Actions và 0 ảnh/route/viewport thật. Log Playwright này không tự xác định trang đích, nên không kết luận là lỗi mật khẩu hay lỗi form ứng dụng.
- Live storefront capture **chưa chạy lại** trên docs-only pushes vì workflow bỏ qua các đường dẫn tài liệu; kết quả live gần nhất vẫn **BLOCKED_ACCESS_GATE**.
- Local fixture audit [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), [artifact 12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618): 54 ảnh fixture, 235 sản phẩm fixture, 20 responsive cases, 93 interaction checks; 0 overflow/console/page/HTTP errors trong phạm vi fixture. So sánh commit xác nhận source/test/capture script không đổi giữa fixture audit và code HEAD; đây **không** phải screenshot Preview thật.
- Production không được merge/deploy/thay cấu hình trong lượt kiểm tra này.
- Điều kiện còn thiếu để kết thúc nghiệm thu trực quan: cấu hình Cloudflare Access Service Auth policy chỉ cho Preview; thêm GitHub Actions secrets `CF_ACCESS_CLIENT_ID` và `CF_ACCESS_CLIENT_SECRET` (không gửi giá trị trong chat); chạy capture baseline trên Preview đã xác minh commit; sau đó mới chạy route/theme/responsive kiểm thử trực tiếp và lưu ảnh end-of-work để pixel-compare với baseline ở cùng viewport/theme/state.


### 2026-10-20 03:15 UTC — Source validation và Admin Preview trên HEAD mới nhất

- Commit: `562d7d77624f7431296cb217b2b6d6592aca9ce4`; branch: `fix/liquid-glass-audit-2026-10-19`.
- Source/test validation: **PASS**, [run 39363358025](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39363358025).
- Admin Preview Playwright: **FAIL/BLOCKED**, [run 39363358006](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39363358006). Hai test không thấy `#loginForm` trên Preview. Do trang bị Cloudflare Access chặn trước app, đây không phải bằng chứng lỗi mật khẩu hoặc lỗi form đăng nhập ứng dụng.
- Live capture gần nhất: [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), `accessServiceTokenConfigured=false`, `accessBlocked=true`, zero live screenshots/routes/viewports.
- Local visual fixture audit gần nhất: [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), [artifact 12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618), PASS trên commit cũ `968ec2e3` (54 fixture screenshots, 235 fixture products, 20 responsive cases, 93 interaction checks). Không áp dụng làm visual PASS cho HEAD `562d7d77624f7431296cb217b2b6d6592aca9ce4` hay Preview thật.
- Task IDs: SETUP-001, SHOT-001, SHOT-002, REG-001.


### 2026-10-19 20:39–20:41 UTC — GitHub Actions visual-preview

- Commit: `c1757447f3b30aee9923297aca2c8ab89a42775d`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- Environment / URL: local static server `http://127.0.0.1:4173/`, phục vụ thư mục `public`; không phải Cloudflare Preview.
- Tool / workflow run: [GitHub Actions run 39320885814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814), job `visual-preview` ID `118295011697`.
- Viewport / theme / state: 10 configured viewport sizes (320×720, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 1024×768, 1366×768, 1440×900), light/dark; 54 screenshots reported.
- Status: **PASS — local/fixture checks only**.
- Kết quả: `npm test` PASS; `npm run check` PASS; 235 fixture products; 54 screenshots; responsiveOverflowCount=0; pageErrors=0; httpErrors=0; hardFailures=[].
- Log: [workflow run](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814). Artifact: [sindarealest-liquid-glass-preview-239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814/artifacts/12218939627).
- Task IDs: SHOT-001, PERF-001, REG-001.
- Có cần chạy lại không? Chưa cần lặp lại cùng commit nếu không có code/config đổi; cần chạy baseline archive và kiểm tra deployed Preview riêng.
- Giới hạn: workflow chỉ chụp local static preview với fixture. Workflow tự động ở run này **không** lưu ảnh vào `docs/website-screenshots/start-of-work/` hay `end-of-work/`; bước lưu chỉ chạy khi `workflow_dispatch`. Kết quả không xác nhận deployed Cloudflare Preview, URL routing của Pages Functions, D1/R2 bindings hay so sánh pixel với ảnh mẫu.

## Nhật ký

| Thời gian UTC | Commit SHA | Môi trường/URL | Test | Trạng thái | Bằng chứng | Task IDs |
|---|---|---|---|---|---|---|
| 2026-10-19 20:39–20:41 | `c1757447f3b30aee9923297aca2c8ab89a42775d` | local static `http://127.0.0.1:4173/` | `npm test`, `npm run check`, Playwright visual/responsive audit | PASS (local/fixture only) | [run 39320885814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814), [artifact 12218939627](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39320885814/artifacts/12218939627) | SHOT-001, PERF-001, REG-001 |
| Chưa ghi nhận | Chưa xác minh | Cloudflare Preview | Baseline deployed website | BLOCKED / NOT TESTED | Chưa có ảnh/manifest; lần truy cập tự động trước đó trả `login_required` | SETUP-001, SHOT-002 |

## Mẫu ghi một lượt test mới

### YYYY-MM-DD HH:MM UTC — tên suite

- Commit:
- Branch:
- Environment / URL:
- Tool / workflow run:
- Viewport / theme / state (nếu áp dụng):
- Status: PASS / FAIL / BLOCKED / NOT TESTED
- Kết quả:
- Log / artifact / screenshot:
- Task IDs:
- Có cần chạy lại không? Vì sao:
- Giới hạn / điều kiện môi trường:

## Khi nào cần chạy lại test đã PASS?

Chỉ chạy lại khi:
1. Code liên quan thay đổi.
2. Cấu hình hoặc môi trường kiểm thử thay đổi.
3. Có lỗi hồi quy hoặc bằng chứng mới.
4. Lượt test trước không đáng tin cậy hoặc không kiểm tra đúng điều kiện.

Nếu không có lý do nào ở trên, tham chiếu kết quả trước thay vì lặp lại test vô ích.


### 2026-10-19 21:26–21:28 UTC — GitHub Actions visual-preview (latest verified)

- Commit: `e3c5c08e633bc73900343933dc3145720fbaefa2`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- Environment / URL: local static server `http://127.0.0.1:4173/`, served from `public`; **not** the Cloudflare Preview URL.
- Workflow run: [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706), job `visual-preview` ID `118316975031`.
- Status: **PASS — local/fixture pipeline only**. GitHub reports the job and steps as completed successfully, including `npm test`, `npm run check`, Chromium setup, screenshot capture and upload.
- Artifact: [sindarealest-liquid-glass-preview-247](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329) (retention listed through 2026-11-02 UTC).
- Limitation: the automatic push-triggered run skipped “Save independently captured images into selected repository archive”; therefore this run did **not** archive screenshots into the canonical `start-of-work/` or `end-of-work/` folders and does not unblock baseline capture. The workflow is configured to serve local `public/` files and use fixtures; it is not proof of deployed Preview routing, Pages Functions, or visual similarity to reference PNGs.
- Task IDs: SHOT-001, PERF-001, REG-001.

## Bổ sung xác minh — 2026-10-20

### 2026-10-20 — GitHub Actions run 39327473706
- Run: [39327473706](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706), job `118316975031`.
- Status: SUCCESS; các bước setup Node, `npm test`, `npm run check`, cài Chromium, capture local preview đều thành công. Bước lưu ảnh vào thư mục stage bị SKIPPED vì đây là push run, không phải `workflow_dispatch`.
- Artifact: [12222942329](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39327473706/artifacts/12222942329).
- Giới hạn: local static preview/fixture, không phải Cloudflare Preview; không phải baseline thật và không phải xác nhận pixel match.
- Task IDs: SHOT-001, REG-001.

### 2026-10-20 00:57 UTC — GitHub Actions visual-preview fallback audit
- Commit under test: `26406bec56dac69d665c450b6641f03a5ee9f979`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- Environment: local static preview from `public/` at `http://127.0.0.1:4173/`; not Cloudflare Preview.
- Workflow run: [39350484564](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564), job `visual-preview` ID `118393352211`.
- Status: **PASS — local/fixture pipeline only**. Project tests, project/migration checks, Chromium installation, screenshot capture, responsive audit and artifact upload completed successfully.
- Artifact: [sindarealest-liquid-glass-preview-257](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39350484564/artifacts/12232777359), created `2026-10-20T00:57:34Z`.
- Audit numbers recorded from the latest successful local report: 54 screenshots, 20 responsive cases, 91 interaction checks, 235 fixture products, zero responsive overflows, zero console/page/HTTP errors, zero failed requests and zero hard failures; two fixture-only warranty lookup 503 responses were expected.
- Route/source audit: `public/index.html` uses `history.pushState` and `popstate` for `/san-pham/{key}`; `functions/_middleware.js` accepts that route and resolves a key through D1 using slug/id/SKU, then redirects to a canonical key. No route change was made.
- Blockers: supplied Preview URLs return `login_required`; GitHub base64 fetch returned empty bytes for the reference PNGs and web fetch returned cache miss. Therefore no Preview screenshot, no direct visual comparison to references, and no route behavior on deployed Preview has been verified.
- Change safety: this commit series only updates documentation/workflow records; storefront HTML/CSS/JS remains unchanged. No Production merge or deployment.
- Task IDs: SHOT-001, REG-001, ROUTE-001, SHOT-002, REF-001.

## Bổ sung 2026-10-20 — evidence cho nguồn tham chiếu và quy trình mới

- Run [39351043779](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779), job `118395178265`: **SUCCESS** ở commit `577087c4813450de089a3e1c1c47e53ee8625bf6`.
- Artifact [sindarealest-liquid-glass-preview-265](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39351043779/artifacts/12233192824) chứa 54 ảnh local-fixture và 2 PNG tham chiếu gốc. Audit: 20 responsive cases, 91 interaction checks, 0 root document overflow, 0 console/page/HTTP errors, 0 failed requests, 0 hard failures.
- Giới hạn: test ở trên là local fixture. Các file capture live và comparator vừa bổ sung cần được xác nhận qua CI mới; chưa tuyên bố đã chạy capture thật.

## Live Preview gate verification — 2026-10-20

- Run [39352778226](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226), commit `3942f9c2b5a67d2464679f3b437f20bc398b443c`.
- Project tests and `npm run check` passed. The live browser probe was redirected to Cloudflare Access before the storefront rendered; status is `BLOCKED_ACCESS_GATE`, 0 screenshots, 0 write violations. This is an environment/access blocker, not a storefront pass.
- Artifact [12232894712](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39352778226/artifacts/12232894712) includes the local fixture audit and live-probe diagnostic JSON/HTML.
- One CSP console message originated from the external Access login page, not the storefront. The new commit `aaec8026c8eca4aef3027dcb5a5c1e49d6189930` now filters console/page errors by Preview origin and redacts query/fragment values from stored URLs and error text.
- The new safeguards must be revalidated by CI. No UI change, screenshot baseline, route migration or Production deployment has occurred.


## Latest CI verification — 2026-10-20, commit `fa7445b74661faf260c32b3ab32dfa85e3538e78`

- [Liquid Glass isolated visual preview run 39355499185](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185) completed successfully. Project tests and `npm run check` passed; the local Playwright fixture audit and screenshot artifact upload passed. Artifact [12235310623](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355499185/artifacts/12235310623) (about 9.8 MB) contains the generated audit bundle and reference PNGs.
- The same workflow's direct live Preview probe returned `captureCompleted=false`, `accessBlocked=true`, and `screenshotCount=0`. The workflow is green because the push probe is diagnostic/continue-on-error; the live Preview itself is still BLOCKED by Cloudflare Access.
- [Admin Preview smoke run 39355503580](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39355503580) failed on selectors `#loginView` and `#loginForm` not being found. This failure belongs to the separate admin workflow and is not evidence of a public storefront regression; it should be handled in the admin workstream, not by changing this website scope.
- No live baseline/end screenshots, pixel comparison, route migration, storefront UI changes, merge, or Production deployment were completed in this run.


## Extended capture audit — 2026-10-20

- Source-validation run [39357404831](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357404831) at `2a66c96457aa2c2b8235bece34a37dc916c6b25f`: **PASS**. Dependency audit, project integrity and automated tests completed successfully after adding live-capture coverage assertions.
- Visual-audit workflow [39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764): **workflow SUCCESS, live Preview audit BLOCKED**. The local fixture capture step completed and artifact [12235773515](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764/artifacts/12235773515) uploaded. Its local `visual-audit.json` reports 54 screenshots, `passed=true`, 0 console errors, 0 page errors, 0 HTTP errors, 0 hard failures and 0 horizontal overflow. These values apply only to local fixture rendering.
- The same artifact's `live-preview/visual-audit.json` reports `captureCompleted=false`, `accessBlocked=true`, `passed=false`, 0 viewport audits, 0 route checks, 0 screenshots and one Access-gate hard failure; attempted URL redirects to `https://sindarealest2-pages.cloudflareaccess.com/cdn-cgi/access/login/3ed49bcc.sindarealest2.pages.dev`. No baseline was archived.
- New capture script source syntax and assertions are covered by the green test run. Visual render comparisons, Liquid Glass acceptance and the new two-segment route remain **BLOCKED / NOT TESTED** because no live storefront page was reached.


## Latest expanded capture / Access service-token CI — 2026-10-20

- [Visual workflow run 39357400764](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764), source commit `2a66c96457aa2c2b8235bece34a37dc916c6b25f`, completed successfully at the workflow level and uploaded artifact [12235773515](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400764/artifacts/12235773515).
- `npm test` passed, including the new Access-token helper assertions: absent pair is allowed for unauthenticated diagnosis; one-sided pair is rejected; a complete pair produces only the two expected request headers; the direct script attaches the headers only after the Preview origin allowlist and read-only method checks.
- `npm run check` / migration validation passed in the visual workflow. Source validation passed at [run 39357400760](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357400760) and PR validation at [run 39357404831](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357404831).
- **Live Preview check is still blocked.** The log has empty values for both `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`; the new script detected Access, captured 0 screenshots, 0 viewport/theme pairs and did not probe product routes. Push probe is intentionally `continue-on-error` to preserve the diagnostic artifact, so the workflow's green conclusion means local tests and artifact upload passed, not that the live Preview passed.
- The local fixture audit in the same artifact remained 54 screenshots, 20 responsive cases and 91 interaction checks; responsive document overflow, console/page/HTTP errors, failed requests and hard failures all remained zero. All of these are local-only results.
- New live capture requirements now include 8 viewport/theme combinations (4 viewport sizes in both themes), content-section captures, menu/order expanded states, route checks derived from a real Preview product card and a detail reload, plus an image-integrity check. Archiving requires the completeness checks to pass. These checks did not run against live storefront content because Access stopped navigation first.
- [Admin Preview Playwright run 39357404765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357404765) failed separately; it remains an admin-workstream issue and was not “fixed” by weakening selectors or changing admin code here.
- No live baseline, end screenshots, pixel diff, storefront code change, merge or Production deploy is claimed.


## Live capture with safe Access-secret status — run 39357805505 (2026-10-20)

- Source validation [39357805503](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805503): **PASS** on capture-code commit `39389c66c97f88f49d6994e1178ceeaf6eb264e3`.
- Visual workflow [39357805505](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505) completed successfully as a diagnostic/artifact workflow; this is not a live visual PASS. Artifact [12236385238](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39357805505/artifacts/12236385238) local fixture audit: 54 screenshots, 20 responsive cases, 91 interactions, 235 fixture records, 0 overflow, 0 console/page/HTTP errors, 0 failed requests, 0 hard failures.
- The same artifact's live audit reports `accessServiceTokenConfigured=false`, `accessBlocked=true`, `captureCompleted=false`, `passed=false`, 0 viewport checks, 0 route checks, 0 live screenshots, one Access-gate hard failure. Final destination: `https://sindarealest2-pages.cloudflareaccess.com/cdn-cgi/access/login/3ed49bcc.sindarealest2.pages.dev`.
- Read-only guard sent no write requests. No canonical screenshot folder was overwritten; no live pixel comparison, Liquid Glass render acceptance, URL migration or Preview deployment commit verification occurred.


### 2026-10-20 02:26–02:28 UTC — latest source validation and live Preview probe

- Commit: `8955a8aa5e1bd3bc99ef7cdb1456670908c01a5d`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- Environment / URL: local static fixture audit plus read-only probe of `https://3ed49bcc.sindarealest2.pages.dev/`; not a successful live Preview render.
- Tool / workflow run: [source/test CI 39358935696](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696) and [visual workflow 39358931718](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718). Artifact: [12236194129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718/artifacts/12236194129).
- Viewport / theme / state: local fixture workflow reports 54 screenshots; the real Preview probe captured 0 screenshots and tested 0 viewport/theme pairs.
- Status: **PASS (source/test CI and local fixture only); BLOCKED (live Preview)**.
- Result: source/test CI succeeded. Visual workflow completed and uploaded artifact, but the live read-only probe reported `accessServiceTokenConfigured=false`, `accessBlocked=true`, and redirected to Cloudflare Access login. No baseline, end-of-work screenshots, or live pixel comparison exists.
- Logs/artifacts: [workflow log/artifact](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358931718), [CI](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39358935696).
- Task IDs: SETUP-001, SHOT-002, UI-001, UI-002, THEME-001, FUNC-001, SHOT-003.
- Required next step: configure a Preview-only Cloudflare Access Service Auth policy and GitHub Actions secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`; rerun the real baseline capture. Never paste the values into chat/logs.
- Limitation: local fixture images are not evidence of deployed Preview appearance; do not close the blocked tasks.


### 2026-10-20 02:59–03:01 UTC — canonical category routes + Liquid Glass cascade guard

- Branch: `fix/liquid-glass-audit-2026-10-19`
- Tested source commit: `878528620fc519b04fe0a3b36b961eb53d2647d3`
- Source/test validation: **PASS** — [run 39361899889](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361899889). Includes product route canonical/legacy redirects, wrong-category redirects, canonical and OG metadata, omission of unverified SKU in Product JSON-LD, sitemap URLs using stored category keys, and benefit-tile CSS cascade guards.
- Visual workflow: [run 39361896954](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954), artifact [12237048814](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361896954/artifacts/12237048814). Local Playwright fixture audit: **PASS**, 235 fixture products, 54 screenshots, 20 responsive cases, 93 interaction checks, 12 mock requests, zero document overflow, console/page/HTTP errors, failed requests or hard failures.
- Separate real Preview probe from that same job: **BLOCKED_ACCESS_GATE**, `accessServiceTokenConfigured=false`, zero screenshots/viewports/routes; final destination is the Cloudflare Access login host. It sent no write requests. Therefore no real Preview visual pass, baseline, end-of-work capture or pixel comparison is claimed.
- Separate Admin Preview Playwright [run 39361899892](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39361899892): **FAIL** because expected `#loginView` / `#loginForm` were not found on the configured target; this remains outside the public static storefront test scope.
- Changes remain on the fix branch only. No Production merge/deployment. Task IDs: UI-001, URL-001/ROUTE-001, SHOT-001/SHOT-002/SHOT-003, REG-001.


### 2026-10-20 03:11–03:13 UTC — stable category URL slugs and fixture visual recheck

- Current code commit: `968ec2e3af591dd39bbadc911de655a60135dd0f`
- Source/tests: **PASS** — [validation run 39362965160](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965160).
- Explicit stored category key → route slug map now lives in shared Pages Functions code and is mirrored in the static storefront: `sneakers→sneaker`, `loafers→giayluoi`, `dress-shoes→giaytay`, `belts→thatlung`, `wallets→vida`, `sandals→dep`, `watch-straps→daydongho`, `phone-cases→oplung`. Middleware canonical/legacy redirects, sitemap, browser history/detail route, and tests use the mapped slugs. SKU appears in canonical path/schema only when verified; otherwise a product ID is used and schema omits SKU.
- Visual workflow [39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193), artifact [12237724618](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193/artifacts/12237724618): local fixture audit **PASS**, 235 fixture products, 54 screenshots, 20 responsive cases, 93 interaction checks, 12 mocked requests, zero recorded overflow, console/page/HTTP/failed-request/hard-failure counts.
- Same workflow's direct Preview probe: **BLOCKED_ACCESS_GATE**; `accessServiceTokenConfigured=false`, `accessBlocked=true`, zero real Preview screenshots/viewports/routes, no writes. Start/end screenshots and pixel comparison remain untested.
- Separate Admin Preview smoke [39362965143](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362965143) fails because `#loginView`/`#loginForm` aren't found on the configured target; treat as an independent admin test blocker.
- No Production merge/deployment. Task status remains partial until live Preview access and screenshot/route evidence are available.


### 2026-10-20 04:20 UTC — updated route-test guard, local visual and Production route evidence

- Current PR docs HEAD: `33e0d4e0a051d767d7d027006d872872f4517e96`, PR #108 open/unmerged; 75 changed files, 361 commits, +9994/−364; branch compare is diverged (361 ahead / 6 behind). Current source validation [39368810377](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810377) PASS.
- Added a regression assertion to compare the duplicated category→route-slug maps in `public/index.html` and `functions/_lib.js`. First attempt failed because of over-escaped regex in the new test, not website code; correction commit `f23032ebf536c30ea6a5432e22870cba51c5b8b5` passed [run 39368679776](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368679776).
- Local visual workflow [39368675236](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236) passed local static fixture: 235 fixture products, 54 screenshots, 0 document overflow, 0 page errors, 0 HTTP errors, 0 hard failures. Artifact [12240562466](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368675236/artifacts/12240562466). Embedded Preview check: `accessServiceTokenConfigured=false`, `accessBlocked=true`, zero live screenshots, zero viewport/theme pairs and zero route checks.
- Read-only Production route check: sitemap lists 237 URLs using legacy `/san-pham/{SKU}`; `/san-pham/SD-SN001` and `/san-pham/SD-ODT007` yield product metadata. New-style paths `/sanpham/sneaker/SD-SN001` and `/sanpham/sneaker/sneakers-26-41-a` yield homepage metadata/canonical root. Conclusion: two-segment route is not active on Production at test time. No Production code was changed or deployed, and this is not Preview route verification.
- Fresh direct read of Preview alias `https://3ed49bcc.sindarealest2.pages.dev/` returns `login_required`. No genuine live screenshot, viewport test or direct product route run was possible. The owner needs a Preview-only Access Service Auth policy and secrets `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`; never paste secret values in chat.
- Separate admin smoke [run 39368810463](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368810463) FAIL; selectors `#loginView`/`#loginForm` absent. Treat as admin out-of-scope, not a storefront result.
- No runtime HTML/CSS/JS was modified by the route-map parity test. No merge, Production deploy, database write, R2 write, secret or Access-policy change was performed.
