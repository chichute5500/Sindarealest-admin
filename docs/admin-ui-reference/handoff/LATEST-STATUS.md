# SinDarealest ADMIN — trạng thái bàn giao mới nhất

**Trạng thái:** `IN PROGRESS — SOURCE CI PASS; PREVIEW DIAGNOSTIC FAIL; VISUAL PARITY NOT ACCEPTED; AUTHENTICATED QA OPEN`
**Tiến độ tổng thể ước tính:** **48%**. Đây là ước lượng tiến độ dự án, không phải tỷ lệ test pass. Chưa đạt nghiệm thu giao diện giống mẫu.
**Repository/nhánh được phép sửa:** `chichute5500/Sindarealest-admin` / `feature/admin-isolated-handoff-2026-10-20`.
**Source/test SHA đã xác minh gần nhất:** `ebb20fa7f2359b19ae91a9c62b3006a16b8db148`; [Actions run 39592097224](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224) đã xác nhận `npm run check`, `npm test`, và local Playwright source/fixture matrix đều PASS trên đúng SHA này. Workflow tổng thể vẫn FAILURE do Preview từ xa.
**Source UI gần nhất:** `d553b95c3d43420f9227e9a37e6fe94b9b862b27` — “fix(admin): align dashboard and brand copy with reference”. Các commit UI trước đó gồm QR validation/localized file picker, mobile filter/warranty text, forced-colors accessibility và theme-color/no-flash. Xác nhận source CI hiện hành qua [run 39588603589](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39588603589); CI PASS không đồng nghĩa Preview/parity đã đạt.
**Preview diagnostic mới nhất đã xác minh:** [run 39592097224](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224) — FAILURE: `PREVIEW_CSS_SIGNATURE_MISMATCH`; inline stylesheet 226 rules nhưng thiếu login-hide rule (`hasLoginHideRule=false`), brand header vẫn visible. URL target vẫn bị secret masking nên chưa phân biệt được build cũ với target sai. Giữ nguyên assertion; không bypass Access hoặc đọc/đổi secrets.
**Ảnh mẫu:** `docs/admin-ui-reference/admin-mobile-reference.png`; workflow artifact mới đã được cấu hình để đính kèm ảnh mẫu vào artifact Playwright. Ảnh source/fixture không phải bằng chứng backend đã đăng nhập. Kết quả so sánh ban đầu: có tông xanh nhạt/card bo tròn nhưng bố cục và nội dung chưa được xác nhận giống đủ 12 màn hình.
**PR #111:** OPEN/unmerged, base `main`, hiện 1.096 file thay đổi (+37.660/−392) theo GitHub API. Danh sách đường dẫn đầy đủ đã kiểm kê; PR vẫn trộn storefront, Admin, Functions/API, migrations, scripts, tests và hơn 900 PNG; semantic/security review còn một phần và PR chưa merge-ready. **PR #108:** OPEN/unmerged, base `main`, 232 file (+19.270/−380). Không merge hai PR.
**Đã xác minh trên source gần nhất:**
- Bổ sung hỗ trợ forced-colors/focus-visible và test hợp đồng.
- Đồng bộ meta theme-color Android với theme sáng/tối; thêm bootstrap trước CSS nhằm giảm flash.
- Thêm ảnh PNG tham chiếu vào artifact visual audit.
- Chỉnh dashboard/brand copy theo tham chiếu và giữ dữ liệu trung thực; không tự tạo doanh thu/giá/tồn kho.
- Chỉnh luồng QR để chỉ bật khi chi tiết ngân hàng đã lưu khớp; làm rõ chọn file QR và một số nhãn/hint trên mobile.
**Chưa hoàn thành:** xác minh đủ 12 màn hình ở mobile/tablet/desktop; sửa Preview source/target mismatch; kiểm tra chức năng authenticated bằng Preview hợp lệ; full semantic/security audit PR #111; nghiệm thu backend. Không có local checkout để khẳng định git status hay chạy test thủ công cục bộ.
**Tạm hoãn theo yêu cầu chủ sở hữu:** lỗi lưu ảnh sản phẩm và migration PRE/PRO. Không tự mở lại.
**Rào chắn:** không sửa `main` hoặc `fix/liquid-glass-audit-2026-10-19`; không deploy Production; không chạy setup/migration; không sửa secrets/Cloudflare Access; không thao tác dữ liệu D1/R2 từ xa.
**Bước kế tiếp — phải thực thi, không chỉ lập kế hoạch:** 1) kiểm tra source CI và Preview diagnostic mới nhất; 2) tiếp tục đối chiếu từng màn hình với ảnh mẫu và sửa các sai lệch có thể xác minh; 3) rà soát PR #111 theo nhóm Functions/migrations/workflows/tests và rủi ro; 4) cập nhật JSON/ảnh bàn giao sau mỗi vòng; 5) tiếp tục sau báo cáo tiến độ nếu không cần chủ sở hữu thao tác.

