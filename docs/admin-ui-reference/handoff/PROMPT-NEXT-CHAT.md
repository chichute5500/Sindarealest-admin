# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục việc thực tế trên GitHub; báo cáo xong phải làm tiếp task an toàn kế tiếp.

## Preflight
- Repo `chichute5500/Sindarealest-admin`; nhánh ADMIN duy nhất `feature/admin-isolated-handoff-2026-10-20`, PR #111; nhánh static được bảo vệ `fix/liquid-glass-audit-2026-10-19`, PR #108.
- Đọc `handoff/current-status.json`; fetch HEAD, PRs và Actions trực tiếp trước mọi write. Dùng archive `docs/admin-ui-reference/handoff/history/legacy-2026-10-22/` chỉ để tra lịch sử.
- Parent HEAD trước lần gom tài liệu: `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e`; Validate #39769095034 SUCCESS. Visual artifact #311 / Preview #39767851318 trên source `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`, 99 PNG/75 fixture metrics; không chứng minh backend thật.
- Tiến độ **50% PROVISIONAL**; #3/#4 và toàn bộ 12 màn chưa accepted.

## Đánh số chuẩn theo poster
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log. Product classification thuộc #3/#4; AI grouping là feature riêng BLOCKED, không phải #11.

## Queue
1. **P1 #3:** so reference/source ở viewport/theme khớp; kiểm tra card density, filters, chips, edit, pagination, overflow. Không bịa ảnh, giá hay stock; phân biệt fixture thiếu data với lỗi source.
2. **P1 #4:** tabs/fields/SKU checkbox/AI suggestion/giá-tồn kho/footer; giữ nguyên API/nghiệp vụ.
3. **P1 12-screen parity:** mỗi màn có bằng chứng riêng, không PASS chỉ từ fixture.
4. **P1 PR #111 scope:** read-only merge-base/path audit; phân loại inherited vs authored, không revert mù.
5. **P2 #6/#7:** Orders và Order detail là hai màn riêng.
6. **BLOCKED:** backend QA cần Preview identity hợp lệ; AI grouping cần contract được duyệt.
7. **DEFERRED_BY_OWNER:** R2 image save và PRE/PRO migrations.

## Guardrails
Không merge #111/#108; không sửa main/static; không Production deploy; không bypass Access hoặc đọc/đổi secrets; không remote D1/R2 writes/migrations/setup/deploy; không tạo dữ liệu/ảnh/API contract giả. Mỗi source change phải có regression, exact SHA, readback và kiểm tra CI.
