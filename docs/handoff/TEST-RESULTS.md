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
