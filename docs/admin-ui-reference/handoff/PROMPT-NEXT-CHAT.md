# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub; báo cáo xong phải làm tiếp task an toàn kế tiếp, không chỉ lập kế hoạch.

## Preflight bắt buộc
- Repo: chichute5500/Sindarealest-admin.
- Nhánh ADMIN duy nhất: feature/admin-isolated-handoff-2026-10-20; PR #111 giữ OPEN, không merge.
- Nhánh website tĩnh được bảo vệ: fix/liquid-glass-audit-2026-10-19; PR #108 giữ OPEN, không merge.
- Live refs ngay trước checkpoint tài liệu: ADMIN HEAD 63f20793fe2812d3d905b8a9db52a0733d45927d; static PR #108 HEAD e3328dee37b125c5821bcaad03199afc44ed06fa. Các cập nhật handoff này chỉ sửa tài liệu; fetch HEAD/PR/Actions live lại trước mọi ghi tiếp.
- Visual/application source: dca19a2af32a78390878b9ccfa5c7c26b816f2ff. Compare source → pre-write HEAD = 15 commits / 22 paths tài liệu-handoff-reference; application source không đổi.
- [Validate #39767851282](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851282) và [Preview #39767851318](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318) SUCCESS trên source dca19a2af32a78390878b9ccfa5c7c26b816f2ff. Artifact [#311 / ID 12420678829](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39767851318/artifacts/12420678829): 99 PNG / 75 metrics, fixture/read-only, không phải authenticated backend QA.
- Exact live docs-only HEAD không có status checks hay PR workflow run được trả về. Validation #39773285617 thuộc SHA cũ 5497d4d3b51d32064a9a993e0f891ca672c543c1, không gọi nhầm là test trên HEAD hiện tại.
- Progress giữ 50% PROVISIONAL; cập nhật tài liệu hoặc CI xanh không làm tăng tiến độ.

## Mapping poster chuẩn
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Product gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log. Product classification thuộc #3/#4. AI image grouping là feature riêng BLOCKED, không phải #11.

## Kết quả mới — không lặp lại
### #3 Product list — review đóng do giới hạn dữ liệu, chưa nghiệm thu
- Đã tải/mở artifact #311 và kiểm tra metrics viewport 320×640 + 360×800, sáng/tối. documentWidth đúng bằng viewport; wrapper width 292/332 có scrollWidth bằng clientWidth; không có horizontal overflow ở các trạng thái này.
- Existing fixture tests cover status chips, search/category/fulfillment filters, no-result/clear, card layout, giá/tồn kho chưa xác minh và đường mở editor từ nút sửa.
- Fixture chỉ có 3 sản phẩm UI-only; ảnh là placeholder, giá/tồn kho để trống. Page size là 12 nên chỉ có page 1/1; pagination nhiều trang chưa được kiểm chứng. Không bịa data để khớp poster.
- Không có lỗi nguồn độc lập được chứng minh; không sửa source. #3 vẫn PARTIAL_NOT_ACCEPTED. Không chạy lại cùng vòng so ảnh trừ khi có state/evidence hợp lệ mới.

### #4 Product editor — review một phần, chưa nghiệm thu
- Đã mở screenshots 390×844 sáng/tối và 1280×800 sáng; metrics không thấy horizontal overflow.
- Test sẵn có cover tab click/ARIA và keyboard ArrowLeft/ArrowRight/Home/End, trường title/category, vị trí checkbox SKU, hình học nút gợi ý AI, placeholder/align giá-tồn kho, footer cố định và scroll content.
- Chưa chứng minh toggle/save SKU persistence, AI endpoint trả kết quả thật, save qua backend thật hoặc full-screen parity. Fixture chặn mọi API write. #4 vẫn PARTIAL_NOT_ACCEPTED; không lặp lại geometry đã chạy nếu chưa có trạng thái khác.

## Task tiếp theo — P1 PR #111 scope/provenance audit
1. Read-only audit .github/workflows/admin-preview-diagnostics.yml: triggers, contents:write permission, phạm vi cập nhật evidence và bảo vệ khỏi commit ảnh stale.
2. Review migrations/0009_fulfillment_and_manual_payments.sql, functions/api/admin/payment-requests.js và payment-transactions.js; so schema/contract với tests, không giả lập API.
3. Review scripts/setup-cloudflare.mjs và scripts/deploy-cloudflare.mjs để đánh giá preflight schema/migration 0009. Hiện là POTENTIAL_BLOCKER_NOT_VERIFIED; chưa có bằng chứng schema remote thiếu.
4. Phân loại inherited vs authored bằng merge-base/path evidence; không revert mù. Live PR #111 có 1,296 paths; merge base ADMIN/static a3834fed3eb1c012b188d7c95d14ec3d15e3969f; tại checked heads ADMIN ahead 898, static ahead 920.
5. Sau đó tiếp tục từng màn theo bằng chứng riêng; #6 Orders và #7 Order detail là hai màn khác nhau.

## Guardrails
- Không merge #111/#108; không sửa main hoặc nhánh static.
- Không deploy Production; không bypass Cloudflare Access; không đọc hoặc chỉnh secrets.
- Không chạy migration/setup/deploy hoặc remote D1/R2 query/write.
- AI image grouping BLOCKED nếu chưa có contract được duyệt.
- R2 image save và PRE/PRO migrations DEFERRED_BY_OWNER.
- Không bịa ảnh, giá, tồn kho, nghiệp vụ/API contract.
- PASS/FAIL/BLOCKED/NOT VERIFIED phải có evidence và SHA cụ thể. Không PASS toàn màn chỉ từ fixture, screenshot hoặc CI.
- Khi status đổi đáng kể, cập nhật current-status.json, latest-test-results.json, PROMPT-NEXT-CHAT.md và audit liên quan; đọc lại GitHub sau khi ghi. Tiếp tục task an toàn kế tiếp sau mỗi checkpoint.
