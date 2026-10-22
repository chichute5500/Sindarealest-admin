# HISTORICAL — DO NOT USE AS ACTIVE HANDOFF

This dated prompt is retained for audit history only. Its old SHAs, workflow IDs, preview URLs, progress percentages, blockers, and instructions are not current authority and must not be copied into a new session.

**Use instead:** [canonical new-chat prompt](PROMPT-NEXT-CHAT-2026-10-22.md) when this file is under `docs/handoff/`, or [canonical prompt](../handoff/PROMPT-NEXT-CHAT-2026-10-22.md) when under `docs/prompts/`. Always fetch current branch HEAD, PR #108 status, current workflow artifacts, and deployed Preview SHA before acting. The current task ledger is [TASKS.md](../handoff/TASKS.md) and the canonical state is [CURRENT-STATE.md](../handoff/CURRENT-STATE.md).

Do not delete historical evidence blindly; do not treat it as current state. The owner-approved hero `/images/hero-sd-gl052.png` must remain visible; do not reopen the old SKU blocker. PR #108 stays open and must not be merged. Preview-only; respect all scope boundaries in CURRENT-STATE.md.

---

# PROMPT BÀN GIAO — TIẾP TỤC KIỂM TOÁN VÀ SỬA LỖI SINDAREALEST

Bạn tiếp quản trực tiếp công việc audit/sửa lỗi Preview của SinDarealest. Hãy tự kiểm tra GitHub/Actions và tiếp tục thực hiện bằng công cụ đã được cấp; không chỉ lập kế hoạch hoặc yêu cầu người dùng rerun Actions nếu bạn có thể tự kiểm tra. Ghi trung thực PASS/FAIL/BLOCKED; không tuyên bố 100% khi chưa đủ bằng chứng.

## 1. Repository, trạng thái và an toàn

