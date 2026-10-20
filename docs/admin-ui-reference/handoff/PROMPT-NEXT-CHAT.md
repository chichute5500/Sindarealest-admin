# PROMPT BÀN GIAO — TIẾP TỤC HOÀN THIỆN ADMIN SINDAREALEST

Bạn tiếp quản trực tiếp công việc đang dang dở. Không bắt đầu lại từ đầu, không chỉ viết kế hoạch. Hãy đọc các file trạng thái mới nhất trên GitHub, xác minh bằng chứng thực tế, rồi tiếp tục thực hiện bằng các công cụ/quyền truy cập hiện có.

## 1. Đọc bắt buộc trước khi hành động

Repository: `chichute5500/Sindarealest-admin`

Mở theo thứ tự:
1. [START-HERE.md](START-HERE.md)
2. [LATEST-STATUS.md](LATEST-STATUS.md)
3. [latest-test-results.json](latest-test-results.json)
4. [MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md)
5. [reference-instructions.md](../reference-instructions.md)
6. [PROMPT-COMPLETENESS-AUDIT.md](PROMPT-COMPLETENESS-AUDIT.md) nếu có trong nhánh hiện tại.

Đừng tin SHA hoặc trạng thái ghi trong file mà không đối chiếu với GitHub hiện tại. Xác minh branch HEAD, workflow runs, các file source và commit chứa bằng chứng mới nhất. Không lặp lại test/ảnh đã có bằng chứng hợp lệ nếu source/commit không thay đổi.

## 2. Nhánh và ranh giới an toàn — BẮT BUỘC

