# LIVE HANDOFF REFRESH — 2026-10-24 — SUPERSEDES HISTORICAL TODO/COUNT NOTES

- Repository: `chichute5500/Sindarealest-admin`; branch: `fix/liquid-glass-audit-2026-10-19`.
- Immediately before this documentation-only refresh, verified PR #108 and branch HEAD both equaled `0259dc38d5fd4ba4497b60fcf6236debb1f27f45`; PR remained OPEN/unmerged, base `main`. This commit advances docs only; re-fetch live PR/branch HEAD before any next write.
- Live changed-file inventory is complete: **298 paths** in [PR-SCOPE-REVIEW.md](PR-SCOPE-REVIEW.md); do not repeat it unless the live PR diff changes.
- Source/test/deployed baseline is `8a4cc6066436f040e7900709e8dd2047ab7ab579`: [Validate PASS](https://api.github.com/repos/chichute5500/Sindarealest-admin/actions/runs/40052984815), [Preview deploy + authenticated HTTP diagnostic PASS](https://api.github.com/repos/chichute5500/Sindarealest-admin/actions/runs/40052984918), Preview https://837f73ba.sindarealest2.pages.dev/.
- Visual workflow [run 40052984980](https://api.github.com/repos/chichute5500/Sindarealest-admin/actions/runs/40052984980) is SKIPPED by the Hero guard. Hero remains paused; the currently available non-Hero workflows target owner-locked `#order` or catalog filters and are not valid substitutes. Gallery remains PAUSED / NOT ACCEPTED pending authorized real-phone acceptance.
- SKU URL builder passes its source-level strict contract (`skuVerified === true` and non-empty trimmed SKU; otherwise ID/key). Product-by-product authoritative SKU verification and live Preview D1 migration state remain NOT RUN/BLOCKED.
- Important D1 correction: Preview deploy workflow runs `npm run check`, `npm test`, `wrangler pages deploy public`, and an HTTP SEO diagnostic; it does not apply remote D1 migrations. `scripts/check-migrations.mjs` verifies migrations on a temporary local D1 only. Do not assume `0008_product_sku_verification.sql` is applied to Preview; do not apply/query remote D1 or edit restricted API/shared-helper/catalog paths without separate authorization.
- **Not 100% complete.** Remaining owner-dependent gates: approved scope disposition for this mixed-scope PR; a safe authorized visual path that excludes Hero and locked sections; real-phone gallery acceptance when reopened; approved read-only proof of Preview D1 migration 0008 and authoritative SKU API flags. No Production/main changes, no merge, no restricted data/API/Admin/infra/payment changes.

---

# PROMPT CHAT MỚI — SINDAREALEST2: XỬ LÝ TỒN ĐỌNG VÀ XÁC ĐỊNH HOÀN THÀNH 100%

**Ngày bàn giao:** 24/10/2026  
**Mục tiêu:** Tiếp tục từ trạng thái GitHub mới nhất, giải quyết mọi hạng mục còn tồn đọng trong phạm vi được phép, rồi đưa ra quyết định hoàn thành dựa trên bằng chứng. Không khởi động lại dự án, không làm lặp phần đã PASS/LOCK.

## 1. Repository và trạng thái phải xác minh đầu tiên

- Repository: `chichute5500/Sindarealest-admin`
- Branch: `fix/liquid-glass-audit-2026-10-19`
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — OPEN, chưa merge, base `main`.
- HEAD trước các cập nhật tài liệu bàn giao: `6f7c8b5d336d83550d0d5328b3b68773114084db`. Các cập nhật tài liệu này tạo commit mới trên cùng branch; **bắt buộc fetch lại PR head trước khi làm việc hoặc ghi file**.
- Latest verified source/test SHA: `8a4cc6066436f040e7900709e8dd2047ab7ab579`.
- Validate PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40052984815
- Preview deploy + authenticated post-deploy HTTP diagnostic PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40052984918
- Immutable Preview: https://837f73ba.sindarealest2.pages.dev/
- Branch Preview alias: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/

Đọc cả bốn tài liệu hiện hành trước khi sửa code:
- `docs/handoff/CURRENT-STATE.md`
- `docs/handoff/TASKS.md`
- `docs/handoff/DECISIONS.md`
- `docs/handoff/TEST-RESULTS.md`

## 2. Bằng chứng hiện đã PASS — không làm lại nếu không có hồi quy mới

Trên source/test SHA `8a4cc606...`:
- npm audit, integrity checks và full automated tests: PASS.
- Cloudflare Pages Preview deploy: PASS.
- HTTP chẩn đoán qua Cloudflare Access service token: root `/` trả 200 và `X-Robots-Tag: noindex`; canonical, `og:url`, `og:image`, `twitter:image` cùng dùng đúng Preview origin.
- `/robots.txt`: HTTP 200, `User-agent: *\nDisallow: /\n`, không quảng bá sitemap.
- `/sitemap.xml`: HTTP 404, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`.
- Chẩn đoán không ghi log secrets hoặc response body; chỉ truy cập Preview hostname/path được allowlist.
- Icon system đã được owner PASS cho source `58f67a424e74b86e798cb5faa043a5d18e10b228`, Preview https://3587ce1f.sindarealest2.pages.dev/, CI #39999873524 và deploy #39999874042. Giữ nguyên trừ khi chứng minh có hồi quy.
- Các mục owner PASS/LOCK như catalog filter Liquid Glass, `#order`, warranty form, mobile cart/account/history, navigation/accessibility và các phần đã chấp nhận khác không được tự ý thiết kế lại hoặc chạy lại audit gây nhiễu.

Lưu ý: Validate/deploy/HTTP PASS **không** chứng minh browser/device visual acceptance.

## 3. Mục tiêu còn lại — thực hiện theo thứ tự, làm đa luồng an toàn

### A. Rà soát toàn bộ PR và phạm vi
PR #108 có lịch sử diff lớn (297 files), vượt phạm vi một thay đổi storefront hẹp.
1. Fetch lại HEAD, danh sách changed files, workflow status và tài liệu handoff mới nhất.
2. Phân loại **từng đường dẫn** thành: storefront được phép, tests/docs/workflows, hoặc restricted/out-of-scope (Admin/backend/API/auth, migrations/database, product/catalog data, deployment/config/infra, v.v.).
3. Xác định mọi thay đổi ngoài phạm vi và ghi rõ bằng chứng/rủi ro. Không tự revert, cherry-pick, tách PR, merge, rebase phá huỷ hoặc sửa restricted files.
4. PR #108 phải giữ OPEN/unmerged; xin owner quyết định riêng nếu cần cô lập/tách hoặc xử lý thay đổi ngoài phạm vi.

### B. Visual acceptance / Hero
- Trước đó visual workflow bị **SKIPPED bởi Hero guard**; không được ghi là PASS.
- Owner hiện yêu cầu xử lý tất cả tồn đọng. Hãy đánh giá lại các mục đang pause để hoàn thành, nhưng **không bypass safety guard** hoặc dùng workflow chụp Hero nếu workflow có thể đụng vào nội dung/section bị khóa.
- Tìm cách test/capture được phê duyệt mà loại trừ Hero. Nếu không có đường chạy an toàn, ghi BLOCKED với tên workflow/guard và hành động cụ thể cần owner quyết định; tiếp tục các nhánh độc lập trong lúc đó.
- Không tuyên bố visual parity chỉ dựa trên CSS/source tests hoặc deploy.

### C. Fullscreen product gallery — flicker/ghosting
- Owner trước đó báo vẫn còn nháy và tạm dừng; trạng thái hiện tại là **PAUSED / NOT ACCEPTED** cho đến khi có bằng chứng.
- Kiểm tra lại source và test contract hiện tại trước khi sửa; tìm nguyên nhân có thể tái hiện, không thử các CSS tweak mù.
- Nếu sửa trong phạm vi storefront được phép, thêm regression tests, chạy exact-SHA CI và Preview.
- Bằng chứng hoàn tất bắt buộc: kiểm tra trên điện thoại thật, nhấn chậm và nhanh, chuyển nhiều ảnh liên tiếp; không còn flicker/ghost image/ảnh sau chồng mờ lên ảnh trước. Nếu chỉ owner mới có thiết bị kiểm tra, cung cấp bước kiểm tra chính xác, giữ trạng thái OWNER DEVICE CHECK REQUIRED và tiếp tục việc khác.
- Không động vào Hero, catalog filter, `#order`, icon hoặc section đã LOCK nếu không có hồi quy cụ thể và scope authorization.

### D. SKU/product URL
- **Chỉ dùng SKU khi authoritative API xác nhận `skuVerified === true` và SKU sau trim không rỗng.**
- Trường hợp còn lại phải dùng product ID/key. Không đoán, không tự xác minh bằng suy luận, không sửa catalog data để làm tests xanh.
- Kiểm tra route và các tests hiện có; đối chiếu API response thực tế nếu quyền truy cập và dữ liệu hợp lệ cho phép.
- Nếu thiếu bằng chứng dữ liệu có thẩm quyền, đánh dấu đúng SKU/case bị BLOCKED và yêu cầu đúng dữ liệu cần thiết. Không để một SKU chưa xác minh chặn các công việc độc lập khác.

### E. Audit cuối cùng các khu vực storefront còn mở
- Chỉ audit source-first và chỉ sửa defect có bằng chứng tái hiện.
- Không lặp lại audit của phần đã PASS/LOCK chỉ để tạo thêm công việc.
- Tập trung vào các hợp đồng chưa được xác nhận bằng runtime: tương tác, lỗi console/network, keyboard/focus, route/fallback, responsive và regressions; chỉ dùng workflow không đụng vào section bị guard.
- Mỗi defect cần có: bước tái hiện, nguyên nhân, thay đổi tối thiểu, regression test, exact-SHA CI, Preview deploy, runtime proof, acceptance status.

### F. Final exact-SHA gates
Sau mọi source/test change:
1. Chạy workflow Validate đầy đủ (audit, integrity, full tests).
2. Deploy Cloudflare Pages **Preview only**.
3. Xác nhận deploy đúng source/test SHA, không nhầm docs HEAD với source/deployed SHA.
4. Xem workflow logs và authenticated HTTP diagnostic; nếu endpoint/diagnostic không chạy hoặc warning, ghi rõ NOT RUN/FAIL/BLOCKED, không tự suy PASS.
5. Chạy browser/device test an toàn, không bypass guard.
6. Cập nhật bốn tài liệu handoff, đọc lại để bảo đảm phần mới nhất thống nhất; kiểm tra link và SHA.
7. Chỉ báo cáo 100% khi tất cả yêu cầu bắt buộc trong phạm vi được xác minh và chấp nhận.

## 4. Ranh giới an toàn bắt buộc

- Không merge PR #108; không chỉnh `main`, không deploy Production.
- Không sửa Admin/backend/API/auth, migrations/D1/R2, dữ liệu catalog/product, secrets/bindings, DNS, Cloudflare Access/infrastructure, payments nếu chưa có owner approval riêng.
- Không force-push, không xoá/ghi đè thay đổi không rõ chủ sở hữu.
- Không giả mạo bằng chứng, không tự điền SKU, không biến workflow SKIPPED thành PASS.
- Các mục PASS/LOCK vẫn khóa. Yêu cầu tổng quát xử lý tồn đọng không cho phép bịa dữ liệu hoặc vượt ranh giới Production/restricted.
- Trước mỗi lần ghi: fetch live HEAD và SHA file; commit bình thường, không force.
- Làm việc theo đa luồng khi không xung đột file/workflow. Báo cáo ngắn gọn rồi tiếp tục tự động; chỉ dừng khi cần thao tác/thiết bị/dữ liệu/ quyết định cụ thể của owner hoặc hết task an toàn.
- Nếu cần owner action, yêu cầu đúng một hành động cụ thể và tiếp tục các công việc độc lập, không hỏi chung chung “muốn làm gì tiếp?”.

## 5. Tiêu chuẩn quyết định 100%

Tạo checklist cuối cùng bao gồm **từng hạng mục đã xác định**, với các cột:
- Hạng mục / phạm vi
- Trạng thái: PASS, FAIL, BLOCKED, NOT RUN, SKIPPED BY SAFETY GUARD, OWNER ACCEPTANCE REQUIRED
- Source/test SHA và deployed SHA
- CI / Preview / HTTP / browser-device evidence
- Owner acceptance (nếu yêu cầu)
- Bằng chứng hoặc hành động còn thiếu

Chỉ ghi **100% hoàn thành** khi không còn required item nào FAIL/BLOCKED/NOT RUN/SKIPPED hoặc chờ owner acceptance. Nếu có blocker, không làm tròn hay phỏng đoán phần trăm; ghi “chưa đủ điều kiện xác nhận 100%” và nêu đúng hành động cần làm tiếp theo.

**Bắt đầu ngay (đã cập nhật sau audit 24/10/2026):** re-fetch live PR/branch HEAD và bốn handoff files. Kiểm kê path-by-path của 298 file đã hoàn tất trong `PR-SCOPE-REVIEW.md`, không làm lại nếu diff không đổi. Tiếp tục chỉ với các blocker chưa giải quyết: owner decision để cô lập phạm vi PR; bằng chứng read-only được phê duyệt cho migration D1 Preview 0008 và `skuVerified` authoritative; phương án visual an toàn không chụp Hero/khu vực LOCKED; gallery phone acceptance sau khi owner mở lại. Không merge, không thay `main`/Production, không truy cập/sửa D1/catalog/API/shared helper hoặc Gallery/Hero ngoài quyền được cấp.