- Repo: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR: [#108](https://github.com/chichute5500/Sindarealest-admin/pull/108)
- HEAD xác minh tại mốc bàn giao: `d646934407daee83b3bdd58240e23506e7442305`
- Code source gần nhất đã chạy visual audit: `5f181d994bf0edb7a4e553c64ba97cddf55e31c4`. Compare xác nhận commit docs/manifest sau đó không đổi storefront runtime.
- Production: https://sindarealest2.pages.dev/
- Preview: https://3ed49bcc.sindarealest2.pages.dev/
- **CẤM** merge PR #108, deploy Production, thay DNS/DB/R2/bindings/Production secrets/Access policy, sửa nhánh riêng `feature/admin-isolated-handoff-2026-10-20`, bypass Access, hoặc gửi secret/token vào chat.
- PR #108 còn rộng: 81 changed files / 403 commits, có admin UI, APIs, middleware, migrations, data fixture và deploy/config. Không merge wholesale; phải review/tách scope trước.

## 2. Đọc hồ sơ trước khi thay code

Đọc: `docs/visual-audit-progress-2026-10-19.md`, `docs/handoff/HANDOFF.md`, `docs/handoff/TASKS.md`, `docs/handoff/TEST-RESULTS.md`, `docs/handoff/DECISIONS.md`, `docs/handoff/PR-SCOPE-REVIEW.md`, `docs/handoff/PREVIEW-ACCESS-SETUP.md`, `docs/handoff/LOCAL-FIXTURE-VISUAL-REVIEW.md`, `docs/website-screenshots/manifest.json`, `scripts/capture-cloudflare-preview.mjs`, `scripts/verify-cloudflare-preview-deployment.mjs`, `scripts/capture-liquid-glass-preview.mjs`, `.github/workflows/liquid-glass-visual-preview.yml`, `.github/workflows/admin-preview-playwright.yml`, `public/index.html`, `functions/_middleware.js`, `functions/_lib.js`, `tests/product-route-canonical.test.mjs`.

Trước khi làm, xác minh lại branch HEAD, PR open/merged, changed files, CI runs, artifact mới nhất và status workflow. Snapshot trong prompt này chỉ là mốc bàn giao.

## 3. Bằng chứng gần nhất

### PASS
- Validation: [run 39412627375](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627375), PASS trên HEAD hiện tại.
- Admin Preview Playwright: [run 39412627328](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39412627328), 2/2 PASS.
- Access Service Token đã được dùng cho đúng Preview origin. Không cần yêu cầu user rerun hai bài admin test nếu không có code đổi liên quan.

### Live visual audit chưa đạt
- [Liquid Glass run 39411977810](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810), [artifact 12260286017](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810/artifacts/12260286017).
- Workflow ngoài báo SUCCESS vì probe chẩn đoán có thể continue-on-error; JSON live audit thực tế `passed=false`.
- Preview browser truy cập được: `accessBlocked=false`, `accessServiceTokenConfigured=true`, capture completed.
- 46 ảnh diagnostic; 8/8 viewport-theme pairs; 7 section bắt buộc, 4 ảnh mỗi section; order-expanded=4; menu-open=2.
- Overflow=0; console/page/same-origin HTTP errors=0; failed requests=0; broken image contexts=0; read-only violations=0.
- **4/4 product-card route checks FAIL:** path thực tế `/san-pham/sneakers-26-41-a`, expected canonical `/sanpham/{category-slug}/{product-key}`. Modal và tiêu đề sản phẩm vẫn mở đúng, nhưng route checks fail; direct-open/reload chưa hoàn tất.
- **Deployment metadata verification BLOCKED:** `API_AUTHENTICATION_REJECTED`, HTTP 401; `CLOUDFLARE_PAGES_READ_TOKEN` bị Cloudflare từ chối, nên chưa lấy được deployment ID/branch/SHA. Chưa chứng minh Preview alias chạy đúng source SHA.
- Manifest: baseline `BLOCKED`, end-of-work `NOT TESTED`, pixel diff `NOT TESTED`. 46 ảnh live đang chỉ nằm trong artifact diagnostic; không copy vào baseline canonical.

## 4. Việc bắt buộc tiếp theo (thực hiện theo thứ tự)

### A. Khôi phục Cloudflare Pages Read verification
1. Kiểm tra tool có được phép xem GitHub repository Variable/Secrets metadata không; tuyệt đối không in giá trị secret.
2. Verifier trả HTTP 401 dù secret đã được truyền trong run 39411977810. Chủ dự án cần thay Secret `CLOUDFLARE_PAGES_READ_TOKEN` bằng Cloudflare API token hợp lệ có đúng quyền **Account / Cloudflare Pages / Read** trong cùng tài khoản với project. Kiểm tra Variable `CLOUDFLARE_ACCOUNT_ID` cùng Account đó.
3. Không xin người dùng paste token vào chat, không tạo token thay họ khi không có quyền, không đưa token vào source/comment/artifact.
4. Nếu quyền tool không cho đổi secrets, hướng dẫn ngắn theo `docs/handoff/PREVIEW-ACCESS-SETUP.md`; ghi rõ blocker.
5. Chạy workflow read-only mới và yêu cầu verifier xác nhận alias chính xác, environment=preview, latest stage/status=success, branch `fix/liquid-glass-audit-2026-10-19`, deployment SHA đầy đủ. Chưa xác nhận thì giữ mọi ảnh là diagnostic-only.

### B. Giải quyết menu coverage
- Source script đã đổi hành vi đóng menu sang Escape thay vì bấm `#menuToggle` khi drawer che toggle.
- Lượt audit gần nhất có `menuOpenCount=2`; soát code hiện tại và workflow gate để xem cần đủ 4 ảnh menu-open ở contexts nào.
- Sửa harness, không dùng force-click; chờ drawer đóng và `aria-expanded=false` rồi tiếp tục; bảo đảm state không lọt qua theme/viewport.
- Thêm regression test nếu cần; chạy lại source checks/visual audit trên code mới.

### C. Product route: xác minh trước khi sửa runtime
1. Live click trả `/san-pham/sneakers-26-41-a`, nhưng source/tests hiện kỳ vọng canonical `/sanpham/{category-slug}/{product-key}`; test legacy route nằm ở `tests/product-route-canonical.test.mjs`.
2. **Không kết luận runtime bug** khi deployment verifier chưa xác nhận deployed SHA. Alias có thể trỏ tới deployment cũ/khác.
3. Sau khi verifier PASS:
   - Nếu preview deployment stale: không đổi code route để làm hợp Preview cũ; dùng source đã được phê duyệt và flow Preview hiện hành.
   - Nếu deployment đúng HEAD mà card vẫn ra URL sai: điều tra href/data-open-product/click handler/history, middleware redirects, product category mapping. Sửa root cause, thêm test, không invent SKU/slug/category mapping.
4. Đạt 4/4 context click → đúng canonical route → direct-open/reload giữ cùng sản phẩm.

### D. Lặp đầy đủ kiểm tra
- Run project validation, toàn bộ tests, Admin Preview Playwright khi code admin/auth changed, và live visual audit.
- Acceptance live tối thiểu: deployment metadata PASS đúng branch/SHA; 8/8 viewport-theme pairs; required sections complete; menu capture gate đủ; 4 order-expanded; 4 product detail contexts PASS; routeChecks hợp lệ; 0 hardFailures/overflow/console/page/HTTP errors/broken-image/read-only violations.
- Đọc `live-preview/visual-audit.json` và `deployment-verification.json`, đừng chỉ nhìn kết luận workflow ngoài.

### E. Baseline/end thật và pixel diff
- Không chép local fixture ảnh hoặc artifact chưa verify vào `docs/website-screenshots/start-of-work/` / `end-of-work/`.
- Nếu không thể chứng minh ảnh baseline phản ánh đúng source revision ban đầu thì không ghi ngược thành baseline gốc.
- Chỉ sau live capture PASS + deployment verifier PASS: tạo baseline/end thật theo workflow, pixel diff cùng tên/kích thước, xem thủ công Light/Dark và viewport. Giữ nguyên hai PNG tham chiếu gốc.
- Không tuyên bố 100% khi còn thiếu route test, human visual review hoặc ảnh gốc 28 screenshots/physical Android test.

## 5. Cập nhật nhật ký, tiến độ và commit
Sau mỗi vòng sửa có test:
- Cập nhật `docs/visual-audit-progress-2026-10-19.md`, `docs/handoff/HANDOFF.md`, `docs/handoff/TASKS.md`, `docs/handoff/TEST-RESULTS.md`, `docs/handoff/PREVIEW-ACCESS-SETUP.md` và manifest nếu có thay đổi bằng chứng.
- Ghi run ID, artifact URL, commit SHA, thực tế PASS/FAIL/BLOCKED, số ảnh/viewport/routes và blocker. Không sửa timestamp cũ thành mới; thêm nhật ký mới.
- Commit chỉ trên `fix/liquid-glass-audit-2026-10-19`; kiểm tra new HEAD và Actions sau commit.
- Tiến độ estimate tại mốc này: **62%** QA/audit. Không tăng chỉ vì thêm commits/ảnh; chỉ tăng khi các gates thật sự PASS.

Kết thúc chỉ khi có bằng chứng mới nhất; Production phải giữ nguyên và PR #108 chưa merge.