---

## Kết quả kiểm thử tự động gần nhất

- Tested commit: ebb20fa7f2359b19ae91a9c62b3006a16b8db148
- Run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224
- npm run check: PASS
- npm test: PASS
- Local source Playwright matrix: PASS; 59 real PNGs captured in artifact admin-preview-evidence-144 (not committed to Git).
- Deployed Preview: failure.
- Source screenshot matrix: 59 real PNGs; login shell: 16; read-only fixture module screens: 43; fixture metrics: 36.
- Fixture screens use synthetic/read-only data and do not prove authenticated business-data workflows; those remain NOT TESTED.
- Production deployment: NOT PERFORMED.


## Latest source cycle — concurrent refund guard (2026-10-21)

- **Functional source:** `functions/api/admin/payment-transactions.js`, commit `d3fa9b85be20d832cbf24678dd7f3c7d862c1e64`. The batch insert now rechecks the net received-minus-refunded ledger inside a conditional `INSERT … SELECT … WHERE`; order/payment-request status changes and the audit entry are gated on the ledger row existing. If a refund loses the balance recheck, it returns HTTP 409 rather than writing a ledger record.
- **Regression test:** `tests/payment-ledger-route.test.mjs`, commits `bd1501034f47260472b593334ac807ba362a58ee` and `ebb20fa7f2359b19ae91a9c62b3006a16b8db148`, covers a mocked concurrent-refund rejection and asserts the SQL guard/follow-on gates. This is source/unit-test evidence, not proof of remote D1 concurrency behavior.
- **Exact source/test CI:** [run 39592097224](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224) ran on exact SHA `ebb20fa7f2359b19ae91a9c62b3006a16b8db148`. `npm run check` PASS; `npm test` PASS, including `PASS payment ledger route behavior`; the local read-only Playwright matrix PASS. The workflow is overall FAILURE only at the deployed Preview signature test.
- **Evidence artifact:** [admin-preview-evidence-144](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224/artifacts/12342063095), artifact ID 12342063095, size 11,185,608 bytes, expires 2026-11-04 11:30:26 UTC. Includes 59 PNGs (16 login shell + 43 synthetic/read-only fixture module views), 36 fixture metrics, metadata and reference; no browser/console/network/HTTP errors or fixture writes. PNGs remain in Actions artifact, not per-run Git commits.
- **Preview FAIL:** same run returns `PREVIEW_CSS_SIGNATURE_MISMATCH`: 226 inline stylesheet rules, `hasLoginHideRule=false`, topbar brand visible. No weakening the assertion; no secrets or Access bypass.
- **Latest observed PR #111 before this handoff refresh:** HEAD `9e0434f769dedf2b20e1365aa96147336afc237c` (evidence/report-only commit after the tested source), OPEN/unmerged, 1,096 files (+37,660/−392). PR #108 remains OPEN/unmerged, no writes to the website branch. Both PRs stay open.
- **Risk boundaries:** no live D1/R2, migration, setup script, customer/business data, secrets, Access or Production action was performed. The refund test uses the in-memory mock only; runtime database concurrency remains NOT VERIFIED.
- **Progress stays 48%**. Preview identity, 12-screen parity, authenticated live-backend QA and full semantic/security review of PR #111 remain open. Product image save/upload and PRE/PRO migrations remain `DEFERRED_BY_OWNER / NOT VERIFIED`.