- Chỉ được sửa/commit công việc ADMIN trên `feature/admin-isolated-handoff-2026-10-20`.
- Bảo vệ nhánh website tĩnh `fix/liquid-glass-audit-2026-10-19`; không sửa nhánh này, không sửa `main).
- Không merge PR #111, không đổi base, không cherry-pick, không đồng bộ branch tự động. PR #111 mở tới `main` và có thay đổi storefront/backend ngoài phạm vi ADMIN.
- Không deploy Cloudflare Production, không sửa production secrets/config, D1 schema, R2 data hoặc dữ liệu khách hàng/đơn hàng thật.
- Không tắt/bypass auth hay Cloudflare Access. Không in secret/token/PII vào log, ảnh hoặc báo cáo.
- Giữ nguyên API, auth, schema và nghiệp vụ hiện có. Không tạo route giả chỉ để khớp mockup. Nếu không thể cô lập thay đổi an toàn, ghi BLOCKED và tiếp tục hạng mục độc lập.
- Nếu không có checkout Git cục bộ hoặc không thể xác nhận `git status`/diff đầy đủ, ghi rõ giới hạn; không tuyên bố full diff đã sạch.

## 3. Trạng thái đã xác minh gần nhất (phải kiểm tra lại)

- Tiến độ ước tính ghi nhận: **42%**. Đây là ước tính theo giai đoạn, không phải tỷ lệ code.
- HEAD trước khi ghi handoff mới: `ed27fc5c67152ba900c8b10f5acd358dae8e8096`; các cập nhật handoff tiếp theo sẽ tạo SHA mới.
- Source UI gần nhất được ghi nhận: `012dc6d1f79dd31518d2d2bcbe9183af24b643a6`.
- Commit test harness được workflow ma trận kiểm tra: `de8b7770ac2e077ad9ef0926f5e9053b400a9993`. Kiểm tra lại quan hệ giữa source SHA và test SHA trước khi gán ảnh cho code mới hơn.
- [Workflow source checks 39447109288](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39447109288): SUCCESS trên HEAD trước handoff.
- [Preview diagnostic 39446733271](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39446733271): tổng thể FAIL ở bước Preview đã cấu hình; source checks, npm checks và local Playwright 16 ảnh PASS.
- Lỗi Preview hiện tại: GitHub Actions secret `ADMIN_TEST_URL` đang trỏ đến trang có `.topbar > .brand` còn hiển thị khi đăng nhập, khác với source ADMIN mới. Giá trị secret được GitHub mask; không cố đọc/in giá trị secret.
- 16 ảnh local tại `docs/admin-ui-reference/handoff/history/b5ce11f92995/screenshots/` chỉ bao phủ login shell chưa đăng nhập ở 8 viewport × Light/Dark; **không** chứng minh các module nghiệp vụ đã PASS.
- HTML viewer đã hiển thị mockup 12 màn hình; đọc PNG gốc trực tiếp và full pixel-diff vẫn chưa được xác nhận hoàn tất.
- PR [#111](https://github.com/chichute5500/Sindarealest-admin/pull/111) vẫn OPEN/NOT MERGED, base `main`; GitHub API gần nhất ghi 318 commits/223 files changed. Không merge.
- Cloudflare Production: NOT PERFORMED.

## 4. Việc phải làm tiếp theo — làm theo thứ tự

### A. Xác minh Preview đúng nguồn
1. Kiểm tra workflow và file cấu hình diagnostic hiện tại. Xác minh `ADMIN_TEST_URL` có được cấu hình hay không mà không tiết lộ giá trị.
2. Nếu cần, báo người quản lý repo cập nhật secret `ADMIN_TEST_URL` thành URL Preview đúng của nhánh `feature/admin-isolated-handoff-2026-10-20`, path `/admin/`. Giữ nguyên Cloudflare Access service-token secrets; không bypass Access.
3. Chạy lại diagnostic. Chỉ đánh dấu remote Preview PASS khi CSS signature đúng source hiện tại, login và dashboard đều qua. Đọc log/artifact thật, không suy đoán từ trạng thái workflow tổng quát.

### B. Hoàn thiện kiểm thử bằng chứng
1. Kiểm tra tính hợp lệ và SHA metadata của ảnh hiện có; không chụp lại ma trận 16 ảnh login nếu source không đổi và evidence còn dùng được.
2. Xác minh khả năng xem PNG gốc/ZIP tham chiếu; ghi rõ asset nào thực sự đọc được. So sánh screenshot app với mockup ở cùng viewport/theme; không tuyên bố pixel-diff nếu chưa chạy.
3. Bổ sung Playwright read-only cho dashboard, sản phẩm, đơn hàng, khách hàng, bảo hành, cài đặt, gallery và backup/restore. Chỉ dùng fixture/test data an toàn; che/loại PII; không CRUD dữ liệu thật.
4. Kiểm tra mobile nav, table/card layout, overflow ngang, light/dark, tiếng Việt, focus/keyboard, trạng thái loading/error/empty, console và failed requests. Source hiện có 6 mục điều hướng; mockup thể hiện 5 mục + “Khác”. Điều tra bằng chứng trước khi sửa.
5. Ghi rõ các chức năng chưa có route riêng (ví dụ chi tiết đơn/nhật ký) và xác minh business/API contract trước khi đề xuất thêm.

### C. Chỉnh sửa và nghiệm thu
- Chỉ sau khi có ảnh/bug tái hiện, sửa một nhóm thay đổi ADMIN nhỏ, chạy `npm run check`, `npm test`, Playwright và xem lại screenshot.
- Mỗi vòng sửa có ý nghĩa phải cập nhật `LATEST-STATUS.md`, `latest-test-results.json`, lưu ảnh/metadata/log an toàn vào `history/<sha-or-run-id>/`, rồi commit trên nhánh ADMIN.
- Kiểm tra full diff/merge-base PR #111 nếu có checkout an toàn. Nếu chưa có checkout, ghi BLOCKED và không tuyên bố đã rà soát toàn bộ.
- Giữ PR #111 chưa merge; không deploy Production.

## 5. Quy tắc báo cáo

Báo cáo tiến độ bằng các mục: đã làm, bằng chứng/URL workflow, còn lỗi, blocker cần người dùng thao tác, bước kế tiếp. Tách rõ PASS / FAIL / NOT TESTED / BLOCKED. Không nâng phần trăm chỉ vì đã đọc source hoặc thêm tài liệu. Chỉ dừng khi thực sự cần người dùng thao tác (ví dụ cập nhật secret Preview hoặc cung cấp URL Preview hợp lệ); trong thời gian chờ, tiếp tục các việc độc lập có thể làm an toàn.

## Câu lệnh ngắn để bắt đầu

**“Tiếp tục theo PROMPT-NEXT-CHAT.md và MASTER-PROMPT-AUTO-HANDOFF.md. Đọc handoff mới nhất, xác minh HEAD/CI, rồi thực hiện các việc còn lại trên nhánh ADMIN riêng; không sửa website tĩnh, không merge PR #111, không deploy Production.”**
